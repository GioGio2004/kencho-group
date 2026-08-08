import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { IMAGES, src } from "@/lib/images";

/*
 * THE ROOMS — the gallery, previewed from the home page.
 *
 * Four cards floating over a full-bleed photograph, each the door to
 * one of the admin-managed galleries. A server component end to end:
 * the backdrop's depth and the cards' arrival are ScrollFX attributes
 * ([data-fx="parallax"] with an inner layer, [data-fx="clip"]), so
 * everything here is in the served HTML and animates without shipping
 * a line of page-specific script.
 *
 * The card list is curated and static on purpose — these four slugs
 * are the standing collection. A renamed slug in the admin means
 * updating ROOMS here; new galleries appear on /gallery without any
 * change.
 */

const ROOMS = [
  { key: "kitchens", slug: "kitchens", image: IMAGES.portfolio12 },
  { key: "wardrobes", slug: "wardrobes-storage", image: IMAGES.portfolio09 },
  { key: "commercial", slug: "commercial-spaces", image: IMAGES.portfolio07 },
  { key: "interiors", slug: "home-interiors", image: IMAGES.roomInteriors },
] as const;

export default async function GalleryRooms({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "rooms" });
  const tGallery = await getTranslations({ locale, namespace: "gallery" });

  return (
    <section
      id="rooms"
      aria-labelledby="rooms-title"
      className="rooms relative overflow-hidden"
    >
      {/* The wall the show hangs on: one photograph, running slow. */}
      <div
        aria-hidden="true"
        data-fx="parallax"
        data-fx-speed="0.6"
        className="rooms-backdrop"
      >
        <div data-fx-inner className="rooms-backdrop-inner">
          <Image
            src={src(IMAGES.portfolio15, 1600)}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>

      <div className="relative z-[1] mx-auto w-full max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32 lg:py-40">
        <p className="u-eyebrow rooms-eyebrow">{t("eyebrow")}</p>
        <h2
          id="rooms-title"
          className="u-display mt-5 max-w-[16ch] text-[clamp(2rem,6vw,4.2rem)] text-bone"
        >
          {t("title")}
        </h2>

        <ul className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-2">
          {ROOMS.map((room) => (
            <li key={room.key}>
              <Link
                href={`/gallery/${room.slug}`}
                data-fx="clip"
                className="room-card u-press"
              >
                <Image
                  src={src(room.image, 1200)}
                  alt={room.image.alt}
                  fill
                  sizes="(min-width: 768px) 44vw, 92vw"
                  className="object-cover"
                />
                <span className="room-card-copy">
                  <span className="u-display room-card-name">
                    {t(`items.${room.key}.name`)}
                  </span>
                  <span className="room-card-line">
                    {t(`items.${room.key}.line`)}
                  </span>
                  <span className="gx-mono room-card-meta">
                    [ {tGallery("view")}{" "}
                    <span aria-hidden="true" className="gx-chapter-arrow">
                      →
                    </span>{" "}
                    ]
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
