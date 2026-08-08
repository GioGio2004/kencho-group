import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ka", "ru", "en"],
  defaultLocale: "ka",
  // Georgian lives at /ka (not bare /) so hreflang and analytics stay clean.
  localePrefix: "always",
  /*
   * The middleware's automatic Link header advertised hreflang
   * alternates that CONTRADICT the ones in the HTML head: its
   * x-default pointed at the unprefixed path (e.g. /process), which
   * 307-redirects, while the head's x-default points at /ka. Crawlers
   * read both, so every page carried two different x-defaults — one
   * of them a redirect (flagged by the Ahrefs audit, 2026-08-09).
   * The head metadata (layout.tsx / lib/page-metadata.ts) is the
   * single source of truth; the header must stay off.
   */
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
