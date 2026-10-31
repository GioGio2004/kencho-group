import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  devIndicators: false,
  // Next 16 blocks dev assets/HMR for unlisted tunnel hosts, leaving the
  // server-rendered page visible but its buttons unable to hydrate.
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.dev",
    "*.ngrok.io",
    "d4e6-185-70-54-176.ngrok-free.app",
  ],
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
    ];
    return moved.map(([from, to]) => ({
      source: `/:locale(ka|ru|en)/${from}`,
      destination: `/:locale/${to}`,
      permanent: true,
    }));
  },
};

export default withNextIntl(nextConfig);
