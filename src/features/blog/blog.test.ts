import assert from "node:assert/strict";
import { test } from "node:test";
import { isPrivateIp, sniffImage } from "./image-check.ts";
import { blockPadding, isBlockPaste } from "./paste-markdown.ts";
import { firstImage, markdownWords, readingMinutes, renderMarkdown, safeHref, videoEmbedUrl } from "./markdown.ts";
import {
  agentBodyProblem,
  cleanHttpsUrl,
  cleanTags,
  formatLongDate,
  formatShortDate,
  slugify,
  validatePost,
  type PostInput,
} from "./rules.ts";

const base: PostInput = {
  title: "How to choose a recruitment agency",
  slug: "",
  excerpt: "A short guide to picking the right recruitment agency for your next hire.",
  bodyMarkdown: "## Start here\n\nSome text.",
  coverImageUrl: "",
  coverImageAlt: "",
  author: "",
  tags: [],
  status: "published",
  publishedAt: "2026-11-13T12:00:00.000Z",
};

test("raw HTML is shown as text, never run", () => {
  const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\nHi <b onclick="x">there</b>');
  assert.doesNotMatch(html, /<script|<img src=x|<b /i);
  assert.match(html, /&lt;script&gt;/);
});

test("only safe link and image addresses are kept", () => {
  const html = renderMarkdown("[a](javascript:alert(1)) [b](//evil.com) [c](/spain/madrid) [d](https://example.com)\n\n![x](data:image/png;base64,AAAA)");
  assert.doesNotMatch(html, /javascript:|href="\/\/evil|data:image/);
  assert.match(html, /<a href="\/spain\/madrid">c<\/a>/);
  assert.match(html, /<a href="https:\/\/example.com" target="_blank" rel="noopener">d<\/a>/);
  assert.equal(safeHref("  /about "), "/about");
  assert.equal(safeHref("vbscript:x"), null);
});

test("headings start at h2, because the page has the h1", () => {
  assert.match(renderMarkdown("# Big"), /<h2>Big<\/h2>/);
  assert.match(renderMarkdown("##### Small"), /<h4>Small<\/h4>/);
});

test("a YouTube or Vimeo link on its own line becomes a player", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "[Our video](https://youtu.be/dQw4w9WgXcQ)",
  ]) {
    assert.match(renderMarkdown(url), /<iframe src="https:\/\/www.youtube-nocookie.com\/embed\/dQw4w9WgXcQ"/, url);
  }
  assert.match(renderMarkdown("https://vimeo.com/76979871"), /player.vimeo.com\/video\/76979871/);
  assert.equal(videoEmbedUrl("https://www.youtube.com/watch?v=bad\"id"), null);
  assert.equal(videoEmbedUrl("https://example.com/watch?v=dQw4w9WgXcQ"), null);
  // A link inside a sentence stays a link.
  assert.doesNotMatch(renderMarkdown("See https://youtu.be/dQw4w9WgXcQ for more"), /iframe/);
});

test("pictures get alt text, lazy loading and an optional caption", () => {
  const plain = renderMarkdown("![A busy office](https://example.com/a.jpg)");
  assert.match(plain, /<img src="https:\/\/example.com\/a.jpg" alt="A busy office" loading="lazy"/);
  const captioned = renderMarkdown('![Alt](https://example.com/a.jpg "Our team in 2026")');
  assert.match(captioned, /<figure><img [^>]+><figcaption>Our team in 2026<\/figcaption><\/figure>/);
  assert.equal(firstImage("Text\n\n![x](https://youtu.be/dQw4w9WgXcQ)\n\n![y](https://cdn.example.com/b.png)"), "https://cdn.example.com/b.png");
});

test("word counts and reading time", () => {
  assert.equal(markdownWords("## Hello world\n\n- one **two** [three](https://x.com)"), 5);
  assert.equal(readingMinutes(""), 1);
  assert.equal(readingMinutes("word ".repeat(1000)), 5);
});

test("slugs are lowercase words joined by hyphens, without accents", () => {
  assert.equal(slugify("  Recruiting in São Paulo & Zürich: 2026 guide! "), "recruiting-in-sao-paulo-and-zurich-2026-guide");
  assert.equal(slugify("---"), "");
  assert.ok(slugify("a".repeat(200)).length <= 96);
  assert.doesNotMatch(slugify(`${"a".repeat(95)} b`), /-$/);
});

test("tags are trimmed, de-duplicated and limited", () => {
  assert.deepEqual(cleanTags([" Hiring ", "hiring", "", "IT"]), ["Hiring", "IT"]);
  assert.deepEqual(cleanTags("Hiring, Careers,  "), ["Hiring", "Careers"]);
  assert.equal(cleanTags(Array.from({ length: 30 }, (_, i) => `t${i}`)).length, 20);
});

