"use client";

import { useTranslations } from "next-intl";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const FALLBACK_COMMERCIAL =
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=85";

export default function ParallaxQuoteSection() {
  const t = useTranslations("home.era.quote");

  const sectionRef = useRef<HTMLElement>(null);
  const bgWrapRef = useRef<HTMLDivElement>(null);
  const quoteBoxRef = useRef<HTMLDivElement>(null);
  const [imgSrc, setImgSrc] = useState("/images/commercial-showcase.jpg");

  useGSAP(
    () => {
      const section = sectionRef.current;
      const bgWrap = bgWrapRef.current;
      const quoteBox = quoteBoxRef.current;

      if (!section || !bgWrap || !quoteBox) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Subtle vertical parallax on the full-bleed background image
        gsap.fromTo(
          bgWrap,
          { yPercent: -12, scale: 1.14 },
          {
            yPercent: 12,
            scale: 1.14,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );

        // Editorial pull-quote reveal
        gsap.fromTo(
          quoteBox,
          { y: 56, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 68%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="quote-banner"
      ref={sectionRef}
      data-hud-tone="light"
      aria-label={t("label")}
      className="relative h-screen w-full overflow-hidden bg-[#F2ECE3] text-[#FFFFFF] flex items-end"
    >
      {/* Full-bleed Architectural Showcase Image with Vertical Parallax */}
      <div
        ref={bgWrapRef}
        className="absolute inset-0 w-full h-full will-change-transform"
      >
        <Image
          src={imgSrc}
          alt={t("alt")}
          fill
          sizes="100vw"
          onError={() => setImgSrc(FALLBACK_COMMERCIAL)}
          className="object-cover object-center"
        />
      </div>

      {/* Light navy wash at the bottom, just enough for the white quote */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#2A2723]/55 via-[#2A2723]/15 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Lower-Right Floating Editorial Pull-Quote in Condensed White Didone Serif (Era 0:23 style) */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-8 sm:px-16 pb-16 sm:pb-24 grid grid-cols-1 lg:grid-cols-12 items-end">
        <div className="hidden lg:block lg:col-span-6" />

        <div ref={quoteBoxRef} className="lg:col-span-6 flex flex-col items-start">
          {/* Giant Opening Quote Mark */}
          <span
            className="font-era-display text-6xl sm:text-7xl leading-none text-[#FFFFFF]/90 mb-4 select-none"
            aria-hidden="true"
          >
            “
          </span>

          <blockquote
            className="font-era-display text-[clamp(1.5rem,2.6vw,2.45rem)] uppercase text-[#FFFFFF] tracking-[-0.015em] mb-12 indent-16"
            style={{ lineHeight: 1.32 }}
          >
            {t("quote")}
          </blockquote>

          <div
            className="flex flex-col gap-1 text-[10px] font-semibold tracking-[0.26em] uppercase text-[#FFFFFF]"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <span>{t("team")}</span>
            <span className="text-[#FFFFFF]/70">
              {t("workshop")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
