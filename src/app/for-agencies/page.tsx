import type { Metadata } from "next";
import Link from "next/link";
import {
  Breadcrumbs,
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
import { RequestForm } from "@/features/requests/RequestForm";
import { getTotals } from "@/lib/directory";
import { forAgenciesPath, searchPath } from "@/lib/routes";
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
      "Quite possibly. RecruiterLink already lists thousands of agencies. Search for your agency's name to find its page, then use the form on this page to claim it.",
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
    question: "Can I sign up or pay today?",
    answer:
      "Not yet. Agency logins and online payment are still being built. Register your interest with the form on this page and the RecruiterLink team will email you when you can claim your listing or move to Premium. Nothing is charged until then.",
  },
  {
    question: "How do I correct a mistake in my listing?",
    answer:
      "Use the form on this page, choose to claim your listing, and tell us what needs to change in the message box.",
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
        <Container className="grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="min-w-0">
            <SectionHeading
              id="register-heading"
              title="Claim your listing or register your interest"
              size="sm"
              className="!mb-4"
            />
            <div className="flex flex-col gap-4 text-[17px] text-muted">
              <p className="rounded-card bg-[linear-gradient(to_bottom_right,var(--color-cream),var(--color-pink-tint))] p-6 text-navy">
                <strong>Agency logins and online payment are not open yet.</strong>{" "}
                This form does not create an account and nothing is charged. It
                records your request, and the RecruiterLink team will email you
                when you can claim your listing or move to Premium.
              </p>
              <p>
                Your agency may already be listed.{" "}
                <Link
                  href={searchPath}
                  className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
                >
                  Search for it by name
                </Link>{" "}
                and mention its page in your message, so we can match your
                request to the right listing.
              </p>
            </div>
          </div>
          <div className="min-w-0 rounded-panel bg-pale p-5 sm:p-9">
            <RequestForm mode="agency" source="/for-agencies" />
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
