import "server-only";
import { z } from "zod";
import { checkKey } from "@/features/blog/bot";
import { BlogError } from "@/features/blog/errors";
import { connectorInstructions } from "./instructions";
import { TOOLS } from "./tools";

/**
 * The MCP server for the owner's AI agent (Grokbot): Streamable HTTP with
 * plain JSON answers, no sessions and no stream from the server. Reached at
 * /api/mcp with "Authorization: Bearer <key>", or at /api/mcp/<key> for
 * connector screens (Grok) that only take an address.
 *
 * The key is checked by the database on every tool call, so a revoked key
 * stops working at once.
 */
const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

function jsonSchema(schema: z.ZodType) {
  const out = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  delete out.$schema;
  return out;
}

const LISTED = TOOLS.map((t) => ({
  name: t.name,
  title: t.title,
  description: t.description,
  inputSchema: jsonSchema(t.args),
  annotations: {
    title: t.title,
    readOnlyHint: !t.write,
    destructiveHint: t.destructive ?? false,
    idempotentHint: t.idempotent ?? !t.write,
    openWorldHint: false,
  },
}));

type Rpc = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: Rpc["id"], code: number, message: string) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});
const text = (value: unknown, isError = false) => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 1) }],
  isError,
});

async function callTool(apiKey: string, name: string, args: unknown) {
  const found = BY_NAME.get(name);
  if (!found) return null;
  const parsed = found.args.safeParse(args ?? {});
  if (!parsed.success) return text(`Invalid arguments: ${z.prettifyError(parsed.error)}`, true);
  try {
    const result = await found.run(apiKey, parsed.data);
    if (found.write) console.info(`[mcp] ${apiKey.slice(0, 12)}… ${found.name} ok`);
    return text(result);
  } catch (error) {
    if (error instanceof BlogError) return text(`${error.code}: ${error.message}`, true);
    console.error(`[mcp] ${found.name} failed`, error);
    return text("server_error: Something went wrong on our side. Try again in a minute.", true);
  }
}

async function handle(apiKey: string, message: Rpc) {
  const { id, method, params } = message ?? {};
  if (message?.jsonrpc !== "2.0" || typeof method !== "string") return fail(id, -32600, "Invalid request");
  const isNotification = id === undefined;
  switch (method) {
    case "initialize": {
      const asked = String(params?.protocolVersion ?? "");
      return ok(id, {
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "recruiterlink-blog", title: "RecruiterLink blog", version: "1.0.0" },
        instructions: connectorInstructions(),
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: LISTED });
    case "tools/call": {
      const name = String(params?.name ?? "");
      const result = await callTool(apiKey, name, params?.arguments);
      return result ? ok(id, result) : fail(id, -32602, `Unknown tool: ${name}`);
    }
    default:
      return isNotification ? null : fail(id, -32601, `Method not found: ${method}`);
  }
}

/** Answers one MCP POST. */
export async function mcpResponse(request: Request, apiKey: string): Promise<Response> {
  const body = await request.json().catch(() => undefined);
  if (body === undefined) return Response.json(fail(null, -32700, "Parse error"), { status: 400 });

  const batch = Array.isArray(body);
  const messages = (batch ? body : [body]).slice(0, 50) as Rpc[];
  const replies = [];
  // In order on purpose: a batch of writes lands in the order it was sent.
  for (const message of messages) {
    const reply = await handle(apiKey, message);
    if (reply) replies.push(reply);
  }
  if (replies.length === 0) return new Response(null, { status: 202 });
  return Response.json(batch ? replies : replies[0], { headers: { "Cache-Control": "no-store" } });
}

/** The key is checked up front too, so a wrong key gets a clear answer before any tool call. */
export async function keyIsLive(apiKey: string | null): Promise<boolean> {
  if (!apiKey || !apiKey.startsWith("rl_live_") || apiKey.length > 200) return false;
  try {
    await checkKey(apiKey, false);
    return true;
  } catch (error) {
    // A busy key is still a real key; let the tool calls report the limit.
    return error instanceof BlogError && error.code === "rate_limited";
  }
}

export function bearerKey(request: Request): string | null {
  const match = /^Bearer\s+(.+)$/i.exec((request.headers.get("authorization") ?? "").trim());
  return match ? match[1].trim() : null;
}

/** No server-to-client stream and no sessions. */
export function mcpNoStream(): Response {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
