"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ComponentPropsWithRef } from "react";
import { track } from "@/lib/analytics";
import { getEnquiryAttribution, getRefCode } from "@/lib/lead-ref";
import { SITE, whatsappUrl } from "@/lib/site";
import { Link } from "@/i18n/navigation";

export default function ContactLink({
  method,
  about = "",
  message: customMessage,
  className = "",
  direct = false,
  children,
  ...anchorProps
}: {
  method: "whatsapp" | "phone";
  about?: string;
  message?: string;
  /** Direct partner channels are deliberately limited to the footer. */
  direct?: boolean;
} & Omit<ComponentPropsWithRef<"a">, "href" | "onClick">) {
  const t = useTranslations("common");
  const request = useTranslations("request");
  const locale = useLocale();
  const message = customMessage ?? (about
    ? t("photoPrefill", { title: about })
    : t("whatsappPrefill"));
  if (!direct) {
    return <Link {...anchorProps} href="/contact#project-request" className={className}>
      {request("cta")} <span aria-hidden="true">↗</span>
    </Link>;
  }
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
