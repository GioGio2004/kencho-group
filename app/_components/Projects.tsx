"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { useTranslations } from "next-intl";
import RevealText from "@/app/_components/RevealText";
import { IMAGES, src } from "@/lib/images";
import {
  COLUMN_DRIFT,
  PORTFOLIO,
  PORTFOLIO_CATEGORIES,
  type PortfolioCategory,
  type PortfolioItem,
} from "@/lib/portfolio";
import { whatsappUrl } from "@/lib/site";
import { track } from "@/lib/analytics";
import {
  DUR,
  EASE,
  REVEAL_START,
  STAGGER,
  prefersReducedMotion,
} from "@/lib/motion";

type FilterKey = "all" | PortfolioCategory;
type FlipStateT = ReturnType<typeof Flip.getState>;
type Lightbox = {
  current: PortfolioItem["key"];
  prev: PortfolioItem["key"] | null;
};

const FILTERS: readonly FilterKey[] = ["all", ...PORTFOLIO_CATEGORIES];

/* ---------------------------------------------------------------------
 * Column-count store. Kept outside the component so the snapshot is a
 * stable reference across renders (useSyncExternalStore compares by
 * identity and would loop otherwise).
 * ------------------------------------------------------------------ */
const COL_QUERIES = [
  { q: "(min-width: 1280px)", cols: 4 },
  { q: "(min-width: 768px)", cols: 3 },
] as const;

function subscribeColumns(onChange: () => void): () => void {
  const mqls = COL_QUERIES.map(({ q }) => window.matchMedia(q));
  mqls.forEach((mql) => mql.addEventListener("change", onChange));
  return () => mqls.forEach((mql) => mql.removeEventListener("change", onChange));
}

function getColumnSnapshot(): number {
  const hit = COL_QUERIES.find(({ q }) => window.matchMedia(q).matches);
  return hit ? hit.cols : 2;
}

/** Mobile-first on the server; hydration corrects it in the same commit. */
function getServerColumnSnapshot(): number {
  return 2;
}

/** 1×1 sand-tone (#efe7dd) PNG — one warm blur placeholder for every tile. */
const WARM_BLUR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mN4//wuAAV8ArTYnTmYAAAAAElFTkSuQmCC";

/*
 * PROJECTS — filterable masonry portfolio.
 * ----------------------------------------
 * Real column divs (2 / 3 / 4, mobile-first SSR at 2) filled round-robin,
 * each column drifting at its own scrubbed rate so the wall feels alive.
 * Filter changes relayout with GSAP Flip; tapping a tile flies its frame
 * into a lightbox (Flip again) with prev/next, swipe, and a WhatsApp CTA —
 * the browsing-to-lead bridge. Without JS the full grid is simply visible.
 */
