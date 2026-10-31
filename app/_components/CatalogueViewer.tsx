"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useContact } from "@/app/_components/ContactProvider";
import type { Locale } from "@/i18n/routing";
import { containDialogTab, lockPage } from "@/lib/modal-lock";
import { GREETING_END_EVENT } from "@/lib/greeting";
import type { CataloguePage } from "@/lib/catalogue";

const VIEWER_SPECS: Record<
  Locale,
  {
    specLabel: string;
    timelineLabel: string;
    timelineValue: string;
    designLabel: string;
    designValue: string;
    coverageLabel: string;
    coverageValue: string;
    askAi: string;
    aiPromptPrefix: string;
  }
> = {
  ka: {
    specLabel: "მასალა და სპეციფიკაცია",
    timelineLabel: "დამზადების ვადა",
    timelineValue: "~6–8 კვირა (დაახლოებით 2 თვე)",
    designLabel: "3D დიზაინი და ახაზვა",
    designValue: "30 ₾ / მ² (წინხედით)",
    coverageLabel: "მიწოდება და მონტაჟი",
    coverageValue: "თბილისი და მთელი საქართველო",
    askAi: "ჰკითხეთ Kencho AI-ს",
    aiPromptPrefix: "მომწონს ეს ნამუშევარი კატალოგიდან: ",
  },
  ru: {
    specLabel: "Материалы и спецификация",
    timelineLabel: "Срок изготовления",
    timelineValue: "~6–8 недель (около 2 месяцев)",
    designLabel: "3D-дизайн и чертежи",
    designValue: "30 GEL / м² (по фасаду)",
    coverageLabel: "Доставка и монтаж",
    coverageValue: "Тбилиси и вся Грузия",
    askAi: "Спросить Kencho AI",
    aiPromptPrefix: "Мне нравится эта работа из каталога: ",
  },
  en: {
    specLabel: "Materials & Specification",
    timelineLabel: "Production Lead Time",
    timelineValue: "~6–8 weeks (approx. 2 months)",
    designLabel: "3D Design & Drawings",
    designValue: "30 GEL / m² (front elevation)",
    coverageLabel: "Delivery & Installation",
    coverageValue: "Tbilisi & all of Georgia",
    askAi: "Ask Kencho AI",
    aiPromptPrefix: "I'm interested in a piece like this from the catalogue: ",
  },
};

/**
 * OPERA GALLERY–INSPIRED VIEWING ROOM
 * A split museum-catalog viewing room: uncropped high-resolution stage
 * beside a curatorial specification dossier and direct enquiry actions.
 */
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
  const request = useTranslations("request");
  const rawLocale = useLocale();
  const locale: Locale =
    rawLocale === "ka" || rawLocale === "ru" ? rawLocale : "en";
  const spec = VIEWER_SPECS[locale];
  const openContact = useContact();
  const dialog = useRef<HTMLDialogElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [fullOn, setFullOn] = useState(true);
  const page = pages[index];
  const full = fullOn;
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
            sizes="(max-width: 767px) 1px, 42vw"
            loading="eager"
          />
        </div>

        <div className="gallery-info">
          <div className="gallery-dossier">
            <h2 id="gallery-title">{title}</h2>
            <dl className="gallery-spec-list">
              {page.caption && (
                <div className="gallery-spec-row">
                  <dt>{spec.specLabel}</dt>
                  <dd>{page.caption}</dd>
                </div>
              )}
              <div className="gallery-spec-row">
                <dt>{spec.timelineLabel}</dt>
                <dd>{spec.timelineValue}</dd>
              </div>
              <div className="gallery-spec-row">
                <dt>{spec.designLabel}</dt>
                <dd>{spec.designValue}</dd>
              </div>
              <div className="gallery-spec-row">
                <dt>{spec.coverageLabel}</dt>
                <dd>{spec.coverageValue}</dd>
              </div>
            </dl>
          </div>

          <div className="gallery-actions-row">
            <button
              type="button"
              className="gallery-enquire"
              onClick={() => openContact({ about })}
            >
              {request("cta")} <span aria-hidden="true">↗</span>
            </button>
            <button
              type="button"
              className="gallery-ai-btn"
              onClick={() => {
                onClose();
                window.dispatchEvent(
                  new CustomEvent("kencho:ai-open", {
                    detail: {
                      prompt: `${spec.aiPromptPrefix}${title} (${page.caption || page.chapterTitle})`,
                    },
                  }),
                );
              }}
            >
              {spec.askAi}
            </button>
          </div>
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
          onClick={() => setFullOn(!full)}
        >
          <span className="gallery-desktop-label">
            {full ? h("viewerDetail") : h("viewerFull")}
          </span>
          <span className="gallery-mobile-label">
            {full ? h("viewerDetail") : h("viewerFull")}
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
