"use client";

import { useTranslations } from "next-intl";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Link } from "@/i18n/navigation";
import ContactLink from "@/app/_components/ContactLink";

gsap.registerPlugin(ScrollTrigger);

const FALLBACK_WARDROBE =
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1400&q=85";

export default function ManifestoMapSection() {
  const t = useTranslations("home.era.manifesto");
  const sectionRef = useRef<HTMLElement>(null);
  const cornerFramesRef = useRef<HTMLDivElement>(null);
  const manifestoTextRef = useRef<HTMLHeadingElement>(null);
  const staggeredWordsRef = useRef<HTMLDivElement>(null);
  const magneticBtnRef = useRef<HTMLAnchorElement>(null);

  const [wardrobeSrc, setWardrobeSrc] = useState(
    "/images/wardrobe-showcase.jpg"
  );

  useGSAP(
    () => {
      const section = sectionRef.current;
      const cornerFrames = cornerFramesRef.current;
      const manifestoText = manifestoTextRef.current;
      const staggeredWords = staggeredWordsRef.current;

      if (!section) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        // Decorative corner elements parallax at 1.3x scroll speed
        if (cornerFrames) {
          const corners = cornerFrames.querySelectorAll("[data-corner-parallax]");
          gsap.fromTo(
            corners,
            { y: 90 },
            {
              y: -160,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            }
          );
        }

        // Manifesto text reveal
        if (manifestoText) {
          gsap.fromTo(
            manifestoText,
            { y: 45, opacity: 0.2 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: manifestoText,
                start: "top 85%",
                end: "top 35%",
                scrub: 0.6,
              },
            }
          );
        }

        // Diagonal staggered words horizontal drift (Era "NEW GOLDEN MILE" style)
        if (staggeredWords) {
          const rows = staggeredWords.querySelectorAll("[data-drift-word]");
          rows.forEach((row, idx) => {
            gsap.fromTo(
              row,
              { xPercent: idx % 2 === 0 ? -8 : 10, opacity: 0.35 },
              {
                xPercent: 0,
                opacity: 1,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: staggeredWords,
                  start: "top 85%",
                  end: "bottom 40%",
                  scrub: 0.6,
                },
              }
            );
          });
        }
      });

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  // Subtle magnetic hover handler for the Era thin-ring circle CTA
  const handleMagneticMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const el = magneticBtnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) * 0.25;
    const y = (e.clientY - (rect.top + rect.height / 2)) * 0.25;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const handleMagneticLeave = () => {
    const el = magneticBtnRef.current;
    if (!el) return;
    el.style.transform = "translate3d(0px, 0px, 0)";
  };

  return (
    <section
      id="process"
      ref={sectionRef}
      aria-labelledby="manifesto-heading"
      className="relative w-full bg-[#FFFFFF] text-[#2A2723] py-28 sm:py-40 overflow-hidden"
    >
      {/* Decorative Corner Architectural Framing Elements (Parallaxing at 1.3x Scroll Speed) */}
      <div
        ref={cornerFramesRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div
          data-corner-parallax
          className="hidden md:block absolute -top-8 -left-8 w-64 h-64 overflow-hidden opacity-90"
          style={{
            clipPath: "polygon(0 0, 100% 0, 65% 70%, 0 100%)",
          }}
        >
          <Image
            src="/furniture/fluted-oak-panel-detail-tbilisi-kencho-group.webp"
            alt=""
            fill
            sizes="260px"
            className="object-cover"
          />
        </div>

        <div
          data-corner-parallax
          className="hidden md:block absolute top-[34%] -right-10 w-60 h-72 overflow-hidden opacity-90"
          style={{
            clipPath: "polygon(35% 0, 100% 0, 100% 100%, 0 80%)",
          }}
        >
          <Image
            src="/furniture/travertine-kitchen-detail-tbilisi-kencho-group.webp"
            alt=""
            fill
            sizes="260px"
            className="object-cover"
          />
        </div>
      </div>

      {/* 1. Centered Manifesto Typography (Era 0:26 "THE CONCEPT" 1:1 Layout) */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 flex flex-col items-center text-center mb-36 sm:mb-48">
        <span
          className="text-[10px] font-semibold tracking-[0.28em] uppercase text-[#2A2723] mb-10"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {t("eyebrow")}
        </span>

        <h2
          id="manifesto-heading"
          ref={manifestoTextRef}
          className="font-era-display my-[1.6em] text-[clamp(2rem,4.3vw,4rem)] uppercase text-[#2A2723] tracking-[-0.02em] max-w-4xl"
          style={{ lineHeight: 1.28 }}
        >
          {/* my-[1.6em]: scaleY(1.35) grows the block ~17% past its box on
              each side, which used to run over the label and paragraph. */}
          {t("heading")}
        </h2>

        <p
          className="mt-16 max-w-xs text-xs leading-relaxed text-[#2A2723]/75 text-center"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {t("intro")}
        </p>

        {/* Central Geometric Ornament */}
        <div className="mt-10 text-[#2A2723]">
          <svg
            width="34"
            height="34"
            viewBox="0 0 40 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden="true"
          >
            <path d="M20 4 L24 16 L36 20 L24 24 L20 36 L16 24 L4 20 L16 16 Z" />
            <path d="M10 10 L17 17 M30 10 L23 17 M30 30 L23 23 M10 30 L17 23" />
            <circle cx="20" cy="20" r="2.5" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* 2. Staggered Stepping Display Typography ("NEW GOLDEN MILE" -> "TBILISI WORKSHOP CRAFT") */}
      <div
        ref={staggeredWordsRef}
        data-manifesto-display
        className="relative z-10 mx-auto max-w-6xl px-6 mb-24 sm:mb-32 flex flex-col items-center"
      >
        <div
          data-drift-word
          className="font-era-display text-[clamp(4rem,10.5vw,9.6rem)] text-[#2A2723] -ml-16 sm:-ml-36"
        >
          {t("city")}
        </div>{" "}

        <div
          data-drift-word
          className="flex flex-wrap justify-center items-center gap-x-4 gap-y-6 sm:gap-16 my-4 sm:my-6 max-w-full"
        >
          <span
            className="text-xs sm:text-sm font-normal tracking-[0.55em] uppercase text-[#2A2723]/80"
            style={{ fontFamily: "var(--font-bodoni), Georgia, serif" }}
          >
            {t("country")}
          </span>{" "}
          <span className="font-era-display text-[clamp(4rem,10.5vw,9.6rem)] text-[#2A2723]/85">
            {t("workshop")}
          </span>
        </div>{" "}

        <div
          data-drift-word
          className="font-era-display text-[clamp(4rem,10.5vw,9.6rem)] text-[#2A2723]/55 -ml-8 sm:-ml-20"
        >
          {t("craft")}
        </div>
      </div>

      {/* 3. Asymmetric Split Editorial Block (Left Flush Portrait + Center Thin Circle CTA + Lower Copy) */}
      <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-end mb-20 sm:mb-28">
        {/* Far-Left Flush Portrait Image (/images/wardrobe-showcase.jpg) — Zero Frame Box */}
        <div className="lg:col-span-3 relative aspect-[3/4.8] w-64 sm:w-72 lg:w-full overflow-hidden">
          <Image
            src={wardrobeSrc}
            alt={t("wardrobeAlt")}
            fill
            sizes="(max-width: 1024px) 288px, 25vw"
            onError={() => setWardrobeSrc(FALLBACK_WARDROBE)}
            className="object-cover"
          />
        </div>

        {/* Center Editorial Column: Thin-Ring Magnetic Circle CTA + Bottom Left Copy */}
        <div className="lg:col-span-5 px-6 sm:px-10 flex flex-col items-start justify-between gap-20">
          {/* Era Residence Thin-Ring Circular Magnetic Button (SEND DRAWINGS ON WHATSAPP) */}
          <div className="self-center lg:self-end lg:mr-8">
            <ContactLink
              ref={magneticBtnRef}
              method="whatsapp"
              message={t("whatsappPrefill")}
              onMouseMove={handleMagneticMove}
              onMouseLeave={handleMagneticLeave}
              aria-label={t("sendLabel")}
              className="group relative flex items-center justify-center w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-[#2A2723]/12 transition-transform duration-200 ease-out"
            >
              {/* Two thin dark perimeter arc ticks exactly like Era Residence */}
              <svg
                viewBox="0 0 240 240"
                className="absolute inset-0 w-full h-full group-hover:rotate-45 transition-transform duration-700"
                aria-hidden="true"
              >
                <circle
                  cx="120"
                  cy="120"
                  r="119"
                  fill="none"
                  stroke="#2A2723"
                  strokeWidth="1.2"
                  strokeDasharray="28 345"
                  strokeDashoffset="40"
                />
              </svg>

              <span
                className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#2A2723] text-center leading-relaxed"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {t("sendDrawings")}
                <br />{" "}
                {t("onWhatsapp")}
              </span>
            </ContactLink>
          </div>

          {/* Bottom Unboxed Editorial Copy */}
          <div className="max-w-md">
            <h3 className="font-era-display text-2xl sm:text-3xl text-[#2A2723] mb-5">
              {t("craftTitle")}
            </h3>
            <p
              className="text-xs sm:text-[13px] leading-relaxed text-[#2A2723]/75"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {t("craftDescription")}
            </p>
          </div>
        </div>

        {/* Right: mixed typography closing the craft story. */}
        <div data-manifesto-phrase className="lg:col-span-4 px-6 sm:px-10 flex flex-col items-end text-right">
          <span className="font-era-display text-[clamp(2.8rem,5.5vw,5rem)] text-[#2A2723]/75">
            {t("fromHands")}
          </span>{" "}
          <span
            className="font-era-script text-[clamp(3.2rem,6.5vw,5.8rem)] text-[#2A2723] leading-none -my-2"
          >
            {t("directly")}
          </span>{" "}
          <span className="font-era-display text-[clamp(2.8rem,5.5vw,5rem)] text-[#2A2723]">
            {t("toHome")}
          </span>
        </div>
      </div>

      <div data-project-invitation className="relative z-10 mx-6 grid grid-cols-1 overflow-hidden bg-[#F2ECE3] sm:mx-10 lg:mx-20 lg:grid-cols-2">
        <div className="relative min-w-0 aspect-[4/3] lg:aspect-auto">
          <Image src="/furniture/green-island-kitchen-tbilisi-kencho-group.webp" alt={t("projectAlt")} fill sizes="(max-width: 1023px) 100vw, 50vw" className="object-cover" />
        </div>
        <div className="flex min-w-0 flex-col items-start justify-center px-7 py-12 sm:p-14 lg:py-20">
          <p className="mb-7 text-[10px] uppercase tracking-[0.18em]">{t("projectEyebrow")}</p>
          <h3 className="font-era-display min-w-0 max-w-[min(18ch,100%)] text-[clamp(2rem,3.5vw,3.5rem)] leading-[1.3] [overflow-wrap:anywhere]">{t("projectTitle")}</h3>
          <p className="mt-8 max-w-[45ch] text-sm leading-relaxed text-[#2A2723]/75">{t("projectText")}</p>
          <Link href="/about" className="mt-10 border-b border-[#2A2723]/40 pb-2 text-xs leading-relaxed">{t("projectLink")} <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>
  );
}
