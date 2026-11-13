/**
 * Settings the site needs in order to run. Real values live in Vercel;
 * `.env.example` lists them. Each is read lazily, so a missing value fails
 * with a clear message at the point of use rather than an obscure error later.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing setting ${name}. Add it in Vercel under Settings > Environment Variables, or in .env.local for local work.`,
    );
  }
  return value;
}

// Each variable is named in full so the framework can make it available
// to browser code as well as the server.
export function getSupabaseConfig() {
  return {
    url: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

/**
 * The Supabase secret key. Server only: it can do anything in the database,
 * so it is never sent to a browser and is used for just three jobs (creating
 * sign-in codes, storing logo files, and recording payments).
 */
export function getSupabaseSecretKey(): string {
  return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
}

export function hasSupabaseSecretKey(): boolean {
  return Boolean(process.env.SUPABASE_SECRET_KEY);
}

/** Firecrawl key, for reading an agency's website. Server only; null when not set. */
export function getFirecrawlKey(): string | null {
  return process.env.FIRECRAWL_API_KEY || null;
}

/**
 * logo.dev publishable key (starts "pk_"). logo.dev treats it as public, but
 * it is only used on the server here, to fetch a logo once and store a copy.
 */
export function getLogoDevKey(): string | null {
  const key = process.env.LOGO_DEV_PUBLISHABLE_KEY;
  return key?.startsWith("pk_") ? key : null;
}
