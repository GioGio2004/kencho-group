import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ContactButton from "@/app/_components/ContactButton";
import { WhatsAppIcon } from "@/app/_components/ContactPanel";
import FaqList from "@/app/_components/FaqList";
import GlassImage from "@/app/_components/GlassImage";
import { SHOWCASE_PHOTOS, showcasePhotoAlt } from "@/lib/showcase-photos";
import { routing, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/page-metadata";
import ContactLink from "@/app/_components/ContactLink";
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
      <main className="about-page">
        <header className="about-intro">
          <p className="u-meta text-mute">{t("eyebrow")} / KENCHO GROUP</p>
          <div className="about-intro-grid">
            <h1 className="u-display about-title">{t("title")}</h1>
            <div className="about-intro-note">
              <p className="u-meta text-mute">{t("heroMeta")}</p>
              <p className="mt-6 leading-relaxed text-ink-2">{t("heroLine")}</p>
              <a href="#about-film" className="u-link mt-8 inline-block">{t("watchFilm")} ↘</a>
            </div>
          </div>
        </header>

        <figure id="about-film" className="about-film">
          <video
            className="aspect-video w-full bg-ink object-contain"
            controls
            playsInline
            preload="none"
            poster="/video/hero-owner-poster.jpg"
            aria-label={t("videoTitle")}
          >
            <source src="/video/hero-owner.mp4" type="video/mp4" />
            <a href="/video/hero-owner.mp4">{t("watchFilm")}</a>
          </video>
          <figcaption className="about-film-caption">
            <span className="u-meta">{t("videoTitle")}</span>
            <span className="max-w-[48ch] text-sm leading-relaxed text-mute">{t("videoNote")}</span>
          </figcaption>
        </figure>

        {/* WHO — and the owner's walk through a finished home. */}
        <section className="px-5 py-20 sm:px-8 lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12 lg:px-10 lg:py-28">
          <p className="u-meta text-mute">{t("eyebrow")}</p>
          <div>
            <p className="u-display max-w-[30ch] text-[clamp(1.6rem,2.8vw,2.6rem)]">{t("lede")}</p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="about-process" className="border-t border-line px-5 py-20 sm:px-8 lg:px-10 lg:py-28 scroll-mt-24">
          <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12">
            <p className="u-meta text-mute">{tProcess("eyebrow")}</p>
            <div>
              <h2 className="u-display text-[clamp(2rem,4vw,3.4rem)]">{tProcess("title")}</h2>
              <ol className="mt-10 divide-y divide-line border-t border-line">
                {STEPS.map((id, i) => (
                  <li key={id} className="grid grid-cols-[2rem_1fr] gap-x-4 py-7 sm:grid-cols-[2rem_1fr_1.5fr] sm:gap-x-6">
                    <span className="u-meta text-orange tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="u-display text-[1.5rem]">{tProcess(`steps.${id}.title`)}</h3>
                    <p className="col-start-2 mt-3 text-[0.9375rem] leading-relaxed text-ink-2 sm:col-start-auto sm:mt-0">{tProcess(`steps.${id}.line`)}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-5 max-w-[60ch] text-[0.9375rem] text-mute">{tProcess("note")}</p>
            </div>
          </div>
        </section>

        {/* FOR DESIGNERS — most clients arrive with one. */}
        <section className="bg-grass px-5 py-20 text-ink sm:px-8 lg:px-10 lg:py-28">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
            <GlassImage className="aspect-[4/5]" src={SHOWCASE_PHOTOS.materials.src} alt={showcasePhotoAlt(SHOWCASE_PHOTOS.materials, locale)} quality={85} sizes="(max-width: 1023px) 100vw, 50vw" />
            <div>
              <p className="u-meta mb-8 text-ink/70">{t("designersEyebrow")}</p>
              <h2 className="u-display max-w-[18ch] text-[clamp(2rem,4.4vw,3.8rem)]">{t("designersTitle")}</h2>
              <p className="mt-6 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink/80">{t("designersText")}</p>
              <ContactLink
                method="whatsapp"
                message={tCommon("designerPrefill")}
                className="btn btn-ink mt-8"
              >
                <WhatsAppIcon />
                {t("designersCta")}
              </ContactLink>
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
