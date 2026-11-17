import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { BlogError, blogErrorFrom } from "@/features/blog/errors";
import { removeLogoFile } from "@/features/account/submission-logo";
import { findAgencyLogo } from "@/features/account/logo-finder";
import { LISTING_LIMITS } from "@/features/account/validate";
import { announcePages } from "@/lib/indexnow";
import { revalidateDirectory } from "@/lib/revalidate";
import { agencyPath } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Agency listings for the owner's AI agent (Grokbot), through the MCP
 * connector. Like the blog, the API key goes to the database with every
 * call: the database checks it, applies the per-key limits and records which
 * key added or changed what. The only server power used here is storing the
 * logo file, after the database has checked the key.
 */

const db = () => getSupabaseServerClient();

// ---------------------------------------------------------------------------
// Argument shapes
// ---------------------------------------------------------------------------

const L = LISTING_LIMITS;

const Website = z
  .string()
  .trim()
  .min(4)
  .max(300)
  .describe('The agency\'s own website, e.g. "https://www.example.com". One listing per website.');

const ListingFields = {
  name: z.string().trim().min(L.name.min).max(L.name.max).describe("The agency's trading name, as on its website."),
  website: Website,
  country: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .describe('Country slug from get_listing_options, e.g. "united-kingdom" (two-letter codes like "GB" work too).'),
  city: z
    .string()
    .trim()
    .min(L.city.min)
    .max(L.city.max)
    .describe('City of the office, e.g. "Manchester". An existing city is matched; a new one is created.'),
  region: z
    .string()
    .trim()
    .max(60)
    .optional()
    .describe(
      'State, province or region code from get_listing_options, e.g. "NSW", "TX", "ON". Needed when the city is new in a country with regions.',
    ),
  introduction: z
    .string()
    .trim()
    .max(L.introduction.max)
    .optional()
    .describe("One or two plain sentences shown on the agency's card. At most 300 characters."),
  description: z
    .string()
    .trim()
    .min(L.description.min)
    .max(L.description.max)
    .describe(
      "What the agency does, in plain factual paragraphs (blank line between them): sectors, roles, locations served. 80 to 4,000 characters, 400 to 1,200 is best. Only facts from the agency's own website.",
    ),
  specialisms: z
    .array(z.string().trim().min(2).max(60))
    .min(L.specialisms.min)
    .max(L.specialisms.max)
    .describe("1 to 8 specialism slugs from get_listing_options, most important first."),
};

const NewListing = z.object({
  ...ListingFields,
  branch_office: z
    .boolean()
    .optional()
    .describe(
      "true only for a separate office of an agency that is already listed, in another city (same website). Leave out otherwise.",
    ),
  premium: z
    .boolean()
    .optional()
    .describe("true gives the listing Premium at once, with no payment (only when Brett says so, e.g. for a Lovelio client)."),
  premium_note: z
    .string()
    .trim()
    .max(300)
    .optional()
    .describe('Why Premium was given, e.g. "Lovelio client". Only with premium=true.'),
});

export const CreateArgs = NewListing;

export const CreateManyArgs = z.object({
  listings: z.array(NewListing).min(1).max(25).describe("1 to 25 new listings. Each is added (or refused) on its own."),
});

export const FindArgs = z
  .object({
    websites: z
      .array(z.string().trim().min(3).max(300))
      .max(200)
      .optional()
      .describe("Up to 200 websites to check. Each comes back with listed true/false and its listings."),
    name: z.string().trim().min(2).max(120).optional().describe("Words in an agency name, e.g. \"Hays\"."),
    limit: z.number().int().min(1).max(100).optional().describe("Most name matches to return (default 20)."),
  })
  .refine((a) => (a.websites?.length ?? 0) > 0 || a.name, { message: "Pass websites, name, or both." });

export const GetArgs = z.object({
  agency_slug: z.string().trim().min(1).max(130).describe("The listing's slug, the last part of /agencies/<slug>."),
});

export const UpdateArgs = z.object({
  agency_slug: GetArgs.shape.agency_slug,
  name: ListingFields.name.optional(),
  website: Website.optional(),
  country: ListingFields.country.optional(),
  city: ListingFields.city.optional().describe("New city. Needed whenever country or region changes."),
  region: ListingFields.region,
  introduction: z
    .string()
    .trim()
    .max(L.introduction.max)
    .optional()
    .describe('New card sentence. "" removes it.'),
  description: ListingFields.description.optional(),
  specialisms: ListingFields.specialisms.optional().describe("Replaces all the listing's specialisms."),
});

