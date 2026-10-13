"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CatalogueViewer from "@/app/_components/CatalogueViewer";
import { track } from "@/lib/analytics";
import type { CataloguePage } from "@/lib/catalogue";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/*
 * THE CATALOGUE GRID — columns of every page.
 *
 * Every tile opens a split view with a full photograph and its details.
 * Swipe or arrow keys browse; ?p=<index> shares a particular photograph.
 *
 * Browser back closes the page instead of leaving the catalogue — on a
 * phone that is the gesture people reach for first.
 */
export default function Catalogue({
  pages,
  shareBase,
}: {
  pages: CataloguePage[];
  /** Absolute URL of this chapter/catalogue, for Pinterest pins. */
  shareBase: string;
}) {
  const t = useTranslations("catalogue");
  const params = useSearchParams();
  const wanted = Number(params.get("p"));
  const initial =
    /^\d+$/.test(params.get("p") ?? "") &&
    Number.isInteger(wanted) &&
    wanted >= 0 &&
    wanted < pages.length
      ? wanted
      : null;
  const [open, setOpen] = useState<number | null>(initial);
  const pushed = useRef(false);
  const grid = useRef<HTMLUListElement>(null);

  /* Tiles rise into place as they scroll in (Combo 4). Only tiles still
   * below the fold are hidden first, so nothing on screen ever blinks,
   * and the server HTML shows every photograph without JS. */
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const tiles = gsap.utils
          .toArray<HTMLElement>(".masonry > li", grid.current)
          .filter((tile) => tile.getBoundingClientRect().top > window.innerHeight);
        if (tiles.length === 0) return;
        gsap.set(tiles, { opacity: 0, y: 48, scale: 0.96 });
        ScrollTrigger.batch(tiles, {
          start: "top 98%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out",
              stagger: 0.08, overwrite: true, clearProps: "transform",
            }),
        });
      });
      return () => media.revert();
    },
    { scope: grid },
  );

  const show = useCallback(
    (index: number) => {
      setOpen(index);
      track("ViewPage", {
        page: pages[index]?.ref,
        chapter: pages[index]?.chapter,
      });
      if (!pushed.current) {
        const url = new URL(window.location.href);
        url.searchParams.set("p", String(index));
        history.pushState({ ...history.state, kgViewer: true }, "", url);
        pushed.current = true;
      }
    },
    [pages],
  );

  const close = useCallback(() => {
    if (pushed.current) {
      // Let the popstate handler do the closing, so history stays in step.
      history.back();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("p");
      history.replaceState(history.state, "", url);
      setOpen(null);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      pushed.current = false;
      setOpen(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (pages.length === 0) {
    return <p className="catalogue-empty">{t("empty")}</p>;
  }

  return (
    <>
      <ul className="masonry" ref={grid}>
        {pages.map((page, i) => (
          <li key={page.id}>
            <button
              type="button"
              className="mtile"
              onClick={() => show(i)}
              aria-label={t("open", { title: page.heading || page.alt })}
            >
              <Image
                src={page.url}
                alt={page.alt}
                width={page.width}
                height={page.height}
                sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                loading={i < 4 ? "eager" : "lazy"}
              />
              {page.heading && (
                <span className="mtile-label" aria-hidden="true">
                  {page.heading}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <CatalogueViewer
          pages={pages}
          index={open}
          onIndex={(i) => {
            setOpen(i);
            const url = new URL(window.location.href);
            url.searchParams.set("p", String(i));
            history.replaceState(history.state, "", url);
            track("ViewPage", {
              page: pages[i]?.ref,
              chapter: pages[i]?.chapter,
            });
          }}
          onClose={close}
          shareBase={shareBase}
        />
      )}
    </>
  );
}
