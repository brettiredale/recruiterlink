import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";
import { cacheLife } from "next/cache";
import Script from "next/script";
import { SiteFooter, SiteHeader } from "@/components";
import { robotsRule } from "@/lib/indexability";
import { isIndexable, siteDescription, siteName, siteUrl } from "@/lib/site";
import "./globals.css";

// Body text.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Headings and the wordmark.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Small uppercase labels and counts.
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | ${siteDescription}`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  // Pages set their own rule; this is the fallback (and covers error pages).
  robots: robotsRule(true, isIndexable),
  openGraph: { type: "website", siteName, locale: "en" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#21174B",
  width: "device-width",
  initialScale: 1,
};

/** The footer with the current year, refreshed daily rather than per visit. */
async function Footer() {
  "use cache";
  cacheLife("days");
  return <SiteFooter year={new Date().getFullYear()} />;
}

/**
 * Visitor statistics by Plausible (the owner's account; no cookies, no
 * personal data). Loaded only on the live site, so previews and local work
 * never add to the figures.
 */
function Analytics() {
  if (process.env.VERCEL_ENV !== "production") return null;
  return (
    <>
      <Script id="plausible-init" strategy="afterInteractive">
        {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
      </Script>
      <Script
        src="https://plausible.io/js/pa-M4OyjrooNNHgCJBNLSh4m.js"
        strategy="afterInteractive"
      />
    </>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
