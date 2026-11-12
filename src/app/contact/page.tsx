import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Container, PageIntro } from "@/components";
import { RequestForm } from "@/features/requests/RequestForm";
import { forAgenciesPath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const ensureStatic = "navigation";

export const metadata: Metadata = pageMetadata({
  title: "Contact RecruiterLink",
  description:
    "Send a message to the RecruiterLink team about the directory of recruitment agencies, a listing, or anything else.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: "Contact", href: "/contact" },
          ]}
        />
      </Container>
      <PageIntro
        title="Contact RecruiterLink"
        intro="Send us a message and the RecruiterLink team will reply by email."
      />
      <Container width="narrow" className="py-10 sm:py-14">
        <p className="mb-6 text-[17px] text-muted">
          Do you run a recruitment agency and want to claim or correct your
          listing?{" "}
          <Link
            href={forAgenciesPath}
            className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
          >
            Use the form for agencies
          </Link>{" "}
          instead. To reach an agency listed here, use the website link on its
          page: RecruiterLink does not pass messages on to agencies.
        </p>
        <div className="rounded-panel bg-pale p-5 sm:p-9">
          <h2 className="sr-only">Send a message</h2>
          <RequestForm mode="contact" source="/contact" />
        </div>
      </Container>
    </>
  );
}
