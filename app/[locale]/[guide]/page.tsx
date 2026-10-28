import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ProjectGuide from "@/app/_components/ProjectGuide";
import ContactLink from "@/app/_components/ContactLink";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { pageMetadata } from "@/lib/page-metadata";
import { breadcrumbLd } from "@/lib/structured-data";
const guides = { process: "Process", "design-pricing": "Pricing", materials: "Materials" } as const;
type Props = { params: Promise<{ locale: string; guide: string }> };
function valid(guide: string): guide is keyof typeof guides { return guide in guides; }
export async function generateMetadata({ params }: Props) {
  const { locale, guide } = await params;
  if (!hasLocale(routing.locales, locale) || !valid(guide)) notFound();
  return pageMetadata({ locale, path: `/${guide}`, namespace: `home.meta${guides[guide]}`, image: "/furniture/walnut-island-kitchen-tbilisi-kencho-group.webp" });
}
export default async function GuidePage({ params }: Props) {
  const { locale, guide } = await params;
  if (!hasLocale(routing.locales, locale) || !valid(guide)) notFound();
  setRequestLocale(locale);
  const c = await getTranslations({ locale, namespace: "home.compact" });
  const t = await getTranslations({ locale, namespace: `home.meta${guides[guide]}` });
  const ld = await breadcrumbLd(locale, { name: t("title"), path: `/${guide}` });
  return <main className="project-guide pt-28">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
    <ProjectGuide locale={locale} guide={guide} />
    <nav className="editorial-shell guide-related" aria-label={c("more")}>
      <Link href="/process">{c("processLink")} ↗</Link>
      <Link href="/design-pricing">{c("pricingLink")} ↗</Link>
      <Link href="/materials">{c("materialsLink")} ↗</Link>
      <ContactLink method="whatsapp" about={`Project guide: ${guide}`}>WhatsApp ↗</ContactLink>
    </nav>
  </main>;
}
