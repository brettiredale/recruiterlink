import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  AGENCY_DETAIL_COLUMNS,
  AGENCY_SUMMARY_COLUMNS,
  normalisePaging,
  toAgencyDetail,
  toAgencySummary,
  unwrapMaybe,
  unwrapRows,
  type AgencyDetailRow,
  type AgencySummaryRow,
} from "./shared";
import type { AgencyDetail, AgencySummary, Page } from "./types";

type ListOptions = {
  /** Page number, starting at 1. */
  page?: number;
  /** Rows per page (default 24, at most 100). */
  pageSize?: number;
  /** Only agencies with this specialism (its id from `specialisms`). */
  specialismId?: number;
};

async function listAgencies(
  scope: { column: "city_id" | "country_id"; id: number },
  options: ListOptions,
  what: string,
): Promise<Page<AgencySummary>> {
  const { page, pageSize, from, to } = normalisePaging(
    options.page,
    options.pageSize,
  );
  const supabase = getSupabaseServerClient();

  // The extra inner join restricts the list to one specialism while the
  // normal embed still returns every specialism of each agency.
  const columns =
    options.specialismId === undefined
      ? AGENCY_SUMMARY_COLUMNS
      : `${AGENCY_SUMMARY_COLUMNS}, wanted:agency_specialisms!inner(specialism_id)`;

  let query = supabase
    .from("agencies")
    .select(columns, { count: "exact" })
    .eq(scope.column, scope.id)
    .eq("status", "published");
  if (options.specialismId !== undefined) {
    query = query.eq("wanted.specialism_id", options.specialismId);
  }

  const result = await query
    .order("is_premium", { ascending: false })
    .order("sort_name")
    .order("id")
    .range(from, to)
    .overrideTypes<AgencySummaryRow[], { merge: false }>();
  const rows = unwrapRows(result, what);
  const total = result.count ?? 0;

  return {
    items: rows.map(toAgencySummary),
    total,
    page,
    pageSize,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
  };
}

/**
 * Published agencies in a city, premium first then by name, one page at a
 * time. Optionally only those with one specialism.
 */
export function listAgenciesForCity(
  cityId: number,
  options: ListOptions = {},
): Promise<Page<AgencySummary>> {
  return listAgencies(
    { column: "city_id", id: cityId },
    options,
    "agencies for the city",
  );
}

/** As `listAgenciesForCity`, for a whole country. */
export function listAgenciesForCountry(
  countryId: number,
  options: ListOptions = {},
): Promise<Page<AgencySummary>> {
  return listAgencies(
    { column: "country_id", id: countryId },
    options,
    "agencies for the country",
  );
}

/** One published agency by its slug, with city, country and specialisms. */
export async function getAgencyBySlug(
  slug: string,
): Promise<AgencyDetail | null> {
  const row = unwrapMaybe(
    await getSupabaseServerClient()
      .from("agencies")
      .select(AGENCY_DETAIL_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
      .overrideTypes<AgencyDetailRow | null, { merge: false }>(),
    "agency",
  );
  return row ? toAgencyDetail(row) : null;
}

/**
 * Where an old-site address should now go. Takes the slug from
 * `/agencies/<old slug>` and returns the new slug of the agency to redirect
 * to, or null when the old slug is unknown.
 */
export async function resolveLegacySlug(
  oldSlug: string,
): Promise<string | null> {
  const row = unwrapMaybe(
    await getSupabaseServerClient()
      .from("slug_redirects")
      .select("agency:agencies!inner(slug)")
      .eq("old_slug", oldSlug)
      .maybeSingle()
      .overrideTypes<{ agency: { slug: string } } | null, { merge: false }>(),
    "redirect",
  );
  return row?.agency.slug ?? null;
}

/**
 * Agencies to feature for a country: premium first, then claimed, then
 * those with both a logo and a description. Order within a group is fixed
 * but arbitrary, so the same agencies show for every visitor.
 */
export async function listFeaturedAgencies(
  countryId: number,
  limit = 12,
): Promise<AgencySummary[]> {
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .from("agencies")
      .select(AGENCY_SUMMARY_COLUMNS)
      .eq("country_id", countryId)
      .eq("status", "published")
      .order("quality_score", { ascending: false })
      .order("id")
      .limit(Math.min(Math.max(Math.trunc(limit) || 12, 1), 100))
      .overrideTypes<AgencySummaryRow[], { merge: false }>(),
    "featured agencies",
  );
  return rows.map(toAgencySummary);
}

type SearchOptions = {
  /** Restrict to a country, by slug. */
  countrySlug?: string;
  /** Restrict to a city, by slug (best combined with `countrySlug`). */
  citySlug?: string;
  /** Rows to return (default 20, at most 100). */
  limit?: number;
  /** Rows to skip, for paging. */
  offset?: number;
};

/**
 * Free-text search over published agencies (name, city, country,
 * specialisms, introduction and description). Premium first, then best
 * match. Uses Postgres full-text search; quotes and a leading minus work as
 * in a web search ("executive search" -london).
 */
export async function searchAgencies(
  query: string,
  options: SearchOptions = {},
): Promise<AgencySummary[]> {
  const text = query.trim();
  if (!text) return [];
  const rows = unwrapRows(
    await getSupabaseServerClient()
      .rpc("search_agencies", {
        search_query: text,
        country_slug: options.countrySlug,
        city_slug: options.citySlug,
        result_limit: options.limit ?? 20,
        result_offset: options.offset ?? 0,
      })
      .select(AGENCY_SUMMARY_COLUMNS)
      .overrideTypes<AgencySummaryRow[], { merge: false }>(),
    "search results",
  );
  return rows.map(toAgencySummary);
}
