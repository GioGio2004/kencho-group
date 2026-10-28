"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Link } from "@/i18n/navigation";
import { useMenu } from "@/app/_components/MenuProvider";
import { lockPage } from "@/lib/modal-lock";

/*
 * Full-screen navigation, opened from the shared header.
 */
const LINKS = [
  { href: "/gallery", key: "gallery" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contacts" },
] as const;

export default function MegaMenu() {
  const t = useTranslations("menu");
  const georgian = useLocale() === "ka";
  const { open, setOpen } = useMenu();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const veil = root.querySelector("[data-veil]");
      const sheet = root.querySelector("[data-sheet]");
      const rule = root.querySelector("[data-rule]");
      const items = root.querySelectorAll("[data-item]");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)").matches;

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

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        document.getElementById("site-menu-trigger")?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const controls = [
        ...(rootRef.current?.querySelectorAll<HTMLElement>("a") ?? []),
        closeRef.current,
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

  const close = () => {
    setOpen(false);
    document.getElementById("site-menu-trigger")?.focus();
  };

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
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          className="absolute right-6 md:right-12 top-6 z-10 rounded-full border border-white/15 bg-white/[0.05] px-5 py-2 text-xs tracking-wide text-white cursor-pointer"
        >
          {t("close")} <span aria-hidden="true">×</span>
        </button>
        <div
          data-veil
          onClick={close}
          className="absolute inset-0 bg-zinc-950/70 opacity-0"
          aria-hidden="true"
        />

        <div
          data-sheet
          className="absolute inset-x-0 bottom-0 h-[100svh] overflow-hidden bg-zinc-950 text-zinc-50"
          style={{
            transform: "translateY(100%)",
          }}
        >
          <span
            data-rule
            aria-hidden="true"
            className="absolute top-0 inset-x-0 h-px bg-white/20 origin-left"
            style={{ transform: "scaleX(0)" }}
          />

          <nav
            aria-label={t("menu")}
            className="h-full flex items-end px-6 md:px-16 pb-36 md:pb-[20vh]"
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
                      className="block mb-3 text-xs font-semibold tracking-[0.25em] text-zinc-400 tabular-nums"
                      aria-hidden="true"
                    >
                      0{i + 1}
                    </span>
                    <span className="relative inline-block">
                      <span
                        className="font-semibold tracking-tight text-3xl sm:text-5xl md:text-6xl text-zinc-50"
                        style={{
                          lineHeight: 1.1,
                          textTransform: georgian ? "none" : undefined,
                        }}
                      >
                        {t(link.key)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="absolute left-0 right-0 -bottom-3 h-px bg-white/40 origin-left scale-x-0 transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/link:scale-x-100 group-focus-visible/link:scale-x-100"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

    </>
  );
}
