"use client";

import { useTranslations } from "next-intl";

import { useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { useMobile } from "@/lib/use-mobile";

gsap.registerPlugin(ScrollTrigger);

interface HotspotItem {
  id: string;
  title: string;
  description: string;
  x: string;
  y: string;
}

const FALLBACK_DAY =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=85";
const FALLBACK_NIGHT =
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=2000&q=85";

/* Spelled letter by letter on the white opening (CSS, globals.css .kg-*). */
const NAME_WORDS = ["KENCHO", "GROUP"];

export default function HeroSection() {
  const t = useTranslations("home.era.hero");
  const mobile = useMobile();
  const HOTSPOTS: HotspotItem[] = [
    {
      id: "millimetre",
      title: t("hotspotMeasureTitle"),
      description: t("hotspotMeasureDescription"),
      x: "38%",
      y: "66%",
    },
    {
      id: "timber-stone",
      title: t("hotspotMaterialsTitle"),
      description: t("hotspotMaterialsDescription"),
      x: "58%",
      y: "46%",
    },
    {
      id: "one-workshop",
      title: t("hotspotWorkshopTitle"),
      description: t("hotspotWorkshopDescription"),
      x: "82%",
      y: "54%",
    },
  ];

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
  // Keep every panel mounted, while retaining the original exit-before-enter sequence.
  const [presentHotspot, setPresentHotspot] = useState<string | null>(null);
  const selectHotspot = (id: string | null) => {
    setActiveHotspot(id);
    if (presentHotspot === null) setPresentHotspot(id);
  };
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
          motion: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          reduced: "(min-width: 768px) and (prefers-reduced-motion: reduce)",
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

  return (
    <section
      ref={sectionRef}
      data-mobile-hero
      aria-label={t("h1")}
      className="relative w-full h-[340vh] bg-[#F2ECE3] text-[#2A2723]"
    >
      {/* Sticky Viewport Stage (100vw x 100vh, soft blue #F2ECE3 behind the white) */}
      <div
        data-hud-tone="ink"
        data-hero-stage
        className="sticky top-0 h-screen w-full overflow-hidden relative bg-[#F2ECE3]"
      >
        {/* ===================================================================
         * A. THE WHITE OPENING: a curtain whose lower third is a long white
         *    to transparent gradient, lifted by scroll to reveal the blue.
         * =================================================================== */}
        <div
          ref={curtainRef}
          data-hero-curtain
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[150%] z-[15] pointer-events-none will-change-transform"
          style={{
            background:
              "linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 66.6%, rgb(255 255 255 / 0) 100%)",
          }}
        />

        <div
          ref={nameRef}
          data-hero-name
          className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 select-none pointer-events-none will-change-transform"
        >
          <h1 className="text-center text-[#2A2723]">
            <span className="sr-only">
              {t("h1")}
            </span>{" "}
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
                      className="era-letter-mask inline-block overflow-hidden align-top"
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
                  {" "}
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
            {t("tagline")}
          </p>
        </div>

        {/* ===================================================================
         * DOCKED BY DAY — BY NIGHT SWITCHER (top: 32px, below the HUD on phones)
         * =================================================================== */}
        <div
          ref={dockedBarRef}
          data-hero-switcher
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
              {t("day")}
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={isNightMode}
              aria-label={t("lightingToggle")}
              onClick={() => setIsNightMode((prev) => !prev)}
              className="relative w-14 h-4 flex items-center cursor-pointer"
            >
              <span className="w-full h-px bg-[#FFFFFF]/55" />
              <motion.span
                layout
                transition={mobile ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 28 }}
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
              {t("night")}
            </button>
          </div>
        </div>

        {/* ===================================================================
         * B. RISING FULL-BLEED ARCHITECTURAL KITCHEN (yPercent: 74 -> 0, z-10)
         * =================================================================== */}
        <div
          ref={risingImageContainerRef}
          data-hero-image
          data-hud-tone="light"
          style={{ transform: "translateY(100%)" }}
          className="w-screen h-screen absolute inset-0 z-10 overflow-hidden will-change-transform"
        >
          {/* Top Feather Mask: blends the room's top edge into the #F2ECE3 sky */}
          <div
            ref={topGradientMaskRef}
            data-hero-gradient
            className="bg-gradient-to-b from-[#F2ECE3] via-[#F2ECE3]/50 to-transparent h-28 absolute top-0 inset-x-0 z-20 pointer-events-none"
            aria-hidden="true"
          />

          {/* Day Architectural Kitchen Image */}
          <Image
            src={daySrc}
            alt={t("dayAlt")}
            fill
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
            onError={() => setDaySrc(FALLBACK_DAY)}
            className={`object-cover object-center transition-opacity duration-1000 ease-out ${
              isNightMode ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Night Architectural Kitchen Image */}
          <Image
            src={nightSrc}
            alt={t("nightAlt")}
            fill
            sizes="(max-width: 767px) 1px, 100vw"
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
            data-hero-interactive
            className="absolute inset-0 z-20 opacity-0 pointer-events-none"
            aria-label={t("hotspotsLabel")}
            onClick={(event) => {
              if (event.target === event.currentTarget) selectHotspot(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") selectHotspot(null);
            }}
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
                      selectHotspot(isSelected ? null : spot.id)
                    }
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") selectHotspot(spot.id);
                    }}
                    aria-label={t("inspect", { title: spot.title })}
                    aria-expanded={isSelected}
                    aria-controls={`hero-hotspot-${spot.id}`}
                    className="group relative flex items-center justify-center w-10 h-10 rounded-full border border-[#FFFFFF]/85 bg-[#FFFFFF]/10 backdrop-blur-[2px] transition-transform duration-500 hover:scale-125 cursor-pointer"
                  >
                    <span className="absolute inset-0 rounded-full border border-[#FFFFFF]/45 motion-safe:animate-ping" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />
                  </button>
                </div>
              );
            })}

            {/* Vertical #FFFFFF Editorial Sheet (Closed by Default, Opens on Hover/Click) */}
            {HOTSPOTS.map((spot) => (
              <motion.div
                key={spot.id}
                id={`hero-hotspot-${spot.id}`}
                data-hero-hotspot={spot.id}
                aria-hidden={activeHotspot !== spot.id}
                initial="hidden"
                animate={
                  presentHotspot === spot.id
                    ? activeHotspot === spot.id ? "enter" : "exit"
                    : "hidden"
                }
                variants={{
                  hidden: { opacity: 0, y: 14, visibility: "hidden", transition: { duration: 0 } },
                  enter: { opacity: 1, y: 0, visibility: "visible" },
                  exit: { opacity: 0, y: 10, transitionEnd: { visibility: "hidden" } },
                }}
                transition={{ duration: mobile ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                onAnimationComplete={(phase) => {
                  if (phase === "exit") setPresentHotspot(activeHotspot);
                }}
                style={{ pointerEvents: "none" }}
                className="absolute left-8 bottom-24 sm:left-24 sm:bottom-24 z-30 bg-[#FFFFFF] p-8 max-w-xs text-[#2A2723] shadow-xl"
              >
                <h2
                  className="font-era-display text-2xl sm:text-[28px] text-[#2A2723] mb-5"
                  style={{ lineHeight: 1.1 }}
                >
                  {spot.title}
                </h2>

                <p
                  className="text-xs leading-relaxed text-[#2A2723]/80"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {spot.description}
                </p>
              </motion.div>
            ))}

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
                {t("quote")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
