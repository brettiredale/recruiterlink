import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig, getSupabaseSecretKey } from "@/lib/env";

let client: SupabaseClient<Database> | undefined;

/**
 * Supabase client with the secret key. It bypasses every access rule, so:
 * never import it into anything a browser can reach, never pass it values
 * you have not checked, and always confirm who the signed-in person is (with
 * the session client) before acting for them.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (!client) {
    const { url } = getSupabaseConfig();
    client = createClient<Database>(url, getSupabaseSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
