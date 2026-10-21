"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import LocaleSwitch from "@/app/_components/LocaleSwitch";
import ContactLink from "@/app/_components/ContactLink";
import { useMenu } from "@/app/_components/MenuProvider";
import { Link } from "@/i18n/navigation";
import { containDialogTab, lockPage } from "@/lib/modal-lock";
import { SITE } from "@/lib/site";
export default function MenuOverlay({
  chapters,
}: {
  chapters: { slug: string; title: string }[];
}) {
  const t = useTranslations("menu");
  const n = useTranslations("nav");
  const { open, setOpen } = useMenu();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (!open) {
      if (el.open) el.close();
      return;
    }
    const release = lockPage();
    el.showModal();
    return () => {
      if (el.open) el.close();
      release();
    };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <dialog
      ref={dialog}
      id="site-menu"
      className="nav-sheet"
      aria-label={t("menu")}
      data-lenis-prevent
      onKeyDown={containDialogTab}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="nav-sheet-bar">
        <span className="brand">
          <span>{SITE.wordmark}</span>
          <span>{SITE.wordmarkSub}</span>
        </span>
        <button
          type="button"
          className="nav-close"
          onClick={close}
          aria-label={t("close")}
          autoFocus
        >
          {t("close")} <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className="nav-sheet-body">
        <nav aria-label={t("focus")}>
          <p className="home-eyebrow">{t("focus")}</p>
          <ul className="nav-chapters">
            {chapters.map((c) => (
              <li key={c.slug}>
                <Link href={"/gallery/" + c.slug} onClick={close}>
                  {c.title}
                  <span aria-hidden="true">↗</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t("company")}>
          <p className="home-eyebrow">{t("explore")}</p>
          <ul className="nav-pages">
            {[
              { href: "/", label: n("home") },
              { href: "/gallery", label: n("catalogue") },
              { href: "/about", label: n("about") },
              { href: "/faq", label: n("faq") },
              { href: "/contact", label: n("contact") },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <ContactLink method="phone" className="nav-phone">
            {SITE.phone}
          </ContactLink>
        </nav>
      </div>
      <div className="nav-sheet-bottom">
        <p>
          {SITE.name} · {SITE.location}
        </p>
        <LocaleSwitch light />
      </div>
    </dialog>
  );
}
