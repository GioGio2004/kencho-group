import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ContactButton from "@/app/_components/ContactButton";
import { WhatsAppIcon } from "@/app/_components/ContactPanel";
import FaqList from "@/app/_components/FaqList";
import PageHeader from "@/app/_components/PageHeader";
import { routing, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/page-metadata";
import { whatsappUrl } from "@/lib/site";
import { breadcrumbLd } from "@/lib/structured-data";

/*
 * ABOUT — who we are, the owner showing a finished home, how a project
 * runs, and a word to the designers who bring most of the clients.
 */

const STEPS = ["s1", "s2", "s3", "s4", "s5"] as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return pageMetadata({
    locale,
    path: "/about",
    namespace: "metaAbout",
    image: "/video/hero-owner-poster.jpg",
  });
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [t, tProcess, tFaq, tNav, tContact, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "about" }),
    getTranslations({ locale, namespace: "process" }),
    getTranslations({ locale, namespace: "faq" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "contact" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const breadcrumb = await breadcrumbLd(locale as Locale, { name: tNav("about"), path: "/about" });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />
      <main>
        <PageHeader
          meta={t("heroMeta")}
          line={t("heroLine")}
          title={t("title")}
          image={{ src: "/video/hero-owner-poster.jpg", alt: t("videoTitle") }}
        />

        {/* WHO — and the owner's walk through a finished home. */}
        <section className="px-5 py-20 sm:px-8 lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12 lg:px-10 lg:py-28">
          <p className="u-meta text-mute">{t("eyebrow")}</p>
          <div>
            <p className="u-display max-w-[30ch] text-[clamp(1.6rem,2.8vw,2.6rem)]">{t("lede")}</p>
            <video
              className="mt-12 aspect-video w-full rounded-lg bg-sand object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/video/hero-owner-poster.jpg"
              aria-label={t("videoTitle")}
            >
              <source src="/video/hero-owner-mobile.mp4" type="video/mp4" media="(max-width: 767px)" />
              <source src="/video/hero-owner.mp4" type="video/mp4" />
            </video>
            <p className="mt-4 max-w-[52ch] text-[0.9375rem] text-mute">{t("videoNote")}</p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-t border-line px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12">
            <p className="u-meta text-mute">{tProcess("eyebrow")}</p>
            <div>
              <h2 className="u-display text-[clamp(2rem,4vw,3.4rem)]">{tProcess("title")}</h2>
              <ol className="mt-10 grid gap-px overflow-hidden rounded-lg bg-line sm:grid-cols-2 lg:grid-cols-5">
                {STEPS.map((id, i) => (
                  <li key={id} className="bg-paper p-6">
                    <span className="u-meta text-orange tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="u-display mt-6 text-[1.25rem]">{tProcess(`steps.${id}.title`)}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{tProcess(`steps.${id}.line`)}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-5 max-w-[60ch] text-[0.9375rem] text-mute">{tProcess("note")}</p>
            </div>
          </div>
        </section>

        {/* FOR DESIGNERS — most clients arrive with one. */}
        <section className="bg-grass px-5 py-20 text-ink sm:px-8 lg:px-10 lg:py-28">
          <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12">
            <p className="u-meta text-ink/70">{t("designersEyebrow")}</p>
            <div>
              <h2 className="u-display max-w-[18ch] text-[clamp(2rem,4.4vw,3.8rem)]">{t("designersTitle")}</h2>
              <p className="mt-6 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink/80">{t("designersText")}</p>
              <a
                href={whatsappUrl(tCommon("designerPrefill"))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ink mt-8"
              >
                <WhatsAppIcon />
                {t("designersCta")}
              </a>
            </div>
          </div>
        </section>

        {/* A FEW QUESTIONS — the rest live on /faq. */}
        <section className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12">
            <div>
              <p className="u-meta text-mute">{tFaq("eyebrow")}</p>
              <Link href="/faq" className="u-link mt-3 inline-block text-[0.9375rem]">
                {t("faqMore")} →
              </Link>
            </div>
            <FaqList locale={locale as Locale} limit={3} />
          </div>
        </section>

        {/* CLOSE */}
        <section className="bg-cream px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <h2 className="u-display max-w-[16ch] text-[clamp(2rem,4.4vw,3.8rem)]">{tContact("title")}</h2>
            <ContactButton label={tNav("getInTouch")} className="btn btn-orange" />
          </div>
        </section>
      </main>
    </>
  );
}
