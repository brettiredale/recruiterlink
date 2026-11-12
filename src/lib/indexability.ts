/**
 * Which pages search engines are asked to index. Pure functions, so the
 * rules are unit tested and used identically by page metadata and sitemaps.
 *
 * These rules sit under the site-wide switch (`SITE_INDEXABLE`): until
 * launch every page is blocked whatever these functions say.
 */
import { isGenericSpecialism } from "./specialisms.ts";

/**
 * A city (or a specialism within a city) needs this many published agencies
 * before its page is submitted to search engines. Owner's decision,
 * 12 Nov 2026. Counted live, never stored.
 */
export const MIN_AGENCIES_TO_INDEX = 3;

/** City pages: indexable from three published agencies. */
export function isCityIndexable(agencyCount: number): boolean {
  return agencyCount >= MIN_AGENCIES_TO_INDEX;
}

/**
 * City + specialism pages: indexable only when the city itself is
 * indexable, the pair has at least three agencies, and the specialism is
 * not one of the generic ones.
 */
export function isCitySpecialismIndexable(input: {
  cityAgencyCount: number;
  pairAgencyCount: number;
  specialismSlug: string;
}): boolean {
  return (
    isCityIndexable(input.cityAgencyCount) &&
    input.pairAgencyCount >= MIN_AGENCIES_TO_INDEX &&
    !isGenericSpecialism(input.specialismSlug)
  );
}

/**
 * Pages 2, 3, ... of a list: never indexed, links followed. Each has its
 * own canonical address (pointing them all at page 1 would tell search
 * engines the pages are duplicates, which they are not), so crawlers still
 * reach every agency through them, while only page 1 competes in results.
 */
export function isPagedListIndexable(page: number, baseIndexable: boolean): boolean {
  return page <= 1 && baseIndexable;
}

export type RobotsRule = { index: boolean; follow: boolean };

/**
 * The robots rule for a page. While the site-wide switch is off, nothing is
 * indexed or followed. Once it is on, a page that should stay out of search
 * results still lets crawlers follow its links ("noindex, follow").
 */
export function robotsRule(pageIndexable: boolean, siteIndexable: boolean): RobotsRule {
  if (!siteIndexable) return { index: false, follow: false };
  return { index: pageIndexable, follow: true };
}
