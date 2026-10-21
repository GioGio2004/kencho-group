"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useContact } from "@/app/_components/ContactProvider";
import { SITE } from "@/lib/site";

const HARDWARE_SPECS = [
  "EUROPEAN MDF & NATURAL WOOD VENEERS",
  "BLUM & HETTICH SOFT-CLOSE MECHANISMS",
  "INTEGRATED WARM LED SENSOR LIGHTING",
  "WRITTEN WARRANTY & FIXED TIMELINES",
] as const;

const STAGGERED_GALLERY = [
  {
    src: "/furniture/green-island-kitchen-tbilisi-kencho-group.webp",
    title: "BESPOKE FOREST ISLAND",
    meta: "KITCHEN • VAKE, TBILISI",
    aspect: "aspect-[4/5]",
    offset: "",
  },
  {
    src: "/furniture/built-in-wine-rack-tbilisi-kencho-group.webp",
    title: "ILLUMINATED WINE VITRINE",
    meta: "MILLWORK • SABURTALO, TBILISI",
    aspect: "aspect-[4/5]",
    offset: "sm:mt-16",
  },
  {
    src: "/furniture/black-oak-kitchen-dining-tbilisi-kencho-group.webp",
    title: "SMOKED OAK & STONE",
    meta: "INTERIOR • VERA, TBILISI",
    aspect: "aspect-[4/3]",
    offset: "",
  },
  {
    src: "/furniture/oak-framed-wardrobe-tbilisi-kencho-group.webp",
    title: "ARCHITECTURAL DRESSING ROOM",
    meta: "STORAGE • MTATSMINDA, TBILISI",
    aspect: "aspect-[4/3]",
    offset: "sm:mt-12",
  },
] as const;

const FAQS = [
  {
    q: "Do you work directly from an interior designer's 3D or CAD drawings?",
    a: "Yes. More than half of our commissions arrive through interior architects and designers. We verify every dimension on site with laser measurement, prepare technical shop drawings in 3D, and build to the exact millimetre.",
  },
  {
    q: "What if I don't have a designer or technical drawings yet?",
    a: "Our in-house design and engineering team handles the entire process—from on-site measurement in Tbilisi to 3D visualization, material board selection at our workshop, manufacturing, and installation.",
  },
  {
    q: "How long does production take, and does the price change once approved?",
    a: "Standard production takes 3–5 weeks depending on project scope and veneer/stone finishes. Once your 3D drawing and material specification are signed off, your price and delivery window are fixed in a written contract.",
  },
  {
    q: "Can we visit the Tbilisi workshop to inspect veneers and hardware in person?",
    a: "Absolutely. Our workshop and material library are located at Guram Panjikidze St 1, Tbilisi. You can touch European MDF profiles, natural oak/walnut veneers, and Blum/Hettich mechanisms before production begins.",
  },
] as const;

