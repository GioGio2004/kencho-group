import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
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
