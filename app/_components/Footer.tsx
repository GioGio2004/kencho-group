import { getTranslations } from "next-intl/server";
import ContactLink from "@/app/_components/ContactLink";
import LocaleSwitch from "@/app/_components/LocaleSwitch";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { SITE } from "@/lib/site";
export default async function Footer({
  locale,
  chapters,
}: {
  locale: Locale;
  chapters: { slug: string; title: string }[];
}) {
  const [t, n, c] = await Promise.all([
    getTranslations({ locale, namespace: "footer" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "contact" }),
  ]);
  const guides = await getTranslations({ locale, namespace: "home.compact" });
  return (
    <footer className="site-footer">
      <div className="home-shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand">
              <span>{SITE.wordmark}</span>
              <span>{SITE.wordmarkSub}</span>
            </Link>
            <p>{t("tagline")}</p>
          </div>
          <nav aria-label={t("focus")}>
            <h2>{t("focus")}</h2>
            <ul>
              {chapters.map((ch) => (
                <li key={ch.slug}>
                  <Link href={"/gallery/" + ch.slug}>{ch.title}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label={t("pages")}>
            <h2>{t("pages")}</h2>
            <ul>
              <li>
                <Link href="/gallery">{n("catalogue")}</Link>
              </li>
              <li>
                <Link href="/about">{n("about")}</Link>
              </li>
              <li>
                <Link href="/process">{guides("processLink")}</Link>
              </li><li><Link href="/design-pricing">{guides("pricingLink")}</Link>
              </li><li><Link href="/materials">{guides("materialsLink")}</Link>
              </li><li><Link href="/faq">{n("faq")}</Link>
              </li>
              <li>
                <Link href="/contact">{n("contact")}</Link>
              </li>
            </ul>
            <div className="footer-socials">
              <a
                href={SITE.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook ↗
              </a>
              <a
                href={SITE.socials.tiktok}
                target="_blank"
                rel="noopener noreferrer"
              >
                TikTok ↗
              </a>
            </div>
          </nav>
          <div>
            <h2>{t("enquiries")}</h2>
            <address>
              <ContactLink method="phone">{SITE.phone}</ContactLink>
              <ContactLink method="whatsapp">WhatsApp ↗</ContactLink>
              <span>{c("address")}</span>
              <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer">
                {c("mapCta")} ↗
              </a>
            </address>
          </div>
        </div>
        <div className="footer-bottom">
          <p>{t("rights", { year: SITE.year })}</p>
          <LocaleSwitch light />
        </div>
      </div>
    </footer>
  );
}
