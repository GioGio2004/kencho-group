import Image from "next/image";
import { getTranslations } from "next-intl/server";
import ContactButton from "@/app/_components/ContactButton";
import WorkLink from "@/app/_components/WorkLink";
import { IMAGES, src } from "@/lib/images";
import type { Locale } from "@/i18n/routing";
export default async function Hero({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });
  return (
    <section id="introduction" className="home-hero home-shell" aria-labelledby="hero-heading">
      <div className="hero-copy" data-reveal>
        <p className="home-eyebrow">
          <span className="status-dot" aria-hidden="true" />
          {t("location")}
        </p>
        <h1 id="hero-heading">{t("title")}</h1>
        <p className="hero-intro">{t("intro")}</p>
        <div className="hero-actions">
          <ContactButton label={t("start")} />
          <WorkLink href="/#work" className="home-text-link">
            {t("view")} <span aria-hidden="true">↗</span>
          </WorkLink>
        </div>
      </div>
      <figure className="hero-picture">
        <div className="hero-picture-frame">
          <Image
            src={src(IMAGES.heroMain)}
            alt={t("heroAlt")}
            fill
            sizes="(max-width: 899px) 100vw, 57vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover"
          />
        </div>
        <figcaption>
          <span>{t("heroCaption")}</span>
          <span aria-hidden="true">01 — KENCHO</span>
        </figcaption>
      </figure>
      <ul className="hero-proof">
        {[1, 2, 3].map((i) => (
          <li key={i}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            {t("proof" + i)}
          </li>
        ))}
      </ul>
    </section>
  );
}
