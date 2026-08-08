"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { Rule } from "@/app/_components/LineWork";
import { IMAGES, src } from "@/lib/images";
import { DUR, EASE, STAGGER } from "@/lib/motion";

/*
 * THE EDITORIAL OPENING — the quiet one.
 *
 * The name at poster scale on the page's own surface, and one large
 * photograph of the work bleeding off the right edge. No video, no
 * scrub, no charcoal: the first screen is a spread rather than a shot.
 *
 * It exists because the cinematic opening makes one argument very well —
 * "walk through a finished room" — and cannot make the other one at all:
 * who this is, in one glance, above the fold, in text a search engine can
 * read. This variant is the masthead of a magazine; the other is the
 * establishing shot of a film. Both are correct, for different visitors,
 * which is why the footer lets them choose instead of us guessing.
 *
 * SSR IS THE FINISHED STATE, as everywhere else. The type is laid out
 * and the photograph is present in the served HTML; GSAP only winds them
 * back and plays them in. Reduced motion and a dead bundle both get the
 * spread, already set.
 */

export default function HeroEditorial() {
  const rootRef = useRef<HTMLElement>(null);
  const t = useTranslations("hero");

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(root);

        /*
         * A masthead arrives in one gesture, not six. The name leads,
         * everything else follows it inside a single stagger — the
         * house rule that type starts earlier and finishes sooner than
         * the media beside it.
         */
        const tl = gsap.timeline({ defaults: { ease: EASE.narrative } });

        tl.from(q("[data-line]"), {
          yPercent: 108,
          duration: DUR.reveal,
          stagger: STAGGER.lines,
        })
          .from(
            q("[data-meta]"),
            { y: 18, autoAlpha: 0, duration: DUR.base, stagger: STAGGER.items },
            "-=0.65",
          )
          .from(
            q("[data-frame]"),
            { autoAlpha: 0, duration: DUR.wipe },
            "-=0.95",
          );

        return () => {
          tl.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const lines = t("lines").split("\n");

  return (
    <section
      ref={rootRef}
      aria-labelledby="hero-ed-title"
      className="hero-ed"
    >
      <div className="hero-ed-grid">
        {/* ---- the masthead ---- */}
        <div className="hero-ed-copy">
          <h1 id="hero-ed-title" className="hero-ed-title u-display">
            {lines.map((line, i) => (
              // One mask per line, so the reveal has something to move
              // inside. `overflow: clip` rather than hidden — a hidden
              // ancestor would make this a scroll container.
              <span key={i} className="hero-ed-mask">
                <span data-line className="block">
                  {line}
                </span>
              </span>
            ))}
          </h1>

          {/*
            The signature. One rule and one line, at the BOTTOM of the
            column — the annotated brief moved it down into the empty
            space, where it closes the composition instead of trailing
            the headline.
          */}
          <div data-meta className="hero-ed-foot">
            <Rule delay={0.1} className="hero-ed-rule" />
            <p className="hero-ed-sub">{t("sub")}</p>
          </div>
        </div>

        {/* ---- the work ---- */}
        <figure data-frame className="hero-ed-frame">
          {/*
            THE LCP ELEMENT, and told so explicitly.

            `priority` alone is deprecated in Next 16 and — per
            next/dist/shared/lib/get-img-props.js — never sets
            fetchpriority on the tag; it only adds a preload. Both are
            stated, so the browser both discovers it early AND ranks it
            above everything else in the queue. Measured before this: the
            hidden walkthrough poster went out High and this went Low.
          */}
          <Image
            src={src(IMAGES.heroMain, 1800)}
            alt={t("imageAlt")}
            fill
            preload
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="object-cover"
          />
        </figure>
      </div>
    </section>
  );
}
