/**
 * Agency card views and clicks: the places a card can be seen, and the shape
 * the browser sends to /api/card-events. Shared by the browser tracker and
 * the server route, so it holds no secrets.
 */

export const CARD_SOURCES = ["search", "city", "country", "home", "related"] as const;
export type CardSource = (typeof CARD_SOURCES)[number];

export const CARD_SOURCE_LABELS: Record<CardSource, string> = {
  search: "Search results",
  city: "City pages",
  country: "Country pages",
  home: "Home page",
  related: "Similar agencies",
};

export type CardEventKind = "view" | "click";
export type CardEvent = { agency: string; source: CardSource; kind: CardEventKind };

export const CARD_EVENTS_PATH = "/api/card-events";
/** Most events one request may carry (the database takes 200). */
export const MAX_CARD_EVENTS = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCardSource(value: unknown): value is CardSource {
  return typeof value === "string" && (CARD_SOURCES as readonly string[]).includes(value);
}

/** Keeps only well-formed events, at most MAX_CARD_EVENTS. Returns null if the body is not a list. */
export function parseCardEvents(body: unknown): CardEvent[] | null {
  const list = Array.isArray(body) ? body : (body as { events?: unknown } | null)?.events;
  if (!Array.isArray(list)) return null;
  const events: CardEvent[] = [];
  for (const item of list) {
    if (events.length >= MAX_CARD_EVENTS) break;
    if (!item || typeof item !== "object") continue;
    const { agency, source, kind } = item as Record<string, unknown>;
    if (typeof agency !== "string" || !UUID.test(agency)) continue;
    if (!isCardSource(source)) continue;
    if (kind !== "view" && kind !== "click") continue;
    events.push({ agency: agency.toLowerCase(), source, kind });
  }
  return events;
}

/** Search engines, link previews, uptime checkers and scripts: never counted. */
const NOT_A_PERSON =
  /bot|crawl|spider|slurp|archiver|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|python|curl|wget|httpclient|okhttp|node-fetch|axios|go-http|java\/|phantomjs|puppeteer|playwright|selenium/i;

export function isProbablyBot(userAgent: string | null): boolean {
  return !userAgent || NOT_A_PERSON.test(userAgent);
}
