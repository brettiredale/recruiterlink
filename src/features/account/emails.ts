/**
 * The emails the account pages send. All use the one branded layout in
 * `src/lib/email/template.ts`; all values are escaped there.
 */
import { renderEmail } from "../../lib/email/template.ts";

type Built = { subject: string; text: string; html: string };

/** The sign-in email: a code to type in, and a button that does the same. */
export function buildSignInEmail(input: { code: string; link: string }): Built {
  const { html, text } = renderEmail({
    preheader: `Your RecruiterLink sign-in code is ${input.code}.`,
    eyebrow: "Sign in",
    heading: "Your sign-in code",
    paragraphs: [
      "Enter this code on the RecruiterLink page you have open, or use the button below. Both work once and expire in one hour.",
    ],
    code: { label: "Sign-in code", value: input.code },
    button: { label: "Sign in to RecruiterLink", href: input.link },
    footnote:
      "If you did not ask to sign in, you can ignore this email: nobody can sign in without it. RecruiterLink will never ask you for this code by phone or email.",
  });
  return { subject: `${input.code} is your RecruiterLink sign-in code`, text, html };
}

/** Tells a listing's owners that a colleague has asked to help manage it. */
export function buildAccessRequestEmail(input: {
  agencyName: string;
  requesterEmail: string;
  accountUrl: string;
}): Built {
  const { html, text } = renderEmail({
    preheader: `${input.requesterEmail} has asked to help manage ${input.agencyName}.`,
    eyebrow: "Access request",
    heading: "A colleague has asked to manage your listing",
    paragraphs: [
      `${input.requesterEmail} has confirmed an email address at your agency and asked to help manage the RecruiterLink listing for ${input.agencyName}.`,
      "Nothing changes unless you approve it. Sign in to approve or decline.",
    ],
    button: { label: "Review the request", href: input.accountUrl },
    footnote: "You are receiving this because you manage this listing on RecruiterLink.",
  });
  return { subject: `Access request for ${input.agencyName}`.slice(0, 180), text, html };
}

/** Tells the people who run the site that a new listing is waiting. */
export function buildSubmissionEmail(input: {
  name: string;
  website: string;
  email: string;
  city: string;
  description: string;
  reviewUrl: string;
}): Built {
  const { html, text } = renderEmail({
    preheader: `${input.name} is waiting for review.`,
    eyebrow: "New listing to review",
    heading: `New listing: ${input.name}`,
    paragraphs: [
      "An agency has sent in a new listing. It is not on the site until you approve it.",
    ],
    rows: [
      { label: "Agency", value: input.name },
      { label: "Website", value: input.website, href: input.website },
      { label: "Sent by", value: input.email, href: `mailto:${input.email}` },
      { label: "City", value: input.city },
    ],
    quote: { label: "Description", text: input.description },
    button: { label: "Review and publish", href: input.reviewUrl },
    footnote: "The sender's email address is on the same domain as the website above.",
  });
  return { subject: `New listing to review: ${input.name}`.slice(0, 180), text, html };
}

/** Tells an agency that its new listing was published, or why it was not. */
export function buildDecisionEmail(input: {
  name: string;
  approved: boolean;
  listingUrl?: string;
  accountUrl: string;
  note?: string | null;
}): Built {
  if (input.approved) {
    const { html, text } = renderEmail({
      preheader: `${input.name} is now listed on RecruiterLink.`,
      eyebrow: "Listing published",
      heading: `${input.name} is now on RecruiterLink`,
      paragraphs: [
        "Your listing has been reviewed and published. You can sign in at any time to change its wording, specialisms and logo.",
      ],
      button: { label: "See your listing", href: input.listingUrl ?? input.accountUrl },
      footnote: "You are receiving this because you sent in this listing on recruiterlink.com.",
    });
    return { subject: `${input.name} is now on RecruiterLink`.slice(0, 180), text, html };
  }
  const { html, text } = renderEmail({
    preheader: `We could not publish the listing for ${input.name}.`,
    eyebrow: "Listing not published",
    heading: "We could not publish your listing",
    paragraphs: [
      `Thank you for sending in ${input.name}. We reviewed it and could not publish it as it stands.`,
      "You are welcome to reply to this email if you think this is a mistake.",
    ],
    quote: input.note ? { label: "Reason", text: input.note } : undefined,
    footnote: "You are receiving this because you sent in this listing on recruiterlink.com.",
  });
  return { subject: "About your RecruiterLink listing", text, html };
}
