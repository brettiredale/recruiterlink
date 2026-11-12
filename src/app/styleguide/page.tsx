import type { Metadata } from "next";
import {
  AgencyCard,
  AgencyGrid,
  Breadcrumbs,
  ButtonLink,
  CityHero,
  CityPillLink,
  Container,
  CountryTile,
  EmptyState,
  FaqList,
  FeaturedAgencyCard,
  LinkList,
  LogoImage,
  Pagination,
  PillGrid,
  PopularSearchLink,
  PremiumBadge,
  PricingBanner,
  SearchBox,
  SectionHeading,
  SiteFooter,
  SiteHeader,
  SpecialismChip,
} from "@/components";

/*
 * TEMPORARY showcase of every building block, for visual checking.
 * All data in this file is hard-coded sample data. Real pages must not copy
 * it: they get their data from the data layer. Delete this route before launch.
 */

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "navy", value: "#21174B", className: "bg-navy" },
  { name: "pink", value: "#FF3EB5", className: "bg-pink" },
  { name: "pink-text", value: "#C4127F", className: "bg-pink-text" },
  { name: "indigo", value: "#4C57E6", className: "bg-indigo" },
  { name: "lavender", value: "#EAEBFB", className: "bg-lavender" },
  { name: "pale", value: "#F6F7FE", className: "bg-pale" },
  { name: "cream", value: "#FFF7D9", className: "bg-cream" },
  { name: "pink-tint", value: "#FFE2F4", className: "bg-pink-tint" },
  { name: "muted", value: "#4B436D", className: "bg-muted" },
  { name: "line", value: "#E0E1F5", className: "bg-line" },
  { name: "line-mid", value: "#D5D6F2", className: "bg-line-mid" },
  { name: "line-strong", value: "#C9CBEF", className: "bg-line-strong" },
];

const featured = {
  name: "Digital Talent Agency",
  href: "/agencies/digital-talent-agency",
  city: "Barcelona",
  country: "Spain",
  logoFile: "c6516a03-d58f-40b9-8703-123d56caba21.jpg",
  summary: "Tech and digital hiring for fast-growing companies.",
  specialisms: ["Information Technology", "Web Development", "Digital Transformation"],
  note: "Premium profiles show images, video, team and leadership profiles, and customer testimonials.",
};

const topAgencies = [
  { name: "Empleos IT", city: "Madrid", premium: false, logoFile: "049ae8f8-c28a-4332-a615-c56c9ed6402f.jpg", specialisms: ["Software Development", "Cybersecurity"] },
  { name: "Blu Selection", city: "Barcelona", premium: true, logoFile: "79a0e91e-4f1f-404b-a928-c7babae63702.jpg", specialisms: ["Accounting & Finance", "Sales"] },
  { name: "Biorecruit Solutions", city: "Barcelona", premium: false, logoFile: "dec6c332-1dae-40da-992f-93534070015f.jpg", specialisms: ["Biotechnology", "Life Sciences"] },
  { name: "Clicktalent", city: "Madrid", premium: false, logoFile: "12211a19-058c-40f5-ad32-1d89715dd022.jpg", specialisms: ["Marketing", "Events"] },
];

const moreAgencies = [
  { name: "Abcon Executive Search", city: "Madrid", premium: true, logoFile: "107ebb27-50b7-46f8-b946-453ddc4e3f53.jpg", specialisms: ["Executive Search", "Renewable Energy"] },
  { name: "Go Hunters", city: "Málaga", premium: false, logoFile: "587ea86a-6b06-4ff9-b58b-e5726e0340fa.jpg", specialisms: ["Information Technology", "AI & Machine Learning"] },
  { name: "Acertto Talent Linkers", city: "Valencia", premium: false, logoFile: null, specialisms: ["Agritech", "Construction"] },
  { name: "Deeptech Recruitment", city: "Barcelona", premium: false, logoFile: null, specialisms: ["AI & Machine Learning", "Software"] },
  { name: "Brainhunters", city: "Barcelona", premium: false, logoFile: "this-file-does-not-exist.jpg", specialisms: ["Executive Search", "Information Technology"] },
  { name: "Claire Joster", city: "Madrid", premium: false, logoFile: "3c37247f-0514-40dc-96b8-a1a8705029ad.jpg", specialisms: ["Executive Search", "Banking"] },
  { name: "Ascott Recruitment", city: "Madrid", premium: false, logoFile: "cb06763e-5313-49fd-8439-d21f886933d9.jpg", specialisms: ["Hospitality & Tourism", "Aviation"] },
  { name: "Hiring IT", city: "Madrid", premium: false, logoFile: "eaaa6924-960c-46f4-8241-4678f2dcd18d.jpg", specialisms: ["Information Technology", "Web Development"] },
  { name: "Eurogalenus Executive Search and Selection International", city: "Sant Cugat del Vallès", premium: true, logoFile: null, specialisms: ["Executive Search", "Life Sciences", "Pharmaceuticals", "Healthcare & Medicine", "Biotechnology"] },
  { name: "Zenith", city: null, premium: false, logoFile: null, specialisms: [] },
];

