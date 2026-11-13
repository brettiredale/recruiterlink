/**
 * Names of the cache tags that pages and data are stored under. Pure
 * strings, shared by the cached readers (`src/lib/directory.ts`) and the
 * revalidation helper (`src/lib/revalidate.ts`).
 */

/** On everything read from the directory database. */
export const DIRECTORY_TAG = "directory";

/** On lists and counts that span countries (home, /countries, sitemaps). */
export const COUNTRIES_TAG = "countries";

/** On the list of specialisms and the worldwide specialism pages. */
export const SPECIALISMS_TAG = "specialisms";

/** On a country's page and everything listed on it. */
export function countryTag(countrySlug: string): string {
  return `country:${countrySlug}`;
}

/** On a city's pages (all its list pages and specialism pages). */
export function cityTag(countrySlug: string, citySlug: string): string {
  return `city:${countrySlug}/${citySlug}`;
}

/** On one agency's profile page. */
export function agencyTag(agencySlug: string): string {
  return `agency:${agencySlug}`;
}

/** On every blog page and list (the blog, the home page's latest articles, sitemaps). */
export const BLOG_TAG = "blog";
