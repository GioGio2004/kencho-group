"use client";
import { useTranslations } from "next-intl";
import MegaMenu from "@/app/_components/MegaMenu";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/lib/site";
import { useMenu } from "@/app/_components/MenuProvider";
import { useEffect, useRef } from "react";

export default function SiteHeader() {
  const h = useTranslations("home");
  const t = useTranslations("menu");
  const n = useTranslations("nav");
  const { open, setOpen } = useMenu();
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const mobile = matchMedia("(max-width: 767px)");
    let lastY = window.scrollY;
    let travel = 0;
    let direction = 0;
    let frame = 0;
    const reveal = () => headerRef.current?.setAttribute("data-mobile-hidden", "false");
    const update = () => {
      frame = 0;
      const header = headerRef.current;
      if (!header) return;
      // Clamp elastic overscroll so bouncing at either end cannot reverse direction.
      const y = Math.max(0, Math.min(window.scrollY, document.documentElement.scrollHeight - innerHeight));
      const delta = y - lastY;
      const nextDirection = Math.sign(delta);
      if (nextDirection && nextDirection !== direction) travel = 0;
      travel += Math.abs(delta);
      if (nextDirection) direction = nextDirection;
      lastY = y;
      header.setAttribute("data-scrolled", String(y > 8));
      header.setAttribute("data-compact", String(y > 56));
      const keyboardFocus = header.contains(document.activeElement) && document.activeElement?.matches(":focus-visible");
      if (!mobile.matches || open || keyboardFocus || y <= 12) reveal();
      else if (direction < 0 && travel >= 4) reveal();
      else if (direction > 0 && travel >= 10 && y > 56) header.setAttribute("data-mobile-hidden", "true");
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const reset = () => { lastY = window.scrollY; travel = 0; direction = 0; reveal(); schedule(); };
    const header = headerRef.current;
    reveal();
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", reset, { passive: true });
    header?.addEventListener("focusin", reveal);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", reset);
      header?.removeEventListener("focusin", reveal);
    };
  }, [open]);
  return (
    <>
      <a href="#main-content" className="skip-link">
        {h("skip")}
      </a>
      <header ref={headerRef} className="site-header reference-header">
        <Link href="/" className="editorial-wordmark" aria-label={SITE.name}>
          <span>KENCHO</span>
          <span className="editorial-wordmark-sub">GROUP</span>
        </Link>
        <div className="header-actions">
          <Link
            href="/gallery"
            data-header-catalogue
            className="header-catalogue-cta"
          >
            <span className="header-catalogue-label">{n("catalogue")}</span>
            <span className="header-catalogue-badge" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M5 15 15 5M5 5h10v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
          <button
            id="site-menu-trigger"
            type="button"
            aria-expanded={open}
            aria-controls="mega-menu"
            onClick={() => setOpen(!open)}
            onKeyDown={(event) => {
              if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                event.preventDefault();
                setOpen(true);
                const last = event.key === "ArrowUp";
                requestAnimationFrame(() => {
                  const links = document.querySelectorAll<HTMLAnchorElement>("#mega-menu .mega-menu-link");
                  links[last ? links.length - 1 : 0]?.focus();
                });
              }
            }}
            className="site-menu-trigger"
          >
            <span className="menu-trigger-label">{open ? t("close") : t("menu")}</span>
            <span className="menu-trigger-dots" aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
          <MegaMenu />
        </div>
      </header>
    </>
  );
}
