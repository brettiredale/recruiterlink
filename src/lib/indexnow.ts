import { after } from "next/server";
import { absoluteUrl, isIndexable, siteUrl } from "./site";

/**
 * IndexNow tells Bing, Yandex, Seznam and Naver that a page is new or has
 * changed, so they read it within minutes instead of waiting for their next
 * visit. Bing's index also feeds ChatGPT search and Copilot. Google does not
 * take part.
 *
 * The key is public by design: it is served at /indexnow-key.txt, and that
 * root address lets it vouch for every page on the site.
 */
export const INDEXNOW_KEY = "43610f9d52f58fd8dec57945eafe00e1";

/** Addresses per request. The limit IndexNow accepts is 10,000. */
const BATCH = 10_000;

/** Sends full addresses to IndexNow. Returns the HTTP status of each request (200 or 202 = accepted). */
export async function sendToIndexNow(urls: string[]): Promise<number[]> {
  const statuses: number[] = [];
  for (let from = 0; from < urls.length; from += BATCH) {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(siteUrl).host,
        key: INDEXNOW_KEY,
        keyLocation: absoluteUrl("/indexnow-key.txt"),
        urlList: urls.slice(from, from + BATCH),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    statuses.push(response.status);
  }
  return statuses;
}

/**
 * Announces changed pages (paths such as "/blog/my-post") once the current
 * request has been answered. Call it from a Server Function or Route Handler
 * after a public page is added or changed. It never throws and never slows
 * the answer down. It does nothing on previews and local runs, so only the
 * live site ever speaks for recruiterlink.com.
 */
export function announcePages(paths: string[]): void {
  if (!isIndexable || paths.length === 0) return;
  after(async () => {
    try {
      const statuses = await sendToIndexNow(paths.map((path) => absoluteUrl(path)));
      if (statuses.some((status) => status !== 200 && status !== 202)) {
        console.error("[indexnow] not accepted:", statuses.join(","), paths.join(" "));
      }
    } catch (error) {
      console.error("[indexnow] failed:", error);
    }
  });
}
