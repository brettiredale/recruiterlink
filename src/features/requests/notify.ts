/**
 * Emails the site owner when someone sends a listing or contact request.
 *
 * The request is always stored in the database first; this is a courtesy
 * notification on top. It must never make a visitor's request fail, so every
 * problem here is logged and swallowed.
 */

/** Where notifications go (the owner's instruction, 12 Nov 2026). */
export const NOTIFICATION_RECIPIENTS = [
  "brett@recruiterlink.com",
  "brettiredale@gmail.com",
] as const;

export type RequestNotification = {
  kind: string;
  name: string;
  email: string;
  agencyName?: string | null;
  website?: string | null;
  message?: string | null;
  sourcePath?: string | null;
};

const KIND_LABELS: Record<string, string> = {
  claim: "Claim a listing",
  premium: "Premium interest",
  new_listing: "New agency listing",
  contact: "Contact request",
};

/** One line only: a value pasted into a header-like line must not add lines. */
function oneLine(value: string | null | undefined): string {
  return (value ?? "").replace(/[\r\n]+/g, " ").trim();
}

import { renderEmail, type EmailRow } from "../../lib/email/template.ts";
import { sendEmail } from "../../lib/email/send.ts";

function websiteHref(website: string): string | undefined {
  const value = oneLine(website);
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/** The email the owner receives for each request. */
export function buildNotificationEmail(request: RequestNotification): {
  subject: string;
  text: string;
  html: string;
} {
  const label = KIND_LABELS[request.kind] ?? "Website request";
  const who = oneLine(request.agencyName) || oneLine(request.name);
  const rows: EmailRow[] = [
    { label: "Name", value: oneLine(request.name) },
    { label: "Email", value: oneLine(request.email), href: `mailto:${oneLine(request.email)}` },
  ];
  if (oneLine(request.agencyName)) rows.push({ label: "Agency", value: oneLine(request.agencyName) });
  if (oneLine(request.website)) {
    rows.push({ label: "Website", value: oneLine(request.website), href: websiteHref(request.website ?? "") });
  }
  if (oneLine(request.sourcePath)) rows.push({ label: "Sent from", value: oneLine(request.sourcePath) });
  const message = (request.message ?? "").trim();
  const { html, text } = renderEmail({
    preheader: `${label} from ${who}`,
    eyebrow: "New request",
    heading: `${label}: ${who}`,
    paragraphs: ["Someone has sent a request through the RecruiterLink website."],
    rows,
    quote: message ? { label: "Message", text: message } : undefined,
    footnote: "Reply to this email to answer the sender directly.",
  });
  return { subject: `${label}: ${who}`.slice(0, 180), text, html };
}

/** The confirmation the sender receives, so they know the request arrived. */
export function buildConfirmationEmail(request: RequestNotification): {
  subject: string;
  text: string;
  html: string;
} {
  const firstName = oneLine(request.name).split(" ")[0] || "there";
  const about =
    request.kind === "contact"
      ? "your message"
      : `your request about ${oneLine(request.agencyName) || "your agency"}`;
  const { html, text } = renderEmail({
    preheader: `We have received ${about}.`,
    eyebrow: "Request received",
    heading: `Thanks, ${firstName}. We have your request.`,
    paragraphs: [
      `This is to confirm that we have received ${about}. A member of the RecruiterLink team will reply to you by email.`,
    ],
    button: { label: "Visit RecruiterLink", href: "https://recruiterlink.com/" },
    footnote: "You are receiving this because this address was entered in a form on recruiterlink.com. If that was not you, you can ignore this email.",
  });
  return { subject: "We have received your request", text, html };
}

/**
 * Sends the owner's notification and the sender's confirmation through
 * Resend. Resolves to whether the owner's notification was sent.
 */
export async function sendRequestNotification(request: RequestNotification): Promise<boolean> {
  const notification = buildNotificationEmail(request);
  const confirmation = buildConfirmationEmail(request);
  const [notified] = await Promise.all([
    sendEmail({
      to: [...NOTIFICATION_RECIPIENTS],
      replyTo: oneLine(request.email),
      ...notification,
    }),
    sendEmail({
      to: [oneLine(request.email)],
      replyTo: NOTIFICATION_RECIPIENTS[0],
      ...confirmation,
    }),
  ]);
  return notified;
}
