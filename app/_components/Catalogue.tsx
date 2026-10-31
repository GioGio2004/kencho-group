"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import CatalogueViewer from "@/app/_components/CatalogueViewer";
import CatalogueFilters, { type FilterCategory } from "@/app/_components/CatalogueFilters";
import type { Locale } from "@/i18n/routing";
import { track } from "@/lib/analytics";
import {
  MATERIAL_LABELS,
  type CataloguePage,
  type MaterialTag,
} from "@/lib/catalogue";

// Intrinsic image sizes preserve the production gallery's masonry layout.
// Filters, 3/4-column density and pagination remain independent of the viewer index.

const BATCH_SIZE = 24;

type CatalogueLabels = {
  allMaterials: string;
  loadMore: string;
  showing: string;
  gridEditorial: string;
  gridIndex: string;
  plate: string;
};

const DEFAULT_LABELS: CatalogueLabels = {
  allMaterials: "All materials",
  loadMore: "Load more works",
  showing: "Showing",
  gridEditorial: "3 columns",
  gridIndex: "4 columns",
  plate: "Plate",
};

export default function Catalogue({
  pages,
  shareBase,
  locale = "en",
  labels = DEFAULT_LABELS,
  categories = [],
}: {
  pages: CataloguePage[];
  /** Absolute URL of this chapter/catalogue, for Pinterest pins. */
  shareBase: string;
  locale?: Locale;
  labels?: CatalogueLabels;
  categories?: FilterCategory[];
}) {
  const t = useTranslations("catalogue");
  const [open, setOpen] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<MaterialTag | null>(null);
  const [columns, setColumns] = useState<3 | 4>(4);
  const [visibleCount, setVisibleCount] = useState<number>(BATCH_SIZE);
  const pushed = useRef(false);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("p") ?? "";
    const wanted = Number(raw);
    if (
      /^\d+$/.test(raw) &&
      Number.isInteger(wanted) &&
      wanted >= 0 &&
      wanted < pages.length
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(wanted);
      setVisibleCount((prev) => Math.max(prev, wanted + 1));
    }
  }, [pages.length]);

  const availableTags = useMemo(() => {
    const counts = new Map<MaterialTag, number>();
    for (const page of pages) {
      for (const tag of page.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({
        tag,
        count,
        label: MATERIAL_LABELS[tag]?.[locale] ?? tag,
      }));
  }, [pages, locale]);

  const filtered = useMemo(() => {
    if (!activeTag) return pages.map((page, originalIndex) => ({ page, originalIndex }));
    return pages
      .map((page, originalIndex) => ({ page, originalIndex }))
      .filter(({ page }) => page.tags?.includes(activeTag));
  }, [pages, activeTag]);

  const visibleItems = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
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
      <CatalogueFilters
        locale={locale}
        categories={categories}
        tags={availableTags}
        activeTag={activeTag}
        columns={columns}
        allMaterials={labels.allMaterials}
        total={pages.length}
        results={filtered.length}
        onTag={(tag) => { setActiveTag(tag); setVisibleCount(BATCH_SIZE); }}
        onColumns={setColumns}
      />

      <ul className="opera-grid masonry" data-columns={columns}>
        {visibleItems.map(({ page, originalIndex }, i) => (
          <li key={page.id} className="opera-grid-item">
            <button
              type="button"
              className="mtile opera-card group"
              onClick={() => show(originalIndex)}
              aria-label={t("open", { title: page.heading || page.alt })}
            >
              <div className="opera-frame glass-media">
                <Image
                  src={page.url}
                  alt={page.alt}
                  width={page.width}
                  height={page.height}
                  sizes={
                    columns === 4
                      ? "(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                      : "(max-width: 767px) 50vw, 33vw"
                  }
                  loading={i < 4 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                />
              </div>

              <span className="masonry-card-caption" aria-hidden="true"><span>{page.heading || page.chapterTitle}</span><span>↗</span></span>
            </button>
          </li>
        ))}
      </ul>

      {visibleCount < filtered.length && (
        <div className="opera-pagination">
          <p className="opera-pagination-status">
            {labels.showing} {visibleItems.length} / {filtered.length}
          </p>
          <button
            type="button"
            data-load-more
            className="opera-load-more"
            onClick={() => setVisibleCount((prev) => prev + BATCH_SIZE)}
          >
            <span>{labels.loadMore}</span>
            <span className="opera-load-more-count">
              +{Math.min(BATCH_SIZE, filtered.length - visibleCount)}
            </span>
          </button>
        </div>
      )}

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
