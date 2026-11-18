import type { Metadata } from "next";
import Script from "next/script";
import { Breadcrumbs, Container, PageIntro } from "@/components";
import { recruitmentAgencyEventsPath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const ensureStatic = "navigation";

export const metadata: Metadata = pageMetadata({
  title: "Recruitment Agency Events",
  description:
    "Upcoming events for recruitment agencies: conferences, awards, meetups and webinars for agency recruiters and search firms.",
  path: recruitmentAgencyEventsPath,
});

// The Lovelio widget is a custom element that draws the live list itself.
// The link inside is what shows without JavaScript.
const WIDGET = `<lovelio-events><a href="https://lovelio.ai/recruitment-agency-events">Events by Lovelio</a></lovelio-events>`;

export default function RecruitmentAgencyEventsPage() {
  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: "Recruitment Agency Events", href: recruitmentAgencyEventsPath },
          ]}
        />
      </Container>
      <PageIntro
        title="Recruitment Agency Events"
        intro="Conferences, awards, meetups and webinars for people who run and work in recruitment agencies."
      />
      <Container className="py-10 sm:py-14">
        <div dangerouslySetInnerHTML={{ __html: WIDGET }} />
      </Container>
      <Script src="https://lovelio.ai/embed/events.js" strategy="afterInteractive" />
    </>
  );
}
