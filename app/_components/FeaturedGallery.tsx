import Image from "next/image";
import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const cards = [
  { key: "living", image: "open-plan-kitchen-media-wall", slug: "kitchens", labels: { en: "LIVING ROOM", ka: "მისაღები ოთახი", ru: "ГОСТИНАЯ" }, alt: "Open-plan living room with a walnut media console, staircase and kitchen" },
  { key: "wardrobe", image: "oak-bedroom-wardrobe", slug: "wardrobes-storage", labels: { en: "WARDROBE", ka: "კარადა", ru: "ГАРДЕРОБ" }, alt: "Oak wardrobe and wall panels with a floating dressing table and red reading light" },
  { key: "hall", image: "commercial-reception-desk", slug: "commercial-spaces", labels: { en: "HALL", ka: "ჰოლი", ru: "ХОЛЛ" }, alt: "Curved marble reception desk with illuminated timber slats" },
  { key: "bedroom", image: "walnut-panel-bedroom", slug: "home-interiors", labels: { en: "BEDROOM", ka: "საძინებელი", ru: "СПАЛЬНЯ" }, alt: "Bedroom with a green feature wall, timber panels and custom bedside furniture" },
  { key: "kitchen", image: "walnut-upper-cabinets-kitchen", slug: "kitchens", labels: { en: "KITCHEN", ka: "სამზარეულო", ru: "КУХНЯ" }, alt: "Walnut upper kitchen cabinets over pale grey fronts and a white worktop" },
  { key: "bar", image: "green-island-kitchen", slug: "kitchens", labels: { en: "KITCHEN & BAR", ka: "სამზარეულო და ბარი", ru: "КУХНЯ И БАР" }, alt: "Green kitchen with oak cabinets, pendant lights and upholstered bar stools" },
] as const;

export default function FeaturedGallery({ locale }: { locale: Locale }) {
  return (
    <section id="categories" data-section="categories" className="featured-gallery" aria-label={locale === "ka" ? "ჩვენი ნამუშევრები" : locale === "ru" ? "Наши работы" : "Our work"}>
      {cards.map((card) => {
        const label = card.labels[locale];
        return (
          <Link key={card.key} href={`/gallery/${card.slug}`} className="featured-gallery-card" data-category-card={card.key} aria-label={label}>
            <Image src={`/furniture/${card.image}-tbilisi-kencho-group.webp`} alt={card.alt} fill sizes="(max-width: 600px) 100vw, 50vw" quality={90} className="featured-gallery-image" />
            <h2 className="featured-gallery-caption" data-category-heading aria-hidden="true">
              <svg className="featured-gallery-arrow" viewBox="0 0 32 24" fill="none" aria-hidden="true">
                <path d="M2 12h27M21 4l8 8-8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="featured-gallery-title">
                {Array.from(label).map((letter, index) => <span key={index} className="featured-gallery-letter" style={{ "--letter-index": index } as CSSProperties}>{letter === " " ? "\u00a0" : letter}</span>)}
              </span>
            </h2>
          </Link>
        );
      })}
    </section>
  );
}
