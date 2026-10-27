"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ComponentPropsWithRef } from "react";
import { track } from "@/lib/analytics";
import { getEnquiryAttribution, getRefCode } from "@/lib/lead-ref";
import { SITE, whatsappUrl } from "@/lib/site";

export default function ContactLink({
  method,
  about = "",
  message: customMessage,
  className = "",
  children,
  ...anchorProps
}: {
  method: "whatsapp" | "phone";
  about?: string;
  message?: string;
} & Omit<ComponentPropsWithRef<"a">, "href" | "onClick">) {
  const t = useTranslations("common");
  const locale = useLocale();
  const message = customMessage ?? (about
    ? t("photoPrefill", { title: about })
    : t("whatsappPrefill"));
  return (
    <a
      {...anchorProps}
      data-contact-method={method}
      href={method === "phone" ? `tel:${SITE.phoneHref}` : whatsappUrl(message)}
      target={method === "whatsapp" ? "_blank" : undefined}
      rel={method === "whatsapp" ? "noopener noreferrer" : undefined}
      className={className}
      onClick={(event) => {
        const code = getRefCode();
        const attribution = getEnquiryAttribution(locale);
        if (method === "whatsapp" && code)
          event.currentTarget.href = whatsappUrl(
            message + t("attributionSuffix", {
              code,
              locale,
              page: attribution.page,
              source: attribution.utm_source || attribution.source || t("directSource"),
              referrer: attribution.referrer || t("directSource"),
              landing: attribution.landing,
            }),
          );
        track("Contact", { method, code, ...attribution, about: about || undefined });
      }}
    >
      {children}
    </a>
  );
}
