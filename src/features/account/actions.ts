"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { hasSupabaseSecretKey } from "@/lib/env";
import { getCountries, getRegions } from "@/lib/directory";
import { buildRegionChoices } from "@/lib/regions";
import { revalidateDirectory } from "@/lib/revalidate";
import {
  accountListingPath,
  accountPath,
  adminPath,
  adminSignInPath,
  agencyPath,
  confirmSignInPath,
  reviewPath,
  signInPath,
} from "@/lib/routes";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseSessionClient } from "@/lib/supabase/session";
import { NOTIFICATION_RECIPIENTS, sendRequestNotification } from "@/features/requests/notify";
import { getAccount, getListing, getPendingSubmissions } from "./data";
import {
  buildAccessRequestEmail,
  buildDecisionEmail,
  buildSignInEmail,
  buildSubmissionEmail,
} from "./emails";
import { linkOrigin, visitorIp } from "./origin";
import { lookForSubmissionLogo, OWN_LOGO_NAME, removeLogoFile } from "./submission-logo";
import {
  ACCOUNT_HONEYPOT_FIELD,
  LOGO_MAX_BYTES,
  cleanLine,
  cleanText,
  parseCode,
  parseEmail,
  parseTokenHash,
  parseUuid,
  sniffImage,
  validateListingText,
  validateNewListing,
  type ListingTextErrors,
  type NewListingErrors,
} from "./validate";

const TRY_AGAIN = "Sorry, something went wrong on our side. Please try again in a few minutes.";

// ---------------------------------------------------------------------------
// Signing in
// ---------------------------------------------------------------------------

export type SignInState =
  | { step: "email"; email?: string; error?: string }
  | { step: "code"; email: string; error?: string; resent?: boolean };

/**
 * Where a sign-in finishes. Agencies go to their account; the admin sign-in
 * at /admin/sign-in goes back to /admin. Only these two fixed values are
 * accepted from the form, so the field cannot send anyone to another site.
 */
type SignInDestination = "account" | "admin";

function readDestination(value: FormDataEntryValue | null): SignInDestination {
  return value === "admin" ? "admin" : "account";
}

function signInPageFor(destination: SignInDestination): string {
  return destination === "admin" ? adminSignInPath : signInPath;
}

/**
 * Step one: the person gives their email address and we send a sign-in
 * code. There are no passwords. An account is created the first time an
 * address signs in, so the answer is the same for every address and nobody
 * can use this form to find out who has an account.
 */
async function requestSignIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  // A bot filled the hidden field: look successful, send nothing.
  const typed = cleanLine(formData.get("email"));
  if (cleanLine(formData.get(ACCOUNT_HONEYPOT_FIELD)) !== "") {
    return { step: "code", email: typed.slice(0, 254) };
  }

  const destination = readDestination(formData.get("next"));
  const email = parseEmail(typed);
  if (!email) {
    return {
      step: "email",
      email: typed,
      error:
        destination === "admin"
          ? "Enter your email address, for example name@example.com."
          : "Enter your work email address, for example name@youragency.com.",
    };
  }
  const resent = formData.get("resend") === "1";

  if (!hasSupabaseSecretKey()) {
    console.error("Sign-in is not available: SUPABASE_SECRET_KEY is not set.");
    return { step: "email", email, error: "Sign-in is not switched on yet. Please try again later." };
  }

  try {
    const admin = getSupabaseAdminClient();
    const allowed = await admin.rpc("allow_login_email", {
      target_email: email,
      // No address known: the per-visitor limit is skipped, the others still apply.
      visitor_ip: (await visitorIp()) as string,
    });
    if (allowed.error) throw allowed.error;
    if (!allowed.data) {
      return {
        step: resent ? "code" : "email",
        email,
        error: "We have sent several sign-in emails recently. Please check your inbox and junk folder, or try again in an hour.",
      };
    }

    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) throw link.error;
    const { email_otp: code, hashed_token: tokenHash } = link.data.properties;

    const origin = await linkOrigin();
    const message = buildSignInEmail({
      code,
      link:
        `${origin}${confirmSignInPath}?token_hash=${encodeURIComponent(tokenHash)}` +
        (destination === "admin" ? "&next=admin" : ""),
    });
    const sent = await sendEmail({ to: [email], ...message });
    if (!sent) return { step: "email", email, error: TRY_AGAIN };
  } catch (error) {
    console.error("Sign-in email failed:", error);
    return { step: "email", email, error: TRY_AGAIN };
  }

  return { step: "code", email, resent };
}

