"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import {
  AUDIO_SRC,
  DURATION_SECONDS,
  GUIDE_TIMESTAMPS,
  SESSION_KEY_DISMISSED,
} from "@/lib/audio-guide";
import { DUR, EASE, prefersReducedMotion } from "@/lib/motion";

/*
 * Audio guide — a small glass pill pinned bottom-LEFT (StickyWhatsApp owns
 * bottom-right). Collapsed it is a single "listen" button; the first tap
 * expands it and starts playback in the same user gesture, which is what
 * unlocks audio on iOS. The <audio> element is created lazily inside that
 * tap, so the site pays zero network cost for visitors who never press play.
 *
 * The SSR HTML ships the pill visible (it sits behind the intro overlay);
 * JS alone hides it and choreographs the reveal on "alma:loaded". A session
 * dismissal (the ×) is honoured from JS too — gsap.set display:none — so
 * server and client first-render markup stay identical.
 *
 * The section label follows GUIDE_TIMESTAMPS as narration plays. It is a
 * label ONLY — it must never scroll the page.
 */

type SectionId = (typeof GUIDE_TIMESTAMPS)[number]["sectionId"];

/** 75 → "1:15". Display-only, floors sub-second noise. */
function formatTime(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(whole / 60);
  const seconds = String(whole % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 12 14"
      fill="currentColor"
      className={className}
    >
      <path d="M1 .8 11.4 7 1 13.2Z" />
    </svg>
  );
}

function IconPause({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 12 14"
      fill="currentColor"
      className={className}
    >
      <rect x="1.6" y="1" width="3.1" height="12" rx="1" />
      <rect x="7.3" y="1" width="3.1" height="12" rx="1" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      className={className}
    >
      <path d="M1 1l8 8M9 1L1 9" />
    </svg>
  );
}

/* Static bar heights — the resting waveform, present without JS. */
const BAR_HEIGHTS = ["h-1.5", "h-3", "h-4", "h-2.5", "h-2"] as const;

