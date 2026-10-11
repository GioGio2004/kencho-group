"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import type { CataloguePage } from "@/lib/catalogue";
const CatalogueViewer = dynamic(
  () => import("@/app/_components/CatalogueViewer"),
);
export default function SelectedWork({
  pages,
  shareBase,
}: {
  pages: CataloguePage[];
  shareBase: string;
}) {
  const t = useTranslations("home");
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <div className="project-grid">
        {pages.map((page, i) => (
          <article className="project-card" key={page.id} data-reveal>
            <Link
              href={"/gallery/" + page.chapter}
              className="project-image"
              aria-label={t("open") + ": " + page.heading}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                setOpen(i);
                track("ViewPage", { page: page.ref, chapter: page.chapter });
              }}
            >
              <Image
                src={page.url}
                alt={page.alt}
                fill
                sizes="(max-width: 699px) 100vw, (max-width: 1099px) 45vw, 31vw"
                className="object-cover"
              />
              <span className="project-open">
                {t("open")} <span aria-hidden="true">↗</span>
              </span>
            </Link>
            <div className="project-meta">
              <p>{page.chapterTitle}</p>
              <span aria-hidden="true">0{i + 1}</span>
            </div>
            <h3>{page.heading}</h3>
            <p className="project-caption">{page.caption}</p>
          </article>
        ))}
      </div>
      {open !== null && (
        <CatalogueViewer
          pages={pages}
          index={open}
          onIndex={(i) => {
            setOpen(i);
            track("ViewPage", {
              page: pages[i].ref,
              chapter: pages[i].chapter,
            });
          }}
          onClose={() => setOpen(null)}
          shareBase={shareBase}
        />
      )}
    </>
  );
}
