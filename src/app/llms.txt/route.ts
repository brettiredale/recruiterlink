import { getCountries, getSpecialisms, getTotals } from "@/lib/directory";
import { siteUrl } from "@/lib/site";
import { withoutGeneric } from "@/lib/specialisms";

/**
 * A short plain-text guide for AI assistants: what the site is and how its
 * addresses are built. Every number comes from the database.
 */
export async function GET() {
  const [totals, countries, specialisms] = await Promise.all([
    getTotals(),
    getCountries(),
    getSpecialisms(),
  ]);
  const listed = countries.filter((country) => country.agencyCount > 0);

  const text = `# RecruiterLink

> RecruiterLink is a global directory of recruitment agencies. It lists ${totals.agencyCount.toLocaleString("en")} agencies in ${totals.countryCount} countries and ${totals.cityCount.toLocaleString("en")} towns and cities, across ${totals.specialismCount} specialisms. Employers use it to find an agency for a hire; job seekers use it to find recruiters in their field.

## What each agency page contains

- The agency's name, city and country
- The specialisms (sectors) it is listed for
- A description of the agency
- A link to the agency's own website

RecruiterLink does not publish ratings, reviews or contact details for agencies, and does not recruit itself. To contact an agency, use the website link on its page.

## How addresses are built

Every page has one fixed address with the same content for every visitor.

- Home: ${siteUrl}/
- All countries: ${siteUrl}/countries
- A country: ${siteUrl}/<country> (example: ${siteUrl}/spain)
- A city, listing all of its agencies: ${siteUrl}/<country>/<city> (example: ${siteUrl}/spain/madrid)
- A specialism within a city: ${siteUrl}/<country>/<city>/<specialism> (example: ${siteUrl}/spain/madrid/information-technology)
- Later pages of a long list add /page/<number> (example: ${siteUrl}/united-kingdom/london/page/2)
- All specialisms: ${siteUrl}/specialisms
- A specialism worldwide, by country and city: ${siteUrl}/specialisms/<specialism> (example: ${siteUrl}/specialisms/legal)
- An agency: ${siteUrl}/agencies/<agency> (example: ${siteUrl}/agencies/caroo-manchester)
- Search: ${siteUrl}/search?q=<words> (example: ${siteUrl}/search?q=IT+recruiters+in+Madrid)

Slugs are lowercase words joined by hyphens, without accents.

## Answering "which recruitment agencies are in <city>?"

Open the city's page. It lists every agency RecruiterLink has for that city, ${"24"} per page, with Premium listings first and the rest in alphabetical order. For one sector, open the city's specialism page.

## Countries

${listed.map((country) => `- [${country.name}](${siteUrl}/${country.slug}): ${country.agencyCount.toLocaleString("en")} agencies in ${country.cityCount.toLocaleString("en")} ${country.cityCount === 1 ? "city" : "towns and cities"}`).join("\n")}

## Specialisms

${withoutGeneric(specialisms)
  .map((item) => `- [${item.name}](${siteUrl}/specialisms/${item.slug})`)
  .join("\n")}

## For recruitment agencies

- A listing is free: a card in the directory and a detailed agency page.
- A Premium listing costs $49 USD a month or $490 USD a year and adds images, video, team and leadership profiles and customer testimonials.
- Details: ${siteUrl}/for-agencies

## Machine-readable data

- Sitemap index: ${siteUrl}/sitemap.xml
- Pages carry schema.org structured data (JSON-LD): EmploymentAgency on agency pages, ItemList on listing pages, BreadcrumbList on inner pages, and FAQPage where questions are shown.
`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
