"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  HERO_DEFAULT,
  HERO_VARIANTS,
  readVariant,
  setVariant,
  subscribeVariant,
} from "@/lib/hero";

/*
 * THE OPENING SWITCH — in the footer, where a preference belongs.
 *
 * Not in the header. The header already carries a wordmark, a nav, a
 * theme control, a language pill and the booking CTA, and "which opening
 * scene" is not a decision anyone makes before they have seen one. By
 * the time a visitor is at the bottom of the page they have watched an
 * opening and know whether they wanted the other.
 *
 * localStorage is the state and this subscribes to it, so the control is
 * correct in every open tab rather than only in the one that changed —
 * same store shape as the theme switch next to it.
 */
export default function HeroSwitch() {
  const t = useTranslations("hero.switch");

  const variant = useSyncExternalStore(
    subscribeVariant,
    readVariant,
    () => HERO_DEFAULT,
  );

  return (
    <div className="hero-switch">
      <p id="hero-switch-label" className="hero-switch-label">
        {t("label")}
      </p>
      <div
        role="group"
        aria-labelledby="hero-switch-label"
        className="hero-switch-group"
      >
        {HERO_VARIANTS.map((option) => {
          const active = option === variant;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => setVariant(option)}
              className="hero-switch-option u-press"
            >
              {t(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
