import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unwrapMaybe, unwrapRows } from "./shared";
import type { CountryWithCounts } from "./types";

const COLUMNS = "country_id, name, slug, iso2, agency_count, city_count";

type Row = {
  country_id: number | null;
  name: string | null;
  slug: string | null;
  iso2: string | null;
  agency_count: number | null;
  city_count: number | null;
};

function toCountry(row: Row): CountryWithCounts {
  return {
    id: row.country_id!,
    name: row.name!,
    slug: row.slug!,
    iso2: row.iso2,
    agencyCount: row.agency_count ?? 0,
    cityCount: row.city_count ?? 0,
  };
}

/** Every country, largest first, with its agency and city counts. */
export async function listCountries(): Promise<CountryWithCounts[]> {
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .from("country_stats")
      .select(COLUMNS)
      .order("agency_count", { ascending: false })
      .order("name"),
    "countries",
  );
  return rows.map(toCountry);
}

/** One country by its slug (e.g. "united-kingdom"), or null. */
export async function getCountryBySlug(
  slug: string,
): Promise<CountryWithCounts | null> {
  const row = unwrapMaybe(
    await getSupabaseServerClient()
      .from("country_stats")
      .select(COLUMNS)
      .eq("slug", slug)
      .maybeSingle(),
    "country",
  );
  return row ? toCountry(row) : null;
}
