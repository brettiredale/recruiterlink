/**
 * The rules every blog post follows, whoever writes it (the admin editor,
 * the API or the MCP connector). Plain functions with no imports from the
 * framework, so they can be tested with Node's own test runner.
 *
 * The database checks the same limits again; these give friendly messages
 * first.
 */
import { markdownWords } from "./markdown.ts";

export const TITLE_MAX = 120;
export const EXCERPT_MAX = 160;
export const BODY_MAX = 100_000;
export const SLUG_MAX = 96;
export const AUTHOR_MAX = 80;
export const ALT_MAX = 200;
export const TAG_MAX = 40;
export const TAGS_MAX = 20;
export const URL_MAX = 2048;

/** Blog posts listed per page on /blog. */
export const POSTS_PER_PAGE = 24;

/** Words that can never be a post slug, because they are addresses under /blog. */
const RESERVED_SLUGS = new Set(["page", "feed", "rss", "tag", "tags", "author", "authors"]);

export type PostStatus = "draft" | "published";

/** Lowercase words joined by hyphens, without accents. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export function isReservedPostSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/** One line: control characters removed, spaces collapsed, trimmed. */
export function cleanLine(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

/** Markdown: line breaks kept, other control characters removed. */
export function cleanMarkdown(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/^\s*\n|\s+$/g, "");
}

/** Trimmed, blanks and repeats (ignoring capitals) removed, at most 20. */
export function cleanTags(input: unknown): string[] {
  const list = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const tag = cleanLine(raw).slice(0, TAG_MAX).trim();
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
    if (out.length >= TAGS_MAX) break;
  }
  return out;
}

/** An https address, or null when it is not one. */
export function cleanHttpsUrl(value: unknown): string | null {
  const text = cleanLine(value);
  if (!text || text.length > URL_MAX) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

/** A post as the editor, API and connector hand it over. */
export type PostInput = {
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl: string;
  coverImageAlt: string;
  author: string;
  tags: string[];
  status: PostStatus;
  /** ISO date and time. */
  publishedAt: string;
};

export type PostErrors = Partial<Record<keyof PostInput, string>>;

export type CleanPost = Omit<PostInput, "coverImageUrl"> & { coverImageUrl: string | null };

/**
 * Checks and tidies a post. Returns the clean post, or a message for each
 * field that needs changing. A draft may be unfinished; a published post
 * needs a title, a summary and an article.
 */
export function validatePost(input: PostInput): { ok: true; post: CleanPost } | { ok: false; errors: PostErrors } {
  const errors: PostErrors = {};
  const title = cleanLine(input.title);
  const excerpt = cleanLine(input.excerpt);
  const bodyMarkdown = cleanMarkdown(input.bodyMarkdown);
  const slug = slugify(input.slug || title);
  const author = cleanLine(input.author);
  const coverImageAlt = cleanLine(input.coverImageAlt);
  const coverText = cleanLine(input.coverImageUrl);
  const coverImageUrl = coverText ? cleanHttpsUrl(coverText) : null;
  const status: PostStatus = input.status === "published" ? "published" : "draft";
  const date = new Date(input.publishedAt);

  if (!title) errors.title = "Give the post a title.";
  else if (title.length > TITLE_MAX) errors.title = `Keep the title to ${TITLE_MAX} characters or fewer (it has ${title.length}).`;

  if (!slug) errors.slug = "The web address needs at least one letter or number.";
  else if (isReservedPostSlug(slug)) errors.slug = `"${slug}" is kept for the blog's own pages. Choose another web address.`;

  if (excerpt.length > EXCERPT_MAX) {
    errors.excerpt = `Keep the summary to ${EXCERPT_MAX} characters or fewer (it has ${excerpt.length}).`;
  } else if (status === "published" && !excerpt) {
    errors.excerpt = "Add a short summary. It shows on the blog page and in Google.";
  }

  if (bodyMarkdown.length > BODY_MAX) errors.bodyMarkdown = "The article is too long to save.";
  else if (status === "published" && markdownWords(bodyMarkdown) < 1) {
    errors.bodyMarkdown = "Write the article before publishing it.";
  }

  if (coverText && !coverImageUrl) errors.coverImageUrl = "The cover image address must start with https://.";
  if (author.length > AUTHOR_MAX) errors.author = `Keep the author to ${AUTHOR_MAX} characters or fewer.`;
  if (coverImageAlt.length > ALT_MAX) errors.coverImageAlt = `Keep the description to ${ALT_MAX} characters or fewer.`;
  if (Number.isNaN(date.getTime())) errors.publishedAt = "Choose a valid date.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    post: {
      title,
      slug,
      excerpt,
      bodyMarkdown,
      coverImageUrl,
      // A description only makes sense with a picture.
      coverImageAlt: coverImageUrl ? coverImageAlt : "",
      author,
      tags: cleanTags(input.tags),
      status,
      publishedAt: date.toISOString(),
    },
  };
}

/** Paragraph-like blocks in a markdown text. */
export function markdownSections(md: string): number {
  return md.split(/\n\s*\n/).filter((part) => part.trim()).length;
}

/**
 * The extra bar for articles written by the AI agent: at least 150 words in
 * several paragraphs, so a failed generation never goes live as one line.
 */
export function agentBodyProblem(md: string): string | null {
  if (markdownWords(md) < 150 || markdownSections(md) < 3) {
    return "The article is too short. Write at least 150 words in several paragraphs.";
  }
  return null;
}

/** "13 November 2026", the same for every visitor and time zone. */
export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "13 Nov 2026". */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
