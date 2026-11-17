import { after, type NextRequest } from "next/server";
import { isProbablyBot, parseCardEvents } from "@/lib/card-events";
import { hasSupabaseSecretKey } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Agency card views and clicks from the browser (src/components/TrackCards.tsx).
 * Always answers 204 at once; the write happens after the reply. Counted only
 * on the live site, so previews and local runs never add to the figures (the
 * same rule as Plausible). Search engines and scripts are left out by user
 * agent, and requests from other sites are refused.
 */
export async function POST(request: NextRequest) {
  const done = new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new Response(null, { status: 403 });
  if (isProbablyBot(request.headers.get("user-agent"))) return done;

  const text = await request.text();
  if (text.length > 40_000) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const events = parseCardEvents(body);
  if (events === null) return new Response(null, { status: 400 });
  if (events.length === 0) return done;

  if (process.env.VERCEL_ENV !== "production" || !hasSupabaseSecretKey()) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "X-Card-Events": "not-counted" } });
  }

  after(async () => {
    const { error } = await getSupabaseAdminClient().rpc("record_card_events", { events });
    if (error) console.error("record_card_events failed", error.message);
  });
  return done;
}
