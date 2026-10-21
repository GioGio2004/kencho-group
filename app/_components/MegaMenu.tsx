"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Link } from "@/i18n/navigation";
import { useMenu } from "@/app/_components/MenuProvider";
import { lockPage } from "@/lib/modal-lock";
import { HUD_TONE_TEXT, useHudTones, type HudPoints } from "@/lib/hud-tone";

/*
 * THE MEGA MENU — three pages and nothing else. A round trigger sits in
 * the bottom-right corner on every page; a full-screen sheet rises from
 * the bottom on a white-to-linen gradient, a gold hairline draws across
 * its leading edge, and the three words follow. Every move is a long inOut ease: it
 * should glide, never snap.
 */
const LINKS = [
  { href: "/gallery", key: "gallery" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contacts" },
] as const;

const TRIGGER_POINT: HudPoints<"trigger"> = {
  trigger: (w, h) => [w - 64, h - 64],
};

export default function MegaMenu() {
  const t = useTranslations("menu");
  const georgian = useLocale() === "ka";
  const { open, setOpen } = useMenu();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const tones = useHudTones(TRIGGER_POINT);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const veil = root.querySelector("[data-veil]");
      const sheet = root.querySelector("[data-sheet]");
      const rule = root.querySelector("[data-rule]");
      const items = root.querySelectorAll("[data-item]");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.inOut" },
      });
      tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0);

      if (reduced) {
        tl.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0)
          .fromTo(sheet, { y: 0, yPercent: 0, opacity: 0 }, { opacity: 1, duration: 0.3 }, 0)
          .fromTo(rule, { scaleX: 1 }, { scaleX: 1, duration: 0.01 }, 0)
          .fromTo(items, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.1);
      } else {
        tl.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 1, ease: "power2.out" }, 0)
          .fromTo(sheet, { y: 0, yPercent: 100 }, { yPercent: 0, duration: 1.25 }, 0)
          .fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1.5 }, 0.35)
          .fromTo(
            items,
            { y: 64, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.1, ease: "power3.out", stagger: 0.12 },
            0.55
          );
      }

      timelineRef.current = tl;
    },
    { scope: rootRef }
  );

  // Open glides forward; close plays the same moves back, a touch quicker.
  useEffect(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    if (!open) {
      tl.timeScale(1.2).reverse();
      return;
    }

    const release = lockPage();
    tl.timeScale(1).play();
    const focusFirst = gsap.delayedCall(0.1, () =>
      rootRef.current?.querySelector("a")?.focus({ preventScroll: true })
    );

    // Escape closes; Tab cycles through the three links and the trigger.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const controls = [
        ...(rootRef.current?.querySelectorAll<HTMLElement>("a") ?? []),
        triggerRef.current,
      ].filter(Boolean) as HTMLElement[];
      const index = controls.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      const step = e.shiftKey ? -1 : 1;
      controls[(index + step + controls.length) % controls.length]?.focus();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      focusFirst.kill();
      window.removeEventListener("keydown", onKey);
      release();
    };
  }, [open, setOpen]);

  const close = () => setOpen(false);

  return (
    <>
      <div
        ref={rootRef}
        id="mega-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
        inert={!open}
        className="invisible fixed inset-0 z-[90]"
        data-lenis-prevent
      >
        <div
          data-veil
          onClick={close}
          className="absolute inset-0 bg-[#FFFFFF]/55 opacity-0"
          aria-hidden="true"
        />

        <div
          data-sheet
          className="absolute inset-x-0 bottom-0 h-[100svh] overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, #FFFFFF 0%, #F2ECE3 100%)",
            transform: "translateY(100%)",
          }}
        >
          <span
            data-rule
            aria-hidden="true"
            className="absolute top-0 inset-x-0 h-px bg-[#B39359] origin-left"
            style={{ transform: "scaleX(0)" }}
          />

          <nav
            aria-label={t("menu")}
            className="h-full flex items-end px-6 md:px-16 pb-32 md:pb-[20vh]"
          >
            <ul className="group/list w-full flex flex-col gap-9 md:grid md:grid-cols-3 md:gap-10">
              {LINKS.map((link, i) => (
                <li key={link.href} data-item>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="group/link inline-block transition-opacity duration-500 ease-out group-hover/list:opacity-40 group-hover/list:hover:opacity-100 focus-visible:outline-none"
                  >
                    <span
                      className="block mb-4 text-[10px] font-semibold tracking-[0.3em] text-[#B39359] tabular-nums"
                      style={{ fontFamily: "var(--font-sans)" }}
                      aria-hidden="true"
                    >
                      0{i + 1}
                    </span>
                    <span className="relative inline-block">
                      <span
                        className="font-era-display text-[13vw] md:text-[5vw] text-[#2A2723]"
                        style={{
                          lineHeight: 1,
                          textTransform: georgian ? "none" : undefined,
                        }}
                      >
                        {t(link.key)}
                      </span>
                      {/* Gold underline draws in from the left on hover / focus */}
                      <span
                        aria-hidden="true"
                        className="absolute left-0 right-0 -bottom-4 h-px bg-[#B39359] origin-left scale-x-0 transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/link:scale-x-100 group-focus-visible/link:scale-x-100"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* The trigger: bottom-right on every page, above the open sheet */}
      <button
        ref={triggerRef}
        type="button"
        data-hud
        aria-expanded={open}
        aria-controls="mega-menu"
        aria-label={open ? t("close") : t("menu")}
        onClick={() => setOpen(!open)}
        className={`fixed z-[95] bottom-6 right-6 md:bottom-10 md:right-10 w-[4.5rem] h-[4.5rem] md:w-20 md:h-20 rounded-full border border-current/30 hover:border-[#B39359] flex flex-col items-center justify-center gap-2 cursor-pointer transition-[color,border-color] duration-500 ${
          HUD_TONE_TEXT[open ? "ink" : tones.trigger ?? "ink"]
        }`}
      >
        {/* MENU rolls up into CLOSE */}
        <span
          className={`relative h-3 overflow-hidden text-[9px] font-semibold tracking-[0.28em] ${
            georgian ? "" : "uppercase"
          }`}
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <span
            className={`block transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] ${
              open ? "-translate-y-1/2" : ""
            }`}
          >
            <span className="block h-3 leading-3">{t("menu")}</span>
            <span className="block h-3 leading-3" aria-hidden="true">
              {t("close")}
            </span>
          </span>
        </span>
        <span className="w-1 h-1 rounded-full bg-[#B39359]" aria-hidden="true" />
      </button>
    </>
  );
}
