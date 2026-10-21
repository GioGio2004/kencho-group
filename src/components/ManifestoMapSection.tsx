"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SITE } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger);

const FALLBACK_WARDROBE =
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1400&q=85";

interface MilestoneNode {
  id: string;
  title: string;
  subtitle: string;
  xPercent: string;
  yPercent: string;
  cx: number;
  cy: number;
  placeAbove: boolean;
}

const MILESTONES: MilestoneNode[] = [
  {
    id: "01",
    title: "01. SITE MEASUREMENT",
    subtitle: "Day 1 — Tbilisi",
    xPercent: "10%",
    yPercent: "65%",
    cx: 120,
    cy: 156,
    placeAbove: true,
  },
  {
    id: "02",
    title: "02. 3D VISUALIZATION",
    subtitle: "Day 3–5",
    xPercent: "30%",
    yPercent: "30%",
    cx: 360,
    cy: 72,
    placeAbove: true,
  },
  {
    id: "03",
    title: "03. FIXED PRICE CONTRACT",
    subtitle: "Never changes after approval",
    xPercent: "50%",
    yPercent: "70%",
    cx: 600,
    cy: 168,
    placeAbove: false,
  },
  {
    id: "04",
    title: "04. WORKSHOP PRODUCTION",
    subtitle: "3–5 Weeks • Guram Panjikidze St 1",
    xPercent: "70%",
    yPercent: "26%",
    cx: 840,
    cy: 62,
    placeAbove: true,
  },
  {
    id: "05",
    title: "05. CLEAN INSTALLATION",
    subtitle: "1–3 Days • Ready to live in",
    xPercent: "90%",
    yPercent: "58%",
    cx: 1080,
    cy: 139,
    placeAbove: false,
  },
];

