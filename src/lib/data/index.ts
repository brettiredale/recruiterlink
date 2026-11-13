/**
 * Server-side data layer for the public directory. Plain async functions
 * that read published data from Supabase and return plain objects.
 *
 * They do no caching of their own. In a page, call them from a function or
 * component marked `"use cache"` (with `cacheLife` / `cacheTag`) so the page
 * is served as complete, pre-built HTML.
 */
export * from "./types";
export { agencyLogoUrl } from "./shared";
export { listCountries, getCountryBySlug } from "./countries";
export {
  listCitiesForCountry,
  listIndexableCities,
  getCityBySlugs,
  listTopCities,
  findCitiesBySlug,
  getCitiesByIds,
} from "./cities";
export {
  listSpecialisms,
  getSpecialismBySlug,
  listSpecialismsForCity,
  listSpecialismsForCountry,
  listCountryCountsForSpecialism,
  listTopCityCountsForSpecialism,
  listTopCitySpecialismPairs,
  listCitySpecialismPairs,
} from "./specialisms";
export {
  listAgenciesForCity,
  listAgenciesForCountry,
  getAgencyBySlug,
  resolveLegacySlug,
  listFeaturedAgencies,
  listRelatedAgencies,
  listAgencySitemapEntries,
  searchAgencies,
} from "./agencies";
export { getDirectoryTotals } from "./totals";
export { listRegions, matchCity, suggestCities, type RegionOption, type CityMatch } from "./regions";
