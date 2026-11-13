import { keyIsLive, mcpNoStream, mcpResponse } from "@/features/mcp/server";

export const maxDuration = 60;

/**
 * POST /api/mcp/<key>: the same connector with the key in the address, for
 * connector screens (Grok) that only take an address. A wrong key is a
 * plain 404, so the address cannot be used to test keys. Treat the whole
 * address as a password.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/mcp/[key]">) {
  const { key } = await params;
  if (!(await keyIsLive(key))) return new Response("Not found\n", { status: 404 });
  return mcpResponse(request, key);
}

export async function GET(_request: Request, { params }: RouteContext<"/api/mcp/[key]">) {
  const { key } = await params;
  if (!(await keyIsLive(key))) return new Response("Not found\n", { status: 404 });
  return mcpNoStream();
}

export const DELETE = GET;
