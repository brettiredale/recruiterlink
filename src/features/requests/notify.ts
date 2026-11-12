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

/** Builds the plain-text email. Plain text on purpose: nothing a visitor types can become markup. */
export function buildNotificationEmail(request: RequestNotification): {
  subject: string;
  text: string;
} {
  const label = KIND_LABELS[request.kind] ?? "Website request";
  const who = oneLine(request.agencyName) || oneLine(request.name);
  const lines = [
    `${label} from the RecruiterLink website`,
    "",
    `Name: ${oneLine(request.name)}`,
    `Email: ${oneLine(request.email)}`,
  ];
  if (oneLine(request.agencyName)) lines.push(`Agency: ${oneLine(request.agencyName)}`);
  if (oneLine(request.website)) lines.push(`Website: ${oneLine(request.website)}`);
  if (oneLine(request.sourcePath)) lines.push(`Sent from: ${oneLine(request.sourcePath)}`);
  const message = (request.message ?? "").trim();
  if (message) lines.push("", "Message:", message);
  lines.push("", "Reply to this email to answer the sender directly.");
  return { subject: `${label}: ${who}`.slice(0, 180), text: lines.join("\n") };
}

/** Sends the notification through Resend. Resolves to whether it was sent. */
export async function sendRequestNotification(request: RequestNotification): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("Request stored, but no notification sent: RESEND_API_KEY is not set.");
    return false;
  }
  const { subject, text } = buildNotificationEmail(request);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: SENDER,
        to: [...NOTIFICATION_RECIPIENTS],
        reply_to: oneLine(request.email),
        subject,
        text,
      }),
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Request notification failed:", response.status, (await response.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Request notification failed:", error);
    return false;
  }
}
