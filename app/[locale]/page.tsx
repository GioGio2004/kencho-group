import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import FixedHudFrame from "@/src/components/FixedHudFrame";
import HeroSection from "@/src/components/HeroSection";
import HorizontalConceptSection from "@/src/components/HorizontalConceptSection";
import CircleRevealSection from "@/src/components/CircleRevealSection";
import ParallaxQuoteSection from "@/src/components/ParallaxQuoteSection";
import ManifestoMapSection from "@/src/components/ManifestoMapSection";
import MaterialsIndexSection from "@/src/components/MaterialsIndexSection";
import EditorialSplitSection from "@/src/components/EditorialSplitSection";

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <main className="era-landing relative w-full bg-[#FFFFFF] text-[#2A2723] selection:bg-[#F2ECE3] selection:text-[#2A2723]">
      {/* Persistent Fixed Editorial HUD Frame */}
      <FixedHudFrame />

      {/* Section 1: Pale-Blue Opening, Rising Room & Interactive Hotspots */}
      <HeroSection />

      {/* Section 2: Pinned Horizontal Concept Journey & Rising Photograph */}
      <HorizontalConceptSection />

      {/* Section 3: Expanding Circular Mask Reveal & Room Carousel */}
      <CircleRevealSection />

      {/* Section 4: Architectural Parallax & Quote Banner */}
      <ParallaxQuoteSection />

      {/* Section 5: The Manifesto & Horizontal SVG Process Map */}
      <ManifestoMapSection />

      {/* Section 6: Materials Hover Index with Diagonal Photo Wipe */}
      <MaterialsIndexSection />

      {/* Section 7: Powder-Blue Editorial Split & Material Specs */}
      <EditorialSplitSection />
    </main>
  );
}
