"use client";

import { useTranslations } from "next-intl";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

gsap.registerPlugin(ScrollTrigger);

interface RoomSlide {
  index: string;
  code: string;
  title: string;
  description: string;
  leadTime: string;
  image: string;
  alt: string;
  slug: string;
  link: string;
}

export default function CircleRevealSection() {
  const t = useTranslations("home.era.collection");
  const reducedMotion = useReducedMotion();
  const ROOMS: RoomSlide[] = [
    {
      index: "01",
      code: t("kitchensCode"),
      title: t("kitchensTitle"),
      description: t("kitchensDescription"),
      leadTime: t("kitchensTime"),
      image: "/furniture/walnut-island-kitchen-tbilisi-kencho-group.webp",
      alt: t("kitchensAlt"),
      slug: "kitchens",
      link: t("kitchensLink"),
    },
    {
      index: "02",
      code: t("wardrobesCode"),
      title: t("wardrobesTitle"),
      description: t("wardrobesDescription"),
      leadTime: t("wardrobesTime"),
      image: "/furniture/bronze-mirror-wardrobe-tbilisi-kencho-group.webp",
      alt: t("wardrobesAlt"),
      slug: "wardrobes-storage",
      link: t("wardrobesLink"),
    },
    {
      index: "03",
      code: t("panelingCode"),
      title: t("panelingTitle"),
      description: t("panelingDescription"),
      leadTime: t("panelingTime"),
      image: "/furniture/fluted-oak-panel-detail-tbilisi-kencho-group.webp",
      alt: t("panelingAlt"),
      slug: "home-interiors",
      link: t("panelingLink"),
    },
    {
      index: "04",
      code: t("commercialCode"),
      title: t("commercialTitle"),
      description: t("commercialDescription"),
      leadTime: t("commercialTime"),
      image: "/furniture/commercial-lobby-lounge-tbilisi-kencho-group.webp",
      alt: t("commercialAlt"),
      slug: "commercial-spaces",
      link: t("commercialLink"),
    },
  ];

  const sectionRef = useRef<HTMLElement>(null);
  const maskContainerRef = useRef<HTMLDivElement>(null);
  const introArcRef = useRef<HTMLDivElement>(null);
  const carouselStageRef = useRef<HTMLDivElement>(null);
  const waveTitleRef = useRef<HTMLDivElement>(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [presentCaption, setPresentCaption] = useState(0);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const maskContainer = maskContainerRef.current;
      const introArc = introArcRef.current;
      const carouselStage = carouselStageRef.current;
      const waveTitle = waveTitleRef.current;

      if (
        !section ||
        !maskContainer ||
        !introArc ||
        !carouselStage ||
        !waveTitle
      ) {
        return;
      }

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(maskContainer, { clipPath: "none" });
        gsap.set(introArc, { opacity: 0 });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom bottom",
            scrub: 0.75,
          },
        });

        // Phase 1 (0% to 45%): Expanding circular portal rises from bottom center over the Hero
        tl.fromTo(
          maskContainer,
          {
            clipPath: "circle(14% at 50% 100%)",
          },
          {
            clipPath: "circle(145% at 50% 50%)",
            ease: "power2.inOut",
            duration: 0.55,
          },
          0
        )
          .fromTo(
            introArc,
            { y: 120, opacity: 1 },
            { y: -80, opacity: 0, ease: "power2.inOut", duration: 0.34 },
            0.06
          )
          .fromTo(
            carouselStage,
            { y: 80, opacity: 0 },
            { y: 0, opacity: 1, ease: "power2.out", duration: 0.45 },
            0.32
          )
          .fromTo(
            waveTitle,
            { xPercent: 3 },
            { xPercent: -3, ease: "none", duration: 0.65 },
            0.3
          );
      });

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  const currentRoom = ROOMS[activeIdx];

  const handlePrev = () => {
    setActiveIdx((prev) => (prev === 0 ? ROOMS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIdx((prev) => (prev === ROOMS.length - 1 ? 0 : prev + 1));
  };

  return (
    <section
      id="collection"
      ref={sectionRef}
      aria-labelledby={`room-heading-${ROOMS[activeIdx].index}`}
      className="relative -mt-[85vh] z-30 h-[240vh] w-full pointer-events-none"
    >
      {/* Sticky Full-Viewport Stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Expanding Circular Container (bg-[#F2ECE3]) */}
        <div
          ref={maskContainerRef}
          data-hud-tone="ink"
          className="era-collection-shell pointer-events-auto relative w-full h-full bg-[#F2ECE3] text-[#2A2723] flex flex-col items-center justify-between py-10 px-6 overflow-hidden will-change-[clip-path]"
        >
          {/* Rising Arc Header (Visible as circle expands upward, like 0:12-0:15 of Era Residence) */}
          <div
            ref={introArcRef}
            className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-4xl flex flex-col items-center pointer-events-none"
          >
            <svg
              viewBox="0 0 800 210"
              className="w-full max-w-3xl h-36 sm:h-44 overflow-visible text-[#2A2723]"
              aria-hidden="true"
            >
              <defs>
                <path
                  id="era-circle-top-arc"
                  d="M 60,195 A 390,390 0 0,1 740,195"
                  fill="none"
                />
              </defs>
              <text
                fill="currentColor"
                className="text-[28px] tracking-[0.18em] uppercase"
                style={{
                  fontFamily: "var(--font-bodoni), Georgia, serif",
                }}
              >
                <textPath
                  href="#era-circle-top-arc"
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {t("arc")}
                </textPath>
              </text>
            </svg>

            {/* Centered Emblem + Coordinates + Vertical Line */}
            <div className="flex items-center gap-6 -mt-8">
              <span
                className="text-[9.5px] font-semibold tracking-[0.26em] uppercase"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {t("latitude")}
              </span>
              <svg
                width="30"
                height="30"
                viewBox="0 0 40 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                aria-hidden="true"
              >
                <path d="M20 4 L24 16 L36 20 L24 24 L20 36 L16 24 L4 20 L16 16 Z" />
                <circle cx="20" cy="20" r="2.5" fill="currentColor" />
              </svg>
              <span
                className="text-[9.5px] font-semibold tracking-[0.26em] uppercase"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {t("longitude")}
              </span>
            </div>
            <div className="w-px h-20 bg-[#2A2723]/30 mt-4" />
          </div>

          {/* Main Full-Bleed Mist Blue-Sage Stage (Zero Boxes, Zero Tabs) */}
          <div
            ref={carouselStageRef}
            className="era-collection-stage relative z-10 w-full h-full flex flex-col items-center justify-between pt-28 md:pt-14 pb-24 md:pb-2"
          >
            {/* Didone headline, sized so the longest room title fits one line */}
            <div
              ref={waveTitleRef}
              className="relative w-full text-center overflow-visible select-none pt-2 will-change-transform"
            >
              {ROOMS.map((room, index) => (
                <h2
                  key={room.index}
                  id={`room-heading-${room.index}`}
                  data-room-heading={room.index}
                  aria-hidden={activeIdx !== index}
                  className={`font-era-display max-w-[88vw] text-[clamp(2rem,4.6vw,5.2rem)] text-[#2A2723] text-balance ${activeIdx === index ? "" : "absolute inset-x-0 top-2 invisible pointer-events-none"}`}
                  style={{ lineHeight: 1 }}
                >
                  {room.title}
                </h2>
              ))}
            </div>

            {/* Center Angled Parallelogram Sliver Image + Minimal Counter */}
            <div className="flex flex-col items-center justify-center my-auto w-full max-w-3xl min-h-0">
              {/* Diagonal Parallelogram Sliver Mask (Era Residence 0:18 style) */}
              {/* Sized by height so title, photo and caption always fit one screen */}
              <div className="era-collection-photo relative h-[min(42vh,440px)] aspect-[4/4.4] overflow-visible flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentRoom.code}
                    initial={{ opacity: 0, x: reducedMotion ? 0 : 28, scale: reducedMotion ? 1 : 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: reducedMotion ? 0 : -28, scale: reducedMotion ? 1 : 0.96 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      clipPath: "polygon(18% 0%, 100% 0%, 82% 100%, 0% 100%)",
                    }}
                    className="relative w-full h-full overflow-hidden"
                  >
                    <Image
                      src={currentRoom.image}
                      alt={currentRoom.alt}
                      fill
                      sizes="420px"
                      className="object-cover scale-110 transition-transform duration-700 hover:scale-100"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Minimal Transparent Counter Bar: <  01 —————————— 04  > */}
              <div
                className="flex items-center justify-center gap-4 sm:gap-6 mt-6 text-[11px] font-semibold tracking-[0.22em] text-[#2A2723]"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label={t("previous")}
                  className="p-1 hover:opacity-55 transition-opacity cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="tabular-nums">{currentRoom.index}</span>

                <div className="relative w-32 sm:w-44 h-px bg-[#2A2723]/20 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#2A2723] transition-all duration-500"
                    style={{
                      width: `${((activeIdx + 1) / ROOMS.length) * 100}%`,
                    }}
                  />
                </div>

                <span className="tabular-nums">04</span>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={t("next")}
                  className="p-1 hover:opacity-55 transition-opacity cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom Floating Editorial Copy & Micro-Spec (Zero Box) */}
            {/* Persistent captions preserve the original 0.35s exit, then entrance. */}
            <div className="relative max-w-lg mx-auto">
              {ROOMS.map((room, index) => (
                <motion.div
                  key={room.index}
                  data-room-description={room.index}
                  aria-hidden={activeIdx !== index}
                  initial="hidden"
                  animate={
                    presentCaption === index
                      ? activeIdx === index ? "enter" : "exit"
                      : "hidden"
                  }
                  variants={{
                    hidden: { opacity: 0, y: reducedMotion ? 0 : 10, visibility: "hidden", transition: { duration: 0 } },
                    enter: { opacity: 1, y: 0, visibility: "visible" },
                    exit: { opacity: 0, y: reducedMotion ? 0 : -8, transitionEnd: { visibility: "hidden" } },
                  }}
                  transition={{ duration: 0.35 }}
                  onAnimationComplete={(phase) => {
                    if (phase === "exit") setPresentCaption(activeIdx);
                  }}
                  className={`flex flex-col items-center text-center max-w-lg mx-auto ${presentCaption === index ? "" : "absolute inset-x-0 top-0 pointer-events-none"}`}
                >
                  <p
                    className="text-xs sm:text-[13px] leading-relaxed text-[#2A2723]/80 mb-5"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {room.description}
                  </p>

                  <span
                    className="text-[9.5px] font-semibold tracking-[0.26em] uppercase text-[#2A2723]"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {room.code} • {room.leadTime}
                  </span>
                  <Link
                    href={`/gallery/${room.slug}`}
                    className="mt-3 text-[10px] leading-relaxed tracking-[0.06em] underline underline-offset-4 hover:opacity-65 transition-opacity"
                    style={{ fontFamily: "var(--font-sans)" }}
                    tabIndex={activeIdx === index ? 0 : -1}
                  >
                    {room.link}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
