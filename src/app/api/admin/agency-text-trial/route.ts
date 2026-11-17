import { createHash, timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { rewriteAgency, type AgencyInput } from "@/features/agency-text/rewrite";
import { getOpenAiKey } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

// GET /api/admin/agency-text-trial?token=…&trial=trial-1&batch=8
// Runs the agency text trial (growth plan step 2) on a Vercel preview, where
// the Firecrawl and OpenAI keys exist. It takes the next queued agencies of
// the trial, rewrites them and stores the results in
// private.agency_text_trial. It never writes public.agencies. It answers only
// on a preview deployment and only with the run token (its SHA-256 is below).
// mode=models lists the OpenAI models the key can use; mode=progress counts.

const TOKEN_SHA256 = "3b1140c3f53d8f55ac5af9001da16cb4e69cb869786190bcced62c79499e9081";
const DEFAULT_MODEL = "gpt-5.4-mini";

function tokenOk(token: string | null): boolean {
  if (!token) return false;
  const given = createHash("sha256").update(token).digest();
  return timingSafeEqual(given, Buffer.from(TOKEN_SHA256, "hex"));
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

export async function GET(request: Request) {
  await connection();
  if (process.env.VERCEL_ENV !== "preview") return json({ error: "Not found" }, 404);
  const params = new URL(request.url).searchParams;
  if (!tokenOk(params.get("token"))) return json({ error: "Not found" }, 404);

  const trial = params.get("trial") || "trial-1";
  const mode = params.get("mode") || "run";
  const supabase = getSupabaseAdminClient();

  if (mode === "models") {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${getOpenAiKey()}` },
      cache: "no-store",
    });
    const body = (await response.json()) as { data?: { id: string }[] };
    return json({ status: response.status, models: (body.data ?? []).map((m) => m.id).sort() });
  }

  if (mode === "progress") {
    const { data, error } = await supabase.rpc("agency_text_trial_progress", { trial_name: trial });
    return error ? json({ error: error.message }, 500) : json(data);
  }

  const batch = Math.min(Math.max(Number(params.get("batch")) || 8, 1), 20);
  const model = params.get("model") || process.env.AGENCY_TEXT_MODEL || DEFAULT_MODEL;
  const effort = params.get("effort") || null;

  const { data: agencies, error } = await supabase.rpc("agency_text_trial_next", {
    trial_name: trial,
    batch_size: batch,
  });
  if (error) return json({ error: error.message }, 500);

  const started = Date.now();
  const outcomes = await Promise.all(
    ((agencies ?? []) as AgencyInput[]).map(async (agency) => {
      const result = await rewriteAgency(agency, model, effort);
      const { error: saveError } = await supabase.rpc("agency_text_trial_save", {
        trial_name: trial,
        target: agency.agency_id,
        result: result as unknown as never,
      });
      return {
        name: agency.name,
        verdict: result.verdict,
        error: saveError?.message ?? result.error,
      };
    }),
  );

  const { data: progress } = await supabase.rpc("agency_text_trial_progress", { trial_name: trial });
  return json({ model, seconds: Math.round((Date.now() - started) / 1000), outcomes, progress });
}
