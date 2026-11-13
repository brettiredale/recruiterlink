/**
 * Old-site addresses and where they go now. Everything the old site exposed
 * (its routes, its sitemaps) gets a permanent redirect to the closest new
 * page, so links and search rankings carry over.
 *
 * Three kinds:
 * 1. Fixed patterns (`legacyRedirects`), applied by next.config.ts before
 *    any page runs.
 * 2. Old location pages `/recruiters-in/<location>[/<specialization>]`,
 *    resolved against the database by the route handlers in
 *    `src/app/recruiters-in` using `legacyLocationTarget` below.
 * 3. Old agency slugs `/agencies/recruitment-...`, looked up in the
 *    `slug_redirects` table by the agency page.
 */

export type RedirectRule = { source: string; destination: string; permanent: true };

/**
 * The old site's 93 specialization slugs (from its sitemap) and the
 * specialism each now belongs to. Taken from the database's own mapping of
 * old labels (`private.legacy_specialism_map`) on 12 Nov 2026.
 */
export const LEGACY_SPECIALIZATION_SLUGS: Record<string, string> = {
  accounting: "accounting-finance",
  advertising: "marketing-communications",
  "aerospace-aviation": "aerospace-aviation-defence",
  "agriculture-agritech": "agriculture-agritech",
  "ai-machine-learning": "ai-machine-learning",
  "allied-health": "nursing-allied-health",
  architecture: "architecture-planning",
  audit: "accounting-finance",
  "blockchain-cryptocurrency": "blockchain-web3",
  broadcast: "media-entertainment",
  "business-development": "sales-business-development",
  "business-services": "consulting-advisory",
  "call-centre": "customer-service",
  charity: "non-profit-charity",
  "chemical-engineering": "engineering",
  "civil-engineering": "construction-trades",
  "client-services": "customer-service",
  "cloud-computing": "information-technology",
  "commercial-law": "legal",
  compliance: "compliance-risk",
  construction: "construction-trades",
  consulting: "consulting-advisory",
  "consumer-goods": "retail-consumer-goods",
  "content-creation": "marketing-communications",
  "corporate-law": "legal",
  "creative-arts": "creative-design",
  "customer-service": "customer-service",
  cybersecurity: "cybersecurity",
  "data-science-analytics": "data-analytics",
  design: "creative-design",
  devops: "software-development",
  "digital-marketing": "marketing-communications",
  "digital-transformation": "information-technology",
  "e-commerce": "retail-consumer-goods",
  education: "education-training",
  "educational-technology": "information-technology",
  "electrical-engineering": "engineering",
  "employment-law": "legal",
  energy: "energy-renewables",
  engineering: "engineering",
  environmental: "sustainability-environment",
  "facilities-management": "real-estate-property",
  fashion: "retail-consumer-goods",
  "finance-banking": "banking-financial-services",
  "financial-services": "banking-financial-services",
  "food-beverage": "retail-consumer-goods",
  "gaming-esports": "media-entertainment",
  government: "government-public-sector",
  "graphic-design": "creative-design",
  healthcare: "healthcare-medical",
  "higher-education": "education-training",
  hospitality: "hospitality-tourism",
  "human-resources": "human-resources",
  insurance: "insurance",
  "investment-banking": "banking-financial-services",
  "it-technology": "information-technology",
  legal: "legal",
  "life-sciences": "life-sciences-pharmaceuticals",
  logistics: "supply-chain-logistics",
  "management-consulting": "consulting-advisory",
  manufacturing: "manufacturing-production",
  marketing: "marketing-communications",
  "mechanical-engineering": "engineering",
  media: "media-entertainment",
  "medical-clinical": "healthcare-medical",
  "mental-health": "healthcare-medical",
  "mining-resources": "mining-resources",
  "not-for-profit": "non-profit-charity",
  nursing: "nursing-allied-health",
  "office-administration": "administration-office-support",
  "oil-gas": "energy-renewables",
  operations: "operations",
  pharmaceutical: "life-sciences-pharmaceuticals",
  "project-management": "project-management",
  property: "real-estate-property",
  "public-relations": "marketing-communications",
  "public-sector": "government-public-sector",
  "quality-assurance": "manufacturing-production",
  "real-estate": "real-estate-property",
  recruitment: "human-resources",
  "renewable-energy": "energy-renewables",
  retail: "retail-consumer-goods",
  sales: "sales-business-development",
  science: "life-sciences-pharmaceuticals",
  "software-development": "software-development",
  "sports-recreation": "hospitality-tourism",
  strategy: "consulting-advisory",
  "supply-chain": "supply-chain-logistics",
  sustainability: "sustainability-environment",
  "talent-acquisition": "human-resources",
  teaching: "education-training",
  "training-development": "education-training",
  "veterinary-medicine": "healthcare-medical",
};

/**
 * Old location slugs whose city now goes by another name (the old site used
 * local spellings), to `[country slug, city slug]`. Every other old
 * location slug equals a current country or city slug.
 */