const cities = [
  { name: "Madrid", count: 73 },
  { name: "Barcelona", count: 64 },
  { name: "Palma", count: 7 },
  { name: "Valencia", count: 4 },
  { name: "Málaga", count: 4 },
  { name: "Sant Cugat del Vallès", count: 4 },
  { name: "Pozuelo de Alarcón", count: 3 },
  { name: "Sevilla", count: 2 },
];

const specialisms = [
  { name: "Executive Search", count: 78 },
  { name: "Information Technology", count: 57 },
  { name: "Customer Service", count: 40 },
  { name: "Sales", count: 31 },
  { name: "Marketing & Communications", count: 26 },
  { name: "Education & Training", count: 22 },
  { name: "Software & Web Development", count: 21 },
  { name: "Engineering", count: 14 },
  { name: "Hospitality & Tourism", count: 13 },
  { name: "Legal", count: 12 },
  { name: "Healthcare & Medicine", count: 11 },
  { name: "Banking & Financial Services", count: 9 },
];

const filters = [
  { name: "Executive Search", count: 40 },
  { name: "Information Technology", count: 14 },
  { name: "Marketing & Communications", count: 10 },
  { name: "Engineering", count: 10 },
  { name: "Customer Service", count: 9 },
  { name: "Sales", count: 7 },
  { name: "Legal", count: 6 },
  { name: "Education & Training", count: 6 },
];

const searches = [
  "Executive search agencies in Madrid",
  "IT recruitment agencies in Barcelona",
  "Hospitality recruitment agencies in Palma",
  "Sales recruitment agencies in Madrid",
  "Marketing recruitment agencies in Barcelona",
  "Software developer recruiters in Málaga",
];

const citySpecialismLinks = [
  { label: "Executive search agencies in Madrid", count: 40 },
  { label: "IT recruitment agencies in Madrid", count: 14 },
  { label: "Marketing recruitment agencies in Madrid", count: 10 },
  { label: "Engineering recruitment agencies in Madrid", count: 10 },
  { label: "Customer service recruitment agencies in Madrid", count: 9 },
  { label: "Software and web development recruiters in Madrid", count: 5 },
];

const countries = [
  { name: "United States", count: 6655 },
  { name: "United Kingdom", count: 5754 },
  { name: "Netherlands", count: 2069 },
  { name: "Australia", count: 1829 },
  { name: "Germany", count: 1658 },
  { name: "Canada", count: 1378 },
  { name: "Switzerland", count: 806 },
  { name: "Sweden", count: 785 },
];

const faqs = [
  {
    question: "What is RecruiterLink?",
    answer:
      "RecruiterLink is a global directory of recruitment agencies. Search by city, country or specialism to find agencies that recruit for the roles you care about.",
  },
  {
    question: "How do I find a recruitment agency near me?",
    answer:
      "Type what you need into the search box, such as the kind of role and the city. You can also browse by city or by specialism.",
  },
  {
    question: "How much does it cost to list a recruitment agency?",
    answer:
      "A standard listing is free. A Premium listing costs $49 USD a month or $490 USD a year, and adds images, video, team and leadership profiles and customer testimonials.",
  },
];

