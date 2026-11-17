import "server-only";
import { CARD_SOURCES, type CardSource } from "@/lib/card-events";
import { getSupabaseSessionClient } from "@/lib/supabase/session";

export const STATS_PERIODS = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: null },
] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number]["id"];

export const STATS_SORTS = [
  { id: "views", label: "Most views" },
  { id: "clicks", label: "Most clicks" },
  { id: "ctr", label: "Best click rate" },
  { id: "name", label: "Name A to Z" },
] as const;
export type StatsSort = (typeof STATS_SORTS)[number]["id"];

export const STATS_PAGE_SIZE = 50;

export type ListingStatsQuery = {
  search: string;
  period: StatsPeriod;
  place: CardSource | null;
  sort: StatsSort;
  page: number;
};

export type ListingStatsRow = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  plan: "free" | "premium";
  status: string;
  is_claimed: boolean;
  city: string | null;
  country: string;
  views: number;
  clicks: number;
};

export type ListingStats = {
  total: number;
  sum_views: number;
  sum_clicks: number;
  rows: ListingStatsRow[];
};

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Reads the admin listings page's address into a checked query. */
export function listingStatsQuery(params: Params): ListingStatsQuery {
  const period = STATS_PERIODS.find((p) => p.id === one(params.period))?.id ?? "30";
  const sort = STATS_SORTS.find((s) => s.id === one(params.sort))?.id ?? "views";
  const placeParam = one(params.place);
  const place = (CARD_SOURCES as readonly string[]).includes(placeParam) ? (placeParam as CardSource) : null;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(one(params.page), 10) || 1));
  return { search: one(params.q).trim().slice(0, 120), period, place, sort, page };
}

/** The address for a query, leaving out the defaults. */
export function listingStatsHref(base: string, query: ListingStatsQuery, changes: Partial<ListingStatsQuery> = {}) {
  const q = { ...query, ...changes };
  const params = new URLSearchParams();
  if (q.search) params.set("q", q.search);
  if (q.period !== "30") params.set("period", q.period);
  if (q.place) params.set("place", q.place);
  if (q.sort !== "views") params.set("sort", q.sort);
  if (q.page > 1) params.set("page", String(q.page));
  const text = params.toString();
  return text ? `${base}?${text}` : base;
}

/** First UTC day counted for a period, as YYYY-MM-DD, or null for all time. */
export function periodStart(period: StatsPeriod, now = new Date()): string | null {
  const days = STATS_PERIODS.find((p) => p.id === period)?.days ?? null;
  if (days === null) return null;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));
  return start.toISOString().slice(0, 10);
}

/** Every listing matching the query, with views and clicks. Throws unless the person is a site admin. */
export async function getListingStats(query: ListingStatsQuery): Promise<ListingStats> {
  const since = periodStart(query.period);
  const { data, error } = await (await getSupabaseSessionClient()).rpc("admin_agency_card_stats", {
    search_text: query.search || undefined,
    since_day: since ?? undefined,
    place: query.place ?? undefined,
    sort_by: query.sort,
    page_size: STATS_PAGE_SIZE,
    page_offset: (query.page - 1) * STATS_PAGE_SIZE,
  });
  if (error) throw new Error(`Could not load listing stats: ${error.message}`);
  return data as unknown as ListingStats;
}

/** "4.2%", or "–" when there were no views. */
export function clickRate(views: number, clicks: number): string {
  if (views <= 0) return "–";
  const rate = (clicks / views) * 100;
  return `${rate >= 10 ? rate.toFixed(0) : rate.toFixed(1)}%`;
}