test("cover addresses must be https", () => {
  assert.equal(cleanHttpsUrl("https://example.com/a.jpg"), "https://example.com/a.jpg");
  assert.equal(cleanHttpsUrl("http://example.com/a.jpg"), null);
  assert.equal(cleanHttpsUrl("https://user:pw@example.com/a.jpg"), null);
  assert.equal(cleanHttpsUrl("not a url"), null);
});

test("a published post needs a title, summary and article; a draft may be unfinished", () => {
  const ok = validatePost(base);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.post.slug, "how-to-choose-a-recruitment-agency");

  const empty = validatePost({ ...base, excerpt: "", bodyMarkdown: "" });
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.ok(empty.errors.excerpt);
    assert.ok(empty.errors.bodyMarkdown);
  }

  assert.equal(validatePost({ ...base, status: "draft", excerpt: "", bodyMarkdown: "" }).ok, true);
  const noTitle = validatePost({ ...base, status: "draft", title: "  " });
  assert.equal(noTitle.ok, false);
});

test("bad values are refused with a message for the field", () => {
  const cases: [Partial<PostInput>, keyof PostInput][] = [
    [{ excerpt: "x".repeat(161) }, "excerpt"],
    [{ title: "x".repeat(121) }, "title"],
    [{ slug: "page" }, "slug"],
    [{ coverImageUrl: "http://example.com/a.jpg" }, "coverImageUrl"],
    [{ publishedAt: "not a date" }, "publishedAt"],
  ];
  for (const [change, field] of cases) {
    const result = validatePost({ ...base, ...change });
    assert.equal(result.ok, false, field);
    if (!result.ok) assert.ok(result.errors[field], field);
  }
});

test("the agent's articles must be a real article", () => {
  assert.ok(agentBodyProblem("Too short."));
  assert.ok(agentBodyProblem("word ".repeat(300))); // one wall of text
  assert.equal(agentBodyProblem(["## A", "word ".repeat(80), "word ".repeat(80)].join("\n\n")), null);
});

test("dates read the same everywhere", () => {
  assert.equal(formatLongDate("2026-11-13T23:30:00Z"), "13 November 2026");
  assert.equal(formatShortDate("2026-01-02T00:00:00Z"), "2 Jan 2026");
});

test("images are recognised by their content, and SVG is refused", () => {
  assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext, "png");
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext, "jpg");
  assert.equal(sniffImage(new TextEncoder().encode("GIF89a......"))?.ext, "gif");
  assert.equal(sniffImage(new TextEncoder().encode("RIFF....WEBPVP8 "))?.ext, "webp");
  assert.equal(sniffImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'>")), null);
});

test("private network addresses are refused for image downloads", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "::", "fd00::1",
    "::ffff:10.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "0:0:0:0:0:ffff:7f00:0001", "::7f00:1", "64:ff9b::a00:1",
    "2002:a00:1::", "fe80::1", "[::ffff:127.0.0.1]", "not-an-ip", "999.1.1.1"]) {
    assert.equal(isPrivateIp(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "104.18.2.3", "2606:4700::1111", "2a00:1450:4009:81f::200e"]) {
    assert.equal(isPrivateIp(ip), false, ip);
  }
  // The address a browser-style parser produces for https://[::ffff:127.0.0.1]/
  assert.equal(isPrivateIp(new URL("https://[::ffff:127.0.0.1]/").hostname), true);
});

test("tables are wrapped so they can scroll on phones", () => {
  const html = renderMarkdown("| A | B |\n|---|---|\n| 1 | 2 |");
  assert.match(html, /^<div class="blog-table"><table>[\s\S]*<\/table><\/div>/);
  assert.doesNotMatch(renderMarkdown("<table><tr><td>x</td></tr></table>"), /<table>/);
});

test("pasted blocks get one blank line from the text around them", () => {
  assert.deepEqual(blockPadding("", ""), ["", ""]);
  assert.deepEqual(blockPadding("Before", "After"), ["\n\n", "\n\n"]);
  assert.deepEqual(blockPadding("Before\n", "\nAfter"), ["\n", "\n"]);
  assert.deepEqual(blockPadding("Before\n\n", "\n\nAfter"), ["", ""]);
  assert.deepEqual(blockPadding("Before\n\n", "After"), ["", "\n\n"]);
  assert.deepEqual(blockPadding("Before", ""), ["\n\n", ""]);
  assert.deepEqual(blockPadding("", "After"), ["", "\n\n"]);
});

test("only whole paragraphs, headings and lists count as a block paste", () => {
  assert.equal(isBlockPaste("<p>One</p>", "One"), true);
  assert.equal(isBlockPaste('<b style="font-weight:normal"><h2>A</h2></b>', "## A"), true);
  assert.equal(isBlockPaste("<ul><li>One</li></ul>", "- One"), true);
  assert.equal(isBlockPaste("<div>A</div><div>B</div>", "A\n\nB"), true);
  assert.equal(isBlockPaste("<span>a few</span> <b>words</b>", "a few **words**"), false);
  assert.equal(isBlockPaste('<a href="https://example.com">link</a>', "[link](https://example.com)"), false);
});
