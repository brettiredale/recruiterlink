import "server-only";
import { z } from "zod";
import { bearerKey } from "@/features/mcp/server";
import { BlogError } from "./errors";

/**
 * Helpers for the REST API at /api/v1/blog. Every answer is JSON; errors
 * look like { "error": { "code": "...", "message": "..." } }.
 */
const NO_STORE = { "Cache-Control": "no-store" };

export function apiError(code: string, message: string, status: number, field?: string): Response {
  return Response.json({ error: { code, message, ...(field ? { field } : {}) } }, { status, headers: NO_STORE });
}

export function apiJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

/** Runs one API call with the request's key, turning failures into JSON errors. */
export async function withApiKey(request: Request, run: (apiKey: string) => Promise<Response>): Promise<Response> {
  const key = bearerKey(request);
  if (!key) {
    return apiError("unauthorized", "Send your API key as: Authorization: Bearer rl_live_…", 401);
  }
  try {
    return await run(key);
  } catch (error) {
    if (error instanceof BlogError) return apiError(error.code, error.message, error.status, error.field);
    console.error("[api] blog call failed", error);
    return apiError("server_error", "Something went wrong on our side. Please try again in a minute.", 500);
  }
}

/** Reads and checks a JSON body. */
export async function readJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  const body = await request.json().catch(() => undefined);
  if (body === undefined) throw new BlogError("invalid", "The request body must be JSON.", 400);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new BlogError("invalid", z.prettifyError(parsed.error), 400);
  return parsed.data;
}
