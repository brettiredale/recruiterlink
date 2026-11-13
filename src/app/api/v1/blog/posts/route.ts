import { CreateArgs, ListArgs, createPost, listPosts } from "@/features/blog/bot";
import { BlogError } from "@/features/blog/errors";
import { apiJson, readJson, withApiKey } from "@/features/blog/rest";

/** GET /api/v1/blog/posts?status=draft|published&limit=60 */
export async function GET(request: Request) {
  return withApiKey(request, async (key) => {
    const params = new URL(request.url).searchParams;
    const parsed = ListArgs.safeParse({
      status: params.get("status") ?? undefined,
      limit: params.has("limit") ? Number(params.get("limit")) : undefined,
    });
    if (!parsed.success) throw new BlogError("invalid", "status must be draft or published; limit 1 to 500.", 400);
    return apiJson(await listPosts(key, parsed.data));
  });
}

/** POST /api/v1/blog/posts: a new post. */
export async function POST(request: Request) {
  return withApiKey(request, async (key) => apiJson(await createPost(key, await readJson(request, CreateArgs)), 201));
}
