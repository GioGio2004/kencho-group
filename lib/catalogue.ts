import type { Locale } from "@/i18n/routing";
import { translatedPhotoTitle } from "@/lib/gallery-titles";
import { pick, type Gallery, type GallerySlugEntry, type Localized } from "@/lib/convex-gallery";

/*
 * THE CATALOGUE — served directly from /public/furniture for instant
 * server rendering, zero external database latency, and exact intrinsic
 * dimensions (CLS = 0).
 */

export type ChapterSlug =
  | "kitchens"
  | "wardrobes-storage"
  | "commercial-spaces"
  | "home-interiors";

export type MaterialTag =
  | "walnut"
  | "oak"
  | "white"
  | "green"
  | "grey"
  | "black"
  | "marble"
  | "island"
  | "glass"
  | "mirror"
  | "fluted"
  | "wine"
  | "office"
  | "cafe"
  | "reception"
  | "bedroom"
  | "bathroom"
  | "hallway"
  | "media"
  | "kids";

export const MATERIAL_LABELS: Record<MaterialTag, Record<Locale, string>> = {
  walnut: { ka: "კაკალი", ru: "Орех", en: "Walnut" },
  oak: { ka: "მუხა", ru: "Дуб", en: "Oak" },
  white: { ka: "თეთრი", ru: "Белый", en: "White" },
  green: { ka: "მწვანე", ru: "Зелёный", en: "Green" },
  grey: { ka: "ნაცრისფერი", ru: "Серый", en: "Grey" },
  black: { ka: "მუქი", ru: "Тёмный", en: "Dark" },
  marble: { ka: "ქვა და მარმარილო", ru: "Камень и мрамор", en: "Stone & Marble" },
  island: { ka: "კუნძული", ru: "Остров", en: "Island" },
  glass: { ka: "მინის ვიტრინა", ru: "Стекло и витрина", en: "Glass & Vitrine" },
  mirror: { ka: "სარკე", ru: "Зеркало", en: "Mirror" },
  fluted: { ka: "რელიეფური პანელი", ru: "Рельефные панели", en: "Fluted Panel" },
  wine: { ka: "ღვინის სათავსო", ru: "Винный шкаф", en: "Wine Storage" },
  office: { ka: "ოფისი", ru: "Офис", en: "Office" },
  cafe: { ka: "კაფე და ჰორეკა", ru: "Кафе и HoReCa", en: "Café & HoReCa" },
  reception: { ka: "ლობი და რეცეფცია", ru: "Лобби и ресепшн", en: "Lobby & Reception" },
  bedroom: { ka: "საძინებელი", ru: "Спальня", en: "Bedroom" },
  bathroom: { ka: "აბაზანა", ru: "Ванная", en: "Bathroom" },
  hallway: { ka: "შემოსასვლელი", ru: "Прихожая", en: "Hallway" },
  media: { ka: "TV კედელი", ru: "Медиастена", en: "Media Wall" },
  kids: { ka: "საბავშვო", ru: "Детская", en: "Kids Room" },
};

export type Chapter = {
  slug: string;
  title: string;
  description: string;
  count: number;
  cover: { url: string; alt: string; width: number; height: number } | null;
};

export type CataloguePage = {
  id: string;
  chapter: string;
  chapterTitle: string;
  url: string;
  alt: string;
  heading: string;
  ref: string;
  caption: string;
  tags: MaterialTag[];
  tagLabels: string[];
  width: number;
  height: number;
  indexInChapter: number;
};

type RawWork = {
  stem: string;
  chapter: ChapterSlug;
  width: number;
  height: number;
  tags: MaterialTag[];
};

