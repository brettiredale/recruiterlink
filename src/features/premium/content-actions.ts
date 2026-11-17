"use server";

import { refresh } from "next/cache";
import { getListing, type ListingDetail } from "@/features/account/data";
import { parseUuid, sniffImage } from "@/features/account/validate";
import { announcePages } from "@/lib/indexnow";
import { revalidateDirectory } from "@/lib/revalidate";
import { agencyPath } from "@/lib/routes";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseSessionClient } from "@/lib/supabase/session";
import { PREMIUM_LIMITS, cleanParagraphs, cleanText, parseLinkedInUrl, parseVideoUrl } from "./validate";

/** The answer every Premium form gets back. `at` re-keys the form on save. */
export type PremiumFormState =
  | { status: "idle" }
  | { status: "saved"; message: string; at: number }
  | { status: "error"; message: string; at: number };

const BUCKET = "agency-media";
const TRY_AGAIN = "Sorry, something went wrong on our side. Please try again in a few minutes.";
const NOT_YOURS = "You are not signed in, or you do not manage this listing.";
const NOT_PREMIUM = "This part of your page comes with Premium.";

const saved = (message: string): PremiumFormState => ({ status: "saved", message, at: Date.now() });
const failed = (message: string): PremiumFormState => ({ status: "error", message, at: Date.now() });

function refreshPages(listing: ListingDetail) {
  revalidateDirectory({
    agencies: [listing.slug],
    cities: listing.city_slug ? [{ countrySlug: listing.country_slug, citySlug: listing.city_slug }] : [],
    countries: [listing.country_slug],
  });
  announcePages([agencyPath(listing.slug)]);
  refresh();
}

/** The listing, if this person manages it and it is on Premium. */
async function premiumListing(formData: FormData): Promise<ListingDetail | PremiumFormState> {
  const agencyId = parseUuid(formData.get("agency_id"));
  if (!agencyId) return failed(TRY_AGAIN);
  const listing = await getListing(agencyId);
  if (!listing) return failed(NOT_YOURS);
  if (listing.plan !== "premium") return failed(NOT_PREMIUM);
  return listing;
}

function isState(value: ListingDetail | PremiumFormState): value is PremiumFormState {
  return "status" in value && !("slug" in value);
}

/** Database refusals the person can act on ("You already have 8 photos"). */
function messageFor(error: { hint?: string | null; message: string }): string {
  if (error.hint === "limit") return `${error.message}. Remove one first.`;
  if (error.hint === "not_premium") return NOT_PREMIUM;
  if (error.hint === "not_member") return NOT_YOURS;
  return TRY_AGAIN;
}

