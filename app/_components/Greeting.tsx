"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useTranslations } from "next-intl";
import { SITE } from "@/lib/site";
import { lockPage } from "@/lib/modal-lock";
import { GREETING_END_EVENT, GREETING_REVEAL_EVENT, GREETING_SESSION_KEY } from "@/lib/greeting";

type GreetingWindow = Window & { __kenchoGreetingTimeout?: number };

/** A session greeting outside the page, never a permanent home-page section. */
export default function Greeting({ fontClass }: { fontClass: string }) {
  const t = useTranslations("home");
  const screen = useRef<HTMLDivElement>(null);
  const dismiss = useRef<() => void>(() => {});

  useEffect(() => {
    const root = document.documentElement;
    const overlay = screen.current;
    if (!overlay || !root.dataset.greeting) return;
    const content = document.querySelector<HTMLElement>("[data-site-content]");
    const previousInert = content?.inert ?? false;
    if (content) content.inert = true;
    const unlock = lockPage();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const timeouts = new Set<number>();
    let active = true;
    let revealing = false;
    let finished = false;
    let timeline: gsap.core.Timeline | undefined;
    root.dataset.greeting = "playing";
    overlay.focus({ preventScroll: true });
    try { sessionStorage.setItem(GREETING_SESSION_KEY, "seen"); } catch {}

    const later = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => { timeouts.delete(timer); callback(); }, delay);
      timeouts.add(timer);
      return timer;
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      const restoreFocus = overlay.contains(document.activeElement);
      delete root.dataset.greeting;
      if (content) content.inert = previousInert;
      unlock();
      clearTimeout((window as GreetingWindow).__kenchoGreetingTimeout);
      if (restoreFocus) document.querySelector<HTMLElement>("#main-content")?.focus({ preventScroll: true });
      window.dispatchEvent(new Event(GREETING_END_EVENT));
    };
    const reveal = (immediate = false) => {
      if (!active || revealing || finished) return;
      revealing = true;
      timeline?.kill();
      root.dataset.greeting = "leaving";
      window.dispatchEvent(new Event(GREETING_REVEAL_EVENT));
      if (immediate || motion.matches) finish();
      else later(finish, 700);
    };
    dismiss.current = () => reveal();
    const preferenceChanged = () => { if (motion.matches) reveal(true); };
    const finishFallback = () => {
      if (finished) return;
      revealing = true;
      timeline?.kill();
      finish();
    };
    window.addEventListener(GREETING_END_EVENT, finishFallback);
    motion.addEventListener("change", preferenceChanged);

    // Wait briefly for the real lettering; network delays can never trap the page.
    const context = gsap.context(() => {}, overlay);
    const start = () => {
      if (!active || revealing || finished) return;
      context.add(() => {
        timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
        timeline
          .fromTo(".greeting-rule", { scaleX: 0 }, { scaleX: 1, duration: .65 }, .05)
          .fromTo(".greeting-outline", { opacity: .22, y: 8 }, {
            opacity: .9, y: 0, duration: .7, stagger: .055,
          }, .12)
          .to(".greeting-fill", { clipPath: "inset(0% 0% 0% 0%)", duration: .75, stagger: .045 }, .43)
          .to(".greeting-outline", { opacity: 0, duration: .35, stagger: .04 }, .9)
          .fromTo(".greeting-group-letter", { opacity: .2, y: 6 }, {
            opacity: 1, y: 0, duration: .55, stagger: .06,
          }, 1.03)
          .fromTo(".greeting-footer", { opacity: .35, y: 4 }, { opacity: 1, y: 0, duration: .65 }, .6)
          .to(".greeting-rule", { opacity: .3, duration: .35 }, 1.25)
          .call(() => {
            const image = document.querySelector<HTMLImageElement>(".home-arrival img, #main-content img");
            const ready = image?.decode().catch(() => {}) ?? Promise.resolve();
            Promise.race([ready, new Promise<void>(resolve => later(resolve, 350))])
              .then(() => reveal());
          }, [], 1.75);
      });
    };
    Promise.race([document.fonts.ready, new Promise<void>(resolve => later(resolve, 500))]).then(start);
    if (motion.matches) reveal(true);

    return () => {
      active = false;
      timeline?.kill();
      context.revert();
      timeouts.forEach(clearTimeout);
      motion.removeEventListener("change", preferenceChanged);
      window.removeEventListener(GREETING_END_EVENT, finishFallback);
      if (content) content.inert = previousInert;
      unlock();
      // React's development effect replay must not consume the greeting.
      if (!finished && root.dataset.greeting) root.dataset.greeting = "pending";
      dismiss.current = () => {};
    };
  }, []);

  return (
    <div ref={screen} className={`greeting-screen ${fontClass}`} role="dialog"
      aria-modal="true" aria-label={t("greeting.welcome")} tabIndex={-1}
      onKeyDown={event => {
        if (event.key === "Escape") dismiss.current();
        if (event.key === "Tab") {
          event.preventDefault();
          screen.current?.querySelector<HTMLButtonElement>("button")?.focus();
        }
      }}>
      <div className="greeting-brand" aria-hidden="true">
        <div className="greeting-wordmark">
          {SITE.wordmark.split("").map((letter, i) => (
            <span className="greeting-letter" key={i}>
              <span className="greeting-outline">{letter}</span>
              <span className="greeting-fill">{letter}</span>
            </span>
          ))}
        </div>
        <div className="greeting-rule" />
        <div className="greeting-group">
          {SITE.wordmarkSub.split("").map((letter, i) => (
            <span className="greeting-group-letter" key={i}>{letter}</span>
          ))}
        </div>
      </div>
      <div className="greeting-footer">
        <p>{t("arrival.eyebrow")}</p>
        <button type="button" onClick={() => dismiss.current()}>
          {t("greeting.skip")} <span aria-hidden="true">↗</span>
        </button>
      </div>
    </div>
  );
}
