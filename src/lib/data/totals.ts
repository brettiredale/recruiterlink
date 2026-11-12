import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unwrapOne } from "./shared";
import type { DirectoryTotals } from "./types";

/** Site-wide totals: published agencies, countries, cities, specialisms. */
export async function getDirectoryTotals(): Promise<DirectoryTotals> {
  const row = unwrapOne(
    await getSupabaseServerClient()
      .from("directory_totals")
      .select("agency_count, country_count, city_count, specialism_count")
      .single(),
    "directory totals",
  );
  return {
    agencyCount: row.agency_count ?? 0,
    countryCount: row.country_count ?? 0,
    cityCount: row.city_count ?? 0,
    specialismCount: row.specialism_count ?? 0,
  };
}
