import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  /*
   * Build stamp, inlined at compile time (config `env` values always
   * are). The sitemap uses it as <lastmod> for the hand-written routes:
   * before this it emitted `new Date()` on every request, and a lastmod
   * that changes with every fetch is one search engines learn to ignore
   * — Google says so outright, Bing behaves the same. A deploy is the
   * moment page copy can actually change, so the deploy time is the
   * honest lower bound. Convex galleries carry their own dates.
   */
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  images: {
    // Gallery photos are served from Convex file storage; "**" because
    // deployment hosts carry a region segment (e.g. name.eu-west-1).
    remotePatterns: [{ protocol: "https", hostname: "**.convex.cloud" }],
    // 50 exists for the FocusRail's pre-blurred layer (a tiny source
    // upscaled by the browser — blur without ever animating a filter).
    qualities: [50, 75],
  },
};

export default withNextIntl(nextConfig);