const CHAPTER_META: {
  slug: ChapterSlug;
  title: Localized;
  description: Localized;
  createdAt: number;
}[] = [
  {
    slug: "kitchens",
    title: {
      en: "Custom Kitchens",
      ka: "სამზარეულოები შეკვეთით",
      ru: "Кухни на заказ",
    },
    description: {
      en: "Custom kitchen cabinetry, architectural islands, stone worktops and integrated storage built to measure in Tbilisi and installed across Georgia.",
      ka: "ინდივიდუალური სამზარეულოები, კუნძულები, ქვის ზედაპირები და ჩაშენებული სისტემები — დამზადებული თბილისში, მონტაჟით მთელ საქართველოში.",
      ru: "Индивидуальные кухни, острова, каменные столешницы и встроенные системы хранения — производство в Тбилиси и монтаж по всей Грузии.",
    },
    createdAt: Date.parse("2026-10-01T00:00:00Z"),
  },
  {
    slug: "wardrobes-storage",
    title: {
      en: "Wardrobes & Storage",
      ka: "ჩაშენებული კარადები და საგარდერობე",
      ru: "Встроенные шкафы и гардеробные",
    },
    description: {
      en: "Floor-to-ceiling wardrobes, walk-in dressing rooms, bronze mirror doors and hallway storage systems tailored to the millimetre.",
      ka: "იატაკიდან ჭერამდე ჩაშენებული კარადები, საგარდერობე ოთახები, ბრინჯაოს სარკეები და შემოსასვლელის სისტემები მილიმეტრის სიზუსტით.",
      ru: "Встроенные шкафы от пола до потолка, гардеробные комнаты, бронзовые зеркала и системы хранения для прихожей с точностью до миллиметра.",
    },
    createdAt: Date.parse("2026-10-02T00:00:00Z"),
  },
  {
    slug: "commercial-spaces",
    title: {
      en: "Commercial Spaces",
      ka: "კომერციული და საოფისე ავეჯი",
      ru: "Коммерческая и офисная мебель",
    },
    description: {
      en: "Custom reception desks, executive offices, boardrooms, hotel lobbies and café counters engineered in wood, MDF, stone and metalwork.",
      ka: "რეცეფციის დახლები, საოფისე და სათათბირო ავეჯი, სასტუმროს ლობი და კაფე-რესტორნების ინტერიერი ხით, მდფ-ით, ქვითა და მეტალით.",
      ru: "Стойки ресепшн, мебель для офисов и переговорных, лобби отелей и барные стойки для кафе из дерева, МДФ, камня и металла.",
    },
    createdAt: Date.parse("2026-10-03T00:00:00Z"),
  },
  {
    slug: "home-interiors",
    title: {
      en: "Home Interiors & Paneling",
      ka: "საცხოვრებელი ინტერიერი და კედლის პანელები",
      ru: "Жилые интерьеры и стеновые панели",
    },
    description: {
      en: "Architectural wall panelling, living room media walls, bedroom joinery, bathroom vanities and custom children's rooms.",
      ka: "არქიტექტურული კედლის პანელები, მისაღების TV კედლები, საძინებლისა და აბაზანის ავეჯი და საბავშვო ოთახები.",
      ru: "Архитектурные стеновые панели, медиастены для гостиной, мебель для спальни, тумбы для ванной и детские комнаты.",
    },
    createdAt: Date.parse("2026-10-04T00:00:00Z"),
  },
];

