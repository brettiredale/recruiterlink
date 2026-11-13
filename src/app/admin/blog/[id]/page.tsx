import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { parseUuid } from "@/features/account/validate";
import { AdminLoading, AdminShell, StatusPill } from "@/features/admin/AdminShell";
import { requireAdmin } from "@/features/admin/guard";
import { getAdminPost } from "@/features/blog/admin-data";
import { BlogEditor, type EditorPost } from "@/features/blog/BlogEditor";

export const metadata: Metadata = { title: "Edit post" };

const NOTICES: Record<string, string> = {
  draft: "Draft saved. Only admins can see it.",
  published: "Published. It is live on the blog now.",
};

/** Who made the last change, in a few words. */
function changedBy(updatedBy: string): string {
  return updatedBy.startsWith("API key") ? `Grokbot, ${updatedBy}` : updatedBy;
}

async function EditPost({ params, searchParams }: PageProps<"/admin/blog/[id]">) {
  const account = await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const target = parseUuid(id);
  const row = target ? await getAdminPost(target) : null;
  if (!row) notFound();

  const post: EditorPost = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    bodyMarkdown: row.body_markdown ?? "",
    coverImageUrl: row.cover_image_url ?? "",
    coverImageAlt: row.cover_image_alt ?? "",
    author: row.author ?? "",
    tags: row.tags,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    updatedBy: changedBy(row.updated_by),
  };
  const notice = typeof query.notice === "string" ? NOTICES[query.notice] : undefined;

  return (
    <AdminShell
      section="blog"
      title={row.title}
      email={account.email}
      width="wide"
      actions={<StatusPill status={row.status} />}
    >
      {/* Keyed so opening a different post starts clean. */}
      <BlogEditor key={row.id} post={post} notice={notice} />
    </AdminShell>
  );
}

export default function EditPostPage(props: PageProps<"/admin/blog/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <EditPost {...props} />
    </Suspense>
  );
}
