/*
 * Portfolio photographs the AI consultant can show inside the chat.
 * Selection is deterministic and server-side: the model never invents image
 * URLs, it only writes the answer, and the route attaches matching site-owned
 * photographs from /public/furniture plus the relevant gallery category.
 */
import type { Locale } from "@/i18n/routing";

export type AssistantCategory = "kitchens" | "wardrobes-storage" | "commercial-spaces" | "home-interiors";
export interface AssistantMedia { src: string; alt: string; caption: string }
export interface AssistantUi { category: AssistantCategory | null; media: AssistantMedia[] }

type Tag =
  | "walnut" | "oak" | "white" | "green" | "grey" | "black" | "marble" | "island" | "glass" | "mirror"
  | "bathroom" | "bedroom" | "hallway" | "kids" | "media" | "wine" | "office" | "cafe" | "reception" | "fluted";

const TAGS: Record<Tag, { match: RegExp; label: Record<Locale, string> }> = {
  walnut: { match: /walnut|კაკ|орех/, label: { ka: "კაკალი", ru: "орех", en: "walnut" } },
  oak: { match: /\boak|მუხ|дуб/, label: { ka: "მუხა", ru: "дуб", en: "oak" } },
  white: { match: /white|თეთრ|бел/, label: { ka: "თეთრი", ru: "белый", en: "white" } },
  green: { match: /green|მწვან|зел[её]н/, label: { ka: "მწვანე", ru: "зелёный", en: "green" } },
  grey: { match: /gr[ae]y|graphite|ნაცრისფ|გრაფიტ|сер(ый|ая|ой|ую|ые)|графит/, label: { ka: "ნაცრისფერი", ru: "серый", en: "grey" } },
  black: { match: /black|dark|შავ|მუქ|ч[её]рн|т[её]мн/, label: { ka: "მუქი", ru: "тёмный", en: "dark" } },
  marble: { match: /marble|stone|travertine|მარმარ|ქვის|ტრავერტ|мрамор|камен|травертин/, label: { ka: "ქვა", ru: "камень", en: "stone" } },
  island: { match: /island|კუნძ|остров/, label: { ka: "კუნძული", ru: "остров", en: "island" } },
  glass: { match: /glass|vitrine|მინის|ვიტრინ|стекл|витрин/, label: { ka: "მინა", ru: "стекло", en: "glass" } },
  mirror: { match: /mirror|bronze|სარკ|ბრინჯაო|зеркал|бронз/, label: { ka: "სარკე", ru: "зеркало", en: "mirror" } },
  bathroom: { match: /bath|vanity|აბაზან|ванн/, label: { ka: "აბაზანა", ru: "ванная", en: "bathroom" } },
  bedroom: { match: /bedroom|headboard|საძინებ|спальн/, label: { ka: "საძინებელი", ru: "спальня", en: "bedroom" } },
  hallway: { match: /hall|entry|შემოსასვლ|დერეფ|прихож|коридор/, label: { ka: "შემოსასვლელი", ru: "прихожая", en: "hallway" } },
  kids: { match: /kid|child|საბავშვ|ბავშვ|детск/, label: { ka: "საბავშვო", ru: "детская", en: "kids room" } },
  media: { match: /media|\btv\b|ტელევიზ|\bтв\b|телевиз|гостин|living|მისაღებ/, label: { ka: "TV კედელი", ru: "ТВ-зона", en: "media wall" } },
  wine: { match: /wine|ღვინ|вин[оа]/, label: { ka: "ღვინის თარო", ru: "винный шкаф", en: "wine storage" } },
  office: { match: /office|boardroom|ოფის|офис|переговор/, label: { ka: "ოფისი", ru: "офис", en: "office" } },
  cafe: { match: /caf[eé]|restaurant|კაფე|რესტორ|кафе|ресторан/, label: { ka: "კაფე", ru: "кафе", en: "café" } },
  reception: { match: /reception|lobby|hotel|ლობი|რეცეფც|მიმღებ|სასტუმრ|ресепш|лобби|отел/, label: { ka: "ლობი", ru: "лобби", en: "lobby" } },
  fluted: { match: /flut|slat|რელიეფ|ლამელ|рельеф|ламел/, label: { ka: "რელიეფური", ru: "рельеф", en: "fluted" } },
};