const WORKS: RawWork[] = [
  // KITCHENS (32 works)
  { stem: "walnut-island-kitchen", chapter: "kitchens", width: 2048, height: 1365, tags: ["walnut", "island", "white"] },
  { stem: "green-island-kitchen", chapter: "kitchens", width: 2048, height: 1365, tags: ["green", "island"] },
  { stem: "white-oak-island-kitchen", chapter: "kitchens", width: 1600, height: 1066, tags: ["white", "oak", "island"] },
  { stem: "black-marble-kitchen", chapter: "kitchens", width: 793, height: 1191, tags: ["black", "marble"] },
  { stem: "glazed-partition-kitchen", chapter: "kitchens", width: 2048, height: 1792, tags: ["white", "oak", "glass"] },
  { stem: "dark-walnut-kitchen", chapter: "kitchens", width: 1544, height: 1047, tags: ["walnut", "black"] },
  { stem: "green-marble-kitchen", chapter: "kitchens", width: 2048, height: 1499, tags: ["green", "marble"] },
  { stem: "grey-marble-kitchen", chapter: "kitchens", width: 1152, height: 2048, tags: ["grey", "marble"] },
  { stem: "oak-island-kitchen-shelves", chapter: "kitchens", width: 2048, height: 1364, tags: ["oak", "island"] },
  { stem: "classic-white-kitchen", chapter: "kitchens", width: 1600, height: 1118, tags: ["white"] },
  { stem: "walnut-and-concrete-kitchen", chapter: "kitchens", width: 1593, height: 1333, tags: ["walnut", "grey"] },
  { stem: "black-oak-kitchen-dining", chapter: "kitchens", width: 1781, height: 1170, tags: ["black", "oak"] },
  { stem: "green-corner-kitchen", chapter: "kitchens", width: 960, height: 1280, tags: ["green"] },
  { stem: "green-kitchen-glazed-partition", chapter: "kitchens", width: 960, height: 1280, tags: ["green", "glass"] },
  { stem: "grey-kitchen-vitrine", chapter: "kitchens", width: 2048, height: 1366, tags: ["grey", "glass"] },
  { stem: "grey-l-shaped-kitchen", chapter: "kitchens", width: 2048, height: 1366, tags: ["grey"] },
  { stem: "fluted-oak-panel-detail", chapter: "kitchens", width: 1364, height: 2048, tags: ["oak", "fluted", "island"] },
  { stem: "kitchen-island-staircase", chapter: "kitchens", width: 2048, height: 1365, tags: ["island", "oak"] },
  { stem: "oak-graphite-kitchen", chapter: "kitchens", width: 926, height: 616, tags: ["oak", "grey"] },
  { stem: "oak-kitchenette", chapter: "kitchens", width: 2048, height: 1159, tags: ["oak"] },
  { stem: "open-plan-kitchen-media-wall", chapter: "kitchens", width: 2048, height: 1365, tags: ["media", "walnut"] },
  { stem: "travertine-kitchen-detail", chapter: "kitchens", width: 1064, height: 1600, tags: ["marble"] },
  { stem: "walnut-oven-column", chapter: "kitchens", width: 1064, height: 1600, tags: ["walnut"] },
  { stem: "walnut-upper-cabinets-kitchen", chapter: "kitchens", width: 2000, height: 1334, tags: ["walnut", "white"] },
  { stem: "white-minimal-kitchen-run", chapter: "kitchens", width: 1776, height: 1185, tags: ["white"] },
  { stem: "white-oak-kitchen-wall", chapter: "kitchens", width: 2048, height: 1364, tags: ["white", "oak"] },
  { stem: "white-oven-column-walnut-kitchen", chapter: "kitchens", width: 2000, height: 1334, tags: ["white", "walnut"] },
  { stem: "white-wood-kitchen-corner", chapter: "kitchens", width: 2048, height: 1365, tags: ["white", "oak"] },
  { stem: "built-in-oven-column", chapter: "kitchens", width: 1365, height: 2048, tags: ["grey"] },
  { stem: "kitchen-sink-detail", chapter: "kitchens", width: 1200, height: 1600, tags: ["marble"] },
  { stem: "built-in-wine-rack", chapter: "kitchens", width: 1365, height: 2048, tags: ["wine", "oak"] },
  { stem: "wine-rack-glass-door", chapter: "kitchens", width: 1333, height: 2000, tags: ["wine", "glass"] },

  // WARDROBES & STORAGE (11 works)
  { stem: "bronze-mirror-wardrobe", chapter: "wardrobes-storage", width: 1065, height: 2048, tags: ["mirror"] },
  { stem: "oak-framed-wardrobe", chapter: "wardrobes-storage", width: 2048, height: 1778, tags: ["oak", "white"] },
  { stem: "cane-entryway-wardrobe", chapter: "wardrobes-storage", width: 1364, height: 2048, tags: ["hallway", "oak"] },
  { stem: "white-hallway-wardrobes", chapter: "wardrobes-storage", width: 1600, height: 1066, tags: ["white", "hallway"] },
  { stem: "flush-white-wardrobe-wall", chapter: "wardrobes-storage", width: 2048, height: 1692, tags: ["white"] },
  { stem: "grey-hallway-built-ins", chapter: "wardrobes-storage", width: 2048, height: 1368, tags: ["grey", "hallway"] },
  { stem: "hallway-mirror-unit", chapter: "wardrobes-storage", width: 1200, height: 1600, tags: ["hallway", "mirror"] },
  { stem: "oak-framed-wardrobe-hall", chapter: "wardrobes-storage", width: 2048, height: 1485, tags: ["oak", "hallway"] },
  { stem: "white-bedroom-wardrobe", chapter: "wardrobes-storage", width: 1200, height: 1600, tags: ["white", "bedroom"] },
  { stem: "white-built-in-wardrobe", chapter: "wardrobes-storage", width: 1200, height: 1600, tags: ["white"] },
  { stem: "white-wardrobe-teal-bedroom", chapter: "wardrobes-storage", width: 1450, height: 823, tags: ["white", "bedroom"] },

  // COMMERCIAL SPACES (11 works)
  { stem: "commercial-lobby-lounge", chapter: "commercial-spaces", width: 2048, height: 1365, tags: ["reception", "walnut"] },
  { stem: "cafe-fluted-counter", chapter: "commercial-spaces", width: 2000, height: 1334, tags: ["cafe", "fluted"] },
  { stem: "office-walnut-wall-unit", chapter: "commercial-spaces", width: 2048, height: 1365, tags: ["office", "walnut"] },
  { stem: "commercial-reception-desk", chapter: "commercial-spaces", width: 2048, height: 1365, tags: ["reception", "marble"] },
  { stem: "cafe-arched-shelving", chapter: "commercial-spaces", width: 1333, height: 2000, tags: ["cafe", "oak"] },
  { stem: "office-boardroom-furniture", chapter: "commercial-spaces", width: 2048, height: 1366, tags: ["office", "walnut"] },
  { stem: "commercial-lobby-mirror-wall", chapter: "commercial-spaces", width: 1365, height: 2048, tags: ["reception", "mirror"] },
  { stem: "office-walnut-corridor", chapter: "commercial-spaces", width: 2048, height: 1365, tags: ["office", "walnut"] },
  { stem: "office-kitchen-island", chapter: "commercial-spaces", width: 2048, height: 1365, tags: ["office", "island"] },
  { stem: "commercial-lobby-bench", chapter: "commercial-spaces", width: 2048, height: 1365, tags: ["reception", "oak"] },
  { stem: "commercial-lobby-partition", chapter: "commercial-spaces", width: 2048, height: 1365, tags: ["reception", "fluted"] },

  // HOME INTERIORS (8 works)
  { stem: "living-room-media-wall", chapter: "home-interiors", width: 1600, height: 1068, tags: ["media", "walnut"] },
  { stem: "walnut-panel-bedroom", chapter: "home-interiors", width: 2048, height: 1536, tags: ["walnut", "bedroom"] },
  { stem: "zellige-bathroom-vanity", chapter: "home-interiors", width: 1536, height: 2048, tags: ["bathroom", "oak"] },
  { stem: "backlit-slat-wall-mirror", chapter: "home-interiors", width: 2000, height: 1334, tags: ["mirror", "fluted"] },
  { stem: "walnut-headboard-bedroom", chapter: "home-interiors", width: 2048, height: 1367, tags: ["walnut", "bedroom"] },
  { stem: "grey-bathroom-vanity", chapter: "home-interiors", width: 1600, height: 1066, tags: ["bathroom", "grey"] },
  { stem: "bedroom-desk-unit", chapter: "home-interiors", width: 1200, height: 1600, tags: ["bedroom", "white"] },
  { stem: "kids-room-furniture", chapter: "home-interiors", width: 2048, height: 1536, tags: ["kids", "white"] },
];

