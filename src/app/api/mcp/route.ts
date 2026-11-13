import { bearerKey, keyIsLive, mcpNoStream, mcpResponse } from "@/features/mcp/server";

export const maxDuration = 60;

/**
 * POST /api/mcp: the blog connector for AI agents that can send an
 * "Authorization: Bearer <key>" header. Grok, which cannot, uses
 * /api/mcp/<key>. Keys are made at /admin/connect.
 */
export async function POST(request: Request) {
  const key = bearerKey(request);
  if (!(await keyIsLive(key))) {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Invalid or revoked API key." } },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  return mcpResponse(request, key!);
}

export const GET = mcpNoStream;
export const DELETE = mcpNoStream;