export default function Projects() {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");

  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const prevLayerRef = useRef<HTMLDivElement>(null);
  const curLayerRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  /** Flip state captured in the chip click handler, consumed on rebuild. */
  const filterFlipRef = useRef<{ state: FlipStateT; keys: Set<string> } | null>(
    null,
  );
  /** Flip state captured in the tile click handler, consumed on open. */
  const openFlipRef = useRef<{ state: FlipStateT | null } | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const closingRef = useRef(false);
  /** Guarantees the lightbox closes even if its exit tween never completes. */
  const safetyTimer = useRef<number | null>(null);
  const swipeXRef = useRef<number | null>(null);
  /** Imperative lightbox actions, rebuilt by the lightbox effect. */
  const actionsRef = useRef<{
    close: () => void;
    navigate: (dir: 1 | -1) => void;
  } | null>(null);

  const [category, setCategory] = useState<FilterKey>("all");
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);

  /*
   * Column count — 2 / 3 (≥768px) / 4 (≥1280px). useSyncExternalStore
   * reads the real viewport during hydration (server snapshot is the
   * mobile-first 2), so a desktop visitor never paints a 2-column grid
   * that reflows a frame later — and no setState ever runs in an effect.
   */
  const colCount = useSyncExternalStore(
    subscribeColumns,
    getColumnSnapshot,
    getServerColumnSnapshot,
  );

  const filtered: readonly PortfolioItem[] =
    category === "all"
      ? PORTFOLIO
      : PORTFOLIO.filter((p) => p.category === category);

  const columns: PortfolioItem[][] = Array.from(
    { length: colCount },
    () => [],
  );
  filtered.forEach((item, i) => {
    columns[i % colCount]?.push(item);
  });

  const lbCurrent = lightbox
    ? (PORTFOLIO.find((p) => p.key === lightbox.current) ?? null)
    : null;
  const lbPrev = lightbox?.prev
    ? (PORTFOLIO.find((p) => p.key === lightbox.prev) ?? null)
    : null;
  const ratioParts = (lbCurrent?.aspect ?? "1/1").split("/");
  const ratioW = Number(ratioParts[0] ?? 1);
  const ratioH = Number(ratioParts[1] ?? 1);
  const lbOpen = lightbox !== null;

  /*
   * Scroll lock while the lightbox is open — released on close AND on
   * unmount, so navigating away mid-close can never strand the page.
   * Both scroll paths must be frozen: `overflow: hidden` stops native
   * scrolling, and the event tells SmoothScroll to stop Lenis, which
   * would otherwise keep driving the page behind the modal.
   */
  useEffect(() => {
    if (!lbOpen) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    window.dispatchEvent(new Event("alma:scroll-lock"));
    return () => {
      document.documentElement.style.overflow = previous;
      window.dispatchEvent(new Event("alma:scroll-unlock"));
    };
  }, [lbOpen]);

  /* Never leave the safety timer running past unmount. */
  useEffect(
    () => () => {
      if (safetyTimer.current !== null) window.clearTimeout(safetyTimer.current);
    },
    [],
  );

  /*
   * Focus containment. The dialog declares aria-modal, so nothing behind
   * it should be reachable — without this, Tab walks straight back into
   * the grid and a keyboard user can swap the image they are looking at.
   * A wrap-around trap is used rather than `inert` on the page shell,
   * because the dialog is itself rendered inside <main> and would be
   * disabled along with everything else.
   */
  useEffect(() => {
    if (!lbOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>("button, a[href]"),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (!focusables.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;

      if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onTab);
    return () => document.removeEventListener("keydown", onTab);
  }, [lbOpen]);

  /* -------------------------------------------------------------------
   * Click handlers — capture Flip states BEFORE setState so the effects
   * that run after the re-render can animate from the old layout.
   * ---------------------------------------------------------------- */
  const handleFilter = (next: FilterKey) => {
    if (next === category) return;
    const grid = gridRef.current;
    if (grid && !prefersReducedMotion()) {
      filterFlipRef.current = {
        state: Flip.getState(grid.querySelectorAll("[data-item]")),
        keys: new Set(filtered.map((p) => p.key)),
      };
    }
    setCategory(next);
  };

  const openLightbox = (item: PortfolioItem, button: HTMLButtonElement) => {
    if (closingRef.current) return;
    openerRef.current = button;
    const frame = button.querySelector<HTMLElement>("[data-flip-id]");
    openFlipRef.current = {
      state: frame && !prefersReducedMotion() ? Flip.getState(frame) : null,
    };
    setLightbox({ current: item.key, prev: null });
  };

  /* -------------------------------------------------------------------
   * Header reveal — runs once.
   * ---------------------------------------------------------------- */
  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, Flip);
      const header = headerRef.current;
      if (!header) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(gsap.utils.toArray<HTMLElement>("[data-head]", header), {
          opacity: 0,
          y: 22,
          duration: DUR.base,
          ease: EASE.out,
          stagger: STAGGER.items,
          scrollTrigger: { trigger: header, start: REVEAL_START },
        });
      });
      // Reduced motion: the server-rendered state IS the finished state.
      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  /* -------------------------------------------------------------------
   * Grid choreography — drift + reveals (+ Flip relayout after a filter
   * change). The whole context reverts and rebuilds whenever the filter
   * or the column count changes, so no ScrollTrigger ever leaks.
   * ---------------------------------------------------------------- */
  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, Flip);
      const section = sectionRef.current;
      const grid = gridRef.current;
      if (!section || !grid) return;

      const pendingFilter = filterFlipRef.current;
      filterFlipRef.current = null;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
        // (a) Per-column drift — a subtle scrubbed differential. The
        // drift rides the COLUMN while reveals ride the FIGURE, so the
        // two never touch the same element.
        gsap.utils.toArray<HTMLElement>("[data-col]", grid).forEach((col) => {
          const c = Number(col.dataset.col ?? "0");
          gsap.to(col, {
            yPercent: COLUMN_DRIFT[c % COLUMN_DRIFT.length] ?? 0,
            ease: EASE.none,
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        });

        const items = gsap.utils.toArray<HTMLElement>("[data-item]", grid);

        // (b) One-shot clip reveals. After a filter change, tiles the
        // Flip relayout already placed (in view) or faded in (new keys)
        // skip theirs — only off-screen survivors get a fresh entrance.
        const buildReveals = () => {
          items.forEach((item) => {
            if (pendingFilter) {
              if (ScrollTrigger.isInViewport(item)) return;
              if (!pendingFilter.keys.has(item.dataset.flipId ?? "")) return;
            }
            gsap.from(item, {
              clipPath: "inset(8% 0% 12% 0%)",
              y: 20,
              opacity: 0,
              duration: DUR.base,
              ease: EASE.out,
              scrollTrigger: { trigger: item, start: REVEAL_START },
            });
          });
        };

        if (pendingFilter) {
          // Hold the section's height while absolute-positioning empties
          // the columns, so the page below never jumps mid-flight.
          gsap.set(grid, { minHeight: grid.offsetHeight });
          Flip.from(pendingFilter.state, {
            targets: items,
            duration: 0.6,
            ease: "power3.inOut",
            scale: false,
            absolute: true,
            onEnter: (els) =>
              gsap.fromTo(
                els,
                { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.4, ease: EASE.soft },
              ),
            onLeave: (els) =>
              gsap.to(els, { opacity: 0, duration: 0.25, ease: EASE.soft }),
            onComplete: () => {
              // Reveals built after the flight — inside the context via
              // ctx.add so a mid-flight revert can never leak them.
              ctx.add(() => {
                gsap.set(grid, { clearProps: "minHeight" });
                buildReveals();
                ScrollTrigger.refresh();
              });
            },
          });
        } else {
          buildReveals();
          ScrollTrigger.refresh();
        }
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        // Instant relayout — the rendered markup is the finished state;
        // just re-measure everything below the new grid height.
        ScrollTrigger.refresh();
      });

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [category, colCount], revertOnUpdate: true },
  );

  /* -------------------------------------------------------------------
   * Lightbox — open flight (Flip), sibling crossfade, close flight back
   * to the grid, keyboard, swipe. Reduced motion gets instant states.
   * ---------------------------------------------------------------- */
  useGSAP(
    (_context, contextSafe) => {
      gsap.registerPlugin(ScrollTrigger, Flip);
      const lb = lightbox;
      if (!lb || !contextSafe) {
        actionsRef.current = null;
        return;
      }
      const backdrop = backdropRef.current;
      const stage = stageRef.current;
      if (!backdrop || !stage) return;

      const chrome = [
        chromeRef.current,
        closeBtnRef.current,
        prevBtnRef.current,
        nextBtnRef.current,
      ].filter((el): el is NonNullable<typeof el> => el !== null);

      const navigate = (dir: 1 | -1) => {
        if (closingRef.current || filtered.length < 2) return;
        const idx = filtered.findIndex((p) => p.key === lb.current);
        const next =
          filtered[(Math.max(idx, 0) + dir + filtered.length) % filtered.length];
        if (!next || next.key === lb.current) return;
        setLightbox({ current: next.key, prev: lb.current });
      };

      const close = contextSafe(() => {
        if (closingRef.current) return;
        closingRef.current = true;

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          if (safetyTimer.current !== null) {
            window.clearTimeout(safetyTimer.current);
            safetyTimer.current = null;
          }
          closingRef.current = false;
          openerRef.current?.focus({ preventScroll: true });
          openerRef.current = null;
          setLightbox(null);
        };

        const home = gridRef.current?.querySelector<HTMLElement>(
          `[data-flip-id="lb-${lb.current}"]`,
        );
        if (prefersReducedMotion() || !home) {
          finish();
          return;
        }
        gsap.killTweensOf([stage, backdrop, ...chrome]);
        gsap.to([backdrop, ...chrome], {
          opacity: 0,
          duration: 0.45,
          ease: EASE.soft,
        });
        Flip.fit(stage, home, {
          duration: 0.55,
          ease: EASE.inOut,
          onComplete: finish,
        });

        /*
         * Safety net: `finish()` releases the scroll lock, so it must never
         * depend solely on a tween completing. GSAP's ticker is rAF-driven
         * and stalls in a backgrounded tab, and a reverted context can kill
         * the tween before onComplete — either would leave the visitor
         * locked. setTimeout keeps running regardless, so the lightbox
         * always closes.
         */
        safetyTimer.current = window.setTimeout(finish, 900);
      });

      actionsRef.current = { close, navigate };

      const pendingOpen = openFlipRef.current;
      openFlipRef.current = null;

      if (lb.prev === null && pendingOpen) {
        // OPEN — fly the tapped frame into the stage.
        if (pendingOpen.state) {
          gsap.fromTo(
            backdrop,
            { opacity: 0 },
            { opacity: 1, duration: DUR.fast, ease: EASE.soft },
          );
          gsap.fromTo(
            chrome,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: DUR.fast, delay: 0.3, ease: EASE.soft },
          );
          Flip.from(pendingOpen.state, {
            targets: stage,
            duration: 0.7,
            ease: EASE.inOut,
            absolute: true,
          });
        }
        closeBtnRef.current?.focus({ preventScroll: true });
      } else if (lb.prev !== null) {
        // NAVIGATE — simple crossfade between siblings, no Flip.
        const cur = curLayerRef.current;
        const prevLayer = prevLayerRef.current;
        if (cur) {
          if (prefersReducedMotion()) {
            gsap.set(cur, { opacity: 1 });
            if (prevLayer) gsap.set(prevLayer, { opacity: 0 });
          } else {
            gsap.killTweensOf(prevLayer ? [cur, prevLayer] : cur);
            gsap.fromTo(
              cur,
              { opacity: 0 },
              { opacity: 1, duration: 0.4, ease: EASE.soft },
            );
            if (prevLayer) {
              gsap.to(prevLayer, { opacity: 0, duration: 0.4, ease: EASE.soft });
            }
          }
        }
      }

      /*
       * Input listeners deliberately do NOT live here. useGSAP only runs
       * this cleanup on unmount unless revertOnUpdate is set, so binding
       * them per `lightbox` change would stack a fresh document keydown
       * listener on every navigation — arrow keys would then fire several
       * times and re-open a closed lightbox. They live in the effect
       * below instead, bound once per open/close.
       */
    },
    { dependencies: [lightbox], scope: sectionRef },
  );

  /* -------------------------------------------------------------------
   * Lightbox input — bound once while open, torn down on close and on
   * unmount. Handlers delegate through actionsRef so they always call
   * the current close/navigate closures without rebinding.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!lbOpen) return;
    const backdrop = backdropRef.current;
    const stage = stageRef.current;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") actionsRef.current?.close();
      else if (event.key === "ArrowLeft") actionsRef.current?.navigate(-1);
      else if (event.key === "ArrowRight") actionsRef.current?.navigate(1);
    };
    const onBackdrop = () => actionsRef.current?.close();
    const onPointerDown = (event: PointerEvent) => {
      swipeXRef.current = event.clientX;
    };
    const onPointerUp = (event: PointerEvent) => {
      const startX = swipeXRef.current;
      swipeXRef.current = null;
      if (startX === null) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 40) actionsRef.current?.navigate(dx < 0 ? 1 : -1);
    };

    document.addEventListener("keydown", onKey);
    backdrop?.addEventListener("click", onBackdrop);
    stage?.addEventListener("pointerdown", onPointerDown);
    stage?.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("keydown", onKey);
      backdrop?.removeEventListener("click", onBackdrop);
      stage?.removeEventListener("pointerdown", onPointerDown);
      stage?.removeEventListener("pointerup", onPointerUp);
    };
  }, [lbOpen]);

  return (
    <>
      <section
        ref={sectionRef}
        id="projects"
        aria-labelledby="projects-title"
        className="bg-sand py-24 sm:py-32"
      >
        <div className="mx-auto w-full max-w-[88rem] px-6 sm:px-8 lg:px-12">
          <div ref={headerRef}>
            <p data-head="" className="u-eyebrow flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 bg-clay"
              />
              {t("eyebrow")}
            </p>
            {/* No [data-head]: this one uncovers itself. `clip` rather
                than the house line rise because the filter row sits
                directly beneath and must not be pushed around while the
                title is still arriving. */}
            <RevealText
              as="h2"
              id="projects-title"
              variant="clip"
              className="u-display mt-6 max-w-[16ch] text-[clamp(1.9rem,6vw,4rem)] text-ink"
            >
              {t("title")}
            </RevealText>

            {/* Filter chips — FOUR buttons share ONE glass container, so
                the whole row costs a single backdrop-filter (the only
                live one in this section). */}
            <div
              data-head=""
              className="-mx-6 mt-10 overflow-x-auto px-6 sm:mx-0 sm:px-0"
              style={{ scrollbarWidth: "none" }}
            >
              <div
                className="glass inline-flex w-max items-center gap-1 p-1.5"
                style={{ borderRadius: "9999px" }}
              >
                {FILTERS.map((f) => {
                  const active = f === category;
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleFilter(f)}
                      className={`u-press cursor-pointer border px-4 py-2 text-xs tracking-[0.16em] whitespace-nowrap ${
                        active ? "text-ink" : "text-ink-55"
                      }`}
                      style={{
                        borderRadius: "9999px",
                        borderColor: active
                          ? "rgba(43, 36, 32, 0.35)"
                          : "transparent",
                      }}
                    >
                      {t(`filters.${f}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Masonry — real column divs, filled round-robin. Aspect
              ratios are reserved inline, so the wall never shifts. */}
          <div
            ref={gridRef}
            className="mt-12 flex items-start gap-3 sm:mt-16 sm:gap-4"
          >
            {columns.map((column, c) => (
              <div
                key={c}
                data-col={c}
                className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4"
              >
                {column.map((item) => (
                  <figure
                    key={item.key}
                    data-item=""
                    data-flip-id={item.key}
                    className="group"
                    style={{ clipPath: "inset(0% 0% 0% 0%)" }}
                  >
                    <button
                      type="button"
                      data-cursor-grow=""
                      aria-haspopup="dialog"
                      aria-label={t(`items.${item.key}.alt`)}
                      onClick={(event) =>
                        openLightbox(item, event.currentTarget)
                      }
                      className="u-press relative block w-full cursor-pointer bg-shell"
                    >
                      <span
                        data-flip-id={`lb-${item.key}`}
                        className="relative block w-full overflow-hidden"
                        style={{ aspectRatio: item.aspect }}
                      >
                        <Image
                          src={src(IMAGES[item.image], 1200)}
                          alt={t(`items.${item.key}.alt`)}
                          fill
                          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                          placeholder="blur"
                          blurDataURL={WARM_BLUR}
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                        />
                        {/* Caption bar: always visible on touch; slides
                            up on hover/focus where a fine pointer exists.
                            Transform-only, on an ink scrim. */}
                        <span
                          className="pointer-events-none absolute inset-x-0 bottom-0 block px-3 pt-10 pb-2.5 text-left text-[0.6875rem] leading-snug tracking-[0.14em] text-shell transition-transform duration-500 ease-out pointer-fine:translate-y-full pointer-fine:group-hover:translate-y-0 pointer-fine:group-focus-within:translate-y-0"
                          style={{
                            background:
                              "linear-gradient(to top, color-mix(in srgb, var(--ink) 65%, transparent), transparent)",
                          }}
                        >
                          {t(`items.${item.key}.caption`)}
                        </span>
                      </span>
                    </button>
                  </figure>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox — mounted only while open. The backdrop is a plain
          warm-dark wash (NOT glass — zero backdrop-filters here). */}
      {lightbox && lbCurrent && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t(`items.${lbCurrent.key}.alt`)}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
        >
          <div
            ref={backdropRef}
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: "color-mix(in srgb, var(--charcoal) 88%, transparent)",
            }}
          />

          <button
            ref={closeBtnRef}
            type="button"
            aria-label={tCommon("close")}
            onClick={() => actionsRef.current?.close()}
            className="u-press absolute top-4 right-4 z-20 flex h-11 w-11 cursor-pointer items-center justify-center border text-shell sm:top-6 sm:right-6"
            style={{
              borderRadius: "9999px",
              borderColor: "color-mix(in srgb, var(--shell) 30%, transparent)",
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            >
              <path d="M3 3 13 13M13 3 3 13" />
            </svg>
          </button>

          <button
            ref={prevBtnRef}
            type="button"
            aria-label={t("lightboxPrev")}
            onClick={() => actionsRef.current?.navigate(-1)}
            className="u-press absolute top-1/2 left-2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center border text-shell sm:left-5"
            style={{
              borderRadius: "9999px",
              borderColor: "color-mix(in srgb, var(--shell) 30%, transparent)",
              background: "color-mix(in srgb, var(--charcoal) 45%, transparent)",
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 3 5 8l5 5" />
            </svg>
          </button>
          <button
            ref={nextBtnRef}
            type="button"
            aria-label={t("lightboxNext")}
            onClick={() => actionsRef.current?.navigate(1)}
            className="u-press absolute top-1/2 right-2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center border text-shell sm:right-5"
            style={{
              borderRadius: "9999px",
              borderColor: "color-mix(in srgb, var(--shell) 30%, transparent)",
              background: "color-mix(in srgb, var(--charcoal) 45%, transparent)",
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 3 5 5-5 5" />
            </svg>
          </button>

          <div className="relative z-10 flex max-w-full flex-col items-center">
            {/* The sized holder keeps layout stable while Flip animates
                the absolutely-filled stage inside it. */}
            <div
              className="relative max-w-full"
              style={{
                width: `min(92vw, calc(72svh * ${(ratioW / ratioH).toFixed(4)}))`,
                aspectRatio: `${ratioW} / ${ratioH}`,
              }}
            >
              <div
                ref={stageRef}
                data-flip-id={`lb-${lbCurrent.key}`}
                className="absolute inset-0 overflow-hidden bg-charcoal"
                style={{ touchAction: "pan-y" }}
              >
                {lbPrev && (
                  <div
                    key={lbPrev.key}
                    ref={prevLayerRef}
                    className="absolute inset-0"
                  >
                    <Image
                      src={src(IMAGES[lbPrev.image], 1600)}
                      alt={t(`items.${lbPrev.key}.alt`)}
                      fill
                      sizes="92vw"
                      placeholder="blur"
                      blurDataURL={WARM_BLUR}
                      className="object-cover"
                    />
                  </div>
                )}
                <div
                  key={lbCurrent.key}
                  ref={curLayerRef}
                  className="absolute inset-0"
                >
                  <Image
                    src={src(IMAGES[lbCurrent.image], 1600)}
                    alt={t(`items.${lbCurrent.key}.alt`)}
                    fill
                    sizes="92vw"
                    placeholder="blur"
                    blurDataURL={WARM_BLUR}
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            <div
              ref={chromeRef}
              className="mt-5 flex flex-col items-center gap-4 px-4 text-center"
            >
              <p
                className="text-xs tracking-[0.18em]"
                style={{
                  color: "color-mix(in srgb, var(--shell) 78%, transparent)",
                }}
              >
                {t(`items.${lbCurrent.key}.caption`)}
              </p>
              <a
                href={whatsappUrl(tCommon("whatsappPrefill"))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("Contact", { method: "whatsapp" })}
                className="u-press inline-flex cursor-pointer items-center gap-2 bg-clay px-6 py-3 text-xs tracking-[0.16em] text-charcoal"
                style={{ borderRadius: "9999px" }}
              >
                {t("lightboxCta")}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
