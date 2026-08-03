"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics";
import { DUR, EASE } from "@/lib/motion";
import { whatsappUrl } from "@/lib/site";

/*
 * Floating WhatsApp pill — the always-reachable conversion path.
 *
 * Visibility choreography (motion users only):
 *   hidden on load → appears once the hero has scrolled past → ducks away
 *   while the contact section is on screen (the section carries its own
 *   contact options, and the pill would crowd them).
 *
 * Under reduced motion the pill is simply always visible: it is a
 * conversion path, not decoration, so it gets no scroll gating at all.
 *
 * While the intro overlay is up (`is-loading` on <html>) the triggers are
 * not armed yet — they arm on the one-shot "alma:loaded" event, so the
 * pill can never pop in over the preloader.
 */

export default function StickyWhatsApp() {
  const pillRef = useRef<HTMLAnchorElement>(null);
  const tCommon = useTranslations("common");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const pill = pillRef.current;
      if (!pill) return;

      const mm = gsap.matchMedia();

      /* Reduced motion: always visible, no gating — conversion first. */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(pill, { autoAlpha: 1, y: 0 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const triggers: ScrollTrigger[] = [];

        const show = () => {
          gsap.to(pill, {
            autoAlpha: 1,
            y: 0,
            duration: DUR.fast,
            ease: EASE.soft,
            overwrite: "auto",
          });
        };

        const hide = () => {
          gsap.to(pill, {
            autoAlpha: 0,
            y: 16,
            duration: DUR.fast,
            ease: EASE.soft,
            overwrite: "auto",
          });
        };

        const arm = () => {
          // The SSR HTML ships the pill visible; only JS ever hides it.
          gsap.set(pill, { autoAlpha: 0, y: 16 });

          triggers.push(
            // Appears once the hero is mostly gone.
            ScrollTrigger.create({
              trigger: "#hero",
              start: "bottom 70%",
              onEnter: show,
              onLeaveBack: hide,
            }),
            // Ducks away while the contact section is on screen. Created
            // second so on a mid-page refresh both fire and this one wins.
            ScrollTrigger.create({
              trigger: "#contact",
              start: "top bottom",
              onEnter: hide,
              onLeaveBack: show,
            }),
          );
        };

        if (document.documentElement.classList.contains("is-loading")) {
          // Intro overlay is up: start hidden, arm only once it is gone.
          gsap.set(pill, { autoAlpha: 0, y: 16 });
          const onLoaded = () => arm();
          window.addEventListener("alma:loaded", onLoaded, { once: true });

          return () => {
            window.removeEventListener("alma:loaded", onLoaded);
            triggers.forEach((st) => st.kill());
          };
        }

        arm();
        return () => {
          triggers.forEach((st) => st.kill());
        };
      });

      return () => mm.revert();
    },
    { scope: pillRef },
  );

  return (
    <a
      ref={pillRef}
      href={whatsappUrl(tCommon("whatsappPrefill"))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={tCommon("whatsappSticky")}
      onClick={() => track("Contact", { method: "whatsapp" })}
      className="glass u-press fixed right-5 bottom-5 z-40 inline-flex items-center gap-3 p-4 text-sm tracking-[0.14em] text-ink uppercase sm:px-6 sm:py-4"
    >
      {/* Simple speech-bubble outline — the section's one clay moment. */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[1.15rem] w-[1.15rem] shrink-0 text-clay"
      >
        <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.92-.39-4.15-1.07L3 20l1.07-5.35A8.5 8.5 0 1 1 21 11.5Z" />
      </svg>

      {/* Icon-only on the smallest screens; label from ≥sm. */}
      <span className="hidden sm:inline">{tCommon("whatsappSticky")}</span>
    </a>
  );
}
