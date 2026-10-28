import GlassImage from "@/app/_components/GlassImage";
import { getTranslations } from "next-intl/server";
import { SHOWCASE_PHOTOS, showcasePhotoAlt } from "@/lib/showcase-photos";

export default async function ProjectGuide({ locale, guide }: { locale: string; guide: string }) {
  const t = await getTranslations({ locale, namespace: "home.landing" });
  const roadmapSteps = ["1", "2", "3", "4", "5"] as const;
  const techKeys = roadmapSteps;
  const partnerKeys = ["ltb", "imeri", "geodecor", "kasta", "oldlami", "ionfasha"] as const;
  const pricingRows = ["furniture", "interior", "manufacturing"] as const;
  return <>
    {guide === "process" && (
      <section
        id="roadmap"
        data-section="roadmap"
        className="mx-auto max-w-[1440px] px-6 md:px-12 py-24 md:py-36 border-t border-white/[0.09]"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div className="max-w-3xl space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">
              {t("roadmap.eyebrow")}
            </p>
            <h1 className="text-3xl md:text-5xl font-normal tracking-tight leading-[1.15] text-white">
              {t("roadmap.title")}
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              {t("roadmap.intro")}
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center rounded-full bg-white/[0.03] border border-white/15 px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-100">
              {t("roadmap.totalBadge")}
            </span>
          </div>
        </div>

        <ol className="border-b border-white/10">
          {roadmapSteps.map((step) => (
            <li key={step} data-roadmap-step={step} className="border-t border-white/10 py-8 md:py-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline hover:bg-white/[0.015] transition-colors">
              <div className="md:col-span-2 flex md:flex-col items-start gap-4">
                <span className="text-xs font-mono tracking-widest text-zinc-500">{t(`roadmap.steps.${step}.number`)}</span>
                <span className="border border-white/15 bg-white/[0.03] rounded-full px-3 py-1 text-xs text-zinc-300">{t(`roadmap.steps.${step}.duration`)}</span>
              </div>
              <h3 className="md:col-span-4 text-xl md:text-2xl font-normal text-white tracking-tight">{t(`roadmap.steps.${step}.title`)}</h3>
              <p className="md:col-span-6 text-sm md:text-base text-zinc-400 leading-relaxed">{t(`roadmap.steps.${step}.description`)}</p>
            </li>
          ))}
        </ol>
      </section>
    )}
    {guide === "materials" && (
      <section
        id="ecosystem"
        data-section="ecosystem"
        className="mx-auto max-w-[1440px] px-6 md:px-12 py-24 md:py-36 border-t border-white/[0.09]"
      >
        <div className="max-w-3xl space-y-5 mb-16 md:mb-24">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">
            {t("ecosystem.eyebrow")}
          </p>
          <h1 className="text-3xl md:text-5xl font-normal tracking-tight leading-[1.15] text-white">
            {t("ecosystem.title")}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            {t("ecosystem.intro")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 border-y border-white/10">
          {/* Specialized fabrication specifications */}
          <div className="py-8 lg:pr-12 lg:border-r border-white/10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-zinc-50">
                {t("ecosystem.techTitle")}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                {t("ecosystem.techSubtitle")}
              </p>
            </div>

            <ul className="divide-y divide-white/10">
              {techKeys.map((k) => (
                <li
                  key={k}
                  data-tech-item={k}
                  className="py-6 first:pt-0 last:pb-0 space-y-2"
                >
                  <div className="text-sm sm:text-base font-semibold text-zinc-100">
                    {t(`ecosystem.techItems.${k}.name`)}
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    {t(`ecosystem.techItems.${k}.detail`)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-4 pt-6">
              <GlassImage className="aspect-[4/3]" src={SHOWCASE_PHOTOS.hero.src} alt={showcasePhotoAlt(SHOWCASE_PHOTOS.hero, locale)} quality={85} sizes="(max-width: 1023px) 45vw, 22vw" />
              <GlassImage className="aspect-[4/3]" src={SHOWCASE_PHOTOS.materials.src} alt={showcasePhotoAlt(SHOWCASE_PHOTOS.materials, locale)} quality={85} sizes="(max-width: 1023px) 45vw, 22vw" />
            </div>
          </div>

          {/* Material and processing partners */}
          <div className="py-8 lg:pl-12 border-t lg:border-t-0 border-white/10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-zinc-50">
                {t("ecosystem.partnersTitle")}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                {t("ecosystem.partnersSubtitle")}
              </p>
            </div>

            <div className="divide-y divide-white/10">
              {partnerKeys.map((partner) => (
                <div
                  key={partner}
                  data-partner-card={partner}
                  className="py-6 first:pt-0 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-semibold text-zinc-50">
                      {t(`ecosystem.partners.${partner}.name`)}
                    </h4>
                  </div>
                  <p className="text-xs font-medium text-zinc-200">
                    {t(`ecosystem.partners.${partner}.role`)}
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {t(`ecosystem.partners.${partner}.detail`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )}
    {guide === "design-pricing" && (
      <section
        id="pricing"
        data-section="pricing"
        className="mx-auto max-w-[1440px] px-6 md:px-12 py-24 md:py-36 border-t border-white/[0.09]"
      >
        <div className="max-w-3xl space-y-3 mb-10">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">
            {t("pricing.eyebrow")}
          </p>
          <h1 className="text-3xl md:text-5xl font-normal tracking-tight leading-[1.15] text-white">
            {t("pricing.title")}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            {t("pricing.intro")}
          </p>
        </div>

        <div className="overflow-x-auto border-y border-white/10" tabIndex={0} role="region" aria-label={t("pricing.title")}>
          <table
            data-pricing-table
            className="w-full min-w-[640px] text-left border-collapse text-sm"
          >
            <thead>
              <tr className="border-b border-white/10 text-zinc-400">
                <th scope="col" className="py-8 pr-6 font-semibold">
                  {t("pricing.colService")}
                </th>
                <th scope="col" className="py-8 pr-6 font-semibold">
                  {t("pricing.colPrice")}
                </th>
                <th scope="col" className="py-8 pr-6 font-semibold">
                  {t("pricing.colMeasure")}
                </th>
                <th scope="col" className="py-8 pr-6 font-semibold">
                  {t("pricing.colIncludes")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {pricingRows.map((row) => (
                <tr
                  key={row}
                  data-pricing-row={row}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <th
                    scope="row"
                    className="py-8 pr-6 font-semibold text-zinc-50 align-top"
                  >
                    {t(`pricing.rows.${row}.service`)}
                  </th>
                  <td className="py-8 pr-6 font-semibold text-white whitespace-nowrap align-top">
                    <span className="text-sm md:text-base">
                      {t(`pricing.rows.${row}.price`)}
                    </span>
                  </td>
                  <td className="py-8 pr-6 text-zinc-200 align-top">
                    {t(`pricing.rows.${row}.measure`)}
                  </td>
                  <td className="py-8 pr-6 text-zinc-400 leading-relaxed align-top">
                    {t(`pricing.rows.${row}.includes`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-sm text-zinc-400 leading-relaxed">
          {t("pricing.scopeNote")}
        </p>
      </section>
    )}
  </>;
}
