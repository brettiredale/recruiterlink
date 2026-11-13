import { Marked, type Tokens } from "marked";

/**
 * Markdown for blog articles, the same renderer as the Brainy job boards.
 *
 * A post body is one markdown string. It turns into HTML that is safe to put
 * on the page: raw HTML in the text is shown as text, links and images may
 * only use https, http, mailto or addresses on this site, and video becomes
 * an embedded player only for YouTube and Vimeo, built from the video's id
 * (never from the address as typed). Used on the server for the public page
 * and in the browser for the admin editor's live preview.
 */

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Allowed link targets. Site addresses ("/spain"), but not "//host". */
export function safeHref(href: string): string | null {
  const h = href.trim();
  return /^(https?:|mailto:|\/(?!\/)|#)/i.test(h) ? h : null;
}

const isInternal = (href: string) => href.startsWith("/") || href.startsWith("#");

/** A YouTube or Vimeo address as an embed address; anything else is null. */
export function videoEmbedUrl(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      u.searchParams.get("v") ??
      u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ??
      null;
  }
  if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const vid = u.pathname.match(/(?:^|\/)(\d{6,12})(?:\/|$)/)?.[1];
    if (vid) return `https://player.vimeo.com/video/${vid}`;
  }
  return null;
}

function videoHtml(embed: string, title: string) {
  return `<div class="blog-video"><iframe src="${esc(embed)}" title="${esc(title || "Video")}" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>\n`;
}

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return esc(text);
    },
    // The page owns the H1, so # becomes h2; levels are kept to h2 to h4.
    heading({ tokens, depth }: Tokens.Heading) {
      const level = Math.min(Math.max(depth, 2), 4);
      return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
    // A paragraph that is only a YouTube or Vimeo link (or ![](video))
    // becomes the video itself.
    paragraph({ tokens }: Tokens.Paragraph) {
      const only = tokens.filter((t) => !(t.type === "text" && !t.raw.trim()));
      if (only.length === 1 && (only[0].type === "link" || only[0].type === "image")) {
        const t = only[0] as Tokens.Link | Tokens.Image;
        const embed = videoEmbedUrl(t.href);
        if (embed) return videoHtml(embed, t.text === t.href ? "Video" : t.text);
      }
      return `<p>${this.parser.parseInline(tokens)}</p>\n`;
    },
    link({ href, title, tokens }: Tokens.Link) {
      const inner = this.parser.parseInline(tokens);
      const url = safeHref(href);
      if (!url) return inner;
      const t = title ? ` title="${esc(title)}"` : "";
      return isInternal(url)
        ? `<a href="${esc(url)}"${t}>${inner}</a>`
        : `<a href="${esc(url)}"${t} target="_blank" rel="noopener">${inner}</a>`;
    },
    // ![caption](youtube-or-vimeo) embeds the video; anything else is an
    // image. A title ("…") becomes a visible caption.
    image({ href, title, text }: Tokens.Image) {
      const embed = videoEmbedUrl(href);
      if (embed) return videoHtml(embed, text);
      const url = safeHref(href);
      if (!url) return esc(text);
      const img = `<img src="${esc(url)}" alt="${esc(text)}" loading="lazy" decoding="async" />`;
      return title ? `<figure>${img}<figcaption>${esc(title)}</figcaption></figure>` : img;
    },
  },
});

export function renderMarkdown(md: string): string {
  // Wide tables scroll sideways on phones instead of widening the page.
  // Raw HTML is escaped above, so these tags only come from markdown tables.
  return marked
    .parse(md, { async: false })
    .replace(/<table>/g, '<div class="blog-table"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

/** Rough plain text of a markdown string (word counts, summaries). */
export function markdownText(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_`~|-]+/g, " ");
}

export function markdownWords(md: string): number {
  return markdownText(md).split(/\s+/).filter(Boolean).length;
}

/** Reading time in minutes at 200 words a minute, at least 1. */
export function readingMinutes(md: string): number {
  return Math.max(1, Math.round(markdownWords(md) / 200));
}

/** The first image in the article, for posts without a cover. */
export function firstImage(md: string): string | null {
  for (const match of md.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
    const url = safeHref(match[1]);
    if (url && !videoEmbedUrl(url) && /^https:/i.test(url)) return url;
  }
  return null;
}
