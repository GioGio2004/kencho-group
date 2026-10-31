import ProjectRequestLink from "./ProjectRequestLink";
import { getTranslations } from "next-intl/server";
import Catalogue from "@/app/_components/Catalogue";
import type { Locale } from "@/i18n/routing";
import type { Chapter, CataloguePage } from "@/lib/catalogue";
import { SITE } from "@/lib/site";
import { JOURNEY_COPY } from "@/lib/journey-copy";

// Bold editorial opening and crawlable category navigation above the masonry.

const SHELL_COPY: Record<
  Locale,
  {
    eyebrow: string;
    enquireCta: string;
    allMaterials: string;
    loadMore: string;
    showing: string;
    gridEditorial: string;
    gridIndex: string;
    plate: string;
  }
> = {
  ka: {
    eyebrow: "KENCHO GROUP · ნამუშევრების კატალოგი",
    enquireCta: "პროექტის შეკვეთა ↗",
    allMaterials: "ყველა მასალა",
    loadMore: "მეტი ნამუშევრის ჩვენება",
    showing: "ნაჩვენებია",
    gridEditorial: "3 სვეტი",
    gridIndex: "4 სვეტი",
    plate: "ნამუშევარი",
  },
  ru: {
    eyebrow: "KENCHO GROUP · КАТАЛОГ РАБОТ",
    enquireCta: "Заказать проект ↗",
    allMaterials: "Все материалы",
    loadMore: "Показать ещё работы",
    showing: "Показано",
    gridEditorial: "3 колонки",
    gridIndex: "4 колонки",
    plate: "Работа",
  },
  en: {
    eyebrow: "KENCHO GROUP · EXHIBITION CATALOGUE",
    enquireCta: "Request a project ↗",
    allMaterials: "All materials",
    loadMore: "Load more works",
    showing: "Showing",
    gridEditorial: "3 columns",
    gridIndex: "4 columns",
    plate: "Plate",
  },
};

export default async function CatalogueShell({
  locale,
  chapters,
  pages,
  active,
  title,
  lede,
  children,
}: {
  locale: Locale;
  chapters: Chapter[];
  pages: CataloguePage[];
  /** The chapter slug, or undefined for the whole catalogue. */
  active?: string;
  title: string;
  lede: string;
  children?: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const copy = SHELL_COPY[locale];
  const totalAll = chapters.reduce((sum, c) => sum + c.count, 0) || pages.length;

  const tabs = [
    {
      href: "/gallery",
      label: t("all"),
      count: totalAll,
      slug: undefined as string | undefined,
    },
    ...chapters.map((c) => ({
      href: `/gallery/${c.slug}`,
      label: c.title,
      count: c.count,
      slug: c.slug as string | undefined,
    })),
  ];
  const shareBase = `${SITE.url}/${locale}/gallery${active ? `/${active}` : ""}`;
  const displayTitle = active ? chapters.find(chapter => chapter.slug === active)?.title ?? title : title;

  return (
    <main className="catalogue-page">
      <header className="catalogue-head gallery-hero">
        <div className="catalogue-shell-inner">
          <p className="gallery-hero-prelude">{JOURNEY_COPY[locale].galleryPrelude}</p>
          <h1 className="catalogue-title" data-category={Boolean(active)}>{displayTitle}</h1>
          <div className="gallery-hero-bottom">
            <div><p className="catalogue-lede">{lede}</p><p className="catalogue-count-badge">{t("count", { count: pages.length })}</p></div>
            <ProjectRequestLink className="details-primary-link">{copy.enquireCta}</ProjectRequestLink>
          </div>
        </div>
      </header>

      <div className="catalogue-stage">
        <div className="catalogue-shell-inner">
          <Catalogue
            key={active ?? "all"}
            pages={pages}
            shareBase={shareBase}
            locale={locale}
            labels={copy}
            categories={tabs.map(tab => ({ ...tab, active: tab.slug === active }))}
          />
        </div>
      </div>
      {children}
    </main>
  );
}
