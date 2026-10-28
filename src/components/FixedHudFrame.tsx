"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { HUD_TONE_TEXT, useHudTones, type HudPoints } from "@/lib/hud-tone";

const HUD_POINTS: HudPoints<"emblem" | "rail" | "lang"> = {
  emblem: () => [56, 56],
  rail: (_w, h) => [64, h * 0.62],
  lang: (w) => [w - 72, 40],
};

/* Navigation lives in the bottom mega menu (app/_components/MegaMenu);
 * the HUD keeps only the emblem, the scroll rail and the languages. */
export default function FixedHudFrame() {
  const t = useTranslations("home.era.hud");

  const locale = (useLocale() as Locale) || "en";
  const pathname = usePathname();

  const [progress, setProgress] = useState(0);
  const tones = useHudTones(HUD_POINTS);

  useEffect(() => {
    const updateScroll = () => {
      if (matchMedia("(max-width: 767px)").matches) return;
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.min(
        100,
        Math.max(0, Math.round((window.scrollY / maxScroll) * 100))
      );
      setProgress(pct);
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, []);

  const formattedProgress =
    progress === 100 ? "100" : String(progress).padStart(2, "0");

  return (
    <>
      {/* 1. Top-Left Rotating Emblem (top-8 left-8, w-24 h-24) */}
      <div
        data-hud
        className={`fixed top-8 left-8 z-50 pointer-events-auto select-none transition-colors duration-500 ${HUD_TONE_TEXT[tones.emblem ?? "ink"]}`}
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={t("backToTop")}
          className="group relative flex items-center justify-center w-24 h-24 transition-transform duration-500 hover:scale-105 cursor-pointer"
        >
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full animate-spin-slow"
            aria-hidden="true"
          >
            <defs>
              <path
                id="kencho-hud-emblem-ring"
                d="M 60, 60 m -44, 0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
              />
            </defs>
            <text
              fill="currentColor"
              className="text-[8.5px] font-semibold tracking-[0.28em] uppercase"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <textPath href="#kencho-hud-emblem-ring" startOffset="0%">
                {t("ring")}
              </textPath>
            </text>
          </svg>

          {/* Minimal 8-Point Joinery Compass Star in the Center */}
          <div className="absolute inset-0 flex items-center justify-center transition-transform duration-700 group-hover:rotate-45">
            <svg
              width="30"
              height="30"
              viewBox="0 0 40 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              aria-hidden="true"
            >
              <path d="M20 4 L23 17 L36 20 L23 23 L20 36 L17 23 L4 20 L17 17 Z" />
              <path d="M9 9 L17.5 17.5 M31 9 L22.5 17.5 M31 31 L22.5 22.5 M9 31 L17.5 22.5" />
              <circle cx="20" cy="20" r="2" fill="currentColor" />
            </svg>
          </div>
        </button>
      </div>

      {/* 2. Left-Edge Vertical Progress Meter (00 – 100) */}
      <div
        data-hud
        className={`hidden md:flex flex-col items-center justify-between fixed left-16 top-[34vh] bottom-10 z-50 pointer-events-none select-none transition-colors duration-500 ${HUD_TONE_TEXT[tones.rail ?? "ink"]}`}
      >
        <div className="flex flex-col items-center gap-3">
          <span className="w-px h-7 bg-current/70" />
          <span
            className="text-[10px] font-semibold tracking-[0.2em] tabular-nums"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {formattedProgress}
          </span>
        </div>

        <div className="relative flex-1 w-px bg-current/25 my-4 overflow-hidden">
          <div
            className="w-full bg-current transition-all duration-150 ease-out"
            style={{ height: `${progress}%` }}
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <span
            className="text-[8.5px] font-semibold tracking-[0.34em] uppercase [writing-mode:vertical-rl] rotate-180"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {t("scroll")}
          </span>
          <svg
            width="8"
            height="34"
            viewBox="0 0 8 34"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            aria-hidden="true"
          >
            <line x1="4" y1="0" x2="4" y2="32" />
            <path d="M1 29 L4 32.5 L7 29" />
          </svg>
        </div>
      </div>

      {/* 3. Top-Right: the language switch, nothing else */}
      <div
        data-hud
        className={`fixed top-8 right-8 md:right-10 z-50 pointer-events-auto select-none transition-colors duration-500 ${HUD_TONE_TEXT[tones.lang ?? "ink"]}`}
      >
        <div
          className="flex items-center gap-2 pt-1 text-[9px] tracking-[0.25em] uppercase"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <Link
            href={pathname || "/"}
            locale="ka"
            className={`hover:opacity-100 transition-opacity ${
              locale === "ka"
                ? "font-semibold underline underline-offset-4"
                : "opacity-70"
            }`}
          >
            {t("georgian")}
          </Link>
          <span className="opacity-40">/</span>
          <Link
            href={pathname || "/"}
            locale="ru"
            className={`hover:opacity-100 transition-opacity ${
              locale === "ru"
                ? "font-semibold underline underline-offset-4"
                : "opacity-70"
            }`}
          >
            {t("russian")}
          </Link>
          <span className="opacity-40">/</span>
          <Link
            href={pathname || "/"}
            locale="en"
            className={`hover:opacity-100 transition-opacity ${
              locale === "en"
                ? "font-semibold underline underline-offset-4"
                : "opacity-70"
            }`}
          >
            {t("english")}
          </Link>
        </div>
      </div>
    </>
  );
}
