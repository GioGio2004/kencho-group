"use client";
import { useEffect } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { rememberChatOrigin, restoreChatScroll } from "@/lib/chat-navigation";

export default function FloatingIslandBar() {
  const t = useTranslations("home.aiIsland");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => restoreChatScroll(), [pathname]);
  useEffect(() => {
    const open = (event: Event) => {
      rememberChatOrigin();
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (typeof prompt === "string") {
        try { sessionStorage.setItem("kg:chat-prompt", prompt.slice(0, 3000)); } catch { /* Navigation remains available. */ }
      }
      const returnTo = location.pathname + location.search + location.hash;
      router.push({ pathname: "/chat", query: { returnTo } }, { scroll: false });
    };
    window.addEventListener("kencho:open-ai", open);
    window.addEventListener("kencho:ai-open", open);
    return () => {
      window.removeEventListener("kencho:open-ai", open);
      window.removeEventListener("kencho:ai-open", open);
    };
  }, [router]);
  if (pathname === "/chat") return null;
  return <div data-floating-island className="ai-dock">
    <Link href={{ pathname: "/chat", query: { returnTo: `/${locale}${pathname === "/" ? "" : pathname}` } }} scroll={false} data-ai-trigger className="ai-launcher" onClick={event => {
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) rememberChatOrigin();
    }}>
      <MessageCircle size={18} strokeWidth={1.6} aria-hidden="true" />
      <span className="ai-launcher-label">{t("pillLabel")}</span>
      <span className="ai-launcher-send" aria-hidden="true"><ArrowUp size={15} /></span>
    </Link>
  </div>;
}
