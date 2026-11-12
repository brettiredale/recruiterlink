/**
 * Every public address of the site is built here, so links, canonical
 * addresses, sitemaps and redirects can never disagree.
 */

/** Agencies shown per page on city and city + specialism pages. */
export const AGENCIES_PER_PAGE = 24;

/**
 * First path segments that belong to fixed pages. Country pages live at the
 * top level (`/spain`), so a country must never be given one of these as its
 * slug. Fixed routes always win over `/[country]` in the router; the country
 * page also refuses these words itself, and a test checks that every folder
 * in `src/app` is listed here.
 */
export const RESERVED_TOP_LEVEL_SLUGS = [
  "about",
  "agencies",
  "api",
  "contact",
  "countries",
  "for-agencies",
  "legal",
  "llms.txt",
  "opengraph-image",
  "recruiters-in",
  "robots.txt",
  "search",
  "sitemap.xml",
  "sitemaps",
  "specialisms",
  // Not routes today, but kept free for later or used by the framework.
  "_next",
  "admin",
  "cities",
  "favicon.ico",
  "login",
  "page",
  "sitemap",
  "styleguide",
] as const;

const reserved = new Set<string>(RESERVED_TOP_LEVEL_SLUGS);

/** True when a first path segment can never be a country. */
export function isReservedTopLevelSlug(slug: string): boolean {
  return reserved.has(slug.toLowerCase());
}

/** The only shape a slug can have: lowercase letters, digits and hyphens. */
export function isValidSlug(slug: string): boolean {
  return slug.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export const homePath = "/";
export const countriesPath = "/countries";
export const specialismsPath = "/specialisms";
export const searchPath = "/search";
export const forAgenciesPath = "/for-agencies";
export const registerInterestPath = "/for-agencies#register";

export function countryPath(countrySlug: string): string {
  return `/${countrySlug}`;
}

export function cityPath(countrySlug: string, citySlug: string): string {
  return `/${countrySlug}/${citySlug}`;
}

export function citySpecialismPath(
  countrySlug: string,
  citySlug: string,
  specialismSlug: string,
): string {
  return `/${countrySlug}/${citySlug}/${specialismSlug}`;
}

export function specialismPath(specialismSlug: string): string {
  return `/specialisms/${specialismSlug}`;
}

export function agencyPath(agencySlug: string): string {
  return `/agencies/${agencySlug}`;
}

export function searchResultsPath(query: string): string {
  return `/search?q=${encodeURIComponent(query).replace(/%20/g, "+")}`;
}

/**
 * Address of a page of a long list. Page 1 is the list's own address;
 * later pages add `/page/N`, so every page is a fixed address that can be
 * built once and cached like any other page.
 */
export function pagedPath(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

/**
 * Reads the `N` of a `/page/N` address. Returns null unless it is a whole
 * number from 2 upwards written without padding ("2", not "02" or "2.0"):
 * page 1 lives at the list's own address, and each page has one address.
 */
export function parsePageSegment(segment: string): number | null {
  if (!/^[1-9][0-9]{0,5}$/.test(segment)) return null;
  const page = Number(segment);
  return page >= 2 ? page : null;
}
