import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Footer from "@/app/_components/Footer";
import FAQ from "@/app/_components/FAQ";
import PageIntro from "@/app/_components/PageIntro";
import ScrollFX from "@/app/_components/ScrollFX";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import StickyWhatsApp from "@/app/_components/StickyWhatsApp";
import { routing, type Locale } from "@/i18n/routing";
import { IMAGES, src } from "@/lib/images";
import { pageMetadata } from "@/lib/page-metadata";
import { breadcrumbLd, faqLd } from "@/lib/structured-data";

/*
 * THE FAQ as its own URL — and the one place the FAQPage schema is
 * emitted. Schema describes the page it is on; the home page still
 * shows the questions, but this route is their address, so a rich
 * result lands somewhere that is only questions and answers.
 */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return pageMetadata({
    locale,
    path: "/faq",
    namespace: "metaFaq",
    image: src(IMAGES.heroMain, 1200),
  });
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "nav" });
  const [breadcrumb, faq] = await Promise.all([
    breadcrumbLd(locale as Locale, { name: t("faq"), path: "/faq" }),
    faqLd(locale as Locale),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumb }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faq }}
      />
      <SmoothScroll />
      <ScrollFX />
      <SiteHeader />
      <StickyWhatsApp />
      <main>
        <PageIntro locale={locale as Locale} page="faq" />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
