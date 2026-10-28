/* Full-resolution site-owned photography for the public showcase.
 * Kept separate from IMAGES: social cards and business schema retain their assets. */
export const SHOWCASE_PHOTOS = {
  hero: {
    src: "/furniture/glazed-partition-kitchen-tbilisi-kencho-group.webp",
    width: 2048, height: 1792,
    alt: {
      ka: "ინდივიდუალური სამზარეულო თეთრი ფასადებით, მუხის კარადებითა და განათებული მინის ვიტრინით",
      ru: "Кухня на заказ с белыми фасадами, дубовыми шкафами и подсвеченной стеклянной витриной",
      en: "Custom kitchen with white fronts, oak cabinets and an illuminated glass display cabinet",
    },
  },
  kitchens: {
    src: "/furniture/white-oak-kitchen-wall-tbilisi-kencho-group.webp",
    width: 2048, height: 1364,
    alt: {
      ka: "თეთრი სამზარეულოს კარადები მუხის ზედა ფასადებითა და ჩაშენებული ღუმლით",
      ru: "Белая кухонная мебель с дубовыми верхними фасадами и встроенной духовкой",
      en: "White kitchen cabinetry with oak upper fronts and an integrated oven",
    },
  },
  wardrobes: {
    src: "/furniture/oak-framed-wardrobe-tbilisi-kencho-group.webp",
    width: 2048, height: 1778,
    alt: {
      ka: "კედლის სიმაღლის ჩაშენებული კარადა მუხის ჩარჩოებითა და თეთრი პანელებით",
      ru: "Встроенный шкаф до потолка с дубовыми рамами и белыми дверными панелями",
      en: "Floor-to-ceiling fitted wardrobe with oak frames and white door panels",
    },
  },
  commercial: {
    src: "/furniture/commercial-lobby-lounge-tbilisi-kencho-group.webp",
    width: 2048, height: 1365,
    alt: {
      ka: "კომერციული სივრცის ინტერიერი ხის ლამელებითა და მეტალის კარკასის თაროებით",
      ru: "Коммерческий интерьер с деревянными ламелями и стеллажами на металлическом каркасе",
      en: "Commercial interior with timber slats and metal-framed display shelving",
    },
  },
  interiors: {
    src: "/furniture/walnut-panel-bedroom-tbilisi-kencho-group.webp",
    width: 2048, height: 1536,
    alt: {
      ka: "საძინებლის ინტერიერი ხის კედლის პანელითა და ინდივიდუალური ტუმბოებით",
      ru: "Интерьер спальни с деревянной стеновой панелью и прикроватными тумбами на заказ",
      en: "Bedroom interior with a timber wall panel and made-to-measure bedside cabinets",
    },
  },
  materials: {
    src: "/furniture/walnut-upper-cabinets-kitchen-tbilisi-kencho-group.webp",
    width: 2000, height: 1334,
    alt: {
      ka: "კაკლის ხის ტექსტურა სამზარეულოს ზედა კარადებზე და თეთრი სამუშაო ზედაპირი",
      ru: "Фактура ореха на верхних кухонных шкафах и белая рабочая поверхность",
      en: "Walnut grain on upper kitchen cabinets above a white worktop",
    },
  },
} as const;

type ShowcasePhoto = (typeof SHOWCASE_PHOTOS)[keyof typeof SHOWCASE_PHOTOS];
export function showcasePhotoAlt(photo: ShowcasePhoto, locale: string): string {
  return photo.alt[locale as keyof typeof photo.alt] ?? photo.alt.en;
}
