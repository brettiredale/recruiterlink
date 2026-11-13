import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components";
import { AdminLoading, AdminShell, adminDateTime } from "@/features/admin/AdminShell";
import { requireAdmin } from "@/features/admin/guard";
import { listAdminPosts, listApiKeys } from "@/features/blog/admin-data";
import { adminBlogPath, adminConnectPath, adminNewPostPath, adminPostPath, reviewPath } from "@/lib/routes";

export const metadata: Metadata = { title: "Admin" };

function Tile({ title, children, href, cta }: { title: string; children: React.ReactNode; href: string; cta: string }) {
  return (
    <section className="flex flex-col rounded-panel border-[1.5px] border-line-mid bg-white p-6 sm:p-8">
      <h2 className="font-heading text-2xl font-extrabold tracking-[-0.03em]">{title}</h2>
      <div className="mt-3 flex-1 text-[17px] text-muted">{children}</div>
      <p className="mt-6">
        <ButtonLink href={href} variant="outline">
          {cta}
        </ButtonLink>
      </p>
    </section>
  );
}

async function Overview() {
  const account = await requireAdmin();
  const [posts, keys] = await Promise.all([listAdminPosts(), listApiKeys()]);
  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft");
  const liveKeys = keys.filter((k) => !k.revoked_at);
  const lastUsed = liveKeys.map((k) => k.last_used_at).filter(Boolean).sort().at(-1) ?? null;

  return (
    <AdminShell
      section="overview"
      title="Run RecruiterLink"
      email={account.email}
      actions={<ButtonLink href={adminNewPostPath} variant="primary-small">New blog post</ButtonLink>}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <Tile title="Blog" href={adminBlogPath} cta="Open the blog">
          <p>
            <strong className="text-navy">{published}</strong> published,{" "}
            <strong className="text-navy">{drafts.length}</strong> {drafts.length === 1 ? "draft" : "drafts"}.
          </p>
          {drafts.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1 text-base">
              {drafts.slice(0, 3).map((draft) => (
                <li key={draft.id} className="truncate">
                  Draft:{" "}
                  <Link href={adminPostPath(draft.id)} className="font-semibold text-indigo underline underline-offset-4">
                    {draft.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Tile>
        <Tile title="Grokbot" href={adminConnectPath} cta={liveKeys.length ? "Manage the connection" : "Connect Grokbot"}>
          {liveKeys.length === 0 ? (
            <p>Not connected yet. Make a key and add RecruiterLink to Grok as a connector.</p>
          ) : (
            <p>
              {liveKeys.length} live {liveKeys.length === 1 ? "key" : "keys"}. Last used: {adminDateTime(lastUsed)}.
            </p>
          )}
        </Tile>
        <Tile title="New listings" href={reviewPath} cta="Review new listings">
          <p>Listings sent in by agencies that are waiting for you to publish or turn down.</p>
        </Tile>
      </div>
    </AdminShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Overview />
    </Suspense>
  );
}
