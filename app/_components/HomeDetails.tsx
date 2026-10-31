import ProjectRequestLink from "./ProjectRequestLink";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Frame, ScanLine, Scissors, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { JOURNEY_COPY } from "@/lib/journey-copy";

const partners = [
  { key: "ltb", name: "LTB" },
  { key: "imeri", name: "Imeri" },
  { key: "geodecor", name: "Geo Decor" },
  { key: "kasta", name: "Kasta" },
  { key: "oldlami", name: "Old Lami" },
  { key: "yonpas", name: "Yonpaş" },
] as const;
const techniques = [ScanLine, Scissors, Frame, Sparkles];

export default async function HomeDetails({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home.landing" });
  const c = await getTranslations({ locale, namespace: "home.compact" });
  const request = await getTranslations({ locale, namespace: "request" });
  const journey = JOURNEY_COPY[locale];
  return <div className="home-details">
    <section id="ecosystem" data-section="ecosystem" className="materials-overview details-shell" aria-labelledby="materials-overview-heading">
      <div className="materials-overview-main">
        <div className="materials-overview-photo">
          <Image src="/furniture/fluted-oak-panel-detail-tbilisi-kencho-group.webp" alt={locale === "ka" ? "მუხის ტექსტურა და რელიეფური პანელები" : locale === "ru" ? "Фактура дуба и рельефные панели" : "Oak grain and finely crafted fluted timber panels"} fill sizes="(max-width: 767px) 100vw, 45vw" quality={90} />
        </div>
        <div className="materials-overview-copy">
          <p className="details-kicker">{c("materialsLink")}</p>
          <h2 id="materials-overview-heading">{c("materials")}</h2>
          <p className="details-description">{c("materialsNote")}</p>
          <ul className="materials-techniques">{techniques.map((Icon, index) => <li key={index}>
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            <span>{t(`ecosystem.techItems.${index + 1}.name`)}</span>
          </li>)}</ul>
          <Link href="/materials" className="details-text-link">{c("materialsLink")} <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <div className="materials-partners">
        <h3>{t("ecosystem.partnersTitle")}</h3>
        <ul className="materials-logo-grid">{partners.map(partner => <li key={partner.key}>
          <Image src={`/partners/${partner.key}.png`} alt={partner.name} width={240} height={90} className={`partner-logo partner-logo-${partner.key}`} />
        </li>)}</ul>
      </div>
    </section>
    <section id="pricing" data-section="pricing" className="design-overview details-shell" aria-labelledby="design-overview-heading">
      <div className="details-section-heading">
        <div><p className="details-kicker">{c("pricingLink")}</p><h2 id="design-overview-heading">{c("pricing")}</h2></div>
        <Link href="/design-pricing" className="details-text-link">{c("pricingLink")} <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="design-rate-grid">{(["furniture", "interior"] as const).map((type, index) => <article key={type} className="design-rate-card">
        <div className="design-rate-top"><span>0{index + 1}</span><Link href="/design-pricing" aria-label={t(`pricing.rows.${type}.service`)}>↗</Link></div>
        <h3>{t(`pricing.rows.${type}.service`)}</h3>
        <p className="design-rate-price">{t(`pricing.rows.${type}.price`)}</p>
        <p className="design-rate-measure">{t(`pricing.rows.${type}.measure`)}</p>
        <p className="design-rate-includes">{t(`pricing.rows.${type}.includes`)}</p>
      </article>)}</div>
    </section>
    <section id="faq" data-section="faq" className="contact-overview details-shell" aria-labelledby="contact-overview-heading">
      <div id="inquiry" className="contact-overview-panel">
        <div className="contact-overview-copy"><p className="details-kicker">{c("faq")}</p><h2 id="contact-overview-heading">{c("contact")}</h2>
          <div className="contact-overview-actions">
            <ProjectRequestLink className="details-primary-link">{request("cta")} <span aria-hidden="true">↗</span></ProjectRequestLink>
            <Link href="/faq" className="details-text-link">{c("faq")} <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="contact-overview-next">
          <p>{journey.requestNote}</p>
          <ol>{journey.requestSteps.map((step, index) => <li key={step}><span>0{index + 1}</span>{step}</li>)}</ol>
        </div>
      </div>
    </section>
  </div>;
}
