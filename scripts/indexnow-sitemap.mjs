// Sends every address in the live sitemaps to IndexNow (Bing, Yandex, Seznam,
// Naver) in one go: for the first submission, or after a bulk change to many
// pages. Day to day, pages announce themselves (see src/lib/indexnow.ts).
//
//   node scripts/indexnow-sitemap.mjs            sends everything
//   node scripts/indexnow-sitemap.mjs --dry-run  only counts the addresses
//
// It reads the live site, so the key file must already be live at
// https://recruiterlink.com/indexnow-key.txt.

const SITE = "https://recruiterlink.com";
const BATCH = 10_000;
const dryRun = process.argv.includes("--dry-run");

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));

async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered HTTP ${response.status}`);
  return response.text();
}

const key = await get(`${SITE}/indexnow-key.txt`).then((text) => text.trim(), () => "");
if (!/^[a-f0-9]{32}$/.test(key)) {
  console.error(`The key file is not live yet at ${SITE}/indexnow-key.txt. Nothing was sent.`);
  process.exit(1);
}

const files = locs(await get(`${SITE}/sitemap.xml`));
const urls = [];
for (const file of files) {
  const found = locs(await get(file));
  console.log(`${file}: ${found.length}`);
  urls.push(...found);
}
console.log(`Total: ${urls.length} addresses in ${files.length} files`);

if (!dryRun) {
  for (let from = 0; from < urls.length; from += BATCH) {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE).host,
        key,
        keyLocation: `${SITE}/indexnow-key.txt`,
        urlList: urls.slice(from, from + BATCH),
      }),
    });
    console.log(`Sent ${from + 1} to ${Math.min(from + BATCH, urls.length)}: HTTP ${response.status}`);
  }
}
