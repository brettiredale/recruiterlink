import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { LogoImage } from "@/components";
import { AccountShell, Panel } from "@/features/account/AccountShell";
import { getAccount, getListing } from "@/features/account/data";
import { ListingTextForm, LogoForm, type EditableListing } from "@/features/account/ListingEditor";
import { Notice, SubmitButton } from "@/features/account/ui";
import { parseUuid } from "@/features/account/validate";
import { openBillingPortal } from "@/features/premium/actions";
import { PremiumEditor, type EditorContent } from "@/features/premium/PremiumEditor";
import { buttonClasses } from "@/components";
import { getSpecialisms } from "@/lib/directory";
import { agencyMediaUrl } from "@/lib/data/premium";
import { agencyPath, premiumUpsellPath, signInPath } from "@/lib/routes";
import { getSupabaseSessionClient } from "@/lib/supabase/session";
import { isGenericSpecialism } from "@/lib/specialisms";
import AccountLoading from "../../loading";

export const metadata: Metadata = { title: "Edit your listing" };

type Props = PageProps<"/account/listings/[id]">;

type StoredContent = {
  video_url: string | null;
  photos: { id: string; path: string; caption: string | null }[];
  team: { id: string; name: string; job_title: string | null; photo_path: string | null; linkedin_url: string | null }[];
  testimonials: { id: string; quote: string; person: string; detail: string | null }[];
};

/** What this listing has added with Premium (kept after a lapse, so it can be tidied). */
async function getEditorContent(agencyId: string): Promise<EditorContent> {
  const supabase = await getSupabaseSessionClient();
  const { data, error } = await supabase.rpc("my_premium_content", { target_agency: agencyId });
  if (error) throw new Error(`my_premium_content failed: ${error.code} ${error.message}`);
  const stored = data as unknown as StoredContent;
  return {
    videoUrl: stored.video_url,
    photos: stored.photos.map((photo) => ({ id: photo.id, url: agencyMediaUrl(photo.path), caption: photo.caption })),
    team: stored.team.map((person) => ({
      id: person.id,
      name: person.name,
      jobTitle: person.job_title,
      photoUrl: person.photo_path ? agencyMediaUrl(person.photo_path) : null,
      linkedInUrl: person.linkedin_url,
    })),
    testimonials: stored.testimonials,
  };
}

async function Editor({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const agencyId = parseUuid(id);
  if (!agencyId) notFound();

  const account = await getAccount();
  if (!account) redirect(signInPath);
  const [listing, allSpecialisms] = await Promise.all([getListing(agencyId), getSpecialisms()]);
  // Not theirs, or not there: say the same thing either way.
  if (!listing) notFound();
  const premium = listing.plan === "premium";
  const content = premium ? await getEditorContent(listing.id) : null;

  const editable: EditableListing = {
    id: listing.id,
    introduction: listing.introduction ?? "",
    description: listing.description ?? "",
    specialismIds: listing.specialism_ids,
    hasLogo: Boolean(listing.logo_path),
  };
  // Real sectors first; the two catch-all labels last.
  const specialisms = [...allSpecialisms]
    .sort((a, b) => Number(isGenericSpecialism(a.slug)) - Number(isGenericSpecialism(b.slug)))
    .map(({ id: specialismId, name }) => ({ id: specialismId, name }));
  const where = listing.city && listing.city !== listing.country ? `${listing.city}, ${listing.country}` : listing.country;

  return (
    <AccountShell
      title={listing.name}
      email={account.email}
      back
      intro={
        <>
          Changes appear on{" "}
          <Link
            href={agencyPath(listing.slug)}
            className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
          >
            your public page
          </Link>{" "}
          within a minute or two of saving.
        </>
      }
    >
      {query.notice === "claimed" ? (
        <Notice tone="success">
          This listing is now yours to manage. Check the details below and make it your own.
        </Notice>
      ) : null}
      {query.notice === "billing-failed" ? (
        <Notice tone="error">
          We could not open your billing page just now. Please try again in a few minutes.
        </Notice>
      ) : null}

      {premium ? (
        <Panel
          id="premium"
          title="Your Premium page"
          description="Add a video, photos, your team and what clients say. Each one appears on your public page as soon as you save it."
        >
          {content ? <PremiumEditor agencyId={listing.id} content={content} /> : null}
        </Panel>
      ) : (
        <Panel
          id="premium"
          tone="cream"
          title="Go Premium"
          description="Be shown first in your city, specialisms and search, and add a video, photos, your team and testimonials to your page. $49 a month or $490 a year."
        >
          <Link href={premiumUpsellPath(listing.id)} className={buttonClasses("primary-small")}>
            See what Premium adds
          </Link>
        </Panel>
      )}

      <Panel
        title="Logo"
        description="Shown on your card in the directory and at the top of your agency page."
      >
        <div className="flex flex-wrap items-start gap-x-8 gap-y-6">
          <LogoImage name={listing.name} file={listing.logo_path} size={112} eager />
          <div className="min-w-0 flex-1 basis-[320px]">
            <LogoForm listing={editable} />
          </div>
        </div>
      </Panel>

      <Panel title="Your listing's wording">
        <ListingTextForm listing={editable} specialisms={specialisms} />
      </Panel>

      <Panel
        title="Details we look after"
        description={
          <>
            Your agency&rsquo;s name, website and location are how people find you and how we know
            the listing is yours, so we change them by hand.{" "}
            <Link href="/contact" className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep">
              Tell us what needs to change
            </Link>
            .
          </>
        }
      >
        <dl className="grid gap-x-10 gap-y-4 text-[17px] sm:grid-cols-3">
          <div>
            <dt className="text-[15px] text-muted">Name</dt>
            <dd className="font-semibold break-words">{listing.name}</dd>
          </div>
          <div>
            <dt className="text-[15px] text-muted">Website</dt>
            <dd className="font-semibold break-all">{listing.domain ?? "None"}</dd>
          </div>
          <div>
            <dt className="text-[15px] text-muted">Location</dt>
            <dd className="font-semibold">{where}</dd>
          </div>
        </dl>
      </Panel>

      {premium ? (
        <Panel title="Billing" description="Change between monthly and yearly, update your card, download invoices or cancel.">
          <form action={openBillingPortal}>
            <input type="hidden" name="agency_id" value={listing.id} />
            <SubmitButton pendingLabel="Opening…" variant="navy">
              Manage billing
            </SubmitButton>
          </form>
        </Panel>
      ) : null}
    </AccountShell>
  );
}

export default function ListingPage(props: Props) {
  return (
    <Suspense fallback={<AccountLoading />}>
      <Editor {...props} />
    </Suspense>
  );
}
