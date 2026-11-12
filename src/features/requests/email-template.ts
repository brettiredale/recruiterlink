/**
 * One branded layout for every email the site sends.
 *
 * Built for inboxes, not browsers: tables for layout, inline styles, system
 * fonts and no images, because Outlook and Gmail strip most modern CSS and
 * image-heavy mail is more likely to be filtered. Every email also gets a
 * plain-text version. All values are escaped: nothing a visitor types can
 * become markup.
 */

import { siteName, siteUrl } from "../../lib/site.ts";

const NAVY = "#21174B";
const PINK = "#FF3EB5";
const LAVENDER = "#EAEBFB";
const PALE = "#F6F7FE";
const MUTED = "#4B436D";
const LINE = "#D5D6F2";
const FONT = "Arial, Helvetica, sans-serif";

export type EmailRow = { label: string; value: string; href?: string };

export type EmailContent = {
  /** Short summary shown next to the subject in the inbox list. */
  preheader: string;
  /** Small capital label above the heading. */
  eyebrow?: string;
  heading: string;
  /** Opening paragraphs. */
  paragraphs?: string[];
  /** Label and value pairs, shown as a details table. */
  rows?: EmailRow[];
  /** A longer block of text the sender wrote, kept with its line breaks. */
  quote?: { label: string; text: string };
  button?: { label: string; href: string };
  /** Small print under the content. */
  footnote?: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only ordinary web and mail addresses may become links. */
function safeHref(href: string): string | null {
  return /^(https?:\/\/|mailto:)[^\s"'<>]+$/i.test(href) ? href : null;
}

function rowHtml(row: EmailRow): string {
  const href = row.href ? safeHref(row.href) : null;
  const value = href
    ? `<a href="${escapeHtml(href)}" style="color:${NAVY};text-decoration:underline;">${escapeHtml(row.value)}</a>`
    : escapeHtml(row.value);
  return `<tr>
<td valign="top" style="padding:10px 16px 10px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};white-space:nowrap;">${escapeHtml(row.label)}</td>
<td valign="top" style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:15px;line-height:22px;color:${NAVY};word-break:break-word;">${value}</td>
</tr>`;
}

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const paragraphs = content.paragraphs ?? [];
  const rows = content.rows ?? [];
  const button = content.button && safeHref(content.button.href) ? content.button : undefined;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${LAVENDER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${LAVENDER};font-size:1px;line-height:1px;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${LAVENDER};">
<tr>
<td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr>
<td style="background-color:${NAVY};border-radius:16px 16px 0 0;padding:26px 32px;font-family:${FONT};font-size:26px;line-height:30px;font-weight:bold;letter-spacing:-0.5px;color:#FFFFFF;">recruiter<span style="color:${PINK};">link</span></td>
</tr>
<tr>
<td style="background-color:#FFFFFF;padding:36px 32px 8px;">
${content.eyebrow ? `<p style="margin:0 0 10px;font-family:${FONT};font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">${escapeHtml(content.eyebrow)}</p>` : ""}
<h1 style="margin:0 0 18px;font-family:${FONT};font-size:26px;line-height:32px;font-weight:bold;color:${NAVY};">${escapeHtml(content.heading)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:25px;color:${MUTED};">${escapeHtml(p)}</p>`).join("\n")}
</td>
</tr>
${
  rows.length
    ? `<tr>
<td style="background-color:#FFFFFF;padding:4px 32px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${LINE};">
${rows.map(rowHtml).join("\n")}
</table>
</td>
</tr>`
    : ""
}
${
  content.quote
    ? `<tr>
<td style="background-color:#FFFFFF;padding:20px 32px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="background-color:${PALE};border-radius:12px;padding:18px 20px;">
<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">${escapeHtml(content.quote.label)}</p>
<p style="margin:0;font-family:${FONT};font-size:15px;line-height:24px;color:${NAVY};white-space:pre-line;word-break:break-word;">${escapeHtml(content.quote.text)}</p>
</td>
</tr>
</table>
</td>
</tr>`
    : ""
}
${
  button
    ? `<tr>
<td style="background-color:#FFFFFF;padding:24px 32px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td bgcolor="${PINK}" style="background-color:${PINK};border-radius:10px;">
<a href="${escapeHtml(button.href)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:bold;color:${NAVY};text-decoration:none;">${escapeHtml(button.label)}</a>
</td>
</tr>
</table>
</td>
</tr>`
    : ""
}
<tr>
<td style="background-color:#FFFFFF;border-radius:0 0 16px 16px;padding:20px 32px 34px;">
${content.footnote ? `<p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(content.footnote)}</p>` : ""}
</td>
</tr>
<tr>
<td align="center" style="padding:22px 16px 0;font-family:${FONT};font-size:12px;line-height:19px;color:${MUTED};">
${escapeHtml(siteName)}, the global directory of recruitment agencies<br>
<a href="${escapeHtml(siteUrl)}" style="color:${MUTED};text-decoration:underline;">recruiterlink.com</a>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

  const lines: string[] = [content.heading, ""];
  for (const p of paragraphs) lines.push(p, "");
  for (const row of rows) lines.push(`${row.label}: ${row.value}`);
  if (rows.length) lines.push("");
  if (content.quote) lines.push(`${content.quote.label}:`, content.quote.text, "");
  if (button) lines.push(`${button.label}: ${button.href}`, "");
  if (content.footnote) lines.push(content.footnote, "");
  lines.push(`${siteName}, the global directory of recruitment agencies`, siteUrl);

  return { html, text: lines.join("\n") };
}