export const LEGACY_LOCATION_ALIASES: Record<string, [string, string]> = {
  "al-sharjah": ["united-arab-emirates", "sharjah"],
  antwerpen: ["belgium", "antwerp"],
  athina: ["greece", "athens"],
  boeblingen: ["germany", "boblingen"],
  brussel: ["belgium", "brussels"],
  bruxelles: ["belgium", "brussels"],
  "ciudad-de-mexico": ["mexico", "mexico-city"],
  "den-haag": ["netherlands", "the-hague"],
  duebendorf: ["switzerland", "dubendorf"],
  duesseldorf: ["germany", "dusseldorf"],
  "frankfurt-am-main": ["germany", "frankfurt"],
  fuerth: ["germany", "furth"],
  genova: ["italy", "genoa"],
  gruenwald: ["germany", "grunwald"],
  hannover: ["germany", "hanover"],
};

/** Fixed old-site addresses. Order matters: the first match wins. */
export const legacyRedirects: RedirectRule[] = [
  // The old sitemap files (the new index lists the new ones).
  { source: "/sitemap-:name.xml", destination: "/sitemap.xml", permanent: true },

  // Old agency account pages. There are no logins yet; the page for
  // agencies explains how to register interest.
  { source: "/agency/dashboard", destination: "/for-agencies", permanent: true },
  { source: "/agency/subscription", destination: "/for-agencies", permanent: true },
  { source: "/agency/onboarding", destination: "/for-agencies", permanent: true },
  { source: "/agency/resumes", destination: "/for-agencies", permanent: true },
  { source: "/list-your-agency", destination: "/for-agencies", permanent: true },
  { source: "/registration-success", destination: "/for-agencies", permanent: true },
  { source: "/registration-cancelled", destination: "/for-agencies", permanent: true },
  { source: "/auth", destination: "/for-agencies", permanent: true },

  // Older agency profile addresses. The agency page then sends an old slug
  // on to the agency's new address.
  { source: "/agency/:slug", destination: "/agencies/:slug", permanent: true },
  { source: "/recruitment-agency/:slug", destination: "/agencies/:slug", permanent: true },
  { source: "/videos/:slug", destination: "/agencies/:slug", permanent: true },
  { source: "/agencies/:slug/videos", destination: "/agencies/:slug", permanent: true },

  // Search.
  { source: "/search-results", destination: "/search", permanent: true },
  { source: "/find-agency", destination: "/search", permanent: true },

  // Browse pages.
  { source: "/specializations", destination: "/specialisms", permanent: true },
  ...Object.entries(LEGACY_SPECIALIZATION_SLUGS).map(
    ([oldSlug, newSlug]): RedirectRule => ({
      source: `/specialization/${oldSlug}`,
      destination: `/specialisms/${newSlug}`,
      permanent: true,
    }),
  ),
  { source: "/specialization/:slug*", destination: "/specialisms", permanent: true },
  { source: "/cities", destination: "/countries", permanent: true },
  { source: "/recruiters-in", destination: "/countries", permanent: true },

  // Company pages.
  { source: "/about-us", destination: "/about", permanent: true },
  { source: "/contact-us", destination: "/contact", permanent: true },
  { source: "/legals", destination: "/legal", permanent: true },

  // Old pages with no equivalent: the home page is the nearest parent.
  { source: "/directory", destination: "/", permanent: true },
  { source: "/hubs/:path*", destination: "/", permanent: true },
  { source: "/vendors/:path*", destination: "/", permanent: true },
  { source: "/why-use-recruiter", destination: "/", permanent: true },
  { source: "/for-job-seekers", destination: "/", permanent: true },
  { source: "/job-boost-engine/:path*", destination: "/", permanent: true },
  { source: "/agency-videos", destination: "/", permanent: true },
  { source: "/admin-access", destination: "/", permanent: true },
  // The old site's /admin pages are not redirected: /admin is now this
  // site's own admin area (private, never indexed).
  { source: "/jobseeker/:path*", destination: "/", permanent: true },
];

/** What the database knows about a slug used as an old location. */
export type LocationFacts = {
  /** True when a country has this slug. */
  isCountry: boolean;
  /**
   * Cities with this slug, largest first (several countries can each have a
   * city of the same name; the old site did not tell them apart).
   */
  cities: { countrySlug: string; citySlug: string }[];
};

/** Tidies a path segment from an old address into a slug to look up. */
export function cleanLegacySegment(segment: string): string {
  let text = segment;
  try {
    text = decodeURIComponent(segment);
  } catch {
    // Keep the raw text; it simply will not match anything.
  }
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * New address for an old `/recruiters-in/<location>[/<specialization>]`.
 *
 * - A country goes to its country page (a country + specialization has no
 *   page of its own, so it also goes to the country page).
 * - A city goes to its city page, or to its city + specialism page when the
 *   old specialization maps to a current specialism.
 * - Anything unknown goes to the list of countries, the nearest parent.
 */
export function legacyLocationTarget(
  location: string,
  specialization: string | null,
  facts: LocationFacts,
): string {
  const alias = LEGACY_LOCATION_ALIASES[location];
  const city = alias
    ? { countrySlug: alias[0], citySlug: alias[1] }
    : facts.isCountry
      ? null
      : (facts.cities[0] ?? null);

  if (!city) return facts.isCountry ? `/${location}` : "/countries";

  const specialism = specialization
    ? LEGACY_SPECIALIZATION_SLUGS[specialization]
    : undefined;
  return specialism
    ? `/${city.countrySlug}/${city.citySlug}/${specialism}`
    : `/${city.countrySlug}/${city.citySlug}`;
}
