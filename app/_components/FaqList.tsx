import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { FAQ_IDS } from "@/lib/structured-data";

/*
 * Questions as native <details>: open and close with no JavaScript,
 * every answer in the server HTML (the FAQPage schema on /faq describes
 * exactly these). `limit` shows the first few, for the About page.
 */
export default async function FaqList({
  locale,
  limit,
}: {
  locale: Locale;
  limit?: number;
}) {
  const t = await getTranslations({ locale, namespace: "faq" });
  const ids = limit ? FAQ_IDS.slice(0, limit) : FAQ_IDS;

  return (
    <div className="border-t border-ink/10">
      {ids.map((id) => (
        <details key={id} className="group border-b border-ink/10">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[1.0625rem] sm:text-[1.25rem] [&::-webkit-details-marker]:hidden">
            <span className="u-display">{t(`items.${id}.q`)}</span>
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center text-[1.25rem] font-light transition-transform duration-300 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="max-w-[60ch] pb-7 text-[0.9375rem] leading-relaxed text-ink/70 sm:text-[1.0625rem]">
            {t(`items.${id}.a`)}
          </p>
        </details>
      ))}
    </div>
  );
}
