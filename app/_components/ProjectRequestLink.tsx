"use client";

import { useTranslations } from "next-intl";
import type { ComponentPropsWithRef } from "react";
import { Link } from "@/i18n/navigation";

/** All public request CTAs lead to the dedicated Contact page. */
export default function ProjectRequestLink({ children, ...props }: Omit<ComponentPropsWithRef<"a">, "href">) {
  const t = useTranslations("request");
  return <Link {...props} href="/contact#project-request">{children ?? <>{t("cta")} <span aria-hidden="true">↗</span></>}</Link>;
}
