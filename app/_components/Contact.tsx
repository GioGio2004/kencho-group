"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DUR, EASE, REVEAL_START, STAGGER } from "@/lib/motion";
import { NAV_LINKS, SITE } from "@/lib/site";

/*
 * The one dark band on the page. Everything here is pointed at a single
 * action: two fields, one button, and the direct line if a form is not
 * how someone wants to get in touch.
 *
 * Submission is local only — validation, a calm confirmation, and a
 * clearly marked place for the real endpoint. Nothing is invented.
 */

type FieldErrors = {
  name?: string;
  phone?: string;
};

/** Fraction of the cursor offset the submit button travels on desktop. */
const MAGNET_PULL = 0.25;
/** Explicit release ease for the magnetic button — never a GSAP default. */
const MAGNET_EASE = "elastic.out(1, 0.4)";

/** Small tracked label, always visible above its input. */
const LABEL_CLASS =
  "block text-[0.6875rem] uppercase tracking-[0.26em] text-sand/55";

/** Minimal underline field: transparent, one hairline, clay on focus. */
const INPUT_BASE =
  "mt-4 block w-full appearance-none rounded-none border-b bg-transparent px-0 py-3 text-base text-sand caret-clay transition-colors duration-300 focus:border-clay sm:text-lg";

export default function Contact() {
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = nameRef.current?.value.trim() ?? "";
    const phone = phoneRef.current?.value.trim() ?? "";
    const digits = phone.replace(/\D/g, "");

    const next: FieldErrors = {};
    if (name.length < 2) {
      next.name = "Please tell us who we are meeting.";
    }
    if (!/^[+\d\s().-]+$/.test(phone) || digits.length < 7) {
      next.phone = "Please enter a number we can reach you on.";
    }

    setErrors(next);

    if (next.name) {
      nameRef.current?.focus();
      return;
    }
    if (next.phone) {
      phoneRef.current?.focus();
      return;
    }

    // TODO: POST { name, phone } to the real enquiry endpoint here, then
    // move setSubmitted(true) into the success branch and surface a
    // failure message instead of swallowing it.
    setSubmitted(true);
  };

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const root = rootRef.current;
      const title = titleRef.current;
      if (!root || !title) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(title, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) => {
            // The display line-height is tight enough that descenders sit
            // outside the line box; the mask would clip them without a
            // hair of padding to grow into.
            gsap.set(self.lines, { paddingBottom: "0.14em" });

            return gsap.from(self.lines, {
              yPercent: 118,
              duration: DUR.slow,
              ease: EASE.out,
              stagger: STAGGER.lines,
              scrollTrigger: {
                trigger: title,
                start: REVEAL_START,
                once: true,
              },
            });
          },
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
          split.revert();
        };
      });

      mm.add(
        "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const button = buttonRef.current;
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
      className="bg-ink text-sand py-28 sm:py-40 lg:py-48"
    >
      <div className="mx-auto w-full max-w-[88rem] px-6 sm:px-10 lg:px-16">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-24">
          {/* The invitation */}
          <div className="lg:col-span-5">
            {/* .u-eyebrow is unlayered CSS, so its ink colour outranks a
                plain utility on this dark band — `!` puts sand back on top. */}
            <p data-lead className="u-eyebrow text-sand/55!">
              Book a viewing
            </p>

            <h2
              ref={titleRef}
              id="contact-title"
              className="u-display mt-8 text-[clamp(2.2rem,8vw,5rem)]"
            >
              Come and see it in person
            </h2>

            <p
              data-lead
              className="mt-8 max-w-md text-base text-sand/70 sm:text-lg"
            >
              A private viewing takes about thirty minutes. Leave your name and
              a number, and we will find an hour when the light is at its best.
            </p>

            <div data-lead className="mt-12 sm:mt-14">
              <p className={LABEL_CLASS}>Or speak to us directly</p>
              <ul className="mt-5 space-y-3 text-base sm:text-lg">
                <li>
                  <a className="u-link" href={`tel:${SITE.phoneHref}`}>
                    {SITE.phone}
                  </a>
                </li>
                <li>
                  <a className="u-link" href={`mailto:${SITE.email}`}>
                    {SITE.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* The request */}
          <div className="lg:col-span-6 lg:col-start-7">
            <div aria-live="polite">
              {submitted ? (
                <div className="border-t border-sand/15 pt-10">
                  <p className="u-display text-[clamp(1.5rem,4.5vw,2.5rem)]">
                    Thank you, your request is with us.
                  </p>
                  <p className="mt-6 max-w-md text-base text-sand/70">
                    We will call within one working day to arrange a time. If
                    something changes before then, reach us on{" "}
                    <a className="u-link" href={`tel:${SITE.phoneHref}`}>
                      {SITE.phone}
                    </a>
                    .
                  </p>
                </div>
              ) : null}
            </div>

            {submitted ? null : (
              <form noValidate onSubmit={handleSubmit}>
                <div data-field>
                  <label htmlFor="contact-name" className={LABEL_CLASS}>
                    Your name
                  </label>
                  <input
                    ref={nameRef}
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name ? "contact-name-error" : undefined
                    }
                    className={`${INPUT_BASE} ${
                      errors.name ? "border-clay" : "border-sand/40"
                    }`}
                  />
                  {errors.name ? (
                    <p
                      id="contact-name-error"
                      className="mt-3 text-sm text-sand/85"
                    >
                      {errors.name}
                    </p>
                  ) : null}
                </div>

                <div data-field className="mt-12">
                  <label htmlFor="contact-phone" className={LABEL_CLASS}>
                    Phone
                  </label>
                  <input
                    ref={phoneRef}
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={
                      errors.phone ? "contact-phone-error" : undefined
                    }
                    className={`${INPUT_BASE} ${
                      errors.phone ? "border-clay" : "border-sand/40"
                    }`}
                  />
                  {errors.phone ? (
                    <p
                      id="contact-phone-error"
                      className="mt-3 text-sm text-sand/85"
                    >
                      {errors.phone}
                    </p>
                  ) : null}
                </div>

                <div data-field className="mt-14">
                  <button
                    ref={buttonRef}
                    type="submit"
                    className="u-press inline-flex w-full items-center justify-center bg-clay px-12 py-5 text-sm uppercase tracking-[0.18em] text-sand hover:bg-clay-deep sm:w-auto"
                  >
                    Request a viewing
                  </button>
                  <p className="mt-6 max-w-sm text-sm text-sand/55">
                    Your details are used only to arrange the viewing.
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
 * Footer — the quiet close. Same dark band as the contact section, so the
 * two read as one field of colour separated by a single hairline.
 */
export function Footer() {
  return (
    <footer className="bg-ink text-sand">
      <div className="mx-auto w-full max-w-[88rem] px-6 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10 border-t border-sand/15 py-14 sm:flex-row sm:items-end sm:justify-between sm:gap-12 lg:py-16">
          <div>
            {/* `!` beats .u-display's own tracking, which sits outside
                Tailwind's cascade layers and would otherwise win. */}
            <p className="u-display text-xl tracking-[0.38em]!">
              {SITE.wordmark}
            </p>
            <p className="mt-4 text-xs text-sand/55">{SITE.location}</p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a className="u-link" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <p className="text-xs text-sand/55">
            &copy; {SITE.year} {SITE.fullName}
          </p>
        </div>
      </div>
    </footer>
  );
}
