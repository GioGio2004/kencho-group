import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import AnalyticsScripts from "@/app/_components/AnalyticsScripts";
import ContactProvider from "@/app/_components/ContactProvider";
import Footer from "@/app/_components/Footer";
import MegaMenu from "@/app/_components/MegaMenu";
import MenuProvider from "@/app/_components/MenuProvider";
import ScrollRail from "@/app/_components/ScrollRail";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import Greeting from "@/app/_components/Greeting";
import { routing, type Locale } from "@/i18n/routing";
import { navigationChapters } from "@/lib/navigation-chapters";
import { brandFontClass, fontClassesFor } from "@/lib/fonts";
import { GREETING_BOOTSTRAP } from "@/lib/greeting";
import { IMAGES, src } from "@/lib/images";
import { PALETTE, SITE } from "@/lib/site";
import { businessLd } from "@/lib/structured-data";
import "../globals.css";

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
          url: src(IMAGES.heroMain),
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
      images: [src(IMAGES.heroMain)],
    },
    robots: { index: true, follow: true },
    /*
     * Bing Webmaster Tools ownership, belt and braces with
     * public/BingSiteAuth.xml (same ID). Layout metadata is inherited by
     * every page under it, so the tag rides on every URL.
     */
    verification: {
      google:
        process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ??
        process.env.GOOGLE_SITE_VERIFICATION,
      other: { "msvalidate.01": SITE.bingVerification },
    },
  };
}

export const viewport: Viewport = {
  themeColor: PALETTE.paper,
  colorScheme: "light",
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /* The business, on every route; and the catalogue's chapters, which
   * the menu and the footer both list. */
  const [business, chapters] = await Promise.all([
    businessLd(locale as Locale),
    navigationChapters(locale as Locale),
  ]);
  const chapterLinks = chapters;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fontClassesFor(locale as Locale)} antialiased`}
    >
      <head>
        <script id="kencho-greeting" dangerouslySetInnerHTML={{ __html: GREETING_BOOTSTRAP }} />
        {/* A raw script, not next/script: structured data must be in the
            server HTML. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: business }}
        />
      </head>
      <body>
        <NextIntlClientProvider>
          <MenuProvider>
            <ContactProvider>
              <Greeting fontClass={brandFontClass} />
              <div data-site-content>
                <SmoothScroll />
                <ScrollRail />
                <SiteHeader />
                <MegaMenu />
                <div id="main-content" tabIndex={-1}>{children}</div>
                <Footer locale={locale as Locale} chapters={chapterLinks} />
              </div>
            </ContactProvider>
          </MenuProvider>
        </NextIntlClientProvider>
        <AnalyticsScripts />
        {/* Vercel Web Analytics: cookieless; counts once "Web Analytics"
            is enabled on the Vercel project. No-op in local dev. */}
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
