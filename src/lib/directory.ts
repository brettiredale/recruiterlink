/**
 * Cached readers for pages. Each wraps a plain data-layer function in a
 * `"use cache"` scope with a lifetime and tags, so pages are built once,
 * served as complete HTML, and refreshed by `revalidateDirectory`
 * (`src/lib/revalidate.ts`) or by themselves within a day.
 *
 * Everything here is the same for every visitor. Nothing reads cookies,
 * headers or the address bar.
 */
import { cacheLife, cacheTag } from "next/cache";
import {
  findCitiesBySlug,
  getAgencyBySlug,
  getCitiesByIds,
  getCityBySlugs,
  getCountryBySlug,
  getDirectoryTotals,
  listAgenciesForCity,
  listAgenciesForCountry,
  listAgencySitemapEntries,
  listCitiesForCountry,
  listCitySpecialismPairs,
  listCountries,
  listCountryCountsForSpecialism,
  listFeaturedAgencies,
  listIndexableCities,
  listRelatedAgencies,
  listSpecialisms,
  listSpecialismsForCity,
  listSpecialismsForCountry,
  listTopCities,
  listTopCityCountsForSpecialism,
  listTopCitySpecialismPairs,
  resolveLegacySlug,
  searchAgencies,
  type AgencySummary,
  type CityWithStats,
  type CountryWithCounts,
  type SpecialismWithCount,
} from "@/lib/data";
import {
  COUNTRIES_TAG,
  DIRECTORY_TAG,
  SPECIALISMS_TAG,
  agencyTag,
  cityTag,
  countryTag,
} from "./cache-tags";
import { MIN_AGENCIES_TO_INDEX } from "./indexability";
import { AGENCIES_PER_PAGE } from "./routes";
import { GENERIC_SPECIALISM_SLUGS } from "./specialisms";

export async function getTotals() {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, COUNTRIES_TAG);
  return getDirectoryTotals();
}

export async function getCountries() {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, COUNTRIES_TAG);
  return listCountries();
}

export async function getCountry(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, COUNTRIES_TAG, countryTag(slug));
  return getCountryBySlug(slug);
}

export async function getCountryCities(countrySlug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, countryTag(countrySlug));
  return listCitiesForCountry(countrySlug);
}

export async function getCountrySpecialisms(countryId: number, countrySlug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, countryTag(countrySlug));
  return listSpecialismsForCountry(countryId);
}

/** Featured agencies for a country, or worldwide when `country` is null. */
export async function getFeaturedAgencies(
  country: { id: number; slug: string } | null,
  limit: number,
) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, country ? countryTag(country.slug) : COUNTRIES_TAG);
  return listFeaturedAgencies(country?.id ?? null, limit);
}

export async function getTopCities(limit: number) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, COUNTRIES_TAG);
  return listTopCities(limit);
}

export async function getCity(countrySlug: string, citySlug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, countryTag(countrySlug), cityTag(countrySlug, citySlug));
  return getCityBySlugs(countrySlug, citySlug);
}

export async function getCitySpecialisms(city: {
  id: number;
  slug: string;
  countrySlug: string;
}) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, cityTag(city.countrySlug, city.slug));
  return listSpecialismsForCity(city.id);
}

/** One page of a city's agencies, optionally for one specialism. */
export async function getCityAgencies(
  city: { id: number; slug: string; countrySlug: string },
  page: number,
  specialismId?: number,
) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, cityTag(city.countrySlug, city.slug));
  return listAgenciesForCity(city.id, {
    page,
    pageSize: AGENCIES_PER_PAGE,
    specialismId,
  });
}

export async function getSpecialisms() {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, SPECIALISMS_TAG);
  return listSpecialisms();
}

export type SpecialismOverview = {
  /** Countries that have agencies with the specialism, most first. */
  countries: (CountryWithCounts & { specialismAgencyCount: number })[];
  /** The cities with most agencies for the specialism. */
  cities: (CityWithStats & { specialismAgencyCount: number })[];
};

/** Where a specialism's agencies are: by country and the top cities. */
export async function getSpecialismOverview(
  specialismId: number,
  cityLimit: number,
): Promise<SpecialismOverview> {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, SPECIALISMS_TAG);
  const [countryCounts, cityCounts, countries] = await Promise.all([
    listCountryCountsForSpecialism(specialismId),
    listTopCityCountsForSpecialism(specialismId, cityLimit),
    listCountries(),
  ]);
  const cities = await getCitiesByIds(cityCounts.map((pair) => pair.cityId));
  const countryById = new Map(countries.map((country) => [country.id, country]));
  const cityById = new Map(cities.map((city) => [city.id, city]));
  return {
    countries: countryCounts.flatMap((row) => {
      const country = countryById.get(row.countryId);
      return country ? [{ ...country, specialismAgencyCount: row.agencyCount }] : [];
    }),
    cities: cityCounts.flatMap((pair) => {
      const city = cityById.get(pair.cityId);
      return city ? [{ ...city, specialismAgencyCount: pair.agencyCount }] : [];
    }),
  };
}

