import "server-only";
import { announcePages } from "@/lib/indexnow";
import { revalidateDirectory } from "@/lib/revalidate";
import { agencyPath } from "@/lib/routes";
import { getSubscription, subscriptionInterval, subscriptionIsLive } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseUuid } from "@/features/account/validate";

type Changed = { slug: string; country_slug: string; city_slug: string | null; name: string };

/**
 * Brings one listing's plan in line with its Stripe subscription. The
 * subscription is always read fresh from Stripe, so events that arrive late
 * or out of order cannot switch Premium back on (or off) by mistake.
 *
 * `event` makes a webhook delivery count once: a repeat is ignored.
 * Returns the listing's live state, or null when nothing was recorded.
 */
export async function syncSubscription(
  subscriptionId: string,
  event?: { id: string; type: string },
): Promise<{ premium: boolean; listing: Changed } | null> {
  const subscription = await getSubscription(subscriptionId);
  const agencyId = parseUuid(subscription.metadata?.agency_id ?? null);
  if (!agencyId) return null;

  const premium = subscriptionIsLive(subscription.status);
  const { data, error } = await getSupabaseAdminClient().rpc("set_agency_premium_from_stripe", {
    target_agency: agencyId,
    premium,
    customer_id: subscription.customer,
    subscription_id: subscription.id,
    // Null keeps the interval already stored (the generated type has no null).
    billing_interval: subscriptionInterval(subscription) ?? (null as unknown as string),
    event_id: event?.id,
    event_type: event?.type,
  });
  if (error) throw new Error(`set_agency_premium_from_stripe failed: ${error.code} ${error.message}`);
  const listing = data as unknown as Changed | null;
  if (!listing) return null;

  // The card moves to the top (or back) on every list it is in.
  revalidateDirectory({
    agencies: [listing.slug],
    cities: listing.city_slug ? [{ countrySlug: listing.country_slug, citySlug: listing.city_slug }] : [],
    countries: [listing.country_slug],
  });
  announcePages([agencyPath(listing.slug)]);
  return { premium, listing };
}
