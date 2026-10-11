"use client";
import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
// Content is visible in the server HTML. Animate only as a progressive enhancement.
export default function HomeMotion() {
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const animations = new Set<Animation>();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            observer.unobserve(entry.target);
            const animation = entry.target.animate(
              [
                { opacity: 0.45, transform: "translateY(24px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 800, easing: "cubic-bezier(.22,1,.36,1)" },
            );
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
          }
        },
        { threshold: 0.12 },
      );
      document
        .querySelectorAll(".home [data-reveal]")
        .forEach((el) => observer.observe(el));
      const picture = document.querySelector(".home .hero-picture-frame img");
      if (picture) {
        gsap.set(picture, { animation: "none" });
        gsap.fromTo(picture, { yPercent: -3, scale: 1.08 }, {
          yPercent: 3, ease: "none",
          scrollTrigger: { trigger: ".home-hero", start: "top bottom", end: "bottom top", scrub: .7 },
        });
      }
      gsap.fromTo(".home .process-track > span", { scaleX: 0 }, {
        scaleX: 1, ease: "none",
        scrollTrigger: { trigger: ".home-approach", start: "top 70%", end: "bottom 50%", scrub: .6 },
      });
      return () => {
        observer.disconnect();
        animations.forEach((a) => a.cancel());
      };
    });
    return () => media.revert();
  }, []);
  return null;
}
