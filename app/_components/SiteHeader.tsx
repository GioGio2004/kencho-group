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
 * THE HEADER — a bar hung from the ceiling.
 *
 * Flush to the top of the screen, inset from the sides, rounded only on
 * its bottom corners: a bar that hangs rather than an island that
 * floats. It carries three things —
 *
 *   wordmark · where you are · one action
 *
 * The centre is a live label naming the section under the viewport, so
 * the header replaces the navigation it used to carry with orientation:
 * a visitor always knows where they are, and the footer knows where
 * everything else is.
 *
 * The label is read from the same message keys the sections' own
 * eyebrows use, so the bar and the page can never disagree about what a
 * section is called.
 */

/**
 * The sections the centre label tracks, in document order. `label` is a
 * fully-qualified message key — these are the sections' own eyebrow
 * strings, not a second copy of them.
 *
 * The hero is deliberately absent: at the top of the page the wordmark
 * is the orientation, and a label saying "start" under a headline that
 * already says everything would be noise.
 */
const SECTIONS = [
  { id: "manifesto", label: "manifesto.eyebrow" },
  { id: "transformation", label: "transformation.eyebrow" },
  { id: "projects", label: "projects.eyebrow" },
  { id: "rooms", label: "rooms.eyebrow" },
  { id: "services", label: "services.eyebrow" },
  { id: "process", label: "process.eyebrow" },
  { id: "faq", label: "faq.eyebrow" },
  { id: "contact", label: "contact.eyebrow" },
] as const;

/*
 * THE ROUTES, for every page that is not the home page. On home the
 * centre of the bar is the live section label; on a routed page the same
 * slot carries the site's navigation, with the current page picked out
 * in the accent — so the nav IS the orientation there. Real routes, not
 * hashes: a hash would be grabbed by SmoothScroll's handler and lead
 * nowhere on a page that does not contain the section.
 */
const NAV_LINKS = [
  { key: "projects", href: "/projects" },
  { key: "services", href: "/services" },
  { key: "process", href: "/process" },
  { key: "faq", href: "/faq" },
  { key: "gallery", href: "/gallery" },
] as const;

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
  // Root-scoped: the section label keys span eleven namespaces.
  const tAll = useTranslations();
  const pathname = usePathname();
  const onHome = pathname === "/";

  // Resolved during render so the effect never touches next-intl.
  const labels = SECTIONS.map(({ label }) => tAll(label));

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const header = rootRef.current;
      if (!header) return;

      const cleanups: (() => void)[] = [];
      const mm = gsap.matchMedia();
      cleanups.push(() => mm.revert());
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const hide = gsap
          .to(header, {
            yPercent: -110,
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

      /*
       * THE ORIENTATION LABEL.
       *
       * Outside the reduced-motion gate on purpose — it is information,
       * not motion, and a reduced-motion visitor still deserves to know
       * where they are. Read straight off the rects on a rAF-coalesced
       * scroll listener, the same discipline as the drawing's surface
       * ramp: eleven getBoundingClientRect calls per frame is nothing,
       * and it stays correct through every pinned section, which an
       * IntersectionObserver would not.
       *
       * "Current" means: the last section whose top has crossed the
       * middle of the viewport and whose bottom has not. Between
       * sections — and on the hero — nothing matches and the label
       * empties, which is honest.
       */
      const el = header.querySelector<HTMLElement>("[data-section-label]");
      if (el && onHome) {
        const targets = SECTIONS.map(({ id }) => document.getElementById(id))
          .map((node, i) => (node ? { node, i } : null))
          .filter((x): x is { node: HTMLElement; i: number } => x !== null);

        let current = -1;
        let frame = 0;

        const read = () => {
          frame = 0;
          const mid = window.innerHeight / 2;
          let next = -1;
          for (const { node, i } of targets) {
            const rect = node.getBoundingClientRect();
            if (rect.top <= mid && rect.bottom > mid) next = i;
          }
          if (next === current) return;
          current = next;
          el.textContent = next < 0 ? "" : (labels[next] ?? "");
          el.toggleAttribute("data-empty", next < 0);
        };

        const onScroll = () => {
          if (!frame) frame = requestAnimationFrame(read);
        };

        const listeners = new AbortController();
        window.addEventListener("scroll", onScroll, {
          passive: true,
          signal: listeners.signal,
        });
        window.addEventListener("resize", onScroll, {
          passive: true,
          signal: listeners.signal,
        });
        read();

        cleanups.push(() => {
          listeners.abort();
          if (frame) cancelAnimationFrame(frame);
        });
      }

      return () => cleanups.forEach((fn) => fn());
    },
    /*
     * `labels` is in the dependencies because a locale switch does not
     * remount this component — pathname stays "/" — and an effect built
     * against the old render would keep announcing Georgian sections on
     * a page now reading Russian.
     */
    { scope: rootRef, dependencies: [onHome, labels.join("|")] },
  );

  return (
    <header
      ref={rootRef}
      data-site-header
      className="fixed inset-x-0 top-0 z-50 px-3 sm:px-5"
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
          WHERE YOU ARE. On the home page a live label, empty over the
          hero, because the wordmark is the orientation there —
          aria-hidden, since it repeats the section headings a screen
          reader already announces in order. On every other route the
          same slot carries the navigation, with the current page in the
          accent colour.
        */}
        {onHome ? (
          <span
            data-section-label
            data-empty
            aria-hidden="true"
            className="header-section-label"
          />
        ) : (
          <nav aria-label={t("journeyLabel")} className="header-nav">
            {NAV_LINKS.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className="header-nav-link"
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </nav>
        )}

        {/*
          The one action. SOLID rather than outlined: on a bar with
          nothing else on it, an outline reads as a second hairline
          instead of as a button. Points at the conversation — the site
          makes no claims about what the first visit costs.
        */}
        <Anchor onHome={onHome} href="#contact" className="header-cta u-press">
          {t("contact")}
          <span aria-hidden="true" className="header-cta-arrow">
            →
          </span>
        </Anchor>
      </div>
    </header>
  );
}
