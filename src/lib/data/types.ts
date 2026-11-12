/**
 * Plain data shapes returned by the data layer. Everything here is
 * serialisable, so results can be returned from `"use cache"` functions.
 */

export type Country = {
  id: number;
  name: string;
  slug: string;
  /** ISO 3166-1 alpha-2 code, e.g. "GB". */
  iso2: string | null;
};

export type CountryWithCounts = Country & {
  /** Published agencies in the country. */
  agencyCount: number;
  /** Cities in the country with at least one published agency. */
  cityCount: number;
};

export type City = {
  id: number;
  name: string;
  slug: string;
  /** City photo file, when one exists. */
  photoPath: string | null;
  country: Country;
};

export type CityWithStats = City & {
  /** Published agencies in the city, counted live. */
  agencyCount: number;
  /**
   * True when the city has three or more published agencies. Only these
   * cities are submitted to search engines; the rest carry a noindex.
   */
  isIndexable: boolean;
};

export type Specialism = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
};

export type SpecialismWithCount = Specialism & {
  /** Published agencies with this specialism, in the scope asked for. */
  agencyCount: number;
};

export type AgencyPlan = "free" | "premium";

/** What a listing card needs. */
export type AgencySummary = {
  id: string;
  name: string;
  slug: string;
  introduction: string | null;
  /** File name in the public `agency-logos` bucket; see `agencyLogoUrl`. */
  logoPath: string | null;
  plan: AgencyPlan;
  isClaimed: boolean;
  city: { name: string; slug: string } | null;
  country: { name: string; slug: string };
  specialisms: { name: string; slug: string }[];
};

/** What an agency's own page needs. */
export type AgencyDetail = AgencySummary & {
  description: string | null;
  website: string | null;
  domain: string | null;
  /** Name as used for ordering lists (lowercase, no leading "The"). */
  sortName: string;
  cityId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Page<T> = {
  items: T[];
  /** Total matching rows across all pages. */
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type DirectoryTotals = {
  agencyCount: number;
  countryCount: number;
  cityCount: number;
  specialismCount: number;
};

/** A city + specialism pair with its number of published agencies. */
export type CitySpecialismCount = {
  cityId: number;
  specialism: Specialism;
  agencyCount: number;
};
