/**
 * Understands a typed search such as "IT recruiters in Madrid" without any
 * AI service: plain, predictable rules, unit tested.
 *
 * 1. The text after the last " in " is tried as a place (city, country, or
 *    "city, country"). If no such place exists the whole text is searched.
 * 2. Filler words ("recruiters", "agencies", "best", ...) are dropped.
 * 3. If what is left names a specialism ("IT", "legal", "executive search")
 *    the results are that specialism's agencies; otherwise it is searched
 *    as keywords.
 */

/** Longest search text looked at; anything beyond is cut off. */
export const MAX_QUERY_LENGTH = 200;

/** Lowercase ASCII slug, matching the database's slugs for place names. */
export function slugifyText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]s\b/g, "s")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Tidies what the visitor typed: one line, single spaces, bounded length. */
export function normaliseQuery(raw: string | null | undefined): string {
  return (raw ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
    .trim();
}

/** Other names people type for a country, as slugs, to our country slug. */
export const COUNTRY_ALIASES: Record<string, string> = {
  uk: "united-kingdom",
  "u-k": "united-kingdom",
  britain: "united-kingdom",
  "great-britain": "united-kingdom",
  england: "united-kingdom",
  scotland: "united-kingdom",
  wales: "united-kingdom",
  us: "united-states",
  usa: "united-states",
  "u-s": "united-states",
  "u-s-a": "united-states",
  america: "united-states",
  "the-united-states": "united-states",
  "the-us": "united-states",
  "the-usa": "united-states",
  "the-uk": "united-kingdom",
  "the-united-kingdom": "united-kingdom",
  uae: "united-arab-emirates",
  "the-uae": "united-arab-emirates",
  emirates: "united-arab-emirates",
  holland: "netherlands",
  "the-netherlands": "netherlands",
  deutschland: "germany",
  espana: "spain",
};

/**
 * Words people use for each specialism, as slugs. The specialism's own name
 * and slug always match too (see `findSpecialismSlug`).
 */
export const SPECIALISM_ALIASES: Record<string, string> = {
  accounting: "accounting-finance",
  accountancy: "accounting-finance",
  finance: "accounting-finance",
  admin: "administration-office-support",
  administration: "administration-office-support",
  "office-support": "administration-office-support",
  secretarial: "administration-office-support",
  aerospace: "aerospace-aviation-defence",
  aviation: "aerospace-aviation-defence",
  defence: "aerospace-aviation-defence",
  defense: "aerospace-aviation-defence",
  agriculture: "agriculture-agritech",
  agritech: "agriculture-agritech",
  farming: "agriculture-agritech",
  ai: "ai-machine-learning",
  "artificial-intelligence": "ai-machine-learning",
  "machine-learning": "ai-machine-learning",
  architecture: "architecture-planning",
  architect: "architecture-planning",
  automotive: "automotive",
  banking: "banking-financial-services",
  "financial-services": "banking-financial-services",
  fintech: "banking-financial-services",
  blockchain: "blockchain-web3",
  web3: "blockchain-web3",
  crypto: "blockchain-web3",
  compliance: "compliance-risk",
  risk: "compliance-risk",
  construction: "construction-trades",
  trades: "construction-trades",
  consulting: "consulting-advisory",
  creative: "creative-design",
  design: "creative-design",
  "web-design": "creative-design",
  "graphic-design": "creative-design",
  "customer-service": "customer-service",
  "call-centre": "customer-service",
  "call-center": "customer-service",
  "customer-support": "customer-service",
  cybersecurity: "cybersecurity",
  "cyber-security": "cybersecurity",
  cyber: "cybersecurity",
  data: "data-analytics",
  analytics: "data-analytics",
  "data-science": "data-analytics",
  education: "education-training",
  teaching: "education-training",
  teacher: "education-training",
  energy: "energy-renewables",
  renewables: "energy-renewables",
  "renewable-energy": "energy-renewables",
  "oil-and-gas": "energy-renewables",
  engineering: "engineering",
  engineer: "engineering",
  "executive-search": "executive-search",
  executive: "executive-search",
  "c-suite": "executive-search",
  headhunting: "executive-search",
  government: "government-public-sector",
  "public-sector": "government-public-sector",
  healthcare: "healthcare-medical",
  medical: "healthcare-medical",
  hospitality: "hospitality-tourism",
  tourism: "hospitality-tourism",
  hotel: "hospitality-tourism",
  hr: "human-resources",
  "human-resources": "human-resources",
  it: "information-technology",
  tech: "information-technology",
  technology: "information-technology",
  "information-technology": "information-technology",
  insurance: "insurance",
  legal: "legal",
  law: "legal",
  lawyer: "legal",
  "life-sciences": "life-sciences-pharmaceuticals",
  pharma: "life-sciences-pharmaceuticals",
  pharmaceutical: "life-sciences-pharmaceuticals",
  pharmaceuticals: "life-sciences-pharmaceuticals",
  biotech: "life-sciences-pharmaceuticals",
  manufacturing: "manufacturing-production",
  production: "manufacturing-production",
  industrial: "manufacturing-production",
  marketing: "marketing-communications",
  communications: "marketing-communications",
  pr: "marketing-communications",
  "digital-marketing": "marketing-communications",
  media: "media-entertainment",
  entertainment: "media-entertainment",
  mining: "mining-resources",
  "non-profit": "non-profit-charity",
  nonprofit: "non-profit-charity",
  "not-for-profit": "non-profit-charity",
  charity: "non-profit-charity",
  nursing: "nursing-allied-health",
  nurse: "nursing-allied-health",
  "allied-health": "nursing-allied-health",
  operations: "operations",
  "project-management": "project-management",
  "real-estate": "real-estate-property",
  property: "real-estate-property",
  retail: "retail-consumer-goods",
  fmcg: "retail-consumer-goods",
  "consumer-goods": "retail-consumer-goods",
  sales: "sales-business-development",
  "business-development": "sales-business-development",
  "social-care": "social-care",
  care: "social-care",
  software: "software-development",
  "software-development": "software-development",
  "software-developer": "software-development",
  "software-engineering": "software-development",
  developer: "software-development",
  "web-development": "software-development",
  "web-developer": "software-development",
  "supply-chain": "supply-chain-logistics",
  logistics: "supply-chain-logistics",
  warehouse: "supply-chain-logistics",
  sustainability: "sustainability-environment",
  environmental: "sustainability-environment",
  environment: "sustainability-environment",
  telecoms: "telecommunications",
  telecom: "telecommunications",
  telecommunications: "telecommunications",
};

/** Words that say "I want an agency" rather than what kind. */
const FILLER_WORDS = new Set([
  "a",
  "an",
  "the",
  "for",
  "of",
  "in",
  "and",
  "best",
  "top",
  "good",
  "find",
  "me",
  "i",
  "need",
  "want",
  "looking",
  "recruitment",
  "recruiting",
  "recruiter",
  "recruiters",
  "agency",
  "agencies",
  "staffing",
  "firm",
  "firms",
  "company",
  "companies",
  "consultancy",
  "consultancies",
  "consultant",
  "consultants",
  "headhunter",
  "headhunters",
  "specialist",
  "specialists",
  "job",
  "jobs",
  "roles",
  "hiring",
]);

/** Splits "IT recruiters in Madrid" into the part before and after " in ". */
export function splitPlace(query: string): { text: string; place: string | null } {
  const match = /^(.*?)\s*\bin\s+(?!.*\bin\s)(.+)$/i.exec(query);
  if (match && match[2].trim()) {
    return { text: match[1].trim(), place: match[2].trim() };
  }
  const nearMe = query.replace(/\s*\bnear me\b\s*$/i, "").trim();
  return { text: nearMe, place: null };
}

export type PlaceGuess = {
  /** City slug to look for, when the guess includes a city. */
  citySlug?: string;
  /** Country slug to look for, when the guess includes a country. */
  countrySlug?: string;
};

function countrySlugFor(text: string): string {
  const slug = slugifyText(text);
  return COUNTRY_ALIASES[slug] ?? slug;
}

/**
 * The ways a place text could be read, most specific first:
 * "Madrid, Spain" as city + country; then the whole text as a country;
 * then the whole text as a city.
 */
export function placeGuesses(place: string): PlaceGuess[] {
  const guesses: PlaceGuess[] = [];
  const parts = place
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const citySlug = slugifyText(parts[0]);
    const countrySlug = countrySlugFor(parts[parts.length - 1]);
    if (citySlug && countrySlug) guesses.push({ citySlug, countrySlug });
  }
  const whole = slugifyText(place);
  if (whole) {
    guesses.push({ countrySlug: COUNTRY_ALIASES[whole] ?? whole });
    guesses.push({ citySlug: whole });
  }
  return guesses;
}

