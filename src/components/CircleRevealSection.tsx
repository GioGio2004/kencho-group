"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface RoomSlide {
  index: string;
  code: string;
  title: string;
  description: string;
  leadTime: string;
  image: string;
  alt: string;
}

const ROOMS: RoomSlide[] = [
  {
    index: "01",
    code: "01 / KITCHENS",
    title: "PRECISION MILLWORK",
    description:
      "The heart of the flat, built to the millimetre. Integrated appliances, natural European oak veneers, and seamless stone joins crafted in our Tbilisi workshop.",
    leadTime: "LEAD TIME: 3–5 WEEKS",
    image: "/furniture/walnut-island-kitchen-tbilisi-kencho-group.webp",
    alt: "Bespoke walnut and stone island kitchen by Kencho Group in Tbilisi",
  },
  {
    index: "02",
    code: "02 / WARDROBES & STORAGE",
    title: "ARCHITECTURAL STORAGE",
    description:
      "Walk-in wardrobes, fluted bronze glass closets, and floor-to-ceiling hidden storage systems scribed directly to your walls.",
    leadTime: "LEAD TIME: 2–4 WEEKS",
    image: "/furniture/bronze-mirror-wardrobe-tbilisi-kencho-group.webp",
    alt: "Custom bronze mirror and fluted glass wardrobe room in Tbilisi",
  },
  {
    index: "03",
    code: "03 / WALL PANELING & DETAILS",
    title: "TACTILE TIMBER CLADDING",
    description:
      "Architectural wood cladding, acoustic fluted slats, and seamless shelving that give a living space its quiet warmth and proportion.",
    leadTime: "LEAD TIME: 2–3 WEEKS",
    image: "/furniture/fluted-oak-panel-detail-tbilisi-kencho-group.webp",
    alt: "Architectural fluted oak wall paneling and bespoke shelving in Tbilisi",
  },
  {
    index: "04",
    code: "04 / COMMERCIAL FIT-OUTS",
    title: "BESPOKE COMMERCIAL SPACES",
    description:
      "Offices, cafés, and boutique lobbies — complete turnkey architectural millwork from 3D shop drawings to opening day.",
    leadTime: "LEAD TIME: 4–6 WEEKS",
    image: "/furniture/commercial-lobby-lounge-tbilisi-kencho-group.webp",
    alt: "Commercial lobby and boutique café interior millwork by Kencho Group",
  },
];

export default function CircleRevealSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const maskContainerRef = useRef<HTMLDivElement>(null);
  const introArcRef = useRef<HTMLDivElement>(null);
  const carouselStageRef = useRef<HTMLDivElement>(null);
  const waveTitleRef = useRef<HTMLDivElement>(null);

  const [activeIdx, setActiveIdx] = useState(0);

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
      aria-labelledby="precision-millwork-heading"
      className="relative -mt-[85vh] z-30 h-[240vh] w-full pointer-events-none"
    >
      {/* Sticky Full-Viewport Stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Expanding Circular Container (bg-[#F2ECE3]) */}
        <div
          ref={maskContainerRef}
          data-hud-tone="ink"
          style={{ clipPath: "circle(15% at 50% 100%)" }}
          className="pointer-events-auto relative w-full h-full bg-[#F2ECE3] text-[#2A2723] flex flex-col items-center justify-between py-10 px-6 overflow-hidden will-change-[clip-path]"
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
                  FOUR ROOMS OF WORK • MADE TO MEASURE IN TBILISI
                </textPath>
              </text>
            </svg>

            {/* Centered Emblem + Coordinates + Vertical Line */}
            <div className="flex items-center gap-6 -mt-8">
              <span
                className="text-[9.5px] font-semibold tracking-[0.26em] uppercase"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                TBS — 41°43′21″ N
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
                44°46′31″ E
              </span>
            </div>
            <div className="w-px h-20 bg-[#2A2723]/30 mt-4" />
          </div>

          {/* Main Full-Bleed Mist Blue-Sage Stage (Zero Boxes, Zero Tabs) */}
          <div
            ref={carouselStageRef}
            className="relative z-10 w-full h-full flex flex-col items-center justify-between pt-28 md:pt-14 pb-24 md:pb-2"
          >
            {/* Didone headline, sized so the longest room title fits one line */}
            <div
              ref={waveTitleRef}
              className="w-full text-center overflow-visible select-none pt-2 will-change-transform"
            >
              <h2
                id="precision-millwork-heading"
                className="font-era-display max-w-[88vw] text-[clamp(2rem,4.6vw,5.2rem)] text-[#2A2723] text-balance"
                style={{ lineHeight: 1 }}
              >
                {currentRoom.title}
              </h2>
            </div>

            {/* Center Angled Parallelogram Sliver Image + Minimal Counter */}
            <div className="flex flex-col items-center justify-center my-auto w-full max-w-3xl min-h-0">
              {/* Diagonal Parallelogram Sliver Mask (Era Residence 0:18 style) */}
              {/* Sized by height so title, photo and caption always fit one screen */}
              <div className="relative h-[min(42vh,440px)] aspect-[4/4.4] overflow-visible flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentRoom.code}
                    initial={{ opacity: 0, x: 28, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -28, scale: 0.96 }}
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
                  aria-label="Previous room"
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
                  aria-label="Next room"
                  className="p-1 hover:opacity-55 transition-opacity cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom Floating Editorial Copy & Micro-Spec (Zero Box) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentRoom.code}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center text-center max-w-lg mx-auto"
              >
                <p
                  className="text-xs sm:text-[13px] leading-relaxed text-[#2A2723]/80 mb-5"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {currentRoom.description}
                </p>

                <span
                  className="text-[9.5px] font-semibold tracking-[0.26em] uppercase text-[#2A2723]"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {currentRoom.code} • {currentRoom.leadTime}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
