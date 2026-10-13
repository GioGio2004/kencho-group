"use client";
import { useTranslations } from "next-intl";
import ContactLink from "@/app/_components/ContactLink";
import { SITE } from "@/lib/site";

/* data-sheet-item marks what rises in turn when the contact sheet opens
 * (ContactProvider); on the /contact page the attribute does nothing. */
export default function ContactPanel({
  about = "",
  headingLevel = "h2",
}: {
  about?: string;
  headingLevel?: "h1" | "h2";
}) {
  const t = useTranslations("contact");
  const h = useTranslations("home");
  const Heading = headingLevel;
  return (
    <div className="contact-panel">
      <p className="home-eyebrow" data-sheet-item>
        <span className="contact-rule" aria-hidden="true" />
        Kencho Group · Tbilisi
      </p>
      <Heading className="u-display pr-8 text-[clamp(1.7rem,3vw,2.25rem)]" data-sheet-item>
        {t("title")}
      </Heading>
      <p className="contact-intro" data-sheet-item>{h("contactIntro")}</p>
      {about && <p className="contact-about" data-sheet-item>{t("about", { title: about })}</p>}
      <div className="contact-channels" data-sheet-item>
        <ContactLink
          method="whatsapp"
          about={about}
          className="btn contact-whatsapp"
        >
          <WhatsAppIcon />
          {t("whatsapp")}
        </ContactLink>
        <ContactLink method="phone" className="btn btn-line contact-call">
          {t("call", { phone: SITE.phone })}
        </ContactLink>
      </div>
      <div className="contact-prepare" data-sheet-item>
        <p>{h("contactPrepare")}</p>
      </div>
    </div>
  );
}

export function WhatsAppIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20.5 11.5a8.5 8.5 0 0 1-12.9 7.3L3 20l1.3-4.4A8.5 8.5 0 1 1 20.5 11.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 7.5c-.8 3.8 3 7.5 6.5 7.8l1-1.8-2.2-1-1 1c-1.4-.6-2.6-1.8-3.2-3.2l1-1L9 7.5H8Z"
        fill="currentColor"
      />
    </svg>
  );
}
