"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import WorkLink from "@/app/_components/WorkLink";
import { IMAGES, src } from "@/lib/images";

const services = [
  { key: "kitchens", slug: "kitchens", image: src(IMAGES.heroGreen) },
  { key: "wardrobes", slug: "wardrobes-storage", image: src(IMAGES.heroCane) },
  { key: "home-interiors", slug: "home-interiors", image: src(IMAGES.heroWalnut) },
  { key: "offices", slug: "commercial-spaces", image: "/furniture/backlit-slat-wall-mirror-tbilisi-kencho-group.webp" },
];

export default function HomeServices() {
  const t = useTranslations("home");
  const [active, setActive] = useState(0);

  return (
    <section id="work" className="home-services home-shell" aria-labelledby="services-heading">
      <div className="services-heading" data-reveal>
        <div>
          <p className="home-eyebrow">{t("servicesLabel")}</p>
          <h2 id="services-heading">{t("servicesTitle")}</h2>
        </div>
        <WorkLink href="/gallery" className="home-text-link">
          {t("allWork")} <span aria-hidden="true">↗</span>
        </WorkLink>
      </div>
      <figure className="service-preview" aria-hidden="true">
        <div className="service-preview-frame" data-parallax-frame>
          {services.map((service, i) => (
            <Image
              key={service.key}
              src={service.image}
              alt=""
              fill
              sizes="(max-width: 767px) 100vw, 45vw"
              className="service-preview-image"
              data-active={active === i}
            />
          ))}
          <span className="service-preview-mark">K / G</span>
        </div>
        <figcaption>
          <span>{t("services." + services[active].key + ".title")}</span>
          <span>0{active + 1} / 04</span>
        </figcaption>
      </figure>
      <div className="service-list">
        {services.map((service, i) => (
          <WorkLink href={"/gallery/" + service.slug} className="service-row" key={service.key}
            onPointerEnter={() => setActive(i)} onFocus={() => setActive(i)}>
            <span className="service-number" aria-hidden="true">0{i + 1}</span>
            <div className="service-description">
              <h3>{t("services." + service.key + ".title")}</h3>
              <p>{t("services." + service.key + ".line")}</p>
            </div>
            <span className="service-arrow" aria-hidden="true">↗</span>
          </WorkLink>
        ))}
      </div>
    </section>
  );
}
