"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, CustomEase);

/*
 * All hero choreography lives here (the Hero component stays a server
 * component). Owns: the entrance (SplitText char reveal + fades), timed
 * to the intro's curtain via the kg:intro-lift event; magnetic CTAs;
 * the scroll-velocity marquee; hide-on-scroll nav; and a gentle exit
 * scrub as the hero leaves the viewport. Everything is skipped under
 * prefers-reduced-motion.
 */
export default function HeroMotion() {
  useGSAP((_, contextSafe) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const kgEase =
      CustomEase.get("kgEase") ??
      CustomEase.create("kgEase", "M0,0 C0.77,0 0.175,1 1,1");

    const splits: SplitText[] = [];
    const cleanups: (() => void)[] = [];
    let wantPlay = false;
    let played = false;
    let entrance: gsap.core.Timeline | null = null;

    const fades = gsap.utils.toArray<HTMLElement>('[data-reveal="fade"]');

    // Robust against the intro's lift event arriving before fonts load:
    // play() before build() just records intent; build() honors it.
    const play = () => {
      wantPlay = true;
      if (played || !entrance) return;
      played = true;
      entrance.play();
    };

    const build = contextSafe!(() => {
      const lines = gsap.utils.toArray<HTMLElement>("[data-split]");
      const chars: Element[] = [];
      lines.forEach((line) => {
        const split = new SplitText(line, {
          type: "lines,chars",
          mask: "lines",
          linesClass: "kg-split-line",
        });
        splits.push(split);
        chars.push(...split.chars);
      });

      gsap.set(fades, { y: 24, opacity: 0 });

      entrance = gsap
        .timeline({ paused: true })
        .from(
          chars,
          {
            yPercent: 120,
            duration: 1.05,
            ease: kgEase,
            stagger: 0.022,
          },
          0,
        )
        .to(
          fades,
          {
            y: 0,
            opacity: 1,
            duration: 0.95,
            ease: "power3.out",
            stagger: 0.07,
          },
          0.25,
        );

      // No intro this session → play immediately; otherwise wait for the
      // curtain (kg:intro-lift fires as the wipe starts; +0.45s handoff).
      if (
        wantPlay ||
        !document.documentElement.classList.contains("intro-pending")
      ) {
        play();
      }
    });

    const onLift = () => gsap.delayedCall(0.45, play);
    const onDone = () => play();
    window.addEventListener("kg:intro-lift", onLift);
    window.addEventListener("kg:intro-done", onDone);
    cleanups.push(() => {
      window.removeEventListener("kg:intro-lift", onLift);
      window.removeEventListener("kg:intro-done", onDone);
    });

    // SplitText needs final metrics — wait for the webfonts.
    document.fonts.ready.then(() => build());

    // Magnetic CTAs.
    gsap.utils.toArray<HTMLElement>("[data-magnetic]").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
      };
      const onLeave = () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" });
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      });
    });

    // Scroll-velocity marquee: flips with scroll direction, surges with
    // speed, and eases back to a slow drift.
    const track = document.querySelector<HTMLElement>(".kg-marquee-track");
    if (track) {
      const loop = gsap.to(track, {
        xPercent: -50,
        duration: 24,
        ease: "none",
        repeat: -1,
      });
      const speed = { v: 1 };
      ScrollTrigger.create({
        onUpdate: (self) => {
          const dir = self.direction || 1;
          const surge = Math.min(Math.abs(self.getVelocity()) / 350, 5);
          gsap.to(speed, {
            v: dir * (1 + surge),
            duration: 0.4,
            ease: "power2.out",
            overwrite: true,
            onUpdate: () => loop.timeScale(speed.v),
          });
          gsap.to(speed, {
            v: dir,
            duration: 1.2,
            delay: 0.4,
            ease: "power2.out",
            overwrite: false,
            onUpdate: () => loop.timeScale(speed.v),
          });
        },
      });
    }

    // Nav retreats on scroll down, returns on scroll up; gains a frosted
    // backdrop once the page is scrolled.
    const header = document.querySelector<HTMLElement>("[data-site-nav]");
    if (header) {
      const hide = gsap
        .to(header, {
          yPercent: -130,
          duration: 0.45,
          ease: "power3.inOut",
          paused: true,
        })
        .progress(0);
      ScrollTrigger.create({
        start: "top top-=120",
        end: "max",
        onUpdate: (self) => {
          if (self.direction === 1) hide.play();
          else hide.reverse();
          header.toggleAttribute("data-scrolled", self.scroll() > 80);
        },
        onLeaveBack: () => header.removeAttribute("data-scrolled"),
      });
    }

    // Gentle exit: hero content drifts up and dims as the section leaves.
    const heroInner = document.querySelector<HTMLElement>("[data-hero-inner]");
    if (heroInner) {
      gsap.to(heroInner, {
        yPercent: -12,
        opacity: 0.25,
        ease: "none",
        scrollTrigger: {
          trigger: "#top",
          start: "top top",
          end: "60% top",
          scrub: true,
        },
      });
    }

    return () => {
      cleanups.forEach((fn) => fn());
      splits.forEach((s) => s.revert());
    };
  });

  return null;
}
