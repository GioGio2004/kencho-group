"use client";

import { createContext, useCallback, useContext, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { captureSource } from "@/lib/lead-ref";

export const REQUEST_CONTEXT_KEY = "kg:request-context";
const ContactContext = createContext<(options?: { about?: string }) => void>(() => {});
export const useContact = () => useContext(ContactContext);

/** Request links navigate to Contact; no global form dialog is mounted. */
export default function ContactProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => { captureSource(); }, []);
  const open = useCallback((options?: { about?: string }) => {
    try {
      if (options?.about) sessionStorage.setItem(REQUEST_CONTEXT_KEY, options.about.slice(0, 1000));
      else sessionStorage.removeItem(REQUEST_CONTEXT_KEY);
    } catch { /* Contact remains usable when browser storage is unavailable. */ }
    window.dispatchEvent(new Event(REQUEST_CONTEXT_KEY));
    router.push("/contact#project-request");
  }, [router]);
  return <ContactContext.Provider value={open}>{children}</ContactContext.Provider>;
}
