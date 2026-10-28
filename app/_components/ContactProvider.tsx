"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { gsap } from "gsap";
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
 * It moves like the landing page: the panel glides in on a long expo
 * ease while the room behind it dims, and its contents rise one after
 * another. Closing plays the same in reverse before the dialog closes.
 *
 * `about` is the catalogue page the visitor was looking at, so the
 * WhatsApp message and the lead both say which photograph sold them.
 */

type OpenOptions = { about?: string };

const ContactContext = createContext<(options?: OpenOptions) => void>(() => {});

export function useContact() {
  return useContext(ContactContext);
}

const calm = () => matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)").matches;
const phone = () => matchMedia("(max-width: 767px)").matches;

export default function ContactProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("contact");
  const tc = useTranslations("common");
  const dialog = useRef<HTMLDialogElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const motion = useRef<gsap.core.Timeline | null>(null);
  const release = useRef<(() => void) | null>(null);
  const closing = useRef(false);
  const [about, setAbout] = useState("");
  // Reset the enquiry context whenever the sheet opens.
  const [session, setSession] = useState(0);

  /* First touch: remember the ?ref= / utm tag the visitor arrived with. */
  useEffect(() => {
    captureSource();
    return () => {
      motion.current?.kill();
      release.current?.();
    };
  }, []);

  const open = useCallback((options?: OpenOptions) => {
    setAbout(options?.about ?? "");
    setSession((n) => n + 1);
  }, []);

  /* After the fresh panel is in the DOM and before it paints: open the
   * dialog and play the entrance on the new nodes. */
  useLayoutEffect(() => {
    const el = dialog.current;
    const sheet = panel.current;
    if (session === 0 || !el || !sheet || !scrim.current) return;
    if (!el.open) {
      release.current = lockPage();
      el.showModal();
    }
    closing.current = false;
    motion.current?.kill();
    const items = sheet.querySelectorAll("[data-sheet-item]");
    if (calm()) {
      gsap.set(sheet, { xPercent: 0, yPercent: 0 });
      motion.current = gsap.timeline()
        .fromTo([scrim.current, sheet], { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "none" });
      return;
    }
    const away = phone() ? { yPercent: 100, xPercent: 0 } : { xPercent: 100, yPercent: 0 };
    motion.current = gsap.timeline({ defaults: { overwrite: "auto" } })
      .fromTo(scrim.current, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: "power2.out" }, 0)
      .fromTo(sheet, { ...away, opacity: 1 }, { xPercent: 0, yPercent: 0, duration: 1.05, ease: "expo.out" }, 0)
      .fromTo(items, { y: 34, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.07, clearProps: "transform",
      }, 0.2);
  }, [session]);

  const close = useCallback(() => {
    const el = dialog.current;
    const sheet = panel.current;
    if (!el?.open || !sheet || !scrim.current || closing.current) return;
    closing.current = true;
    motion.current?.kill();
    const done = () => el.close();
    if (calm()) {
      motion.current = gsap.timeline({ onComplete: done })
        .to([scrim.current, sheet], { opacity: 0, duration: 0.25, ease: "none" });
      return;
    }
    const away = phone() ? { yPercent: 100 } : { xPercent: 100 };
    motion.current = gsap.timeline({ onComplete: done })
      .to(sheet.querySelectorAll("[data-sheet-item]"), {
        y: -14, opacity: 0, duration: 0.3, ease: "power2.in", stagger: 0.025,
      }, 0)
      .to(sheet, { ...away, duration: 0.7, ease: "power3.inOut" }, 0.12)
      .to(scrim.current, { opacity: 0, duration: 0.55, ease: "power2.inOut" }, 0.25);
  }, []);

  return (
    <ContactContext.Provider value={open}>
      {children}
      <dialog
        ref={dialog}
        className="sheet"
        aria-label={t("dialog")}
        data-lenis-prevent
        onKeyDown={containDialogTab}
        onCancel={(event) => {
          // Esc closes through the same exit as the close button.
          event.preventDefault();
          close();
        }}
        onClose={() => {
          motion.current?.kill();
          motion.current = null;
          closing.current = false;
          release.current?.();
          release.current = null;
        }}
      >
        <div ref={scrim} className="sheet-scrim" aria-hidden="true" onClick={close} />
        <div ref={panel} className="sheet-panel">
          <div className="sheet-grip" aria-hidden="true"><span /></div>
          <button
            type="button"
            onClick={close}
            className="sheet-close"
            aria-label={tc("close")}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.4"
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
