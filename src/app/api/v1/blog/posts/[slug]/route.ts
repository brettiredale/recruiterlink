import { UpdateArgs, deletePost, getPost, updatePost } from "@/features/blog/bot";
import { apiJson, readJson, withApiKey } from "@/features/blog/rest";

type Context = RouteContext<"/api/v1/blog/posts/[slug]">;

/** GET /api/v1/blog/posts/<slug>: one post with its markdown. */
export async function GET(request: Request, { params }: Context) {
  const { slug } = await params;
  return withApiKey(request, async (key) => apiJson(await getPost(key, slug)));
}

/** PATCH /api/v1/blog/posts/<slug>: change only the fields sent. */
export async function PATCH(request: Request, { params }: Context) {
  const { slug } = await params;
  return withApiKey(request, async (key) => {
    const changes = await readJson(request, UpdateArgs.omit({ post_slug: true }));
    return apiJson(await updatePost(key, { ...changes, post_slug: slug }));
  });
}

/** DELETE /api/v1/blog/posts/<slug>: delete for good (a copy is kept privately). */
export async function DELETE(request: Request, { params }: Context) {
  const { slug } = await params;
  return withApiKey(request, async (key) => apiJson(await deletePost(key, slug)));
}
