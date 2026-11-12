import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/env";
import type { AgencyDetail, AgencyPlan, AgencySummary } from "./types";

type QueryResult<T> = { data: T; error: PostgrestError | null };

function check<T>(result: QueryResult<T>, what: string): T {
  if (result.error) {
    throw new Error(`Could not load ${what}: ${result.error.message}`);
  }
  return result.data;
}

/** Rows of a list query; a failed query becomes a readable exception. */
export function unwrapRows<T>(
  result: QueryResult<T[] | null>,
  what: string,
): T[] {
  return check(result, what) ?? [];
}

/** The row of a `maybeSingle()` query, or null when there is none. */
export function unwrapMaybe<T>(result: QueryResult<T>, what: string): T {
  return check(result, what);
}

/** The row of a `single()` query. */
export function unwrapOne<T>(
  result: QueryResult<T>,
  what: string,
): NonNullable<T> {
  const row = check(result, what);
  if (row === null || row === undefined) {
    throw new Error(`Could not load ${what}: no data returned`);
  }
  return row;
}

/** Columns and related rows every agency card needs. */
export const AGENCY_SUMMARY_COLUMNS = `
  id, name, slug, introduction, logo_path, plan, is_claimed,
  city:cities(name, slug),
  country:countries!inner(name, slug),
  agency_specialisms(specialism:specialisms(name, slug, sort_order))
` as const;

export const AGENCY_DETAIL_COLUMNS = `
  ${AGENCY_SUMMARY_COLUMNS},
  description, website, domain, sort_name, city_id, created_at, updated_at
` as const;

type Place = { name: string; slug: string };

export type AgencySummaryRow = {
  id: string;
  name: string;
  slug: string;
  introduction: string | null;
  logo_path: string | null;
  plan: string;
  is_claimed: boolean;
  city: Place | null;
  country: Place;
  agency_specialisms: {
    specialism: { name: string; slug: string; sort_order: number };
  }[];
};

export type AgencyDetailRow = AgencySummaryRow & {
  description: string | null;
  website: string | null;
  domain: string | null;
  sort_name: string;
  city_id: number | null;
  created_at: string;
  updated_at: string;
};

export function toAgencySummary(row: AgencySummaryRow): AgencySummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    introduction: row.introduction,
    logoPath: row.logo_path,
    plan: (row.plan === "premium" ? "premium" : "free") satisfies AgencyPlan,
    isClaimed: row.is_claimed,
    city: row.city ? { name: row.city.name, slug: row.city.slug } : null,
    country: { name: row.country.name, slug: row.country.slug },
    specialisms: row.agency_specialisms
      .map((link) => link.specialism)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ name, slug }) => ({ name, slug })),
  };
}

export function toAgencyDetail(row: AgencyDetailRow): AgencyDetail {
  return {
    ...toAgencySummary(row),
    description: row.description,
    website: row.website,
    domain: row.domain,
    sortName: row.sort_name,
    cityId: row.city_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Keeps paging inputs sane: page from 1, page size between 1 and 100. */
export function normalisePaging(page?: number, pageSize?: number) {
  const size = Math.min(Math.max(Math.trunc(pageSize ?? 24) || 24, 1), 100);
  const current = Math.max(Math.trunc(page ?? 1) || 1, 1);
  const from = (current - 1) * size;
  return { page: current, pageSize: size, from, to: from + size - 1 };
}

/**
 * Public address of an agency's logo, or null when it has none (show an
 * initials placeholder instead).
 */
export function agencyLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  const { url } = getSupabaseConfig();
  return `${url}/storage/v1/object/public/agency-logos/${encodeURIComponent(logoPath)}`;
}
