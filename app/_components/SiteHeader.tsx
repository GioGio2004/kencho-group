"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { SITE } from "@/lib/site";
import { DUR, EASE } from "@/lib/motion";

/*
 * THE HEADER, AS AN ISLAND.
 *
 * A floating bar inset from every edge, carrying two things: the
 * wordmark and the one action. Nothing else.
 *
 * It used to carry five anchors, a planner link, a theme control and a
 * language pill — four clusters and thirteen targets before a visitor had
 * read a word. On a single-page site the anchors were duplicating a
 * scroll, and the two preference pills were answering a question nobody
 * had asked yet. Navigation lives in the footer now; so do the theme and
 * language controls, which is where a visitor goes looking for settings.
 *
 * It retreats on scroll down and returns on scroll up, and picks up a
 * denser backdrop once the page has moved — the same behaviour as before,
 * on a much smaller object.
 */

/**
 * One anchor, correct from wherever it is rendered. On the home page it
 * stays a bare hash so SmoothScroll's handler picks it up and glides; on
 * any other route it becomes a locale-aware link back home.
 *
 * Declared at module scope rather than inside the component: a component
 * created during render is a new type on every render, so React unmounts
 * and remounts the whole subtree each time.
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
  const pathname = usePathname();

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const header = rootRef.current;
      if (!header) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Further than before: the island is inset from the top, so it
        // has its own margin to clear as well as its own height.
        const hide = gsap
          .to(header, {
            yPercent: -160,
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
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
    >
      <div className="header-island">
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
            className="u-display text-base leading-none"
            style={{ letterSpacing: "0.35em" }}
          >
            {SITE.wordmark}
          </span>
          <span
            className="header-accent mt-1.5 text-[0.5rem] leading-none"
            style={{ letterSpacing: "0.55em" }}
          >
            {SITE.wordmarkSub}
          </span>
        </Anchor>

        {/*
          The one action. SOLID rather than outlined: on an island with
          nothing else on it, an outline reads as a second hairline
          instead of as a button.
        */}
        <Anchor onHome={onHome} href="#contact" className="header-cta u-press">
          {t("book")}
          <span aria-hidden="true" className="header-cta-arrow">
            →
          </span>
        </Anchor>
      </div>
    </header>
  );
}
