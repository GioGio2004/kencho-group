"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import AnalyticsScripts from "./AnalyticsScripts";
import { captureAttribution } from "@/lib/attribution";

export default function LaunchContext({ vercel }: { vercel: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    captureAttribution();
  }, [pathname]);

  return (
    <>
      <AnalyticsScripts />
      {vercel && (
        <Analytics
          beforeSend={(event) => ({
            ...event,
            url: new URL(event.url).origin + new URL(event.url).pathname,
          })}
        />
      )}
    </>
  );
}
