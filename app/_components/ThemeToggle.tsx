"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/routing";

const STORAGE_KEY = "kg:theme";
const THEME_EVENT = "kencho:theme-change";
function applyTheme(theme: "dark" | "light") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    applyTheme(event.newValue === "light" ? "light" : "dark");
    onChange();
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
const getTheme = () => document.documentElement.dataset.theme === "light" ? "light" : "dark";
const getServerTheme = () => "dark" as const;

const LABELS: Record<Locale, { light: string; dark: string; lightShort: string; darkShort: string }> = {
  ka: {
    light: "ნათელი რეჟიმის ჩართვა",
    dark: "მუქი რეჟიმის ჩართვა",
    lightShort: "ნათელი",
    darkShort: "მუქი",
  },
  ru: {
    light: "Включить светлую тему",
    dark: "Включить тёмную тему",
    lightShort: "Светлая",
    darkShort: "Тёмная",
  },
  en: {
    light: "Switch to light mode",
    dark: "Switch to dark mode",
    lightShort: "Light",
    darkShort: "Dark",
  },
};

export default function ThemeToggle() {
  const rawLocale = useLocale();
  const locale: Locale =
    rawLocale === "ka" || rawLocale === "ru" ? rawLocale : "en";
  const copy = LABELS[locale];

  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Ignore storage restrictions */
    }
  };

  const isLight = theme === "light";

  return (
    <button
      type="button"
      data-theme-toggle
      onClick={toggle}
      aria-label={isLight ? copy.dark : copy.light}
      title={isLight ? copy.dark : copy.light}
      className="theme-toggle-btn"
    >
      {isLight ? (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2m-7.07-14.93 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2m-14.93 7.07 1.41-1.41m11.32-11.32 1.41-1.41" />
        </svg>
      )}
      <span className="theme-toggle-label">
        {isLight ? copy.darkShort : copy.lightShort}
      </span>
    </button>
  );
}

