import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import BeforeAfter from "@/app/_components/BeforeAfter";
import { Footer } from "@/app/_components/Contact";
import PageIntro from "@/app/_components/PageIntro";
import Projects from "@/app/_components/Projects";
import ScrollFX from "@/app/_components/ScrollFX";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import StickyWhatsApp from "@/app/_components/StickyWhatsApp";
import { routing, type Locale } from "@/i18n/routing";
import { IMAGES, src } from "@/lib/images";
import { pageMetadata } from "@/lib/page-metadata";
import { breadcrumbLd } from "@/lib/structured-data";

/*
 * THE PORTFOLIO as its own URL. The masonry and the before/after slider
 * are the same components the home page mounts; what this route adds is
 * a heading, a lede and an address a search result can point at.
 */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/projects">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return pageMetadata({
    locale,
    path: "/projects",
    namespace: "metaProjects",
    image: src(IMAGES.portfolio01, 1200),
  });
}

export default async function ProjectsPage({
  params,
}: PageProps<"/[locale]/projects">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "nav" });
  const breadcrumb = await breadcrumbLd(locale as Locale, {
    name: t("projects"),
    path: "/projects",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumb }}
      />
      <SmoothScroll />
      {/* The reused sections animate via [data-fx] — without this they
          hold their pre-reveal state. */}
      <ScrollFX />
      <SiteHeader />
      <StickyWhatsApp />
      <main>
        <PageIntro locale={locale as Locale} page="projects" />
        <BeforeAfter />
        <Projects />
      </main>
      <Footer />
    </>
  );
}
