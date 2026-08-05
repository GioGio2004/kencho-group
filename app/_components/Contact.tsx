"use client";

import { useActionState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import HeroSwitch from "@/app/_components/HeroSwitch";
import LocaleSwitch from "@/app/_components/LocaleSwitch";
import ThemeToggle from "@/app/_components/ThemeToggle";
import MagneticType from "@/app/_components/MagneticType";
import { submitLead } from "@/app/actions";
import { track } from "@/lib/analytics";
import { DUR, EASE, REVEAL_START, STAGGER } from "@/lib/motion";
import { SITE, whatsappUrl } from "@/lib/site";

/*
 * CONTACT — the one charcoal band on the page, pointed at a single
 * outcome: a conversation. WhatsApp is the primary door (it is how this
 * market talks to builders); the two-field form is the quiet fallback
 * for people who would rather be called.
 *
 * The form posts to the submitLead server action via useActionState —
 * the action validates on the server, the browser's `required` handles
 * the empty case before a round-trip.
 */

/** Fraction of the cursor offset the WhatsApp button travels on desktop. */
const MAGNET_PULL = 0.25;
/** Explicit release ease for the magnetic button — never a GSAP default. */
const MAGNET_EASE = "elastic.out(1, 0.4)";

/** Small tracked label, always visible above its input or block. */
const LABEL_CLASS =
  "block text-[0.6875rem] uppercase tracking-[0.26em] text-bone/55";

/** Minimal underline field: transparent, one hairline, clay on focus. */
const INPUT_CLASS =
  "mt-4 block w-full appearance-none rounded-none border-b border-bone/25 bg-transparent px-0 py-3 text-base text-bone caret-clay transition-colors duration-300 placeholder:text-bone/30 focus:border-clay sm:text-lg";

export default function Contact() {
  const t = useTranslations("contact");
  const tCommon = useTranslations("common");

  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const whatsappRef = useRef<HTMLAnchorElement>(null);

  const [state, formAction, pending] = useActionState(submitLead, {
    ok: false,
  });

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const root = rootRef.current;
      const title = titleRef.current;
      if (!root || !title) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
        let split: SplitText | null = null;
        let cancelled = false;

        // Split only once the display face has loaded, so the mask is cut
        // against the final line boxes — Georgian metrics differ enough
        // from the fallback serif to change where lines break.
        document.fonts.ready.then(() => {
          if (cancelled) return;
          ctx.add(() => {
            const instance = SplitText.create(title, {
              type: "lines",
              mask: "lines",
            });
            split = instance;

            // The display line-height is tight enough that descenders sit
            // outside the line box; the mask would clip them without a
            // hair of padding to grow into.
            gsap.set(instance.lines, { paddingBottom: "0.14em" });

            gsap.from(instance.lines, {
              yPercent: 118,
              duration: DUR.slow,
              ease: EASE.out,
              stagger: STAGGER.lines,
              scrollTrigger: { trigger: title, start: REVEAL_START, once: true },
            });
          });
        });

        gsap.from(root.querySelectorAll("[data-lead]"), {
          y: 20,
          autoAlpha: 0,
          duration: DUR.base,
          ease: EASE.soft,
          stagger: STAGGER.items,
          scrollTrigger: { trigger: root, start: REVEAL_START, once: true },
        });

        gsap.from(root.querySelectorAll("[data-field]"), {
          y: 26,
          autoAlpha: 0,
          duration: DUR.base,
          ease: EASE.soft,
          stagger: STAGGER.items,
          delay: 0.14,
          scrollTrigger: { trigger: root, start: REVEAL_START, once: true },
        });

        return () => {
          cancelled = true;
          split?.revert();
        };
      });

      // Magnetic pull on the primary button — desktop pointers only.
      mm.add(
        "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const button = whatsappRef.current;
          if (!button) return;

          const xTo = gsap.quickTo(button, "x", {
            duration: 0.9,
            ease: MAGNET_EASE,
          });
          const yTo = gsap.quickTo(button, "y", {
            duration: 0.9,
            ease: MAGNET_EASE,
          });

          const onMove = (event: PointerEvent) => {
            const rect = button.getBoundingClientRect();
            xTo((event.clientX - rect.left - rect.width / 2) * MAGNET_PULL);
            yTo((event.clientY - rect.top - rect.height / 2) * MAGNET_PULL);
          };

          const onLeave = () => {
            xTo(0);
            yTo(0);
          };

          button.addEventListener("pointermove", onMove);
          button.addEventListener("pointerleave", onLeave);

          return () => {
            button.removeEventListener("pointermove", onMove);
            button.removeEventListener("pointerleave", onLeave);
            gsap.killTweensOf(button, "x,y");
            gsap.set(button, { clearProps: "transform" });
          };
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="contact"
      aria-labelledby="contact-title"
      className="bg-charcoal text-bone py-28 sm:py-40 lg:py-48"
    >
      <div className="mx-auto w-full max-w-[88rem] px-6 sm:px-10 lg:px-16">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-24">
          {/* The invitation */}
          <div className="lg:col-span-6">
            {/* .u-eyebrow is unlayered CSS, so its ink colour outranks a
                plain utility on this dark band — `!` puts sand back on top. */}
            <p data-lead className="u-eyebrow text-bone/55!">
              {t("eyebrow")}
            </p>

            <h2
              ref={titleRef}
              id="contact-title"
              className="u-display mt-8 text-[clamp(2.1rem,7.5vw,4.6rem)]"
            >
              {t("title")}
            </h2>

            <p
              data-lead
              className="mt-8 max-w-md text-base leading-[1.7] text-bone/70 sm:text-lg"
            >
              {t("sub")}
            </p>

            {/* Primary: WhatsApp — the section's one brass moment. The
                magnet lives on the anchor; the reveal on this wrapper, so
                the two transforms never fight. */}
            <div data-lead className="mt-12">
              <a
                ref={whatsappRef}
                href={whatsappUrl(tCommon("whatsappPrefill"))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("Contact", { method: "whatsapp" })}
                className="u-press inline-flex w-full items-center justify-center rounded-full bg-clay px-10 py-5 text-sm uppercase tracking-[0.16em] text-charcoal hover:bg-clay-deep sm:w-auto sm:px-12"
              >
                {tCommon("whatsappCta")}
              </a>
            </div>

            {/* The direct line, for people who just want to talk. */}
            <ul
              data-lead
              className="mt-12 flex flex-col gap-3 text-base sm:flex-row sm:flex-wrap sm:gap-x-10 sm:gap-y-3 sm:text-lg"
            >
              <li>
                <a
                  className="u-link"
                  href={`tel:${SITE.phoneHref}`}
                  onClick={() => track("Contact", { method: "phone" })}
                >
                  {SITE.phone}
                </a>
              </li>
              <li>
                <a className="u-link" href={`mailto:${SITE.email}`}>
                  {SITE.email}
                </a>
              </li>
            </ul>

            {/* Address card — text only, the map stays a link away. */}
            <div
              data-lead
              className="mt-12 max-w-md rounded-[var(--radius-card)] border border-bone/15 p-6 sm:p-8"
            >
              <p className={LABEL_CLASS}>{t("addressLabel")}</p>
              <p className="mt-3 text-base sm:text-lg">{t("address")}</p>
              <a
                className="u-link mt-5 inline-block text-sm text-bone/70"
                href={SITE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("mapCta")}
              </a>
            </div>
          </div>

          {/* The fallback: leave a number, we call back. */}
          <div className="lg:col-span-5 lg:col-start-8">
            <div aria-live="polite">
              {state.ok ? (
                <div className="border-t border-bone/15 pt-10">
                  <p className="u-display text-[clamp(1.5rem,4.5vw,2.4rem)] leading-[1.2]!">
                    {t("success")}
                  </p>
                  <p className="mt-6 max-w-md text-base text-bone/70">
                    {t("replyNote")}
                  </p>
                </div>
              ) : null}
            </div>

            {state.ok ? null : (
              <form
                action={formAction}
                onSubmit={() => track("Contact", { method: "form" })}
              >
                <h3 data-field className={LABEL_CLASS}>
                  {t("formTitle")}
                </h3>

                <div data-field className="mt-10">
                  <label htmlFor="contact-name" className={LABEL_CLASS}>
                    {t("nameLabel")}
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder={t("namePlaceholder")}
                    aria-invalid={state.error === "name"}
                    aria-describedby={
                      state.error === "name" ? "contact-name-error" : undefined
                    }
                    className={INPUT_CLASS}
                  />
                  {state.error === "name" ? (
                    <p
                      id="contact-name-error"
                      className="mt-3 text-sm text-bone/85"
                    >
                      {t("errorName")}
                    </p>
                  ) : null}
                </div>

                <div data-field className="mt-12">
                  <label htmlFor="contact-phone" className={LABEL_CLASS}>
                    {t("phoneLabel")}
                  </label>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    placeholder={t("phonePlaceholder")}
                    aria-invalid={state.error === "phone"}
                    aria-describedby={
                      state.error === "phone"
                        ? "contact-phone-error"
                        : undefined
                    }
                    className={INPUT_CLASS}
                  />
                  {state.error === "phone" ? (
                    <p
                      id="contact-phone-error"
                      className="mt-3 text-sm text-bone/85"
                    >
                      {t("errorPhone")}
                    </p>
                  ) : null}
                </div>

                <div data-field className="mt-14">
                  <button
                    type="submit"
                    disabled={pending}
                    className="u-press inline-flex w-full items-center justify-center rounded-full border border-bone/30 px-12 py-5 text-sm uppercase tracking-[0.18em] text-bone hover:border-bone/60 disabled:opacity-60 sm:w-auto"
                  >
                    {t("submit")}
                  </button>
                  <p className="mt-6 max-w-sm text-sm text-bone/55">
                    {t("replyNote")}
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/*
 * FOOTER — the quiet close. Same charcoal as the contact band above it,
 * separated by a single hairline so the two read as one field of colour.
 */

const FOOTER_NAV = [
  { key: "services", href: "#services" },
  { key: "projects", href: "#projects" },
  { key: "process", href: "#process" },
  { key: "faq", href: "#faq" },
  { key: "contact", href: "#contact" },
] as const;

/* Brand names, not copy — identical in every locale. */
const SOCIAL_LINKS = [
  { label: "Facebook", href: SITE.socials.facebook },
  { label: "TikTok", href: SITE.socials.tiktok },
  { label: "Instagram", href: SITE.socials.instagram },
  { label: "LinkedIn", href: SITE.socials.linkedin },
] as const;

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

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tContact = useTranslations("contact");

  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <footer className="border-t border-bone/10 bg-charcoal text-bone">
      <div className="mx-auto w-full max-w-[88rem] px-6 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-14 py-16 lg:flex-row lg:items-start lg:justify-between lg:gap-12 lg:py-20">
          {/* Wordmark lockup — type only. Inline letter-spacing: the
              unlayered ka display override in globals.css would otherwise
              beat a tracking utility. */}
          <div>
            <p className="flex flex-col">
              <span
                className="u-display text-xl leading-none"
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
            <p className="mt-6 text-sm text-bone/55">{t("tagline")}</p>
            <p className="mt-2 text-sm text-bone/55">{tContact("address")}</p>
          </div>

          <nav>
            <ul className="flex flex-col gap-3 text-sm">
              {FOOTER_NAV.map((item) => (
                <li key={item.href}>
                  <a
                    className="u-link text-bone/70 transition-colors hover:text-bone"
                    href={item.href}
                  >
                    {tNav(item.key)}
                  </a>
                </li>
              ))}
              {/* The header only has room for this from `sm` up, and the
                  planner is the one thing on the site a phone visitor
                  might come back for. */}
              <li>
                <Link
                  className="u-link text-clay transition-colors hover:text-bone"
                  href="/planner"
                >
                  {tNav("planner")}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            {/*
              THE PREFERENCES, all three of them.

              They were in the header until it became an island carrying
              only a wordmark and one button. A footer is where a visitor
              already goes looking for settings, and putting them here is
              what let the header stop asking questions nobody had yet.
            */}
            <div className="footer-prefs">
              <p className={LABEL_CLASS}>{tNav("langLabel")}</p>
              <div className="footer-prefs-row">
                <LocaleSwitch />
                <span aria-hidden="true" className="footer-prefs-rule" />
                <ThemeToggle />
              </div>
            </div>

            {/* The opening scene, chosen after you have seen one. */}
            <HeroSwitch />

            <p className={`${LABEL_CLASS} mt-10`}>{t("socials")}</p>
            <ul className="mt-5 flex flex-col gap-3 text-sm">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.label}>
                  <a
                    className="u-link text-bone/70 transition-colors hover:text-bone"
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
        </div>

        {/*
          The closing wordmark. Poster-scale, and the one thing on the
          page the visitor moves directly: the letters clear a path for
          the cursor and drift back once it has gone.

          `overflow-hidden` is load-bearing — a letter pushed off the
          right edge would otherwise widen the document and hand the page
          a horizontal scrollbar. Letters are Latin in all three locales,
          which is what makes the per-character split safe here.
        */}
        <div className="overflow-hidden border-t border-bone/10 pt-12 pb-4">
          {/*
            `strength` well under 1. REPEL is tuned for a headline, where
            a word has to clear its neighbour to read as pushed at all;
            at this size a letter IS the neighbour, and the field as
            authored throws the wordmark into a pile. Cut to a third, it
            reads as the type parting around the cursor — which is the
            effect. The size came down with it, for the same reason.
          */}
          <MagneticType
            as="p"
            unit="chars"
            strength={0.34}
            className="u-display block text-center text-[clamp(2.2rem,12vw,9.5rem)] leading-[0.9] text-bone/90 select-none"
          >
            {`${SITE.wordmark} ${SITE.wordmarkSub}`}
          </MagneticType>
        </div>

        <div className="flex flex-col gap-6 border-t border-bone/10 py-8 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs text-bone/45">
            {t("rights", { year: SITE.year })}
          </p>

          {/* Second language switcher — plain text, same replace() route
              as the header pill. */}
          <div
            role="group"
            aria-label={tNav("langLabel")}
            className="flex items-center gap-6"
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
                    active ? "text-bone" : "text-bone/45 hover:text-bone/70"
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