export const PremiumArgs = z.object({
  agency_slug: GetArgs.shape.agency_slug,
  premium: z.boolean().describe("true gives Premium without payment; false takes a given (not paid) Premium away."),
  note: z.string().trim().max(300).optional().describe('Why, e.g. "Lovelio client, 12-month deal".'),
});

export const LogoArgs = GetArgs;

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type DbListing = {
  id: string;
  slug: string;
  name: string;
  website: string;
  domain: string | null;
  country_slug: string;
  country: string;
  city_slug: string | null;
  city: string | null;
  region: string | null;
  introduction: string | null;
  description: string;
  specialisms: string[];
  plan: "free" | "premium";
  premium_source: "comped" | "paid" | null;
  premium_comp_note: string | null;
  is_claimed: boolean;
  status: string;
  has_logo: boolean;
  added_by_connector: boolean;
  created_at: string;
  updated_at: string;
};

function shape(l: DbListing) {
  // The internal id stays on the server.
  const rest: Partial<DbListing> = { ...l };
  delete rest.id;
  return { ...rest, url: absoluteUrl(agencyPath(l.slug)) };
}

/** Database refusals in words the agent can act on. */
function listingError(error: { code?: string; message: string }): BlogError {
  switch (error.code) {
    case "23505":
      return new BlogError("already_listed", error.message, 409, "website");
    case "42501":
      return new BlogError("forbidden", error.message, 403);
    default:
      return blogErrorFrom(error);
  }
}

