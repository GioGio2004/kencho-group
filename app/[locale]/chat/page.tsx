import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AssistantChat from "@/app/_components/AssistantChat";

export async function generateMetadata({ params }: PageProps<"/[locale]/chat">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "assistant" });
  return { title: "Kencho AI", description: t("welcomeText"), alternates: { canonical: `/${locale}/chat` }, robots: { index: false, follow: true } };
}
export default async function ChatPage({ params }: PageProps<"/[locale]/chat">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AssistantChat key={locale} />;
}
