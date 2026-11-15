// Checks on agency text written from the agency's own website (growth plan
// step 2). Kept free of server-only imports so the tests can load it.

/**
 * Phrases from the old site's AI template text. Google read 15,000 agency
 * pages built from them as one page; new text must never use them.
 */
export const BANNED_PHRASES = [
  "dedicated team",
  "top-tier",
  "top tier talent",
  "exceptional talent",
  "exceptional candidates",
  "outstanding employers",
  "go beyond",
  "goes beyond",
  "beyond simply",
  "passionate about",
  "pride ourselves",
  "prides itself",
  "unparalleled",
  "cutting-edge",
  "cutting edge",
  "seamless",
  "tailored solutions",
  "bespoke solutions",
  "recruitment solutions",
  "talent solutions",
  "in today's",
  "in today’s",
  "ever-evolving",
  "ever-changing",
  "landscape",
  "vital sectors",
  "look no further",
  "one-stop",
  "world-class",
  "state-of-the-art",
  "game-changer",
  "synergy",
  "dynamic team",
  "delve",
  "elevate",
  "empower",
  "testament to",
  "commitment to excellence",
  "strives to",
  "committed to delivering",
  "consistently delivering",
  "meaningful, lasting",
  "lasting relationships",
  "right fit",
  "perfect match",
];

export function bannedPhrasesIn(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

/** First-person words: the text is about the agency, not by it. */
export function firstPersonWords(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\b(we|we're|we've|our|ours)\b/gi)) {
    found.add(match[1].toLowerCase());
  }
  // Lower case only: "US" is the country.
  if (/\bus\b/.test(text)) found.add("us");
  return [...found];
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Lower case, plain quotes and dashes, single spaces, no markdown marks. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>\\]/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/** True when the quote is in the source text (allowing markdown and spacing). */
export function quoteInSource(quote: string, normalisedSource: string): boolean {
  const q = normalise(quote).replace(/^["'.,;:\s-]+|["'.,;:\s-]+$/g, "");
  if (q.length < 8) return false;
  return normalisedSource.includes(q);
}

export type Fact = { fact: string; quote: string };

export type TextChecks = {
  introWords: number;
  descriptionWords: number;
  banned: string[];
  firstPerson: string[];
  facts: number;
  factsVerified: number;
  unverifiedFacts: string[];
  nameMentioned: boolean;
};

export function checkText(input: {
  name: string;
  introduction: string;
  description: string;
  facts: Fact[];
  source: string;
}): TextChecks {
  const both = `${input.introduction}\n${input.description}`;
  const source = normalise(input.source);
  const verified = input.facts.filter((f) => quoteInSource(f.quote, source));
  return {
    introWords: wordCount(input.introduction),
    descriptionWords: wordCount(input.description),
    banned: bannedPhrasesIn(both),
    firstPerson: firstPersonWords(both),
    facts: input.facts.length,
    factsVerified: verified.length,
    unverifiedFacts: input.facts.filter((f) => !verified.includes(f)).map((f) => f.fact),
    nameMentioned: normalise(both).includes(normalise(input.name).split(" ")[0] ?? ""),
  };
}

export const MIN_VERIFIED_FACTS = 4;
export const MIN_DESCRIPTION_WORDS = 90;

export type Verdict = "ready" | "thin" | "not_agency" | "unusable" | "fetch_failed";

/** The model's view of the site plus the checks give the verdict. */
export function verdictFor(siteStatus: string, checks: TextChecks): { verdict: Verdict; reason: string } {
  if (siteStatus === "not_agency") return { verdict: "not_agency", reason: "The website is not a recruitment agency." };
  if (siteStatus !== "agency") return { verdict: "unusable", reason: "The website is broken, parked or belongs to someone else." };
  if (checks.banned.length > 0) return { verdict: "thin", reason: `Template phrases left: ${checks.banned.join(", ")}` };
  if (checks.firstPerson.length > 0) return { verdict: "thin", reason: `First-person words left: ${checks.firstPerson.join(", ")}` };
  if (checks.factsVerified < MIN_VERIFIED_FACTS) {
    return { verdict: "thin", reason: `Only ${checks.factsVerified} facts found on the website (need ${MIN_VERIFIED_FACTS}).` };
  }
  if (checks.descriptionWords < MIN_DESCRIPTION_WORDS) {
    return { verdict: "thin", reason: `Description has ${checks.descriptionWords} words (need ${MIN_DESCRIPTION_WORDS}).` };
  }
  return { verdict: "ready", reason: `${checks.factsVerified} facts found on the website.` };
}

// Pages beyond the home page that usually say what an agency does. Includes
// the usual words in Dutch, German, French, Swedish, Danish and Spanish.
const PAGE_WORDS: [RegExp, number][] = [
  [/about|who-we-are|our-story|over-ons|ueber-uns|uber-uns|qui-sommes|a-propos|om-oss|om-os|quienes-somos|sobre-nosotros|chi-siamo/, 10],
  [/services|what-we-do|diensten|leistungen|dienstleistungen|tjanster|ydelser|servicios|prestations/, 8],
  [/sectors|industries|specialisms|specialisms|specialties|expertise|branchen|sectoren|markets|disciplines/, 7],
  [/company|team|history|geschichte/, 4],
];

const SKIP = /(job|vacan|career|login|sign-?in|register|privacy|cookie|terms|legal|impressum|imprint|blog|news|post|contact|apply|cart|wp-content|\.(pdf|jpg|png|zip)$)/;

/** Picks up to `limit` same-site pages most likely to describe the agency. */
export function pickExtraPages(links: string[], home: string, limit = 2): string[] {
  let homeUrl: URL;
  try {
    homeUrl = new URL(home);
  } catch {
    return [];
  }
  const host = homeUrl.hostname.replace(/^www\./, "");
  const scored = new Map<string, number>();
  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link, homeUrl);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    if (url.hostname.replace(/^www\./, "") !== host) continue;
    const path = url.pathname.toLowerCase().replace(/\/+$/, "");
    if (!path || path === "/") continue;
    if (SKIP.test(path)) continue;
    // Deep pages are usually one service or one article, not the overview.
    if (path.split("/").filter(Boolean).length > 2) continue;
    let score = 0;
    for (const [pattern, points] of PAGE_WORDS) if (pattern.test(path)) score = Math.max(score, points);
    if (score === 0) continue;
    url.hash = "";
    url.search = "";
    const key = url.toString().replace(/\/$/, "");
    scored.set(key, Math.max(scored.get(key) ?? 0, score - path.length / 100));
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([u]) => u);
}