/** One entry point for the sign-in screen, so it keeps a single state. */
export async function signInStep(previous: SignInState, formData: FormData): Promise<SignInState> {
  return formData.get("intent") === "verify"
    ? verifySignInCode(previous, formData)
    : requestSignIn(previous, formData);
}

/**
 * After a successful sign-in. The admin sign-in goes straight back to
 * /admin (whose pages check that this person really is the admin).
 * Agencies claim the one obvious listing, then go to their account.
 */
async function finishSignIn(destination: SignInDestination): Promise<never> {
  if (destination === "admin") redirect(adminPath);
  try {
    const supabase = await getSupabaseSessionClient();
    const claimed = await supabase.rpc("claim_single_match");
    if (claimed.error) console.error("claim_single_match failed:", claimed.error.code, claimed.error.message);
    if (claimed.data) redirect(`${accountPath}?notice=claimed`);
  } catch (error) {
    // `redirect` works by throwing; let it through.
    if (isRedirect(error)) throw error;
    console.error("claim_single_match failed:", error);
  }
  redirect(accountPath);
}

function isRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/** Step two: the person types the code from the email. */
async function verifySignInCode(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = parseEmail(formData.get("email"));
  if (!email) return { step: "email", error: "Enter your email address again." };
  const code = parseCode(formData.get("code"));
  if (!code) return { step: "code", email, error: "Enter the code from the email. It is numbers only." };

  try {
    const allowed = await getSupabaseAdminClient().rpc("allow_code_attempt", { target_email: email });
    if (allowed.error) throw allowed.error;
    if (!allowed.data) {
      return { step: "code", email, error: "Too many attempts. Please wait an hour, then ask for a new code." };
    }
    const supabase = await getSupabaseSessionClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      return {
        step: "code",
        email,
        error: "That code is not right, or it has expired. Check the latest email, or ask for a new code.",
      };
    }
  } catch (error) {
    console.error("Code check failed:", error);
    return { step: "code", email, error: TRY_AGAIN };
  }
  return finishSignIn(readDestination(formData.get("next")));
}

/**
 * The button in the email leads to a page with one more button, and that
 * button calls this. The extra press matters: many company email systems
 * open every link in a message to scan it, which would otherwise use up the
 * one-time link before the person saw it.
 */
export async function confirmSignInLink(formData: FormData): Promise<void> {
  const tokenHash = parseTokenHash(formData.get("token_hash"));
  const destination = readDestination(formData.get("next"));
  if (!tokenHash) redirect(`${signInPageFor(destination)}?problem=link`);
  let failed = false;
  try {
    const supabase = await getSupabaseSessionClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    failed = Boolean(error);
  } catch (error) {
    console.error("Link check failed:", error);
    failed = true;
  }
  if (failed) redirect(`${signInPageFor(destination)}?problem=link`);
  return finishSignIn(destination);
}

async function endSession(): Promise<void> {
  try {
    const supabase = await getSupabaseSessionClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("Sign-out failed:", error);
  }
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect(`${signInPath}?notice=signed-out`);
}

/** Sign-out from the admin area, which returns to the admin sign-in. */
export async function signOutAdmin(): Promise<void> {
  await endSession();
  redirect(`${adminSignInPath}?notice=signed-out`);
}

// ---------------------------------------------------------------------------
// Claiming listings and letting colleagues in
// ---------------------------------------------------------------------------

