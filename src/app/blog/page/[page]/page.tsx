import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndexPage, blogIndexMetadata, loadBlogPage } from "@/features/blog/BlogIndex";
import { getBlogPage } from "@/features/blog/data";
import { POSTS_PER_PAGE } from "@/features/blog/rules";
import { parsePageSegment } from "@/lib/routes";

export const ensureStatic = "navigation";

/**
 * Built ahead of time: every later page of the blog. The framework needs at
 * least one, so while the blog fits on one page, page 2 is listed and
 * answers "not found".
 */
export async function generateStaticParams() {
  const { total } = await getBlogPage(1);
  const pages = Math.max(2, Math.ceil(total / POSTS_PER_PAGE));
  return Array.from({ length: Math.min(pages, 20) - 1 }, (_, index) => ({ page: String(index + 2) }));
}

type Props = PageProps<"/blog/page/[page]">;

async function load(params: Props["params"]) {
  const page = parsePageSegment((await params).page);
  return page === null ? null : loadBlogPage(page);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return blogIndexMetadata(await load(params));
}

export default async function BlogLaterPage({ params }: Props) {
  const listing = await load(params);
  if (!listing) notFound();
  return <BlogIndexPage listing={listing} />;
}
