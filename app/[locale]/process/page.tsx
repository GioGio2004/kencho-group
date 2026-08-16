import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Footer from "@/app/_components/Footer";
import PageIntro from "@/app/_components/PageIntro";
import Process from "@/app/_components/Process";
import ScrollFX from "@/app/_components/ScrollFX";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import StickyWhatsApp from "@/app/_components/StickyWhatsApp";
import { routing, type Locale } from "@/i18n/routing";
import { IMAGES, src } from "@/lib/images";
import { pageMetadata } from "@/lib/page-metadata";
import { breadcrumbLd } from "@/lib/structured-data";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/process">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return pageMetadata({
    locale,
    path: "/process",
    namespace: "metaProcess",
    image: src(IMAGES.drawingReality, 1200),
  });
}

export default async function ProcessPage({
  params,
}: PageProps<"/[locale]/process">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "nav" });
  const breadcrumb = await breadcrumbLd(locale as Locale, {
    name: t("process"),
    path: "/process",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumb }}
      />
      <SmoothScroll />
      <ScrollFX />
      <SiteHeader />
      <StickyWhatsApp />
      <main>
        <PageIntro locale={locale as Locale} page="process" />
        <Process />
      </main>
      <Footer />
    </>
  );
}
