import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AnalyticsScripts from "@/app/_components/AnalyticsScripts";
import { routing, type Locale } from "@/i18n/routing";
import { fontClassesFor } from "@/lib/fonts";
import { IMAGES, src } from "@/lib/images";
import { PALETTE, SITE } from "@/lib/site";
import "../globals.css";

/*
 * Runs before first paint. The intro overlay is only ever shown when JS
 * is alive to remove it, never to reduced-motion visitors, and only on
 * the first visit of a session.
 */
const loaderGuard = `try{var m=window.matchMedia("(prefers-reduced-motion: reduce)").matches,s=sessionStorage.getItem("alma:intro-seen");if(!m&&!s){document.documentElement.classList.add("is-loading")}}catch(e){}`;

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
  themeColor: PALETTE.sand,
  /*
   * Deliberately unset rather than "light". The page flips
   * <html data-surface="dark"> for the whole drawing interlude, so
   * declaring a fixed scheme tells the browser something that stops
   * being true a third of the way down.
   */
};

/** LocalBusiness (FurnitureStore) + per-locale FAQPage structured data. */
async function jsonLdFor(locale: Locale): Promise<string[]> {
  const t = await getTranslations({ locale, namespace: "faq" });
  const faqIds = ["pricing", "timeline", "materials", "commercial"] as const;

  const business = {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    name: SITE.name,
    url: `${SITE.url}/${locale}`,
    image: src(IMAGES.heroMain, 1200),
    telephone: SITE.phone,
    email: SITE.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressCountry: SITE.address.country,
    },
    // TODO: geo coordinates once confirmed with the client.
    // TODO: openingHoursSpecification once confirmed with the client.
    sameAs: [SITE.socials.facebook, SITE.socials.tiktok],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqIds.map((id) => ({
      "@type": "Question",
      name: t(`items.${id}.q`),
      acceptedAnswer: { "@type": "Answer", text: t(`items.${id}.a`) },
    })),
  };

  return [JSON.stringify(business), JSON.stringify(faq)];
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [businessLd, faqLd] = await jsonLdFor(locale as Locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fontClassesFor(locale as Locale)} antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
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
          dangerouslySetInnerHTML={{ __html: businessLd }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: faqLd }}
        />
        <script dangerouslySetInnerHTML={{ __html: loaderGuard }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <AnalyticsScripts />
      </body>
    </html>
  );
}
