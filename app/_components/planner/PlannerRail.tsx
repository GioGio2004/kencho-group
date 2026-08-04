"use client";

import { useTranslations } from "next-intl";
import ModuleIcon from "@/app/_components/planner/ModuleIcon";
import {
  Step,
  Stepper,
  Toggle,
} from "@/app/_components/planner/PlannerControls";
import {
  LIMITS,
  canAdd,
  freeWidth,
  minWidthOf,
  usedWidth,
  type Issue,
  type IssueCode,
  type KitchenSpec,
  type Scene,
} from "@/lib/elevation";
import {
  PALETTE_ORDER,
  widthForNew,
  type PlannerAction,
  type PlannerState,
} from "@/lib/planner";

/*
 * THE CONTROL RAIL — three steps, and no step that can be got wrong.
 *
 * Every bound in here comes from LIMITS or from `validate`, never from a
 * number typed into a handler: the "+" on a width stepper is disabled by
 * the same ceiling the exporter would refuse, and the palette greys out
 * a module type by asking `canAdd` rather than by guessing at the free
 * space itself. That is the difference between a form that validates and
 * a form that cannot be made invalid in the first place.
 */

interface Props {
  state: PlannerState;
  dispatch: (action: PlannerAction) => void;
  scene: Scene;
  issues: Issue[];
}

/** Issues about the wall and the two advanced heights, not the modules. */
const STEP_ONE_CODES: readonly IssueCode[] = [
  "wallRange",
  "worktopRange",
  "upperRange",
  "upperTooLow",
];

export default function PlannerRail({ state, dispatch, scene, issues }: Props) {
  const t = useTranslations("planner");
  const spec = state.spec;

  const wallIssues = issues.filter((i) => STEP_ONE_CODES.includes(i.code));
  const moduleIssues = issues.filter((i) => !STEP_ONE_CODES.includes(i.code));

  return (
    <div className="plan-rail">
      <StepWall spec={spec} dispatch={dispatch} issues={wallIssues} t={t} />
      <StepModules
        state={state}
        dispatch={dispatch}
        issues={moduleIssues}
        t={t}
      />
      <StepUpper state={state} dispatch={dispatch} scene={scene} t={t} />
    </div>
  );
}

type T = ReturnType<typeof useTranslations<"planner">>;

/* =====================================================================
 * ISSUES
 * ================================================================== */
function Issues({ issues, t }: { issues: Issue[]; t: T }) {
  if (!issues.length) return null;
  return (
    <ul className="plan-issues" aria-live="polite">
      {issues.map((issue, i) => (
        <li
          key={`${issue.code}-${issue.unitId ?? i}`}
          data-severity={issue.severity}
          className="plan-issue"
        >
          {t(`issues.${issue.code}`, {
            ...issue.values,
            type: issue.type ? t(`types.${issue.type}`) : "",
          })}
        </li>
      ))}
    </ul>
  );
}

/* =====================================================================
 * STEP 1 — THE WALL
 * ================================================================== */
