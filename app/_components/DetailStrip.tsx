"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { IMAGES, src } from "@/lib/images";
const photos = [
  IMAGES.heroBronze,
  IMAGES.heroBlack,
  IMAGES.heroCane,
  IMAGES.heroOak,
  IMAGES.heroGreen,
  IMAGES.heroWalnut,
  IMAGES.heroMain,
];
export default function DetailStrip({ alts }: { alts: string[] }) {
  const t = useTranslations("home");
  const [active, setActive] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const row = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  const expanded = active ?? hovered;
  return (
    <div className="detail-strip-wrap" ref={wrap}>
      <div
        className="detail-strip"
        ref={row}
        onPointerLeave={() => setHovered(null)}
      >
        {photos.map((photo, i) => (
          <button
            key={photo.file}
            type="button"
            className="detail-photo"
            data-active={expanded === i}
            aria-pressed={active === i}
            aria-label={
              (active === i ? t("collapse") : t("expand")) + ": " + alts[i]
            }
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setHovered(i);
            }}
            onPointerMove={(event) => {
              if (
                event.pointerType !== "mouse" ||
                matchMedia("(prefers-reduced-motion: reduce)").matches
              )
                return;
              if (!wrap.current || !cursor.current) return;
              const rect = wrap.current.getBoundingClientRect();
              cursor.current.style.transform = `translate(${event.clientX - rect.left - 36}px, ${event.clientY - rect.top - 36}px)`;
              wrap.current.dataset.cursor = "true";
            }}
            onPointerLeave={() => {
              if (wrap.current) wrap.current.dataset.cursor = "false";
            }}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            onClick={(e) => {
              const next = active === i ? null : i;
              setActive(next);
              setHovered(next === null ? null : i);
              if (matchMedia("(max-width: 767px)").matches)
                e.currentTarget.scrollIntoView({
                  behavior: matchMedia("(prefers-reduced-motion: reduce)")
                    .matches
                    ? "instant"
                    : "smooth",
                  block: "nearest",
                  inline: "center",
                });
            }}
          >
            <span className="detail-photo-inner">
              <Image
                src={src(photo)}
                alt={alts[i]}
                fill
                sizes="(max-width: 767px) 240px, 300px"
                className="object-cover"
              />
              <span className="detail-photo-plus" aria-hidden="true">
                {expanded === i ? "−" : "+"}
              </span>
            </span>
          </button>
        ))}
      </div>
      <span className="detail-cursor" ref={cursor} aria-hidden="true">
        {active !== null && active === hovered ? t("detailClose") : t("detailOpen")}
      </span>
      <p className="detail-hint">{t("detailHint")}</p>
    </div>
  );
}