/** "This is my agency" on the account page. */
export async function claimListing(formData: FormData): Promise<void> {
  const agencyId = parseUuid(formData.get("agency_id"));
  const account = await getAccount();
  if (!account) redirect(signInPath);
  if (!agencyId) redirect(accountPath);

  const supabase = await getSupabaseSessionClient();
  const { data, error } = await supabase.rpc("claim_listing", { target_agency: agencyId });
  if (error) {
    console.error("claim_listing failed:", error.code, error.message);
    redirect(`${accountPath}?notice=claim-failed`);
  }

  if (data === "requested") {
    // Tell the people who manage it. A failed email does not undo the request.
    try {
      const match = account.matches.find((m) => m.id === agencyId);
      const owners = await getSupabaseAdminClient().rpc("agency_owner_emails", { target_agency: agencyId });
      if (owners.data?.length && match) {
        const message = buildAccessRequestEmail({
          agencyName: match.name,
          requesterEmail: account.email,
          accountUrl: `${await linkOrigin()}${accountPath}`,
        });
        await sendEmail({ to: owners.data, ...message });
      }
    } catch (error) {
      console.error("Access request email failed:", error);
    }
    redirect(`${accountPath}?notice=requested`);
  }
  redirect(`${accountListingPath(agencyId)}?notice=claimed`);
}

/** An owner approves or declines a colleague. */
export async function decideAccessRequest(formData: FormData): Promise<void> {
  const requestId = parseUuid(formData.get("request_id"));
  const approve = formData.get("decision") === "approve";
  if (!requestId) redirect(accountPath);
  const supabase = await getSupabaseSessionClient();
  const { error } = await supabase.rpc("decide_access_request", { request_id: requestId, approve });
  if (error) {
    console.error("decide_access_request failed:", error.code, error.message);
    redirect(`${accountPath}?notice=decision-failed`);
  }
  redirect(`${accountPath}?notice=${approve ? "approved" : "declined"}`);
}

// ---------------------------------------------------------------------------
// Editing a listing
// ---------------------------------------------------------------------------

type ListingValues = { introduction: string; description: string; specialismIds: number[] };

/** `at` changes with every answer, so the form can redraw itself with `values`. */
export type ListingFormState =
  | { status: "idle" }
  | { status: "saved"; at: number; values: ListingValues }
  | { status: "error"; at: number; message?: string; errors: ListingTextErrors; values: ListingValues };

function refreshListingPages(listing: { slug: string; country_slug: string; city_slug: string | null }) {
  revalidateDirectory({
    agencies: [listing.slug],
    cities: listing.city_slug ? [{ countrySlug: listing.country_slug, citySlug: listing.city_slug }] : [],
    countries: [listing.country_slug],
  });
}

/** Saves the introduction, description and specialisms of a listing. */
export async function saveListing(_previous: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const agencyId = parseUuid(formData.get("agency_id"));
  const result = validateListingText({
    introduction: formData.get("introduction"),
    description: formData.get("description"),
    specialisms: formData.getAll("specialisms"),
  });
  // Always hand back what was typed, so a refused save never loses it.
  const values = result.value;
  const fail = (message?: string, errors: ListingTextErrors = {}): ListingFormState => ({
    status: "error",
    at: Date.now(),
    message,
    errors,
    values,
  });
  if (!agencyId) return fail(TRY_AGAIN);
  if (!result.ok) return fail(undefined, result.errors);

  try {
    // Also confirms this person manages the listing.
    const listing = await getListing(agencyId);
    if (!listing) return fail("You are not signed in, or you do not manage this listing.");
    const supabase = await getSupabaseSessionClient();
    const { error } = await supabase.rpc("update_my_listing", {
      target_agency: agencyId,
      new_introduction: values.introduction,
      new_description: values.description,
      new_specialism_ids: values.specialismIds,
    });
    if (error) {
      console.error("update_my_listing failed:", error.code, error.message);
      return fail(TRY_AGAIN);
    }
    refreshListingPages(listing);
    // Redraw the page the person is on with what was just saved.
    refresh();
  } catch (error) {
    console.error("update_my_listing failed:", error);
    return fail(TRY_AGAIN);
  }
  return { status: "saved", at: Date.now(), values };
}

export type LogoFormState = { status: "idle" } | { status: "saved" } | { status: "error"; message: string };

