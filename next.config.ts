import type { NextConfig } from "next";
import { legacyRedirects } from "./src/lib/legacy-redirects";
import { isIndexable } from "./src/lib/site";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Logo uploads: files up to 1 MB, plus room for the form around them.
    serverActions: { bodySizeLimit: "2mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Agency logos and city photos live in our own Supabase storage
    // buckets (public read).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ipfjjrngsjixgbmkezzg.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/agency-logos/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "ipfjjrngsjixgbmkezzg.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/city-photos/**",
        search: "",
      },
    ],
  },
  async redirects() {
    return [
      // One address per page: the "www" form moves to the bare domain,
      // the form the old site's canonical links and sitemaps used.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.recruiterlink.com" }],
        destination: "https://recruiterlink.com/:path*",
        permanent: true,
      },
      // Every address the old site exposed (see src/lib/legacy-redirects.ts).
      ...legacyRedirects,
    ];
  },
  async headers() {
    if (isIndexable) return [];

    // Covers every response, including files that have no HTML <head>.
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
