import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import AudioGuide from "@/app/_components/AudioGuide";
import BeforeAfter from "@/app/_components/BeforeAfter";
import Contact, { Footer } from "@/app/_components/Contact";
import CustomCursor from "@/app/_components/CustomCursor";
import Drawing from "@/app/_components/Drawing";
import FAQ from "@/app/_components/FAQ";
import Hero from "@/app/_components/Hero";
import HeroEditorial from "@/app/_components/HeroEditorial";
import JourneyRail from "@/app/_components/JourneyRail";
import Kinetic from "@/app/_components/Kinetic";
import Manifesto from "@/app/_components/Manifesto";
import MarqueeBand from "@/app/_components/MarqueeBand";
import Process from "@/app/_components/Process";
import Projects from "@/app/_components/Projects";
import ScrollFX from "@/app/_components/ScrollFX";
import Services from "@/app/_components/Services";
import Showcase from "@/app/_components/Showcase";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import SocialProof from "@/app/_components/SocialProof";
import StickyWhatsApp from "@/app/_components/StickyWhatsApp";
import { routing, type Locale } from "@/i18n/routing";
import { faqLd } from "@/lib/structured-data";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /* The FAQ lives on this page, so its schema does too. */
  const faq = await faqLd(locale as Locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faq }}
      />
      <SmoothScroll />
      {/* Scans the document for [data-fx] and wires the scroll effects. */}
      <ScrollFX />
      <CustomCursor />
      <SiteHeader />
      {/* Where you are in the page, and how much of it is left. */}
      <JourneyRail />
      <StickyWhatsApp />
      <AudioGuide />

      <main>
        {/*
          BOTH openings ship. CSS shows one, chosen by the attribute the
          boot script stamps before first paint — so the swap is an
          attribute rather than a re-render, and a crawler reads both.
        */}
        <div id="hero">
          <div data-hero-variant="cinematic">
            <Hero />
          </div>
          <div data-hero-variant="editorial">
            <HeroEditorial />
          </div>
        </div>
        <Manifesto />
        {/* The poster band — no photo, no price. It sits here so the
            visitor slows down before the first hard evidence. */}
        <Kinetic />
        <BeforeAfter />
        <Projects />
        {/* The sheet the workshop builds from, drawing itself. Sits on
            the seam between the portfolio and the services list — the
            only Services/portfolio boundary the page has. */}
        <Drawing />
        <Services />
        <Showcase />
        {/* A seam between two dark sections, moving at scroll speed. */}
        <MarqueeBand />
        <Process />
        <SocialProof />
        <FAQ />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
