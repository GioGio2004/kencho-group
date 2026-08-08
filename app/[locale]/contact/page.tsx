import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Contact, { Footer } from "@/app/_components/Contact";
import PageIntro from "@/app/_components/PageIntro";
import ScrollFX from "@/app/_components/ScrollFX";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import { routing, type Locale } from "@/i18n/routing";
import { IMAGES, src } from "@/lib/images";
import { pageMetadata } from "@/lib/page-metadata";
import { breadcrumbLd } from "@/lib/structured-data";

/* No StickyWhatsApp here: the whole page is the contact affordance. */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return pageMetadata({
    locale,
    path: "/contact",
    namespace: "metaContact",
    image: src(IMAGES.heroMain, 1200),
  });
}

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "nav" });
  const breadcrumb = await breadcrumbLd(locale as Locale, {
    name: t("contact"),
    path: "/contact",
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
      <main>
        <PageIntro locale={locale as Locale} page="contact" />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
