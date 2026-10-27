import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ContactPanel from "@/app/_components/ContactPanel";
import ContactLink from "@/app/_components/ContactLink";
import PageHeader from "@/app/_components/PageHeader";
import { routing, type Locale } from "@/i18n/routing";
import { IMAGES, src } from "@/lib/images";
import { pageMetadata } from "@/lib/page-metadata";
import { SITE } from "@/lib/site";
import { breadcrumbLd } from "@/lib/structured-data";

/*
 * /contact — the same panel as the "Get in touch" sheet, as a page of
 * its own: for a link in a bio, a search result, or a visitor without
 * JavaScript (WhatsApp and phone are ordinary links).
 */

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

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [tIntro, tNav, t] = await Promise.all([
    getTranslations({ locale, namespace: "pageIntro" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "contact" }),
  ]);
  const breadcrumb = await breadcrumbLd(locale as Locale, { name: tNav("contact"), path: "/contact" });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />
      <main>
        <PageHeader meta={tIntro("contact.eyebrow")} line={tIntro("contact.lede")} title={tIntro("contact.title")} />
        <section className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="grid gap-14 lg:grid-cols-[1fr_2fr] lg:gap-12">
            <div className="grid content-start gap-8 text-[1rem] lg:order-first">
              <div>
                <h2 className="u-meta text-mute">{t("addressLabel")}</h2>
                <p className="mt-2">{t("address")}</p>
                <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer" className="u-link mt-1 inline-block text-ink-2">
                  {t("mapCta")} →
                </a>
              </div>
              <div>
                <h2 className="u-meta text-mute">{t("phoneLabel")}</h2>
                <ContactLink method="phone" className="u-link mt-2 inline-block">{SITE.phone}</ContactLink>
              </div>
              <div>
                <h2 className="u-meta text-mute">{t("emailLabel")}</h2>
                <a href={`mailto:${SITE.email}`} className="u-link mt-2 inline-block">{SITE.email}</a>
              </div>
            </div>
            <div className="max-w-[32rem]">
              <ContactPanel />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