export default function ManifestoMapSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cornerFramesRef = useRef<HTMLDivElement>(null);
  const manifestoTextRef = useRef<HTMLHeadingElement>(null);
  const staggeredWordsRef = useRef<HTMLDivElement>(null);
  const wavePathRef = useRef<SVGPathElement>(null);
  const mapTriggerRef = useRef<HTMLDivElement>(null);
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
      const wavePath = wavePathRef.current;
      const mapTrigger = mapTriggerRef.current;

      if (!section) return;

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

      // Horizontal SVG Journey Map stroke-dasharray animated on scroll
      if (wavePath && mapTrigger) {
        const length = wavePath.getTotalLength?.() || 1400;
        gsap.set(wavePath, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });

        gsap.to(wavePath, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: mapTrigger,
            start: "top 78%",
            end: "bottom 45%",
            scrub: 0.7,
          },
        });
      }
    },
    { scope: sectionRef }
  );

  // Subtle magnetic hover handler for the Era thin-ring circle CTA
  const handleMagneticMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
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
          THE CONCEPT
        </span>

        <h2
          id="manifesto-heading"
          ref={manifestoTextRef}
          className="font-era-display my-[1.6em] text-[clamp(2rem,4.3vw,4rem)] uppercase text-[#2A2723] tracking-[-0.02em] max-w-4xl"
          style={{ lineHeight: 1.28 }}
        >
          {/* my-[1.6em]: scaleY(1.35) grows the block ~17% past its box on
              each side, which used to run over the label and paragraph. */}
          KENCHO GROUP IS A BESPOKE FURNITURE WORKSHOP IN TBILISI. EVERY PIECE
          IS MEASURED ON SITE, DRAWN IN 3D, AND BUILT UNDER ONE ROOF.
        </h2>

        <p
          className="mt-16 max-w-xs text-xs leading-relaxed text-[#2A2723]/75 text-center"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Inspired by architectural precision, our Tbilisi workshop unites 3D
          engineering, natural European timber, and master installation into a
          single seamless commission.
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
        className="relative z-10 mx-auto max-w-6xl px-6 mb-24 sm:mb-32 flex flex-col items-center"
      >
        <div
          data-drift-word
          className="font-era-display text-[clamp(4rem,10.5vw,9.6rem)] text-[#2A2723] -ml-16 sm:-ml-36"
        >
          TBILISI
        </div>

        <div
          data-drift-word
          className="flex items-center gap-8 sm:gap-16 my-4 sm:my-6"
        >
          <span
            className="text-xs sm:text-sm font-normal tracking-[0.55em] uppercase text-[#2A2723]/80"
            style={{ fontFamily: "var(--font-bodoni), Georgia, serif" }}
          >
            G E O R G I A
          </span>
          <span className="font-era-display text-[clamp(4rem,10.5vw,9.6rem)] text-[#2A2723]/85">
            WORKSHOP
          </span>
        </div>

        <div
          data-drift-word
          className="font-era-display text-[clamp(4rem,10.5vw,9.6rem)] text-[#2A2723]/55 -ml-8 sm:-ml-20"
        >
          CRAFT
        </div>
      </div>

      {/* 3. Asymmetric Split Editorial Block (Left Flush Portrait + Center Thin Circle CTA + Lower Copy) */}
      <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-end mb-36 sm:mb-48">
        {/* Far-Left Flush Portrait Image (/images/wardrobe-showcase.jpg) — Zero Frame Box */}
        <div className="lg:col-span-3 relative aspect-[3/4.8] w-64 sm:w-72 lg:w-full overflow-hidden">
          <Image
            src={wardrobeSrc}
            alt="Bespoke wardrobe and cane millwork showcase crafted by Kencho Group in Tbilisi"
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
            <a
              ref={magneticBtnRef}
              href={`${SITE.whatsappBase}?text=${encodeURIComponent(
                "Hello Kencho Group, I would like to share my interior drawings for a bespoke furniture estimate."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onMouseMove={handleMagneticMove}
              onMouseLeave={handleMagneticLeave}
              aria-label="Send drawings on WhatsApp"
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
                SEND DRAWINGS
                <br />
                ON WHATSAPP
              </span>
            </a>
          </div>

          {/* Bottom Unboxed Editorial Copy */}
          <div className="max-w-md">
            <h3 className="font-era-display text-2xl sm:text-3xl text-[#2A2723] mb-5">
              NEW STANDARD OF CRAFT
            </h3>
            <p
              className="text-xs sm:text-[13px] leading-relaxed text-[#2A2723]/75"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Whether you arrive with an interior designer&apos;s full CAD
              package or an empty flat and reference photographs, our workshop
              builds every cabinet, wardrobe, and architectural wall panel to
              the exact millimetre.
            </p>
          </div>
        </div>

        {/* Right: Mixed Typography Headline Leading Into the SVG Wave */}
        <div className="lg:col-span-4 px-6 sm:px-10 flex flex-col items-end text-right">
          <span className="font-era-display text-[clamp(2.8rem,5.5vw,5rem)] text-[#2A2723]/75">
            FROM OUR HANDS
          </span>
          <span
            className="font-era-script text-[clamp(3.2rem,6.5vw,5.8rem)] text-[#2A2723] leading-none -my-2"
            style={{ fontFamily: "var(--font-script), cursive" }}
          >
            Directly
          </span>
          <span className="font-era-display text-[clamp(2.8rem,5.5vw,5rem)] text-[#2A2723]">
            TO YOUR HOME
          </span>
        </div>
      </div>

      {/* 4. Full-Bleed Horizontal Hand-Drawn SVG Journey Wave (Zero Card Grid, Pure Floating Nodes) */}
      <div ref={mapTriggerRef} className="relative w-full pt-8 pb-16">
        <div className="relative w-full h-[260px] sm:h-[300px]">
          <svg
            viewBox="0 0 1200 240"
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
            aria-label="Kencho Group 5-Step Production Journey Wave"
          >
            {/* Subtle dotted reference curve */}
            <path
              d="M 0 180 C 120 156, 240 60, 360 72 C 480 84, 510 185, 600 168 C 710 148, 750 48, 840 62 C 940 76, 1010 155, 1200 120"
              fill="none"
              stroke="#2A2723"
              strokeOpacity="0.12"
              strokeWidth="1"
              strokeDasharray="3 6"
            />

            {/* Scroll-animated hand-drawn SVG path */}
            <path
              ref={wavePathRef}
              d="M 0 180 C 120 156, 240 60, 360 72 C 480 84, 510 185, 600 168 C 710 148, 750 48, 840 62 C 940 76, 1010 155, 1200 120"
              fill="none"
              stroke="#2A2723"
              strokeOpacity="0.55"
              strokeWidth="1.4"
            />

            {/* 5 Minimal Milestone Dots on the Wave */}
            {MILESTONES.map((node) => (
              <circle
                key={node.id}
                cx={node.cx}
                cy={node.cy}
                r="4"
                fill="#2A2723"
              />
            ))}
          </svg>

          {/* Floating Uppercase Micro-Typography Positioned Directly at Each Wave Milestone */}
          {MILESTONES.map((node) => (
            <div
              key={node.id}
              style={{
                left: node.xPercent,
                top: node.yPercent,
              }}
              className={`absolute -translate-x-1/2 flex flex-col items-center text-center ${
                node.placeAbove ? "-translate-y-[125%]" : "translate-y-5"
              }`}
            >
              <span
                className="text-[9.5px] sm:text-[10px] font-semibold tracking-[0.2em] uppercase text-[#2A2723] whitespace-nowrap"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {node.title}
              </span>
              <span
                className="text-[9px] font-medium tracking-[0.16em] uppercase text-[#2A2723]/60 mt-0.5 whitespace-nowrap"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {node.subtitle}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