function stemToRef(stem: string): string {
  const words = stem.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function workUrl(stem: string): string {
  return `/furniture/${stem}-tbilisi-kencho-group.webp`;
}

function buildCaption(tags: MaterialTag[], chapterTitle: string, locale: Locale): string {
  const labels = tags.map((tag) => MATERIAL_LABELS[tag][locale]);
  return labels.length > 0 ? labels.join(" · ") : chapterTitle;
}

function buildGallery(slug: string): Gallery | null {
  const meta = CHAPTER_META.find((c) => c.slug === slug);
  if (!meta) return null;
  const works = WORKS.filter((w) => w.chapter === meta.slug);
  return {
    slug: meta.slug,
    title: meta.title,
    description: meta.description,
    createdAt: meta.createdAt,
    images: works.map((w, idx) => {
      const ref = stemToRef(w.stem);
      const kaTitle = translatedPhotoTitle(ref, "ka") || ref;
      const ruTitle = translatedPhotoTitle(ref, "ru") || ref;
      return {
        _id: `${meta.slug}-${idx + 1}`,
        url: workUrl(w.stem),
        alt: {
          en: `${ref} — custom furniture by Kencho Group in Tbilisi`,
          ka: `${kaTitle} — Kencho Group, თბილისი`,
          ru: `${ruTitle} — мебель на заказ Kencho Group, Тбилиси`,
        },
        caption: {
          en: buildCaption(w.tags, meta.title.en, "en"),
          ka: buildCaption(w.tags, meta.title.ka ?? meta.title.en, "ka"),
          ru: buildCaption(w.tags, meta.title.ru ?? meta.title.en, "ru"),
        },
        order: idx,
        width: w.width,
        height: w.height,
      };
    }),
  };
}

export async function loadGallery(slug: string): Promise<Gallery | null> {
  return buildGallery(slug);
}

export function listLocalGallerySlugs(): GallerySlugEntry[] {
  return CHAPTER_META.map((meta) => ({
    slug: meta.slug,
    title: meta.title,
    description: meta.description,
    createdAt: meta.createdAt,
    updatedAt: Date.parse("2026-10-30T00:00:00Z"),
  }));
}

function toPagesForChapter(slug: ChapterSlug, locale: Locale): CataloguePage[] {
  const meta = CHAPTER_META.find((c) => c.slug === slug)!;
  const chapterTitle = pick(meta.title, locale);
  const works = WORKS.filter((w) => w.chapter === slug);
  return works.map((w, indexInChapter) => {
    const ref = stemToRef(w.stem);
    const heading = translatedPhotoTitle(ref, locale) || ref;
    const tagLabels = w.tags.map((t) => MATERIAL_LABELS[t][locale]);
    const caption = tagLabels.length > 0 ? tagLabels.join(" · ") : chapterTitle;
    return {
      id: `${slug}-${indexInChapter + 1}`,
      chapter: slug,
      chapterTitle,
      url: workUrl(w.stem),
      alt: `${heading} — ${caption} · Kencho Group`,
      heading,
      ref,
      caption,
      tags: w.tags,
      tagLabels,
      width: w.width,
      height: w.height,
      indexInChapter,
    };
  });
}

export type ChapterHighlights = Chapter & {
  highlights: { index: number; heading: string }[];
};

export async function loadHighlights(locale: Locale): Promise<ChapterHighlights[]> {
  const chapters = await loadChapters(locale);
  return Promise.all(
    chapters.map(async (chapter) => {
      const pages = await loadPages(locale, chapter.slug);
      return {
        ...chapter,
        highlights: pages
          .slice(0, 4)
          .map((page, index) => ({ index, heading: page.heading || page.ref })),
      };
    }),
  );
}

export async function loadLatest(locale: Locale, count = 6): Promise<CataloguePage[]> {
  const all = await loadPages(locale);
  return all.slice(0, count);
}

export async function loadChapters(locale: Locale): Promise<Chapter[]> {
  return CHAPTER_META.map((meta) => {
    const pages = toPagesForChapter(meta.slug, locale);
    const first = pages[0] ?? null;
    return {
      slug: meta.slug,
      title: pick(meta.title, locale),
      description: pick(meta.description, locale),
      count: pages.length,
      cover: first
        ? {
            url: first.url,
            alt: first.alt,
            width: first.width,
            height: first.height,
          }
        : null,
    };
  });
}

/**
 * Pages for one chapter, or for the whole catalogue when `slug` is
 * omitted. The whole catalogue interleaves chapters round-robin so the
 * first screen of "All" shows a kitchen, a wardrobe, a commercial space,
 * and a home interior before continuing through the full collection.
 */
export async function loadPages(
  locale: Locale,
  slug?: string,
): Promise<CataloguePage[]> {
  if (slug) {
    const meta = CHAPTER_META.find((c) => c.slug === slug);
    if (!meta) return [];
    return toPagesForChapter(meta.slug, locale);
  }

  const lists = CHAPTER_META.map((meta) => toPagesForChapter(meta.slug, locale));
  const out: CataloguePage[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]);
    }
  }
  return out;
}
