import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unwrapMaybe, unwrapRows } from "./shared";
import type { CitySpecialismCount, Specialism, SpecialismWithCount } from "./types";

const COLUMNS = "specialism_id, name, slug, sort_order, agency_count";

type Row = {
  specialism_id: number | null;
  name: string | null;
  slug: string | null;
  sort_order: number | null;
  agency_count: number | null;
};

function toSpecialism(row: Row): SpecialismWithCount {
  return {
    id: row.specialism_id!,
    name: row.name!,
    slug: row.slug!,
    sortOrder: row.sort_order ?? 0,
    agencyCount: row.agency_count ?? 0,
  };
}

/** The full fixed list of specialisms with worldwide agency counts. */
export async function listSpecialisms(): Promise<SpecialismWithCount[]> {
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .from("specialism_stats")
      .select(COLUMNS)
      .order("sort_order"),
    "specialisms",
  );
  return rows.map(toSpecialism);
}

/** One specialism by slug (e.g. "legal"), or null. */
export async function getSpecialismBySlug(
  slug: string,
): Promise<Specialism | null> {
  const row = unwrapMaybe(
    await getSupabaseServerClient()
      .from("specialisms")
      .select("id, name, slug, sort_order")
      .eq("slug", slug)
      .maybeSingle(),
    "specialism",
  );
  return row
    ? { id: row.id, name: row.name, slug: row.slug, sortOrder: row.sort_order }
    : null;
}

/**
 * Specialisms that have at least one published agency in the city, most
 * agencies first. For the city page's filter and city + specialism links.
 */
export async function listSpecialismsForCity(
  cityId: number,
): Promise<SpecialismWithCount[]> {
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .from("city_specialism_stats")
      .select(COLUMNS)
      .eq("city_id", cityId)
      .order("agency_count", { ascending: false })
      .order("sort_order"),
    "specialisms for the city",
  );
  return rows.map(toSpecialism);
}

/** Specialisms with at least one published agency in the country. */
export async function listSpecialismsForCountry(
  countryId: number,
): Promise<SpecialismWithCount[]> {
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .from("country_specialism_stats")
      .select(COLUMNS)
      .eq("country_id", countryId)
      .order("agency_count", { ascending: false })
      .order("sort_order"),
    "specialisms for the country",
  );
  return rows.map(toSpecialism);
}

/**
 * Number of published agencies with this specialism in each country that
 * has any, most first, as `[country id, count]` pairs.
 */
export async function listCountryCountsForSpecialism(
  specialismId: number,
): Promise<{ countryId: number; agencyCount: number }[]> {
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .from("country_specialism_stats")
      .select("country_id, agency_count")
      .eq("specialism_id", specialismId)
      .order("agency_count", { ascending: false }),
    "countries for the specialism",
  );
  return rows.map((row) => ({
    countryId: row.country_id!,
    agencyCount: row.agency_count ?? 0,
  }));
}

const PAIR_COLUMNS = "city_id, specialism_id, name, slug, sort_order, agency_count";

type PairRow = Row & { city_id: number | null };

function toPair(row: PairRow): CitySpecialismCount {
  return {
    cityId: row.city_id!,
    specialism: {
      id: row.specialism_id!,
      name: row.name!,
      slug: row.slug!,
      sortOrder: row.sort_order ?? 0,
    },
    agencyCount: row.agency_count ?? 0,
  };
}

/** The cities with most published agencies for one specialism, most first. */
export async function listTopCityCountsForSpecialism(
  specialismId: number,
  limit = 24,
): Promise<CitySpecialismCount[]> {
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .from("city_specialism_stats")
      .select(PAIR_COLUMNS)
      .eq("specialism_id", specialismId)
      .order("agency_count", { ascending: false })
      .order("city_id")
      .limit(Math.min(Math.max(Math.trunc(limit) || 24, 1), 200)),
    "cities for the specialism",
  );
  return rows.map(toPair);
}

/**
 * The largest city + specialism pairs among the given cities, most
 * agencies first. `excludeSlugs` leaves specialisms out (the generic ones).
 */
export async function listTopCitySpecialismPairs(
  cityIds: number[],
  options: { limit?: number; excludeSlugs?: readonly string[]; minAgencies?: number } = {},
): Promise<CitySpecialismCount[]> {
  if (cityIds.length === 0) return [];
  let query = getSupabaseServerClient()
    .from("city_specialism_stats")
    .select(PAIR_COLUMNS)
    .in("city_id", cityIds.slice(0, 200))
    .gte("agency_count", options.minAgencies ?? 1);
  if (options.excludeSlugs?.length) {
    query = query.not("slug", "in", `(${options.excludeSlugs.join(",")})`);
  }
  const rows = unwrapRows(
    await query
      .order("agency_count", { ascending: false })
      .order("city_id")
      .order("sort_order")
      .limit(Math.min(Math.max(Math.trunc(options.limit ?? 12) || 12, 1), 200)),
    "city and specialism pairs",
  );
  return rows.map(toPair);
}

/**
 * Every city + specialism pair worldwide with at least `minAgencies`
 * published agencies, for the sitemap. Read 1,000 at a time.
 */
export async function listCitySpecialismPairs(
  minAgencies: number,
): Promise<CitySpecialismCount[]> {
  const rows: PairRow[] = [];
  for (let from = 0; ; from += 1000) {
    const batch = unwrapRows(
      await getSupabaseServerClient()
        .from("city_specialism_stats")
        .select(PAIR_COLUMNS)
        .gte("agency_count", minAgencies)
        .order("city_id")
        .order("specialism_id")
        .range(from, from + 999),
      "city and specialism pairs",
    );
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows.map(toPair);
}
