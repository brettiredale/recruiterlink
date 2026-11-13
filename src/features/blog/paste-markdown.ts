// Browser only: turns pasted rich text (Google Docs, Word, web pages) into
// markdown for the blog editor. Keeps headings, lists, quotes, links, bold,
// italics and images. Google Docs marks bold and italic with inline styles
// rather than <b>/<i>, so those styles are read too. Same as the Brainy job
// boards. The output is only editor text; the renderer makes it safe.

function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\s+/g, " ");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName;
  if (tag === "BR") return "\n";
  if (tag === "IMG") {
    const src = el.getAttribute("src") ?? "";
    return /^https?:/i.test(src) ? `![${el.getAttribute("alt") ?? ""}](${src})` : "";
  }
  let text = Array.from(el.childNodes).map(inline).join("");
  if (!text.trim()) return text;

  const style = el.getAttribute("style") ?? "";
  const weight = style.match(/font-weight:\s*(\d+|bold|normal)/i)?.[1]?.toLowerCase();
  const bold = tag === "B" || tag === "STRONG" || weight === "bold" || Number(weight) >= 600;
  const italic = tag === "I" || tag === "EM" || /font-style:\s*italic/i.test(style);
  // Google Docs wraps the whole paste in <b style="font-weight:normal">.
  const notBold = tag === "B" && weight !== undefined && !bold;

  const wrap = (s: string, m: string) => {
    const lead = s.match(/^\s*/)![0];
    const trail = s.match(/\s*$/)![0];
    return `${lead}${m}${s.trim()}${m}${trail}`;
  };
  if (bold && !notBold) text = wrap(text, "**");
  if (italic) text = wrap(text, "*");
  if (tag === "A") {
    const href = el.getAttribute("href") ?? "";
    if (/^(https?:|mailto:|\/)/i.test(href)) text = `[${text.trim()}](${href})`;
  }
  return text;
}

function list(el: Element, ordered: boolean, depth: number): string {
  const items: string[] = [];
  let n = 1;
  for (const li of Array.from(el.children)) {
    if (li.tagName !== "LI") continue;
    const own: string[] = [];
    const nested: string[] = [];
    for (const c of Array.from(li.childNodes)) {
      if (c instanceof Element && (c.tagName === "UL" || c.tagName === "OL")) {
        nested.push(list(c, c.tagName === "OL", depth + 1));
      } else own.push(inline(c));
    }
    const pad = "   ".repeat(depth);
    items.push(`${pad}${ordered ? `${n++}.` : "-"} ${own.join("").trim()}`);
    items.push(...nested.filter(Boolean));
  }
  return items.join("\n");
}

function block(el: Element): string[] {
  const tag = el.tagName;
  const h = tag.match(/^H([1-6])$/);
  if (h) {
    const level = Math.min(Math.max(Number(h[1]), 2), 3);
    const text = inline(el).replace(/\*\*/g, "").trim();
    return text ? [`${"#".repeat(level)} ${text}`] : [];
  }
  if (tag === "UL" || tag === "OL") return [list(el, tag === "OL", 0)];
  if (tag === "BLOCKQUOTE") {
    const text = inline(el).trim();
    return text ? [text.split("\n").map((l) => `> ${l}`).join("\n")] : [];
  }
  if (tag === "P" || tag === "PRE" || tag === "LI") {
    const text = inline(el).trim();
    return text ? [text] : [];
  }
  if (tag === "TABLE") {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    return text ? [text] : [];
  }
  // Containers (div, section, Google Docs' outer <b>, which holds the whole
  // document): recurse when they hold blocks anywhere inside, else treat
  // their text as a paragraph.
  if (el.querySelector("p,h1,h2,h3,h4,h5,h6,ul,ol,blockquote,div,section,article,table,pre")) {
    const out: string[] = [];
    for (const n of Array.from(el.childNodes)) {
      if (n instanceof Element) out.push(...block(n));
      else if ((n.textContent ?? "").trim()) out.push(inline(n).trim());
    }
    return out;
  }
  const text = inline(el).trim();
  return text ? [text] : [];
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("style,script,meta,title").forEach((n) => n.remove());
  return block(doc.body)
    .map((s) => s.replace(/[ \t]+\n/g, "\n").replace(/\*\*\s*\*\*/g, ""))
    .filter((s) => s.trim())
    .join("\n\n");
}

// True when the clipboard HTML carries real document structure worth keeping
// (Docs, Word, web pages), as opposed to a code editor's syntax-coloured spans.
export function isRichPaste(html: string): boolean {
  return /<(h[1-6]|p|ul|ol|li|blockquote|a|b|strong|img)\b/i.test(html);
}

// True when the paste holds whole paragraphs, headings, lists and the like,
// so it should sit on its own lines. A few words copied from inside a
// sentence carry no block tags and stay inline at the cursor.
export function isBlockPaste(html: string, markdown: string): boolean {
  return /<(p|h[1-6]|ul|ol|li|blockquote|pre|table)\b/i.test(html) || markdown.includes("\n\n");
}

// The line breaks to add before and after a block pasted between `before`
// and `after`, so it is separated from the text around it by one blank
// line, without adding blank lines where there already are some.
export function blockPadding(before: string, after: string): [string, string] {
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after === "" || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  return [lead, trail];
}
