/**
 * Checks for what a Premium agency adds to its page. Pure functions, shared
 * by the server actions and the tests; the database checks the same rules.
 */

export const PREMIUM_LIMITS = {
  photos: 8,
  team: 12,
  testimonials: 6,
  photoBytes: 2 * 1024 * 1024,
  caption: 140,
  name: { min: 2, max: 80 },
  jobTitle: 80,
  quote: { min: 20, max: 600 },
  person: { min: 2, max: 80 },
  detail: 120,
} as const;

export type Video = { provider: "youtube" | "vimeo"; id: string; url: string };

/**
 * Turns any usual YouTube or Vimeo address into its one stored form
 * (`https://www.youtube.com/watch?v=ID` or `https://vimeo.com/ID`).
 * Returns null for anything else.
 */
export function parseVideoUrl(input: string): Video | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  const parts = url.pathname.split("/").filter(Boolean);

  let youtube: string | null = null;
  if (host === "youtu.be") youtube = parts[0] ?? null;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") youtube = url.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) youtube = parts[1] ?? null;
  }
  if (youtube !== null) {
    return /^[A-Za-z0-9_-]{11}$/.test(youtube)
      ? { provider: "youtube", id: youtube, url: `https://www.youtube.com/watch?v=${youtube}` }
      : null;
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = (host === "player.vimeo.com" ? parts[1] : parts.find((part) => /^\d+$/.test(part))) ?? "";
    return /^\d{6,12}$/.test(id) ? { provider: "vimeo", id, url: `https://vimeo.com/${id}` } : null;
  }
  return null;
}

/** The address a stored video is played from (no cookies for YouTube). */
export function videoEmbedUrl(video: Video): string {
  return video.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${video.id}?rel=0`
    : `https://player.vimeo.com/video/${video.id}?dnt=1`;
}

/** A LinkedIn profile address in its stored form, or null. */
export function parseLinkedInUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!/^(([a-z]{2,3})\.)?linkedin\.com$/.test(host)) return null;
  const match = /^\/in\/([A-Za-z0-9_%-]{2,100})\/?$/.exec(url.pathname);
  return match ? `https://www.linkedin.com/in/${match[1]}` : null;
}

/** Trimmed text with runs of spaces closed up. */
export function cleanText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** Text with paragraphs kept (for testimonials). */
export function cleanParagraphs(value: FormDataEntryValue | null): string {
  return typeof value === "string"
    ? value
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : "";
}
