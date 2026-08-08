"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { DUR, EASE } from "@/lib/motion";

/*
 * JOURNEYRAIL — where you are, and how much is left.
 *
 * A page this long asks for a lot of scrolling on faith. The rail is the
 * answer to "how much more of this is there": a tick per section down the
 * right edge, the one you are in extended and named, and a hairline that
 * fills as the page is spent. It is the cheapest thing on the site and
 * probably the one that keeps people scrolling, because an unmarked
 * scroll of this length reads as endless and a marked one reads as a
 * route with a destination.
 *
 * Adapted from the scroll-world engine's route rail.
 *
 * NO SCROLL CODE OF ITS OWN. The ticks are ordinary `#anchor` links, and
 * SmoothScroll already intercepts every `a[href^="#"]` on the document
 * and glides Lenis to the target. A `scrollTo` here would be a second,
 * slightly different scroll animation for the same gesture.
 *
 * MIX-BLEND-DIFFERENCE, not a colour per section. The rail crosses sand,
 * charcoal and photography, and difference blending inverts it against
 * whatever is behind — one rule instead of a colour table that has to be
 * revised every time a section changes its background. It is also why
 * nothing here is brass: difference would render the accent as its
 * complement, which is a colour the palette does not contain.
 *
 * ARIA-CURRENT IS THE STATE. Not a class the styling reads and a
 * attribute the screen reader reads — one attribute, styled through
 * `group-aria-[current=true]`. Two sources of truth for "which stop am I
 * on" is how a rail ends up looking right and announcing wrong.
 *
 * DESKTOP ONLY. The bottom corners of a phone already hold the WhatsApp
 * button and the audio guide, and a third floating control on a 390px
 * screen is clutter, not orientation.
 *
 * DEGRADATION. The markup is a plain list of anchor links. GSAP is what
 * HIDES it for the length of the hero, so a failed bundle leaves the rail
 * visible and working rather than invisible — the safe direction for a
 * thing whose only job is navigation.
 */

/**
 * The route. `id` is the section's own DOM id; `label` is the key of the
 * eyebrow that section already prints, so the rail never invents a name
 * for a section or needs a translation of its own.
 *
 * Kinetic, Showcase and SocialProof came off this list when the page
 * cut them — a rail stop pointing at a section that is not in the
 * document is a button that scrolls nowhere.
 */
const STOPS = [
  { id: "hero", label: "nav.home" },
  { id: "manifesto", label: "manifesto.eyebrow" },
  { id: "featured", label: "featured.eyebrow" },
  { id: "projects", label: "projects.eyebrow" },
  { id: "panorama", label: "panorama.eyebrow" },
  { id: "services", label: "services.eyebrow" },
  { id: "process", label: "process.eyebrow" },
  { id: "faq", label: "faq.eyebrow" },
  { id: "contact", label: "contact.eyebrow" },
] as const;

/** Label, shown once its tick is active, hovered or focused. */
const LABEL_CLASS =
  "translate-x-2 text-[0.6rem] tracking-[0.24em] whitespace-nowrap text-white uppercase opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 group-aria-[current=true]:translate-x-0 group-aria-[current=true]:opacity-100";

/** The tick. Length and brightness — the two channels a printed rule has. */
const TICK_CLASS =
  "block h-px w-4 bg-white/40 transition-[width,background-color] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:w-7 group-hover:bg-white group-aria-[current=true]:w-9 group-aria-[current=true]:bg-white";

