import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import AudioGuide from "@/app/_components/AudioGuide";
import BeforeAfter from "@/app/_components/BeforeAfter";
import Contact, { Footer } from "@/app/_components/Contact";
import CustomCursor from "@/app/_components/CustomCursor";
import FAQ from "@/app/_components/FAQ";
import Hero from "@/app/_components/Hero";
import Manifesto from "@/app/_components/Manifesto";
import Process from "@/app/_components/Process";
import Projects from "@/app/_components/Projects";
import Services from "@/app/_components/Services";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import SocialProof from "@/app/_components/SocialProof";
import StickyWhatsApp from "@/app/_components/StickyWhatsApp";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <>
      <SmoothScroll />
      <CustomCursor />
      <SiteHeader />
      <StickyWhatsApp />
      <AudioGuide />

      <main>
        <Hero />
        <Manifesto />
        <BeforeAfter />
        <Services />
        <Projects />
        <Process />
        <SocialProof />
        <FAQ />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
