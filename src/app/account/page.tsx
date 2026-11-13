import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, LogoImage, PremiumBadge, buttonClasses } from "@/components";
import { AccountShell, Panel } from "@/features/account/AccountShell";
import { claimListing, decideAccessRequest } from "@/features/account/actions";
import { getAccount, type Account } from "@/features/account/data";
import { LinkRequestForm } from "@/features/account/SmallForms";
import { Notice, SubmitButton } from "@/features/account/ui";
import {
  accountListingPath,
  agencyPath,
  newListingPath,
  adminPath,
  reviewPath,
  signInPath,
} from "@/lib/routes";
import AccountLoading from "./loading";

export const metadata: Metadata = { title: "Your account" };

const NOTICES: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  claimed: { tone: "success", text: "You now manage your agency's listing. You can update it below." },
  requested: {
    tone: "success",
    text: "We have asked the colleague who manages that listing to let you in. You will see it here once they approve.",
  },
  approved: { tone: "success", text: "Approved. Your colleague can now manage the listing too." },
  declined: { tone: "info", text: "Request declined. Nothing has changed on your listing." },
  "claim-failed": { tone: "error", text: "We could not add that listing to your account. Please try again." },
  "decision-failed": { tone: "error", text: "We could not record that decision. Please try again." },
};

function place(item: { city: string | null; country: string }) {
  return item.city && item.city !== item.country ? `${item.city}, ${item.country}` : item.country;
}

