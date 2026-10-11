"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CataloguePage } from "@/lib/catalogue";

/*
 * LATEST WORK — rows: the piece, its line, its chapter, an arrow. Rest
 * the pointer on a row and its photograph follows the pointer about,
 * a corner cut off. The rows are plain links to the catalogue, each
 * opening on its own page.
 */
export default function LatestWork({ pages }: { pages: CataloguePage[] }) {
  const t = useTranslations("latest");
  const [hover, setHover] = useState<number | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // The preview eases after the pointer; one composited element.
  useEffect(() => {
    const el = preview.current;
    const host = list.current;
    if (!el || !host || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    let seeded = false;
    const step = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(step) : 0;
    };
    const move = (e: PointerEvent) => {
      tx = e.clientX + 40;
      ty = e.clientY;
      if (!seeded) {
        x = tx;
        y = ty;
        seeded = true;
      }
      if (!raf) raf = requestAnimationFrame(step);
    };
    host.addEventListener("pointermove", move, { passive: true });
    return () => {
      host.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  const shown = hover !== null ? pages[hover] : null;

  return (
    <section className="latest">
      <h2 className="u-display text-[clamp(1.9rem,3.2vw,2.6rem)]">{t("title")}</h2>

      <div ref={list} className="mt-6" onPointerLeave={() => setHover(null)}>
        {pages.map((page, i) => (
          <Link
            key={page.id}
            href={`/gallery/${page.chapter}?p=${pageIndexHint(page)}`}
            className="row"
            onPointerEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            aria-label={t("open", { title: page.heading || page.ref })}
          >
            <span className="row-title">{page.heading || page.ref}</span>
            <span className="row-text">{page.caption}</span>
            <span className="row-meta">{page.chapterTitle}</span>
            <span className="circle circle-fill">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M2 8h12M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
          </Link>
        ))}
      </div>

      <Link href="/gallery" className="mt-10 inline-flex items-center gap-4 text-[0.9375rem]">
        <span className="u-link">{t("all")}</span>
        <span className="circle circle-fill">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M2 8h12M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
      </Link>

      <div ref={preview} className="preview" style={{ opacity: shown ? 1 : 0 }} aria-hidden="true">
        {shown && (
          <Image key={shown.id} src={shown.url} alt="" fill sizes="26vw" className="object-cover" />
        )}
      </div>
    </section>
  );
}

/* The page's position inside its chapter is carried on the page itself. */
function pageIndexHint(page: CataloguePage): number {
  return page.indexInChapter ?? 0;
}
