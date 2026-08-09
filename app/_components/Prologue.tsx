"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { IMAGES, src } from "@/lib/images";
import { SITE } from "@/lib/site";
import { DUR, EASE, SCRUB, STAGGER } from "@/lib/motion";

/*
 * THE PROLOGUE — one shot, told slowly.
 *
 * A single full-bleed photograph of the work; a short line over it; a
 * place and its coordinates in monospace under that. Scroll, and the
 * line steps aside for the name of the workshop at poster size — the
 * title rising over the drifting image the way a landmass rises over
 * cloud — until a veil of paper lifts from the bottom and hands the
 * page to the manifesto.
 *
 * One pinned, scrubbed timeline; the visitor's thumb is the dolly.
 * (The SKIP pill that used to ride the corner was cut on the client's
 * call — the scroll cue alone marks the way on.) Reduced motion (and
 * no JS at all) reads the whole poster as a still: shot, line, place
 * and title are all composed in CSS and served in the HTML.
 */

/** SITE.geo, set the way an expedition writes a fix. */
function coords(): string {
  const { latitude, longitude } = SITE.geo;
  const dms = (value: number) => {
    const deg = Math.floor(Math.abs(value));
    const min = Math.round((Math.abs(value) - deg) * 60);
    return `${deg}°${String(min).padStart(2, "0")}'`;
  };
  return `[ ${dms(latitude)} N, ${dms(longitude)} E ]`;
}

export default function Prologue() {
  const rootRef = useRef<HTMLElement>(null);
  const t = useTranslations("prologue");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const pin = root.querySelector<HTMLElement>("[data-pro-pin]");
        const shot = root.querySelector<HTMLElement>("[data-pro-shot]");
        const dim = root.querySelector<HTMLElement>("[data-pro-dim]");
        /* The arrival animates the line's CHILDREN and the scrub hides
         * its PARENT — never the same element from both systems, or a
         * ScrollTrigger refresh render can strand an autoAlpha
         * visibility:hidden under the arrival's opacity. */
        const lineWrap = root.querySelector<HTMLElement>("[data-pro-line]");
        const line = Array.from(
          root.querySelectorAll<HTMLElement>("[data-pro-line] > *"),
        );
        const titleWords = Array.from(
          root.querySelectorAll<HTMLElement>("[data-pro-title] > *"),
        );
        const veil = root.querySelector<HTMLElement>("[data-pro-veil]");
        const cue = root.querySelector<HTMLElement>("[data-pro-cue]");
        if (!pin) return;

        /* ARRIVAL — the shot settles out of a slow zoom while the line
         * rises through it. Waits for the preloader when one is up. */
        const arrival = gsap.timeline({ paused: true });
        if (shot) {
          arrival.fromTo(
            shot,
            { scale: 1.1 },
            { scale: 1, duration: DUR.curtain, ease: EASE.out },
            0,
          );
        }
        arrival
          .from(
            line,
            {
              y: 60,
              opacity: 0,
              duration: DUR.reveal,
              ease: EASE.out,
              stagger: STAGGER.lines,
            },
            0.2,
          )
          .from(
            [cue].filter(Boolean),
            { opacity: 0, duration: DUR.base, ease: EASE.soft },
            0.9,
          );

        const play = () => arrival.play();
        if (document.documentElement.classList.contains("is-loading")) {
          window.addEventListener("alma:loaded", play, { once: true });
        } else {
          play();
        }

        /* THE DOLLY — pinned scrub: drift, dim, title, veil, release.
         * The title is hidden here (fromTo with immediateRender) so a
         * no-JS or reduced-motion visitor keeps the composed poster. */
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pin,
            start: "top top",
            end: "+=200%",
            pin: true,
            scrub: SCRUB.pinned,
            anticipatePin: 1,
          },
        });

        if (shot) tl.to(shot, { yPercent: 8, ease: EASE.none, duration: 1 }, 0);
        if (dim) tl.to(dim, { opacity: 0.55, ease: EASE.none, duration: 0.5 }, 0.2);

        /* The line steps aside… */
        if (lineWrap) {
          tl.to(
            lineWrap,
            { autoAlpha: 0, y: -60, duration: 0.18, ease: EASE.crossfade },
            0.24,
          );
        }

        /* …and the name rises over the cloud, each word at its own
         * rate so the title reads as layers rather than a label. */
        tl.fromTo(
          titleWords,
          { autoAlpha: 0, y: 140 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.3,
            ease: EASE.crossfade,
            stagger: 0.08,
          },
          0.34,
          /* Plain opacity — the arrival owns this element's fade-in, and
           * autoAlpha here could strand visibility:hidden across the two. */
        ).to(cue, { opacity: 0, duration: 0.08 }, 0.28);

        /* The paper lifts and takes the page. */
        if (veil) {
          tl.fromTo(
            veil,
            { autoAlpha: 0, yPercent: 30 },
            { autoAlpha: 1, yPercent: 0, duration: 0.22, ease: EASE.crossfade },
            0.78,
          );
        }
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section id="hero" ref={rootRef} data-prologue aria-label={t("line")}>
      <div data-pro-pin className="pro-pin">
        {/* The shot — taller than its frame so the drift never shows
            an edge. */}
        <div data-pro-shot className="pro-shot">
          <Image
            src={src(IMAGES.heroMain, 1600)}
            alt={IMAGES.heroMain.alt}
            fill
            sizes="100vw"
            preload
            className="object-cover"
          />
        </div>
        {/* Standing scrim for legibility, and a second layer the
            timeline deepens as the title arrives. */}
        <div aria-hidden="true" className="pro-scrim" />
        <div data-pro-dim aria-hidden="true" className="pro-dim" />

        {/* The line, and the fix under it. */}
        <div data-pro-line className="pro-line">
          <p className="u-display pro-line-text">{t("line")}</p>
          <p className="gx-mono pro-place">
            <span>{t("place")}</span>
            <span aria-hidden="true" className="gx-meta-rule" />
            <span>{coords()}</span>
          </p>
        </div>

        {/* The name. Composed in CSS; the timeline stages its entry. */}
        <h1 data-pro-title className="pro-title">
          <span className="u-display pro-title-main">{SITE.wordmark}</span>
          <span className="pro-title-sub">{SITE.wordmarkSub}</span>
        </h1>

        {/* The paper veil that hands off to the manifesto. */}
        <div data-pro-veil aria-hidden="true" className="pro-veil" />

        <span data-pro-cue aria-hidden="true" className="pro-cue" />
      </div>
    </section>
  );
}
