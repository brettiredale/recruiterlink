import { z } from "zod";
import { CreateArgs, UpdateArgs, UploadArgs } from "@/features/blog/bot";
import { siteUrl } from "@/lib/site";

/** A machine-readable description of the blog API, for agents and tools. */
function schema(s: z.ZodType) {
  const out = z.toJSONSchema(s, { io: "input", target: "openapi-3.0" }) as Record<string, unknown>;
  delete out.$schema;
  return out;
}

const error = { $ref: "#/components/schemas/Error" };
const responses = (ok: string, okCode = "200") => ({
  [okCode]: { description: ok },
  "400": { description: "Something in the request needs changing", content: { "application/json": { schema: error } } },
  "401": { description: "Missing, invalid or revoked API key", content: { "application/json": { schema: error } } },
  "404": { description: "No post with that slug", content: { "application/json": { schema: error } } },
  "409": { description: "The slug is already used", content: { "application/json": { schema: error } } },
  "429": { description: "Too many calls for this key", content: { "application/json": { schema: error } } },
});
const slugParam = { name: "slug", in: "path", required: true, schema: { type: "string" } };

export function GET() {
  const document = {
    openapi: "3.0.3",
    info: {
      title: "RecruiterLink blog API",
      version: "1.0.0",
      description:
        "Create, change, unpublish and delete posts on the RecruiterLink blog, and store images for them. Keys are made by the site's admins at /admin/connect. The same actions are available as an MCP connector at /api/mcp.",
    },
    servers: [{ url: `${siteUrl}/api/v1` }],
    security: [{ apiKey: [] }],
    paths: {
      "/blog/posts": {
        get: {
          summary: "List posts (drafts included), most recently changed first",
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: ["draft", "published"] } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500, default: 60 } },
          ],
          responses: responses("The posts"),
        },
        post: {
          summary: "Create a post",
          requestBody: { required: true, content: { "application/json": { schema: schema(CreateArgs) } } },
          responses: responses("The new post", "201"),
        },
      },
      "/blog/posts/{slug}": {
        get: { summary: "Read one post with its markdown", parameters: [slugParam], responses: responses("The post") },
        patch: {
          summary: "Change a post (send only what changes). status 'draft' takes it off the site.",
          parameters: [slugParam],
          requestBody: { required: true, content: { "application/json": { schema: schema(UpdateArgs.omit({ post_slug: true })) } } },
          responses: responses("The changed post"),
        },
        delete: { summary: "Delete a post for good", parameters: [slugParam], responses: responses("Deleted") },
      },
      "/blog/images": {
        post: {
          summary: "Store an image and get its permanent address",
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: schema(UploadArgs) },
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: { file: { type: "string", format: "binary" }, alt: { type: "string" } },
                  required: ["file"],
                },
              },
            },
          },
          responses: responses("{ url, markdown }", "201"),
        },
      },
    },
    components: {
      securitySchemes: { apiKey: { type: "http", scheme: "bearer", description: "rl_live_… key" } },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: { code: { type: "string" }, message: { type: "string" }, field: { type: "string" } },
            },
          },
        },
      },
    },
  };
  return Response.json(document, { headers: { "Cache-Control": "public, max-age=3600" } });
}
