import { revalidateTag } from "next/cache";
import {
  COUNTRIES_TAG,
  DIRECTORY_TAG,
  SPECIALISMS_TAG,
  agencyTag,
  cityTag,
  countryTag,
} from "./cache-tags";

export type DirectoryChange = {
  /** Refresh every page. Use after a bulk change. */
  everything?: boolean;
  /** Slugs of agencies whose own details changed (name, text, logo, plan). */
  agencies?: string[];
  /** Cities whose list of agencies changed (added, removed, hidden, moved). */
  cities?: { countrySlug: string; citySlug: string }[];
  /** Countries whose cities or totals changed. */
  countries?: string[];
};

/**
 * THE way to refresh pages after directory data changes. Call it from a
 * Route Handler or Server Function (for example the future daily update
 * connector) once the database has been written.
 *
 * Pages are built once and cached; each is tagged with what it shows (see
 * `src/lib/cache-tags.ts`). This marks the affected pages as out of date.
 * The next visitor to each still gets the stored page straight away while a
 * fresh one is built behind the scenes, so nothing is ever slow or blank.
 * Without a call, pages refresh by themselves within a day.
 *
 * What to pass:
 * - an agency's details changed: `agencies: [slug]`, plus its city and
 *   country if its card (name, logo, plan, specialisms) changed;
 * - an agency was added, removed, hidden or moved: its `cities` and
 *   `countries` (counts and lists change), which also refreshes the home
 *   page, `/countries`, the specialism pages and the sitemaps;
 * - many changes at once: `everything: true`.
 *
 * Returns the tags it marked, for logging.
 */
export function revalidateDirectory(change: DirectoryChange): string[] {
  const tags = new Set<string>();
  if (change.everything) tags.add(DIRECTORY_TAG);
  for (const slug of change.agencies ?? []) tags.add(agencyTag(slug));
  for (const city of change.cities ?? []) {
    tags.add(cityTag(city.countrySlug, city.citySlug));
    tags.add(countryTag(city.countrySlug));
  }
  for (const slug of change.countries ?? []) tags.add(countryTag(slug));
  if (change.cities?.length || change.countries?.length) {
    // Totals, country lists, worldwide specialism counts and sitemaps.
    tags.add(COUNTRIES_TAG);
    tags.add(SPECIALISMS_TAG);
  }
  for (const tag of tags) revalidateTag(tag, "max");
  return [...tags];
}