const slug = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function Specimen({
  name,
  note,
  children,
  bleed = false,
}: {
  name: string;
  note?: string;
  children: React.ReactNode;
  bleed?: boolean;
}) {
  return (
    <section className="border-t border-line-mid py-10 sm:py-12">
      <Container>
        <p className="label-mono mb-1 text-[13px] text-pink-text">{name}</p>
        {note ? <p className="mb-6 max-w-[760px] text-[15px] text-muted">{note}</p> : <div className="mb-6" />}
      </Container>
      {bleed ? children : <Container>{children}</Container>}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="flex-1">
        <Container className="pt-6 pb-10">
          <p className="label-mono mb-2 text-[13px] text-pink-text">Temporary page</p>
          <h1 className="font-heading text-[clamp(2.25rem,4.6vw,3.5rem)] leading-[1.06] font-extrabold tracking-[-0.035em]">
            RecruiterLink style guide
          </h1>
          <p className="mt-3 max-w-[720px] text-lg text-muted">
            Every building block of the site with sample content, for checking
            on phone and desktop. The header above and the footer below are
            part of the showcase.
          </p>
        </Container>

        <Specimen name="Colours">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {swatches.map((swatch) => (
              <li key={swatch.name} className="overflow-hidden rounded-chip border border-line">
                <div className={`h-16 ${swatch.className}`} />
                <p className="px-3 py-2 text-sm font-semibold">
                  {swatch.name}
                  <span className="block font-mono text-xs font-normal text-muted">
                    {swatch.value}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </Specimen>

        <Specimen name="Type" note="Headings: Plus Jakarta Sans. Body: Inter. Small labels and counts: Space Mono.">
          <div className="flex flex-col gap-4">
            <p className="font-heading text-[clamp(2.375rem,4.6vw,4rem)] leading-[1.06] font-extrabold tracking-[-0.035em] text-balance">
              Find the perfect recruitment agency for your next hire or job search
            </p>
            <p className="font-heading text-[clamp(1.75rem,3vw,2.375rem)] leading-[1.15] font-extrabold tracking-[-0.03em]">
              Recruitment agencies in Spain by city
            </p>
            <p className="font-heading text-[22px] font-bold tracking-[-0.02em]">
              Abcon Executive Search · Málaga · Pozuelo de Alarcón
            </p>
            <p className="max-w-[660px] text-[21px] text-muted">
              Describe what you need and where. We will show you the agencies that fit.
            </p>
            <p className="max-w-[660px] text-[17px]">
              Body text in Inter at 17px. RecruiterLink is a global directory of
              recruitment agencies, searchable by city, country or specialism.
            </p>
            <p className="label-mono text-sm text-pink-text">If you are hiring · 73 agencies</p>
          </div>
        </Specimen>

        <Specimen name="ButtonLink and PremiumBadge" note="White text on pink only at 19px bold; smaller pink buttons use navy text.">
          <div className="flex flex-wrap items-center gap-4">
            <ButtonLink href="/for-agencies">Go Premium</ButtonLink>
            <ButtonLink href="/list-your-agency" variant="primary-small">
              List your agency
            </ButtonLink>
            <ButtonLink href="/login" variant="outline">
              Log in
            </ButtonLink>
            <ButtonLink href="/spain" variant="navy">
              See all 209 recruitment agencies in Spain
            </ButtonLink>
            <span className="on-dark rounded-chip bg-navy p-3">
              <ButtonLink href="/list-your-agency" variant="outline-light">
                Claim free listing
              </ButtonLink>
            </span>
            <PremiumBadge />
          </div>
        </Specimen>

        <Specimen name="SearchBox, hero variant" bleed>
          <div className="bg-[linear-gradient(to_bottom,rgba(76,87,230,0.24),rgba(76,87,230,0.03))] py-14 text-center sm:py-[72px]">
            <Container className="flex flex-col items-center gap-6">
              <p className="max-w-[1100px] font-heading text-[clamp(2.25rem,4.6vw,4rem)] leading-[1.06] font-extrabold tracking-[-0.035em] text-balance">
                Find the perfect recruitment agency for your next hire or job search
              </p>
              <p className="max-w-[660px] text-lg text-muted sm:text-[21px]">
                Describe what you need and where. We will show you the agencies that fit.
              </p>
              <SearchBox className="mt-1.5" />
              <ul className="flex flex-wrap justify-center gap-2.5">
                {["Tech recruiters in Barcelona", "Executive search in Madrid", "Hospitality staffing in Palma", "Sales recruiters in Valencia"].map(
                  (q) => (
                    <li key={q}>
                      <SpecialismChip
                        name={q}
                        href={`/search?q=${encodeURIComponent(q)}`}
                        variant="filter"
                        className="!border !text-[15px]"
                      />
                    </li>
                  ),
                )}
              </ul>
            </Container>
          </div>
        </Specimen>

        <Specimen name="SearchBox, compact variant (city page)">
          <SearchBox
            variant="compact"
            placeholder="Web design recruiters in Madrid"
            label="Describe the agency you are looking for in Madrid"
            formLabel="Search agencies in Madrid"
            hiddenFields={{ city: "madrid" }}
          />
        </Specimen>

        <Specimen name="SectionHeading, FeaturedAgencyCard, AgencyCard" note="Cards include: a logo, no logo (initials), a logo file that fails to load (falls back to initials), a very long name with many specialisms, and an agency with almost no details.">
          <SectionHeading
            size="lg"
            title="Featured recruitment agencies in Spain"
            action={{ label: "View all 209 agencies", href: "/spain" }}
          />
          <div className="grid gap-4 sm:gap-[22px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <FeaturedAgencyCard {...featured} />
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-[22px]">
              {topAgencies.map((agency) => (
                <AgencyCard
                  key={agency.name}
                  {...agency}
                  country="Spain"
                  href={`/agencies/${slug(agency.name)}`}
                />
              ))}
            </div>
          </div>
          <AgencyGrid className="mt-4 sm:mt-[22px]">
            {moreAgencies.map((agency) => (
              <AgencyCard
                key={agency.name}
                {...agency}
                country="Spain"
                href={`/agencies/${slug(agency.name)}`}
              />
            ))}
          </AgencyGrid>
          <p className="mt-9 text-center">
            <ButtonLink href="/spain" variant="navy">
              See all 209 recruitment agencies in Spain
            </ButtonLink>
          </p>
        </Specimen>

        <Specimen name="LogoImage" note="Sizes 112, 68 and 44. The placeholder colour is always the same for the same name.">
          <div className="flex flex-wrap items-end gap-4">
            <LogoImage name="Digital Talent Agency" file={featured.logoFile} size={112} />
            <LogoImage name="Empleos IT" file={topAgencies[0].logoFile} />
            {["Acertto Talent Linkers", "Deeptech Recruitment", "Brainhunters", "Good Talent", "Headfy", "Zenith", "Órbita RRHH", "4Talent"].map(
              (name) => (
                <LogoImage key={name} name={name} />
              ),
            )}
            <LogoImage name="Hubtalent" size={44} />
          </div>
        </Specimen>

        <Specimen name="CityPillLink">
          <SectionHeading
            title="Recruitment agencies in Spain by city"
            description="Every city has its own page listing all of its agencies."
          />
          <PillGrid>
            {cities.map((city) => (
              <CityPillLink key={city.name} {...city} href={`/spain/${slug(city.name)}`} />
            ))}
          </PillGrid>
        </Specimen>

        <Specimen name="SpecialismChip, chip variant">
          <SectionHeading title="Recruitment agencies in Spain by specialism" />
          <ul className="flex flex-wrap gap-3">
            {specialisms.map((s) => (
              <li key={s.name} className="max-w-full">
                <SpecialismChip {...s} href={`/spain/specialisms/${slug(s.name)}`} />
              </li>
            ))}
          </ul>
        </Specimen>

        <Specimen name="SpecialismChip, filter variant (city page)">
          <p className="label-mono mb-3 text-[13px] text-muted">Filter by specialism</p>
          <ul className="flex flex-wrap gap-2.5">
            <li>
              <SpecialismChip name="All 73" href="/spain/madrid" variant="filter" active />
            </li>
            {filters.map((f) => (
              <li key={f.name} className="max-w-full">
                <SpecialismChip {...f} href={`/spain/madrid/${slug(f.name)}`} variant="filter" />
              </li>
            ))}
          </ul>
        </Specimen>

        <Specimen name="PopularSearchLink">
          <SectionHeading title="Popular searches in Spain" />
          <LinkList>
            {searches.map((q) => (
              <PopularSearchLink key={q} label={q} href={`/search?q=${encodeURIComponent(q)}`} />
            ))}
          </LinkList>
          <div className="mt-10 rounded-panel bg-lavender px-5 pt-10 pb-9 sm:px-10 sm:pt-12 sm:pb-11 lg:px-14">
            <SectionHeading
              size="sm"
              title="Madrid recruitment agencies by specialism"
              description="Each of these has a page of its own."
            />
            <LinkList className="!grid-cols-[repeat(auto-fill,minmax(min(420px,100%),1fr))] gap-x-14">
              {citySpecialismLinks.map((s) => (
                <PopularSearchLink
                  key={s.label}
                  {...s}
                  tone="panel"
                  href={`/spain/madrid/${slug(s.label)}`}
                />
              ))}
            </LinkList>
          </div>
        </Specimen>

        <Specimen name="CountryTile">
          <div className="rounded-panel bg-lavender px-5 pt-10 pb-11 sm:px-10 sm:pt-12 sm:pb-[52px] lg:px-14">
            <SectionHeading
              title="Recruitment agencies around the world"
              description="25,640 agencies in 32 countries. Choose a country to browse its cities."
            />
            <PillGrid>
              {countries.map((country) => (
                <CountryTile key={country.name} {...country} href={`/${slug(country.name)}`} />
              ))}
            </PillGrid>
          </div>
        </Specimen>

        <Specimen name="Breadcrumbs and CityHero with a photo" note="The picture here is a stand-in drawing, not a real city photo.">
          <Breadcrumbs
            className="mb-2"
            baseUrl="https://www.recruiterlink.com"
            items={[
              { label: "Home", href: "/" },
              { label: "Spain", href: "/spain" },
              { label: "Madrid", href: "/spain/madrid" },
            ]}
          />
          <CityHero
            eyebrow="73 agencies · Spain"
            title="Recruitment agencies in Madrid"
            intro="Every recruitment agency we list in Madrid, whether you are hiring or looking for your next job."
            photo={{ src: "/styleguide/sample-city.jpg", alt: "Madrid skyline at sunset" }}
          />
        </Specimen>

        <Specimen name="CityHero without a photo (designed fallback)">
          {/* A page has one h1; this second hero exists only in the showcase. */}
          <CityHero
            eyebrow="1 agency · Spain"
            title="Recruitment agencies in Pozuelo de Alarcón"
            intro="Every recruitment agency we list in Pozuelo de Alarcón."
          />
        </Specimen>

        <Specimen name="Pagination" note="First page, a middle page of a long list, and the last page. On phones the numbers become “Page 2 of 7”.">
          <div className="flex flex-col gap-12">
            <Pagination
              currentPage={1}
              totalPages={7}
              basePath="/spain/madrid"
              summary="Showing 1 to 12 of 73 agencies"
              label="Agencies in Madrid, first example"
            />
            <Pagination
              currentPage={12}
              totalPages={48}
              basePath="/united-kingdom/london"
              summary="Showing 265 to 288 of 1,140 agencies"
              label="Agencies in London, second example"
            />
            <Pagination
              currentPage={7}
              totalPages={7}
              basePath="/spain/madrid"
              summary="Showing 73 to 73 of 73 agencies"
              label="Agencies in Madrid, third example"
            />
          </div>
        </Specimen>

        <Specimen name="EmptyState">
          <EmptyState
            title="No agencies match that search yet"
            description="Try a broader search, or browse every recruitment agency we list in Madrid."
            action={{ label: "Show all agencies in Madrid", href: "/spain/madrid" }}
            secondaryAction={{ label: "Browse other cities", href: "/spain" }}
          />
        </Specimen>

        <Specimen name="FaqList" bleed>
          <Container width="narrow">
            <SectionHeading title="Questions and answers" className="!mb-[18px]" />
            <FaqList items={faqs} />
          </Container>
        </Specimen>

        <Specimen name="PricingBanner, plans variant">
          <PricingBanner />
        </Specimen>

        <Specimen name="PricingBanner, compact variant (city page)">
          <PricingBanner variant="compact" heading="Run a recruitment agency in Madrid?" />
        </Specimen>
      </main>

      <SiteFooter year={2026} />
    </>
  );
}
