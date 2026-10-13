"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "@/i18n/navigation";
import WorkLink from "@/app/_components/WorkLink";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const films = {
  walkthrough: {
    desktop: "/video/interior-walkthrough.mp4",
    mobile: "/video/interior-walkthrough-mobile.mp4",
    poster: "/video/interior-walkthrough-poster.jpg",
    mobilePoster: "/video/interior-walkthrough-poster-mobile.jpg",
  },
  people: {
    desktop: "/video/hero-owner.mp4",
    mobile: "/video/hero-owner-mobile.mp4",
    poster: "/video/hero-owner-poster.jpg",
    mobilePoster: "/video/hero-owner-poster-mobile.jpg",
  },
};

/** Local footage, with a poster and native controls before hydration. */
export default function HomeFilm({ variant }: { variant: keyof typeof films }) {
  const t = useTranslations("home");
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const manuallyPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [supportsFullscreen, setSupportsFullscreen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const film = films[variant];
  const heading = variant === "walkthrough" ? "film-heading" : "workshop-heading";

  useEffect(() => {
    const root = section.current;
    const screen = stage.current;
    const player = video.current;
    if (!root || !screen || !player) return;
    root.dataset.enhanced = "true";
    player.controls = false;
    setSupportsFullscreen(Boolean(document.fullscreenEnabled && root.requestFullscreen));
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const phone = matchMedia("(max-width: 767px)");
    let visible = false;
    let loaded = false;
    let disposed = false;

    const updatePlayback = () => {
      if (!visible || document.hidden || motion.matches || manuallyPaused.current) {
        player.pause();
      } else {
        // Autoplay can be declined by the browser; the play control remains available.
        void player.play().then(() => {
          if (disposed || !visible || document.hidden || motion.matches || manuallyPaused.current)
            player.pause();
        }).catch(() => {});
      }
    };
    const selectSource = () => {
      const next = phone.matches ? film.mobile : film.desktop;
      player.poster = phone.matches ? film.mobilePoster : film.poster;
      if (loaded && !player.currentSrc.endsWith(next)) {
        player.src = next;
        player.load();
        updatePlayback();
      }
    };
    selectSource();
    const preload = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      loaded = true;
      player.src = phone.matches ? film.mobile : film.desktop;
      player.load();
      updatePlayback();
      preload.disconnect();
    }, { rootMargin: "500px 0px" });
    preload.observe(screen);
    const playback = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
      updatePlayback();
    }, { threshold: [0, 0.2] });
    playback.observe(screen);
    // Only change the header when the film reaches the area behind it.
    const header = new IntersectionObserver(([entry]) => {
      root.dataset.inView = String(entry.isIntersecting);
    }, { rootMargin: "0px 0px -90% 0px" });
    header.observe(screen);
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === root);
    const resumeWhenReady = () => {
      if (visible && !motion.matches && !manuallyPaused.current) updatePlayback();
    };
    player.addEventListener("canplay", resumeWhenReady);
    document.addEventListener("visibilitychange", updatePlayback);
    document.addEventListener("fullscreenchange", updateFullscreen);
    motion.addEventListener("change", updatePlayback);
    phone.addEventListener("change", selectSource);

    return () => {
      disposed = true;
      preload.disconnect();
      playback.disconnect();
      header.disconnect();
      player.pause();
      player.controls = true;
      player.removeEventListener("canplay", resumeWhenReady);
      delete root.dataset.enhanced;
      document.removeEventListener("visibilitychange", updatePlayback);
      document.removeEventListener("fullscreenchange", updateFullscreen);
      motion.removeEventListener("change", updatePlayback);
      phone.removeEventListener("change", selectSource);
    };
  }, [film]);

  useGSAP(() => {
    if (variant !== "walkthrough" || !section.current) return;
    const root = section.current;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      root.dataset.motion = "true";
      gsap.fromTo(".film-frame", { clipPath: "inset(5% 4% 5% 4%)" }, {
        clipPath: "inset(0% 0% 0% 0%)", ease: "none",
        scrollTrigger: { trigger: root, start: "top 85%", end: "top top", scrub: 0.6 },
      });
      gsap.to(".film-copy", { y: -35, ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: 0.7 },
      });
      ScrollTrigger.refresh();
      return () => { delete root.dataset.motion; };
    });
    return () => media.revert();
  }, { scope: section });

  function togglePlayback() {
    const player = video.current;
    if (!player) return;
    if (player.paused) {
      manuallyPaused.current = false;
      void player.play().catch(() => {});
    } else {
      manuallyPaused.current = true;
      player.pause();
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === section.current) await document.exitFullscreen();
      else await section.current?.requestFullscreen();
    } catch { /* A browser may decline; the viewport-sized film still works. */ }
  }

  return (
    <section ref={section} id={variant === "walkthrough" ? "interior-film" : "people"}
      className="home-film" data-variant={variant} data-unavailable={unavailable || undefined}
      aria-labelledby={heading}>
      <div className="film-stage" ref={stage}>
        <div className="film-frame">
          {/* A photograph under the film: the frame is never empty while the
              video loads, if autoplay is declined, or if the file fails. */}
          <Image className="film-still" src={film.poster} alt={t(variant === "walkthrough" ? "film.description" : "ownerAlt")}
            fill sizes="100vw" />
          <video ref={video} id={variant + "-video"} className="film-video" controls muted loop playsInline
            preload="none" poster={film.poster} aria-label={t(variant === "walkthrough" ? "film.description" : "ownerAlt")}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onError={() => setUnavailable(true)}
            onCanPlay={() => setUnavailable(false)}
            onTimeUpdate={() => {
              const player = video.current;
              if (player && progress.current && Number.isFinite(player.duration) && player.duration > 0)
                progress.current.style.transform = `scaleX(${player.currentTime / player.duration})`;
            }}>
            <source src={film.mobile} type="video/mp4" media="(max-width: 767px)" />
            <source src={film.desktop} type="video/mp4" />
            {t("film.fallback")}
          </video>
          <div className="film-shade" aria-hidden="true" />
        </div>
        <div className="film-topline">
          <p>{t(variant === "walkthrough" ? "film.label" : "workshopLabel")}</p>
          <span aria-hidden="true">KENCHO / {variant === "walkthrough" ? "01" : "02"}</span>
        </div>
        <div className="film-copy">
          <h2 id={heading}>{t(variant === "walkthrough" ? "film.title" : "workshopTitle")}</h2>
          <p>{t(variant === "walkthrough" ? "film.intro" : "workshopIntro")}</p>
          {variant === "people" && <Link href="/about" className="home-text-link">
            {t("workshopLink")} <span aria-hidden="true">↗</span>
          </Link>}
        </div>
        <div className="film-footer">
          <div className="film-controls">
            <button type="button" className="film-play" onClick={togglePlayback}
              disabled={unavailable} aria-controls={variant + "-video"}
              aria-label={t(unavailable ? "film.unavailable" : playing ? "film.pause" : "film.play")}>
              <span className={playing ? "film-pause-icon" : "film-play-icon"} aria-hidden="true" />
              <span>{t(unavailable ? "film.unavailable" : playing ? "film.pause" : "film.play")}</span>
            </button>
            {supportsFullscreen && <button type="button" className="film-fullscreen" onClick={toggleFullscreen}
              aria-label={t(fullscreen ? "film.exitFullscreen" : "film.fullscreen")}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
              </svg>
            </button>}
          </div>
          {variant === "walkthrough" && <WorkLink href="/gallery" className="film-gallery">
            {t("allWork")} <span aria-hidden="true">↗</span>
          </WorkLink>}
        </div>
        <div className="film-progress" aria-hidden="true"><span ref={progress} /></div>
      </div>
    </section>
  );
}