function StepWall({
  spec,
  dispatch,
  issues,
  t,
}: {
  spec: KitchenSpec;
  dispatch: (a: PlannerAction) => void;
  issues: Issue[];
  t: T;
}) {
  return (
    <Step index="01" title={t("wall.title")} hint={t("wall.hint")}>
      <div className="plan-field">
        <label className="plan-label" htmlFor="plan-wall">
          {t("wall.label")}
        </label>
        <div className="plan-wall-row">
          {/*
            Slider and number, on the same value. The slider is for
            finding a size and the field is for knowing one — a visitor
            who has measured their wall types 3240 rather than hunting
            for it a pixel at a time, and one who has not drags.
          */}
          <input
            id="plan-wall"
            type="range"
            className="plan-range"
            min={LIMITS.wall.min}
            max={LIMITS.wall.max}
            step={LIMITS.wall.step}
            value={spec.wallWidth}
            onChange={(e) => dispatch({ type: "wall", mm: e.target.valueAsNumber })}
          />
          <span className="plan-number">
            <input
              type="number"
              className="plan-number-input"
              aria-label={t("wall.label")}
              min={LIMITS.wall.min}
              max={LIMITS.wall.max}
              step={LIMITS.wall.step}
              value={spec.wallWidth}
              onChange={(e) => {
                const mm = e.target.valueAsNumber;
                if (Number.isFinite(mm)) dispatch({ type: "wall", mm });
              }}
            />
            <span className="plan-unit">{t("mm")}</span>
          </span>
        </div>
      </div>

      <div className="plan-presets" role="group" aria-label={t("wall.presets")}>
        {LIMITS.wallPresets.map((preset) => (
          <button
            key={preset}
            type="button"
            className="plan-chip-sm u-press"
            aria-pressed={spec.wallWidth === preset}
            onClick={() => dispatch({ type: "wall", mm: preset })}
          >
            {preset}
          </button>
        ))}
      </div>

      {/*
        THE ADVANCED HEIGHTS.
        900 and 2200 are what a Georgian workshop fits by default, and a
        visitor who has an opinion about worktop height already knows it.
        Folded away rather than omitted: hiding a real constraint makes
        the drawing look like it invented one.
      */}
      <details className="plan-advanced">
        <summary className="plan-summary">{t("wall.advanced")}</summary>
        <div className="plan-advanced-body">
          <Stepper
            label={t("wall.worktop")}
            value={spec.heights.worktop}
            min={LIMITS.worktop.min}
            max={LIMITS.worktop.max}
            unit={t("mm")}
            decreaseLabel={t("a11y.decrease", { field: t("wall.worktop") })}
            increaseLabel={t("a11y.increase", { field: t("wall.worktop") })}
            onStep={(dir) => dispatch({ type: "heightBy", field: "worktop", dir })}
          />
          <Stepper
            label={t("wall.upper")}
            value={spec.heights.upper}
            min={LIMITS.upper.min}
            max={LIMITS.upper.max}
            unit={t("mm")}
            decreaseLabel={t("a11y.decrease", { field: t("wall.upper") })}
            increaseLabel={t("a11y.increase", { field: t("wall.upper") })}
            onStep={(dir) => dispatch({ type: "heightBy", field: "upper", dir })}
          />
        </div>
      </details>

      <Issues issues={issues} t={t} />
    </Step>
  );
}

/* =====================================================================
 * STEP 2 — THE BASE MODULES
 * ================================================================== */
