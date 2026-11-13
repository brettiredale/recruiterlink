/**
 * Page metadata and structured data (JSON-LD) builders. Every address in
 * them is absolute and on the canonical host (`siteUrl`).
 */
import type { Metadata } from "next";
import type { AgencyDetail, AgencySummary } from "@/lib/data";
import { robotsRule } from "./indexability";
import { agencyPath, cityPath, countryPath } from "./routes";
import { absoluteUrl, isIndexable, siteDescription, siteName, siteUrl } from "./site";
import { displaySpecialisms } from "./specialisms";

/** The share picture drawn by `src/app/opengraph-image.tsx`. */
const SHARE_IMAGE = {
  url: `${siteUrl}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: `${siteName}: the global directory of recruitment agencies`,
};

type PageMetadataInput = {
  /** Page title without the site name (the layout adds " | RecruiterLink"). */
  title: string;
  /** Use the title exactly as given, without the site name added. */
  absoluteTitle?: boolean;
  description: string;
  /** Canonical path of the page, e.g. "/spain/madrid". */
  path: string;
  /**
   * False for pages that should stay out of search results even after
   * launch (thin cities, search results, later pages of a list).
   */
  indexable?: boolean;
};

/** Title, description, canonical address, robots rule and sharing tags. */
export function pageMetadata({
  title,
  absoluteTitle = false,
  description,
  path,
  indexable = true,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = absoluteTitle ? title : `${title} | ${siteName}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    robots: robotsRule(indexable, isIndexable),
    openGraph: {
      type: "website",
      siteName,
      locale: "en",
      url,
      title: fullTitle,
      description,
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [SHARE_IMAGE.url],
    },
  };
}

/** For addresses that turn out not to be a page (the page then answers 404). */
export const notFoundMetadata: Metadata = { title: "Page not found" };

const ORGANIZATION_ID = `${siteUrl}/#organization`;
const WEBSITE_ID = `${siteUrl}/#website`;

/** Organization and WebSite (with its search box) for the home page. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: siteName,
        url: absoluteUrl("/"),
        description: siteDescription,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: siteName,
        url: absoluteUrl("/"),
        description: siteDescription,
        inLanguage: "en",
        publisher: { "@id": ORGANIZATION_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

const LOGO_BASE =
  "https://ipfjjrngsjixgbmkezzg.supabase.co/storage/v1/object/public/agency-logos/";

function agencyAddress(agency: Pick<AgencySummary, "city" | "country">) {
  return {
    "@type": "PostalAddress",
    ...(agency.city ? { addressLocality: agency.city.name } : {}),
    ...(agency.city?.regionCode ? { addressRegion: agency.city.regionCode } : {}),
    addressCountry: agency.country.name,
  };
}

/** ItemList of the agencies shown on a listing page, in page order. */
export function agencyListJsonLd(
  name: string,
  agencies: AgencySummary[],
  options: { path: string; total?: number; startPosition?: number } = { path: "/" },
) {
  const start = options.startPosition ?? 1;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: absoluteUrl(options.path),
    numberOfItems: options.total ?? agencies.length,
    itemListElement: agencies.map((agency, index) => ({
      "@type": "ListItem",
      position: start + index,
      item: {
        "@type": "EmploymentAgency",
        "@id": `${absoluteUrl(agencyPath(agency.slug))}#agency`,
        name: agency.name,
        url: absoluteUrl(agencyPath(agency.slug)),
        address: agencyAddress(agency),
        ...(agency.logoPath
          ? { image: LOGO_BASE + encodeURIComponent(agency.logoPath) }
          : {}),
      },
    })),
  };
}

/**
 * EmploymentAgency for an agency's own page. Only facts the database
 * holds: no ratings, reviews, founding dates or staff numbers.
 */
export function agencyJsonLd(agency: AgencyDetail, description: string) {
  const url = absoluteUrl(agencyPath(agency.slug));
  const specialisms = displaySpecialisms(agency.specialisms);
  return {
    "@context": "https://schema.org",
    "@type": "EmploymentAgency",
    "@id": `${url}#agency`,
    name: agency.name,
    // The agency's own website when we know it; this page describes it.
    url: agency.website ?? url,
    mainEntityOfPage: url,
    ...(description ? { description } : {}),
    ...(agency.logoPath
      ? {
          logo: LOGO_BASE + encodeURIComponent(agency.logoPath),
          image: LOGO_BASE + encodeURIComponent(agency.logoPath),
        }
      : {}),
    address: agencyAddress(agency),
    ...(agency.city
      ? {
          areaServed: {
            "@type": "City",
            name: agency.city.name,
            url: absoluteUrl(cityPath(agency.country.slug, agency.city.slug)),
          },
        }
      : {
          areaServed: {
            "@type": "Country",
            name: agency.country.name,
            url: absoluteUrl(countryPath(agency.country.slug)),
          },
        }),
    ...(specialisms.length > 0
      ? { knowsAbout: specialisms.map((specialism) => specialism.name) }
      : {}),
  };
}

/** ItemList of links (countries, cities, specialisms) on a browse page. */
export function linkListJsonLd(
  name: string,
  path: string,
  links: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: absoluteUrl(path),
    numberOfItems: links.length,
    itemListElement: links.map((link, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: link.name,
      url: absoluteUrl(link.path),
    })),
  };
}
