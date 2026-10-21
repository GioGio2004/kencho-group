"use client";
import { useTranslations } from "next-intl";
import LocaleSwitch from "@/app/_components/LocaleSwitch";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/lib/site";
/* Navigation lives in the bottom mega menu (MegaMenu); the header keeps
 * only the wordmark home and the languages. */
export default function SiteHeader() {
  const h = useTranslations("home");
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
        <div className="header-actions">
          <LocaleSwitch light className="header-languages" />
        </div>
      </header>
    </>
  );
}
