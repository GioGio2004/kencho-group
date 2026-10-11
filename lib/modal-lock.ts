import type { KeyboardEvent } from "react";

// Count locks so closing the contact sheet over the gallery cannot unlock it.
let locks = 0;
let previousOverflow = "";
let previousPadding = "";

export function lockPage(): () => void {
  const html = document.documentElement;
  if (locks++ === 0) {
    previousOverflow = html.style.overflow;
    previousPadding = html.style.paddingRight;
    const gutter = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (gutter > 0) html.style.paddingRight = `${gutter}px`;
    (window as Window & { __lenis?: { stop(): void } }).__lenis?.stop();
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) {
      html.style.overflow = previousOverflow;
      html.style.paddingRight = previousPadding;
      (window as Window & { __lenis?: { start(): void } }).__lenis?.start();
    }
  };
}

// Native dialogs make the background inert. Explicitly cycle Tab at the
// endpoints too, so focus stays on the controls throughout repeated cycles.
export function containDialogTab(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    ),
  ).filter((el) =>
    el.getClientRects().length > 0 &&
    !el.closest("[inert]") &&
    getComputedStyle(el).visibility !== "hidden",
  );
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
