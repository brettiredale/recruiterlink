import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unwrapMaybe, unwrapRows } from "./shared";
import type { CityWithStats } from "./types";

const COLUMNS =
  "city_id, name, slug, photo_path, country_id, country_name, country_slug, country_iso2, agency_count, is_indexable, region_code, region_name";

type Row = {
  city_id: number | null;
  name: string | null;
  slug: string | null;
  photo_path: string | null;
  country_id: number | null;
  country_name: string | null;
  country_slug: string | null;
  country_iso2: string | null;
  agency_count: number | null;
  is_indexable: boolean | null;
  region_code: string | null;
  region_name: string | null;
};

function toCity(row: Row): CityWithStats {
  return {
    id: row.city_id!,
    name: row.name!,
    slug: row.slug!,
    photoPath: row.photo_path,
    region:
      row.region_code && row.region_name ? { code: row.region_code, name: row.region_name } : null,
    country: {
      id: row.country_id!,
      name: row.country_name!,
      slug: row.country_slug!,
      iso2: row.country_iso2,
    },
    agencyCount: row.agency_count ?? 0,
    isIndexable: row.is_indexable ?? false,
  };
}

/**
 * Cities of a country that have at least one published agency, largest
 * first. Pass `indexableOnly` to get just the cities with three or more
 * agencies (the ones submitted to search engines).
 */
export async function listCitiesForCountry(
  countrySlug: string,
  options: { indexableOnly?: boolean; limit?: number } = {},
): Promise<CityWithStats[]> {
  let query = getSupabaseServerClient()
    .from("city_stats")
    .select(COLUMNS)
    .eq("country_slug", countrySlug)
    .gt("agency_count", 0)
    .order("agency_count", { ascending: false })
    .order("name");
  if (options.indexableOnly) query = query.eq("is_indexable", true);
  // The API returns at most 1,000 rows per request; the largest country
  // (United States) has just over that, so read in pages.
  const wanted = options.limit ?? Number.POSITIVE_INFINITY;
  const rows: Row[] = [];
  for (let from = 0; rows.length < wanted; from += 1000) {
    const to = Math.min(from + 999, wanted - 1);
    const batch = unwrapRows(await query.range(from, to), "cities");
    rows.push(...batch);
    if (batch.length < to - from + 1) break;
  }
  return rows.map(toCity);
}

/**
 * Every city worldwide with three or more published agencies: the list for
 * the sitemap. Counted live, never stored.
 */
export async function listIndexableCities(): Promise<CityWithStats[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const batch = unwrapRows(
      await getSupabaseServerClient()
        .from("city_stats")
        .select(COLUMNS)
        .eq("is_indexable", true)
        .order("country_slug")
        .order("slug")
        .range(from, from + 999),
      "indexable cities",
    );
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows.map(toCity);
}

/** One city by country slug and city slug, with its live stats, or null. */
export async function getCityBySlugs(
  countrySlug: string,
  citySlug: string,
): Promise<CityWithStats | null> {
  const row = unwrapMaybe(
    await getSupabaseServerClient()
      .from("city_stats")
      .select(COLUMNS)
      .eq("country_slug", countrySlug)
      .eq("slug", citySlug)
      .maybeSingle(),
    "city",
  );
  return row ? toCity(row) : null;
}

/** The cities with most published agencies worldwide, largest first. */
export async function listTopCities(limit = 12): Promise<CityWithStats[]> {
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .from("city_stats")
      .select(COLUMNS)
      .gt("agency_count", 0)
      .order("agency_count", { ascending: false })
      .order("name")
      .limit(Math.min(Math.max(Math.trunc(limit) || 12, 1), 200)),
    "top cities",
  );
  return rows.map(toCity);
}

/**
 * Cities with this slug that have at least one agency, largest first.
 * Several countries can have a city of the same name; pass `countrySlug`
 * to look in one country only.
 */
export async function findCitiesBySlug(
  citySlug: string,
  countrySlug?: string,
): Promise<CityWithStats[]> {
  const client = getSupabaseServerClient();
  let query = client
    .from("city_stats")
    .select(COLUMNS)
    .eq("slug", citySlug)
    .gt("agency_count", 0);
  if (countrySlug) query = query.eq("country_slug", countrySlug);
  // Old addresses and other spellings ("miami" for Miami, FL) count too.
  const [rows, aliases] = await Promise.all([
    query.order("agency_count", { ascending: false }).order("country_slug").limit(20),
    client.from("city_aliases").select("city_id").eq("alias_slug", citySlug).limit(20),
  ]);
  const direct = unwrapRows(rows, "cities by name").map(toCity);
  const aliasIds = unwrapRows(aliases, "city aliases")
    .map((row) => row.city_id)
    .filter((id) => !direct.some((city) => city.id === id));
  const viaAlias = (await getCitiesByIds(aliasIds)).filter(
    (city) => city.agencyCount > 0 && (!countrySlug || city.country.slug === countrySlug),
  );
  return [...direct, ...viaAlias].sort(
    (a, b) => b.agencyCount - a.agencyCount || a.country.slug.localeCompare(b.country.slug),
  );
}

/** Cities by id, with their live stats (in no particular order). */
export async function getCitiesByIds(cityIds: number[]): Promise<CityWithStats[]> {
  if (cityIds.length === 0) return [];
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .from("city_stats")
      .select(COLUMNS)
      .in("city_id", cityIds.slice(0, 500)),
    "cities",
  );
  return rows.map(toCity);
}