export type KnownSpecialism = { slug: string; name: string };

/** The specialism a short phrase names, if any. */
export function findSpecialismSlug(
  phrase: string,
  specialisms: readonly KnownSpecialism[],
): string | null {
  const slug = slugifyText(phrase.replace(/&/g, " and "));
  if (!slug) return null;
  const known = new Set(specialisms.map((item) => item.slug));
  for (const item of specialisms) {
    if (item.slug === slug) return item.slug;
    if (slugifyText(item.name.replace(/&/g, " and ")) === slug) return item.slug;
    if (slugifyText(item.name.replace(/&/g, " ")) === slug) return item.slug;
  }
  const alias = SPECIALISM_ALIASES[slug];
  return alias && known.has(alias) ? alias : null;
}

/** Drops the filler words, keeping the visitor's own spelling of the rest. */
export function stripFillerWords(text: string): string {
  return text
    .split(/\s+/)
    .filter((word) => {
      const bare = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      return bare !== "" && !FILLER_WORDS.has(bare);
    })
    .join(" ");
}

export type ResolvedPlace = {
  country: { slug: string; name: string };
  city: { slug: string; name: string } | null;
};

/** How the search looks places up. The real one reads the database. */
export type PlaceLookup = {
  /** A country by slug, or null. */
  findCountry(slug: string): Promise<{ slug: string; name: string } | null>;
  /**
   * The city with this slug (in the given country if one is named). When
   * several countries have a city of that name, the one with most agencies.
   */
  findCity(
    citySlug: string,
    countrySlug?: string,
  ): Promise<{ slug: string; name: string; country: { slug: string; name: string } } | null>;
};

