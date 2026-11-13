import "server-only";
import { getSupabaseSessionClient } from "@/lib/supabase/session";

/** One listing the signed-in person manages. */
export type AccountListing = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: "free" | "premium";
  logo_path: string | null;
  role: "owner" | "member";
  city: string | null;
  country: string;
};

/** A listing on the person's email domain that they do not manage (yet). */
export type AccountMatch = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string;
  /** Somebody else already manages it. */
  managed: boolean;
  /** This person has already asked to join it. */
  requested: boolean;
};

export type AccountSubmission = {
  id: string;
  name: string;
  status: "pending" | "rejected";
  created_at: string;
  review_note: string | null;
};

export type AccessRequest = {
  id: string;
  agency_id: string;
  agency_name: string;
  email: string;
  created_at: string;
};

export type Account = {
  email: string;
  domain: string;
  is_personal_email: boolean;
  is_admin: boolean;
  listings: AccountListing[];
  matches: AccountMatch[];
  submissions: AccountSubmission[];
  requests_to_review: AccessRequest[];
};

export type ListingDetail = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: "free" | "premium";
  website: string | null;
  domain: string | null;
  logo_path: string | null;
  introduction: string | null;
  description: string | null;
  country_id: number;
  country: string;
  country_slug: string;
  city_id: number | null;
  city: string | null;
  city_slug: string | null;
  specialism_ids: number[];
  role: "owner" | "member";
};

export type PendingSubmission = {
  id: string;
  created_at: string;
  name: string;
  website: string;
  email: string;
  country: string;
  city_name: string;
  introduction: string | null;
  description: string;
  specialisms: string[] | null;
  /** The state, province or territory the agency chose, if any. */
  region: string | null;
  region_code: string | null;
  /** False when approving will add this city to the directory. */
  city_exists: boolean;
  /** The logo found for the listing, in the agency-logos bucket. */
  logo_path: string | null;
  logo_source: "website" | "logo.dev" | null;
  /** Null while the logo search is still running. */
  logo_checked_at: string | null;
  /** The existing city the listing joins on approval, from match_city. */
  matched_city: {
    id: number;
    name: string;
    slug: string;
    region_code: string | null;
    agency_count: number;
  } | null;
};

/**
 * The signed-in person's account, or null when nobody is signed in. The
 * database works out who is asking from the session; nothing here trusts
 * the browser.
 */
export async function getAccount(): Promise<Account | null> {
  const supabase = await getSupabaseSessionClient();
  const { data, error } = await supabase.rpc("my_account");
  if (error) {
    // 28000: the database saw no signed-in, confirmed person. 42501: nobody
    // is signed in at all (the admin sign-in page asks before anyone has).
    if (error.code !== "28000" && error.code !== "42501") console.error("my_account failed:", error.code, error.message);
    return null;
  }
  return data as unknown as Account;
}

/** One listing for its editor, or null if this person does not manage it. */
export async function getListing(id: string): Promise<ListingDetail | null> {
  const supabase = await getSupabaseSessionClient();
  const { data, error } = await supabase.rpc("my_listing", { target_agency: id });
  if (error) {
    if (error.code !== "28000" && error.code !== "42501") {
      console.error("my_listing failed:", error.code, error.message);
    }
    return null;
  }
  return data as unknown as ListingDetail | null;
}

/** New listings waiting for review. Null unless the person runs the site. */
export async function getPendingSubmissions(): Promise<PendingSubmission[] | null> {
  const supabase = await getSupabaseSessionClient();
  const { data, error } = await supabase.rpc("admin_list_submissions");
  if (error) {
    if (error.code !== "42501") console.error("admin_list_submissions failed:", error.code, error.message);
    return null;
  }
  return data as unknown as PendingSubmission[];
}
