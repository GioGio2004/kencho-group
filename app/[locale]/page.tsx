import HomeDetails from "@/app/_components/HomeDetails";
import ProcessOverview from "@/app/_components/ProcessOverview";
import FeaturedGallery from "@/app/_components/FeaturedGallery";
import BrandHero from "@/app/_components/BrandHero";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
export const revalidate = 300;
export function generateStaticParams() { return routing.locales.map(locale => ({ locale })); }
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <main className="showcase-home">
    <BrandHero locale={locale} />
    <FeaturedGallery locale={locale} />
    <ProcessOverview locale={locale} />
    <HomeDetails locale={locale} />
  </main>;
}