/** Replaces (or removes) a listing's logo. */
export async function saveLogo(_previous: LogoFormState, formData: FormData): Promise<LogoFormState> {
  const agencyId = parseUuid(formData.get("agency_id"));
  const remove = formData.get("remove") === "1";
  const file = formData.get("logo");
  if (!agencyId) return { status: "error", message: TRY_AGAIN };

  try {
    // Confirms this person manages the listing before the secret key is used.
    const listing = await getListing(agencyId);
    if (!listing) return { status: "error", message: "You are not signed in, or you do not manage this listing." };

    const admin = getSupabaseAdminClient();
    let newPath: string | null = null;

    if (!remove) {
      if (!(file instanceof File) || file.size === 0) {
        return { status: "error", message: "Choose an image file first." };
      }
      if (file.size > LOGO_MAX_BYTES) {
        return { status: "error", message: "That file is larger than 1 MB. Please choose a smaller image." };
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const kind = sniffImage(bytes);
      if (!kind) {
        return { status: "error", message: "Please upload a PNG, JPEG or WebP image." };
      }
      newPath = `${agencyId}-${Date.now()}.${kind.ext}`;
      const upload = await admin.storage.from("agency-logos").upload(newPath, bytes, {
        contentType: kind.mime,
        cacheControl: "31536000",
        upsert: false,
      });
      if (upload.error) throw upload.error;
    }

    const saved = await admin.rpc("set_agency_logo", { target_agency: agencyId, new_logo_path: newPath as string });
    if (saved.error) throw saved.error;
    const oldPath = saved.data;
    if (oldPath && oldPath !== newPath && OWN_LOGO_NAME.test(oldPath)) {
      const removed = await admin.storage.from("agency-logos").remove([oldPath]);
      if (removed.error) console.error("Old logo not removed:", removed.error.message);
    }
    refreshListingPages(listing);
    // Redraw the page the person is on, so they see the new logo at once.
    refresh();
  } catch (error) {
    console.error("Logo save failed:", error);
    return { status: "error", message: TRY_AGAIN };
  }
  return { status: "saved" };
}

// ---------------------------------------------------------------------------
// A brand-new listing
// ---------------------------------------------------------------------------

export type NewListingState =
  | { status: "idle" }
  | { status: "sent"; name: string }
  | {
      status: "error";
      /** Changes with every answer, so the form can redraw itself with `values`. */
      at: number;
      message?: string;
      errors: NewListingErrors;
      values: Record<string, string | string[]>;
    };

const SUBMIT_MESSAGES: Record<string, string> = {
  already_listed: "This website already has a listing. Go back to your account to claim it.",
  already_submitted: "A listing for this website is already waiting for review.",
  rate_limited: "You have sent in several listings today. Please try again tomorrow.",
  personal_email: "A personal email address cannot add a listing. Sign in with your work email address.",
  domain_mismatch: "The website must be on the same domain as the email address you signed in with.",
  region_invalid: "Choose the state, province or territory again.",
};

/** Sends a new listing for review. */
export async function submitNewListing(_previous: NewListingState, formData: FormData): Promise<NewListingState> {
  const values: Record<string, string | string[]> = {
    name: cleanLine(formData.get("name")),
    website: cleanLine(formData.get("website")),
    country: cleanLine(formData.get("country")),
    region: cleanLine(formData.get("region")),
    city: cleanLine(formData.get("city")),
    introduction: cleanText(formData.get("introduction")),
    description: cleanText(formData.get("description")),
    specialisms: formData.getAll("specialisms").filter((v): v is string => typeof v === "string"),
  };

  const account = await getAccount();
  if (!account) redirect(signInPath);

  const [countries, regions] = await Promise.all([getCountries(), getRegions()]);
  const result = validateNewListing(
    {
      name: formData.get("name"),
      website: formData.get("website"),
      country: formData.get("country"),
      region: formData.get("region"),
      city: formData.get("city"),
      introduction: formData.get("introduction"),
      description: formData.get("description"),
      specialisms: formData.getAll("specialisms"),
    },
    account.domain,
    buildRegionChoices(countries, regions),
  );
  if (!result.ok) return { status: "error", at: Date.now(), errors: result.errors, values };
  const listing = result.value;
  const region = regions.find((r) => r.id === listing.regionId) ?? null;

  try {
    const supabase = await getSupabaseSessionClient();
    const { data: submissionId, error } = await supabase.rpc("submit_new_listing", {
      new_name: listing.name,
      new_website: listing.website,
      new_country_id: listing.countryId as number,
      new_city_name: listing.city,
      new_introduction: listing.introduction,
      new_description: listing.description,
      new_specialism_ids: listing.specialismIds,
      ...(listing.regionId ? { new_region_id: listing.regionId } : {}),
    });
    if (error) {
      const known = SUBMIT_MESSAGES[error.hint ?? ""];
      if (!known) console.error("submit_new_listing failed:", error.code, error.message);
      return { status: "error", at: Date.now(), message: known ?? TRY_AGAIN, errors: {}, values };
    }
    // Found after the agency has its answer, so they never wait on it.
    if (submissionId) after(() => lookForSubmissionLogo(submissionId, listing.website, account.domain));

    const message = buildSubmissionEmail({
      name: listing.name,
      website: `https://${account.domain}`,
      email: account.email,
      city: region && !listing.city.includes(",") ? `${listing.city}, ${region.code}` : listing.city,
      description: listing.description,
      reviewUrl: `${await linkOrigin()}${reviewPath}`,
    });
    await sendEmail({ to: [...NOTIFICATION_RECIPIENTS], replyTo: account.email, ...message });
  } catch (error) {
    console.error("submit_new_listing failed:", error);
    return { status: "error", at: Date.now(), message: TRY_AGAIN, errors: {}, values };
  }
  return { status: "sent", name: listing.name };
}

// ---------------------------------------------------------------------------
// People who signed in with a personal address (Gmail and similar)
// ---------------------------------------------------------------------------

export type HelpState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string; values: { name: string; agencyName: string; website: string } };

