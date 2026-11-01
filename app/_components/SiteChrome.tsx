"use client";
import { usePathname } from "@/i18n/navigation";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  return usePathname() === "/chat" ? null : children;
}
