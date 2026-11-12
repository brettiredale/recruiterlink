import type { Metadata } from "next";
import { Container, EmptyState } from "@/components";
import { countriesPath } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Container className="py-14 sm:py-20">
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        title="We could not find that page"
        description="The address may be mistyped, or the page may have moved. Try a search, or browse agencies by country."
        action={{ label: "Search agencies", href: "/search" }}
        secondaryAction={{ label: "Browse countries", href: countriesPath }}
      />
    </Container>
  );
}
