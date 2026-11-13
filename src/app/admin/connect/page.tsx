import type { Metadata } from "next";
import { Suspense } from "react";
import { Panel } from "@/features/account/AccountShell";
import { SubmitButton } from "@/features/account/ui";
import { AdminLoading, AdminShell, adminDateTime } from "@/features/admin/AdminShell";
import { requireAdmin } from "@/features/admin/guard";
import { revokeApiKey } from "@/features/blog/admin-actions";
import { listApiKeys } from "@/features/blog/admin-data";
import { ConnectKeyForm } from "@/features/blog/ConnectKeyForm";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Connect Grokbot" };

const TOOLS: [string, string][] = [
  ["get_site_overview", "Reads the directory's numbers and real page addresses, so articles link to pages that exist."],
  ["list_blog_posts", "Lists every post, drafts included, so it never repeats a topic."],
  ["get_blog_post", "Reads one post in full."],
  ["create_blog_post", "Writes a new post, live at once or as a draft for you to check."],
  ["update_blog_post", "Changes a post. Setting it to draft takes it off the site."],
  ["delete_blog_post", "Deletes a post for good (only when you ask; a private copy is kept)."],
  ["upload_blog_image", "Stores a picture on RecruiterLink's own image storage, for covers and articles."],
];

async function Connect() {
  const account = await requireAdmin();
  const keys = await listApiKeys();
  const live = keys.filter((k) => !k.revoked_at);
  const revoked = keys.filter((k) => k.revoked_at);

  return (
    <AdminShell
      section="connect"
      title="Connect Grokbot"
      email={account.email}
      intro="Grokbot writes, changes and removes blog posts through a connector, the same way it works on the Brainy job boards. Make a key here, then add RecruiterLink to Grok as a custom connector using the address you are given."
    >
      <Panel
        title="1. Make a key"
        description="Each key works until you revoke it. Use one key per tool, so you can switch one off without affecting the others."
      >
        <ConnectKeyForm siteUrl={siteUrl} />
      </Panel>

      <Panel title="2. Add it to Grok" tone="cream">
        <ol className="flex list-decimal flex-col gap-3 pl-6 text-[17px]">
          <li>Open Grok where you set up Grokbot&apos;s connectors for the Brainy job boards.</li>
          <li>Add a new custom connector (MCP server) and name it “RecruiterLink blog”.</li>
          <li>Paste the connector address from step 1 as its address, and save.</li>
          <li>
            Ask Grokbot: “Using the RecruiterLink blog connector, call get_site_overview and list_blog_posts.” If it
            answers with RecruiterLink&apos;s numbers, it is connected.
          </li>
        </ol>
        <p className="mt-5 text-[17px] text-muted">
          When it connects, Grokbot receives RecruiterLink&apos;s house rules for articles (length, tone, linking,
          pictures and video, no invented facts), the same rules the Brainy boards use, written for recruitment
          agencies.
        </p>
      </Panel>

      <Panel title="Live keys">
        {live.length === 0 ? (
          <p className="text-[17px] text-muted">No live keys yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {live.map((key) => (
              <li
                key={key.id}
                className="flex flex-col gap-3 rounded-card border-[1.5px] border-line-mid bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-[15px] text-muted">
                  <p className="text-lg font-bold text-navy">{key.name}</p>
                  <p>
                    Starts <span className="font-mono text-navy">{key.key_prefix}…</span> · Made{" "}
                    {adminDateTime(key.created_at)} by <span className="break-all">{key.created_by}</span>
                  </p>
                  <p>Last used: {adminDateTime(key.last_used_at)}</p>
                </div>
                <form action={revokeApiKey}>
                  <input type="hidden" name="key_id" value={key.id} />
                  <SubmitButton pendingLabel="Revoking…" variant="outline">
                    Revoke
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        {revoked.length > 0 ? (
          <details className="mt-6 text-[15px] text-muted">
            <summary className="min-h-11 cursor-pointer content-center font-bold text-navy">
              Revoked keys ({revoked.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-1">
              {revoked.map((key) => (
                <li key={key.id}>
                  {key.name} ({key.key_prefix}…), revoked {adminDateTime(key.revoked_at)}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </Panel>

      <Panel title="What Grokbot can do">
        <dl className="grid gap-x-8 gap-y-3 text-[17px] sm:grid-cols-[auto_1fr]">
          {TOOLS.map(([name, what]) => (
            <div key={name} className="contents">
              <dt className="font-mono text-[15px] font-bold text-navy">{name}</dt>
              <dd className="text-muted">{what}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[15px] text-muted">
          Limits per key: 120 reads and 30 changes a minute, 600 changes a day. The same actions are available to
          other tools as a web API, described at{" "}
          <a href="/api/v1/openapi.json" className="font-semibold text-indigo underline underline-offset-4">
            /api/v1/openapi.json
          </a>
          .
        </p>
      </Panel>
    </AdminShell>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Connect />
    </Suspense>
  );
}