const CATEGORIES: Record<AssistantCategory, { match: RegExp; label: Record<Locale, string> }> = {
  kitchens: { match: /kitchen|კუხნ|სამზარეულ|кухн/, label: { ka: "სამზარეულო", ru: "Кухня", en: "Kitchen" } },
  "wardrobes-storage": { match: /wardrobe|closet|storage|კარად|გარდერობ|шкаф|гардероб|хранен/, label: { ka: "კარადა", ru: "Шкаф", en: "Wardrobe" } },
  "commercial-spaces": { match: /commercial|office|caf[eé]|restaurant|hotel|reception|lobby|კომერც|ოფის|კაფე|სასტუმრ|რესტორ|ლობი|коммерч|офис|кафе|отел|ресторан|ресепш|лобби/, label: { ka: "კომერციული სივრცე", ru: "Коммерческий интерьер", en: "Commercial space" } },
  "home-interiors": { match: /panel|interior|bedroom|bath|living|media wall|პანელ|ინტერიერ|საძინებ|აბაზან|მისაღებ|панел|интерьер|спальн|ванн|гостин/, label: { ka: "ინტერიერი", ru: "Интерьер", en: "Interior" } },
};

/* Words that mean "show me something". Georgian avoids bare ნახ- (ნახაზი = drawing). */
const SHOW_INTENT = /show|see |photo|picture|image|example|portfolio|gallery|look like|inspir|project|more|მაჩვენ|ვნახო|ნახვა|ნახე|ფოტო|სურათ|მაგალით|გალერე|ნამუშევ|პროექტ|კიდევ|покаж|посмотр|увидеть|фото|картин|пример|галере|работ|портфолио|проект|ещ[её]/;

const P = (file: string, category: AssistantCategory, tags: Tag[] = []) => ({ src: `/furniture/${file}-tbilisi-kencho-group.webp`, category, tags });
const LIBRARY = [
  P("walnut-island-kitchen", "kitchens", ["walnut", "island", "white"]),
  P("green-island-kitchen", "kitchens", ["green", "island"]),
  P("white-oak-island-kitchen", "kitchens", ["white", "oak", "island"]),
  P("black-marble-kitchen", "kitchens", ["black", "marble"]),
  P("glazed-partition-kitchen", "kitchens", ["white", "oak", "glass"]),
  P("dark-walnut-kitchen", "kitchens", ["walnut", "black"]),
  P("green-marble-kitchen", "kitchens", ["green", "marble"]),
  P("grey-marble-kitchen", "kitchens", ["grey", "marble"]),
  P("oak-island-kitchen-shelves", "kitchens", ["oak", "island"]),
  P("classic-white-kitchen", "kitchens", ["white"]),
  P("walnut-and-concrete-kitchen", "kitchens", ["walnut", "grey"]),
  P("black-oak-kitchen-dining", "kitchens", ["black", "oak"]),
  P("green-corner-kitchen", "kitchens", ["green"]),
  P("green-kitchen-glazed-partition", "kitchens", ["green", "glass"]),
  P("grey-kitchen-vitrine", "kitchens", ["grey", "glass"]),
  P("grey-l-shaped-kitchen", "kitchens", ["grey"]),
  P("fluted-oak-panel-detail", "kitchens", ["oak", "fluted", "island"]),
  P("kitchen-island-staircase", "kitchens", ["island"]),
  P("oak-graphite-kitchen", "kitchens", ["oak", "grey"]),
  P("oak-kitchenette", "kitchens", ["oak"]),
  P("open-plan-kitchen-media-wall", "kitchens", ["media"]),
  P("travertine-kitchen-detail", "kitchens", ["marble"]),
  P("walnut-oven-column", "kitchens", ["walnut"]),
  P("walnut-upper-cabinets-kitchen", "kitchens", ["walnut", "white"]),
  P("white-minimal-kitchen-run", "kitchens", ["white"]),
  P("white-oak-kitchen-wall", "kitchens", ["white", "oak"]),
  P("white-oven-column-walnut-kitchen", "kitchens", ["white", "walnut"]),
  P("white-wood-kitchen-corner", "kitchens", ["white", "oak"]),
  P("built-in-oven-column", "kitchens"),
  P("kitchen-sink-detail", "kitchens"),
  P("built-in-wine-rack", "kitchens", ["wine"]),
  P("wine-rack-glass-door", "kitchens", ["wine", "glass"]),
  P("bronze-mirror-wardrobe", "wardrobes-storage", ["mirror"]),
  P("oak-framed-wardrobe", "wardrobes-storage", ["oak", "white"]),
  P("cane-entryway-wardrobe", "wardrobes-storage", ["hallway"]),
  P("white-hallway-wardrobes", "wardrobes-storage", ["white", "hallway"]),
  P("flush-white-wardrobe-wall", "wardrobes-storage", ["white"]),
  P("grey-hallway-built-ins", "wardrobes-storage", ["grey", "hallway"]),
  P("hallway-mirror-unit", "wardrobes-storage", ["hallway", "mirror"]),
  P("oak-framed-wardrobe-hall", "wardrobes-storage", ["oak", "hallway"]),
  P("white-bedroom-wardrobe", "wardrobes-storage", ["white", "bedroom"]),
  P("white-built-in-wardrobe", "wardrobes-storage", ["white"]),
  P("white-wardrobe-teal-bedroom", "wardrobes-storage", ["white", "bedroom"]),
  P("commercial-lobby-lounge", "commercial-spaces", ["reception"]),
  P("cafe-fluted-counter", "commercial-spaces", ["cafe", "fluted"]),
  P("office-walnut-wall-unit", "commercial-spaces", ["office", "walnut"]),
  P("commercial-reception-desk", "commercial-spaces", ["reception"]),
  P("cafe-arched-shelving", "commercial-spaces", ["cafe"]),
  P("office-boardroom-furniture", "commercial-spaces", ["office"]),
  P("commercial-lobby-mirror-wall", "commercial-spaces", ["reception", "mirror"]),
  P("office-walnut-corridor", "commercial-spaces", ["office", "walnut"]),
  P("office-kitchen-island", "commercial-spaces", ["office", "island"]),
  P("commercial-lobby-bench", "commercial-spaces", ["reception"]),
  P("commercial-lobby-partition", "commercial-spaces", ["reception"]),
  P("living-room-media-wall", "home-interiors", ["media", "walnut"]),
  P("walnut-panel-bedroom", "home-interiors", ["walnut", "bedroom"]),
  P("zellige-bathroom-vanity", "home-interiors", ["bathroom"]),
  P("backlit-slat-wall-mirror", "home-interiors", ["mirror", "fluted"]),
  P("walnut-headboard-bedroom", "home-interiors", ["walnut", "bedroom"]),
  P("grey-bathroom-vanity", "home-interiors", ["bathroom", "grey"]),
  P("bedroom-desk-unit", "home-interiors", ["bedroom"]),
  P("kids-room-furniture", "home-interiors", ["kids"]),
];

