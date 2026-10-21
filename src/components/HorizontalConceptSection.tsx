"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Link } from "@/i18n/navigation";

gsap.registerPlugin(ScrollTrigger);

/* Scroll budget, in viewport heights. TRACK + RISE are the 320% the
 * choreography runs over (82% sideways, 18% photo rise). HOLD keeps the
 * finished photograph pinned while CircleRevealSection, pulled up 85vh by
 * its negative margin, opens its portal over it. */
const TRACK_VH = 262.4;
const RISE_VH = 57.6;
const HOLD_VH = 85;

/* Foreground silhouettes glide this much faster than the track. */
const FOREGROUND_SPEED = 1.3;

/* ---------------------------------------------------------------------
 * Stop 3 wave: a Catmull-Rom curve through fixed points, so each
 * milestone dot can sit exactly on the stroke it belongs to.
 * ------------------------------------------------------------------ */
const WAVE_POINTS: Array<[number, number]> = [
  [0, 74],
  [100, 52],
  [300, 80],
  [500, 44],
  [700, 78],
  [900, 50],
  [1000, 68],
];

function catmullRom(points: Array<[number, number]>): string {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const WAVE_D = catmullRom(WAVE_POINTS);

const MILESTONES = [
  { title: "MEASUREMENT", time: "DAY 1", point: WAVE_POINTS[1] },
  { title: "3D DESIGN", time: "5 DAYS", point: WAVE_POINTS[2] },
  { title: null, time: null, point: WAVE_POINTS[3] },
  { title: "WORKSHOP", time: "3 WEEKS", point: WAVE_POINTS[4] },
  { title: "INSTALLATION", time: "2 DAYS", point: WAVE_POINTS[5] },
] as const;

/* ---------------------------------------------------------------------
 * Olive-sprig silhouettes, generated from a seed so server and client
 * draw the same leaves.
 * ------------------------------------------------------------------ */
interface SprigSpec {
  length: number;
  bend: number;
  leaves: number;
  seed: number;
}

function leafPath(l: number, w: number): string {
  return `M0 0 C${w.toFixed(1)} ${(-l * 0.3).toFixed(1)} ${(w * 0.8).toFixed(1)} ${(-l * 0.78).toFixed(1)} 0 ${(-l).toFixed(1)} C${(-w * 0.8).toFixed(1)} ${(-l * 0.78).toFixed(1)} ${(-w).toFixed(1)} ${(-l * 0.3).toFixed(1)} 0 0Z`;
}

function buildSprig({ length, bend, leaves, seed }: SprigSpec) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const cx = length * 0.5;
  const cy = -bend;
  const at = (t: number) => ({
    x: 2 * (1 - t) * t * cx + t * t * length,
    y: 2 * (1 - t) * t * cy,
  });
  const angle = (t: number) =>
    (Math.atan2(2 * (1 - t) * cy - 2 * t * cy, 2 * (1 - t) * cx + 2 * t * (length - cx)) *
      180) /
    Math.PI;

  const parts: Array<{ d: string; transform: string }> = [];
  const fruit: Array<{ x: number; y: number; r: number }> = [];

  for (let i = 0; i < leaves; i++) {
    const t = 0.1 + (i / (leaves - 1)) * 0.84;
    const { x, y } = at(t);
    const side = i % 2 === 0 ? 1 : -1;
    const l = (78 + rand() * 46) * (1 - t * 0.35);
    const w = l * (0.15 + rand() * 0.05);
    const rot = angle(t) + 90 + side * (34 + rand() * 20);
    parts.push({
      d: leafPath(l, w),
      transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`,
    });
    if (i % 4 === 2) {
      const a = ((angle(t) - side * 70) * Math.PI) / 180;
      fruit.push({
        x: x + Math.cos(a) * 16,
        y: y + Math.sin(a) * 16,
        r: 7 + rand() * 3,
      });
    }
  }

  const tip = at(1);
  parts.push({
    d: leafPath(64, 11),
    transform: `translate(${tip.x.toFixed(1)} ${tip.y.toFixed(1)}) rotate(${(angle(1) + 90).toFixed(1)})`,
  });

  return {
    stem: `M0 0 Q${cx} ${cy} ${length} 0`,
    parts,
    fruit,
    viewBox: `-150 ${-bend - 160} ${length + 300} ${bend + 320}`,
  };
}

function OliveSprig({ spec }: { spec: SprigSpec }) {
  const sprig = buildSprig(spec);
  return (
    <svg
      viewBox={sprig.viewBox}
      className="w-full h-auto overflow-visible"
      fill="#2A2723"
      aria-hidden="true"
    >
      <path
        d={sprig.stem}
        fill="none"
        stroke="#2A2723"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {sprig.parts.map((p, i) => (
        <path key={i} d={p.d} transform={p.transform} />
      ))}
      {sprig.fruit.map((f, i) => (
        <ellipse
          key={i}
          cx={f.x.toFixed(1)}
          cy={f.y.toFixed(1)}
          rx={(f.r * 0.8).toFixed(1)}
          ry={f.r.toFixed(1)}
        />
      ))}
    </svg>
  );
}

function JoineryStar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 4 L23 17 L36 20 L23 23 L20 36 L17 23 L4 20 L17 17 Z" />
      <path d="M9 9 L17.5 17.5 M31 9 L22.5 17.5 M31 31 L22.5 22.5 M9 31 L17.5 22.5" />
      <circle cx="20" cy="20" r="2" fill="currentColor" />
    </svg>
  );
}

const STOP1_LINES = [
  "KENCHO IS A BESPOKE MILLWORK STUDIO",
  "DESIGNED AROUND QUIET LUXURY, WARM TIMBER",
  "AND EFFORTLESS LIVING IN TBILISI.",
];

const STOP1_SUBTEXT = ["One team measures, draws, and builds", "every piece under one roof."];

export default function HorizontalConceptSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const foregroundRef = useRef<HTMLDivElement>(null);
  const stop1Ref = useRef<HTMLDivElement>(null);
  const portraitInnerRef = useRef<HTMLDivElement>(null);
  const magnetRef = useRef<HTMLDivElement>(null);
  const stop3InnerRef = useRef<HTMLDivElement>(null);
  const waveWrapRef = useRef<HTMLDivElement>(null);
  const wavePathRef = useRef<SVGPathElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const viewport = viewportRef.current;
      const track = trackRef.current;
      const foreground = foregroundRef.current;
      const stop1 = stop1Ref.current;
      const portraitInner = portraitInnerRef.current;
      const magnet = magnetRef.current;
      const stop3Inner = stop3InnerRef.current;
      const waveWrap = waveWrapRef.current;
      const wave = wavePathRef.current;
      const photo = photoRef.current;

      if (
        !section ||
        !viewport ||
        !track ||
        !foreground ||
        !stop1 ||
        !portraitInner ||
        !magnet ||
        !stop3Inner ||
        !waveWrap ||
        !wave ||
        !photo
      ) {
        return;
      }

      const mm = gsap.matchMedia();

      // Stop 1 entrance (every size): masked lines slice upward on entry.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const heading = stop1.querySelector("[data-heading]");
        gsap
          .timeline({
            scrollTrigger: {
              trigger: heading,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          })
          .from(stop1.querySelectorAll("[data-label]"), {
            opacity: 0,
            y: 12,
            duration: 0.6,
            ease: "power3.out",
          })
          .from(
            stop1.querySelectorAll("[data-line]"),
            { yPercent: 115, duration: 0.9, ease: "power3.out", stagger: 0.1 },
            0.05
          )
          .from(
            stop1.querySelectorAll("[data-sub]"),
            { yPercent: 115, duration: 0.7, ease: "power3.out", stagger: 0.08 },
            0.45
          )
          .from(
            stop1.querySelectorAll("[data-star]"),
            { opacity: 0, rotate: -45, duration: 0.9, ease: "power3.out" },
            0.6
          );
      });

      // Desktop: pinned horizontal journey, then the photograph rises.
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          const shift = () => -(track.scrollWidth - window.innerWidth);
          const waveLength = wave.getTotalLength();

          gsap.set(viewport, { overflow: "hidden" });
          gsap.set(photo, { yPercent: 100, autoAlpha: 1 });
          gsap.set(portraitInner, { scale: 1.12, xPercent: -8 });
          gsap.set(wave, {
            strokeDasharray: waveLength,
            strokeDashoffset: waveLength,
          });

          gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: section,
                start: "top top",
                end: () =>
                  `+=${(window.innerHeight * (TRACK_VH + RISE_VH + HOLD_VH)) / 100}`,
                pin: true,
                scrub: 1,
                invalidateOnRefresh: true,
              },
            })
            // 0% -> 82%: the track slides through the three stops.
            .to(track, { x: shift, duration: TRACK_VH }, 0)
            .to(
              foreground,
              { x: () => shift() * FOREGROUND_SPEED, duration: TRACK_VH },
              0
            )
            .to(portraitInner, { xPercent: 8, duration: TRACK_VH }, 0)
            .to(
              wave,
              { strokeDashoffset: 0, duration: TRACK_VH * 0.38 },
              TRACK_VH * 0.6
            )
            // 82% -> 100%: Stop 3 lifts away as the photograph rises.
            .to(
              stop3Inner,
              { yPercent: -65, duration: RISE_VH, ease: "power1.inOut" },
              TRACK_VH
            )
            .to(
              photo,
              { yPercent: 0, duration: RISE_VH, ease: "power1.inOut" },
              TRACK_VH
            )
            // The cream feather only exists to blend the rise; once the
            // photo fills the frame it clears so the HUD reads on the photo.
            .to(
              photo.querySelector("[data-feather]"),
              { opacity: 0, duration: RISE_VH * 0.35 },
              TRACK_VH + RISE_VH * 0.65
            )
            .to({}, { duration: HOLD_VH });
        }
      );

      // Phones: stacked stops; the wave simply draws itself on entry.
      mm.add(
        "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        () => {
          const waveLength = wave.getTotalLength();
          gsap.fromTo(
            wave,
            { strokeDasharray: waveLength, strokeDashoffset: waveLength },
            {
              strokeDashoffset: 0,
              duration: 1.4,
              ease: "power2.inOut",
              scrollTrigger: { trigger: waveWrap, start: "top 80%" },
            }
          );
        }
      );

      // Magnetic circle (fine pointers only).
      mm.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const toX = gsap.quickTo(magnet, "x", { duration: 0.6, ease: "power3.out" });
          const toY = gsap.quickTo(magnet, "y", { duration: 0.6, ease: "power3.out" });
          const move = (e: PointerEvent) => {
            const r = magnet.getBoundingClientRect();
            toX((e.clientX - (r.left + r.width / 2)) * 0.3);
            toY((e.clientY - (r.top + r.height / 2)) * 0.3);
          };
          const leave = () => {
            toX(0);
            toY(0);
          };
          magnet.addEventListener("pointermove", move);
          magnet.addEventListener("pointerleave", leave);
          return () => {
            magnet.removeEventListener("pointermove", move);
            magnet.removeEventListener("pointerleave", leave);
          };
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="concept"
      ref={sectionRef}
      data-hud-tone="ink"
      aria-labelledby="concept-heading"
      className="relative w-full overflow-hidden bg-[#FFFFFF] text-[#2A2723]"
    >
      {/* Without JS (or with reduced motion) desktop scrolls this strip natively. */}
      <div
        ref={viewportRef}
        className="relative md:h-screen md:overflow-x-auto [scrollbar-width:none]"
      >
        {/* =============================================================
         * HORIZONTAL TRACK (310vw: 100 + 110 + 100)
         * ========================================================== */}
        <div
          ref={trackRef}
          className="flex flex-col md:flex-row md:items-center md:h-screen md:w-[310vw] will-change-transform"
        >
          {/* ---------------- STOP 1 — THE CONCEPT ---------------- */}
          <div
            ref={stop1Ref}
            className="w-full md:w-[100vw] md:h-screen flex flex-col items-center justify-center px-6 md:px-12 pt-32 pb-24 md:py-0 shrink-0"
          >
            <span
              data-label
              className="text-[9px] tracking-[0.28em] uppercase mb-8 opacity-70"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              THE CONCEPT
            </span>

            <h2
              id="concept-heading"
              data-heading
              className="flex flex-col items-center text-center"
            >
              {STOP1_LINES.map((line) => (
                <span
                  key={line}
                  className="block overflow-hidden py-[0.08em] text-[6.4vw] md:text-[3.3vw]"
                >
                  <span data-line className="block">
                    <span
                      className="font-era-display text-[#2A2723]"
                      style={{ lineHeight: 1.02 }}
                    >
                      {line}
                    </span>
                  </span>
                </span>
              ))}
            </h2>

            <p
              className="mt-8 max-w-xs text-center text-[11px] leading-relaxed text-[#2A2723]/75"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {STOP1_SUBTEXT.map((line) => (
                <span key={line} className="block overflow-hidden">
                  <span data-sub className="block">
                    {line}
                  </span>
                </span>
              ))}
            </p>

            <span data-star className="mt-8 inline-block text-[#2A2723]">
              <JoineryStar className="w-7 h-7" />
            </span>
          </div>

          {/* ---------------- STOP 2 — NEW GOLDEN CRAFT ---------------- */}
          <div className="w-full md:w-[110vw] md:h-screen flex flex-col md:flex-row items-start md:items-center md:justify-between gap-16 md:gap-0 px-6 md:px-16 py-20 md:py-0 shrink-0">
            {/* Left: giant staggered editorial title */}
            {/* pl-28 leaves room for the spaced TBILISI label beside GOLDEN */}
            <div className="relative md:pl-28 shrink-0">
              <h3 className="flex flex-col text-[15vw] md:text-[7.5vw] text-[#2A2723]">
                <span className="block ml-[8vw] md:ml-16">
                  <span className="font-era-display" style={{ lineHeight: 0.86 }}>
                    NEW
                  </span>
                </span>
                <span className="relative block ml-[16vw] md:ml-28 mt-[0.14em]">
                  <span
                    aria-hidden="true"
                    className="hidden md:block absolute right-full top-1/2 -translate-y-1/2 mr-10 whitespace-nowrap text-[10px] tracking-[0.45em] uppercase text-[#2A2723]"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    T B I L I S I
                  </span>
                  <span className="font-era-display" style={{ lineHeight: 0.86 }}>
                    GOLDEN
                  </span>
                </span>
                <span className="block ml-0 mt-[0.14em]">
                  <span className="font-era-display" style={{ lineHeight: 0.86 }}>
                    CRAFT
                  </span>
                </span>
              </h3>
            </div>

            {/* Center: tall frameless portrait with inner parallax */}
            <div
              data-hud-tone="light"
              className="relative w-full md:w-[34vw] md:max-w-[460px] h-[62vh] md:h-[68vh] overflow-hidden md:mx-12 shrink-0"
            >
              <div ref={portraitInnerRef} className="absolute inset-0 will-change-transform">
                <Image
                  src="/images/wardrobe-showcase.jpg"
                  alt="Sunlit bespoke cane-panel wardrobe and oak shoe bench by Kencho Group"
                  fill
                  sizes="(min-width: 768px) 34vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Right: magnetic circle + simple caption */}
            <div className="flex flex-col items-start md:justify-center shrink-0">
              <div ref={magnetRef} className="inline-block will-change-transform">
                <Link
                  href="/gallery"
                  className="w-44 h-44 rounded-full border border-[#2A2723]/20 flex items-center justify-center text-center p-6 hover:scale-105 hover:border-[#2A2723]/45 transition-[scale,border-color] duration-500"
                >
                  <span
                    className="text-[9px] tracking-[0.22em] leading-relaxed uppercase text-[#2A2723]"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    EXPLORE
                    <br />
                    OUR WORK
                  </span>
                </Link>
              </div>

              <div className="mt-20 max-w-xs">
                <h3 className="mb-3 text-3xl text-[#2A2723]">
                  <span className="font-era-display" style={{ lineHeight: 1 }}>
                    FROM DRAWING TO HOME
                  </span>
                </h3>
                <p
                  className="text-[11px] leading-relaxed text-[#2A2723]/75"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  No standard sizes or middlemen. We build directly from your
                  walls and habits so everything fits to the millimetre.
                </p>
              </div>
            </div>
          </div>

          {/* ---------------- STOP 3 — THE SPACE YOU WANTED ---------------- */}
          <div className="w-full md:w-[100vw] md:h-screen flex flex-col items-center justify-center px-6 md:px-16 py-24 md:py-0 shrink-0">
            <div ref={stop3InnerRef} className="w-full flex flex-col items-center will-change-transform">
              <h3 className="flex flex-col items-center text-center text-[#2A2723]">
                <span className="block text-[9vw] md:text-[5.2vw]">
                  <span className="font-era-display" style={{ lineHeight: 1 }}>
                    THE SPACE YOU WANTED
                  </span>
                </span>
                <span
                  className="block text-[12vw] md:text-[5.8vw] -my-3 md:-my-5 leading-none relative z-10"
                  style={{ fontFamily: "var(--font-script), cursive" }}
                >
                  yours
                </span>
                <span className="block text-[9vw] md:text-[5.2vw]">
                  <span className="font-era-display" style={{ lineHeight: 1 }}>
                    THIS YEAR
                  </span>
                </span>
              </h3>

              {/* Minimal hand-drawn wave map with five milestones */}
              <div ref={waveWrapRef} className="mt-16 w-full max-w-5xl relative">
                <svg
                  viewBox="0 0 1000 120"
                  className="block w-full h-auto overflow-visible"
                  aria-hidden="true"
                >
                  <path
                    ref={wavePathRef}
                    d={WAVE_D}
                    stroke="#2A2723"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>

                <ol className="contents">
                  {MILESTONES.map((m, i) => (
                    <li
                      key={i}
                      className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center pb-1.5"
                      style={{
                        left: `${m.point[0] / 10}%`,
                        top: `${(m.point[1] / 120) * 100}%`,
                      }}
                    >
                      {m.title ? (
                        <>
                          <span
                            className="text-[7.5px] md:text-[9px] tracking-[0.12em] md:tracking-[0.2em] uppercase text-center leading-relaxed whitespace-nowrap"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            {m.title}
                            <br />
                            <span className="opacity-60">{m.time}</span>
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2A2723] mx-auto mt-2" />
                        </>
                      ) : (
                        <JoineryStar className="w-7 h-7 text-[#2A2723]" />
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* =============================================================
         * FOREGROUND PARALLAX SILHOUETTES (1.3x the track speed)
         * ========================================================== */}
        <div
          ref={foregroundRef}
          className="hidden md:block absolute top-0 left-0 h-full w-[400vw] z-20 pointer-events-none will-change-transform"
          aria-hidden="true"
        >
          {/* Top-left of Stop 1 */}
          <div className="absolute -left-[7vw] -top-[11vh] w-[42vw] rotate-[24deg]">
            <OliveSprig spec={{ length: 560, bend: 70, leaves: 15, seed: 11 }} />
          </div>
          {/* Bottom-centre of the Stop 1 → 2 seam */}
          <div className="absolute left-[104vw] -bottom-[6vh] w-[44vw] -rotate-[58deg]">
            <OliveSprig spec={{ length: 480, bend: -60, leaves: 13, seed: 29 }} />
          </div>
          {/* Bottom-right of Stop 3 (the top-right corner belongs to the HUD links) */}
          <div className="absolute left-[345vw] -bottom-[8vh] w-[40vw] -rotate-[150deg] -scale-y-100">
            <OliveSprig spec={{ length: 600, bend: 80, leaves: 16, seed: 47 }} />
          </div>
        </div>
      </div>

      {/* =============================================================
       * FINAL PHOTOGRAPH (rises 100 -> 0 over the last 18% on desktop)
       * ========================================================== */}
      <div
        ref={photoRef}
        data-hud-tone="light"
        className="relative h-[90vh] md:absolute md:inset-0 md:h-full md:invisible z-30 overflow-hidden"
      >
        <Image
          src="/images/commercial-showcase.jpg"
          alt="Sunlit commercial lounge with backlit oak slat columns by Kencho Group"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div
          data-feather
          className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-[#FFFFFF] to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
