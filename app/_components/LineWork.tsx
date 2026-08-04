import type { ReactNode } from "react";

/*
 * LINEWORK — the page's decorative language, and it is the drawing's.
 * =====================================================================
 * THE DRAWING spends four screens arguing that this company works from
 * measured lines. A page that then decorates itself with soft shadows
 * and filled cards is disagreeing with its own centrepiece. So the
 * furniture of the site — section seams, guides, corner marks — is drawn
 * in the same hand as the elevation: hairlines, registration ticks, and
 * nothing filled.
 *
 * SERVER COMPONENTS, ALL OF THEM. Nothing here imports GSAP or declares
 * "use client". Each one renders the FINISHED state and marks itself
 * with the data-fx attributes ScrollFX scans for, so the motion is
 * opt-in, site-wide, and costs zero JavaScript per instance. With the
 * bundle dead or reduced motion on, a visitor gets the lines — just
 * already ruled.
 */

/* ---------------------------------------------------------------------
 * RULE — one hairline, drawn.
 * ------------------------------------------------------------------ */
export function Rule({
  axis = "x",
  origin,
  delay,
  tone = "line",
  className = "",
}: {
  axis?: "x" | "y";
  /**
   * Pins the end it is drawn from. Omit it — which is the normal case —
   * and the line takes its whole cadence from RULE_CADENCE by document
   * position, which is what stops a page of hairlines all arriving the
   * same way.
   */
  origin?: "left" | "right" | "top" | "bottom" | "center";
  /** Extra seconds, for a rule that should land after the copy beside it. */
  delay?: number;
  /** `invert` for a rule on one of the charcoal bands. */
  tone?: "line" | "invert" | "accent";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-fx="rule"
      data-fx-axis={axis}
      data-fx-origin={origin}
      data-fx-delay={delay}
      className={`u-rule u-rule--${tone} ${axis === "y" ? "u-rule--v" : ""} ${className}`}
    >
      {/*
        The nib. Present on every rule and used by a minority of them —
        ScrollFX lights it only for the cadence entries that carry one,
        because a brass tip on every hairline stops being an accent. It
        is hidden until then by the same effect, so a page with no JS
        never shows a stray brass dash.
      */}
      <span data-rule-tip aria-hidden="true" className="u-rule-tip" />
    </span>
  );
}

/* ---------------------------------------------------------------------
 * SHEET — a section framed the way a drawing is.
 *
 * Four registration ticks and, optionally, the vertical guides a sheet
 * is set out on. Absolutely positioned and pointer-transparent, so it
 * can be dropped into any `relative` section without touching its
 * layout.
 *
 * The guides are deliberately FEWER than a real column grid. Twelve
 * hairlines behind a paragraph is a wireframe; four is a page that was
 * set out before it was written.
 * ------------------------------------------------------------------ */
export function Sheet({
  guides = 4,
  ticks = true,
  tone = "line",
  inset = "inset-x-[var(--space-gutter)] inset-y-8",
}: {
  guides?: number;
  ticks?: boolean;
  tone?: "line" | "invert";
  inset?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-fx="ticks"
      className={`u-sheet pointer-events-none absolute ${inset} ${tone === "invert" ? "u-sheet--invert" : ""}`}
    >
      {Array.from({ length: guides }, (_, i) => (
        <span
          key={i}
          data-fx="rule"
          data-fx-axis="y"
          data-fx-delay={i * 0.06}
          className={`u-rule u-rule--${tone} u-rule--v absolute inset-y-0`}
          // Evenly divided across the frame, ends excluded — a guide on
          // the frame's own edge is the frame, not a guide.
          style={{ left: `${((i + 1) / (guides + 1)) * 100}%` }}
        />
      ))}

      {ticks && (
        <>
          <span data-tick className="u-tick -top-px -left-px border-t border-l" />
          <span data-tick className="u-tick -top-px -right-px border-t border-r" />
          <span
            data-tick
            className="u-tick -bottom-px -left-px border-b border-l"
          />
          <span
            data-tick
            className="u-tick -right-px -bottom-px border-r border-b"
          />
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------
 * SEAM — the join between two sections, annotated.
 *
 * A rule that draws itself across the page with the section's index and
 * name set on it, the way a sheet division is labelled. This is what
 * replaced the site's plain `border-t`: a border cannot be drawn, and a
 * line that simply exists is the one thing this page should never have.
 * ------------------------------------------------------------------ */
export function Seam({
  index,
  label,
  tone = "line",
  children,
}: {
  /** Two digits, matching the section eyebrows. */
  index?: string;
  label?: string;
  tone?: "line" | "invert";
  children?: ReactNode;
}) {
  return (
    <div className="u-seam" aria-hidden="true">
      <Rule tone={tone} className="u-seam-rule" />
      {(index || label) && (
        <p className={`u-seam-label ${tone === "invert" ? "u-seam-label--invert" : ""}`}>
          {index && <span className="u-seam-index">{index}</span>}
          {label}
        </p>
      )}
      {children}
    </div>
  );
}
