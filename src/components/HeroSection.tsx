"use client";

import { useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

interface HotspotItem {
  id: string;
  title: string;
  description: string;
  x: string;
  y: string;
}

const HOTSPOTS: HotspotItem[] = [
  {
    id: "millimetre",
    title: "BUILT TO THE MILLIMETRE",
    description:
      "We have no standard sizes. We start from your walls, ceilings, and habits so the furniture adapts to the space, never the other way around.",
    x: "38%",
    y: "66%",
  },
  {
    id: "timber-stone",
    title: "EUROPEAN TIMBER & STONE",
    description:
      "Crafted from premium European MDF, solid oak veneers, and precision hardware selected to age beautifully over decades.",
    x: "58%",
    y: "46%",
  },
  {
    id: "one-workshop",
    title: "ONE TEAM, ONE WORKSHOP",
    description:
      "Measured on site, drawn in 3D, manufactured at Guram Panjikidze St 1, and installed by our own hands.",
    x: "82%",
    y: "54%",
  },
];

const FALLBACK_DAY =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=85";
const FALLBACK_NIGHT =
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=2000&q=85";

/* Spelled letter by letter on the white opening (CSS, globals.css .kg-*). */
const NAME_WORDS = ["KENCHO", "GROUP"];

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const risingImageContainerRef = useRef<HTMLDivElement>(null);
  const topGradientMaskRef = useRef<HTMLDivElement>(null);
  const dockedBarRef = useRef<HTMLDivElement>(null);
  const roomInteractiveLayerRef = useRef<HTMLDivElement>(null);
  const floatingQuoteRef = useRef<HTMLDivElement>(null);

  const [isNightMode, setIsNightMode] = useState(false);
  // Keep all hotspot cards closed by default
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [daySrc, setDaySrc] = useState("/images/hero-kitchen-day.jpg");
  const [nightSrc, setNightSrc] = useState("/images/hero-kitchen-night.jpg");

  useGSAP(
    () => {
      const section = sectionRef.current;
      const curtain = curtainRef.current;
      const name = nameRef.current;
      const risingImage = risingImageContainerRef.current;
      const topGradient = topGradientMaskRef.current;
      const dockedBar = dockedBarRef.current;
      const roomInteractive = roomInteractiveLayerRef.current;
      const floatingQuote = floatingQuoteRef.current;

      if (
        !section ||
        !curtain ||
        !name ||
        !risingImage ||
        !topGradient ||
        !dockedBar ||
        !roomInteractive ||
        !floatingQuote
      ) {
        return;
      }

      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { reduced } = ctx.conditions as { reduced: boolean };

          // The sticky stage is the pin: 340vh of section = 100vh viewport
          // + 240vh of scroll for the choreography.
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom bottom",
              scrub: 1,
            },
          });

          if (reduced) {
            // Opacity only: white fades to blue, the name fades, the room
            // fades in where it stands.
            gsap.set(risingImage, { y: 0, yPercent: 0, opacity: 0 });
            tl.to(curtain, { opacity: 0, duration: 0.25 }, 0.05)
              .to(name, { opacity: 0, duration: 0.15 }, 0.3)
              .to(risingImage, { opacity: 1, duration: 0.2 }, 0.35)
              .to(topGradient, { opacity: 0, duration: 0.1 }, 0.5);
          } else {
            // y: 0 drops the px offset GSAP parses from the SSR translateY.
            gsap.set(risingImage, { y: 0, yPercent: 100, scale: 1.06 });

            // 0% -> 34%: the white curtain lifts on its long gradient foot,
            // so the opening melts into the soft blue behind the name.
            tl.to(
              curtain,
              { yPercent: -100, ease: "power1.inOut", duration: 0.34 },
              0
            )
              // 32% -> 60%: the name drifts up and away on the blue.
              .to(
                name,
                { yPercent: -40, opacity: 0, ease: "power2.inOut", duration: 0.28 },
                0.32
              )
              // 36% -> 66%: the room rises, its feathered top in the blue.
              .to(
                risingImage,
                { yPercent: 0, scale: 1, ease: "power2.inOut", duration: 0.3 },
                0.36
              )
              .to(
                topGradient,
                { opacity: 0, ease: "power1.inOut", duration: 0.12 },
                0.54
              );
          }

          tl.to(
            dockedBar,
            {
              opacity: 1,
              y: 0,
              pointerEvents: "auto",
              ease: "power2.out",
              duration: 0.08,
            },
            0.6
          )
            // Hotspots, then the pull-quote, then a short hold.
            .to(
              roomInteractive,
              {
                opacity: 1,
                pointerEvents: "auto",
                ease: "power2.out",
                duration: 0.1,
              },
              0.66
            )
            .to(
              floatingQuote,
              { opacity: 1, y: 0, ease: "power2.out", duration: 0.12 },
              0.72
            )
            .to({}, { duration: 0.12 }, 0.88);
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  const selectedHotspot = HOTSPOTS.find((h) => h.id === activeHotspot) ?? null;

  return (
    <section
      ref={sectionRef}
      aria-label="Kencho Group — bespoke furniture and millwork in Tbilisi"
      className="relative w-full h-[340vh] bg-[#F2ECE3] text-[#2A2723]"
    >
      {/* Sticky Viewport Stage (100vw x 100vh, soft blue #F2ECE3 behind the white) */}
      <div
        data-hud-tone="ink"
        className="sticky top-0 h-screen w-full overflow-hidden relative bg-[#F2ECE3]"
      >
        {/* ===================================================================
         * A. THE WHITE OPENING: a curtain whose lower third is a long white
         *    to transparent gradient, lifted by scroll to reveal the blue.
         * =================================================================== */}
        <div
          ref={curtainRef}
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[150%] z-[15] pointer-events-none will-change-transform"
          style={{
            background:
              "linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 66.6%, rgb(255 255 255 / 0) 100%)",
          }}
        />

        <div
          ref={nameRef}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 select-none will-change-transform"
        >
          <h1 className="text-center text-[#2A2723]">
            <span className="sr-only">
              Kencho Group — bespoke furniture and millwork in Tbilisi
            </span>
            <span
              aria-hidden="true"
              className="font-era-display text-[19vw] md:text-[9vw]"
              style={{ lineHeight: 0.88 }}
            >
              {NAME_WORDS.map((word, w) => (
                <span key={word} className="block md:inline-block md:mx-[0.12em]">
                  {word.split("").map((ch, c) => (
                    <span
                      key={c}
                      className="inline-block overflow-hidden align-top py-[0.06em]"
                    >
                      <span
                        className="kg-letter"
                        style={
                          {
                            "--i": NAME_WORDS.slice(0, w).join("").length + c,
                          } as CSSProperties
                        }
                      >
                        {ch}
                      </span>
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </h1>

          {/* The one gold mark, then a whisper of what we do. The scaleY on
              the name overhangs its box, hence the vw in the margin. */}
          <span
            aria-hidden="true"
            className="kg-rule block w-16 md:w-24 h-px bg-[#B39359] mt-[calc(6vw+1.25rem)] md:mt-[calc(1.6vw+1.75rem)]"
          />
          <p
            className="kg-meta mt-5 text-[9px] md:text-[10px] tracking-[0.34em] uppercase text-[#2A2723]/70"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Bespoke furniture · Tbilisi
          </p>
        </div>

        {/* ===================================================================
         * DOCKED BY DAY — BY NIGHT SWITCHER (top: 32px, below the HUD on phones)
         * =================================================================== */}
        <div
          ref={dockedBarRef}
          style={{ transform: "translateY(24px)" }}
          className="absolute top-36 md:top-8 left-1/2 -translate-x-1/2 z-30 opacity-0 pointer-events-none will-change-transform"
        >
          <div
            className="flex items-center justify-center gap-3 text-[9px] tracking-[0.25em] uppercase text-[#FFFFFF] whitespace-nowrap drop-shadow-sm"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <button
              type="button"
              onClick={() => setIsNightMode(false)}
              className={`transition cursor-pointer ${
                !isNightMode ? "text-[#FFFFFF]" : "text-[#FFFFFF]/55"
              }`}
            >
              BY DAY
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={isNightMode}
              aria-label="Toggle day or night lighting"
              onClick={() => setIsNightMode((prev) => !prev)}
              className="relative w-14 h-4 flex items-center cursor-pointer"
            >
              <span className="w-full h-px bg-[#FFFFFF]/55" />
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                className="absolute w-2 h-2 rounded-full bg-[#FFFFFF]"
                style={{
                  left: isNightMode ? "calc(100% - 8px)" : "0px",
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsNightMode(true)}
              className={`transition cursor-pointer ${
                isNightMode ? "text-[#FFFFFF]" : "text-[#FFFFFF]/55"
              }`}
            >
              BY NIGHT
            </button>
          </div>
        </div>

        {/* ===================================================================
         * B. RISING FULL-BLEED ARCHITECTURAL KITCHEN (yPercent: 74 -> 0, z-10)
         * =================================================================== */}
        <div
          ref={risingImageContainerRef}
          data-hud-tone="light"
          style={{ transform: "translateY(100%)" }}
          className="w-screen h-screen absolute inset-0 z-10 overflow-hidden will-change-transform"
        >
          {/* Top Feather Mask: blends the room's top edge into the #F2ECE3 sky */}
          <div
            ref={topGradientMaskRef}
            className="bg-gradient-to-b from-[#F2ECE3] via-[#F2ECE3]/50 to-transparent h-28 absolute top-0 inset-x-0 z-20 pointer-events-none"
            aria-hidden="true"
          />

          {/* Day Architectural Kitchen Image */}
          <Image
            src={daySrc}
            alt="Sunlit oak and travertine bespoke kitchen by Kencho Group in Tbilisi"
            fill
            priority
            sizes="100vw"
            onError={() => setDaySrc(FALLBACK_DAY)}
            className={`object-cover object-center transition-opacity duration-1000 ease-out ${
              isNightMode ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Night Architectural Kitchen Image */}
          <Image
            src={nightSrc}
            alt="Recessed cabinet LED lighting in a bespoke walnut kitchen by Kencho Group"
            fill
            sizes="100vw"
            onError={() => setNightSrc(FALLBACK_NIGHT)}
            className={`object-cover object-center transition-opacity duration-1000 ease-out ${
              isNightMode ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Light navy wash, just enough for the white quote and hotspots */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#2A2723]/40 via-transparent to-[#2A2723]/10 pointer-events-none"
            aria-hidden="true"
          />

          {/* Phase 2 Interactive Room Layer (Hotspots + Bottom-Right Quote) */}
          <div
            ref={roomInteractiveLayerRef}
            className="absolute inset-0 z-20 opacity-0 pointer-events-none"
            aria-label="Interactive kitchen craftsmanship hotspots"
          >
            {/* 3 Minimal Pulsing Circular ( o ) Hotspot Markers */}
            {HOTSPOTS.map((spot) => {
              const isSelected = activeHotspot === spot.id;
              return (
                <div
                  key={spot.id}
                  style={{ left: spot.x, top: spot.y }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveHotspot(isSelected ? null : spot.id)
                    }
                    onMouseEnter={() => setActiveHotspot(spot.id)}
                    aria-label={`Inspect ${spot.title}`}
                    aria-expanded={isSelected}
                    className="group relative flex items-center justify-center w-10 h-10 rounded-full border border-[#FFFFFF]/85 bg-[#FFFFFF]/10 backdrop-blur-[2px] transition-transform duration-500 hover:scale-125 cursor-pointer"
                  >
                    <span className="absolute inset-0 rounded-full border border-[#FFFFFF]/45 motion-safe:animate-ping" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />
                  </button>
                </div>
              );
            })}

            {/* Vertical #FFFFFF Editorial Sheet (Closed by Default, Opens on Hover/Click) */}
            <AnimatePresence mode="wait">
              {selectedHotspot && (
                <motion.div
                  key={selectedHotspot.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  onMouseLeave={() => setActiveHotspot(null)}
                  className="absolute left-8 bottom-24 sm:left-24 sm:bottom-24 z-30 bg-[#FFFFFF] p-8 max-w-xs text-[#2A2723] shadow-xl"
                >
                  <h2
                    className="font-era-display text-2xl sm:text-[28px] text-[#2A2723] mb-5"
                    style={{ lineHeight: 1.1 }}
                  >
                    {selectedHotspot.title}
                  </h2>

                  <p
                    className="text-xs leading-relaxed text-[#2A2723]/80"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {selectedHotspot.description}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom-Right Reflection Area: Floating Pull-Quote (clear of the menu trigger) */}
            <div
              ref={floatingQuoteRef}
              style={{ transform: "translateY(28px)" }}
              className="hidden md:block absolute right-12 bottom-36 z-20 max-w-md text-left pointer-events-none opacity-0"
            >
              <p
                className="font-era-display text-3xl text-[#FFFFFF] drop-shadow-md"
                style={{ lineHeight: 1.28 }}
              >
                “INSTEAD OF STANDARD TEMPLATES, ONE TEAM MEASURES, DRAWS, AND
                BUILDS EVERY MILLIMETRE.”
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