export const ASSISTANT_MEDIA_SOURCES: ReadonlySet<string> = new Set(LIBRARY.map(photo => photo.src));

export function detectCategory(texts: string[]): AssistantCategory | null {
  for (const text of texts) {
    const q = text.toLowerCase();
    const found = (Object.keys(CATEGORIES) as AssistantCategory[]).find(slug => CATEGORIES[slug].match.test(q));
    if (found) return found;
  }
  return null;
}

/**
 * @param userTexts newest first; the newest message decides intent, older ones
 *   only fill in the category for follow-ups such as "show me more".
 * @param shown sources already displayed in this conversation, skipped first.
 */
export function assistantUi(userTexts: string[], locale: Locale, shown: string[] = [], limit = 4): AssistantUi {
  const latest = (userTexts[0] ?? "").toLowerCase();
  const tags = (Object.keys(TAGS) as Tag[]).filter(tag => TAGS[tag].match.test(latest));
  const category = detectCategory(userTexts);
  const wantsMedia = SHOW_INTENT.test(latest) || tags.length > 0;
  if (!wantsMedia) return { category, media: [] };

  const seen = new Set(shown);
  const scored = LIBRARY
    .filter(photo => !category || photo.category === category)
    .map((photo, order) => ({ photo, order, score: photo.tags.filter(tag => tags.includes(tag)).length }))
    .filter(entry => !tags.length || entry.score > 0 || category)
    .sort((a, b) => b.score - a.score || Number(seen.has(a.photo.src)) - Number(seen.has(b.photo.src)) || a.order - b.order);

  let picks = scored.map(entry => entry.photo);
  if (!category && !tags.length) {
    // A general "show me your work": one of each category, unseen first.
    picks = (Object.keys(CATEGORIES) as AssistantCategory[]).flatMap(slug => {
      const pool = LIBRARY.filter(photo => photo.category === slug);
      return [pool.find(photo => !seen.has(photo.src)) ?? pool[0]];
    });
  }

  const media = picks.slice(0, limit).map(photo => {
    const words = photo.tags.slice(0, 2).map(tag => TAGS[tag].label[locale]);
    const caption = [CATEGORIES[photo.category].label[locale], ...words].join(" · ");
    return { src: photo.src, caption, alt: `${caption} — Kencho Group` };
  });
  return { category, media };
}
