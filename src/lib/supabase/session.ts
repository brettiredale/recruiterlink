import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "@/lib/env";

/**
 * Supabase client that acts as the signed-in person, using the session kept
 * in their cookies. The database checks who they are on every call, so this
 * client can only do what that person is allowed to do.
 *
 * Make a new one for each request; never share it between visitors.
 */
export async function getSupabaseSessionClient() {
  // Account pages are worked out afresh for each visit, never ahead of time:
  // the session checks below depend on the current time.
  await connection();
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Pages cannot change cookies while rendering. The request handler
          // in src/proxy.ts keeps the session fresh instead.
        }
      },
    },
  });
}
