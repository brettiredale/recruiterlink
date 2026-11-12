/**
 * The sitemaps: an index at /sitemap.xml and the files it lists under
 * /sitemaps/. Built from the database, cached for a day, and refreshed by
 * `revalidateDirectory`. Only pages search engines are asked to index are
 * listed (see `src/lib/indexability.ts`).
 */
import {
  getAgencySitemapEntries,
  getCountries,
  getIndexableCities,
  getIndexableCitySpecialismPairs,
  getSpecialisms,
  getTotals,
} from "./directory";
import {
  agencyPath,
  cityPath,
  citySpecialismPath,
  countriesPath,
  countryPath,
  forAgenciesPath,
  specialismPath,
  specialismsPath,
} from "./routes";
import { absoluteUrl } from "./site";
import { isGenericSpecialism } from "./specialisms";

/** Addresses per file. The limit search engines accept is 50,000. */
export const SITEMAP_CHUNK = 10_000;

export type SitemapUrl = { path: string; lastModified?: string };

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function urlsetXml(urls: SitemapUrl[]): string {
  const rows = urls.map(
    (url) =>
      `<url><loc>${escapeXml(absoluteUrl(url.path))}</loc>${
        url.lastModified ? `<lastmod>${escapeXml(url.lastModified)}</lastmod>` : ""
      }</url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

export function sitemapIndexXml(names: string[]): string {
  const rows = names.map(
    (name) => `<sitemap><loc>${escapeXml(absoluteUrl(`/sitemaps/${name}.xml`))}</loc></sitemap>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</sitemapindex>\n`;
}

function chunkNames(prefix: string, count: number): string[] {
  const chunks = Math.max(Math.ceil(count / SITEMAP_CHUNK), 1);
  return Array.from({ length: chunks }, (_, index) => `${prefix}-${index + 1}`);
}

/** Names of every sitemap file, in the order the index lists them. */
export async function sitemapNames(): Promise<string[]> {
  const [totals, pairs] = await Promise.all([getTotals(), getIndexableCitySpecialismPairs()]);
  return [
    "pages",
    "countries",
    "specialisms",
    "cities",
    ...chunkNames("city-specialisms", pairs.length),
    ...chunkNames("agencies", totals.agencyCount),
  ];
}

/** The addresses in one sitemap file, or null when there is no such file. */
export async function sitemapUrls(name: string): Promise<SitemapUrl[] | null> {
  if (name === "pages") {
    // /search and /legal carry a noindex, so they are not listed.
    return ["/", countriesPath, specialismsPath, forAgenciesPath, "/about", "/contact"].map(
      (path) => ({ path }),
    );
  }
  if (name === "countries") {
    const countries = await getCountries();
    return countries
      .filter((country) => country.agencyCount > 0)
      .map((country) => ({ path: countryPath(country.slug) }));
  }
  if (name === "specialisms") {
    const specialisms = await getSpecialisms();
    return specialisms
      .filter((item) => item.agencyCount > 0 && !isGenericSpecialism(item.slug))
      .map((item) => ({ path: specialismPath(item.slug) }));
  }
  if (name === "cities") {
    const cities = await getIndexableCities();
    return cities.map((city) => ({ path: cityPath(city.country.slug, city.slug) }));
  }

  const match = /^(city-specialisms|agencies)-([1-9][0-9]{0,3})$/.exec(name);
  if (!match) return null;
  const chunk = Number(match[2]);
  const from = (chunk - 1) * SITEMAP_CHUNK;

  if (match[1] === "city-specialisms") {
    const pairs = await getIndexableCitySpecialismPairs();
    if (chunk > Math.max(Math.ceil(pairs.length / SITEMAP_CHUNK), 1)) return null;
    return pairs.slice(from, from + SITEMAP_CHUNK).map((pair) => ({
      path: citySpecialismPath(pair.countrySlug, pair.citySlug, pair.specialismSlug),
    }));
  }

  const totals = await getTotals();
  if (chunk > Math.max(Math.ceil(totals.agencyCount / SITEMAP_CHUNK), 1)) return null;
  const agencies = await getAgencySitemapEntries(from, from + SITEMAP_CHUNK - 1);
  return agencies.map((agency) => ({
    path: agencyPath(agency.slug),
    lastModified: agency.updatedAt.slice(0, 10),
  }));
}

export const SITEMAP_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  // Shared caches may keep a file for an hour and reuse it for a day while
  // a fresh one is fetched.
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
};
