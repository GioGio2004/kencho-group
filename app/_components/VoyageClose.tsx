"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import RevealText from "@/app/_components/RevealText";
import { track } from "@/lib/analytics";
import { IMAGES, src } from "@/lib/images";
import { DUR, EASE, REVEAL_START } from "@/lib/motion";
import { SITE, whatsappUrl } from "@/lib/site";

/*
 * VOYAGE CLOSE — the landing. The reference follows its map with one
 * full-bleed plate and a single invitation; this is that moment, and it
 * is also where the home page's contact conversation now lives: the
 * WhatsApp door up front, the phone number under it, and the callback
 * form waiting in the footer below.
 *
 * Carries id="contact" — the header's CTA anchor — which used to sit on
 * the charcoal contact band this construction replaced.
 */

/** Fraction of the cursor offset the button travels on desktop. */
const MAGNET_PULL = 0.25;
/** Explicit release ease for the magnetic button — never a GSAP default. */
const MAGNET_EASE = "elastic.out(1, 0.4)";

export default function VoyageClose() {
  const t = useTranslations("contact");
  const tCommon = useTranslations("common");

  const rootRef = useRef<HTMLElement>(null);
  const whatsappRef = useRef<HTMLAnchorElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(root.querySelectorAll("[data-vgc-cta]"), {
          y: 22,
          autoAlpha: 0,
          duration: DUR.base,
          ease: EASE.soft,
          delay: 0.15,
          scrollTrigger: { trigger: root, start: REVEAL_START, once: true },
        });
      });

      /* Magnetic pull on the one brass moment — desktop pointers only. */
      mm.add(
        "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const button = whatsappRef.current;
          if (!button) return;

          const xTo = gsap.quickTo(button, "x", {
            duration: 0.9,
            ease: MAGNET_EASE,
          });
          const yTo = gsap.quickTo(button, "y", {
            duration: 0.9,
            ease: MAGNET_EASE,
          });

          const onMove = (event: PointerEvent) => {
            const rect = button.getBoundingClientRect();
            xTo((event.clientX - rect.left - rect.width / 2) * MAGNET_PULL);
            yTo((event.clientY - rect.top - rect.height / 2) * MAGNET_PULL);
          };

          const onLeave = () => {
            xTo(0);
            yTo(0);
          };

          button.addEventListener("pointermove", onMove);
          button.addEventListener("pointerleave", onLeave);

          return () => {
            button.removeEventListener("pointermove", onMove);
            button.removeEventListener("pointerleave", onLeave);
            gsap.killTweensOf(button, "x,y");
            gsap.set(button, { clearProps: "transform" });
          };
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="contact"
      data-thread-anchor=""
      aria-labelledby="voyage-close-title"
      className="relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        data-fx="parallax"
        data-fx-speed="0.5"
        className="vg-drift-backdrop"
      >
        <div data-fx-inner className="absolute inset-0">
          <Image
            src={src(IMAGES.voyageClose, 2000)}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>
      <div aria-hidden="true" className="vgc-scrim" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-36 text-center text-bone sm:py-48 lg:py-56">
        {/*
          The one hinge on the page. RevealText reserves `stack` for a
          single headline per page; the home page spends it here — the
          closing invitation folds up out of the plate, and nothing else
          on the route uses perspective, so the moment stays singular.
        */}
        <RevealText
          as="h2"
          id="voyage-close-title"
          variant="stack"
          className="u-display text-[clamp(2.2rem,7vw,5rem)]"
        >
          {t("title")}
        </RevealText>

        <RevealText
          as="p"
          className="mt-7 max-w-md text-base leading-[1.7] text-bone/75 sm:text-lg"
        >
          {t("sub")}
        </RevealText>

        <div data-vgc-cta className="mt-12 flex flex-col items-center gap-7">
          {/* The magnet lives on the anchor; the reveal on the wrapper,
              so the two transforms never fight. */}
          <a
            ref={whatsappRef}
            href={whatsappUrl(tCommon("whatsappPrefill"))}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("Contact", { method: "whatsapp" })}
            className="u-press inline-flex items-center justify-center rounded-full bg-clay px-10 py-5 text-sm tracking-[0.16em] text-charcoal uppercase hover:bg-clay-deep sm:px-12"
          >
            {tCommon("whatsappCta")}
          </a>
          <a
            className="u-link text-base text-bone/85 sm:text-lg"
            href={`tel:${SITE.phoneHref}`}
            onClick={() => track("Contact", { method: "phone" })}
          >
            {SITE.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
