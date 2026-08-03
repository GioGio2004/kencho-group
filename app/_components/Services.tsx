"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { IMAGES, src, type ImageAsset } from "@/lib/images";
import { whatsappUrl } from "@/lib/site";
import { track } from "@/lib/analytics";
import { DUR, EASE, REVEAL_START, STAGGER } from "@/lib/motion";

/* =====================================================================
 * SERVICES CHOREOGRAPHY CONFIG — `at` offsets and durations are in
 * scrub-units (one unit = the scroll distance between two services).
 * The glass material itself is tuned in globals.css (--glass-*).
 * ================================================================== */
const STACK = {
  /** Scroll distance per transition, as a fraction of viewport height. */
  step: 1.05,
  wipe: { duration: 1, ease: "expo.inOut" },
  cardIn: { y: 60, duration: 0.55, ease: "power3.out", at: 0.4 },
  cardOut: { scale: 0.94, y: -26, duration: 0.45, ease: "power2.in", at: 0.05 },
  /** Background drift inside its frame — ~10% slower than the scroll. */
  parallax: { fromY: -5.5, toY: 5.5 },
  snapDuration: { min: 0.2, max: 0.5 },
} as const;

type ServiceKey = "kitchens" | "wardrobes" | "paneling" | "commercial";

type Service = {
  key: ServiceKey;
  image: ImageAsset;
};

const SERVICES: readonly Service[] = [
  { key: "kitchens", image: IMAGES.serviceKitchens },
  { key: "wardrobes", image: IMAGES.serviceWardrobes },
  { key: "paneling", image: IMAGES.servicePaneling },
  { key: "commercial", image: IMAGES.serviceCommercial },
];

/*
 * The server-rendered DOM is a plain stacked flow: one full-height block
 * per service with its glass card bottom-anchored inside it. That is
 * exactly what no-JS visitors, crawlers, reduced-motion visitors, and
 * (per the no-pin-below-1024px rule) phones get. Desktop motion mode
 * converts the stack into a single pinned stage and scrubs wipes/card
 * handoffs between services — matchMedia reverts the conversion
 * automatically if conditions change.
 */