/**
 * A personal address cannot prove where someone works, so they tell us
 * which agency is theirs and the RecruiterLink team checks it by hand.
 */
export async function askToBeLinked(_previous: HelpState, formData: FormData): Promise<HelpState> {
  const values = {
    name: cleanLine(formData.get("name")).slice(0, 120),
    agencyName: cleanLine(formData.get("agencyName")).slice(0, 160),
    website: cleanLine(formData.get("website")).slice(0, 300),
  };
  const account = await getAccount();
  if (!account) redirect(signInPath);
  if (values.name.length < 2 || values.agencyName.length < 2 || values.website.length < 4) {
    return { status: "error", message: "Please fill in your name, your agency's name and its website.", values };
  }

  try {
    const supabase = await getSupabaseSessionClient();
    const message = `Signed in to an account with ${account.email} and asked to be linked to this agency's listing. Link them at ${await linkOrigin()}${reviewPath} once checked.`;
    const { error } = await supabase.from("listing_requests").insert({
      kind: "claim",
      name: values.name,
      email: account.email,
      agency_name: values.agencyName,
      website: values.website,
      message,
      source_path: accountPath,
    });
    if (error) {
      const limited = error.hint?.startsWith("rate_limited");
      if (!limited) console.error("listing_requests insert failed:", error.code, error.message);
      return {
        status: "error",
        message: limited ? "We already have your request. We will reply by email." : TRY_AGAIN,
        values,
      };
    }
    await sendRequestNotification({
      kind: "claim",
      name: values.name,
      email: account.email,
      agencyName: values.agencyName,
      website: values.website,
      message,
      sourcePath: accountPath,
    });
  } catch (error) {
    console.error("askToBeLinked failed:", error);
    return { status: "error", message: TRY_AGAIN, values };
  }
  return { status: "sent" };
}

// ---------------------------------------------------------------------------
// For the people who run the site
// ---------------------------------------------------------------------------

