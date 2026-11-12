import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "@/lib/env";

let client: SupabaseClient<Database> | undefined;

/**
 * Supabase client for server-side reads of the public directory data.
 *
 * It uses the publishable key, so it can only do what the database lets the
 * public do: read published data. It holds no visitor session, which makes it
 * safe to share between requests and to call from cached functions.
 */
export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (!client) {
    const { url, publishableKey } = getSupabaseConfig();
    client = createClient<Database>(url, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
