import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Hero from "@/app/_components/Hero";
import Arrival from "@/app/_components/Arrival";
import HomeFilm from "@/app/_components/HomeFilm";
import HomeServices from "@/app/_components/HomeServices";
import DetailStrip from "@/app/_components/DetailStrip";
import HomeMotion from "@/app/_components/HomeMotion";
import ContactButton from "@/app/_components/ContactButton";
import ContactLink from "@/app/_components/ContactLink";
import { routing, type Locale } from "@/i18n/routing";
import { SITE } from "@/lib/site";
export const revalidate = 300;
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });
  const detailAlts = Array.from({ length: 7 }, (_, i) => t("detailAlts." + i));
  return (
    <main className="home">
      <HomeMotion />
      <Arrival />
      <Hero locale={locale as Locale} />
      <HomeFilm variant="walkthrough" />
      <HomeServices />
      <section
        id="approach"
        className="home-approach"
        aria-labelledby="approach-heading"
      >
        <div className="home-shell">
          <div className="section-heading" data-reveal>
            <div>
              <p className="home-eyebrow">{t("approachLabel")}</p>
              <h2 id="approach-heading">{t("approachTitle")}</h2>
            </div>
            <p className="section-intro">{t("approachIntro")}</p>
          </div>
          <div className="process-track" aria-hidden="true"><span /></div>
          <ol className="process-grid">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} data-reveal>
                <span className="process-number">0{i}</span>
                <h3>{t("steps." + i + ".title")}</h3>
                <p>{t("steps." + i + ".line")}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="home-details" aria-labelledby="details-heading">
        <div className="home-shell details-copy" data-reveal>
          <p className="home-eyebrow">{t("detailsLabel")}</p>
          <h2 id="details-heading">{t("detailsTitle")}</h2>
          <p className="section-intro">{t("detailsIntro")}</p>
        </div>
        <DetailStrip alts={detailAlts} />
      </section>
      <HomeFilm variant="people" />
      <section
        className="home-questions home-shell"
        aria-labelledby="questions-heading"
      >
        <div data-reveal>
          <p className="home-eyebrow">{t("questionsLabel")}</p>
          <h2 id="questions-heading">{t("questionsTitle")}</h2>
        </div>
        <div className="question-list">
          {[1, 2, 3].map((i) => (
            <details key={i}>
              <summary>
                {t("questions." + i + ".q")}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{t("questions." + i + ".a")}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="home-closing" aria-labelledby="closing-heading">
        <div className="home-shell" data-reveal>
          <p className="home-eyebrow">{t("closingLabel")}</p>
          <h2 id="closing-heading">{t("closingTitle")}</h2>
          <p>{t("closingIntro")}</p>
          <div className="closing-actions">
            <ContactButton label={t("start")} />
            <ContactLink method="phone" className="home-text-link">
              {SITE.phone} <span aria-hidden="true">↗</span>
            </ContactLink>
          </div>
          <div className="closing-wordmark" aria-hidden="true">KENCHO</div>
        </div>
      </section>
    </main>
  );
}
