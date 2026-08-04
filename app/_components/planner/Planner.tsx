"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useSyncExternalStore,
} from "react";
import { useTranslations } from "next-intl";
import PlannerRail from "@/app/_components/planner/PlannerRail";
import PlannerStage from "@/app/_components/planner/PlannerStage";
import { buildScene, validate } from "@/lib/elevation";
import { SHEET_BREAKPOINT } from "@/lib/drawing";
import {
  INITIAL_STATE,
  plannerReducer,
  readStoredSpec,
  writeStoredSpec,
} from "@/lib/planner";

/*
 * THE PLANNER.
 *
 * A visitor sets a wall width, drops modules along it and watches the
 * workshop drawing redraw itself as they go. The drawing is the same one
 * the marketing section spends a full screen assembling — same engine,
 * same component, same line weights — which is the point: the sheet the
 * site uses to argue for its precision is the sheet you get back.
 *
 * TWO RULES HOLD THIS TOGETHER.
 *
 * First, the spec is the only state. Everything on screen — the
 * elevation, every dimension, the free-width readout, the gap notes, the
 * enabled and disabled buttons — is derived from it on every render by
 * pure functions in lib/elevation. There is no second copy of the truth
 * to fall out of step, so there is no interaction order that can produce
 * a drawing and a readout that disagree.
 *
 * Second, THE RESTORE PATH IS A COLD JUMP. A visitor returning to a
 * saved session lands with no interaction history at all, and everything
 * has to be right on the first frame: the stored spec is resolved in a
 * layout effect, before paint, and the render that follows produces the
 * finished sheet with correct numbers. Nothing on this page waits for an
 * animation, a scroll position or a pointer event to become true — the
 * same discipline the section's dimension counters needed, for the same
 * reason.
 */

/** The one subscription behind `wide`. Module scope, so the store is
 *  stable across renders and React never resubscribes. */
function subscribeToWide(onChange: () => void) {
  const mq = window.matchMedia(`(min-width: ${SHEET_BREAKPOINT}px)`);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export default function Planner() {
  const t = useTranslations("planner");
  const [state, dispatch] = useReducer(plannerReducer, INITIAL_STATE);

  /*
   * THE SHEET'S FRAMING, read rather than stored.
   *
   * The handheld sheet drops its two outermost chains, so this decides
   * which scene gets built — and it is a property of the browser, not of
   * the planner, so it is subscribed to rather than copied into state.
   * `useSyncExternalStore` also gives the server an explicit answer,
   * which is what keeps the markup it renders and the markup React
   * hydrates identical.
   */
  const wide = useSyncExternalStore(
    subscribeToWide,
    () => window.matchMedia(`(min-width: ${SHEET_BREAKPOINT}px)`).matches,
    () => true,
  );

  /*
   * `ready` lives in the reducer rather than beside it, because it is
   * one fact with the restore: the planner is ready the moment it knows
   * which kitchen it is drawing. It gates the two things that must not
   * run against the server's placeholder — the intro draw, which would
   * otherwise play for K-01 and immediately replay for the restored
   * kitchen, and the write-back, which would otherwise put K-01 over the
   * stored spec before it had been read.
   */
  const ready = state.ready;

  useLayoutEffect(() => {
    dispatch({ type: "hydrate", spec: readStoredSpec() });
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeStoredSpec(state.spec);
  }, [state.spec, ready]);

  /*
   * The dark surface. Scoped to the root element below so the tokens
   * resolve in the server's markup too, and mirrored onto <html> for the
   * fixed header — which floats over this page and would otherwise print
   * sand-coloured type on charcoal.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-surface", "dark");
    return () => root.removeAttribute("data-surface");
  }, []);

  const scene = useMemo(
    () => buildScene(state.spec, { wide }),
    [state.spec, wide],
  );
  const issues = useMemo(() => validate(state.spec), [state.spec]);

  return (
    <div data-planner data-surface="dark" className="plan-root">
      <header className="plan-masthead">
        <p className="u-eyebrow flex items-center gap-3 text-[var(--dwg-bone-dim)]!">
          <span aria-hidden="true" className="text-[var(--dwg-gold)]">
            05
          </span>
          {t("eyebrow")}
        </p>
        <h1 className="plan-title u-display">{t("title")}</h1>
        <p className="plan-lede">{t("lede")}</p>
      </header>

      <div className="plan-grid">
        <div className="plan-stage-col">
          <PlannerStage
            spec={state.spec}
            scene={scene}
            selected={state.selected}
            ready={ready}
          />
        </div>

        <div className="plan-rail-col">
          <PlannerRail
            state={state}
            dispatch={dispatch}
            scene={scene}
            issues={issues}
          />

          <div className="plan-footnote">
            <p>{t("disclaimer")}</p>
            <button
              type="button"
              className="plan-ghost u-press"
              onClick={() => dispatch({ type: "reset" })}
            >
              {t("reset")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