/** Finds the real place a text refers to, or null. */
export async function resolvePlace(
  place: string,
  lookup: PlaceLookup,
): Promise<ResolvedPlace | null> {
  for (const guess of placeGuesses(place)) {
    if (guess.citySlug) {
      const city = await lookup.findCity(guess.citySlug, guess.countrySlug);
      if (city) {
        return { country: city.country, city: { slug: city.slug, name: city.name } };
      }
    } else if (guess.countrySlug) {
      const country = await lookup.findCountry(guess.countrySlug);
      if (country) return { country, city: null };
    }
  }
  return null;
}

export type SearchPlan = {
  /** The tidied text the visitor typed. */
  query: string;
  /** The place the search is limited to, when one was recognised. */
  place: ResolvedPlace | null;
  /**
   * A place the typed words also name, when no " in " was used ("Madrid").
   * Offered as a link; the results are not limited to it.
   */
  suggestedPlace: ResolvedPlace | null;
  /** The specialism the search names, when one was recognised. */
  specialismSlug: string | null;
  /** Remaining words for the full-text search ("" when nothing is left). */
  keywords: string;
};

/** Works out what a typed search means. */
export async function planSearch(
  raw: string | null | undefined,
  specialisms: readonly KnownSpecialism[],
  lookup: PlaceLookup,
): Promise<SearchPlan> {
  const query = normaliseQuery(raw);
  if (!query) {
    return { query, place: null, suggestedPlace: null, specialismSlug: null, keywords: "" };
  }

  const split = splitPlace(query);
  let place: ResolvedPlace | null = null;
  let text = split.text;
  let suggestedPlace: ResolvedPlace | null = null;
  if (split.place) {
    place = await resolvePlace(split.place, lookup);
    // Not a place we know ("jobs in finance"): search the whole text.
    if (!place) text = query.replace(/\s*\bnear me\b\s*$/i, "").trim();
  } else if (text) {
    // No " in ": the words are searched as typed (an agency can share its
    // name with a town), and a matching place is only offered as a link.
    suggestedPlace = await resolvePlace(stripFillerWords(text) || text, lookup);
  }

  const stripped = stripFillerWords(text);
  const specialismSlug = stripped ? findSpecialismSlug(stripped, specialisms) : null;
  return {
    query,
    place,
    suggestedPlace,
    specialismSlug,
    keywords: specialismSlug ? "" : stripped,
  };
}
