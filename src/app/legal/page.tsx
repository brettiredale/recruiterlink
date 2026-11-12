import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Container, PageIntro } from "@/components";
import { pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const ensureStatic = "navigation";

// A placeholder until the real documents exist, so it stays out of search results.
export const metadata: Metadata = pageMetadata({
  title: "Legal",
  description:
    "RecruiterLink's terms of use and privacy policy are being finalised and will be published on this page.",
  path: "/legal",
  indexable: false,
});

export default function LegalPage() {
  return (
    <>
      <Container>
        <Breadcrumbs
          baseUrl={siteUrl}
          items={[
            { label: "Home", href: "/" },
            { label: "Legal", href: "/legal" },
          ]}
        />
      </Container>
      <PageIntro title="Legal" />
      <Container width="narrow" className="flex flex-col gap-4 py-10 text-[17px] text-muted sm:py-14">
        <p>RecruiterLink is a global directory of recruitment agencies.</p>
        <p>
          Our terms of use and privacy policy are being finalised. They will be
          published on this page when they are ready.
        </p>
        <p>
          If you have a question in the meantime, including about information
          shown for an agency,{" "}
          <Link
            href="/contact"
            className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
          >
            contact us
          </Link>
          .
        </p>
      </Container>
    </>
  );
}
