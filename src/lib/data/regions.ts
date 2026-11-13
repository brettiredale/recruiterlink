import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unwrapRows } from "./shared";

/** A state, province or territory, for the countries whose cities have one. */
export type RegionOption = {
  id: number;
  countryId: number;
  /** Postal code: "FL", "ON", "NSW". */
  code: string;
  name: string;
};

/** An existing city a typed place can mean, the most likely first. */
export type CityMatch = {
  id: number;
  name: string;
  slug: string;
  regionCode: string | null;
  regionName: string | null;
  agencyCount: number;
};

/** Every state, province and territory (US, Canada, Australia), by name. */
export async function listRegions(): Promise<RegionOption[]> {
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .from("regions")
      .select("id, country_id, code, name")
      .order("name"),
    "regions",
  );
  return rows.map((row) => ({
    id: row.id,
    countryId: row.country_id,
    code: row.code,
    name: row.name,
  }));
}

/**
 * The existing cities a typed place means, the most likely first: "Miami,
 * Florida", "Miami FL" and "miami" all find Miami, FL. A region (code or
 * name) narrows the result. An empty list means there is no such city yet.
 * The same matcher decides which city a new listing joins.
 */
export async function matchCity(
  countryId: number,
  place: string,
  region?: string | null,
): Promise<CityMatch[]> {
  const rows = unwrapRows(
    await getSupabaseServerClient().rpc("match_city", {
      target_country: countryId,
      place,
      ...(region ? { region } : {}),
    }),
    "city match",
  );
  return rows.map((row) => ({
    id: row.city_id,
    name: row.name,
    slug: row.slug,
    regionCode: row.region_code,
    regionName: row.region_name,
    agencyCount: row.agency_count,
  }));
}

/**
 * Cities of a country whose name starts with the typed text, largest first:
 * the suggestions under the listing form's city field. Only the part before
 * the first comma counts ("Mia" and "Miami, Fl" both suggest Miami).
 */
export async function suggestCities(countryId: number, typed: string): Promise<CityMatch[]> {
  const prefix = typed.split(",")[0]!.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  if (prefix.length < 2) return [];
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .from("city_stats")
      .select("city_id, name, slug, region_code, region_name, agency_count")
      .eq("country_id", countryId)
      .ilike("name", `${prefix}%`)
      .order("agency_count", { ascending: false })
      .order("name")
      .limit(8),
    "city suggestions",
  );
  return rows.map((row) => ({
    id: row.city_id!,
    name: row.name!,
    slug: row.slug!,
    regionCode: row.region_code,
    regionName: row.region_name,
    agencyCount: row.agency_count ?? 0,
  }));
}
