"use server";

import { redirect } from "next/navigation";
import { getAccount, getListing } from "@/features/account/data";
import { linkOrigin } from "@/features/account/origin";
import { parseUuid } from "@/features/account/validate";
import { accountListingPath, accountPath, premiumDonePath, premiumUpsellPath, signInPath } from "@/lib/routes";
import { createBillingPortal, createPremiumCheckout, isBillingInterval } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function stripeCustomerFor(agencyId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdminClient().rpc("agency_stripe_customer", { target_agency: agencyId });
  if (error) throw new Error(`agency_stripe_customer failed: ${error.code} ${error.message}`);
  return data || null;
}

/** "Go Premium": sends the person to Stripe Checkout for their listing. */
export async function startPremiumCheckout(formData: FormData): Promise<void> {
  const agencyId = parseUuid(formData.get("agency_id"));
  const interval = formData.get("interval");
  if (!agencyId) redirect(accountPath);
  const account = await getAccount();
  if (!account) redirect(signInPath);
  // Only people who manage the listing can pay for it.
  const listing = await getListing(agencyId);
  if (!listing) redirect(accountPath);
  if (listing.plan === "premium") redirect(accountListingPath(agencyId));
  if (!isBillingInterval(interval)) redirect(premiumUpsellPath(agencyId));

  let url: string | null = null;
  try {
    const origin = await linkOrigin();
    const session = await createPremiumCheckout({
      agencyId,
      agencyName: listing.name,
      interval,
      email: account.email,
      customerId: await stripeCustomerFor(agencyId),
      successUrl: `${origin}${premiumDonePath(agencyId)}`,
      cancelUrl: `${origin}${premiumUpsellPath(agencyId)}`,
    });
    url = session.url;
  } catch (error) {
    console.error("Premium checkout failed:", error);
  }
  if (!url) redirect(`${premiumUpsellPath(agencyId)}?notice=checkout-failed`);
  redirect(url);
}

/** "Manage billing": opens Stripe's billing portal for a Premium listing. */
export async function openBillingPortal(formData: FormData): Promise<void> {
  const agencyId = parseUuid(formData.get("agency_id"));
  if (!agencyId) redirect(accountPath);
  const account = await getAccount();
  if (!account) redirect(signInPath);
  const listing = await getListing(agencyId);
  if (!listing) redirect(accountPath);

  let url: string | null = null;
  try {
    const customer = await stripeCustomerFor(agencyId);
    if (customer) url = await createBillingPortal(customer, `${await linkOrigin()}${accountListingPath(agencyId)}`);
  } catch (error) {
    console.error("Billing portal failed:", error);
  }
  if (!url) redirect(`${accountListingPath(agencyId)}?notice=billing-failed`);
  redirect(url);
}
