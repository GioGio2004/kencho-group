"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Link } from "@/i18n/navigation";
import type { ChapterHighlights } from "@/lib/catalogue";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
 * THE STRIP — the catalogue's chapters as a run of panels: a photograph
 * on top, a coloured body with four of the chapter's pages as links, a
 * plus into the chapter, the title, a counter, and the chapter's own
 * line. A white band above the run carries the label, a hint and a short
 * line that shows how far along the run is.
 *
 * With a fine pointer on a desktop the section pins and scrolling down
 * drives the run left, panel by panel, with a snap. Everywhere else —
 * phones, tablets, reduced motion — the run is a native swipe that snaps
 * one panel per flick. The run is in the HTML either way.
 */

/** Panel colours, in chapter order: powder sky, ice blue, sand, cream —
 * all light, with navy ink (the site's light palette, app/globals.css). */
const PALETTE = [
  { panel: "#F2ECE3", ink: "#2A2723" },
  { panel: "#F8F4EE", ink: "#2A2723" },
  { panel: "#E5E1D6", ink: "#2A2723" },
  { panel: "#EFECE3", ink: "#2A2723" },
];

const PIN_WHEN =
  "(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export default function FocusStrip({ chapters }: { chapters: ChapterHighlights[] }) {
  const t = useTranslations("strip");
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const steps = Math.max(1, chapters.length - 1);

  // How far along the run is, for the band's line and the counter.
  const report = (progress: number) => {
    root.current?.style.setProperty("--p", progress.toFixed(4));
    setActive(Math.round(progress * steps));
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(PIN_WHEN, () => {
        const el = track.current;
        const section = root.current;
        if (!el || !section) return;
        // The track stops being a scroller before the scroll takes over.
        section.classList.add("is-pinned");
        el.scrollLeft = 0;
        const distance = () => el.scrollWidth - window.innerWidth;
        const tween = gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            // Lenis already smooths the scroll; the run follows it directly.
            scrub: true,
            invalidateOnRefresh: true,
            snap: {
              snapTo: 1 / steps,
              duration: { min: 0.25, max: 0.6 },
              ease: "power2.inOut",
              // Settle on the nearest panel, not where momentum would land.
              inertia: false,
            },
            onUpdate: (self) => report(self.progress),
          },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          section.classList.remove("is-pinned");
          gsap.set(el, { clearProps: "transform" });
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [chapters.length] },
  );

  // Swiping: the line and the counter follow the track.
  const onScroll = () => {
    const el = track.current;
    if (!el || root.current?.classList.contains("is-pinned")) return;
    const span = el.scrollWidth - el.clientWidth;
    report(span > 0 ? el.scrollLeft / span : 0);
  };

  return (
    <section ref={root} className="strip" aria-label={t("label")}>
      <div className="strip-head">
        <p className="u-meta text-mute">{t("label")}</p>
        <p className="strip-hint u-meta">
          <span className="md:hidden">{t("swipe")}</span>
          <span className="hidden md:inline">{t("scroll")}</span>
          <span className="strip-bar" aria-hidden="true" />
        </p>
      </div>

      <div ref={track} className="strip-track" onScroll={onScroll}>
        {chapters.map((chapter, i) => {
          const colors = PALETTE[i % PALETTE.length];
          return (
            <article
              key={chapter.slug}
              className="panel"
              style={{ "--panel": colors.panel, "--panel-ink": colors.ink } as React.CSSProperties}
              aria-current={active === i ? "true" : undefined}
            >
              <Link href={`/gallery/${chapter.slug}`} className="panel-img" tabIndex={-1} aria-hidden="true">
                {chapter.cover && (
                  <Image
                    src={chapter.cover.url}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 86vw, 44vw"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                )}
              </Link>

              <div className="panel-body">
                <ul className="panel-links">
                  {chapter.highlights.map((h) => (
                    <li key={h.index}>
                      <Link href={`/gallery/${chapter.slug}?p=${h.index}`} className="chev">
                        <span className="truncate">{h.heading}</span>
                        <svg viewBox="0 0 8 12" width="8" height="12" aria-hidden="true">
                          <path d="M1 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/gallery/${chapter.slug}`}
                  className="circle panel-plus"
                  aria-label={t("open", { title: chapter.title })}
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                    <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.25" />
                  </svg>
                </Link>

                <div className="panel-foot">
                  <div>
                    <h2 className="panel-title u-display">
                      <Link href={`/gallery/${chapter.slug}`}>{chapter.title}</Link>
                    </h2>
                    <p className="panel-count tabular-nums">
                      {i + 1} / {chapters.length}
                    </p>
                  </div>
                  <p className="panel-tag">{chapter.description}</p>
                </div>
              </div>
            </article>
          );
        })}
        <div className="strip-end" aria-hidden="true" />
      </div>
    </section>
  );
}
