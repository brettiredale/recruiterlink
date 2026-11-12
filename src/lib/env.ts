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
