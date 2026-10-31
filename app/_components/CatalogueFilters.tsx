"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { MaterialTag } from "@/lib/catalogue";

export type FilterCategory = { href: string; label: string; count: number; active: boolean };

const COPY = {
  en: { filter: "Filter", categories: "Category", materials: "Materials & finishes", layout: "Layout", reset: "Reset", close: "Close filters", show: (n: number) => `Show ${n} photos`, columns: (n: number) => `${n} columns` },
  ka: { filter: "ფილტრი", categories: "კატეგორია", materials: "მასალები და ზედაპირები", layout: "განლაგება", reset: "გასუფთავება", close: "ფილტრის დახურვა", show: (n: number) => `${n} ფოტოს ჩვენება`, columns: (n: number) => `${n} სვეტი` },
  ru: { filter: "Фильтр", categories: "Категория", materials: "Материалы и отделка", layout: "Раскладка", reset: "Сбросить", close: "Закрыть фильтры", show: (n: number) => `Показать ${n} фото`, columns: (n: number) => `${n} колонки` },
} as const;

export default function CatalogueFilters({ locale, categories, tags, activeTag, columns, allMaterials, total, results, onTag, onColumns }: {
  locale: Locale;
  categories: FilterCategory[];
  tags: { tag: MaterialTag; label: string; count: number }[];
  activeTag: MaterialTag | null;
  columns: 3 | 4;
  allMaterials: string;
  total: number;
  results: number;
  onTag: (tag: MaterialTag | null) => void;
  onColumns: (columns: 3 | 4) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const copy = COPY[locale];
  const router = useRouter();
  const selectedCount = Number(Boolean(activeTag)) + Number(categories.some(category => category.active && category.href !== "/gallery"));

  useEffect(() => {
    if (!open) return;
    const place = () => {
      if (!trigger.current || !panel.current) return;
      const rect = trigger.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) { setOpen(false); return; }
      const below = innerHeight - rect.bottom - 26;
      const above = rect.top - 26;
      const useBelow = below >= 320 || below >= above;
      const popup = panel.current;
      popup.style.left = `${Math.max(16, Math.min(rect.right - popup.offsetWidth, innerWidth - popup.offsetWidth - 16))}px`;
      popup.style.top = useBelow ? `${rect.bottom + 10}px` : "auto";
      popup.style.bottom = useBelow ? "auto" : `${innerHeight - rect.top + 10}px`;
      popup.style.maxHeight = `${Math.max(180, useBelow ? below : above)}px`;
      popup.style.visibility = "visible";
    };
    place();
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    const outside = (event: PointerEvent | FocusEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target) && !panel.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", place, { passive: true });
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [open]);

  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  return <div className="gallery-filter-bar">
    <div ref={root} className="gallery-filter-root" data-gallery-filter-sound>
      <button ref={trigger} type="button" className="gallery-filter-trigger" aria-expanded={open} aria-controls={id} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        <SlidersHorizontal size={16} strokeWidth={1.7} aria-hidden="true" />
        <span>{copy.filter}</span>
        {selectedCount > 0 && <span className="gallery-filter-badge">{selectedCount}</span>}
      </button>
      {open && createPortal(<div ref={panel} id={id} className="gallery-filter-popup" role="dialog" aria-labelledby={`${id}-title`} data-lenis-prevent data-gallery-filter-sound>
        <div className="gallery-filter-heading"><h2 id={`${id}-title`}>{copy.filter}</h2><button type="button" onClick={close} aria-label={copy.close}><X size={18} aria-hidden="true" /></button></div>
        <div className="gallery-filter-sections">
          <section>
            <label htmlFor={`${id}-categories`}>{copy.categories}</label>
            <select id={`${id}-categories`} className="gallery-filter-category" value={categories.find(category => category.active)?.href ?? "/gallery"} onChange={event => { setOpen(false); router.push(event.target.value, { scroll: false }); }}>
              {categories.map(category => <option key={category.href} value={category.href}>{category.label} ({category.count})</option>)}
            </select>
          </section>
          {tags.length > 0 && <section>
            <label htmlFor={`${id}-materials`}>{copy.materials}</label>
            <select id={`${id}-materials`} className="gallery-filter-material" value={activeTag ?? ""} onChange={event => onTag(event.target.value ? event.target.value as MaterialTag : null)}>
              <option value="">{allMaterials} ({total})</option>
              {tags.map(item => <option key={item.tag} value={item.tag}>{item.label} ({item.count})</option>)}
            </select>
          </section>}
          <section className="gallery-filter-layout" aria-labelledby={`${id}-layout`}><h3 id={`${id}-layout`}>{copy.layout}</h3><div role="group" aria-label={copy.layout}>
            {([3, 4] as const).map(value => <button key={value} type="button" aria-pressed={columns === value} onClick={() => onColumns(value)}>{copy.columns(value)}</button>)}
          </div></section>
        </div>
        <div className="gallery-filter-footer">
          <Link href="/gallery" scroll={false} onClick={() => { onTag(null); onColumns(4); setOpen(false); }}>{copy.reset}</Link>
          <button type="button" onClick={close} className="gallery-filter-apply">{copy.show(results)}</button>
        </div>
      </div>, document.body)}
    </div>
  </div>;
}
