import { connection } from "next/server";
import { getSupabaseConfig } from "@/lib/env";

type Check = { ok: true } | { ok: false; reason: string };

/**
 * Confirms the Supabase project is reachable and accepts the site's key.
 * To be extended to a real database query once the first table exists.
 */
async function checkSupabase(): Promise<Check> {
  let config;
  try {
    config = getSupabaseConfig();
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }

  try {
    const response = await fetch(`${config.url}/auth/v1/health`, {
      headers: { apikey: config.publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) return { ok: true };
    return {
      ok: false,
      reason:
        response.status === 401
          ? "Supabase rejected the key in NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
          : `Supabase answered with status ${response.status}.`,
    };
  } catch {
    return {
      ok: false,
      reason:
        "Supabase could not be reached. Check NEXT_PUBLIC_SUPABASE_URL.",
    };
  }
}

/** Health check for monitoring and for confirming a deployment's settings. */
export async function GET() {
  // Always run at request time; a health check must never be pre-built.
  await connection();

  const supabase = await checkSupabase();

  return Response.json(
    { status: supabase.ok ? "ok" : "error", checks: { supabase } },
    {
      status: supabase.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
