"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useMenu } from "@/app/_components/MenuProvider";
import LocaleSwitch from "@/app/_components/LocaleSwitch";
import ThemeToggle from "@/app/_components/ThemeToggle";

// A disclosure anchored to the header, so the page stays visible and scrollable.
export default function MegaMenu() {
  const t = useTranslations("menu");
  const nav = useTranslations("nav");
  const pathname = usePathname();
  const { open, setOpen } = useMenu();
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const links = [
    { href: "/", label: nav("home") },
    { href: "/about", label: nav("about") },
    { href: "/gallery", label: t("gallery") },
    { href: "/contact", label: nav("contact") },
  ] as const;

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (open) setOpen(false);
    if (navigatingHref) setNavigatingHref(null);
  }

  useEffect(() => {
    if (!open) return;
    const trigger = document.getElementById("site-menu-trigger");
    const inside = (target: EventTarget | null) => target instanceof Node &&
      (rootRef.current?.contains(target) || trigger?.contains(target));
    const dismiss = (event: PointerEvent | FocusEvent) => {
      if (!inside(event.target)) {
        setOpen(false);
        setNavigatingHref(null);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        setNavigatingHref(null);
        trigger?.focus({ preventScroll: true });
      }
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && inside(event.target)) {
        const items = Array.from(rootRef.current?.querySelectorAll<HTMLAnchorElement>(".mega-menu-link") ?? []);
        const index = items.indexOf(document.activeElement as HTMLAnchorElement);
        if (index < 0 && document.activeElement !== trigger) return;
        event.preventDefault();
        const next = index < 0 ? (event.key === "ArrowDown" ? 0 : items.length - 1) :
          (index + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const handleLinkClick = (href: string) => {
    const isCurrent = href === "/" ? pathname === "/" : pathname.startsWith(href);
    if (isCurrent) {
      setOpen(false);
      return;
    }
    setNavigatingHref(href);
    window.setTimeout(() => {
      setOpen(false);
      setNavigatingHref(null);
    }, 160);
  };

  return (
    <div
      ref={rootRef}
      id="mega-menu"
      className="mega-menu-root"
      data-open={open}
      data-navigating={Boolean(navigatingHref)}
      inert={!open}
      aria-hidden={!open}
      data-lenis-prevent
    >
      <div className="mega-menu-sheet">
        <nav aria-label={t("menu")}>
          <ul className="mega-menu-list">
            {links.map((link, index) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              const isTarget = navigatingHref === link.href;
              return (
                <li key={link.href} style={{ "--menu-index": index } as React.CSSProperties}>
                  <Link
                    href={link.href}
                    onClick={() => handleLinkClick(link.href)}
                    className="mega-menu-link"
                    aria-current={active ? "page" : undefined}
                    data-navigating-target={isTarget ? "true" : undefined}
                  >
                    <svg className="mega-menu-arrow" aria-hidden="true" viewBox="0 0 32 24" fill="none">
                      <path d="M2 12h27M21 4l8 8-8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="mega-menu-label">
                      {link.href === "/gallery" ? <>
                        <span className="menu-gallery-label">{link.label}</span>
                        <span className="menu-catalogue-label">{nav("catalogue")}</span>
                      </> : link.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mega-menu-utilities">
          <LocaleSwitch />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
