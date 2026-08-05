"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import ThemeToggle from "@/app/_components/ThemeToggle";
import { SITE } from "@/lib/site";
import { DUR, EASE } from "@/lib/motion";

/*
 * Fixed minimal header: retreats on scroll down, returns on scroll up,
 * and picks up a frosted backdrop once the page has moved. Nav links
 * collapse on smaller screens — on a single-page site anchors are more
 * chrome than they are worth there; mobile keeps the wordmark, the
 * language pill, and the booking link.
 *
 * ANCHORS OFF THE HOME PAGE. The site was one page until the planner
 * arrived, so every link here was a bare `#services` — which, from
 * /ka/planner, points at a section that is not in the document. Away
 * from home the same anchors become routed links back to it, and only
 * there, because a bare hash is what lets Lenis glide to the section
 * instead of jumping.
 */

/*
 * FOUR, down from five plus a planner link.
 *
 * "Contact" was a nav item sitting next to a CTA pointing at the same
 * section — one destination wearing two controls. FAQ is a section a
 * visitor reaches by reading rather than by aiming, and it is in the
 * footer. What is left is the three things someone is actually looking
 * for and the one tool they might come back for.
 */
const NAV_ITEMS = [
  { key: "projects", href: "#projects" },
  { key: "services", href: "#services" },
  { key: "process", href: "#process" },
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

/**
 * One anchor, correct from wherever it is rendered. On the home page it
 * stays a bare hash so SmoothScroll's handler picks it up and glides; on
 * any other route it becomes a locale-aware link back home.
 *
 * Declared at module scope rather than inside the component: a component
 * created during render is a new type on every render, so React unmounts
 * and remounts the whole subtree each time — which for the header would
 * throw away the wordmark and every nav link on every pathname change.
 */
function Anchor({
  onHome,
  href,
  className,
  children,
  ...rest
}: {
  onHome: boolean;
  href: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return onHome ? (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ) : (
    <Link href={`/${href}`} className={className} {...rest}>
      {children}
    </Link>
  );
}

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

  const onHome = pathname === "/";

  return (
    <header
      ref={rootRef}
      data-site-header
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-12"
    >
      {/* Wordmark lockup — type only, links back to the top. */}
      <Anchor
        onHome={onHome}
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
      </Anchor>

      {/* Georgian nav strings run long — five anchors only fit from lg up. */}
      <nav className="hidden items-center gap-6 lg:flex xl:gap-8">
        {NAV_ITEMS.map((item) => (
          <Anchor
            key={item.href}
            onHome={onHome}
            href={item.href}
            className="u-link header-fg-dim text-sm hover:opacity-100"
          >
            {t(item.key)}
          </Anchor>
        ))}
        {/*
          The planner is a tool rather than a section of the page, so it
          sits at the end of the list with a mark on it instead of
          blending into five anchors.

          NO DISPLAY UTILITY ON A .u-link. That class is unlayered CSS
          and sets `display: inline-block`, so it beats Tailwind's
          layered `flex` — and `lg:hidden` with it. The first cut of this
          put a second, phone-sized planner link in the bar next door and
          it rendered at every width, on top of this one. The dot is
          inline-block with a margin instead, and below `lg` the planner
          is reached from the drawing section's CTA and the footer.
        */}
        <Link
          href="/planner"
          aria-current={pathname === "/planner" ? "page" : undefined}
          className="u-link header-accent text-sm"
        >
          {t("planner")}
        </Link>
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        {/*
          ONE PREFERENCE CLUSTER, not two pills competing beside each
          other. Theme and language are the same kind of decision — how
          the site should be, rather than where to go in it — so they
          share a container and a hairline divides them. That takes the
          header from four control groups to three, and from thirteen
          targets to eight.
        */}
        <div className="glass flex items-center gap-1 p-0.5">
          <ThemeToggle />

          <span aria-hidden="true" className="header-rule" />

          <div
            role="group"
            aria-label={t("langLabel")}
            className="flex items-center"
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
        </div>

        <Anchor
          onHome={onHome}
          href="#contact"
          className="header-accent u-press shrink-0 rounded-full border px-3.5 py-2 text-[0.6875rem] whitespace-nowrap hover:bg-clay hover:text-shell sm:px-5 sm:py-2.5 sm:text-xs"
        >
          {t("book")}
        </Anchor>
      </div>
    </header>
  );
}
