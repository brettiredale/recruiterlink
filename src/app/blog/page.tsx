import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndexPage, blogIndexMetadata, loadBlogPage } from "@/features/blog/BlogIndex";

export const ensureStatic = "navigation";

export async function generateMetadata(): Promise<Metadata> {
  return blogIndexMetadata(await loadBlogPage(1));
}

export default async function BlogPage() {
  const listing = await loadBlogPage(1);
  if (!listing) notFound();
  return <BlogIndexPage listing={listing} />;
}
