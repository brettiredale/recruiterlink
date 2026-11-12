import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  AgencyList,
  Breadcrumbs,
  Container,
  JsonLd,
  LogoImage,
  PremiumBadge,
  SectionHeading,
  buttonClasses,
} from "@/components";
import { ArrowRightIcon, PinIcon } from "@/components/icons";
import {
  getAgency,
  getFeaturedAgencies,
  getLegacyAgencySlug,
  getRelatedAgencies,
} from "@/lib/directory";
import {
  agencyPath,
  cityPath,
  citySpecialismPath,
  countryPath,
  isValidSlug,
  signInPath,
  specialismPath,
} from "@/lib/routes";
import { agencyJsonLd, notFoundMetadata, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { displaySpecialisms } from "@/lib/specialisms";
import { summarise, toParagraphs } from "@/lib/text";

export const ensureStatic = "navigation";

const RELATED = 8;

/** Built ahead of time: the featured agencies. The rest on first visit. */
export async function generateStaticParams() {
  const agencies = await getFeaturedAgencies(null, 13);
  return agencies.map((agency) => ({ slug: agency.slug }));
}

type Props = PageProps<"/agencies/[slug]">;

async function loadAgency(slug: string) {
  return isValidSlug(slug) ? getAgency(slug) : null;
}

function locationText(agency: { city: { name: string } | null; country: { name: string } }) {
  return agency.city && agency.city.name !== agency.country.name
    ? `${agency.city.name}, ${agency.country.name}`
    : agency.country.name;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const agency = await loadAgency(slug);
  if (!agency) return notFoundMetadata;
  const place = locationText(agency);
  const specialisms = displaySpecialisms(agency.specialisms)
    .slice(0, 3)
    .map((item) => item.name);
  return pageMetadata({
    title: `${agency.name}: recruitment agency in ${place}`,
    description:
      summarise(agency.introduction ?? agency.description, 158) ||
      `${agency.name} is a recruitment agency in ${place}${
        specialisms.length > 0 ? `, listed for ${specialisms.join(", ")}` : ""
      }. See its profile and website on RecruiterLink.`,
    path: agencyPath(agency.slug),
  });
}

export default async function AgencyPage({ params }: Props) {
  const { slug } = await params;
  const agency = await loadAgency(slug);

  if (!agency) {
    // An old-site address (/agencies/recruitment-...) moves for good to
    // the agency's new address. Anything else is not a page.
    const newSlug = isValidSlug(slug) ? await getLegacyAgencySlug(slug) : null;
    if (newSlug && newSlug !== slug) permanentRedirect(agencyPath(newSlug));
    notFound();
  }

  const { city, country } = agency;
  const place = locationText(agency);
  const premium = agency.plan === "premium";
  const specialisms = displaySpecialisms(agency.specialisms);
  const introduction = toParagraphs(agency.introduction);
  const description = toParagraphs(agency.description);
  const hasText = introduction.length + description.length > 0;
  const related =
    city && agency.cityId !== null
      ? await getRelatedAgencies(
          { id: agency.id, sortName: agency.sortName, cityId: agency.cityId },
          { slug: city.slug, countrySlug: country.slug },
          RELATED,
        )
      : [];
  const summary =
    summarise(agency.introduction ?? agency.description, 300) ||
    `${agency.name} is a recruitment agency in ${place}.`;

  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: country.name, href: countryPath(country.slug) },
            ...(city && city.name !== country.name
              ? [{ label: city.name, href: cityPath(country.slug, city.slug) }]
              : []),
            { label: agency.name, href: agencyPath(agency.slug) },
          ]}
        />
      </Container>

      <article>
        <header className="bg-[linear-gradient(to_bottom,rgba(76,87,230,0.18),rgba(76,87,230,0.02))] py-10 sm:py-14">
          <Container className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
            <LogoImage
              name={agency.name}
              file={agency.logoPath}
              size={112}
              eager
              className="max-sm:!h-[88px] max-sm:!w-[88px]"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {premium ? <PremiumBadge className="self-start" /> : null}
              <h1 className="font-heading text-[clamp(2rem,4.4vw,3.5rem)] leading-[1.06] font-extrabold tracking-[-0.035em] [overflow-wrap:anywhere] text-balance">
                {agency.name}
              </h1>
              <p className="flex flex-wrap items-center gap-x-1.5 text-lg font-semibold text-muted">
                <PinIcon className="shrink-0" />
                <span>Recruitment agency in</span>
                {city && city.name !== country.name ? (
                  <span>
                    <Link
                      href={cityPath(country.slug, city.slug)}
                      className="text-navy underline underline-offset-4 hover:text-indigo-deep"
                    >
                      {city.name}
                    </Link>
                    ,
                  </span>
                ) : null}
                <Link
                  href={
                    city && city.name === country.name
                      ? cityPath(country.slug, city.slug)
                      : countryPath(country.slug)
                  }
                  className="text-navy underline underline-offset-4 hover:text-indigo-deep"
                >
                  {country.name}
                </Link>
              </p>

              {specialisms.length > 0 ? (
                <ul aria-label="Specialisms" className="flex flex-wrap gap-2">
                  {specialisms.map((item) => (
                    <li key={item.slug} className="max-w-full">
                      <Link
                        href={
                          city
                            ? citySpecialismPath(country.slug, city.slug, item.slug)
                            : specialismPath(item.slug)
                        }
                        className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-white px-4 py-2 text-[15px] font-semibold text-navy hover:border-navy"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

              {agency.website ? (
                <p className="mt-1">
                  <a
                    href={agency.website}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className={buttonClasses("navy", "gap-2 max-sm:w-full")}
                  >
                    Visit {agency.domain ?? "website"}
                    <ArrowRightIcon />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </p>
              ) : null}
            </div>
          </Container>
        </header>

        <Container className="grid gap-x-14 gap-y-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="about-heading" className="min-w-0">
            <h2
              id="about-heading"
              className="mb-4 font-heading text-[clamp(1.625rem,2.8vw,2.125rem)] leading-[1.15] font-extrabold tracking-[-0.03em]"
            >
              About {agency.name}
            </h2>
            <div className="flex max-w-[720px] flex-col gap-4 text-[17px] text-muted">
              {introduction.map((paragraph, index) => (
                <p key={`intro-${index}`} className="text-lg text-navy sm:text-xl">
                  {paragraph}
                </p>
              ))}
              {description.map((paragraph, index) => (
                <p key={`description-${index}`}>{paragraph}</p>
              ))}
              {!hasText ? (
                <p>
                  {agency.name} is a recruitment agency in {place}. We do not
                  have a description for this agency yet.
                </p>
              ) : null}
            </div>
          </section>

          <aside
            aria-labelledby="claim-heading"
            className="self-start rounded-card bg-[linear-gradient(to_bottom_right,var(--color-cream),var(--color-pink-tint))] p-7"
          >
            <h2
              id="claim-heading"
              className="mb-2 font-heading text-[22px] leading-tight font-bold tracking-[-0.02em]"
            >
              Is this your agency?
            </h2>
            <p className="mb-5 text-base text-muted">
              Sign in with your work email address to manage this listing:
              update its description, specialisms and logo. It is free and
              takes a couple of minutes.
            </p>
            <Link href={signInPath} prefetch={false} className={buttonClasses("primary-small", "w-full")}>
              Claim this listing
            </Link>
          </aside>
        </Container>
      </article>

      {related.length > 0 && city ? (
        <section aria-labelledby="related-heading" className="pb-16 sm:pb-[88px]">
          <Container>
            <SectionHeading
              id="related-heading"
              title={`More recruitment agencies in ${city.name}`}
              size="sm"
              action={{
                label: `All agencies in ${city.name}`,
                href: cityPath(country.slug, city.slug),
              }}
            />
            <AgencyList agencies={related} />
          </Container>
        </section>
      ) : (
        <div className="h-8" />
      )}

      <JsonLd data={agencyJsonLd(agency, summary)} />
    </>
  );
}