export type PopularSearch = {
  city: { name: string; slug: string; countrySlug: string };
  specialism: { name: string; slug: string };
  agencyCount: number;
};

/**
 * The biggest city + specialism pairs among some cities: the "popular
 * searches" lists. Only pairs whose page is indexable (three or more
 * agencies in an indexable city, never a generic specialism), with at most
 * `perCity` from one city so a single big city does not fill the list.
 */
export async function getPopularSearches(
  cities: { id: number; name: string; slug: string; countrySlug: string; agencyCount: number }[],
  tag: string,
  limit: number,
  perCity: number,
): Promise<PopularSearch[]> {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, tag);
  const eligible = cities.filter((city) => city.agencyCount >= MIN_AGENCIES_TO_INDEX);
  const pairs = await listTopCitySpecialismPairs(
    eligible.map((city) => city.id),
    {
      limit: 200,
      excludeSlugs: GENERIC_SPECIALISM_SLUGS,
      minAgencies: MIN_AGENCIES_TO_INDEX,
    },
  );
  const byId = new Map(eligible.map((city) => [city.id, city]));
  const used = new Map<number, number>();
  const out: PopularSearch[] = [];
  for (const pair of pairs) {
    const city = byId.get(pair.cityId);
    if (!city) continue;
    const count = used.get(city.id) ?? 0;
    if (count >= perCity) continue;
    used.set(city.id, count + 1);
    out.push({
      city: { name: city.name, slug: city.slug, countrySlug: city.countrySlug },
      specialism: { name: pair.specialism.name, slug: pair.specialism.slug },
      agencyCount: pair.agencyCount,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function getAgency(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, agencyTag(slug));
  return getAgencyBySlug(slug);
}

/** New slug for an old-site agency slug, or null. */
export async function getLegacyAgencySlug(oldSlug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG);
  return resolveLegacySlug(oldSlug);
}

export async function getRelatedAgencies(
  agency: { id: string; sortName: string; cityId: number },
  city: { slug: string; countrySlug: string },
  limit: number,
) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, cityTag(city.countrySlug, city.slug));
  return listRelatedAgencies(agency, limit);
}

/** Cities with a slug, largest first (old location addresses, search). */
export async function getCitiesBySlug(citySlug: string, countrySlug?: string) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, COUNTRIES_TAG);
  return findCitiesBySlug(citySlug, countrySlug);
}

/** Search results. Short-lived: the same search is often repeated. */
export async function getSearchResults(
  keywords: string,
  options: { countrySlug?: string; citySlug?: string; limit: number; offset: number },
): Promise<AgencySummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(DIRECTORY_TAG);
  return searchAgencies(keywords, options);
}

/** A page of a country's agencies, optionally for one specialism (search). */
export async function getCountryAgencies(
  country: { id: number; slug: string },
  page: number,
  specialismId?: number,
) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, countryTag(country.slug));
  return listAgenciesForCountry(country.id, {
    page,
    pageSize: AGENCIES_PER_PAGE,
    specialismId,
  });
}

// --- Sitemaps -------------------------------------------------------------

export async function getIndexableCities() {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, COUNTRIES_TAG);
  return listIndexableCities();
}

/** Every indexable city + specialism pair, with its city. */
export async function getIndexableCitySpecialismPairs(): Promise<
  { countrySlug: string; citySlug: string; specialismSlug: string }[]
> {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, COUNTRIES_TAG);
  const [cities, pairs] = await Promise.all([
    listIndexableCities(),
    listCitySpecialismPairs(MIN_AGENCIES_TO_INDEX),
  ]);
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const generic = new Set(GENERIC_SPECIALISM_SLUGS);
  return pairs.flatMap((pair) => {
    const city = cityById.get(pair.cityId);
    if (!city || generic.has(pair.specialism.slug)) return [];
    return [
      {
        countrySlug: city.country.slug,
        citySlug: city.slug,
        specialismSlug: pair.specialism.slug,
      },
    ];
  });
}

export async function getAgencySitemapEntries(from: number, to: number) {
  "use cache";
  cacheLife("days");
  cacheTag(DIRECTORY_TAG, COUNTRIES_TAG);
  return listAgencySitemapEntries(from, to);
}

export type { SpecialismWithCount };
