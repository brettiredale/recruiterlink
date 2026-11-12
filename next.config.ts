import type { NextConfig } from "next";
import { isIndexable } from "./src/lib/site";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Agency logos live in our own Supabase storage bucket (public read).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ipfjjrngsjixgbmkezzg.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/agency-logos/**",
        search: "",
      },
    ],
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
