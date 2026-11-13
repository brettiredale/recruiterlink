import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink, EmptyState } from "@/components";
import { cx } from "@/components/cx";
import { Notice } from "@/features/account/ui";
import { AdminLoading, AdminShell, StatusPill, adminDateTime } from "@/features/admin/AdminShell";
import { requireAdmin } from "@/features/admin/guard";
import { listAdminPosts, type AdminPost } from "@/features/blog/admin-data";
import { formatShortDate } from "@/features/blog/rules";
import { adminBlogPath, adminNewPostPath, adminPostPath, blogPath, blogPostPath } from "@/lib/routes";

export const metadata: Metadata = { title: "Blog" };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
] as const;

const NOTICES: Record<string, string> = {
  deleted: "The post was deleted. Its address no longer works.",
};

/** Who made the last change, in a few words. */
function changedBy(post: AdminPost): string {
  return post.updated_by.startsWith("API key") ? `Grokbot (${post.updated_by.replace(/^API key /, "")})` : post.updated_by;
}

async function BlogAdmin({ searchParams }: { searchParams: PageProps<"/admin/blog">["searchParams"] }) {
  const [account, params] = await Promise.all([requireAdmin(), searchParams]);
  const posts = await listAdminPosts();
  const filter = FILTERS.find((f) => f.id === params.status)?.id ?? "all";
  const shown = filter === "all" ? posts : posts.filter((p) => p.status === filter);
  const notice = typeof params.notice === "string" ? NOTICES[params.notice] : undefined;
  const count = (id: (typeof FILTERS)[number]["id"]) =>
    id === "all" ? posts.length : posts.filter((p) => p.status === id).length;

  return (
    <AdminShell
      section="blog"
      title="Blog"
      email={account.email}
      intro={
        <>
          Every post, drafts included. Grokbot&apos;s posts appear here too. Published posts are live at{" "}
          <Link href={blogPath} className="font-semibold text-indigo underline underline-offset-4">
            recruiterlink.com/blog
          </Link>
          .
        </>
      }
      actions={<ButtonLink href={adminNewPostPath} variant="primary-small">New post</ButtonLink>}
    >
      {notice ? <Notice tone="success">{notice}</Notice> : null}

      <nav aria-label="Filter posts">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <li key={f.id}>
              <Link
                href={f.id === "all" ? adminBlogPath : `${adminBlogPath}?status=${f.id}`}
                aria-current={filter === f.id ? "page" : undefined}
                className={cx(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-4 text-[15px] font-bold",
                  filter === f.id ? "border-navy bg-navy text-white" : "border-line-strong bg-white text-navy hover:border-navy",
                )}
              >
                {f.label} <span className={filter === f.id ? "text-on-navy-muted" : "text-muted"}>{count(f.id)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {shown.length === 0 ? (
        <EmptyState
          title={posts.length === 0 ? "No posts yet" : "Nothing here"}
          description={
            posts.length === 0
              ? "Write the first post, or ask Grokbot to write one once it is connected."
              : "No posts match this filter."
          }
          action={{ label: "Write a post", href: adminNewPostPath }}
        />
      ) : (
        <ul className="divide-y-[1.5px] divide-line overflow-hidden rounded-panel border-[1.5px] border-line-mid bg-white">
          {shown.map((post) => (
            <li key={post.id} className="grid gap-x-6 gap-y-2 p-5 sm:p-6 md:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusPill status={post.status} />
                  <span className="text-[15px] text-muted">
                    {post.status === "published" ? "Published" : "Dated"} {formatShortDate(post.published_at)} ·{" "}
                    {post.words.toLocaleString("en")} words
                  </span>
                </div>
                <h2 className="mt-2 font-heading text-xl leading-snug font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere]">
                  <Link href={adminPostPath(post.id)} className="hover:text-indigo-deep hover:underline">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-1 text-[15px] break-all text-muted">/blog/{post.slug}</p>
                <p className="mt-1 text-[15px] text-muted">
                  Last change {adminDateTime(post.updated_at)} by {changedBy(post)}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-3 md:justify-end">
                <ButtonLink href={adminPostPath(post.id)} variant="outline">
                  Edit
                </ButtonLink>
                {post.status === "published" ? (
                  <a
                    href={blogPostPath(post.slug)}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-11 items-center px-2 text-base font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
                  >
                    View live<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

export default function AdminBlogPage({ searchParams }: PageProps<"/admin/blog">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <BlogAdmin searchParams={searchParams} />
    </Suspense>
  );
}
