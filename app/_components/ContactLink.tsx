"use client";

import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics";
import { getRefCode } from "@/lib/lead-ref";
import { SITE, whatsappUrl } from "@/lib/site";

export default function ContactLink({
  method,
  about = "",
  className = "",
  children,
}: {
  method: "whatsapp" | "phone";
  about?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const message = about
    ? t("photoPrefill", { title: about })
    : t("whatsappPrefill");
  return (
    <a
      href={method === "phone" ? `tel:${SITE.phoneHref}` : whatsappUrl(message)}
      target={method === "whatsapp" ? "_blank" : undefined}
      rel={method === "whatsapp" ? "noopener noreferrer" : undefined}
      className={className}
      onClick={(event) => {
        const code = getRefCode();
        if (method === "whatsapp" && code)
          event.currentTarget.href = whatsappUrl(
            `${message} ${t("codeSuffix", { code })}`,
          );
        track("Contact", { method, code, page: about || undefined });
      }}
    >
      {children}
    </a>
  );
}
