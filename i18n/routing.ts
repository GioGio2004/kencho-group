import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ka", "ru", "en"],
  defaultLocale: "ka",
  // Georgian lives at /ka (not bare /) so hreflang and analytics stay clean.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