export default function EditorialSplitSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const openContact = useContact();

  return (
    <section
      id="specifications"
      aria-labelledby="made-to-live-in-heading"
      className="relative w-full bg-[#FFFFFF] text-[#2A2723] pt-16"
    >
      {/* Top Centered Mixed Typography Overlapping the Split: MADE (Didone serif) + To Live in (giant script) */}
      <div className="relative z-20 flex flex-col items-center text-center mb-12 sm:mb-20 px-6">
        <span
          className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#2A2723]/65 mb-6"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          MATERIALITY &amp; HARDWARE SPECIFICATION
        </span>

        <h2
          id="made-to-live-in-heading"
          className="flex flex-col sm:flex-row items-center justify-center gap-x-6"
        >
          <span className="font-era-display text-[clamp(4.2rem,10vw,9.2rem)] text-[#2A2723]">
            MADE
          </span>
          <span
            className="font-era-script text-[clamp(4rem,9.2vw,8.4rem)] text-[#B39359] leading-none -mt-4 sm:mt-4 -rotate-6"
            style={{ fontFamily: "var(--font-script), cursive" }}
          >
            To Live in
          </span>
        </h2>
      </div>

      {/* Full-Bleed Asymmetric Two-Column Split (0:40–0:47 of Era Residence — Zero Outer Box Borders) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 w-full items-stretch">
        {/* LEFT COLUMN: Powder Sky-Blue Full-Bleed Block (bg-[#F2ECE3] text-[#2A2723] p-12) */}
        <div className="lg:col-span-5 bg-[#F2ECE3] text-[#2A2723] p-12 sm:p-16 lg:p-20 flex flex-col justify-between">
          <div>
            <div
              className="flex items-center justify-between text-[9.5px] font-semibold tracking-[0.28em] uppercase text-[#2A2723]/65 mb-10"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <span>SPECIFICATION</span>
              <span>TBILISI WORKSHOP</span>
            </div>

            {/* Frameless High-Contrast Detail Photograph */}
            <div className="relative aspect-[4/4.4] w-full overflow-hidden mb-12">
              <Image
                src="/furniture/fluted-oak-panel-detail-tbilisi-kencho-group.webp"
                alt="High-contrast fluted European oak joinery and hardware detail by Kencho Group"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover transition-transform duration-1000 hover:scale-105"
              />
            </div>

            <h3 className="font-era-display text-3xl sm:text-5xl text-[#2A2723] mb-8">
              ARCHITECTURAL GRADE UPGRADES &amp; HARDWARE
            </h3>

            <p
              className="text-xs sm:text-[13px] leading-relaxed text-[#2A2723]/75 mb-12 max-w-md"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Every drawer, hinge, and veneer edge is engineered for silent
              daily movement and multi-decade structural stability in
              Tbilisi&apos;s climate.
            </p>

            {/* Pure 1px Hairline List (Zero Badge Circles) */}
            <ul className="flex flex-col divide-y divide-[#2A2723]/15 border-y border-[#2A2723]/15 mb-12">
              {HARDWARE_SPECS.map((spec, idx) => (
                <li
                  key={spec}
                  className="py-5 flex items-center justify-between gap-4"
                >
                  <span
                    className="text-[10.5px] sm:text-[11px] font-semibold tracking-[0.2em] uppercase text-[#2A2723]"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {spec}
                  </span>
                  <span
                    className="text-[10px] tracking-[0.24em] text-[#2A2723]/60"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    0{idx + 1}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={() =>
                openContact({ about: "Material Samples & Workshop Visit" })
              }
              className="font-era-display text-2xl sm:text-3xl text-[#2A2723] border-b border-[#2A2723] pb-1 hover:opacity-60 transition-opacity cursor-pointer"
            >
              BOOK MATERIAL CONSULTATION
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Frameless Staggered Interior Gallery + Minimal FAQ + Direct Workshop Conversion */}
        <div className="lg:col-span-7 bg-[#FFFFFF] text-[#2A2723] p-12 sm:p-16 lg:p-24 flex flex-col justify-between gap-24">
          {/* 1. Frameless Staggered Interior Gallery */}
          <div>
            <div
              className="flex items-center justify-between mb-12 text-[10px] font-semibold tracking-[0.26em] uppercase text-[#2A2723]/60"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <span>SELECTED TBILISI COMMISSIONS</span>
              <span>01 — 04</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-12">
              {STAGGERED_GALLERY.map((item) => (
                <figure
                  key={item.title}
                  className={`group flex flex-col ${item.offset}`}
                >
                  <div
                    className={`relative w-full ${item.aspect} overflow-hidden`}
                  >
                    <Image
                      src={item.src}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 35vw"
                      className="object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                  </div>
                  <figcaption
                    className="flex items-center justify-between pt-4 text-[9.5px] tracking-[0.22em] uppercase"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <span className="font-semibold text-[#2A2723]">
                      {item.title}
                    </span>
                    <span className="text-[#2A2723]/55">{item.meta}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          {/* 2. Minimal 1px Hairline FAQ Accordion for Interior Designers & Homeowners */}
          <div>
            <span
              className="text-[10px] font-semibold tracking-[0.28em] uppercase text-[#2A2723]/60 block mb-4"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              FOR INTERIOR DESIGNERS &amp; HOMEOWNERS
            </span>
            <h3 className="font-era-display text-3xl sm:text-5xl text-[#2A2723] mb-10">
              COMMON QUESTIONS
            </h3>

            <div className="divide-y divide-[#2A2723]/15 border-y border-[#2A2723]/15">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={faq.q} className="py-6">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-6 text-left cursor-pointer group"
                    >
                      <span
                        className="text-xs sm:text-sm font-semibold tracking-[0.06em] uppercase text-[#2A2723] group-hover:opacity-65 transition-opacity"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        {faq.q}
                      </span>
                      <span className="font-era-display text-2xl text-[#2A2723] shrink-0">
                        {isOpen ? "—" : "+"}
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <p
                            className="pt-4 pr-10 text-xs sm:text-[13px] leading-relaxed text-[#2A2723]/75"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Pure Editorial Conversion Block (+995 592 82 22 60, Guram Panjikidze St 1, Tbilisi) */}
          <div id="inquiry" className="pt-8 border-t border-[#2A2723]/15">
            <span
              className="text-[10px] font-semibold tracking-[0.28em] uppercase text-[#2A2723]/60 block mb-4"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              DIRECT WORKSHOP COMMISSION
            </span>

            <div className="flex flex-wrap items-baseline justify-between gap-6 mb-10">
              <h3 className="font-era-display text-[clamp(2.8rem,6vw,5.4rem)] text-[#2A2723]">
                DISCUSS YOUR SPACE
              </h3>
              <span
                className="font-era-script text-5xl sm:text-6xl text-[#B39359] -rotate-6"
                style={{ fontFamily: "var(--font-script), cursive" }}
              >
                Tbilisi
              </span>
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-y border-[#2A2723]/12 mb-10"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <div>
                <span className="text-[9.5px] font-semibold tracking-[0.24em] uppercase text-[#2A2723]/55 block mb-2">
                  WHATSAPP &amp; DIRECT LINE
                </span>
                <a
                  href={`tel:${SITE.phoneHref}`}
                  className="font-era-display text-2xl sm:text-3xl text-[#2A2723] hover:opacity-65 transition-opacity"
                >
                  +995 592 82 22 60
                </a>
              </div>

              <div>
                <span className="text-[9.5px] font-semibold tracking-[0.24em] uppercase text-[#2A2723]/55 block mb-2">
                  WORKSHOP ADDRESS
                </span>
                <a
                  href={SITE.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-era-display text-2xl sm:text-3xl text-[#2A2723] hover:opacity-65 transition-opacity"
                >
                  Guram Panjikidze St 1, Tbilisi
                </a>
              </div>
            </div>

            {/* Underlined Condensed Didone Action Links (Zero Boxy Buttons) */}
            <div className="flex flex-wrap items-center gap-8">
              <a
                href={`${SITE.whatsappBase}?text=${encodeURIComponent(
                  "Hello Kencho Group! I would like to discuss a custom furniture project in Tbilisi."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-era-display text-2xl sm:text-3xl text-[#2A2723] border-b border-[#2A2723] pb-1 hover:opacity-65 transition-opacity"
              >
                SEND DRAWINGS ON WHATSAPP
              </a>

              <span className="text-[#2A2723]/30 text-2xl">/</span>

              <button
                type="button"
                onClick={() => openContact({ about: "Direct Workshop Inquiry" })}
                className="font-era-display text-2xl sm:text-3xl text-[#2A2723] border-b border-[#2A2723] pb-1 hover:opacity-65 transition-opacity cursor-pointer"
              >
                BOOK WORKSHOP VISIT
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
