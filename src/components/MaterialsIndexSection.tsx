"use client";

import { useTranslations } from "next-intl";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText);

interface Material {
  id: string;
  label: string;
  caption: string;
  image: string;
  alt: string;
}

/* Diagonal wipe: the incoming photo slides in behind a sloped edge. */
const WIPE_DURATION = 1.1;
const SKEW_DEG = 14;
/* The mask overhangs the frame by MASK_PAD% each side so its skewed
 * corners cover even a tall phone screen (h·tan14°/2 ≈ 0.29w there); the
 * photo box inside it is re-sized back to exactly 100%. */
const MASK_PAD = 35;
const MASK_SPAN = 100 + MASK_PAD * 2;
const MASK_INSET = `-${MASK_PAD}%`;
const MASK_WIDTH = `${MASK_SPAN}%`;
const PHOTO_LEFT = `${(MASK_PAD / MASK_SPAN) * 100}%`;
const PHOTO_WIDTH = `${(100 / MASK_SPAN) * 100}%`;
/* The photo starts 20% of the frame behind its edge, then catches up. */
const DRIFT_FROM = -(MASK_SPAN - 20);

export default function MaterialsIndexSection() {
  const t = useTranslations("home.era.materials");
  /* Draft copy: confirm the material facts with Kencho before launch. */
  const MATERIALS: Material[] = [
    {
      id: "white-oak",
      label: t("oak"),
      caption: t("oakCaption"),
      image: "/furniture/white-oak-kitchen-wall-tbilisi-kencho-group.webp",
      alt: t("oakAlt"),
    },
    {
      id: "walnut",
      label: t("walnut"),
      caption: t("walnutCaption"),
      image: "/furniture/office-walnut-corridor-tbilisi-kencho-group.webp",
      alt: t("walnutAlt"),
    },
    {
      id: "marble",
      label: t("stone"),
      caption: t("stoneCaption"),
      image: "/furniture/green-marble-kitchen-tbilisi-kencho-group.webp",
      alt: t("stoneAlt"),
    },
    {
      id: "light-mirror",
      label: t("light"),
      caption: t("lightCaption"),
      image: "/furniture/backlit-slat-wall-mirror-tbilisi-kencho-group.webp",
      alt: t("lightAlt"),
    },
    {
      id: "lacquer",
      label: t("lacquer"),
      caption: t("lacquerCaption"),
      image: "/furniture/white-wardrobe-teal-bedroom-tbilisi-kencho-group.webp",
      alt: t("lacquerAlt"),
    },
  ];

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const driftRefs = useRef<Array<HTMLDivElement | null>>([]);
  const captionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const activeRef = useRef(0);
  const zRef = useRef(1);

  const [active, setActive] = useState(0);

  const { contextSafe } = useGSAP(
    () => {
      const section = sectionRef.current;
      const stage = stageRef.current;
      const list = listRef.current;
      if (!section || !stage || !list) return;

      // Captions split into masked lines (re-split on resize / font load).
      captionRefs.current.forEach((caption) => {
        const text = caption?.querySelector("[data-caption-text]");
        if (!text) return;
        SplitText.create(text, {
          type: "lines,words",
          mask: "lines",
          linesClass: "mat-line",
          wordsClass: "mat-word",
          autoSplit: true,
        });
      });

      const mm = gsap.matchMedia();

      // First entry: photo settles, list rises, the first caption reveals.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const first = captionRefs.current[activeRef.current];
        gsap
          .timeline({
            scrollTrigger: {
              trigger: section,
              start: "top 65%",
              toggleActions: "play none none reverse",
            },
          })
          .from(stage, { scale: 1.08, duration: 1.4, ease: "expo.out" }, 0)
          .from(
            list.querySelectorAll("[data-item]"),
            { opacity: 0, y: 24, duration: 0.8, ease: "power3.out", stagger: 0.07 },
            0.15
          )
          .from(
            first?.querySelectorAll(".mat-line") ?? [],
            { yPercent: 150, duration: 0.9, ease: "power3.out", stagger: 0.08 },
            0.3
          );
      });

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  const transition = (next: number) => {
    const prev = activeRef.current;
    if (next === prev) return;
    activeRef.current = next;
    setActive(next);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const layer = layerRefs.current[next];
    const slide = slideRefs.current[next];
    const drift = driftRefs.current[next];
    const caption = captionRefs.current[next];
    const outgoing = captionRefs.current[prev];
    if (!layer || !slide || !drift || !caption || !outgoing) return;

    // Once a wipe lands, every other photo goes back to hidden, in place.
    const settle = () => {
      if (activeRef.current !== next) return;
      layerRefs.current.forEach((other, i) => {
        if (i === next || !other) return;
        gsap.killTweensOf([other, slideRefs.current[i], driftRefs.current[i]]);
        gsap.set(other, { visibility: "hidden", opacity: 1 });
        gsap.set(slideRefs.current[i], { xPercent: 0 });
        gsap.set(driftRefs.current[i], { xPercent: 0, scale: 1 });
      });
    };

    // ---- Photo: the newest layer always goes on top, mid-wipe or not ----
    gsap.killTweensOf([layer, slide, drift]);
    layer.style.zIndex = String(++zRef.current);

    if (reduced) {
      gsap.set(slide, { xPercent: 0 });
      gsap.set(drift, { xPercent: 0, scale: 1 });
      gsap.fromTo(
        layer,
        { visibility: "visible", opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power1.out", onComplete: settle }
      );
    } else {
      gsap.set(layer, { visibility: "visible", opacity: 1 });
      gsap.fromTo(
        slide,
        { xPercent: 100 },
        { xPercent: 0, duration: WIPE_DURATION, ease: "power3.inOut", onComplete: settle }
      );
      // The photo trails its edge slightly, then settles from 1.08.
      gsap.fromTo(
        drift,
        { xPercent: DRIFT_FROM, scale: 1.08 },
        { xPercent: 0, scale: 1, duration: WIPE_DURATION, ease: "power3.inOut" }
      );
      gsap.to(driftRefs.current[prev], {
        xPercent: -5,
        duration: WIPE_DURATION,
        ease: "power3.inOut",
      });
    }

    // ---- Caption: old lines lift out, new lines rise in ----
    const outLines = outgoing.querySelectorAll(".mat-line");
    const outLabel = outgoing.querySelector("[data-caption-label]");
    gsap.killTweensOf([outLines, outLabel]);
    gsap.to(outLabel, { opacity: 0, duration: 0.25, ease: "power2.in" });
    gsap.to(outLines, {
      yPercent: reduced ? 0 : -150,
      opacity: reduced ? 0 : 1,
      duration: reduced ? 0.25 : 0.3,
      ease: "power2.in",
      stagger: reduced ? 0 : 0.02,
      onComplete: () => {
        if (activeRef.current !== prev) gsap.set(outgoing, { visibility: "hidden" });
      },
    });

    const inLines = caption.querySelectorAll(".mat-line");
    const inLabel = caption.querySelector("[data-caption-label]");
    gsap.killTweensOf([inLines, inLabel]);
    gsap.set(caption, { visibility: "visible" });
    gsap.fromTo(
      inLabel,
      { opacity: 0, y: reduced ? 0 : 8 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.3 }
    );
    gsap.fromTo(
      inLines,
      reduced ? { yPercent: 0, opacity: 0 } : { yPercent: 150, opacity: 1 },
      {
        yPercent: 0,
        opacity: 1,
        duration: reduced ? 0.3 : 0.8,
        ease: "power3.out",
        stagger: reduced ? 0 : 0.07,
        delay: 0.3,
      }
    );
  };

  // Wrapped at event time so every tween joins the component's context.
  const go = (next: number) => contextSafe(transition)(next);

  // Arrow keys walk the list; focus counts as hover.
  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    const next = (activeRef.current + step + MATERIALS.length) % MATERIALS.length;
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>("button")
      [next]?.focus();
  };

  return (
    <section
      id="materials"
      ref={sectionRef}
      data-hud-tone="light"
      aria-labelledby="materials-heading"
      className="relative h-screen min-h-[600px] w-full overflow-hidden bg-[#F2ECE3] text-[#FFFFFF]"
    >
      {/* =============================================================
       * PHOTO STACK — one layer per material, wiped in on a diagonal
       * ========================================================== */}
      <div ref={stageRef} className="absolute inset-0 will-change-transform">
        {MATERIALS.map((m, i) => (
          <div
            key={m.id}
            ref={(el) => {
              layerRefs.current[i] = el;
            }}
            className={`absolute inset-0 overflow-hidden ${i === 0 ? "" : "invisible"}`}
            style={{ zIndex: i === 0 ? 1 : 0 }}
          >
            <div
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="absolute inset-y-0 will-change-transform"
              style={{ left: MASK_INSET, width: MASK_WIDTH }}
            >
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ transform: `skewX(${SKEW_DEG}deg)` }}
              >
                <div
                  className="absolute inset-0"
                  style={{ transform: `skewX(${-SKEW_DEG}deg)` }}
                >
                  <div
                    ref={(el) => {
                      driftRefs.current[i] = el;
                    }}
                    className="absolute inset-y-0 will-change-transform"
                    style={{ left: PHOTO_LEFT, width: PHOTO_WIDTH }}
                  >
                    <Image
                      src={m.image}
                      alt={m.alt}
                      fill
                      sizes="100vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Soft navy washes: Kencho's photos are bright white interiors, so
          the white type and HUD need a little help everywhere they sit */}
      <div
        className="absolute inset-0 z-[100] pointer-events-none bg-[#2A2723]/15"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 z-[100] pointer-events-none bg-gradient-to-tr from-[#2A2723]/55 via-[#2A2723]/10 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-y-0 right-0 w-1/2 z-[100] pointer-events-none bg-gradient-to-l from-[#2A2723]/30 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 top-0 h-48 z-[100] pointer-events-none bg-gradient-to-b from-[#2A2723]/30 to-transparent"
        aria-hidden="true"
      />

      {/* =============================================================
       * INDEX LIST — hover, focus or tap switches the material
       * ========================================================== */}
      {/* Phones: below the HUD's link stack, which reaches ~30vh there */}
      <div className="absolute z-[110] left-6 top-[31vh] md:left-[66vw] md:top-[18vh]">
        <h2
          id="materials-heading"
          className="mb-5 text-[9px] font-semibold tracking-[0.28em] uppercase text-[#FFFFFF]/75"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {t("heading")}{MATERIALS.length}
        </h2>

        <ul
          ref={listRef}
          onKeyDown={onListKey}
          className="relative pl-4 md:pl-5 text-[7vw] md:text-[2.25vw]"
        >
          {/* Hairline track + the active segment that slides along it */}
          <span
            className="absolute left-0 inset-y-0 w-px bg-[#FFFFFF]/25"
            aria-hidden="true"
          />
          <span
            className="absolute left-0 top-0 w-px bg-[#FFFFFF] transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              height: `${100 / MATERIALS.length}%`,
              transform: `translateY(${active * 100}%)`,
            }}
            aria-hidden="true"
          />

          {MATERIALS.map((m, i) => (
            <li key={m.id} data-item>
              <button
                type="button"
                aria-pressed={active === i}
                aria-controls={`material-caption-${m.id}`}
                onMouseEnter={() => go(i)}
                onFocus={() => go(i)}
                onClick={() => go(i)}
                className={`block text-left cursor-pointer transition-opacity duration-300 ease-out focus-visible:outline-none focus-visible:underline underline-offset-[0.2em] decoration-1 ${
                  active === i ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <span className="font-era-display" style={{ lineHeight: 1.18 }}>
                  {m.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* =============================================================
       * CAPTIONS — all in the HTML; only the active one is visible
       * ========================================================== */}
      <div className="absolute z-[110] left-6 right-6 bottom-[7vh] md:left-[11vw] md:right-auto md:w-[min(36vw,600px)]">
        {MATERIALS.map((m, i) => (
          <div
            key={m.id}
            id={`material-caption-${m.id}`}
            ref={(el) => {
              captionRefs.current[i] = el;
            }}
            className={`absolute left-0 right-0 bottom-0 [--indent:22vw] md:[--indent:9vw] ${
              i === 0 ? "" : "invisible"
            }`}
          >
            <span
              data-caption-label
              className="absolute bottom-full mb-3 left-[var(--indent)] text-[9px] md:text-[10px] font-semibold tracking-[0.22em] uppercase whitespace-nowrap"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {m.label}
            </span>
            <p
              data-caption-text
              className="era-material-copy uppercase text-[5.4vw] md:text-[1.85vw] tracking-[-0.01em] indent-[var(--indent)] [&_.mat-line]:indent-0 [&>*:first-child_.mat-line]:indent-[var(--indent)] [&_.mat-word]:inline-block [&_.mat-word]:indent-0"
              style={{
                lineHeight: 1.25,
              }}
            >
              {m.caption}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
