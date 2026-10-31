"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

const banners = [
  { file: "kencho-commercial-reception", alt: "reception" },
  { file: "kencho-bedroom-interior", alt: "bedroom" },
  { file: "kencho-cane-cabinet", alt: "cabinet" },
  { file: "kencho-modern-oak-kitchen", alt: "kitchen" },
] as const;

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(change: () => void) {
  const query = matchMedia(motionQuery);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
}

export default function ContactBanners() {
  const t = useTranslations("request");
  const [slide, setSlide] = useState(0);
  const reduced = useSyncExternalStore(subscribeMotion, () => matchMedia(motionQuery).matches, () => true);
  const [playback, setPlaying] = useState<boolean | null>(null);
  const playing = playback ?? !reduced;
  const [hovering, setHovering] = useState(false);
  useEffect(() => {
    if (!playing || hovering || document.hidden) return;
    const timer = setInterval(() => { if (!document.hidden) setSlide(current => (current + 1) % banners.length); }, 6000);
    return () => clearInterval(timer);
  }, [playing, hovering]);
  const step = (direction: number) => { setPlaying(false); setSlide(current => (current + direction + banners.length) % banners.length); };
  return <section className="contact-banners" aria-label={t("banners")} aria-roledescription="carousel" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)} onFocusCapture={event => { if (!(event.target instanceof Element && event.target.closest("[data-banner-play]"))) setPlaying(false); }}>
    <div className="contact-banner-images" aria-live={playing ? "off" : "polite"}>
      {banners.map((banner, index) => <div key={banner.file} className={`contact-banner-slide ${index === slide ? "is-active" : ""}`} aria-hidden={index !== slide} role="group" aria-roledescription="slide" aria-label={`${index + 1} / ${banners.length}`}>
        <Image src={`/banners/${banner.file}.webp`} alt={t(`bannerAlt.${banner.alt}`)} width={1040} height={693} sizes="(max-width: 959px) 92vw, 46vw" preload={index === 0} />
      </div>)}
    </div>
    <div className="contact-banner-controls">
      <div className="contact-banner-dots">{banners.map((banner, index) => <button key={banner.file} type="button" aria-label={t("showBanner", { number: index + 1 })} aria-pressed={slide === index} onClick={() => { setPlaying(false); setSlide(index); }}><span /></button>)}</div>
      <div className="contact-banner-arrows">
        <button type="button" onClick={() => step(-1)} aria-label={t("previousBanner")}>←</button>
        <button type="button" data-banner-play onClick={() => setPlaying(!playing)} aria-label={playing ? t("pauseBanners") : t("playBanners")}>{playing ? "Ⅱ" : "▷"}</button>
        <button type="button" onClick={() => step(1)} aria-label={t("nextBanner")}>→</button>
      </div>
    </div>
  </section>;
}
