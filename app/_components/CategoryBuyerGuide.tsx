import { getTranslations } from "next-intl/server";
import ContactLink from "@/app/_components/ContactLink";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/category-guides";

export default async function CategoryBuyerGuide({ locale, slug }: { locale: Locale; slug: CategorySlug }) {
  const [t, guide] = await Promise.all([
    getTranslations({ locale, namespace: "commercial" }),
    getTranslations({ locale, namespace: `categoryGuides.items.${slug}` }),
  ]);
  const categories = await getTranslations({ locale, namespace: "categoryGuides.items" });
  return (
    <section data-buyer-guide={slug} aria-labelledby="buyer-guide-heading" className="border-t border-line px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="max-w-3xl space-y-5">
          <h2 id="buyer-guide-heading" className="u-display text-[clamp(1.8rem,3.6vw,3rem)]">{guide("guideTitle")}</h2>
          <p className="leading-relaxed text-ink/80">{guide("focus")}</p>
          <p className="leading-relaxed text-ink/80">{t("start")}</p>
          <p className="leading-relaxed text-ink/80">{t("coverage")}</p>
        </div>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="space-y-5">
            <h3 className="u-display text-2xl sm:text-3xl">{t("feesTitle")}</h3>
            <ul className="space-y-4 border-y border-line py-5 leading-relaxed">
              <li>{t("furnitureFee")}</li>
              <li>{t("interiorFee")}</li>
            </ul>
            <p className="leading-relaxed text-ink/80">{t("quote")}</p>
          </div>
          <div className="space-y-5">
            <h3 className="u-display text-2xl sm:text-3xl">{t("timelineTitle")}</h3>
            <p className="leading-relaxed text-ink/80">{t("timeline")}</p>
            <ol className="space-y-5">
              {(["design", "review", "materials", "installation"] as const).map((stage, i) => (
                <li key={stage} data-project-stage={stage} className="border-t border-line pt-4">
                  <h4 className="font-medium"><span className="mr-3 text-bronze">0{i + 1}</span>{t(`stages.${stage}.title`)}</h4>
                  <p className="mt-2 leading-relaxed text-ink/80">{t(`stages.${stage}.text`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="max-w-4xl space-y-5">
          <h3 className="u-display text-2xl sm:text-3xl">{t("materialsTitle")}</h3>
          <p className="leading-relaxed text-ink/80">{t("suppliers")}</p>
          <p className="leading-relaxed text-ink/80">{t("technical")}</p>
          <p className="leading-relaxed text-ink/80">{t("scope")}</p>
        </div>
        <div className="max-w-4xl">
          <h3 className="u-display mb-6 text-2xl sm:text-3xl">{t("faqTitle")}</h3>
          {[1, 2].map((i) => (
            <details key={i} data-category-faq className="group border-t border-line py-5 last:border-b">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-medium [&::-webkit-details-marker]:hidden">
                {guide(`faq${i}q`)}<span aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pt-4 leading-relaxed text-ink/80">{guide(`faq${i}a`)}</p>
            </details>
          ))}
        </div>
        <ContactLink method="whatsapp" about={guide("title")} className="u-link inline-block text-base">{t("cta")} →</ContactLink>
        <nav aria-label={t("related")} className="flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-6">
          {CATEGORY_SLUGS.filter((category) => category !== slug).map((category) => (
            <Link key={category} href={`/gallery/${category}`} className="u-link text-sm">{categories(`${category}.title`)}</Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
