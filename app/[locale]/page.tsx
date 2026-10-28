import GlassImage from "@/app/_components/GlassImage";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ContactLink from "@/app/_components/ContactLink";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SHOWCASE_PHOTOS, showcasePhotoAlt } from "@/lib/showcase-photos";
export const revalidate = 300;
export function generateStaticParams() { return routing.locales.map(locale => ({ locale })); }
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const h = await getTranslations({ locale, namespace: "home" });
  const t = await getTranslations({ locale, namespace: "home.landing" });
  const c = await getTranslations({ locale, namespace: "home.compact" });
  const categories = [
    { key: "kitchens", slug: "kitchens", image: SHOWCASE_PHOTOS.kitchens },
    { key: "wardrobes", slug: "wardrobes-storage", image: SHOWCASE_PHOTOS.wardrobes },
    { key: "commercial", slug: "commercial-spaces", image: SHOWCASE_PHOTOS.commercial },
    { key: "interiors", slug: "home-interiors", image: SHOWCASE_PHOTOS.interiors },
  ];
  return <main className="showcase-home">
    <section id="hero" data-section="hero" className="editorial-shell showcase-hero">
      <div className="showcase-meta"><span>KENCHO GROUP / {t("hero.metaLocation")}</span><span>01 — 04</span></div>
      <h1>{c("headline")}</h1>
      <div className="showcase-intro">
        <p data-hero-lead>{c("lead")}</p>
        <div className="showcase-hero-actions">
          <Link href="/gallery/kitchens" data-catalogue-cta className="editorial-link catalogue-cta-primary">
            <span>{t("hero.ctaKitchens")}</span>
          </Link>
          <Link href="/gallery" className="editorial-link catalogue-cta-secondary">
            <span>{h("allWork")}</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
      <GlassImage className="showcase-hero-image" src={SHOWCASE_PHOTOS.hero.src} alt={showcasePhotoAlt(SHOWCASE_PHOTOS.hero, locale)} loading="eager" fetchPriority="high" quality={90} sizes="(max-width: 1440px) 100vw, 1328px" />
    </section>
    <section id="categories" data-section="categories" className="editorial-shell showcase-section">
      <div className="section-intro">
        <span className="showcase-eyebrow">01 / {t("categories.eyebrow").split("/").pop()}</span>
        <div className="section-intro-head">
          <h2>{c("collections")}</h2>
          <Link href="/gallery" className="editorial-link catalogue-cta-primary">
            <span>{h("allWork")}</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
      <div className="showcase-collections">{categories.map((cat,index) => <Link key={cat.slug} href={`/gallery/${cat.slug}`} data-category-card={cat.slug} className="collection-exhibit group">
        <GlassImage className="collection-photo" src={cat.image.src} alt={showcasePhotoAlt(cat.image, locale)} quality={85} sizes="(max-width: 767px) 100vw, 55vw" imageClassName="group-hover:scale-[1.02]" />
        <div className="collection-label"><span>0{index+1}</span><h3 data-category-heading>{t(`categories.items.${cat.key}.title`)}</h3><span className="collection-arrow-pill" aria-hidden="true">↗</span></div>
      </Link>)}</div>
    </section>
    <section id="roadmap" data-section="roadmap" className="showcase-section timeline-banner">
      <div className="editorial-shell"><span className="showcase-eyebrow">02 / {c("processLink")}</span><div className="timeline-feature"><h2>{c("process")}</h2><div><p className="timeline-number">6–8<span>{locale === "ka" ? "კვირა" : locale === "ru" ? "недель" : "weeks"}</span></p><p>{c("timeNote")}</p><Link href="/process" className="editorial-link">{c("processLink")} ↗</Link></div></div>
      <ol className="timeline-preview">{["1","2","3","4","5"].map(step => <li key={step}><span>0{step}</span><h3>{t(`roadmap.steps.${step}.title`)}</h3></li>)}</ol></div>
    </section>
    <section id="ecosystem" data-section="ecosystem" className="editorial-shell showcase-section material-banner">
      <GlassImage className="material-photo" src={SHOWCASE_PHOTOS.materials.src} alt={showcasePhotoAlt(SHOWCASE_PHOTOS.materials, locale)} quality={85} sizes="(max-width:767px) 100vw, 50vw" />
      <div className="banner-copy"><span className="showcase-eyebrow">03 / {c("materialsLink")}</span><h2>{c("materials")}</h2><p>{c("materialsNote")}</p><Link href="/materials" className="editorial-link">{c("materialsLink")} ↗</Link></div>
    </section>
    <section id="pricing" data-section="pricing" className="editorial-shell showcase-section pricing-banner"><span className="showcase-eyebrow">04 / {c("pricingLink")}</span><h2>{c("pricing")}</h2><p>{c("pricingNote")}</p><Link href="/design-pricing" className="editorial-link">{c("pricingLink")} ↗</Link></section>
    <section id="faq" data-section="faq" className="editorial-shell showcase-section home-close"><h2>{c("contact")}</h2><div id="inquiry"><ContactLink method="whatsapp" about="Homepage project inquiry" className="editorial-link">{t("faq.ctaWhatsapp")} ↗</ContactLink><Link href="/faq" className="editorial-link">{c("faq")} ↗</Link></div></section>
  </main>;
}
