/** Small pure helpers for showing database text safely and tidily. */

/** Removes HTML tags and tidies spaces, keeping the words. */
export function stripTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t ]+/g, " ")
    .trim();
}

/**
 * Splits an agency's description into paragraphs. Blank lines separate
 * paragraphs; single line breaks inside one become spaces.
 */
export function toParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => stripTags(paragraph.replace(/\s*\n\s*/g, " ")))
    .filter(Boolean);
}

/**
 * One line of at most `max` characters, cut at a sentence end where that
 * keeps at least half the length, otherwise at a word with an ellipsis.
 * For meta descriptions and card summaries.
 */
export function summarise(text: string | null | undefined, max = 160): string {
  const line = stripTags((text ?? "").replace(/\s+/g, " "));
  if (line.length <= max) return line;
  const cut = line.slice(0, max);
  const sentenceEnd = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
  );
  if (sentenceEnd >= max / 2) return cut.slice(0, sentenceEnd + 1);
  const wordEnd = cut.slice(0, max - 1).lastIndexOf(" ");
  return `${cut.slice(0, wordEnd > 0 ? wordEnd : max - 1).replace(/[,;:.\s]+$/, "")}…`;
}

/** The first sentence of a text, or the summarised start when it is long. */
export function firstSentence(text: string | null | undefined, max = 180): string {
  const line = stripTags((text ?? "").replace(/\s+/g, " "));
  const match = /^.+?[.!?](?=\s|$)/.exec(line);
  const sentence = match ? match[0] : line;
  return sentence.length <= max ? sentence : summarise(sentence, max);
}

/** "1 agency", "2 agencies", "1,234 agencies". */
export function countLabel(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString("en")} ${count === 1 ? singular : plural}`;
}

export function agencyCountLabel(count: number): string {
  return countLabel(count, "agency", "agencies");
}

export function recruitmentAgencyCountLabel(count: number): string {
  return countLabel(count, "recruitment agency", "recruitment agencies");
}
