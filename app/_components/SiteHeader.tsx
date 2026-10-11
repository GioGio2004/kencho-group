"use client";
import { useTranslations } from "next-intl";
import ContactButton from "@/app/_components/ContactButton";
import LocaleSwitch from "@/app/_components/LocaleSwitch";
import { useMenu } from "@/app/_components/MenuProvider";
import { Link, usePathname } from "@/i18n/navigation";
import { SITE } from "@/lib/site";
export default function SiteHeader() {
  const h = useTranslations("home");
  const t = useTranslations("menu");
  const nav = useTranslations("nav");
  const { open, setOpen } = useMenu();
  const pathname = usePathname();
  return (
    <>
      <a href="#main-content" className="skip-link">
        {h("skip")}
      </a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label={SITE.name}>
          <span>{SITE.wordmark}</span>
          <span>{SITE.wordmarkSub}</span>
        </Link>
        <nav className="header-nav" aria-label={nav("primary")}>
          <Link href={pathname === "/" ? "/#work" : "/gallery"}>
            {h("workNav")}
          </Link>
          <Link href={pathname === "/" ? "/#approach" : "/about"}>
            {h("processNav")}
          </Link>
        </nav>
        <div className="header-actions">
          <LocaleSwitch light className="header-languages" />
          <ContactButton
            label={h("start")}
            className="btn btn-ink header-contact"
          />
          <button
            type="button"
            className="header-menu"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen(true)}
          >
            <span>{t("menu")}</span>
            <svg viewBox="0 0 20 12" width="18" height="12" aria-hidden="true">
              <path
                d="M0 1h20M0 11h20"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      </header>
    </>
  );
}
