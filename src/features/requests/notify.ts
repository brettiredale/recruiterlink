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

const SENDER = "RecruiterLink <notifications@recruiterlink.com>";

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

import { renderEmail, type EmailRow } from "./email-template.ts";

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

async function send(apiKey: string, message: Record<string, unknown>): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: SENDER, ...message }),
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Email failed:", response.status, (await response.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email failed:", error);
    return false;
  }
}

/**
 * Sends the owner's notification and the sender's confirmation through
 * Resend. Resolves to whether the owner's notification was sent.
 */
export async function sendRequestNotification(request: RequestNotification): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("Request stored, but no email sent: RESEND_API_KEY is not set.");
    return false;
  }
  const notification = buildNotificationEmail(request);
  const confirmation = buildConfirmationEmail(request);
  const [notified] = await Promise.all([
    send(apiKey, {
      to: [...NOTIFICATION_RECIPIENTS],
      reply_to: oneLine(request.email),
      subject: notification.subject,
      text: notification.text,
      html: notification.html,
    }),
    send(apiKey, {
      to: [oneLine(request.email)],
      reply_to: NOTIFICATION_RECIPIENTS[0],
      subject: confirmation.subject,
      text: confirmation.text,
      html: confirmation.html,
    }),
  ]);
  return notified;
}
