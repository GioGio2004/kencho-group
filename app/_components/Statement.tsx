import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

/* A short statement of how the workshop works, and a way to the rest. */
export default async function Statement({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "statement" });
  return (
    <section className="statement">
      <p className="u-meta text-mute">{t("eyebrow")}</p>
      <div className="mt-6 lg:mt-0">
        <h2 className="u-display max-w-[16ch] text-[clamp(2rem,4.2vw,4rem)]">{t("title")}</h2>
        <p className="mt-8 max-w-[58ch] text-[1.0625rem] leading-relaxed text-ink-2">{t("text")}</p>
        <Link href="/about" className="mt-10 inline-flex items-center gap-4 text-[0.9375rem]">
          {t("cta")}
          <span className="circle circle-fill">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M2 8h12M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        </Link>
      </div>
    </section>
  );
}
