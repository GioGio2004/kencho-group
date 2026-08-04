"use client";

import { useId, type ReactNode } from "react";

/*
 * THE RAIL'S PRIMITIVES.
 *
 * Three of them, deliberately. A configurator accumulates one bespoke
 * control per question if you let it, and then nothing on the panel
 * agrees with anything else about how a value is nudged, labelled or
 * focused. Everything in the planner is a numbered step, a stepper or a
 * switch.
 *
 * All three are ordinary buttons and inputs — no div listening for
 * clicks anywhere in this feature — so keyboard operation, focus rings
 * and the disabled state come from the platform rather than from a
 * reimplementation of it that will be one release behind.
 */

/* ---------------------------------------------------------------------
 * STEP — a numbered band in the rail.
 * ------------------------------------------------------------------ */
export function Step({
  index,
  title,
  hint,
  children,
}: {
  index: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="plan-step">
      <header className="plan-step-head">
        <span aria-hidden="true" className="plan-step-index">
          {index}
        </span>
        <h2 className="plan-step-title">{title}</h2>
      </header>
      {hint && <p className="plan-hint">{hint}</p>}
      <div className="plan-step-body">{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------------------
 * STEPPER — a bounded number, nudged.
 *
 * The buttons carry the whole interaction, so a keyboard reaches the
 * value the same way a thumb does. The arrow keys are handled on the
 * group as well because a stepper that ignores them is a stepper that
 * looks like a spin control and is not one.
 *
 * Reports a DIRECTION rather than the value it computed, which is not a
 * style preference: two clicks in one frame are batched, both handlers
 * close over the same rendered `value`, and both therefore ask for the
 * same absolute result — so the second press does nothing. Measured
 * here: a double-tap on "−" moved a 1000 mm sink to 950 and stopped.
 * A direction composes; a computed value cannot.
 * ------------------------------------------------------------------ */
export function Stepper({
  label,
  value,
  min,
  max,
  unit,
  decreaseLabel,
  increaseLabel,
  onStep,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  decreaseLabel: string;
  increaseLabel: string;
  onStep: (direction: -1 | 1) => void;
}) {
  const id = useId();

  return (
    <div className="plan-field">
      <span id={id} className="plan-label">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={id}
        className="plan-stepper"
        onKeyDown={(event) => {
          const key = event.key;
          if (key === "ArrowLeft" || key === "ArrowDown") {
            event.preventDefault();
            if (value > min) onStep(-1);
          } else if (key === "ArrowRight" || key === "ArrowUp") {
            event.preventDefault();
            if (value < max) onStep(1);
          }
        }}
      >
        <button
          type="button"
          className="plan-nudge u-press"
          aria-label={decreaseLabel}
          disabled={value <= min}
          onClick={() => onStep(-1)}
        >
          −
        </button>
        <span className="plan-stepper-value" aria-live="polite">
          {value}
          <span className="plan-unit">{unit}</span>
        </span>
        <button
          type="button"
          className="plan-nudge u-press"
          aria-label={increaseLabel}
          disabled={value >= max}
          onClick={() => onStep(1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
 * TOGGLE — a real switch, not a styled checkbox.
 * ------------------------------------------------------------------ */
export function Toggle({
  label,
  hint,
  on,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      className="plan-toggle u-press"
      onClick={() => onChange(!on)}
    >
      <span className="plan-toggle-copy">
        <span className="plan-toggle-label">{label}</span>
        {hint && <span className="plan-toggle-hint">{hint}</span>}
      </span>
      <span aria-hidden="true" className="plan-switch">
        <span className="plan-switch-knob" />
      </span>
    </button>
  );
}