/** Publishes or turns down a new listing, and tells the agency. */
export async function reviewSubmission(formData: FormData): Promise<void> {
  const submissionId = parseUuid(formData.get("submission_id"));
  const approve = formData.get("decision") === "approve";
  const note = cleanText(formData.get("note")).slice(0, 500);
  if (!submissionId) redirect(reviewPath);

  // Null unless this person runs the site; the database checks again below.
  const pending = await getPendingSubmissions();
  const submission = pending?.find((s) => s.id === submissionId);
  if (!submission) redirect(`${reviewPath}?notice=not-found`);

  const supabase = await getSupabaseSessionClient();
  const origin = await linkOrigin();
  let slug: string | null = null;

  if (approve) {
    const { data, error } = await supabase.rpc("admin_approve_submission", { submission_id: submissionId });
    if (error) {
      console.error("admin_approve_submission failed:", error.code, error.message);
      const notice =
        error.hint === "already_listed"
          ? "already-listed"
          : error.hint === "region_required"
            ? "region-required"
            : error.hint === "city_invalid"
              ? "city-invalid"
              : "failed";
      redirect(`${reviewPath}?notice=${notice}`);
    }
    slug = data;
    // A new agency changes its city, its country, the totals and the sitemaps.
    revalidateDirectory({ everything: true });
  } else {
    const { error } = await supabase.rpc("admin_reject_submission", { submission_id: submissionId, note });
    if (error) {
      console.error("admin_reject_submission failed:", error.code, error.message);
      redirect(`${reviewPath}?notice=failed`);
    }
    if (submission.logo_path) await removeLogoFile(submission.logo_path);
  }

  const message = buildDecisionEmail({
    name: submission.name,
    approved: approve,
    listingUrl: slug ? `${origin}${agencyPath(slug)}` : undefined,
    accountUrl: `${origin}${accountPath}`,
    note: approve ? null : note,
  });
  await sendEmail({ to: [submission.email], replyTo: NOTIFICATION_RECIPIENTS[0], ...message });
  redirect(`${reviewPath}?notice=${approve ? "published" : "rejected"}`);
}

/** Looks for a listing's logo again, for the review page. */
export async function findSubmissionLogo(formData: FormData): Promise<void> {
  const submissionId = parseUuid(formData.get("submission_id"));
  if (!submissionId) redirect(reviewPath);

  // Null unless this person runs the site.
  const pending = await getPendingSubmissions();
  const submission = pending?.find((s) => s.id === submissionId);
  if (!submission) redirect(`${reviewPath}?notice=not-found`);

  let domain: string;
  try {
    domain = new URL(submission.website).hostname.replace(/^www\./, "");
  } catch {
    redirect(`${reviewPath}?notice=logo-none`);
  }
  await lookForSubmissionLogo(submission.id, submission.website, domain);

  const latest = (await getPendingSubmissions())?.find((s) => s.id === submissionId);
  redirect(`${reviewPath}?notice=${latest?.logo_path ? "logo-found" : "logo-none"}`);
}

export type LinkPersonState =
  | { status: "idle" }
  | { status: "linked"; email: string; slug: string }
  | { status: "error"; message: string; values: { email: string; slug: string } };

const LINK_MESSAGES: Record<string, string> = {
  person_not_found: "Nobody has signed in with that email address yet. Ask them to sign in once first.",
  agency_not_found: "No published listing has that address. Copy the last part of the listing's web address, for example caroo-manchester.",
};

/** Links a person to a listing by hand (for people with a personal email address). */
export async function linkPerson(_previous: LinkPersonState, formData: FormData): Promise<LinkPersonState> {
  const email = parseEmail(formData.get("email"));
  // Accept a pasted web address as well as the bare last part of it.
  const slug = cleanLine(formData.get("slug")).toLowerCase().replace(/^.*\/agencies\//, "").replace(/[/?#].*$/, "");
  const values = { email: cleanLine(formData.get("email")), slug: cleanLine(formData.get("slug")) };
  if (!email || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return { status: "error", message: "Enter the person's email address and the listing's address.", values };
  }
  try {
    const supabase = await getSupabaseSessionClient();
    const { error } = await supabase.rpc("admin_link_person", { person_email: email, agency_slug: slug });
    if (error) {
      const known = LINK_MESSAGES[error.hint ?? ""];
      if (!known) console.error("admin_link_person failed:", error.code, error.message);
      return { status: "error", message: known ?? "That did not work. You may not be signed in as an administrator.", values };
    }
    revalidateDirectory({ agencies: [slug] });
  } catch (error) {
    console.error("admin_link_person failed:", error);
    return { status: "error", message: TRY_AGAIN, values };
  }
  return { status: "linked", email, slug };
}
