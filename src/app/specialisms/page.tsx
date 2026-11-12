import type { Metadata } from "next";
import {
  Breadcrumbs,
  Container,
  JsonLd,
  LinkList,
  PageIntro,
  PopularSearchLink,
  PricingBanner,
} from "@/components";
import { getSpecialisms } from "@/lib/directory";
import { forAgenciesPath, specialismPath, specialismsPath } from "@/lib/routes";
import { linkListJsonLd, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { genericLast, specialismHeading } from "@/lib/specialisms";

export const ensureStatic = "navigation";

export async function generateMetadata(): Promise<Metadata> {
  const specialisms = await getSpecialisms();
  return pageMetadata({
    title: "Recruitment agencies by specialism",
    description: `Find recruitment agencies by the sector they recruit for. ${specialisms.length} specialisms, from accounting and finance to telecommunications, each with the countries and cities where its agencies are.`,
    path: specialismsPath,
  });
}

export default async function SpecialismsPage() {
  // Alphabetical, with the two generic specialisms last.
  const specialisms = genericLast(await getSpecialisms());

  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: "Specialisms", href: specialismsPath },
          ]}
        />
      </Container>

      <PageIntro
        eyebrow={`${specialisms.length} specialisms`}
        title="Recruitment agencies by specialism"
        intro="Choose the sector you are hiring in or looking for work in, to see the countries and cities where its recruitment agencies are."
      />

      <section aria-label="All specialisms" className="py-10 sm:py-14">
        <Container>
          <LinkList>
            {specialisms.map((specialism) => (
              <PopularSearchLink
                key={specialism.id}
                label={specialismHeading(specialism)}
                count={specialism.agencyCount}
                href={specialismPath(specialism.slug)}
              />
            ))}
          </LinkList>
          <JsonLd
            data={linkListJsonLd(
              "Recruitment agencies by specialism",
              specialismsPath,
              specialisms.map((specialism) => ({
                name: specialismHeading(specialism),
                path: specialismPath(specialism.slug),
              })),
            )}
          />
        </Container>
      </section>

      <section className="pb-16 sm:pb-[88px]">
        <Container>
          <PricingBanner variant="compact" freeHref={forAgenciesPath} />
        </Container>
      </section>
    </>
  );
}