export default function Services() {
  const t = useTranslations("services");
  const tCommon = useTranslations("common");
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      if (!root) return;

      const stage = root.querySelector<HTMLElement>("[data-stage]");
      const heads = gsap.utils.toArray<HTMLElement>("[data-head]", root);
      const blocks = gsap.utils.toArray<HTMLElement>("[data-block]", root);
      const bgs = gsap.utils.toArray<HTMLElement>("[data-block-bg]", root);
      const pars = gsap.utils.toArray<HTMLElement>("[data-block-par]", root);
      const cards = gsap.utils.toArray<HTMLElement>("[data-block-card]", root);
      const glasses = gsap.utils.toArray<HTMLElement>("[data-glass]", root);
      const pill = root.querySelector<HTMLElement>("[data-progress]");
      const counter = root.querySelector<HTMLElement>("[data-progress-count]");
      const ticks = gsap.utils.toArray<HTMLElement>(
        "[data-progress-tick]",
        root,
      );
      if (!stage || blocks.length < 2) return;

      const setActive = (index: number) => {
        if (counter) counter.textContent = String(index + 1).padStart(2, "0");
        ticks.forEach((tick, i) => {
          tick.classList.toggle("bg-ink", i === index);
          tick.classList.toggle("bg-ink-40", i !== index);
        });
        // Perf rule: only the active card composites real glass — the
        // pill is the second and last live backdrop-filter per frame.
        glasses.forEach((g, i) =>
          g.classList.toggle("glass--off", i !== index),
        );
      };

      const mm = gsap.matchMedia();

      // Header drifts in wherever motion is allowed, pinned or not.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (heads.length === 0) return;
        gsap.from(heads, {
          y: 18,
          opacity: 0,
          duration: DUR.base,
          ease: EASE.soft,
          stagger: STAGGER.items,
          scrollTrigger: { trigger: heads[0], start: REVEAL_START },
        });
      });

      /*
       * Pinned scrub stage — every screen size, phones included. Pinning
       * used to be desktop-only out of caution about janky native mobile
       * scroll, but Lenis drives the scroll here, so the pin behaves the
       * same on touch as it does with a wheel. The card layout is capped
       * to the viewport below, so a pinned block always fits a phone.
       */
      mm.add(
        "(prefers-reduced-motion: no-preference)",
        () => {
          const n = blocks.length;

          gsap.set(stage, { height: "100svh", overflow: "hidden" });
          gsap.set(blocks, { position: "absolute", inset: 0, height: "100%" });
          blocks.slice(1).forEach((_, i) => {
            gsap.set(bgs[i + 1], { clipPath: "inset(100% 0% 0% 0%)" });
            gsap.set(cards[i + 1], { autoAlpha: 0, y: STACK.cardIn.y });
          });
          if (pill) gsap.set(pill, { autoAlpha: 1 });
          setActive(0);

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: stage,
              start: "top top",
              end: () => `+=${(n - 1) * window.innerHeight * STACK.step}`,
              pin: true,
              scrub: 1,
              snap: {
                snapTo: 1 / (n - 1),
                duration: STACK.snapDuration,
                ease: "power2.inOut",
              },
              onUpdate: (self) =>
                setActive(Math.round(self.progress * (n - 1))),
            },
          });

          for (let i = 1; i < n; i++) {
            const at = i - 1;
            tl.to(
              bgs[i],
              {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: STACK.wipe.duration,
                ease: STACK.wipe.ease,
              },
              at,
            )
              .to(
                cards[i - 1],
                {
                  scale: STACK.cardOut.scale,
                  y: STACK.cardOut.y,
                  autoAlpha: 0,
                  duration: STACK.cardOut.duration,
                  ease: STACK.cardOut.ease,
                },
                at + STACK.cardOut.at,
              )
              .to(
                cards[i],
                {
                  y: 0,
                  autoAlpha: 1,
                  duration: STACK.cardIn.duration,
                  ease: STACK.cardIn.ease,
                },
                at + STACK.cardIn.at,
              );
          }

          // Slow drift inside each frame, ~10% slower than the scroll.
          pars.forEach((par) => {
            tl.fromTo(
              par,
              { yPercent: STACK.parallax.fromY },
              { yPercent: STACK.parallax.toY, duration: n - 1, ease: "none" },
              0,
            );
          });

          if (process.env.NODE_ENV === "development") {
            (window as unknown as Record<string, unknown>).__servicesStack = tl;
          }

          return () => setActive(0);
        },
      );


      mm.add("(prefers-reduced-motion: reduce)", () => {
        // Static stack: every card keeps its glass (one per viewport),
        // no pill, no pinning.
        glasses.forEach((g) => g.classList.remove("glass--off"));
        if (pill) gsap.set(pill, { autoAlpha: 0 });
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="services"
      aria-labelledby="services-title"
      className="relative bg-sand"
    >
      <div className="px-5 pt-24 pb-12 sm:px-8 sm:pt-32 lg:px-12">
        <p data-head className="u-eyebrow flex items-center gap-4">
          {/* The section's single brass moment. */}
          <span
            aria-hidden="true"
            className="block h-px w-8 shrink-0 bg-clay"
          />
          {t("eyebrow")}
        </p>
        <h2
          id="services-title"
          data-head
          className="u-display mt-4 max-w-3xl text-[clamp(1.9rem,6vw,4rem)] text-ink"
        >
          {t("title")}
        </h2>
      </div>

      <div data-stage className="relative">
        {SERVICES.map((s) => (
          <article
            key={s.key}
            data-block
            aria-label={t(`items.${s.key}.name`)}
            className="relative h-svh overflow-hidden"
          >
            <div data-block-bg className="absolute inset-0 overflow-hidden">
              <div data-block-par className="absolute inset-0 scale-[1.12]">
                <Image
                  src={src(s.image, 1800)}
                  alt={t(`items.${s.key}.imageAlt`)}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
              {/* Soft warm grade so glass and text always read. */}
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, color-mix(in srgb, var(--ink) 38%, transparent) 0%, transparent 46%)",
                }}
              />
            </div>

            <div
              data-block-card
              className="absolute inset-x-0 bottom-6 z-10 flex justify-center px-5 will-change-transform sm:bottom-10 lg:inset-x-auto lg:left-12 lg:bottom-16 lg:px-0"
            >
              <div
                data-glass
                className="glass glass-interactive w-full max-w-[24rem] p-6 sm:p-8 lg:w-[26rem] lg:max-w-none"
              >
                <h3 className="u-display text-[1.5rem] text-ink sm:text-[2rem]">
                  {t(`items.${s.key}.name`)}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-ink/70">
                  {t(`items.${s.key}.line`)}
                </p>

                <div
                  className="mt-6 border-t pt-5"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  <a
                    href={whatsappUrl(tCommon("whatsappPrefill"))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("Contact", { method: "whatsapp" })}
                    className="u-link text-sm text-ink"
                  >
                    {t("cta")} <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </div>
          </article>
        ))}

        {/* Progress pill — revealed only in pinned motion mode. */}
        <div
          data-progress
          aria-hidden="true"
          className="glass pointer-events-none absolute top-24 right-5 z-20 flex items-center gap-3 px-4 py-2.5 opacity-0 sm:right-8"
          style={{ borderRadius: "9999px" }}
        >
          <span
            data-progress-count
            className="text-xs tracking-[0.18em] text-ink tabular-nums"
          >
            01
          </span>
          <span className="flex items-center gap-1.5">
            {SERVICES.map((s, i) => (
              <span
                key={s.key}
                data-progress-tick
                className={`block h-3 w-px ${i === 0 ? "bg-ink" : "bg-ink-40"}`}
              />
            ))}
          </span>
          <span className="text-xs tracking-[0.18em] text-ink/60 tabular-nums">
            {String(SERVICES.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </section>
  );
}
