"use client";
import { useTranslations } from "next-intl";
import LocaleSwitch from "@/app/_components/LocaleSwitch";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/lib/site";
import { useMenu } from "@/app/_components/MenuProvider";

export default function SiteHeader() {
  const h = useTranslations("home");
  const t = useTranslations("menu");
  const n = useTranslations("nav");
  const { open, setOpen } = useMenu();
  return (
    <>
      <a href="#main-content" className="skip-link">
        {h("skip")}
      </a>
      <header className="site-header">
        <Link href="/" className="editorial-wordmark" aria-label={SITE.name}>
          {SITE.wordmark} {SITE.wordmarkSub}
        </Link>
        <div className="header-actions">
          <Link
            href="/gallery"
            data-header-catalogue
            className="header-catalogue-cta"
          >
            <span>{n("catalogue")}</span>
            <span aria-hidden="true">↗</span>
          </Link>
          <LocaleSwitch className="header-languages" />
          <button
            id="site-menu-trigger"
            type="button"
            aria-expanded={open}
            aria-controls="mega-menu"
            aria-haspopup="dialog"
            onClick={() => setOpen(!open)}
            className="site-menu-trigger rounded-full bg-white/[0.05] hover:bg-white/[0.10] backdrop-blur-xl border border-white/15 px-5 py-2 text-xs uppercase tracking-[0.18em] flex items-center gap-3 cursor-pointer"
          >
            {t("menu")} <span aria-hidden="true">•</span>
          </button>
        </div>
      </header>
    </>
  );
}
