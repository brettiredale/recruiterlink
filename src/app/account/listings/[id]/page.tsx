import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { LogoImage } from "@/components";
import { AccountShell, Panel } from "@/features/account/AccountShell";
import { getAccount, getListing } from "@/features/account/data";
import { ListingTextForm, LogoForm, type EditableListing } from "@/features/account/ListingEditor";
import { Notice } from "@/features/account/ui";
import { parseUuid } from "@/features/account/validate";
import { getSpecialisms } from "@/lib/directory";
import { agencyPath, signInPath } from "@/lib/routes";
import { isGenericSpecialism } from "@/lib/specialisms";
import AccountLoading from "../../loading";

export const metadata: Metadata = { title: "Edit your listing" };

type Props = PageProps<"/account/listings/[id]">;

async function Editor({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const agencyId = parseUuid(id);
  if (!agencyId) notFound();

  const account = await getAccount();
  if (!account) redirect(signInPath);
  const [listing, allSpecialisms] = await Promise.all([getListing(agencyId), getSpecialisms()]);
  // Not theirs, or not there: say the same thing either way.
  if (!listing) notFound();

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
