"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  DARK_QUERY,
  THEME_CHOICES,
  applyTheme,
  readChoice,
  setChoice,
  subscribeChoice,
  type ThemeChoice,
} from "@/lib/theme";

/*
 * THE THEME SWITCH.
 *
 * A three-state segmented control, built as the language pill's twin —
 * same glass, same size, same corner of the header — because they are
 * the same kind of decision and a visitor should not have to learn two
 * controls to change two preferences.
 *
 * SYSTEM IS A STATE, NOT A DEFAULT VALUE. A two-way toggle has to guess
 * an initial position and then it is lying: it says "light" while the
 * page is dark because the OS asked for dark. Keeping "system"
 * selectable and selected-by-default means the control always tells the
 * truth about where the theme is coming from.
 *
 * HYDRATION. The server has no idea what the visitor chose, so it
 * renders "system" pressed and the first client render corrects the
 * control. The PAGE itself never flashes — the boot script in
 * layout.tsx stamped `data-theme` long before React arrived; only this
 * control's own pressed state is resolved here.
 *
 * Icons are drawn rather than filled, in the site's own hairline
 * language: a sun, a moon, and a half-lit disc for "follow the machine".
 */

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false",
  className: "size-3.5",
} as const;

function Icon({ choice }: { choice: ThemeChoice }) {
  if (choice === "light") {
    return (
      <svg {...ICON_PROPS}>
        <circle cx={12} cy={12} r={4.2} />
        <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
      </svg>
    );
  }
  if (choice === "dark") {
    return (
      <svg {...ICON_PROPS}>
        <path d="M20 13.4A8.2 8.2 0 1 1 10.6 4a6.6 6.6 0 0 0 9.4 9.4z" />
      </svg>
    );
  }
  // System: a disc lit from one side. Reads as "whatever it is out
  // there", which is exactly what the setting means.
  return (
    <svg {...ICON_PROPS}>
      <circle cx={12} cy={12} r={8.2} />
      <path d="M12 3.8a8.2 8.2 0 0 1 0 16.4z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ThemeToggle() {
  const t = useTranslations("theme");

  /*
   * localStorage is the state; this only reads it. The server has no
   * idea what was chosen, so it answers "system" and the first client
   * render corrects the control — the PAGE never flashes, because the
   * boot script in layout.tsx stamped `data-theme` long before React.
   */
  const choice = useSyncExternalStore<ThemeChoice>(
    subscribeChoice,
    readChoice,
    () => "system",
  );

  /*
   * Follow the machine while — and only while — the visitor has asked us
   * to. Without this, a visitor on "system" who flips their OS at dusk
   * keeps the old theme until they reload, which is the one moment the
   * setting exists for.
   */
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  /*
   * TWO RENDERINGS, ONE STATE.
   *
   * At 390px the header already carries a wordmark, a three-way language
   * pill and the booking CTA; a second three-way pill puts it over the
   * gutter. So the phone gets a single button that cycles, showing the
   * state it is IN rather than the states available — and everything
   * from `sm` up gets the segmented control, where jumping straight to
   * "dark" is one press instead of two.
   */
  const next = THEME_CHOICES[(THEME_CHOICES.indexOf(choice) + 1) % 3]!;

  return (
    <>
      <button
        type="button"
        onClick={() => setChoice(next)}
        aria-label={`${t("label")}: ${t(choice)} — ${t("cycle", { next: t(next) })}`}
        className="glass header-fg u-press flex items-center p-2 sm:hidden"
      >
        <Icon choice={choice} />
      </button>

      <div
        role="group"
        aria-label={t("label")}
        className="glass hidden items-center p-0.5 sm:flex"
      >
        {THEME_CHOICES.map((option) => {
          const active = option === choice;
          return (
            <button
              key={option}
              type="button"
              aria-label={t(option)}
              aria-current={active ? "true" : undefined}
              onClick={() => setChoice(option)}
              className={`u-press flex items-center rounded-full px-2 py-1.5 ${
                active ? "header-fg" : "header-fg-dim"
              }`}
            >
              <Icon choice={option} />
            </button>
          );
        })}
      </div>
    </>
  );
}
