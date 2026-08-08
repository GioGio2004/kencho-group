import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AnalyticsScripts from "@/app/_components/AnalyticsScripts";
import { routing, type Locale } from "@/i18n/routing";
import { fontClassesFor } from "@/lib/fonts";
import { IMAGES, src } from "@/lib/images";
import { PALETTE, SITE } from "@/lib/site";
import { businessLd } from "@/lib/structured-data";
import { THEME_BOOT } from "@/lib/theme";
import "../globals.css";

/*
 * Runs before first paint. The intro overlay is only ever shown when JS
 * is alive to remove it, never to reduced-motion visitors, and only on
 * the first visit of a session.
 *
 * AND ONLY ON A ROUTE THAT HAS AN INTRO. This guard is in the shared
 * layout, so it used to lock EVERY route under it — including the
 * planner, which renders no IntroSequence and therefore had nothing to
 * take the lock off again. Measured: a cold load of /en/planner left
 * `is-loading` set forever, Lenis stopped waiting on an `alma:loaded`
 * that never fired, and 574px of the page was unreachable until a 6s CSS
 * failsafe released it. It only failed for a visitor arriving from
 * search or a shared link — the exact visitor the route exists for.
 *
 * The home page is the locale segment alone (/ka, /ru, /en); anything
 * deeper is another route and must never be frozen by this.
 */
const loaderGuard = `try{var seg=location.pathname.split("/").filter(Boolean);if(seg.length<=1){var m=window.matchMedia("(prefers-reduced-motion: reduce)").matches,s=sessionStorage.getItem("alma:intro-seen");if(!m&&!s){document.documentElement.classList.add("is-loading")}}}catch(e){}`;

const OG_LOCALE: Record<Locale, string> = {
  ka: "ka_GE",
  ru: "ru_RU",
  en: "en_US",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "meta" });

  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE.url}/${l}`]),
  );

  return {
    metadataBase: new URL(SITE.url),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${SITE.url}/${locale}`,
      languages: { ...languages, "x-default": `${SITE.url}/ka` },
    },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title: t("title"),
      description: t("description"),
      url: `${SITE.url}/${locale}`,
      locale: OG_LOCALE[locale as Locale],
      images: [
        {
          url: src(IMAGES.heroMain, 1200),
          width: 1200,
          height: 630,
          alt: t("ogAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [src(IMAGES.heroMain, 1200)],
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  /*
   * Serialised into <meta> at build time, long before any stylesheet or
   * the boot script exists — so it cannot read `data-theme` and has to
   * answer with a media query instead. A visitor whose OS is dark gets
   * dark browser chrome on the very first frame, which is the same
   * promise the boot script makes about the page itself.
   *
   * A visitor who has explicitly chosen the theme that disagrees with
   * their OS gets chrome from the other one. That is a genuine gap and
   * it is the only one available: the tag is static, and the alternative
   * is a chrome colour that is wrong for everyone on dark.
   */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PALETTE.sand },
    { media: "(prefers-color-scheme: dark)", color: PALETTE.charcoalDeep },
  ],
  colorScheme: "light dark",
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /*
   * The BUSINESS only. The FAQPage used to be emitted here too, which
   * put it on every route under this layout — including a planner with
   * no questions on it anywhere. Structured data has to describe the
   * page carrying it, so the FAQ moved to the page that has the FAQ.
   */
  const business = await businessLd(locale as Locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fontClassesFor(locale as Locale)} antialiased`}
    >
      <head>
        {/*
         * Raw inline scripts, NOT next/script. <Script> defaults to the
         * afterInteractive strategy, which appends the tag from a passive
         * effect *after* hydration — too late for a pre-paint guard (Hero
         * reads `is-loading` in a layout effect, which always runs first,
         * so the whole first-visit intro would never play), and too late
         * for structured data to appear in the server-rendered HTML.
         */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: business }}
        />
        {/*
         * Theme first, and before everything else in this head that
         * could paint. It stamps <html data-theme> synchronously, which
         * is the only way to avoid a flash of the wrong surface — a
         * white flash on a dark-mode phone at night being the most
         * visible defect a theme system can ship.
         */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {/* HERO_BOOT retired with the walkthrough/editorial hero pair —
            the prologue is the one opening and needs no pre-paint pick. */}
        <script dangerouslySetInnerHTML={{ __html: loaderGuard }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <AnalyticsScripts />
      </body>
    </html>
  );
}
