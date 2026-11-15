import { getPublishedPost, getRecentPosts } from "@/features/blog/data";
import {
  getCountries,
  getIndexableCities,
  getIndexableCitySpecialismPairs,
  getSpecialisms,
  getTotals,
} from "@/lib/directory";
import { homeFaqs } from "@/lib/faq";
import { cityLabel } from "@/lib/regions";
import { blogPostPath, cityPath, citySpecialismPath, countryPath, specialismPath } from "@/lib/routes";
import { absoluteUrl, siteUrl } from "@/lib/site";
import { withoutGeneric } from "@/lib/specialisms";

/** Articles printed in full. The newest come first. */
const MAX_ARTICLES = 40;

const count = (value: number) => value.toLocaleString("en");

/**
 * An article sits under a level 3 title here, so its own headings move two
 * levels down. Lines inside a code block are left alone.
 */
function demoteHeadings(markdown: string): string {
  let inCode = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (line.trimStart().startsWith("```")) inCode = !inCode;
      return !inCode && /^#{1,4} /.test(line) ? `##${line}` : line;
    })
    .join("\n");
}
const agencies = (value: number) => `${count(value)} ${value === 1 ? "agency" : "agencies"}`;

/**
 * The long plain-text guide for AI assistants: every country, specialism and
 * city page with its real agency count, and the blog articles in full. It
 * lists the same pages as the sitemaps (see `src/lib/indexability.ts`), so an
 * assistant is never sent to a page that search engines are told to skip.
 * The short version is /llms.txt.
 */
export async function GET() {
  const [totals, countries, specialisms, cities, pairs, summaries] = await Promise.all([
    getTotals(),
    getCountries(),
    getSpecialisms(),
    getIndexableCities(),
    getIndexableCitySpecialismPairs(),
    getRecentPosts(MAX_ARTICLES),
  ]);
  const posts = (await Promise.all(summaries.map((post) => getPublishedPost(post.slug)))).filter(
    (post) => post !== null,
  );

  const specialismBySlug = new Map(specialisms.map((item) => [item.slug, item]));
  const pairsByCity = new Map<string, string[]>();
  for (const pair of pairs) {
    const key = `${pair.countrySlug}/${pair.citySlug}`;
    const list = pairsByCity.get(key) ?? [];
    list.push(pair.specialismSlug);
    pairsByCity.set(key, list);
  }

  const countrySections = countries
    .filter((country) => country.agencyCount > 0)
    .map((country) => {
      const rows = cities
        .filter((city) => city.country.slug === country.slug)
        .sort((a, b) => b.agencyCount - a.agencyCount || a.name.localeCompare(b.name, "en"))
        .map((city) => {
          const links = (pairsByCity.get(`${country.slug}/${city.slug}`) ?? []).flatMap((slug) => {
            const specialism = specialismBySlug.get(slug);
            if (!specialism) return [];
            return [
              `[${specialism.name}](${absoluteUrl(citySpecialismPath(country.slug, city.slug, slug))})`,
            ];
          });
          return `- [${cityLabel(city)}](${absoluteUrl(cityPath(country.slug, city.slug))}): ${agencies(city.agencyCount)}${
            links.length > 0 ? `. By specialism: ${links.join(", ")}` : ""
          }`;
        });
      return `### ${country.name}

[Recruitment agencies in ${country.name}](${absoluteUrl(countryPath(country.slug))}): ${agencies(country.agencyCount)} in ${count(country.cityCount)} ${country.cityCount === 1 ? "city" : "towns and cities"}.
${rows.length > 0 ? `\n${rows.join("\n")}\n` : ""}`;
    });

  const text = `# RecruiterLink: full guide

> RecruiterLink is a global directory of recruitment agencies. It lists ${count(totals.agencyCount)} agencies in ${totals.countryCount} countries and ${count(totals.cityCount)} towns and cities, across ${totals.specialismCount} specialisms. Employers use it to find an agency for a hire; job seekers use it to find recruiters in their field. Every number in this file comes from the live database.

The short version of this file is ${siteUrl}/llms.txt. It explains how addresses are built.

## Common questions

${homeFaqs(totals)
  .map((faq) => `### ${faq.question}\n\n${faq.answer}`)
  .join("\n\n")}

## What each agency page contains

- The agency's name, city and country
- The specialisms (sectors) it is listed for
- A description of the agency
- A link to the agency's own website

RecruiterLink does not publish ratings, reviews or contact details for agencies, and does not recruit itself. To contact an agency, use the website link on its page. Each agency has one page at ${siteUrl}/agencies/<agency>. A city page lists every agency in that city, 24 per page.

## Specialisms worldwide

${withoutGeneric(specialisms)
  .filter((item) => item.agencyCount > 0)
  .map((item) => `- [${item.name}](${absoluteUrl(specialismPath(item.slug))}): ${agencies(item.agencyCount)}`)
  .join("\n")}

## Countries and cities

Cities with three or more agencies are listed, largest first, with the specialisms that have their own page in that city.

${countrySections.join("\n")}
${
  posts.length > 0
    ? `## Articles

${posts
  .map(
    (post) => `### ${post.title}

Address: ${absoluteUrl(blogPostPath(post.slug))}
Published: ${post.publishedAt.slice(0, 10)}${post.author ? `\nAuthor: ${post.author}` : ""}

${demoteHeadings(post.bodyMarkdown.trim())}`,
  )
  .join("\n\n---\n\n")}
`
    : ""
}`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
