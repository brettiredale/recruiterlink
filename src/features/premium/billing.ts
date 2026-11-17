import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * The listing's Stripe customer, or null when it has never paid (free or
 * given Premium). Call only after the caller is known to manage the listing.
 */
export async function stripeCustomerFor(agencyId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdminClient().rpc("agency_stripe_customer", { target_agency: agencyId });
  if (error) throw new Error(`agency_stripe_customer failed: ${error.code} ${error.message}`);
  return data || null;
}
