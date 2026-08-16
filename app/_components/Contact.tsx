"use client";

import { useActionState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useTranslations } from "next-intl";
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

  /*
   * THE CONVERSION, REPORTED WHEN THERE IS ONE.
   *
   * This used to hang off the form's onSubmit, which runs before the
   * server action has validated anything — measured: name="X" phone="12"
   * fired the Contact event and then rendered "Please enter your name."
   * Every rejected submission was counted as a lead. `state.ok` is the
   * server's own answer, so this fires once, on the transition into
   * success, and only then.
   */
  const reported = useRef(false);
  useEffect(() => {
    if (!state.ok || reported.current) return;
    reported.current = true;
    track("Contact", { method: "form" });
  }, [state.ok]);

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
      data-thread-anchor=""
      aria-labelledby="contact-title"
      className="bg-charcoal text-bone py-36 sm:py-52 lg:py-64"
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

            {/* The conversion is reported from an effect on `state.ok`,
                not from onSubmit — see the top of this component. A
                submit handler runs BEFORE the server action validates,
                so name="X" phone="12" was recording a lead and then
                showing the visitor an error. */}
            {state.ok ? null : (
              <form action={formAction}>
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
                  {/*
                    THE DELIVERY FAILURE. Valid lead, nobody to hand it
                    to — so the visitor is told plainly and pointed at
                    the channel that demonstrably works, rather than
                    being thanked for something that went nowhere.
                  */}
                  {state.error === "delivery" ? (
                    <p role="alert" className="mt-6 max-w-sm text-sm text-alert">
                      {t("errorDelivery")}{" "}
                      <a
                        href={whatsappUrl(tCommon("whatsappPrefill"))}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track("Contact", { method: "whatsapp" })}
                        className="u-link text-bone"
                      >
                        {tCommon("whatsappCta")}
                      </a>
                    </p>
                  ) : (
                    <p className="mt-6 max-w-sm text-sm text-bone/70">
                      {t("replyNote")}
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
