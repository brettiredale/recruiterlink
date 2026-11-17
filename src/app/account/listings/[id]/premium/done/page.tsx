import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, Container } from "@/components";
import { getAccount, getListing } from "@/features/account/data";
import { parseUuid } from "@/features/account/validate";
import { syncSubscription } from "@/features/premium/sync";
import { accountListingPath, agencyPath, premiumUpsellPath, signInPath } from "@/lib/routes";
import { getCheckoutSession } from "@/lib/stripe";
import AccountLoading from "../../../../loading";

export const metadata: Metadata = { title: "Welcome to Premium" };

type Props = PageProps<"/account/listings/[id]/premium/done">;

/**
 * Stripe Checkout comes back here. The payment is checked with Stripe on the
 * server (never trusted from the address), so Premium is on the moment the
 * page shows, even if the webhook has not arrived yet.
 */
async function confirmPayment(sessionId: string, agencyId: string): Promise<"premium" | "pending" | "failed"> {
  try {
    const session = await getCheckoutSession(sessionId);
    if (session.client_reference_id !== agencyId) return "failed";
    if (session.status !== "complete" || !session.subscription) return "pending";
    const result = await syncSubscription(session.subscription);
    return result?.premium ? "premium" : "pending";
  } catch (error) {
    console.error("Premium confirmation failed:", error);
    return "pending";
  }
}

async function Done({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const agencyId = parseUuid(id);
  if (!agencyId) notFound();
  const account = await getAccount();
  if (!account) redirect(signInPath);
  const listing = await getListing(agencyId);
  if (!listing) notFound();

  const sessionId = typeof query.session_id === "string" && /^cs_[A-Za-z0-9_]{10,200}$/.test(query.session_id) ? query.session_id : null;
  const state = listing.plan === "premium" ? "premium" : sessionId ? await confirmPayment(sessionId, agencyId) : "failed";
  if (state === "failed") redirect(premiumUpsellPath(agencyId));

  return (
    <Container width="narrow" className="flex flex-col items-center gap-5 py-14 text-center sm:py-20">
      <p className="label-mono text-xs text-pink-text">{state === "premium" ? "Payment received" : "Payment processing"}</p>
      <h1 className="font-heading text-[clamp(2rem,4.2vw,2.75rem)] leading-[1.12] font-extrabold tracking-[-0.03em] text-balance">
        {state === "premium" ? `${listing.name} is now Premium` : "Thank you. We are confirming your payment"}
      </h1>
      <p className="max-w-[620px] text-lg text-muted">
        {state === "premium"
          ? "Your listing now comes first on your city, specialism and country pages and in search. Add a video, photos, your team and client testimonials to make the most of it."
          : "Stripe is still confirming the payment. Premium switches on by itself within a few minutes; you can start adding to your listing now."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href={`${accountListingPath(agencyId)}#premium`}>Add your video, photos and team</ButtonLink>
        <ButtonLink href={agencyPath(listing.slug)} variant="outline">
          See your page
        </ButtonLink>
      </div>
      <p className="text-[15px] text-muted">
        A receipt is on its way from Stripe. Manage or cancel billing any time from{" "}
        <Link href={accountListingPath(agencyId)} className="font-semibold text-indigo underline underline-offset-4">
          your listing
        </Link>
        .
      </p>
    </Container>
  );
}

export default function PremiumDonePage(props: Props) {
  return (
    <Suspense fallback={<AccountLoading />}>
      <Done {...props} />
    </Suspense>
  );
}
