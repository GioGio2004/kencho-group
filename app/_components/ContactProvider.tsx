"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import ContactPanel from "@/app/_components/ContactPanel";
import { captureSource } from "@/lib/lead-ref";
import { containDialogTab, lockPage } from "@/lib/modal-lock";

/*
 * THE CONTACT SHEET — "Get in touch", from anywhere.
 *
 * The navbar button, the footer and every catalogue page's "Get a quote
 * for this" call openContact(). There is one <dialog> for the whole
 * site: showModal() puts it in the top layer (above the catalogue
 * viewer), traps focus, and closes on Esc without any of it hand-built.
 *
 * `about` is the catalogue page the visitor was looking at, so the
 * WhatsApp message and the lead both say which photograph sold them.
 */

type OpenOptions = { about?: string };

const ContactContext = createContext<(options?: OpenOptions) => void>(() => {});

export function useContact() {
  return useContext(ContactContext);
}

export default function ContactProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("contact");
  const tc = useTranslations("common");
  const dialog = useRef<HTMLDialogElement>(null);
  const release = useRef<(() => void) | null>(null);
  const [about, setAbout] = useState("");
  // Reset the enquiry context whenever the sheet opens.
  const [session, setSession] = useState(0);

  /* First touch: remember the ?ref= / utm tag the visitor arrived with. */
  useEffect(() => {
    captureSource();
    return () => release.current?.();
  }, []);

  const open = useCallback((options?: OpenOptions) => {
    setAbout(options?.about ?? "");
    setSession((n) => n + 1);
    const el = dialog.current;
    if (el && !el.open) {
      release.current = lockPage();
      el.showModal();
    }
  }, []);

  const close = () => dialog.current?.close();

  return (
    <ContactContext.Provider value={open}>
      {children}
      <dialog
        ref={dialog}
        className="sheet"
        aria-label={t("dialog")}
        data-lenis-prevent
        onKeyDown={containDialogTab}
        onClose={() => {
          release.current?.();
          release.current = null;
        }}
        onClick={(e) => {
          // A click on the backdrop lands on the dialog element itself.
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="relative p-6 pt-5 sm:p-8">
          <div
            className="mb-4 flex justify-center sm:hidden"
            aria-hidden="true"
          >
            <span className="h-1 w-10 rounded-full bg-line" />
          </div>
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 grid size-11 place-items-center rounded-full text-ink/60 transition-colors hover:bg-cream hover:text-ink sm:top-6 sm:right-6"
            aria-label={tc("close")}
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <ContactPanel key={session} about={about} />
        </div>
      </dialog>
    </ContactContext.Provider>
  );
}
