import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components";
import { cx } from "@/components/cx";
import { inputClass } from "@/features/account/ui";
import { AdminLoading, AdminShell } from "@/features/admin/AdminShell";
import { requireAdmin } from "@/features/admin/guard";
import {
  STATS_PAGE_SIZE,
  STATS_PERIODS,
  STATS_SORTS,
  clickRate,
  getListingStats,
  listingStatsHref,
  listingStatsQuery,
} from "@/features/admin/listing-stats";
import { CARD_SOURCES, CARD_SOURCE_LABELS } from "@/lib/card-events";
import { adminListingsPath, agencyPath } from "@/lib/routes";

export const metadata: Metadata = { title: "Listings" };

const number = (n: number) => n.toLocaleString("en");
const selectClass = cx(inputClass, "py-2.5");
const labelClass = "text-[15px] font-bold text-navy";

async function ListingsAdmin({ searchParams }: { searchParams: PageProps<"/admin/listings">["searchParams"] }) {
  const [account, params] = await Promise.all([requireAdmin(), searchParams]);
  const query = listingStatsQuery(params);
  const stats = await getListingStats(query);
  const pages = Math.max(1, Math.ceil(stats.total / STATS_PAGE_SIZE));
  const first = stats.total === 0 ? 0 : (query.page - 1) * STATS_PAGE_SIZE + 1;
  const last = Math.min(stats.total, query.page * STATS_PAGE_SIZE);
  const periodLabel = STATS_PERIODS.find((p) => p.id === query.period)?.label.toLowerCase();

  return (
    <AdminShell
      section="listings"
      title="Listings"
      email={account.email}
      intro={
        <>
          Every agency listing. A <strong className="text-navy">view</strong> is the agency&apos;s card at least half on
          a visitor&apos;s screen; a <strong className="text-navy">click</strong> is a visitor opening it. Each counts once
          per card per page visit. Search engines and other robots are left out. Counting started on 17 November 2026.
        </>
      }
    >
      <form method="get" action={adminListingsPath} className="grid gap-4 rounded-panel border-[1.5px] border-line-mid bg-white p-5 sm:p-6 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Search</span>
          <input
            type="search"
            name="q"
            defaultValue={query.search}
            placeholder="Agency name or website"
            className={cx(inputClass, "py-2.5")}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Period</span>
          <select name="period" defaultValue={query.period} className={selectClass}>
            {STATS_PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Seen on</span>
          <select name="place" defaultValue={query.place ?? ""} className={selectClass}>
            <option value="">Everywhere</option>
            {CARD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {CARD_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Sort</span>
          <select name="sort" defaultValue={query.sort} className={selectClass}>
            {STATS_SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-btn bg-navy px-5 text-base font-bold text-white hover:bg-indigo-deep"
        >
          Show
        </button>
      </form>

      <dl className="grid grid-cols-3 gap-4">
        {[
          { label: query.search ? "Matching listings" : "Listings", value: number(stats.total) },
          { label: `Views, ${periodLabel}`, value: number(stats.sum_views) },
          { label: `Clicks, ${periodLabel}`, value: number(stats.sum_clicks) },
        ].map((item) => (
          <div key={item.label} className="rounded-panel border-[1.5px] border-line-mid bg-white p-4 sm:p-5">
            <dt className="text-[15px] text-muted">{item.label}</dt>
            <dd className="mt-1 font-heading text-2xl font-extrabold tracking-[-0.03em] text-navy sm:text-3xl">{item.value}</dd>
          </div>
        ))}
      </dl>

      {stats.rows.length === 0 ? (
        <EmptyState
          title="No listings match"
          description={query.search ? `Nothing matches “${query.search}”. Try part of the name or the website.` : "No listings yet."}
          action={{ label: "Clear the search", href: adminListingsPath }}
        />
      ) : (
        <div className="overflow-x-auto rounded-panel border-[1.5px] border-line-mid bg-white">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead className="border-b-[1.5px] border-line text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-bold">Agency</th>
                <th scope="col" className="px-3 py-3 text-right font-bold">Views</th>
                <th scope="col" className="px-3 py-3 text-right font-bold">Clicks</th>
                <th scope="col" className="px-5 py-3 text-right font-bold" title="Clicks as a share of views">Click rate</th>
              </tr>
            </thead>
            <tbody className="divide-y-[1.5px] divide-line">
              {stats.rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-5 py-3.5">
                    <a
                      href={agencyPath(row.slug)}
                      target="_blank"
                      rel="noopener"
                      className="font-bold text-navy hover:text-indigo-deep hover:underline [overflow-wrap:anywhere]"
                    >
                      {row.name}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    <p className="mt-0.5 text-muted">
                      {[row.city, row.country].filter(Boolean).join(", ")}
                      {row.domain ? ` · ${row.domain}` : ""}
                      {row.plan === "premium" ? " · Premium" : ""}
                      {row.is_claimed ? " · Claimed" : ""}
                      {row.status !== "published" ? ` · Not live (${row.status})` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3.5 text-right font-semibold text-navy tabular-nums">{number(row.views)}</td>
                  <td className="px-3 py-3.5 text-right font-semibold text-navy tabular-nums">{number(row.clicks)}</td>
                  <td className="px-5 py-3.5 text-right text-muted tabular-nums">{clickRate(row.views, row.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats.total > 0 ? (
        <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 text-[15px] text-muted">
          <p>
            {number(first)}–{number(last)} of {number(stats.total)}
          </p>
          <div className="flex gap-3">
            {query.page > 1 ? (
              <Link
                href={listingStatsHref(adminListingsPath, query, { page: query.page - 1 })}
                className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-line-strong bg-white px-4 font-bold text-navy hover:border-navy"
              >
                Previous
              </Link>
            ) : null}
            {query.page < pages ? (
              <Link
                href={listingStatsHref(adminListingsPath, query, { page: query.page + 1 })}
                className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-line-strong bg-white px-4 font-bold text-navy hover:border-navy"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </AdminShell>
  );
}

export default function AdminListingsPage({ searchParams }: PageProps<"/admin/listings">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ListingsAdmin searchParams={searchParams} />
    </Suspense>
  );
}
