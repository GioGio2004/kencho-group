import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Contact, { Footer } from "@/app/_components/Contact";
import CustomCursor from "@/app/_components/CustomCursor";
import FAQ from "@/app/_components/FAQ";
import FocusRail, { type FocusProject } from "@/app/_components/FocusRail";
import PanoramaRail from "@/app/_components/PanoramaRail";
import IntroSequence from "@/app/_components/IntroSequence";
import JourneyRail from "@/app/_components/JourneyRail";
import Manifesto from "@/app/_components/Manifesto";
import MarqueeBand from "@/app/_components/MarqueeBand";
import Process from "@/app/_components/Process";
import Projects from "@/app/_components/Projects";
import Prologue from "@/app/_components/Prologue";
import ScrollFX from "@/app/_components/ScrollFX";
import Services from "@/app/_components/Services";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import StickyWhatsApp from "@/app/_components/StickyWhatsApp";
import { routing, type Locale } from "@/i18n/routing";
import { galleriesApi, pick } from "@/lib/convex-gallery";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/* The focus rail reads Convex, so home renders server-side per request
 * (fetchQuery opts out of static caching — same trade the gallery
 * routes already make): publish in the admin, appear here, no deploy. */

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /* Published galleries become the rail's projects — titles and
   * descriptions resolved to this locale here, so the client component
   * receives plain strings. */
  const [published, slugMeta, tGallery, tPanorama] = await Promise.all([
    fetchQuery(galleriesApi.listPublished, {}),
    fetchQuery(galleriesApi.listPublishedSlugs, {}),
    getTranslations({ locale, namespace: "gallery" }),
    getTranslations({ locale, namespace: "panorama" }),
  ]);
  const years = new Map(
    slugMeta.map((g) => [g.slug, new Date(g.createdAt).getFullYear()]),
  );
  const projects: FocusProject[] = [...published]
    .sort((a, b) => a.order - b.order)
    .filter((g) => g.cover?.url)
    .slice(0, 6)
    .map((g) => ({
      slug: g.slug,
      title: pick(g.title, locale as Locale),
      description: pick(g.description, locale as Locale),
      meta: `${tGallery("count", { count: g.imageCount })} · ${
        years.get(g.slug) ?? new Date().getFullYear()
      }`,
      coverUrl: g.cover!.url as string,
      coverAlt: pick(g.cover!.alt, locale as Locale),
    }));

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
          THE OPENING — a two-scene, pinned prologue (welcome on
          charcoal, made-in-Tbilisi on paper) with its own skip anchor.
          It replaced the walkthrough/editorial hero pair; the flip
          lands on sand, which is exactly what the manifesto opens on.
        */}
        <Prologue />
        <Manifesto />
        {/* Combo 11: the focus rail — the reference's "Our Trips"
            accordion, fed by the published galleries. */}
        <FocusRail projects={projects} />
        <Projects />
        {/* Combo 12: the panorama — a pinned lateral walk through
            three collections, closing on the workshop's word. */}
        <PanoramaRail
          projects={projects.slice(0, 3)}
          quote={{
            text: tPanorama("quote"),
            attribution: tPanorama("attribution"),
          }}
        />
        <Services />
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