/** Card, city, country and counts change when a listing is added or moved. */
function refreshPages(listings: DbListing[], extraCities: { countrySlug: string; citySlug: string }[] = []) {
  const cities = [
    ...extraCities,
    ...listings
      .filter((l) => l.city_slug)
      .map((l) => ({ countrySlug: l.country_slug, citySlug: l.city_slug as string })),
  ];
  revalidateDirectory({ agencies: listings.map((l) => l.slug), cities });
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export async function listingOptions(apiKey: string) {
  const { data, error } = await db().rpc("bot_listing_options", { api_key: apiKey });
  if (error) throw listingError(error);
  return data;
}

export async function findListings(apiKey: string, a: z.infer<typeof FindArgs>) {
  const { data, error } = await db().rpc("bot_find_agencies", {
    api_key: apiKey,
    websites: a.websites ?? [],
    name_query: a.name ?? "",
    max_rows: a.limit ?? 20,
  });
  if (error) throw listingError(error);
  return data;
}

export async function getListing(apiKey: string, slug: string) {
  const { data, error } = await db().rpc("bot_get_agency", { api_key: apiKey, agency_slug: slug });
  if (error) throw listingError(error);
  return shape(data as unknown as DbListing);
}

async function insert(apiKey: string, a: z.infer<typeof NewListing>): Promise<DbListing> {
  if (a.premium_note && !a.premium) {
    throw new BlogError("invalid", "premium_note only goes with premium=true.", 400, "premium_note");
  }
  const { data, error } = await db().rpc("bot_create_agency", {
    api_key: apiKey,
    new_name: a.name,
    new_website: a.website,
    new_country: a.country,
    new_city: a.city,
    new_region: (a.region ?? null) as string,
    new_introduction: (a.introduction ?? null) as string,
    new_description: a.description,
    new_specialisms: a.specialisms,
    branch_office: a.branch_office ?? false,
    make_premium: a.premium ?? false,
    premium_note: (a.premium_note ?? null) as string,
  });
  if (error) throw listingError(error);
  return data as unknown as DbListing;
}

/** After the reply: logo search, page refresh and the Bing/IndexNow ping. */
function afterAdded(apiKey: string, added: DbListing[]) {
  if (added.length === 0) return;
  refreshPages(added);
  announcePages(added.map((l) => agencyPath(l.slug)));
  after(async () => {
    // A few at a time: each search reads the agency's website.
    const queue = [...added];
    const worker = async () => {
      for (let l = queue.shift(); l; l = queue.shift()) await storeFoundLogo(apiKey, l.slug).catch(() => null);
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    // Cards in city lists show the logo too.
    refreshPages(added);
  });
}

export async function createListing(apiKey: string, a: z.infer<typeof CreateArgs>) {
  const saved = await insert(apiKey, a);
  afterAdded(apiKey, [saved]);
  return { created: true, logo: "being looked for on the agency's website", ...shape(saved) };
}

export async function createListings(apiKey: string, a: z.infer<typeof CreateManyArgs>) {
  const added: DbListing[] = [];
  const results = [];
  // In order, one at a time: each insert is a counted write.
  for (const [i, item] of a.listings.entries()) {
    try {
      const saved = await insert(apiKey, item);
      added.push(saved);
      results.push({ index: i, created: true, slug: saved.slug, url: absoluteUrl(agencyPath(saved.slug)), plan: saved.plan });
    } catch (error) {
      if (!(error instanceof BlogError)) throw error;
      results.push({ index: i, created: false, name: item.name, error: `${error.code}: ${error.message}` });
      // Out of quota or a bad key: the rest would fail the same way.
      if (error.status === 401 || error.status === 429) break;
    }
  }
  afterAdded(apiKey, added);
  return {
    created: added.length,
    refused: results.filter((r) => !r.created).length,
    not_tried: a.listings.length - results.length,
    results,
  };
}

export async function updateListing(apiKey: string, a: z.infer<typeof UpdateArgs>) {
  const { data, error } = await db().rpc("bot_update_agency", {
    api_key: apiKey,
    agency_slug: a.agency_slug,
    new_name: (a.name ?? null) as string,
    new_website: (a.website ?? null) as string,
    new_country: (a.country ?? null) as string,
    new_city: (a.city ?? null) as string,
    new_region: (a.region ?? null) as string,
    new_introduction: (a.introduction ?? null) as string,
    new_description: (a.description ?? null) as string,
    new_specialisms: (a.specialisms ?? null) as string[],
  });
  if (error) throw listingError(error);
  const { before, after: now } = data as unknown as { before: DbListing; after: DbListing };
  const moved = before.city_slug !== now.city_slug || before.country_slug !== now.country_slug;
  refreshPages([now], moved && before.city_slug ? [{ countrySlug: before.country_slug, citySlug: before.city_slug }] : []);
  return { updated: true, ...shape(now) };
}

export async function setPremium(apiKey: string, a: z.infer<typeof PremiumArgs>) {
  const { data, error } = await db().rpc("bot_set_agency_premium", {
    api_key: apiKey,
    agency_slug: a.agency_slug,
    premium: a.premium,
    note: (a.note ?? null) as string,
  });
  if (error) throw listingError(error);
  const { outcome, listing } = data as unknown as { outcome: string; listing: DbListing };
  if (outcome === "premium_given" || outcome === "premium_removed") refreshPages([listing]);
  return { outcome, ...shape(listing) };
}

export async function refreshLogo(apiKey: string, slug: string) {
  const found = await storeFoundLogo(apiKey, slug);
  if (found) refreshPages([(await getListing(apiKey, slug)) as unknown as DbListing]);
  return found
    ? { slug, logo: "stored", source: found }
    : { slug, logo: "none found", hint: "No usable logo on the agency's website or logo.dev; the card shows its initials." };
}

/**
 * Finds the agency's logo and stores it. The database checks the key (and
 * that no agency has claimed the listing) before anything is written.
 */
async function storeFoundLogo(apiKey: string, slug: string): Promise<string | null> {
  const { data, error } = await db().rpc("bot_agency_for_logo", { api_key: apiKey, agency_slug: slug });
  if (error) throw listingError(error);
  const target = data as unknown as { id: string; slug: string; website: string; domain: string | null };
  const found = await findAgencyLogo(target.website, target.domain ?? "");
  if (!found) return null;

  const admin = getSupabaseAdminClient();
  const path = `${target.id}-${Date.now()}.png`;
  const upload = await admin.storage
    .from("agency-logos")
    .upload(path, found.bytes, { contentType: "image/png", cacheControl: "31536000", upsert: false });
  if (upload.error) {
    console.error("[mcp] logo upload failed", upload.error.message);
    return null;
  }
  const saved = await admin.rpc("set_agency_logo", { target_agency: target.id, new_logo_path: path });
  if (saved.error) {
    console.error("[mcp] set_agency_logo failed", saved.error.code, saved.error.message);
    await removeLogoFile(path);
    return null;
  }
  if (saved.data && saved.data !== path) await removeLogoFile(saved.data);
  return found.source;
}
