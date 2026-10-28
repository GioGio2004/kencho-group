"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/*
 * THE LANGUAGE SWITCH — Georgian first, Russian second, English third.
 * `light` (navy type) is for every surface on the all-light site: the
 * header, the menu and the powder-sky footer. The default ivory variant
 * is only for laying the switch over photography.
 *
 * Endonyms: each language is named in itself, so these labels are the
 * same in every locale and are NOT message copy.
 */
const LOCALE_OPTIONS: ReadonlyArray<{
  code: Locale;
  short: string;
  name: string;
}> = [
  { code: "ka", short: "KA", name: "ქართული" },
  { code: "ru", short: "RU", name: "Русский" },
  { code: "en", short: "EN", name: "English" },
];

export default function LocaleSwitch({
  className = "",
  light = false,
}: {
  className?: string;
  light?: boolean;
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
              if (!active)
                router.replace(
                  `${pathname}${window.location.search}${window.location.hash}`,
                  { locale: option.code, scroll: false },
                );
            }}
            className={`locale-option px-2.5 py-1.5 text-[0.8125rem] leading-none transition-colors ${
              light
                ? active
                  ? "text-ink"
                  : "text-ink/70 hover:text-ink"
                : active
                  ? "text-paper"
                  : "text-paper/70 hover:text-paper"
            }`}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}
