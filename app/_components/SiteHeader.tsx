"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { SITE } from "@/lib/site";
import { DUR, EASE } from "@/lib/motion";

/*
 * Fixed minimal header: retreats on scroll down, returns on scroll up,
 * and picks up a frosted backdrop once the page has moved. Nav links
 * collapse on smaller screens — on a single-page site anchors are more
 * chrome than they are worth there; mobile keeps the wordmark, the
 * language pill, and the booking link.
 */

const NAV_ITEMS = [
  { key: "services", href: "#services" },
  { key: "projects", href: "#projects" },
  { key: "process", href: "#process" },
  { key: "faq", href: "#faq" },
  { key: "contact", href: "#contact" },
] as const;

/* Endonyms: a language switcher names each language in itself, so these
 * labels are intentionally identical across locales (not message copy). */
const LOCALE_OPTIONS: ReadonlyArray<{
  code: Locale;
  short: string;
  name: string;
}> = [
  { code: "ka", short: "ქარ", name: "ქართული" },
  { code: "ru", short: "RU", name: "Русский" },
  { code: "en", short: "EN", name: "English" },
];

export default function SiteHeader() {
  const rootRef = useRef<HTMLElement>(null);
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const header = rootRef.current;
      if (!header) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const hide = gsap
          .to(header, {
            yPercent: -130,
            duration: DUR.fast,
            ease: EASE.inOut,
            paused: true,
          })
          .progress(0);

        const st = ScrollTrigger.create({
          start: "top top-=140",
          end: "max",
          onUpdate: (self) => {
            if (self.direction === 1) hide.play();
            else hide.reverse();
            header.toggleAttribute("data-scrolled", self.scroll() > 80);
          },
          onLeaveBack: () => {
            hide.reverse();
            header.removeAttribute("data-scrolled");
          },
        });

        return () => {
          st.kill();
          hide.kill();
          header.removeAttribute("data-scrolled");
          gsap.set(header, { clearProps: "transform" });
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <header
      ref={rootRef}
      data-site-header
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-12"
    >
      {/* Wordmark lockup — type only, links back to the top. */}
      <a
        href="#hero"
        className="header-fg flex shrink-0 flex-col"
        aria-label={`${SITE.fullName} — ${t("home")}`}
      >
        {/* Inline letter-spacing: the unlayered ka display override in
            globals.css would otherwise beat the tracking utility. */}
        <span
          className="u-display text-sm leading-none"
          style={{ letterSpacing: "0.35em" }}
        >
          {SITE.wordmark}
        </span>
        <span
          className="header-accent mt-1 text-[0.5rem] leading-none"
          style={{ letterSpacing: "0.55em" }}
        >
          {SITE.wordmarkSub}
        </span>
      </a>

      {/* Georgian nav strings run long — five anchors only fit from lg up. */}
      <nav className="hidden items-center gap-6 lg:flex xl:gap-8">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="u-link header-fg-dim text-sm hover:opacity-100"
          >
            {t(item.key)}
          </a>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Language switcher — tiny glass pill, present on mobile too.
            Inline radius: .glass is unlayered and would win over a
            rounded-full utility. */}
        <div
          role="group"
          aria-label={t("langLabel")}
          className="glass flex items-center p-0.5"
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
                className={`u-press rounded-full px-2 py-1.5 text-[0.625rem] leading-none tracking-[0.08em] ${
                  active ? "header-fg" : "header-fg-dim"
                }`}
              >
                {option.short}
              </button>
            );
          })}
        </div>

        <a
          href="#contact"
          className="header-accent u-press shrink-0 rounded-full border px-3.5 py-2 text-[0.6875rem] whitespace-nowrap hover:bg-clay hover:text-shell sm:px-5 sm:py-2.5 sm:text-xs"
        >
          {t("book")}
        </a>
      </div>
    </header>
  );
}