function Listings({ account }: { account: Account }) {
  return (
    <section aria-labelledby="listings-heading">
      <h2
        id="listings-heading"
        className="mb-5 font-heading text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-extrabold tracking-[-0.03em]"
      >
        {account.listings.length === 1 ? "Your listing" : "Your listings"}
      </h2>
      <ul className="grid gap-5 lg:grid-cols-2">
        {account.listings.map((listing) => (
          <li
            key={listing.id}
            className="flex flex-col gap-5 rounded-card border-[1.5px] border-line-mid bg-white p-5 sm:p-7"
          >
            <div className="flex items-start gap-4">
              <LogoImage name={listing.name} file={listing.logo_path} size={68} />
              <div className="min-w-0">
                <h3 className="font-heading text-[22px] leading-tight font-extrabold tracking-[-0.02em] break-words">
                  {listing.name}
                </h3>
                <p className="text-base text-muted">{place(listing)}</p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                  {listing.plan === "premium" ? (
                    <PremiumBadge />
                  ) : (
                    <span className="rounded-full bg-lavender px-3 py-1">Free listing</span>
                  )}
                  {listing.role === "member" ? (
                    <span className="rounded-full bg-pale px-3 py-1 text-muted">Shared with you</span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-3">
              <ButtonLink href={accountListingPath(listing.id)} variant="primary-small">
                Edit listing
              </ButtonLink>
              <ButtonLink href={agencyPath(listing.slug)} variant="outline">
                View public page
              </ButtonLink>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Matches({ account }: { account: Account }) {
  const hasListings = account.listings.length > 0;
  return (
    <Panel
      title={
        account.matches.length === 1
          ? `We found a listing on ${account.domain}`
          : `We found ${account.matches.length} listings on ${account.domain}`
      }
      description={
        hasListings
          ? "These use the same website as your email address. Add any that you also look after."
          : "Your email address matches the website on the listings below. Choose the ones you look after: for a group with several offices, you can add more than one."
      }
    >
      <ul className="flex flex-col gap-3">
        {account.matches.map((match) => (
          <li
            key={match.id}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-card border-[1.5px] border-line-mid bg-white px-5 py-4"
          >
            <div className="min-w-0">
              <p className="font-heading text-xl leading-tight font-extrabold tracking-[-0.02em] break-words">
                {match.name}
              </p>
              <p className="text-base text-muted">
                {place(match)}
                {" · "}
                <Link
                  href={agencyPath(match.slug)}
                  className="font-semibold text-indigo underline underline-offset-4 hover:text-indigo-deep"
                >
                  View page
                </Link>
              </p>
            </div>
            {match.requested ? (
              <p className="text-base font-semibold text-muted">
                Waiting for a colleague to approve your request
              </p>
            ) : (
              <form action={claimListing}>
                <input type="hidden" name="agency_id" value={match.id} />
                <SubmitButton pendingLabel="Working…" variant={match.managed ? "outline" : "primary-small"}>
                  {match.managed ? "Ask to help manage it" : "This is my agency"}
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
      {account.matches.some((m) => m.managed && !m.requested) ? (
        <p className="mt-4 text-[15px] text-muted">
          “Ask to help manage it” means a colleague already looks after that listing. We will email
          them, and they decide.
        </p>
      ) : null}
    </Panel>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const [account, params] = await Promise.all([getAccount(), searchParams]);
  if (!account) redirect(signInPath);

  const notice = typeof params.notice === "string" ? NOTICES[params.notice] : undefined;
  const pending = account.submissions.filter((s) => s.status === "pending");
  const rejected = account.submissions.filter((s) => s.status === "rejected");
  const nothingYet =
    account.listings.length === 0 && account.matches.length === 0 && pending.length === 0;

  return (
    <AccountShell title="Your account" email={account.email}>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {account.is_admin ? (
        <Panel
          tone="cream"
          title="You run this site"
          description="Write and manage blog posts, connect Grokbot, review new listings that agencies have sent in, and link people to listings by hand."
        >
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={adminPath} variant="navy">
              Open the admin area
            </ButtonLink>
            <ButtonLink href={reviewPath} variant="outline">
              Review new listings
            </ButtonLink>
          </div>
        </Panel>
      ) : null}

      {account.requests_to_review.length > 0 ? (
        <Panel
          tone="cream"
          title={
            account.requests_to_review.length === 1
              ? "A colleague has asked to help manage your listing"
              : "Colleagues have asked to help manage your listings"
          }
          description="Each person has confirmed an email address at your agency. If you approve, they can edit the listing as you can. If you do not recognise them, decline."
        >
          <ul className="flex flex-col gap-3">
            {account.requests_to_review.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-card bg-white px-5 py-4"
              >
                <p className="min-w-0 text-[17px]">
                  <strong className="break-all">{request.email}</strong>
                  <span className="text-muted"> for {request.agency_name}</span>
                </p>
                <form action={decideAccessRequest} className="flex flex-wrap gap-3">
                  <input type="hidden" name="request_id" value={request.id} />
                  <SubmitButton pendingLabel="Saving…" name="decision" value="approve">
                    Approve
                  </SubmitButton>
                  <button
                    type="submit"
                    name="decision"
                    value="decline"
                    className={buttonClasses("outline", "cursor-pointer")}
                  >
                    Decline
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {account.listings.length > 0 ? <Listings account={account} /> : null}

      {account.matches.length > 0 ? <Matches account={account} /> : null}

      {pending.length > 0 ? (
        <Panel
          title="Waiting for review"
          description="A member of the RecruiterLink team checks every new listing before it goes on the site, usually within two working days. We will email you when it is published."
        >
          <ul className="flex flex-col gap-2 text-[17px]">
            {pending.map((submission) => (
              <li key={submission.id} className="rounded-card bg-white px-5 py-4 font-semibold">
                {submission.name}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {rejected.map((submission) => (
        <Notice key={submission.id} tone="info">
          We could not publish the listing you sent for {submission.name}.
          {submission.review_note ? ` Reason: ${submission.review_note}` : ""} You are welcome to
          send it again with changes, or reply to our email.
        </Notice>
      ))}

      {account.is_personal_email && account.listings.length === 0 ? (
        <Panel
          title="One more step: tell us which agency is yours"
          description={
            <>
              You signed in with a personal email address ({account.domain}), which cannot show
              where you work. The quickest route is to{" "}
              <strong className="text-navy">sign out and sign in with your work address</strong>:
              your listing is then yours straight away. If you do not have one, send us your
              agency&rsquo;s details and we will check them by hand.
            </>
          }
        >
          <div className="max-w-[560px]">
            <LinkRequestForm />
          </div>
        </Panel>
      ) : null}

      {!account.is_personal_email && nothingYet ? (
        <Panel
          title={`${account.domain} is not on RecruiterLink yet`}
          description="We could not find a listing whose website matches your email address. Add your agency now: it takes about five minutes and a listing is free."
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href={newListingPath} variant="primary">
              Add your agency
            </ButtonLink>
            <p className="max-w-[420px] text-[15px] text-muted">
              Already listed under a different website address?{" "}
              <Link href="/contact" className="font-bold text-indigo underline underline-offset-4">
                Tell us
              </Link>{" "}
              and we will link it to you.
            </p>
          </div>
        </Panel>
      ) : null}

      {!account.is_personal_email && !nothingYet && account.matches.length === 0 && account.listings.length > 0 ? (
        <p className="text-base text-muted">
          Looking for Premium (images, video, team profiles and testimonials)? Online upgrades open
          soon, and we will email everyone who manages a listing when they do.
        </p>
      ) : null}
    </AccountShell>
  );
}

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <Suspense fallback={<AccountLoading />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}
