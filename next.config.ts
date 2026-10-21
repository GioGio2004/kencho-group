import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  devIndicators: false,
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
    remotePatterns: [
      { protocol: "https", hostname: "**.convex.cloud" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    qualities: [50, 75, 85, 90],
  },
  /*
   * Routes retired by the catalogue rebuild (2026-10). They were in the
   * sitemap and may be indexed, so each one moves permanently to the
   * page that now answers the same question, instead of a 404.
   */
  async redirects() {
    const moved: Array<[string, string]> = [
      ["planner", "gallery"],
      ["projects", "gallery"],
      ["services", "gallery"],
      ["process", "about"],
    ];
    return moved.map(([from, to]) => ({
      source: `/:locale(ka|ru|en)/${from}`,
      destination: `/:locale/${to}`,
      permanent: true,
    }));
  },
};

export default withNextIntl(nextConfig);
