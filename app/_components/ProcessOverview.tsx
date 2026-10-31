import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const copy = {
  en: { heading: ["from", "idea to", "installation"], timing: "takes us", weeks: "weeks" },
  ka: { heading: ["იდეიდან", "მონტაჟამდე"], timing: "ვადაა", weeks: "კვირა" },
  ru: { heading: ["от идеи", "до установки"], timing: "занимает", weeks: "недель" },
} as const;

const images = [
  "/process/consultation.webp",
  "/process/engineering-blueprint.svg",
  "/process/materials.webp",
  "/process/finishing.webp",
  "/furniture/walnut-upper-cabinets-kitchen-tbilisi-kencho-group.webp",
] as const;

export default async function ProcessOverview({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home.landing.roadmap" });
  const c = await getTranslations({ locale, namespace: "home.compact" });
  const text = copy[locale];
  return (
    <section id="roadmap" data-section="roadmap" className="process-overview" aria-labelledby="process-overview-heading">
      <div className="process-overview-summary">
        <h2 id="process-overview-heading">{text.heading.map(line => <span key={line}>{line}</span>)}</h2>
        <p className="process-overview-timing"><span>{text.timing}</span><strong>4–8 <span>{text.weeks}</span></strong></p>
      </div>
      <ol className="process-overview-grid">
        {images.map((image, index) => <li key={image}>
          <Link href="/process" className={`process-overview-card process-overview-card-${index + 1}`}>
            <Image src={image} alt="" fill sizes={index === 4 ? "(max-width: 767px) 100vw, 1280px" : "(max-width: 767px) 50vw, 640px"} quality={90} />
            <h3>{t(`steps.${index + 1}.title`)}</h3>
          </Link>
        </li>)}
      </ol>
      <div className="process-overview-footer">
        <p>{c("timeNote")}</p>
        <Link href="/process">{c("processLink")} <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
  );
}
