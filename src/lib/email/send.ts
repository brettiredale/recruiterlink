/**
 * Sends one email through Resend. Every email the site sends goes through
 * here, from `notifications@recruiterlink.com` (a domain verified in Resend).
 *
 * It never throws: a failed email is logged and reported as `false`, so the
 * caller decides whether that matters.
 */

const SENDER = "RecruiterLink <notifications@recruiterlink.com>";

export type OutgoingEmail = {
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail(message: OutgoingEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("No email sent: RESEND_API_KEY is not set.");
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: SENDER,
        to: message.to,
        reply_to: message.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(8000),
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
