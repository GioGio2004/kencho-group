"use client";

import { useActionState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import LocaleSwitch from "@/app/_components/LocaleSwitch";
import MagneticType from "@/app/_components/MagneticType";
import RevealText from "@/app/_components/RevealText";
import ScrambleText from "@/app/_components/ScrambleText";
import ThemeToggle from "@/app/_components/ThemeToggle";
import { submitLead } from "@/app/actions";
import { track } from "@/lib/analytics";
import { DUR, EASE, REVEAL_START, STAGGER } from "@/lib/motion";
import { SITE, whatsappUrl } from "@/lib/site";

/*
 * FOOTER — the reference's closing construction, on this site's paper.
 * =====================================================================
 * A light sheet ruled into columns by hairlines (the reference's cream
 * footer, resolved through the theme so it is stone by day and coal by
 * night), then the poster-scale wordmark, then the closing bar with a
 * client's own words in the middle of it.
 *
 * The callback form lives in the wide right column — the slot the
 * reference gives its enquiry boxes — so absorbing the old contact band
 * into the voyage construction cost the home page nothing: WhatsApp is
 * the door on the closing plate above, the form is the quiet fallback
 * here, on every page.
 */

/*
 * Real routes, not section hashes. Since the site split into pages,
 * every one of these has its own URL — and a hash link from a routed
 * page would be intercepted by SmoothScroll and find no section to go
 * to. On the home page these still work: they navigate, which is what a
 * footer link promises anyway.
 */
const FOOTER_NAV = [
  { key: "services", href: "/services" },
  { key: "projects", href: "/projects" },
  { key: "gallery", href: "/gallery" },
  { key: "process", href: "/process" },
  { key: "faq", href: "/faq" },
  { key: "contact", href: "/contact" },
] as const;

/* Brand names, not copy — identical in every locale. Only the accounts
 * that exist ship; the TODO placeholders in lib/site.ts filter out. */
const SOCIAL_LINKS = (
  [
    { label: "Facebook", href: SITE.socials.facebook },
    { label: "TikTok", href: SITE.socials.tiktok },
    { label: "Instagram", href: SITE.socials.instagram },
    { label: "LinkedIn", href: SITE.socials.linkedin },
  ] as const
).filter((s) => !s.href.includes("TODO"));

/* Endonyms: a language switcher names each language in itself, so these
 * labels are intentionally identical across locales (not message copy). */
const LOCALE_OPTIONS: ReadonlyArray<{
  code: Locale;
  short: string;
  name: string;
}> = [
  { code: "ka", short: "ქარ", name: "ქართული" },
  { code: "ru", short: "RU", name: "Русский" },
  { code: "en", short: "EN", name: "English" },
];

/** Small tracked label above a block — the light-surface twin of the
 *  one the old charcoal footer used. */
const LABEL_CLASS =
  "block text-[0.6875rem] uppercase tracking-[0.26em] text-ink-55";

/** A column's serif header, the reference's italic-serif voice. */
const HEAD_CLASS = "font-display text-lg text-ink";

/** Minimal underline field on the light sheet. */
const INPUT_CLASS =
  "mt-3 block w-full appearance-none rounded-none border-b border-line-strong bg-transparent px-0 py-2.5 text-base text-ink caret-clay transition-colors duration-300 placeholder:text-ink-40 focus:border-clay";

/*
 * The callback fallback, moved here from the old contact band. Same
 * server action, same conversion accounting: the Contact event fires on
 * the transition into `state.ok` — the server's own answer — never from
 * onSubmit, which runs before anything was validated.
 */
function CallbackForm() {
  const t = useTranslations("contact");
  const tCommon = useTranslations("common");

  const [state, formAction, pending] = useActionState(submitLead, {
    ok: false,
  });

  const reported = useRef(false);
  useEffect(() => {
    if (!state.ok || reported.current) return;
    reported.current = true;
    track("Contact", { method: "form" });
  }, [state.ok]);

  return (
    <div
      aria-live="polite"
      className="rounded-[var(--radius-card)] border border-line bg-shell p-6 sm:p-7"
    >
      {state.ok ? (
        <div>
          <p className="u-display text-[clamp(1.3rem,3.5vw,1.9rem)] leading-[1.25]! text-ink">
            {t("success")}
          </p>
          <p className="mt-4 text-sm text-ink-70">{t("replyNote")}</p>
        </div>
      ) : (
        <form action={formAction}>
          <h3 className={HEAD_CLASS}>{t("formTitle")}</h3>

          <div className="mt-6">
            <label htmlFor="footer-name" className={LABEL_CLASS}>
              {t("nameLabel")}
            </label>
            <input
              id="footer-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder={t("namePlaceholder")}
              aria-invalid={state.error === "name"}
              aria-describedby={
                state.error === "name" ? "footer-name-error" : undefined
              }
              className={INPUT_CLASS}
            />
            {state.error === "name" ? (
              <p id="footer-name-error" className="mt-2 text-sm text-alert">
                {t("errorName")}
              </p>
            ) : null}
          </div>

          <div className="mt-7">
            <label htmlFor="footer-phone" className={LABEL_CLASS}>
              {t("phoneLabel")}
            </label>
            <input
              id="footer-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder={t("phonePlaceholder")}
              aria-invalid={state.error === "phone"}
              aria-describedby={
                state.error === "phone" ? "footer-phone-error" : undefined
              }
              className={INPUT_CLASS}
            />
            {state.error === "phone" ? (
              <p id="footer-phone-error" className="mt-2 text-sm text-alert">
                {t("errorPhone")}
              </p>
            ) : null}
          </div>

          <div className="mt-8">
            <button
              type="submit"
              disabled={pending}
              className="u-press inline-flex w-full items-center justify-center rounded-full border border-line-strong px-8 py-4 text-xs tracking-[0.18em] text-ink uppercase hover:border-ink-55 disabled:opacity-60"
            >
              {t("submit")}
            </button>
            {/* A valid lead with nobody to hand it to is told plainly
                and pointed at the channel that demonstrably works. */}
            {state.error === "delivery" ? (
              <p role="alert" className="mt-4 text-sm text-alert">
                {t("errorDelivery")}{" "}
                <a
                  href={whatsappUrl(tCommon("whatsappPrefill"))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("Contact", { method: "whatsapp" })}
                  className="u-link text-ink"
                >
                  {tCommon("whatsappCta")}
                </a>
              </p>
            ) : (
              <p className="mt-4 text-xs text-ink-55">{t("replyNote")}</p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export default function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tContact = useTranslations("contact");
  const tCommon = useTranslations("common");
  const tSocial = useTranslations("social");

  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const rootRef = useRef<HTMLElement>(null);

  /*
   * The cascade: the ruled columns arrive one after another, the way
   * the reference's footer settles. One trigger on the footer, one
   * staggered tween — the server HTML is the finished state, so a
   * no-JS or reduced-motion visitor simply has the columns.
   */
  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(root.querySelectorAll("[data-footer-col]"), {
          y: 20,
          autoAlpha: 0,
          duration: DUR.base,
          ease: EASE.soft,
          stagger: STAGGER.items * 2,
          scrollTrigger: { trigger: root, start: REVEAL_START, once: true },
        });
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <footer ref={rootRef} className="border-t border-line bg-sand text-ink">
      <div className="mx-auto w-full max-w-[110rem] px-5 sm:px-8 lg:px-12">
        {/* -------------------------------------------------------------
            The ruled columns. The hairlines between them are the
            reference's visible column grid.
            ---------------------------------------------------------- */}
        {/*
          The lg right padding is clearance for the journey rail: its
          active label ("CONTACT", inevitably, down here) extends ~110px
          in from the right screen edge, exactly where the enquiry
          panel's border would otherwise sit on mid-width viewports.
        */}
        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-0 lg:divide-x lg:divide-line lg:py-24 lg:pr-20">
          {/* The lockup */}
          <div data-footer-col className="lg:col-span-3 lg:pr-10">
            <p className="flex flex-col">
              <span
                className="u-display text-xl leading-none text-ink"
                style={{ letterSpacing: "0.35em" }}
              >
                {SITE.wordmark}
              </span>
              <span
                className="mt-2 text-[0.6875rem] leading-none text-clay"
                style={{ letterSpacing: "0.55em" }}
              >
                {SITE.wordmarkSub}
              </span>
            </p>
            <p className="mt-6 text-sm text-ink-55">{t("tagline")}</p>

            {/*
              THE PREFERENCES. The row keeps its charcoal-chip material
              from the old footer — the controls inside it are drawn in
              bone, so the chip stays the one dark fitting on the sheet.
            */}
            <div className="footer-prefs mt-10 mb-0!">
              <p className={LABEL_CLASS}>{tNav("langLabel")}</p>
              <div className="footer-prefs-row bg-charcoal">
                <LocaleSwitch />
                <span aria-hidden="true" className="footer-prefs-rule" />
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Enquiries — every direct line the site has. */}
          <div data-footer-col className="lg:col-span-3 lg:px-10">
            <h3 className={HEAD_CLASS}>{t("enquiries")}</h3>
            <ul className="mt-5 flex flex-col gap-3 text-sm">
              <li>
                <a
                  className="u-link text-ink-70 transition-colors hover:text-ink"
                  href={`tel:${SITE.phoneHref}`}
                  onClick={() => track("Contact", { method: "phone" })}
                >
                  {SITE.phone}
                </a>
              </li>
              <li>
                <a
                  className="u-link text-ink-70 transition-colors hover:text-ink"
                  href={`mailto:${SITE.email}`}
                >
                  {SITE.email}
                </a>
              </li>
              <li>
                <a
                  className="u-link text-ink-70 transition-colors hover:text-ink"
                  href={whatsappUrl(tCommon("whatsappPrefill"))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("Contact", { method: "whatsapp" })}
                >
                  {tCommon("whatsappCta")}
                </a>
              </li>
            </ul>

            <p className={`${LABEL_CLASS} mt-9`}>{tContact("addressLabel")}</p>
            <p className="mt-3 text-sm text-ink-70">{tContact("address")}</p>
            <a
              className="u-link mt-3 inline-block text-sm text-ink-55"
              href={SITE.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tContact("mapCta")}
            </a>
          </div>

          {/* Pages */}
          <nav data-footer-col className="lg:col-span-2 lg:px-10" aria-label={t("pages")}>
            <h3 className={HEAD_CLASS}>{t("pages")}</h3>
            <ul className="mt-5 flex flex-col gap-3 text-sm">
              {FOOTER_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    className="u-link text-ink-70 transition-colors hover:text-ink"
                    href={item.href}
                  >
                    {tNav(item.key)}
                  </Link>
                </li>
              ))}
              {/* The planner: the one thing a phone visitor comes back
                  for, so it keeps its accent. */}
              <li>
                <Link
                  className="u-link text-clay transition-colors hover:text-ink"
                  href="/planner"
                >
                  {tNav("planner")}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Social */}
          <div data-footer-col className="lg:col-span-2 lg:px-10">
            <h3 className={HEAD_CLASS}>{t("socials")}</h3>
            <ul className="mt-5 flex flex-col gap-3 text-sm">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.label}>
                  <a
                    className="u-link text-ink-70 transition-colors hover:text-ink"
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* The enquiry slot — the reference's boxed column. */}
          <div data-footer-col className="sm:col-span-2 lg:col-span-2 lg:pl-10">
            <CallbackForm />
          </div>
        </div>

        {/* -------------------------------------------------------------
            The closing wordmark. Poster-scale, and the one thing on the
            page the visitor moves directly: the letters clear a path
            for the cursor and drift back once it has gone.

            `overflow-hidden` is load-bearing — a letter pushed off the
            right edge would otherwise widen the document. Letters are
            Latin in all three locales, which is what makes the
            per-character split safe here.
            ---------------------------------------------------------- */}
        <div className="overflow-hidden border-t border-line pt-12 pb-4">
          {/*
            SIZED TO NEVER WRAP. The wordmark runs ~7.8em wide in the
            display face, so 9.4vw of viewport always fits inside the
            gutters with air to spare — the 12vw the old footer used
            missed by two pixels at a 1280 viewport and broke "GROUP"
            mid-word. nowrap is the belt to that maths' braces: chars
            split into inline blocks will otherwise break anywhere.
          */}
          <MagneticType
            as="p"
            unit="chars"
            strength={0.34}
            className="u-display block text-center text-[clamp(2rem,9.4vw,10.6rem)] leading-[0.9] whitespace-nowrap text-ink/90 select-none"
          >
            {`${SITE.wordmark} ${SITE.wordmarkSub}`}
          </MagneticType>
        </div>

        {/* -------------------------------------------------------------
            The closing bar: rights, a client's own words in the middle
            — the reference puts an explorer's there; ours belong to
            the people whose homes the work is in — and the languages.
            ---------------------------------------------------------- */}
        <div className="flex flex-col items-center gap-6 border-t border-line py-8 lg:flex-row lg:justify-between">
          <p className="text-xs text-ink-40 lg:flex-1">
            {t("rights", { year: SITE.year })}
          </p>

          {/* A client's words arrive as words; the attribution resolves
              after them, the way a signature follows a sentence. */}
          <div className="max-w-md text-center">
            <RevealText
              as="p"
              variant="words"
              className="font-display text-sm leading-[1.6] text-ink-55"
            >
              “{tSocial("quotes.q1.text")}”
            </RevealText>
            <ScrambleText
              as="p"
              className="vg-mono mt-1 text-ink-40"
              delay={0.3}
              text={tSocial("quotes.q1.author")}
            />
          </div>

          <div
            role="group"
            aria-label={tNav("langLabel")}
            className="flex items-center justify-end gap-6 lg:flex-1"
          >
            {LOCALE_OPTIONS.map((option) => {
              const active = option.code === locale;
              return (
                <button
                  key={option.code}
                  type="button"
                  aria-label={option.name}
                  aria-current={active ? "true" : undefined}
                  onClick={() => {
                    if (!active) {
                      router.replace(pathname, {
                        locale: option.code,
                        scroll: false,
                      });
                    }
                  }}
                  className={`u-press text-xs tracking-[0.12em] ${
                    active ? "text-ink" : "text-ink-40 hover:text-ink-70"
                  }`}
                >
                  {option.short}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
