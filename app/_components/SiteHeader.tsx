"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { NAV_LINKS, SITE } from "@/lib/site";

/*
 * Fixed minimal header: retreats on scroll down, returns on scroll up,
 * and picks up a frosted backdrop once the page has moved. The nav links
 * collapse on small screens — on a single-page site with three anchors a
 * burger menu is more chrome than it is worth, so mobile keeps only the
 * wordmark and the booking link.
 */
export default function SiteHeader() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const header = rootRef.current;
      if (!header) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const hide = gsap
          .to(header, {
            yPercent: -130,
            duration: 0.45,
            ease: "power3.inOut",
            paused: true,
          })
          .progress(0);

        const st = ScrollTrigger.create({
          start: "top top-=140",
          end: "max",
          onUpdate: (self) => {
            if (self.direction === 1) hide.play();
            else hide.reverse();
            header.toggleAttribute("data-scrolled", self.scroll() > 80);
          },
          onLeaveBack: () => {
            hide.reverse();
            header.removeAttribute("data-scrolled");
          },
        });

        return () => {
          st.kill();
          gsap.set(header, { clearProps: "transform" });
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <header
      ref={rootRef}
      data-site-header
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12"
    >
      <a
        href="#hero"
        className="u-display text-sm tracking-[0.42em] text-ink"
        aria-label={`${SITE.fullName} — back to top`}
      >
        {SITE.wordmark}
      </a>

      <nav aria-label="Primary" className="hidden items-center gap-9 sm:flex">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="u-link text-sm text-ink-70 transition-colors hover:text-ink"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <a
        href="#contact"
        className="u-press rounded-full border border-line-strong px-5 py-2.5 text-xs tracking-[0.14em] text-ink uppercase hover:border-clay hover:text-clay sm:text-sm sm:normal-case sm:tracking-normal"
      >
        Book a viewing
      </a>
    </header>
  );
}
