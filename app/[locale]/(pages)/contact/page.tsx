import PageHeader from "@/app/_components/PageHeader";
import { JOURNEY_COPY } from "@/lib/journey-copy";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ProjectRequestForm from "@/app/_components/ProjectRequestForm";
import { routing, type Locale } from "@/i18n/routing";
import { IMAGES, src } from "@/lib/images";
import { pageMetadata } from "@/lib/page-metadata";
import { breadcrumbLd } from "@/lib/structured-data";

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
    image: src(IMAGES.heroMain),
  });
}

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const tNav = await getTranslations({ locale, namespace: "nav" });
  const request = await getTranslations({ locale, namespace: "request" });
  const journey = JOURNEY_COPY[locale];
  const breadcrumb = await breadcrumbLd(locale as Locale, {
    name: tNav("contact"),
    path: "/contact",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumb }}
      />
      <main className="request-page">
        <PageHeader meta={journey.requestLabel} title={request("title")} line={journey.requestNote} />
        <section className="request-page-layout">
          <aside className="request-page-intro">
            <h2>{journey.requestLabel}</h2>
            <ol>{journey.requestSteps.map((step, index) => <li key={step}><span>0{index + 1}</span>{step}</li>)}</ol>
          </aside>
          <div id="project-request" className="contact-form-card"><ProjectRequestForm /></div>
        </section>
      </main>
    </>
  );
}