function StepModules({
  state,
  dispatch,
  issues,
  t,
}: {
  state: PlannerState;
  dispatch: (a: PlannerAction) => void;
  issues: Issue[];
  t: T;
}) {
  const spec = state.spec;
  const used = usedWidth(spec);
  const free = freeWidth(spec);
  const over = free < 0;

  /*
   * The strip is a PLAN of the run, not a list of it: each chip is as
   * wide as its cabinet, the spare wall is a real gap on the end, and an
   * overfull run visibly spills past a marked wall line. A visitor
   * should be able to see that the sink is the widest thing they own
   * without reading five numbers.
   */
  const span = Math.max(spec.wallWidth, used, 1);

  const nothingFits = PALETTE_ORDER.every((type) => !canAdd(spec, type).ok);

  return (
    <Step index="02" title={t("modules.title")} hint={t("modules.hint")}>
      {spec.baseUnits.length > 0 && (
        <div className="plan-strip-wrap">
          <ul className="plan-strip" aria-label={t("modules.stripLabel")}>
            {spec.baseUnits.map((unit, i) => (
              <li
                key={unit.id}
                className="plan-strip-cell"
                style={{ flexGrow: unit.width, flexBasis: 0 }}
              >
                <button
                  type="button"
                  className="plan-chip u-press"
                  aria-pressed={state.selected === unit.id}
                  data-invalid={
                    issues.some((iss) => iss.unitId === unit.id) ? "" : undefined
                  }
                  onClick={() =>
                    dispatch({
                      type: "select",
                      id: state.selected === unit.id ? null : unit.id,
                    })
                  }
                >
                  <ModuleIcon type={unit.type} className="plan-chip-icon" />
                  <span className="plan-chip-w">{unit.width}</span>
                  <span className="sr-only">
                    {t("a11y.module", {
                      position: i + 1,
                      type: t(`types.${unit.type}`),
                      mm: unit.width,
                    })}
                  </span>
                </button>
              </li>
            ))}

            {free > 0 && (
              <li
                aria-hidden="true"
                className="plan-strip-free"
                style={{ flexGrow: free, flexBasis: 0 }}
              />
            )}
          </ul>

          {/* Where the wall actually ends, once the run has passed it. */}
          {over && (
            <span
              aria-hidden="true"
              className="plan-wallmark"
              style={{ left: `${(spec.wallWidth / span) * 100}%` }}
            />
          )}
        </div>
      )}

      <p className="plan-free" data-over={over ? "" : undefined}>
        {over
          ? t("modules.over", { mm: -free })
          : t("modules.free", { mm: free })}
      </p>

      {/* ---- the selected module's editor ---- */}
      {state.selected && (
        <ModuleEditor state={state} dispatch={dispatch} t={t} />
      )}

      {/* ---- add ---- */}
      {state.pending ? (
        <TallConfirm state={state} dispatch={dispatch} t={t} />
      ) : state.adding ? (
        <div className="plan-palette" role="group" aria-label={t("modules.add")}>
          {PALETTE_ORDER.map((type) => {
            const gate = canAdd(spec, type);
            return (
              <button
                key={type}
                type="button"
                className="plan-palette-item u-press"
                disabled={!gate.ok}
                onClick={() => dispatch({ type: "add", unit: type })}
              >
                <ModuleIcon type={type} className="plan-palette-icon" />
                <span className="plan-palette-name">{t(`types.${type}`)}</span>
                <span className="plan-palette-w">
                  {gate.ok
                    ? `${widthForNew(spec, type)} ${t("mm")}`
                    : t(`modules.blocked.${gate.reason}`, {
                        mm: minWidthOf(type),
                      })}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            className="plan-ghost u-press"
            onClick={() => dispatch({ type: "palette", open: false })}
          >
            {t("modules.cancelAdd")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="plan-add u-press"
          disabled={nothingFits}
          onClick={() => dispatch({ type: "palette", open: true })}
        >
          <span aria-hidden="true">+</span>
          {nothingFits ? t("modules.fullWall") : t("modules.add")}
        </button>
      )}

      <Issues issues={issues} t={t} />
    </Step>
  );
}

/* ---------------------------------------------------------------------
 * The selected module. Width, order, and the way out.
 * ------------------------------------------------------------------ */
function ModuleEditor({
  state,
  dispatch,
  t,
}: {
  state: PlannerState;
  dispatch: (a: PlannerAction) => void;
  t: T;
}) {
  const spec = state.spec;
  const index = spec.baseUnits.findIndex((u) => u.id === state.selected);
  const unit = spec.baseUnits[index];
  if (!unit) return null;

  /*
   * The ceiling is the type's own maximum OR the wall's spare capacity,
   * whichever is meaner. So the "+" stops at the point where the run
   * would overflow rather than letting it and reporting it afterwards.
   */
  const others = usedWidth(spec) - unit.width;
  const max = Math.min(LIMITS.unit.max, spec.wallWidth - others);
  const min = minWidthOf(unit.type);

  return (
    <div className="plan-editor">
      <header className="plan-editor-head">
        <ModuleIcon type={unit.type} className="plan-editor-icon" />
        <span className="plan-editor-name">{t(`types.${unit.type}`)}</span>
        <span className="plan-editor-pos">
          {t("modules.position", { n: index + 1, of: spec.baseUnits.length })}
        </span>
      </header>

      <Stepper
        label={t("modules.width")}
        value={unit.width}
        min={min}
        max={Math.max(min, max)}
        unit={t("mm")}
        decreaseLabel={t("a11y.decrease", { field: t("modules.width") })}
        increaseLabel={t("a11y.increase", { field: t("modules.width") })}
        onStep={(dir) => dispatch({ type: "widthBy", id: unit.id, dir })}
      />

      <div className="plan-editor-actions">
        <div
          className="plan-move"
          role="group"
          aria-label={t("modules.reorder")}
        >
          <button
            type="button"
            className="plan-nudge u-press"
            aria-label={t("a11y.moveLeft")}
            disabled={index === 0}
            onClick={() => dispatch({ type: "move", id: unit.id, dir: -1 })}
          >
            ←
          </button>
          <button
            type="button"
            className="plan-nudge u-press"
            aria-label={t("a11y.moveRight")}
            disabled={index === spec.baseUnits.length - 1}
            onClick={() => dispatch({ type: "move", id: unit.id, dir: 1 })}
          >
            →
          </button>
        </div>

        <button
          type="button"
          className="plan-ghost u-press"
          onClick={() => dispatch({ type: "remove", id: unit.id })}
        >
          {t("modules.remove")}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
 * THE INLINE CONFIRM
 *
 * A tall unit takes its bay's full height, so the wall run loses that
 * bay — and with it, possibly, the extractor's position or the open
 * shelf the visitor turned on. Neither may vanish quietly.
 *
 * Inline in the strip rather than in a dialog: this is a consequence of
 * the button that was just pressed, not a separate decision, and a modal
 * would cover the drawing that is the whole reason to say yes.
 * ------------------------------------------------------------------ */
function TallConfirm({
  state,
  dispatch,
  t,
}: {
  state: PlannerState;
  dispatch: (a: PlannerAction) => void;
  t: T;
}) {
  const pending = state.pending;
  if (!pending) return null;

  return (
    <div className="plan-confirm" role="group" aria-live="polite">
      <p className="plan-confirm-copy">
        {pending.loss.map((loss) => t(`modules.confirm.${loss}`)).join(" ")}
      </p>
      <div className="plan-confirm-actions">
        <button
          type="button"
          className="plan-solid u-press"
          onClick={() => dispatch({ type: "confirm" })}
        >
          {t("modules.confirm.yes")}
        </button>
        <button
          type="button"
          className="plan-ghost u-press"
          onClick={() => dispatch({ type: "cancel" })}
        >
          {t("modules.confirm.no")}
        </button>
      </div>
    </div>
  );
}

/* =====================================================================
 * STEP 3 — THE WALL RUN
 * ================================================================== */
function StepUpper({
  state,
  dispatch,
  scene,
  t,
}: {
  state: PlannerState;
  dispatch: (a: PlannerAction) => void;
  scene: Scene;
  t: T;
}) {
  const td = useTranslations("drawing");
  const spec = state.spec;
  const row = spec.upperRow;

  /*
   * The gap label comes off the SCENE, not out of this component. It is
   * a SceneNote — the same object the drawing prints on the sheet and
   * the exporter will print on the PDF — so the strip below and the
   * annotation on the elevation are physically incapable of saying two
   * different things about the same bay.
   */
  const noteFor = (unitId: string) =>
    scene.notes.find((n) => n.unitId === unitId) ?? null;

  const lastIsTall =
    spec.baseUnits[spec.baseUnits.length - 1]?.type === "tall";

  return (
    <Step index="03" title={t("upper.title")} hint={t("upper.hint")}>
      <Toggle
        label={t("upper.toggle")}
        hint={t("upper.toggleHint")}
        on={!!row}
        onChange={(on) => dispatch({ type: "upper", on })}
      />

      {row && (
        <>
          <div className="plan-strip-wrap">
            <ul className="plan-strip" aria-label={t("upper.stripLabel")}>
              {spec.baseUnits.map((base, i) => {
                const note = noteFor(base.id);
                const isHood = row.hoodIndex === i;
                const isShelf =
                  row.openShelfLast && i === spec.baseUnits.length - 1;

                if (note) {
                  return (
                    <li
                      key={base.id}
                      className="plan-strip-cell"
                      style={{ flexGrow: base.width, flexBasis: 0 }}
                    >
                      <span className="plan-gap">
                        <span className="plan-gap-label">
                          {td(`notes.${note.key}`)}
                        </span>
                      </span>
                    </li>
                  );
                }

                return (
                  <li
                    key={base.id}
                    className="plan-strip-cell"
                    style={{ flexGrow: base.width, flexBasis: 0 }}
                  >
                    <button
                      type="button"
                      className="plan-chip plan-chip-upper u-press"
                      aria-pressed={isHood}
                      onClick={() =>
                        dispatch({ type: "hood", index: isHood ? null : i })
                      }
                    >
                      <span aria-hidden="true" className="plan-upper-glyph">
                        {isHood ? "⬆" : isShelf ? "≡" : "▭"}
                      </span>
                      <span className="sr-only">
                        {isHood
                          ? t("a11y.hoodHere", { position: i + 1 })
                          : t("a11y.hoodMove", { position: i + 1 })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="plan-hint">
            {row.hoodIndex === null
              ? t("upper.noHood")
              : t("upper.hoodAt", { position: row.hoodIndex + 1 })}
          </p>

          <Toggle
            label={t("upper.openShelf")}
            hint={
              lastIsTall ? t("upper.openShelfBlocked") : t("upper.openShelfHint")
            }
            on={row.openShelfLast && !lastIsTall}
            disabled={lastIsTall}
            onChange={(on) => dispatch({ type: "shelf", on })}
          />
        </>
      )}
    </Step>
  );
}
