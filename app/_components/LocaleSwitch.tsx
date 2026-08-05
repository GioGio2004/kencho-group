"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/*
 * THE LANGUAGE SWITCH.
 *
 * Lifted out of SiteHeader when the header became an island carrying
 * nothing but the wordmark and one button. The control still has to
 * exist — this site is Georgian first, Russian second and English third,
 * and a visitor who lands on the wrong one needs a way out — so it moved
 * to the footer rather than being deleted.
 *
 * Endonyms: a language switcher names each language in itself, so these
 * labels are intentionally identical across locales and are NOT message
 * copy. A Russian speaker looking for their language is looking for
 * "RU", not for whatever Georgian calls Russian.
 */
const LOCALE_OPTIONS: ReadonlyArray<{
  code: Locale;
  short: string;
  name: string;
}> = [
  { code: "ka", short: "ქარ", name: "ქართული" },
  { code: "ru", short: "RU", name: "Русский" },
  { code: "en", short: "EN", name: "English" },
];

export default function LocaleSwitch({
  className = "",
}: {
  className?: string;
}) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      role="group"
      aria-label={t("langLabel")}
      className={`flex items-center ${className}`}
    >
      {LOCALE_OPTIONS.map((option) => {
        const active = option.code === locale;
        return (
          <button
            key={option.code}
            type="button"
            aria-label={option.name}
            aria-current={active ? "true" : undefined}
            onClick={() => {
              if (!active) {
                router.replace(pathname, {
                  locale: option.code,
                  scroll: false,
                });
              }
            }}
            className={`u-press rounded-full px-2.5 py-1.5 text-[0.6875rem] leading-none tracking-[0.08em] ${
              active ? "text-bone" : "text-bone/50 hover:text-bone/80"
            }`}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}
