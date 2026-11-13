import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, AdminShell } from "@/features/admin/AdminShell";
import { requireAdmin } from "@/features/admin/guard";
import { BlogEditor, type EditorPost } from "@/features/blog/BlogEditor";

export const metadata: Metadata = { title: "New post" };

async function NewPost() {
  const account = await requireAdmin();
  const post: EditorPost = {
    id: null,
    title: "",
    slug: "",
    excerpt: "",
    bodyMarkdown: "",
    coverImageUrl: "",
    coverImageAlt: "",
    author: "",
    tags: [],
    status: "draft",
    publishedAt: new Date().toISOString(),
    updatedAt: null,
    updatedBy: null,
  };
  return (
    <AdminShell section="blog" title="New post" email={account.email} width="wide">
      <BlogEditor post={post} />
    </AdminShell>
  );
}

export default function NewPostPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <NewPost />
    </Suspense>
  );
}
