import { getTranslations } from "next-intl/server";
import Catalogue from "@/app/_components/Catalogue";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import type { Chapter, CataloguePage } from "@/lib/catalogue";
import { SITE } from "@/lib/site";

/*
 * The catalogue page frame, shared by /gallery (everything) and
 * /gallery/[slug] (one chapter): the title, the chapter tabs, the grid.
 *
 * Tabs are real links to real pages, not a client-side filter — each
 * chapter is its own URL with its own title and description.
 */
export default async function CatalogueShell({
  locale,
  chapters,
  pages,
  active,
  title,
  lede,
}: {
  locale: Locale;
  chapters: Chapter[];
  pages: CataloguePage[];
  /** The chapter slug, or undefined for the whole catalogue. */
  active?: string;
  title: string;
  lede: string;
}) {
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const tabs = [
    { href: "/gallery", label: t("all"), slug: undefined as string | undefined },
    ...chapters.map((c) => ({ href: `/gallery/${c.slug}`, label: c.title, slug: c.slug as string | undefined })),
  ];
  const shareBase = `${SITE.url}/${locale}/gallery${active ? `/${active}` : ""}`;

  return (
    <main>
      <header className="px-5 pt-28 pb-8 sm:px-8 lg:px-10 lg:pt-36">
        <p className="u-meta text-mute">
          {SITE.name} · {t("count", { count: pages.length })}
        </p>
        <h1 className="u-display mt-4 text-[clamp(2.6rem,6vw,5.5rem)]">{title}</h1>
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,40rem)_1fr] lg:items-end lg:gap-16">
          <p className="max-w-[40rem] text-[1rem] leading-relaxed text-ink-2 sm:text-[1.0625rem]">{lede}</p>
          <p className="border-l-2 border-orange pl-4 text-[0.9375rem] leading-relaxed text-ink-2 lg:max-w-[26rem] lg:justify-self-end">
            {t("designerNote")}
          </p>
        </div>
      </header>

      <nav
        aria-label={t("chapters")}
        className="catalogue-tabs sticky z-40 border-y border-line bg-paper/95 backdrop-blur-sm"
      >
        <ul className="no-bar flex gap-7 overflow-x-auto px-5 sm:px-8 lg:px-10">
          {tabs.map((tab) => (
            <li key={tab.href} className="shrink-0">
              <Link href={tab.href} aria-current={tab.slug === active ? "page" : undefined} className="tab" scroll={false}>
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-2.5 pt-4 pb-20 sm:px-8 sm:pt-8 sm:pb-28 lg:px-10">
        <Catalogue key={active ?? "all"} pages={pages} shareBase={shareBase} />
      </div>
    </main>
  );
}
