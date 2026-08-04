/* =====================================================================
 * THEME — light, dark, or whatever the machine says.
 * ---------------------------------------------------------------------
 * Three states, not two. "System" is the default and it is a real
 * choice rather than a synonym for light: a visitor who has set their OS
 * to dark at 9pm has already told us what they want, and asking again is
 * how a site ends up with a toggle nobody trusts.
 *
 * The resolved theme lands on <html data-theme>, which app/theme.css
 * keys its whole semantic layer off. Nothing else in the codebase reads
 * the choice — components take tokens, and the tokens have already
 * decided.
 * ================================================================== */

/** What the visitor picked. Persisted; survives a reload and a deploy. */
export type ThemeChoice = "system" | "light" | "dark";

/** What that resolves to once the machine has been asked. */
export type Theme = "light" | "dark";

export const THEME_CHOICES: readonly ThemeChoice[] = ["system", "light", "dark"];

/**
 * localStorage, not sessionStorage. A theme is a standing preference —
 * the one thing on this site a visitor should not have to say twice.
 */
export const THEME_KEY = "alma:theme";

export const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

/** The stored choice, or "system" if there is nothing usable. */
export function readChoice(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    return isChoice(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

/* ---------------------------------------------------------------------
 * THE CHOICE AS AN EXTERNAL STORE
 *
 * localStorage IS the state — React is only reading it — so the toggle
 * subscribes rather than keeping a copy. That is what `storage` gives
 * for free: change the theme in one tab and every other tab's control
 * updates with it, which a `useState` mirror could not do without an
 * effect that syncs the two and a bug for every path that forgets.
 * ------------------------------------------------------------------ */
const listeners = new Set<() => void>();

export function subscribeChoice(onChange: () => void): () => void {
  listeners.add(onChange);
  // `storage` fires in the OTHER tabs; the local set is for this one.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Persist the choice, apply it, and tell every subscriber. */
export function setChoice(choice: ThemeChoice): void {
  if (typeof window === "undefined") return;
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* a theme that cannot be remembered is still a theme */
  }
  applyTheme(resolve(choice));
  listeners.forEach((fn) => fn());
}

export function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function resolve(choice: ThemeChoice): Theme {
  return choice === "system" ? systemTheme() : choice;
}

/** Stamp the resolved theme onto the document. The one writer. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  // Tells the browser which way to paint form controls, scrollbars and
  // the default canvas. Without it a dark page gets light native widgets.
  root.style.colorScheme = theme;
}

/* ---------------------------------------------------------------------
 * THE BOOT SCRIPT
 *
 * Runs synchronously in <head>, before the first paint and before React
 * exists. Anything later is a flash of the wrong theme — and a flash of
 * white on a dark-mode phone at night is the single most visible defect
 * a theme system can ship.
 *
 * Written as a string rather than as a module because it has to be
 * inline: an external script is a network round trip the first paint
 * will not wait for. It is generated from the constants above so the key
 * and the attribute cannot drift from the TypeScript that reads them.
 *
 * Deliberately total. A blocked localStorage, a disabled matchMedia or a
 * quota error all end at "light" rather than at an unstyled page.
 * ------------------------------------------------------------------ */
export const THEME_BOOT = `(function(){try{
var c=localStorage.getItem(${JSON.stringify(THEME_KEY)});
var t=(c==="light"||c==="dark")?c:(matchMedia(${JSON.stringify(DARK_QUERY)}).matches?"dark":"light");
document.documentElement.dataset.theme=t;
document.documentElement.style.colorScheme=t;
}catch(e){document.documentElement.dataset.theme="light"}})()`
  .replace(/\n/g, "");
