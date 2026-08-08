"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DUR, EASE, ENTRANCE, STAGGER, prefersReducedMotion } from "@/lib/motion";

/*
 * THE CATALOGUE — one gallery, read like a book of plates.
 *
 * No full-bleed cinema: a quiet masthead on paper, then every
 * photograph as a CONTAINED plate at its natural proportion, with its
 * number, its name and a story line set beside it — text and image
 * alternating sides down the page, a hairline between entries. Click
 * any plate for the full-size view (the lightbox is the one dark room
 * left). The only motion is a one-time fade-up per plate.
 *
 * Everything — headings, stories, captions — is in the server HTML.
 */

export type ExhibitImage = {
  url: string;
  alt: string;
  /** The plate's display name — the alt's descriptive stem. */
  heading: string;
  /** The story line beside the plate (CMS caption, en fallback). */
  caption?: string;
  width: number;
  height: number;
};

export type ExhibitNext = {
  slug: string;
  title: string;
  coverUrl: string | null;
  coverAlt: string;
};

export default function GalleryExhibit({
  title,
  description,
  year,
  position,
  total,
  images,
  next,
}: {
  title: string;
  description: string;
  year: string;
  position: string;
  total: string;
  images: ExhibitImage[];
  next: ExhibitNext | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("gallery");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((index: number, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setLightbox(index);
  }, []);

  const close = useCallback(() => {
    setLightbox(null);
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  const step = useCallback(
    (delta: number) => {
      setLightbox((current) => {
        if (current === null) return current;
        return (current + delta + images.length) % images.length;
      });
    },
    [images.length],
  );

  /* Scroll lock while the lightbox is open — the Projects discipline:
   * freeze native overflow AND stop Lenis, release on close/unmount. */
  useEffect(() => {
    if (lightbox === null) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    window.dispatchEvent(new Event("alma:scroll-lock"));
    return () => {
      document.documentElement.style.overflow = previous;
      window.dispatchEvent(new Event("alma:scroll-unlock"));
    };
  }, [lightbox]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, close, step]);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const head = Array.from(
          root.querySelectorAll<HTMLElement>("[data-cat-head] > *"),
        );
        if (head.length) {
          gsap.from(head, {
            y: 30,
            opacity: 0,
            duration: DUR.reveal,
            ease: EASE.out,
            stagger: STAGGER.lines,
            delay: 0.1,
          });
        }
        root.querySelectorAll<HTMLElement>("[data-cat-plate]").forEach((plate) => {
          gsap.from(plate.children, {
            y: 26,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.items,
            scrollTrigger: {
              trigger: plate,
              start: ENTRANCE.text,
              toggleActions: ENTRANCE.once,
            },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  /* The lightbox arrives quickly — it is pointer-caused. */
  const lightboxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (lightbox === null || !lightboxRef.current) return;
    const overlay = lightboxRef.current;
    overlay.querySelector<HTMLElement>("[data-lb-close]")?.focus();
    const tween = gsap.from(overlay, {
      opacity: 0,
      scale: prefersReducedMotion() ? 1 : 0.985,
      duration: DUR.fast,
      ease: EASE.pointer,
    });
    return () => {
      tween.kill();
    };
    // Re-runs only when the box opens, not on every photo step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox === null]);

  const current = lightbox === null ? null : images[lightbox];

  return (
    <div ref={rootRef}>
      {/* ---- The masthead: quiet, on paper. ---- */}
      <header className="u-band px-5 pt-32 sm:px-8 sm:pt-36 lg:px-12">
        <div data-cat-head className="mx-auto w-full max-w-5xl pb-10">
          <Link href="/gallery" className="gx-mono u-link text-ink-55">
            ← {t("back")}
          </Link>
          <h1 className="u-display mt-6 max-w-[18ch] text-[clamp(2.1rem,5.5vw,3.8rem)] text-ink">
            {title}
          </h1>
          {description ? (
            <p className="mt-5 max-w-2xl text-[0.9375rem] leading-[1.7] text-ink-70 sm:text-base">
              {description}
            </p>
          ) : null}
          <p className="gx-mono mt-6 flex items-center gap-4 text-ink-55">
            <span>{t("count", { count: images.length })}</span>
            <span aria-hidden="true" className="gx-meta-rule" />
            <span>{year}</span>
            <span aria-hidden="true" className="gx-meta-rule" />
            <span>
              {position} / {total}
            </span>
          </p>
        </div>
      </header>

      {/* ---- The plates. ---- */}
      <section className="u-band px-5 pb-16 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-5xl">
          {images.map((image, index) => (
            <article key={image.url} data-cat-plate className="gxc-plate">
              <div className="gxc-copy">
                <p className="gx-mono gxc-num">
                  {t("fig")} {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="u-display gxc-name">{image.heading}</h2>
                {image.caption ? (
                  <p className="gxc-story">{image.caption}</p>
                ) : null}
              </div>
              <figure className="gxc-media">
                <button
                  type="button"
                  className="gxc-frame"
                  aria-label={t("openPhoto", { index: index + 1 })}
                  onClick={(e) => open(index, e.currentTarget)}
                >
                  <Image
                    src={image.url}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    sizes="(min-width: 768px) 46vw, 92vw"
                    preload={index === 0}
                  />
                </button>
              </figure>
            </article>
          ))}
        </div>
      </section>

      {/* ---- The hand-off: one quiet row. ---- */}
      {next ? (
        <section className="u-band px-5 pb-24 sm:px-8 sm:pb-32 lg:px-12">
          <Link href={`/gallery/${next.slug}`} className="gxc-next">
            <span className="gxc-next-copy">
              <span className="gx-mono text-ink-55">{t("next")}</span>
              <span className="u-display gxc-next-title u-link">
                {next.title}
              </span>
            </span>
            {next.coverUrl ? (
              <span className="gxc-next-thumb">
                <Image
                  src={next.coverUrl}
                  alt={next.coverAlt}
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              </span>
            ) : null}
          </Link>
        </section>
      ) : null}

      {/* ---- The lightbox: the one dark room left. ---- */}
      {current ? (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          className="gx-lightbox"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <span className="gx-mono gx-lightbox-counter">
            {String((lightbox ?? 0) + 1).padStart(2, "0")} /{" "}
            {String(images.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            data-lb-close
            className="gx-mono gx-lightbox-btn gx-lightbox-close u-press"
            onClick={close}
          >
            {t("close")}
          </button>
          <div className="gx-lightbox-stage">
            <Image
              key={current.url}
              src={current.url}
              alt={current.alt}
              width={current.width}
              height={current.height}
              sizes="92vw"
            />
          </div>
          {images.length > 1 ? (
            <>
              <button
                type="button"
                className="gx-lightbox-btn gx-lightbox-prev u-press"
                aria-label={t("prevPhoto")}
                onClick={() => step(-1)}
              >
                ←
              </button>
              <button
                type="button"
                className="gx-lightbox-btn gx-lightbox-next u-press"
                aria-label={t("nextPhoto")}
                onClick={() => step(1)}
              >
                →
              </button>
            </>
          ) : null}
          <p className="gx-lightbox-caption">
            {current.caption ?? current.alt}
          </p>
        </div>
      ) : null}
    </div>
  );
}