/** Checks and stores one uploaded image; returns its path in the bucket. */
async function uploadImage(
  agencyId: string,
  kind: "photo" | "team",
  file: FormDataEntryValue | null,
): Promise<{ path: string } | { error: string } | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > PREMIUM_LIMITS.photoBytes) return { error: "That image is larger than 2 MB. Please choose a smaller one." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { error: "Please upload a PNG, JPEG or WebP image." };
  const path = `${agencyId}/${kind}-${Date.now()}.${type.ext}`;
  const upload = await getSupabaseAdminClient().storage.from(BUCKET).upload(path, bytes, {
    contentType: type.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) throw upload.error;
  return { path };
}

async function removeFile(path: string | null | undefined) {
  if (!path) return;
  const removed = await getSupabaseAdminClient().storage.from(BUCKET).remove([path]);
  if (removed.error) console.error("Premium file not removed:", removed.error.message);
}

export async function saveVideo(_previous: PremiumFormState, formData: FormData): Promise<PremiumFormState> {
  try {
    const listing = await premiumListing(formData);
    if (isState(listing)) return listing;
    const remove = formData.get("remove") === "1";
    const input = cleanText(formData.get("video_url"));
    const video = remove ? null : parseVideoUrl(input);
    if (!remove && !video) {
      return failed("Paste a YouTube or Vimeo link, for example https://www.youtube.com/watch?v=… or https://vimeo.com/….");
    }
    const supabase = await getSupabaseSessionClient();
    const { error } = await supabase.rpc("set_my_video", { target_agency: listing.id, new_url: video?.url ?? "" });
    if (error) return failed(messageFor(error));
    refreshPages(listing);
    return saved(remove ? "Video removed." : "Video saved. It is on your page now.");
  } catch (error) {
    console.error("Video save failed:", error);
    return failed(TRY_AGAIN);
  }
}

export async function addPhoto(_previous: PremiumFormState, formData: FormData): Promise<PremiumFormState> {
  let path: string | null = null;
  try {
    const listing = await premiumListing(formData);
    if (isState(listing)) return listing;
    const caption = cleanText(formData.get("caption"));
    if (caption.length > PREMIUM_LIMITS.caption) return failed(`Keep the caption to ${PREMIUM_LIMITS.caption} characters.`);
    const upload = await uploadImage(listing.id, "photo", formData.get("photo"));
    if (!upload) return failed("Choose a photo first.");
    if ("error" in upload) return failed(upload.error);
    path = upload.path;
    const supabase = await getSupabaseSessionClient();
    const { error } = await supabase.rpc("add_my_photo", { target_agency: listing.id, new_path: path, new_caption: caption });
    if (error) {
      await removeFile(path);
      return failed(messageFor(error));
    }
    refreshPages(listing);
    return saved("Photo added.");
  } catch (error) {
    console.error("Photo upload failed:", error);
    await removeFile(path);
    return failed(TRY_AGAIN);
  }
}

export async function addTeamMember(_previous: PremiumFormState, formData: FormData): Promise<PremiumFormState> {
  let path: string | null = null;
  try {
    const listing = await premiumListing(formData);
    if (isState(listing)) return listing;
    const name = cleanText(formData.get("name"));
    const jobTitle = cleanText(formData.get("job_title"));
    const linkedInInput = cleanText(formData.get("linkedin_url"));
    const { min, max } = PREMIUM_LIMITS.name;
    if (name.length < min || name.length > max) return failed(`Add their name (${min} to ${max} characters).`);
    if (jobTitle.length > PREMIUM_LIMITS.jobTitle) return failed(`Keep the job title to ${PREMIUM_LIMITS.jobTitle} characters.`);
    const linkedIn = linkedInInput ? parseLinkedInUrl(linkedInInput) : "";
    if (linkedIn === null) return failed("That LinkedIn link should look like https://www.linkedin.com/in/their-name.");
    const upload = await uploadImage(listing.id, "team", formData.get("photo"));
    if (upload && "error" in upload) return failed(upload.error);
    path = upload?.path ?? null;
    const supabase = await getSupabaseSessionClient();
    const { error } = await supabase.rpc("add_my_team_member", {
      target_agency: listing.id,
      new_name: name,
      new_job_title: jobTitle,
      new_photo_path: path as string,
      new_linkedin_url: linkedIn,
    });
    if (error) {
      await removeFile(path);
      return failed(messageFor(error));
    }
    refreshPages(listing);
    return saved(`${name} added to your team.`);
  } catch (error) {
    console.error("Team member save failed:", error);
    await removeFile(path);
    return failed(TRY_AGAIN);
  }
}

export async function addTestimonial(_previous: PremiumFormState, formData: FormData): Promise<PremiumFormState> {
  try {
    const listing = await premiumListing(formData);
    if (isState(listing)) return listing;
    const quote = cleanParagraphs(formData.get("quote"));
    const person = cleanText(formData.get("person"));
    const detail = cleanText(formData.get("detail"));
    if (quote.length < PREMIUM_LIMITS.quote.min || quote.length > PREMIUM_LIMITS.quote.max) {
      return failed(`The quote needs ${PREMIUM_LIMITS.quote.min} to ${PREMIUM_LIMITS.quote.max} characters.`);
    }
    if (person.length < PREMIUM_LIMITS.person.min || person.length > PREMIUM_LIMITS.person.max) {
      return failed("Add who said it.");
    }
    if (detail.length > PREMIUM_LIMITS.detail) return failed(`Keep the role and company to ${PREMIUM_LIMITS.detail} characters.`);
    const supabase = await getSupabaseSessionClient();
    const { error } = await supabase.rpc("add_my_testimonial", {
      target_agency: listing.id,
      new_quote: quote,
      new_person: person,
      new_detail: detail,
    });
    if (error) return failed(messageFor(error));
    refreshPages(listing);
    return saved("Testimonial added.");
  } catch (error) {
    console.error("Testimonial save failed:", error);
    return failed(TRY_AGAIN);
  }
}

/** Removes a photo, team member or testimonial (any plan, so a lapsed agency can tidy up). */
export async function removePremiumItem(_previous: PremiumFormState, formData: FormData): Promise<PremiumFormState> {
  try {
    const agencyId = parseUuid(formData.get("agency_id"));
    const itemId = parseUuid(formData.get("item_id"));
    const kind = formData.get("kind");
    if (!agencyId || !itemId || (kind !== "photo" && kind !== "team" && kind !== "testimonial")) return failed(TRY_AGAIN);
    const listing = await getListing(agencyId);
    if (!listing) return failed(NOT_YOURS);
    const supabase = await getSupabaseSessionClient();
    const { data, error } = await supabase.rpc("remove_my_premium_item", {
      target_agency: agencyId,
      item_kind: kind,
      item_id: itemId,
    });
    if (error) return failed(messageFor(error));
    await removeFile(data);
    refreshPages(listing);
    return saved("Removed.");
  } catch (error) {
    console.error("Premium item remove failed:", error);
    return failed(TRY_AGAIN);
  }
}
