import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ContactButton from "@/app/_components/ContactButton";
import FaqList from "@/app/_components/FaqList";
import PageHeader from "@/app/_components/PageHeader";
import { routing, type Locale } from "@/i18n/routing";
import { IMAGES, src } from "@/lib/images";
import { pageMetadata } from "@/lib/page-metadata";
import { breadcrumbLd, faqLd } from "@/lib/structured-data";

/* The questions, and the FAQPage schema that describes exactly them. */

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
    image: src(IMAGES.heroMain),
  });
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [tIntro, tNav] = await Promise.all([
    getTranslations({ locale, namespace: "pageIntro" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  const [faq, breadcrumb] = await Promise.all([
    faqLd(locale as Locale),
    breadcrumbLd(locale as Locale, { name: tNav("faq"), path: "/faq" }),
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faq }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />
      <main>
        <PageHeader meta={tIntro("faq.eyebrow")} line={tIntro("faq.lede")} title={tIntro("faq.title")} />
        <section className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12">
            <div className="hidden lg:block" />
            <div>
              <FaqList locale={locale as Locale} />
              <div className="mt-12">
                <ContactButton label={tNav("getInTouch")} className="btn btn-orange" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
