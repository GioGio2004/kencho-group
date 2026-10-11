"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Lenis from "lenis";
import { useTranslations } from "next-intl";
import { useContact } from "@/app/_components/ContactProvider";
import WorkLink from "@/app/_components/WorkLink";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { src } from "@/lib/images";
import { PROJECTS, type Project } from "@/lib/projects";
import { containDialogTab, lockPage } from "@/lib/modal-lock";

/*
 * TWO PROJECTS, side by side — after the product pair on noho.co.
 *
 * Each tile is a coloured field with one photograph standing in it.
 * The cover stays fixed. The plus opens the project's story: the other
 * tile slides away and the story
 * is revealed where it stood — a quote, a paragraph, a small photograph,
 * a gallery you page through with a Next / Back chip, three reasons it
 * works, two details and a way to discuss the project. The × brings the
 * other tile back.
 *
 * Desktop opens a full-screen, native dialog. Its two equal fields keep
 * their positions; the neighbour slides away to uncover the story. The
 * photographs are real project views, rather than a simulated 3D spin.
 * Below 900px the story unfolds under its tile, with native page scroll.
 */

const DESKTOP = "(min-width: 900px)";
type Side = "a" | "b";

const subscribeDesktop = (onChange: () => void) => {
  const media = matchMedia(DESKTOP);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const useDesktop = () =>
  useSyncExternalStore(
    subscribeDesktop,
    () => matchMedia(DESKTOP).matches,
    () => false,
  );

export default function ProjectTiles() {
  const t = useTranslations("tiles");
  const desktop = useDesktop();
  const [open, setOpen] = useState<Side | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  // Escape closes whichever story is open.
  useEffect(() => {
    if (!open || desktop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, desktop]);

  const toggle = (side: Side, project: Project, tile: HTMLElement) => {
    const next = open === side ? null : side;
    opener.current = document.activeElement as HTMLElement;
    setOpen(next);
    if (!next) return;
    track("ViewPage", { page: project.key, chapter: project.chapter });
    // Bring the whole band (or, stacked, this tile) up under the header.
    if (desktop) return;
    const target = tile;
    if (!target) return;
    const header =
      document.querySelector(".site-header")?.getBoundingClientRect().height ?? 88;
    const top = target.getBoundingClientRect().top;
    if (Math.abs(top - header) < 24) return;
    const y = top + window.scrollY - header;
    const lenis = (
      window as Window & { __lenis?: { scrollTo(y: number, o?: { duration?: number }): void } }
    ).__lenis;
    if (lenis) lenis.scrollTo(y, { duration: 1 });
    else window.scrollTo({
      top: y,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  return (
    <section
      id="work"
      className="tiles"
      aria-labelledby="tiles-heading"
      data-open={!desktop ? open ?? "none" : "none"}
    >
      <div className="home-shell tiles-head" data-reveal>
        <div>
          <p className="home-eyebrow">{t("label")}</p>
          <h2 id="tiles-heading">{t("title")}</h2>
        </div>
        <WorkLink href="/gallery" className="home-text-link">
          {t("all")} <span aria-hidden="true">↗</span>
        </WorkLink>
      </div>

      <div ref={stage} className="tiles-stage">
        {PROJECTS.map((project, i) => {
          const side: Side = i === 0 ? "a" : "b";
          return (
            <Tile
              key={project.key}
              project={project}
              side={side}
              open={!desktop && open === side}
              away={false}
              desktop={false}
              onToggle={(el) => toggle(side, project, el)}
            />
          );
        })}
      </div>
      {desktop && open && (
        <ProjectExplorer
          side={open}
          origin={stage}
          opener={opener}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}

function ProjectExplorer({
  side, origin, opener, onClose,
}: {
  side: Side;
  origin: React.RefObject<HTMLDivElement | null>;
  opener: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const t = useTranslations("tiles");
  const dialog = useRef<HTMLDialogElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const { contextSafe } = useGSAP(() => {
    const el = dialog.current;
    const field = band.current;
    if (!el || !field) return;
    const rect = origin.current?.getBoundingClientRect();
    const release = lockPage();
    el.showModal();
    if (rect && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(field,
        { y: rect.top, scaleY: rect.height / window.innerHeight },
        { y: 0, scaleY: 1, duration: 0.9, ease: "power3.inOut", clearProps: "transform" },
      );
    }
    const raf = requestAnimationFrame(() => {
      if (closing.current) return;
      field.dataset.open = side;
      el.querySelector<HTMLButtonElement>('.project-tile[data-open="true"] .tile-close')
        ?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(raf);
      el.close();
      release();
      opener.current?.focus({ preventScroll: true });
    };
  }, { scope: dialog });

  const close = () => {
    if (closing.current || !band.current || !dialog.current) return;
    closing.current = true;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    dialog.current.dataset.closing = "true";
    band.current.dataset.open = "none";
    const rect = origin.current?.getBoundingClientRect();
    contextSafe(() => {
      gsap.to(band.current, {
        y: rect?.top ?? 0,
        scaleY: rect ? rect.height / window.innerHeight : 1,
        duration: 0.9,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: onClose,
      });
    })();
  };

  return (
    <dialog
      ref={dialog}
      className="project-explorer"
      aria-label={t(`${side === "a" ? "house" : "lobby"}.name`)}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onKeyDown={containDialogTab}
    >
      <div ref={band} className="tiles-stage tiles-explorer-stage" data-open="none">
        {PROJECTS.map((project, i) => {
          const itemSide: Side = i === 0 ? "a" : "b";
          return (
            <Tile
              key={project.key}
              project={project}
              side={itemSide}
              open={side === itemSide}
              away={side !== itemSide}
              desktop
              onToggle={close}
            />
          );
        })}
      </div>
    </dialog>
  );
}

function Tile({
  project,
  side,
  open,
  away,
  desktop,
  onToggle,
}: {
  project: Project;
  side: Side;
  open: boolean;
  away: boolean;
  desktop: boolean;
  onToggle: (tile: HTMLElement) => void;
}) {
  const t = useTranslations("tiles");
  const openContact = useContact();
  const { key, photos } = project;
  const n = photos.length;
  const [slide, setSlide] = useState(0);
  const panelId = useId();
  const root = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const story = useRef<HTMLDivElement>(null);
  const plus = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const backChip = useRef<HTMLSpanElement>(null);
  const nextChip = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);

  const name = t(`${key}.name`);
  const kind = t(`${key}.kind`);
  const alt = (i: number) => t(`${key}.alts.${i}`);

  // Opening: the story starts at its top and takes the focus (its ×);
  // closing hands the focus back to the plus.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (open) {
      if (scroller.current) scroller.current.scrollTop = 0;
      if (desktop) close.current?.focus({ preventScroll: true });
    } else {
      plus.current?.focus({ preventScroll: true });
    }
  }, [open, desktop]);

  useEffect(() => {
    if (!open || !desktop || !scroller.current || !story.current) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;
    const sync = () => {
      lenis?.destroy();
      lenis = undefined;
      if (motion.matches) return;
      lenis = new Lenis({
        wrapper: scroller.current!, content: story.current!,
        autoRaf: true, lerp: 0.085, overscroll: false,
      });
    };
    sync();
    motion.addEventListener("change", sync);
    return () => { motion.removeEventListener("change", sync); lenis?.destroy(); };
  }, [open, desktop]);

  const stepSlide = (d: number) => setSlide((s) => Math.max(0, Math.min(n - 1, s + d)));

  const quote = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openContact({ about: `${kind} — ${name}` });
  };

  const follow = (el: HTMLElement | null, host: HTMLElement, e: React.PointerEvent) => {
    if (!el) return;
    const r = host.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left).toFixed(1)}px, ${(e.clientY - r.top).toFixed(1)}px) translate(-50%, -50%)`;
  };

  const onGalleryMove = (e: React.PointerEvent<HTMLButtonElement>, dir: "back" | "next") => {
    const gallery = e.currentTarget.parentElement;
    if (!gallery || e.pointerType !== "mouse") return;
    follow(dir === "back" ? backChip.current : nextChip.current, gallery, e);
    gallery.dataset.cursor = dir;
  };

  return (
    <article
      ref={root}
      className="project-tile"
      data-side={side}
      data-open={open}
      inert={away || undefined}
      style={{ "--tone": project.tone } as React.CSSProperties}
      aria-label={name}
    >
      <div className="tile-face">
        <button
          ref={plus}
          type="button"
          className="tile-plus"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? t("close") : `${t("learn")}: ${name}`}
          onClick={() => root.current && onToggle(root.current)}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>

        <button
          type="button"
          className="tile-view"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? t("close") : t("learn") + ": " + name}
          onClick={() => root.current && onToggle(root.current)}
        >
          <div className="tile-frames">
            <div className="tile-frame" data-shape={photos[project.cover].landscape ? "l" : "p"}>
              <div className="tile-photo">
                <Image
                  src={src(photos[project.cover])}
                  alt={alt(project.cover)}
                  fill
                  sizes="(max-width: 899px) 92vw, 42vw"
                />
              </div>
            </div>
          </div>
        </button>

        <div className="tile-bar">
          <div className="tile-id">
            <p className="tile-kind">{kind}</p>
            <h3 className="tile-name">{name}</h3>
          </div>
          <div className="tile-actions">
            <button
              type="button"
              className="tile-more"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => root.current && onToggle(root.current)}
            >
              {open ? t("close") : t("learn")}
            </button>
            <Link href="/contact" className="btn btn-ink tile-quote" onClick={quote}>
              {t("quote")}
            </Link>
          </div>
        </div>
      </div>

      <div
        id={panelId}
        className="tile-panel"
        inert={!open || undefined}
        aria-hidden={!open}
      >
        <button
          ref={close}
          type="button"
          className="tile-close"
          aria-label={t("close")}
          onClick={() => root.current && onToggle(root.current)}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>

        <div ref={scroller} className="tile-scroll" data-lenis-prevent={!desktop || undefined}>
          <div ref={story} className="tile-story">
            <p className="tile-eyebrow">
              {kind} · {t("photos", { count: n })}
            </p>
            <h3 className="tile-headline">{t(`${key}.quote`)}</h3>
            <p className="tile-text">{t(`${key}.text`)}</p>

            <figure className="tile-portrait">
              <Image
                src={src(photos[project.portrait])}
                alt={alt(project.portrait)}
                fill
                sizes="(max-width: 899px) 60vw, 20vw"
              />
            </figure>

            <div
              className="tile-gallery"
              role="group"
              aria-roledescription="carousel"
              aria-label={`${name}: ${t("photos", { count: n })}`}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                  event.preventDefault();
                  stepSlide(event.key === "ArrowRight" ? 1 : -1);
                }
              }}
              onPointerDown={(event) => {
                if (event.pointerType === "touch")
                  swipe.current = { x: event.clientX, y: event.clientY };
              }}
              onPointerUp={(event) => {
                const start = swipe.current;
                swipe.current = null;
                if (!start) return;
                const dx = event.clientX - start.x;
                if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
                  suppressClickUntil.current = performance.now() + 350;
                  stepSlide(dx < 0 ? 1 : -1);
                }
              }}
              onPointerCancel={() => { swipe.current = null; }}
              onClickCapture={(event) => {
                if (performance.now() < suppressClickUntil.current) {
                  event.preventDefault(); event.stopPropagation();
                }
              }}
              onPointerLeave={(e) => {
                e.currentTarget.dataset.cursor = "none";
              }}
            >
              <div
                className="tile-gallery-track"
                style={{ transform: `translateX(${-slide * 100}%)` }}
              >
                {photos.map((photo, i) => (
                  <div
                    key={photo.file}
                    className="tile-slide"
                    data-shape={photo.landscape ? "l" : "p"}
                    aria-hidden={i !== slide}
                  >
                    <Image
                      src={src(photo)}
                      alt={i === slide ? alt(i) : ""}
                      fill
                      sizes="(max-width: 899px) 100vw, 46vw"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
              {slide > 0 && (
                <button
                  type="button"
                  className="tile-half"
                  data-dir="back"
                  data-full={slide === n - 1}
                  aria-label={t("prev")}
                  onClick={() => stepSlide(-1)}
                  onPointerMove={(e) => onGalleryMove(e, "back")}
                />
              )}
              {slide < n - 1 && (
                <button
                  type="button"
                  className="tile-half"
                  data-dir="next"
                  data-full={slide === 0}
                  aria-label={t("next")}
                  onClick={() => stepSlide(1)}
                  onPointerMove={(e) => onGalleryMove(e, "next")}
                />
              )}
              <span ref={backChip} className="tile-gchip" data-dir="back" aria-hidden="true">
                {t("back")}
              </span>
              <span ref={nextChip} className="tile-gchip" data-dir="next" aria-hidden="true">
                {t("nextShort")}
              </span>
            </div>
            <div className="tile-gallery-controls">
              <button type="button" aria-label={t("prev")} disabled={slide === 0} onClick={() => stepSlide(-1)}>←</button>
              <p className="tile-count" aria-live="polite">
                {String(slide + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </p>
              <button type="button" aria-label={t("next")} disabled={slide === n - 1} onClick={() => stepSlide(1)}>→</button>
            </div>

            <p className="tile-sub">{t("why")}</p>
            <ul className="tile-why">
              {[1, 2, 3].map((i) => (
                <li key={i}>
                  <strong>{t(`${key}.why.${i}.title`)}</strong>
                  <p>{t(`${key}.why.${i}.text`)}</p>
                </li>
              ))}
            </ul>

            <p className="tile-sub">{t("details")}</p>
            <div className="tile-pair">
              {project.pair.map((p, i) => (
                <figure key={p}>
                  <div className="tile-pair-photo">
                    <Image
                      src={src(photos[p])}
                      alt={alt(p)}
                      fill
                      sizes="(max-width: 899px) 45vw, 23vw"
                    />
                  </div>
                  <figcaption>{t(`${key}.pair.${i + 1}`)}</figcaption>
                </figure>
              ))}
            </div>

            <div className="tile-cta">
              <p>{t("cta")}</p>
              <div className="tile-cta-actions">
                <Link href="/contact" className="btn btn-ink" onClick={quote}>
                  {t("quote")}
                </Link>
                <WorkLink href={`/gallery/${project.chapter}`} className="home-text-link">
                  {t(`${key}.more`)} <span aria-hidden="true">↗</span>
                </WorkLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
