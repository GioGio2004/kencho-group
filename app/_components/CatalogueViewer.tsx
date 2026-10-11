"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useContact } from "@/app/_components/ContactProvider";
import { containDialogTab, lockPage } from "@/lib/modal-lock";
import { GREETING_END_EVENT } from "@/lib/greeting";
import type { CataloguePage } from "@/lib/catalogue";

/** A full photograph beside an immersive detail view. Each record is one
 * photograph; we never pretend that separate CMS images are one project. */
export default function CatalogueViewer({
  pages,
  index,
  onIndex,
  onClose,
}: {
  pages: CataloguePage[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  shareBase: string;
}) {
  const t = useTranslations("catalogue");
  const h = useTranslations("home");
  const openContact = useContact();
  const dialog = useRef<HTMLDialogElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [fullOn, setFullOn] = useState<string | null>(null);
  const page = pages[index];
  const full = fullOn === page?.id;
  const total = pages.length;
  const next = index < total - 1;
  const prev = index > 0;
  const go = (step: number) => {
    const wanted = index + step;
    if (wanted >= 0 && wanted < total) onIndex(wanted);
  };

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    let release = () => {};
    const open = () => {
      if (el.open) return;
      release = lockPage();
      el.showModal();
    };
    // Native dialogs occupy the top layer, so a direct photo link waits for
    // the greeting to finish before taking over focus and the scroll lock.
    if (document.documentElement.dataset.greeting)
      window.addEventListener(GREETING_END_EVENT, open, { once: true });
    else open();
    return () => {
      window.removeEventListener(GREETING_END_EVENT, open);
      el.close();
      release();
    };
  }, []);

  if (!page) return null;
  const title = page.heading || page.chapterTitle;
  const about = page.chapterTitle + " — " + (page.heading || page.ref);
  return (
    <dialog
      ref={dialog}
      className="gallery-viewer"
      aria-labelledby="gallery-title"
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        containDialogTab(event);
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(-1);
        }
      }}
    >
      <button
        type="button"
        className="gallery-close"
        aria-label={t("close")}
        onClick={onClose}
        autoFocus
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m6 6 12 12M18 6 6 18"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>
      <div className="gallery-overview">
        <div className="gallery-topline">
          <span>{page.chapterTitle}</span>
          <span>
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(total).padStart(2, "0")}
          </span>
        </div>
        <div className="gallery-overview-photo" key={page.id}>
          <Image
            src={page.url}
            alt={page.alt}
            fill
            sizes="(max-width: 767px) 1px, 48vw"
            loading="eager"
          />
        </div>
        <div className="gallery-info">
          <div>
            <h2 id="gallery-title">{title}</h2>
            {page.caption && <p>{page.caption}</p>}
          </div>
          <button
            type="button"
            className="gallery-enquire"
            onClick={() => openContact({ about })}
          >
            {h("start")} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
      <div
        className="gallery-detail"
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
            go(dx < 0 ? 1 : -1);
        }}
      >
        <div
          className="gallery-track"
          style={{ transform: "translateX(-" + index * 100 + "%)" }}
        >
          {pages.map((p, i) => (
            <div
              className="gallery-slide"
              key={p.id}
              data-full={full && i === index}
              aria-hidden={i !== index}
            >
              {Math.abs(i - index) <= 1 && (
                <Image
                  src={p.url}
                  alt={i === index ? p.alt : ""}
                  fill
                  sizes="100vw"
                  loading="eager"
                />
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="gallery-view-toggle"
          aria-pressed={full}
          onClick={() => setFullOn(full ? null : page.id)}
        >
          <span className="gallery-desktop-label">
            {full ? h("viewerDetail") : h("viewerFull")}
          </span>
          <span className="gallery-mobile-label">
            {full ? h("viewerFull") : h("viewerDetail")}
          </span>
        </button>
        {next && (
          <button
            type="button"
            className="gallery-next-surface"
            aria-label={t("next")}
            onClick={() => go(1)}
            onPointerMove={(event) => {
              if (
                event.pointerType !== "mouse" ||
                matchMedia("(prefers-reduced-motion: reduce)").matches
              )
                return;
              const parent = event.currentTarget.parentElement!;
              const rect = parent.getBoundingClientRect();
              if (cursor.current)
                cursor.current.style.transform =
                  "translate(" +
                  (event.clientX - rect.left - 42) +
                  "px," +
                  (event.clientY - rect.top - 42) +
                  "px)";
              parent.dataset.cursor = "true";
            }}
            onPointerLeave={(event) => {
              event.currentTarget.parentElement!.dataset.cursor = "false";
            }}
          />
        )}
        <span ref={cursor} className="gallery-cursor" aria-hidden="true">
          {h("viewerNext")} ↗
        </span>
        <div className="gallery-controls">
          <button
            type="button"
            disabled={!prev}
            onClick={() => go(-1)}
            aria-label={t("prev")}
          >
            ←
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => go(1)}
            aria-label={t("next")}
          >
            →
          </button>
        </div>
      </div>
      <p className="gallery-live" aria-live="polite" aria-atomic="true">
        {h("viewerCount", { current: index + 1, total })}: {title}
      </p>
    </dialog>
  );
}
