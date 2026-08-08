import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

/*
 * THE MASTHEAD every routed page opens with.
 *
 * A server component on purpose: the h1 is the one heading a crawler
 * must find in the initial HTML, so it never waits on hydration or an
 * effect. The sections reused below it keep their own h2s — this is the
 * only h1 on the page.
 *
 * Top padding clears the fixed header, same clearance the planner's
 * masthead takes (.plan-masthead).
 */
export default async function PageIntro({
  locale,
  page,
}: {
  locale: Locale;
  page: "projects" | "services" | "process" | "faq" | "contact" | "gallery";
}) {
  const t = await getTranslations({ locale, namespace: "pageIntro" });

  return (
    <section className="u-band px-5 pt-32 pb-4 sm:px-8 sm:pt-36 lg:px-12">
      <div className="mx-auto w-full max-w-4xl">
        <p className="u-eyebrow">{t(`${page}.eyebrow`)}</p>
        <h1 className="u-display mt-5 max-w-[18ch] text-[clamp(2.1rem,6.5vw,4rem)] text-ink">
          {t(`${page}.title`)}
        </h1>
        <p className="mt-6 max-w-2xl text-[0.9375rem] leading-[1.7] text-ink-70 sm:text-base">
          {t(`${page}.lede`)}
        </p>
      </div>
    </section>
  );
}
