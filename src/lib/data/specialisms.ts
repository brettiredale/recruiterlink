import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unwrapMaybe, unwrapRows } from "./shared";
import type { Specialism, SpecialismWithCount } from "./types";

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
