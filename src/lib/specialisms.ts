/**
 * How specialisms are named and ordered on pages. Pure functions only, so
 * they can be unit tested without the database.
 */

/**
 * GENERIC SPECIALISMS. The old site tagged nearly every agency with "Human
 * Resources" (16,681 agencies) and "Consulting & Advisory" (15,298), so the
 * two say almost nothing about what an agency recruits for. Everywhere on
 * the site they are treated as generic:
 *
 * - shown last in any list of specialisms;
 * - not used as an agency's displayed tags when it has other specialisms;
 * - left out of "popular searches", example searches and FAQ answers;
 * - their city + specialism pages carry a noindex and stay out of sitemaps.
 *
 * This is the single place that names them. Remove a slug from this list
 * once its tagging has been cleaned up in the data.
 */
export const GENERIC_SPECIALISM_SLUGS: readonly string[] = [
  "human-resources",
  "consulting-advisory",
];

const generic = new Set(GENERIC_SPECIALISM_SLUGS);

export function isGenericSpecialism(slug: string): boolean {
  return generic.has(slug);
}

/** Same order, with the generic specialisms moved to the end. */
export function genericLast<T extends { slug: string }>(items: readonly T[]): T[] {
  return [
    ...items.filter((item) => !generic.has(item.slug)),
    ...items.filter((item) => generic.has(item.slug)),
  ];
}

/** The list without the generic specialisms. */
export function withoutGeneric<T extends { slug: string }>(items: readonly T[]): T[] {
  return items.filter((item) => !generic.has(item.slug));
}

/**
 * The specialisms to show as an agency's tags: its real ones, or the
 * generic ones only when it has nothing else.
 */
export function displaySpecialisms<T extends { slug: string }>(items: readonly T[]): T[] {
  const specific = withoutGeneric(items);
  return specific.length > 0 ? specific : [...items];
}

/**
 * Wording for the specialisms whose name does not read naturally in a
 * sentence. `label` is the phrase used mid-sentence ("IT", "executive
 * search"); `agencies` replaces the default "<label> recruitment agencies".
 */
const WORDING: Record<string, { label?: string; agencies?: string }> = {
  "executive-search": { agencies: "executive search firms" },
  "human-resources": { label: "HR" },
  "information-technology": { label: "IT" },
  "life-sciences-pharmaceuticals": { label: "life sciences and pharmaceutical" },
  "non-profit-charity": { label: "non-profit and charity" },
  "retail-consumer-goods": { label: "retail and consumer goods" },
  telecommunications: { label: "telecoms" },
};

/** Words that keep their capitals when a name is put into a sentence. */
const KEEP_CAPITALS = new Set(["AI", "IT", "HR", "Web3"]);

/**
 * A specialism's name as it reads in the middle of a sentence:
 * "Marketing & Communications" becomes "marketing and communications",
 * "AI & Machine Learning" becomes "AI and machine learning".
 */
export function specialismLabel(specialism: { name: string; slug: string }): string {
  const custom = WORDING[specialism.slug]?.label;
  if (custom) return custom;
  return specialism.name
    .replace(/\s*&\s*/g, " and ")
    .split(" ")
    .map((word) => {
      const bare = word.replace(/[^\p{L}\p{N}]/gu, "");
      return KEEP_CAPITALS.has(bare) ? word : word.toLowerCase();
    })
    .join(" ");
}

/** Capital first letter, rest untouched ("IT" stays "IT"). */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The kind of agency, mid-sentence: "IT recruitment agencies",
 * "executive search firms", "legal recruitment agencies".
 */
export function specialismAgenciesPhrase(specialism: { name: string; slug: string }): string {
  return (
    WORDING[specialism.slug]?.agencies ??
    `${specialismLabel(specialism)} recruitment agencies`
  );
}

/** Heading for a specialism worldwide: "IT recruitment agencies". */
export function specialismHeading(specialism: { name: string; slug: string }): string {
  return sentenceCase(specialismAgenciesPhrase(specialism));
}

/**
 * Heading for a specialism in a place: "IT recruitment agencies in Madrid",
 * "Executive search firms in London".
 */
export function specialismInPlaceHeading(
  specialism: { name: string; slug: string },
  place: string,
): string {
  return `${specialismHeading(specialism)} in ${place}`;
}

/** Joins words as a sentence list: "a", "a and b", "a, b and c". */
export function sentenceList(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
