import type { Metadata } from "next";
import {
  Breadcrumbs,
  ButtonLink,
  Container,
  FaqList,
  PageIntro,
  PricingBanner,
  SectionHeading,
} from "@/components";
import {
  PREMIUM_MONTHLY_USD,
  PREMIUM_YEARLY_USD,
} from "@/components/PricingBanner";
import { getTotals } from "@/lib/directory";
import { forAgenciesPath, signInPath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const ensureStatic = "navigation";

const price = `$${PREMIUM_MONTHLY_USD} USD a month or $${PREMIUM_YEARLY_USD} USD a year`;

export const metadata: Metadata = pageMetadata({
  title: "List your recruitment agency: free and Premium listings",
  description: `A listing on RecruiterLink is free: a card in the directory and a detailed agency page. Premium adds images, video, team and leadership profiles and customer testimonials for ${price}.`,
  path: forAgenciesPath,
});

const faqs = [
  {
    question: "Is my agency already listed?",
    answer:
      "Quite possibly. RecruiterLink already lists thousands of agencies. You do not need to look for it: sign in with your work email address and, if a listing uses the same website as your email, it becomes yours to manage.",
  },
  {
    question: "What does a free listing include?",
    answer:
      "Your agency's card in the directory, shown on its city's page, and a detailed agency page with your description, specialisms, location and a link to your website.",
  },
  {
    question: "What does Premium add?",
    answer: `Premium adds images, video, team and leadership profiles and customer testimonials to your agency page, and Premium listings are shown first in their city's list. It costs ${price}.`,
  },
  {
    question: "How do I claim or add my agency?",
    answer:
      "Choose \"Sign in or list your agency\" on this page and enter your work email address. We email you a short code; there is no password. That confirms you work at the agency whose website matches your email address. If the agency is already listed, you can manage its listing straight away. If it is not, you fill in a short form and the RecruiterLink team checks it before it is published.",
  },
  {
    question: "What if I only have a personal email address, such as Gmail?",
    answer:
      "You can still sign in. A personal address cannot show where you work, so you tell us which agency is yours and the RecruiterLink team checks it by hand before linking the listing to you.",
  },
  {
    question: "Can I pay for Premium today?",
    answer:
      "Not yet. Online payment for Premium is still being built. Claim your free listing now and we will email everyone who manages a listing when Premium opens. Nothing is charged until then.",
  },
  {
    question: "How do I correct a mistake in my listing?",
    answer:
      "Sign in and edit it yourself: you can change the description, specialisms and logo at any time. To change your agency's name, website or location, contact the RecruiterLink team.",
  },
];

export default async function ForAgenciesPage() {
  const totals = await getTotals();

  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: "For agencies", href: forAgenciesPath },
          ]}
        />
      </Container>

      <PageIntro
        eyebrow="For recruitment agencies"
        title="List your recruitment agency on RecruiterLink"
        intro={`RecruiterLink is a directory of ${totals.agencyCount.toLocaleString("en")} recruitment agencies in ${totals.countryCount} countries, used by employers and job seekers to find the right agency. A listing is free. Premium is ${price}.`}
      />

      <section id="pricing" aria-label="Free and Premium listings" className="py-10 sm:py-12">
        <Container>
          <PricingBanner
            eyebrow="What a listing includes"
            headingLevel="h2"
            body="Every agency gets a card and a detailed page at no cost. Premium adds images, video, team and leadership profiles and customer testimonials, and is shown first in its city's list."
          />
        </Container>
      </section>

      <section id="register" aria-labelledby="register-heading" className="scroll-mt-6 py-10 sm:py-12">
        <Container>
          <div className="grid gap-x-14 gap-y-8 rounded-panel bg-pale p-6 sm:p-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
            <div className="min-w-0">
              <SectionHeading
                id="register-heading"
                title="Claim your listing or add your agency"
                size="sm"
                className="!mb-4"
              />
              <div className="flex flex-col gap-4 text-[17px] text-muted">
                <p>
                  It is one step for everyone. Sign in with your work email address and we
                  email you a short code: there is no password. If your agency is already
                  among the {totals.agencyCount.toLocaleString("en")} listed here, its listing
                  becomes yours to manage straight away. If it is not, you can add it.
                </p>
                <p>
                  Once you are in, you can update your description, specialisms and logo
                  yourself, at any time.
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-4 rounded-card bg-white p-6 sm:p-8">
              <ButtonLink href={signInPath} variant="primary" className="w-full">
                Sign in or list your agency
              </ButtonLink>
              <p className="text-[15px] text-muted">
                Free. Nothing is charged, and no card is needed. Premium upgrades open soon;
                we will email everyone who manages a listing when they do.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="faq-heading" className="pt-10 pb-16 sm:pb-[88px]">
        <Container width="narrow">
          <SectionHeading
            id="faq-heading"
            title="Listing your agency: questions and answers"
            size="sm"
            className="!mb-[18px]"
          />
          <FaqList items={faqs} />
        </Container>
      </section>
    </>
  );
}
