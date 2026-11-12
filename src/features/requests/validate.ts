/**
 * Checks what a visitor typed into the "register your interest" and
 * contact forms. Pure, so it is unit tested; the database repeats the
 * length limits as a second line of defence.
 */

export type RequestKind = "claim" | "premium" | "contact";

export type RequestInput = {
  kind: RequestKind;
  name: string;
  email: string;
  agencyName: string | null;
  website: string | null;
  message: string | null;
};

export type RequestField = "kind" | "name" | "email" | "agencyName" | "website" | "message";

export type RequestErrors = Partial<Record<RequestField, string>>;

export const LIMITS = {
  name: 120,
  email: 254,
  agencyName: 160,
  website: 300,
  message: 2000,
} as const;

/** The hidden field real visitors never see or fill in. */
export const HONEYPOT_FIELD = "company_fax";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const KINDS: readonly string[] = ["claim", "premium", "contact"];

function text(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim()
    : "";
}

function oneLine(value: unknown): string {
  return text(value).replace(/\s+/g, " ");
}

export type ValidationResult =
  | { ok: true; value: RequestInput }
  | { ok: false; errors: RequestErrors; values: Record<RequestField, string> }
  /** The honeypot was filled in: a bot. Accepted silently, never stored. */
  | { ok: "bot" };

/** Validates raw form values (as from `FormData`). */
export function validateRequest(raw: Record<string, unknown>): ValidationResult {
  if (text(raw[HONEYPOT_FIELD]) !== "") return { ok: "bot" };

  const values: Record<RequestField, string> = {
    kind: oneLine(raw.kind),
    name: oneLine(raw.name),
    email: oneLine(raw.email).toLowerCase(),
    agencyName: oneLine(raw.agencyName),
    website: oneLine(raw.website),
    message: text(raw.message),
  };
  const errors: RequestErrors = {};

  if (!KINDS.includes(values.kind)) errors.kind = "Choose what you would like to do.";
  const kind = values.kind as RequestKind;

  if (values.name.length < 2) errors.name = "Enter your name.";
  else if (values.name.length > LIMITS.name)
    errors.name = `Your name must be ${LIMITS.name} characters or fewer.`;

  if (!values.email) errors.email = "Enter your email address.";
  else if (values.email.length > LIMITS.email || !EMAIL.test(values.email))
    errors.email = "Enter an email address in the form name@example.com.";

  if (kind !== "contact" && values.agencyName.length < 2)
    errors.agencyName = "Enter the name of your agency.";
  else if (values.agencyName.length > LIMITS.agencyName)
    errors.agencyName = `The agency name must be ${LIMITS.agencyName} characters or fewer.`;

  if (values.website) {
    if (values.website.length > LIMITS.website)
      errors.website = `The website address must be ${LIMITS.website} characters or fewer.`;
    else if (/\s/.test(values.website) || !/^(https?:\/\/)?[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/i.test(values.website))
      errors.website = "Enter a website address such as www.example.com.";
  }

  if (kind === "contact" && !values.message) errors.message = "Enter your message.";
  else if (values.message.length > LIMITS.message)
    errors.message = `Your message must be ${LIMITS.message.toLocaleString("en")} characters or fewer.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors, values };

  return {
    ok: true,
    value: {
      kind,
      name: values.name,
      email: values.email,
      agencyName: values.agencyName || null,
      website: values.website || null,
      message: values.message || null,
    },
  };
}
