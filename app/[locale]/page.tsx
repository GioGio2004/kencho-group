import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import Contact, { Footer } from "@/app/_components/Contact";
import CustomCursor from "@/app/_components/CustomCursor";
import FAQ from "@/app/_components/FAQ";
import GalleryRooms from "@/app/_components/GalleryRooms";
import Hero from "@/app/_components/Hero";
import IntroSequence from "@/app/_components/IntroSequence";
import JourneyRail from "@/app/_components/JourneyRail";
import Manifesto from "@/app/_components/Manifesto";
import MarqueeBand from "@/app/_components/MarqueeBand";
import Process from "@/app/_components/Process";
// import Projects from "@/app/_components/Projects";
import ScrollFX from "@/app/_components/ScrollFX";
import ServicesReel from "@/app/_components/ServicesReel";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import StickyWhatsApp from "@/app/_components/StickyWhatsApp";
import { routing, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /* The FAQPage schema lives on /faq with the section's own URL — one
   * FAQPage per site, on the page whose subject is the questions. The
   * section itself still renders below. */

  return (
    <>
      {/*
        THE PRELOADER, at page level rather than inside an opening — see
        the git history of this file for the bug that placement fixed.
        The Prologue waits for its `alma:loaded` before playing.
      */}
      <IntroSequence />
      <SmoothScroll />
      {/* Scans the document for [data-fx] and wires the scroll effects. */}
      <ScrollFX />
      <CustomCursor />
      <SiteHeader />
      {/* Where you are in the page, and how much of it is left. */}
      <JourneyRail />
      <StickyWhatsApp />

      <main>
        {/*
          THE OPENING — the scroll-scrubbed walkthrough, returned by the
          client's call: a WebP frame sequence painted to canvas as the
          visitor scrolls, four narrative beats overlaid as real DOM.
          The `id` lives on this wrapper (see the note in Hero.tsx).
        */}
        <div id="hero">
          <Hero />
        </div>
        <Manifesto />
        {/* <Projects /> */}
        {/* The doors to the gallery — four admin-managed rooms,
            floating over one photograph. */}
        <GalleryRooms locale={locale as Locale} />
        {/* The reel — the workshop footage running as the primary
            background while the section's scenes ride over it: the
            title panel, the service card slider, the light close. */}
        <ServicesReel />
        {/* A breather between services and process, moving at scroll speed. */}
        <MarqueeBand />
        <Process />
        <FAQ />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
