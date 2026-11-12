/**
 * Checks what an agency types into the sign-in and listing forms. Pure, so
 * it is unit tested; the database repeats every limit as a second line of
 * defence (see the `create_agency_accounts` migration).
 */

export const LISTING_LIMITS = {
  name: { min: 2, max: 120 },
  city: { min: 2, max: 80 },
  introduction: { max: 300 },
  description: { min: 80, max: 4000 },
  specialisms: { min: 1, max: 8 },
} as const;

/** The hidden field real visitors never see or fill in. */
export const ACCOUNT_HONEYPOT_FIELD = "company_fax";

/** Logo files: PNG, JPEG or WebP, up to 1 MB. */
export const LOGO_MAX_BYTES = 1024 * 1024;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export function cleanText(value: unknown): string {
  return typeof value === "string"
    ? value
        .replace(/\r\n?/g, "\n")
        .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
        .trim()
    : "";
}

export function cleanLine(value: unknown): string {
  return cleanText(value).replace(/\s+/g, " ");
}

/** A usable email address in lower case, or null. */
export function parseEmail(value: unknown): string | null {
  const email = cleanLine(value).toLowerCase();
  return email.length >= 5 && email.length <= 254 && EMAIL.test(email) ? email : null;
}

/** The part of an email address after the @. */
export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

/** The sign-in code from the email: six to ten digits, spaces ignored. */
export function parseCode(value: unknown): string | null {
  const code = typeof value === "string" ? value.replace(/[\s-]/g, "") : "";
  return /^\d{6,10}$/.test(code) ? code : null;
}

/** The long one-time value carried by the link in the sign-in email. */
export function parseTokenHash(value: unknown): string | null {
  const token = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9_-]{20,200}$/.test(token) ? token : null;
}

export function parseUuid(value: unknown): string | null {
  const id = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) ? id : null;
}

/**
 * The host of a website address without "www.", or null if it is not a
 * plain web address. "HTTP://www.Example.com/about" gives "example.com".
 */
export function websiteHost(value: unknown): string | null {
  const host = cleanLine(value)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/^www\./, "");
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)
    ? host
    : null;
}

export type ListingTextField = "introduction" | "description" | "specialisms";
export type ListingTextErrors = Partial<Record<ListingTextField, string>>;

export type ListingText = {
  introduction: string;
  description: string;
  specialismIds: number[];
};

function parseSpecialismIds(values: unknown[]): number[] {
  const ids = new Set<number>();
  for (const value of values) {
    const id = typeof value === "string" ? Number(value) : NaN;
    if (Number.isInteger(id) && id > 0 && id < 32767) ids.add(id);
  }
  return [...ids];
}

function listingTextErrors(text: ListingText): ListingTextErrors {
  const errors: ListingTextErrors = {};
  const { introduction, description, specialisms } = LISTING_LIMITS;
  if (text.introduction.length > introduction.max) {
    errors.introduction = `Keep the introduction to ${introduction.max} characters or fewer. It is ${text.introduction.length}.`;
  }
  if (text.description.length < description.min) {
    errors.description = `Write at least ${description.min} characters about your agency. So far it is ${text.description.length}.`;
  } else if (text.description.length > description.max) {
    errors.description = `Keep the description to ${description.max.toLocaleString("en")} characters or fewer. It is ${text.description.length.toLocaleString("en")}.`;
  }
  if (text.specialismIds.length < specialisms.min) {
    errors.specialisms = "Choose at least one specialism.";
  } else if (text.specialismIds.length > specialisms.max) {
    errors.specialisms = `Choose up to ${specialisms.max} specialisms. You have chosen ${text.specialismIds.length}.`;
  }
  return errors;
}

/** The words and specialisms of a listing, as edited by its agency. */
export function validateListingText(raw: {
  introduction: unknown;
  description: unknown;
  specialisms: unknown[];
}): { ok: true; value: ListingText } | { ok: false; errors: ListingTextErrors; value: ListingText } {
  const value: ListingText = {
    introduction: cleanText(raw.introduction),
    description: cleanText(raw.description),
    specialismIds: parseSpecialismIds(raw.specialisms),
  };
  const errors = listingTextErrors(value);
  return Object.keys(errors).length ? { ok: false, errors, value } : { ok: true, value };
}

export type NewListingField = "name" | "website" | "country" | "city" | ListingTextField;
export type NewListingErrors = Partial<Record<NewListingField, string>>;

export type NewListing = ListingText & {
  name: string;
  website: string;
  countryId: number | null;
  city: string;
};

/**
 * A brand-new listing. The website has to be on the same domain as the
 * signed-in person's email address: that is what proves they work there.
 */
export function validateNewListing(
  raw: {
    name: unknown;
    website: unknown;
    country: unknown;
    city: unknown;
    introduction: unknown;
    description: unknown;
    specialisms: unknown[];
  },
  accountDomain: string,
): { ok: true; value: NewListing } | { ok: false; errors: NewListingErrors; value: NewListing } {
  const countryId = typeof raw.country === "string" ? Number(raw.country) : NaN;
  const value: NewListing = {
    name: cleanLine(raw.name),
    website: cleanLine(raw.website),
    countryId: Number.isInteger(countryId) && countryId > 0 ? countryId : null,
    city: cleanLine(raw.city),
    introduction: cleanText(raw.introduction),
    description: cleanText(raw.description),
    specialismIds: parseSpecialismIds(raw.specialisms),
  };
  const errors: NewListingErrors = listingTextErrors(value);
  const { name, city } = LISTING_LIMITS;
  if (value.name.length < name.min) errors.name = "Enter your agency's name.";
  else if (value.name.length > name.max) errors.name = `Keep the name to ${name.max} characters or fewer.`;

  const host = websiteHost(value.website);
  if (!value.website) errors.website = "Enter your agency's website address.";
  else if (!host) errors.website = "That does not look like a website address. Try something like example.com.";
  else if (host !== accountDomain) {
    errors.website = `The website must be on ${accountDomain}, the same domain as the email address you signed in with.`;
  }

  if (value.countryId === null) errors.country = "Choose a country.";
  if (value.city.length < city.min) errors.city = "Enter the city your agency is based in.";
  else if (value.city.length > city.max) errors.city = `Keep the city to ${city.max} characters or fewer.`;

  return Object.keys(errors).length ? { ok: false, errors, value } : { ok: true, value };
}

/**
 * What kind of image a file really is, judged by its first bytes rather
 * than its name. Returns null for anything that is not PNG, JPEG or WebP.
 */
export function sniffImage(bytes: Uint8Array): { ext: "png" | "jpg" | "webp"; mime: string } | null {
  const at = (i: number) => bytes[i];
  if (bytes.length >= 8 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) {
    return { ext: "png", mime: "image/png" };
  }
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    bytes.length >= 12 &&
    at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 &&
    at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}
