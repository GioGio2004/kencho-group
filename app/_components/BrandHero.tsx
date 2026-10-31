import type { Locale } from "@/i18n/routing";

const tagline = {
  en: ["WE MAKE CUSTOM", "FURNITURE"],
  ka: ["ვამზადებთ შეკვეთით", "ავეჯს"],
  ru: ["МЫ СОЗДАЁМ МЕБЕЛЬ", "НА ЗАКАЗ"],
} as const;

export default function BrandHero({ locale }: { locale: Locale }) {
  const [lead, emphasis] = tagline[locale];
  return (
    <section id="hero" data-section="hero" data-hud-tone="ink" className="brand-hero" aria-labelledby="brand-hero-heading">
      <h1 id="brand-hero-heading" className="brand-hero-heading">
        <span className="brand-hero-prelude">we are</span>
        <span className="brand-hero-name">KENCHO</span>
        <span className="brand-hero-group">GROUP</span>
      </h1>
      <p className="brand-hero-tagline" data-hero-lead>
        <span>{lead}</span>{" "}<strong>{emphasis}</strong>
      </p>
    </section>
  );
}
