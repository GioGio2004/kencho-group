"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DUR, EASE, ENTRANCE, STAGGER } from "@/lib/motion";

/*
 * THE GALLERY INDEX — a catalogue's contents page, not a corridor.
 *
 * Each gallery is one quiet row on paper: a contained cover, the
 * title, its line, and the count — separated by hairlines, read top to
 * bottom. Everything is in the server HTML; the only motion is a
 * one-time fade-up per row.
 */

export type ChapterItem = {
  slug: string;
  title: string;
  description: string;
  imageCount: number;
  coverUrl: string | null;
  coverAlt: string;
};

export default function GalleryChapters({ items }: { items: ChapterItem[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("gallery");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        root.querySelectorAll<HTMLElement>("[data-row]").forEach((row) => {
          gsap.from(row.children, {
            y: 26,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.items,
            scrollTrigger: {
              trigger: row,
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

  return (
    <div ref={rootRef} className="u-band px-5 pb-24 sm:px-8 sm:pb-32 lg:px-12">
      <ul className="mx-auto w-full max-w-5xl">
        {items.map((item, index) => (
          <li key={item.slug}>
            <Link href={`/gallery/${item.slug}`} data-row className="gxi-row">
              <span className="gxi-media">
                {item.coverUrl ? (
                  <Image
                    src={item.coverUrl}
                    alt={item.coverAlt}
                    fill
                    sizes="(min-width: 768px) 34vw, 92vw"
                    preload={index === 0}
                    className="object-cover"
                  />
                ) : null}
              </span>
              <span className="gxi-copy">
                <span className="gx-mono gxi-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="u-display gxi-title u-link">{item.title}</span>
                {item.description ? (
                  <span className="gxi-desc">{item.description}</span>
                ) : null}
                <span className="gx-mono gxi-meta">
                  {t("count", { count: item.imageCount })}
                  <span aria-hidden="true" className="gx-meta-rule" />
                  {t("view")}{" "}
                  <span aria-hidden="true" className="gxi-arrow">
                    →
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