export default function AudioGuide() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCleanupRef = useRef<(() => void) | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(DURATION_SECONDS);
  const [sectionId, setSectionId] = useState<SectionId>("hero");
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const t = useTranslations("audio");
  const locale = useLocale() as Locale;

  /* ------------------------------------------------------------------
   * Visibility: dismissed → display:none; otherwise hidden under the
   * intro and revealed on "alma:loaded" (motion users only).
   * ---------------------------------------------------------------- */
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      let dismissed = false;
      try {
        dismissed = sessionStorage.getItem(SESSION_KEY_DISMISSED) === "1";
      } catch {
        dismissed = false;
      }
      if (dismissed) {
        gsap.set(root, { display: "none" });
        return;
      }

      const mm = gsap.matchMedia();

      /* Reduced motion: no reveal tween — simply there. */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(root, { autoAlpha: 1, y: 0 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // SSR ships the pill visible; only JS ever hides it.
        gsap.set(root, { autoAlpha: 0, y: 12 });

        const reveal = () => {
          gsap.to(root, {
            autoAlpha: 1,
            y: 0,
            duration: DUR.base,
            ease: EASE.out,
            delay: 0.25,
          });
        };

        if (document.documentElement.classList.contains("is-loading")) {
          window.addEventListener("alma:loaded", reveal, { once: true });
        } else {
          reveal();
        }

        return () => window.removeEventListener("alma:loaded", reveal);
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  /* Quick settle when the pill re-renders into its expanded layout.
   * Targets the root, not the glass pill — .glass-interactive carries a
   * CSS transform transition that would fight a GSAP tween. */
  useGSAP(
    () => {
      if (!expanded) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(rootRef.current, {
          scale: 0.96,
          duration: DUR.fast,
          ease: EASE.out,
        });
      });
      return () => mm.revert();
    },
    { dependencies: [expanded], scope: rootRef },
  );

  /* Waveform: five bars breathing at offset phases, only while playing.
   * Reduced motion gets static bars — the audio itself still works. */
  useGSAP(
    () => {
      if (!expanded) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const wrap = barsRef.current;
        if (!wrap) return;
        const bars = Array.from(wrap.children);

        const tl = gsap.timeline({ paused: !playing });
        bars.forEach((bar, i) => {
          tl.to(
            bar,
            {
              scaleY: () => gsap.utils.random(0.35, 1),
              duration: 0.45,
              repeat: -1,
              yoyo: true,
              repeatRefresh: true,
              ease: "power1.inOut",
            },
            i * 0.09,
          );
        });

        return () => {
          tl.kill();
          gsap.set(bars, { scaleY: 1 });
        };
      });
      return () => mm.revert();
    },
    { dependencies: [expanded, playing], scope: rootRef },
  );

  /* ------------------------------------------------------------------
   * Audio engine — one element, created inside the first tap (iOS).
   * ---------------------------------------------------------------- */
  const ensureAudio = (): HTMLAudioElement => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio(AUDIO_SRC[locale]);
    audio.preload = "auto";

    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onTime = () => {
      // ~4Hz: write through refs, zero re-renders for the clock.
      if (elapsedRef.current) {
        elapsedRef.current.textContent = formatTime(audio.currentTime);
      }
      let id: SectionId = "hero";
      for (const stamp of GUIDE_TIMESTAMPS) {
        if (audio.currentTime >= stamp.time) id = stamp.sectionId;
      }
      setSectionId(id); // bails out when unchanged
    };
    const onEnded = () => {
      audio.currentTime = 0;
      setPlaying(false);
      setExpanded(false);
      setSectionId("hero");
    };

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);

    audioCleanupRef.current = () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      gsap.killTweensOf(audio);
      audio.pause();
      audio.removeAttribute("src");
    };

    audioRef.current = audio;
    return audio;
  };

  const startPlayback = (audio: HTMLAudioElement) => {
    gsap.killTweensOf(audio);
    audio.volume = 0;
    void audio.play().catch(() => {
      /* autoplay policy or missing file — the UI simply stays paused */
    });
    gsap.to(audio, { volume: 1, duration: 0.3, ease: EASE.none });
    setPlaying(true);
  };

  const handleOpenTap = () => {
    const audio = ensureAudio();
    setExpanded(true);
    startPlayback(audio);
  };

  const handlePlayPause = () => {
    const audio = ensureAudio();
    if (playing) {
      gsap.killTweensOf(audio);
      audio.pause();
      setPlaying(false);
    } else {
      startPlayback(audio);
    }
  };

  const handleClose = () => {
    const audio = audioRef.current;
    if (audio) {
      gsap.killTweensOf(audio);
      audio.pause();
    }
    setPlaying(false);
    setTranscriptOpen(false);
    try {
      sessionStorage.setItem(SESSION_KEY_DISMISSED, "1");
    } catch {
      /* private mode — the pill just returns on the next visit */
    }

    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion()) {
      gsap.set(root, { autoAlpha: 0, display: "none" });
    } else {
      gsap.to(root, {
        autoAlpha: 0,
        y: 12,
        duration: DUR.fast,
        ease: EASE.soft,
        onComplete: () => gsap.set(root, { display: "none" }),
      });
    }
  };

  /* Tab hidden → pause (a background voice is hostile), UI kept in sync. */
  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (document.hidden && audio && !audio.paused) {
        gsap.killTweensOf(audio);
        audio.pause();
        setPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* Release the lazily created element and all its listeners on unmount. */
  useEffect(() => {
    return () => {
      audioCleanupRef.current?.();
    };
  }, []);

  /* Transcript modal: focus the close button, Escape closes, scroll lock. */
  useEffect(() => {
    if (!transcriptOpen) return;

    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    modalCloseRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTranscriptOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      html.style.overflow = prevOverflow;
    };
  }, [transcriptOpen]);

  return (
    <>
      <div
        ref={rootRef}
        role="region"
        aria-label={t("label")}
        className="fixed bottom-5 left-5 z-40"
      >
        {/* Inline radius: .glass is unlayered and would beat a utility. */}
        <div
          ref={pillRef}
          className="glass glass-interactive max-w-[72vw] sm:max-w-none"
          style={{ borderRadius: "9999px" }}
        >
          {expanded ? (
            <div className="flex flex-col gap-1.5 px-6 py-3.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePlayPause}
                  aria-label={playing ? t("pause") : t("play")}
                  className="u-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink"
                >
                  {playing ? (
                    <IconPause className="h-3 w-3" />
                  ) : (
                    <IconPlay className="ml-0.5 h-3 w-3" />
                  )}
                </button>

                {/* Decorative waveform — GSAP scales the bars while playing. */}
                <div
                  ref={barsRef}
                  aria-hidden="true"
                  className="flex h-4 shrink-0 items-center gap-[3px]"
                >
                  {BAR_HEIGHTS.map((height, i) => (
                    <span
                      key={i}
                      className={`${height} w-[2px] rounded-full bg-clay`}
                    />
                  ))}
                </div>

                <span className="text-xs whitespace-nowrap text-ink-70 tabular-nums">
                  <span ref={elapsedRef}>{formatTime(0)}</span>
                  <span aria-hidden="true"> / </span>
                  {formatTime(duration)}
                </span>

                <button
                  type="button"
                  onClick={handleClose}
                  aria-label={t("close")}
                  className="u-press ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-55 hover:text-ink"
                >
                  <IconClose className="h-2.5 w-2.5" />
                </button>
              </div>

              <div className="flex min-w-0 items-center justify-between gap-4">
                {/* Follows the narration — a label only, never scrolls. */}
                <span className="truncate text-[0.625rem] tracking-[0.14em] text-ink-55 uppercase">
                  {t(`sectionLabel.${sectionId}`)}
                </span>
                <button
                  type="button"
                  onClick={() => setTranscriptOpen(true)}
                  className="u-link shrink-0 text-[0.6875rem] text-ink-70"
                >
                  {t("transcriptLink")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOpenTap}
              aria-label={t("play")}
              className="u-press flex items-center gap-2.5 px-4 py-3 text-xs tracking-[0.14em] text-ink uppercase sm:px-5"
            >
              <IconPlay className="h-3 w-3 shrink-0 text-clay" />
              <span className="whitespace-nowrap">{t("label")}</span>
              {/* Duration only from ≥sm — the 390px pill stays icon + label. */}
              <span className="hidden text-ink-55 tabular-nums sm:inline">
                {formatTime(duration)}
              </span>
            </button>
          )}
        </div>

        {/* Full narration always in the DOM — crawlable, screen-readable. */}
        <div className="sr-only">{t("transcript")}</div>
      </div>

      {/* Transcript modal — mounted only while open; sibling of the pill so
          the pill's GSAP transform never becomes its containing block. */}
      {transcriptOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audio-guide-transcript-title"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-sand/95 p-5"
          onClick={(event) => {
            if (event.target === event.currentTarget) setTranscriptOpen(false);
          }}
        >
          <div
            data-lenis-prevent
            className="max-h-[80svh] w-full max-w-xl overflow-y-auto border border-line bg-shell p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="audio-guide-transcript-title"
                className="u-display text-2xl text-ink"
              >
                {t("transcriptTitle")}
              </h2>
              <button
                ref={modalCloseRef}
                type="button"
                onClick={() => setTranscriptOpen(false)}
                aria-label={t("close")}
                className="u-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink"
              >
                <IconClose className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-6 leading-relaxed text-ink-70">{t("transcript")}</p>
          </div>
        </div>
      )}
    </>
  );
}