export default function JourneyRail() {
  const rootRef = useRef<HTMLElement>(null);
  const t = useTranslations();

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      if (!root) return;

      const fill = root.querySelector<HTMLElement>("[data-rail-fill]");
      const ticks = gsap.utils.toArray<HTMLElement>("[data-rail-tick]", root);
      if (!ticks.length) return;

      /*
       * Active state is written straight to the DOM rather than held in
       * React. It changes on nearly every viewport of scroll, and a state
       * update per section boundary would re-render ten links to move one
       * attribute.
       */
      let current = -1;
      const setActive = (index: number) => {
        if (index === current) return;
        current = index;
        ticks.forEach((tick, i) => {
          tick.setAttribute("aria-current", i === index ? "true" : "false");
        });
      };

      /*
       * Which stop owns the middle of the viewport, read from live
       * geometry on every update.
       *
       * The obvious build — one ScrollTrigger per section with an
       * `onToggle` that claims the rail — is wrong in a way that only
       * shows up on a jump: a scroll that crosses several boundaries in
       * one go fires every crossed trigger in the same tick, the last
       * callback to run wins regardless of where the viewport actually
       * ended up, and the rail latches onto a section two stops away.
       * Measured that failing on five of six stops before this rewrite.
       *
       * Reading rects is also the only version that is right about the
       * pinned sections. A pinned element's rect stays across the middle
       * of the viewport for as long as it is pinned, which is exactly the
       * answer wanted — the hero IS the current section for the whole of
       * its pin, even though no section boundary moves during it.
       *
       * Ten reads with no interleaved writes, on ScrollTrigger's own
       * throttled update rather than on raw scroll events: one layout
       * flush per frame at worst.
       */
      const sections = STOPS.map((stop) => document.getElementById(stop.id));

      const pick = () => {
        const middle = window.innerHeight / 2;
        // The furthest stop whose top has crossed the middle of the
        // viewport: the section you are in, or — when you are somewhere
        // the rail does not list — the last stop you passed.
        //
        // Deliberately NOT "the stop whose box contains the middle".
        // That version is correct everywhere except the two places it
        // matters: the unlisted section between Process and FAQ, and the
        // bottom of the page, where the footer owns the middle and no
        // stop contains it. Both left the rail pointing at a section the
        // visitor had left two screens ago — the second one parking it
        // on "Process" while they read the contact form.
        let passed = 0;
        for (let i = 0; i < sections.length; i++) {
          const el = sections[i];
          if (el && el.getBoundingClientRect().top <= middle) passed = i;
        }
        setActive(passed);
      };

      /*
       * The fill. Measured against the document rather than counted off
       * the stops, so it stays honest through pinned sections — those
       * spend scroll without moving any section boundary, and a
       * stop-counted bar would sit frozen through the whole hero.
       */
      if (fill) gsap.set(fill, { transformOrigin: "50% 0%", scaleY: 0 });

      /*
       * Both readouts come from live measurements on a rAF-coalesced
       * scroll listener, NOT from a ScrollTrigger over the document.
       *
       * The trigger version is the obvious build and it is quietly broken
       * at the bottom of the page. A ScrollTrigger on documentElement
       * measures its end once; pinned sections and late-decoding images
       * leave that end short of the real maximum scroll; and past its own
       * end a trigger stops calling onUpdate. Measured: the fill saturated
       * at 90% of the document and the rail froze on "Process" while the
       * visitor read the contact form — the last section of the page, and
       * the one the whole thing is pointed at.
       *
       * scrollHeight is re-read every frame instead of cached, so the
       * numbers cannot go stale the way a measured trigger does. Reads
       * only, coalesced to one per frame: a scroll listener that never
       * writes cannot thrash layout.
       */
      let frame = 0;

      const read = () => {
        frame = 0;
        const doc = document.documentElement;
        const span = doc.scrollHeight - window.innerHeight;

        if (fill) {
          // Linear on purpose. Everything else on this page is paced; a
          // progress indicator that is paced is one that lies about where
          // you are.
          const progress = span > 0 ? window.scrollY / span : 0;
          gsap.set(fill, { scaleY: gsap.utils.clamp(0, 1, progress) });
        }
        pick();
      };

      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(read);
      };

      const listeners = new AbortController();
      window.addEventListener("scroll", onScroll, {
        passive: true,
        signal: listeners.signal,
      });
      window.addEventListener("resize", onScroll, {
        passive: true,
        signal: listeners.signal,
      });
      // A reload restores the previous scroll position, so the rail has
      // to be right before the first scroll event ever arrives.
      read();

      /*
       * The rail only appears once the hero has been walked. There is
       * nothing to orient against while the first section still owns the
       * whole screen, and showing it over the opening shot would be the
       * site admitting its own length before it has earned the scroll.
       */
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const hero = document.getElementById("hero");
        if (!hero) return;
        const reveal = gsap.fromTo(
          root,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: DUR.base,
            ease: EASE.soft,
            scrollTrigger: {
              trigger: hero,
              start: "bottom 90%",
              toggleActions: "play none none reverse",
            },
          },
        );
        return () => {
          reveal.scrollTrigger?.kill();
          reveal.kill();
        };
      });

      /*
       * Reduced motion: no reveal, and nothing to revert to. The rail is
       * simply present from the first frame — the fade is the only motion
       * in this component and its absence costs the visitor nothing.
       */
      mm.add("(prefers-reduced-motion: reduce)", () => {});

      return () => {
        listeners.abort();
        if (frame) cancelAnimationFrame(frame);
        mm.revert();
      };
    },
    { scope: rootRef },
  );

  return (
    <nav
      ref={rootRef}
      data-journey-rail
      aria-label={t("nav.journeyLabel")}
      className="pointer-events-none fixed top-1/2 right-0 z-40 hidden -translate-y-1/2 pr-5 mix-blend-difference lg:block"
    >
      {/* The spent-scroll hairline, running through the ticks' ends. */}
      <span
        aria-hidden="true"
        className="absolute top-0 right-5 block h-full w-px overflow-hidden bg-white/20"
      >
        <span data-rail-fill className="block h-full w-full bg-white/70" />
      </span>

      <ul className="relative flex flex-col items-end gap-4">
        {STOPS.map((stop) => (
          <li key={stop.id} className="flex">
            <a
              data-rail-tick
              href={`#${stop.id}`}
              aria-current="false"
              className="group pointer-events-auto flex items-center gap-3 py-1"
            >
              <span className={LABEL_CLASS}>{t(stop.label)}</span>
              <span aria-hidden="true" className={TICK_CLASS} />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
