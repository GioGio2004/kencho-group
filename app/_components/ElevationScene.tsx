import type { Scene, SceneChain, SceneHit, SceneNote } from "@/lib/elevation";
import { GROUP_ORDER } from "@/lib/elevation";

/*
 * ELEVATIONSCENE — the one place a Scene becomes SVG.
 *
 * THE DRAWING section and the planner both render through this, so the
 * two surfaces cannot drift: the same spec produces byte-identical
 * markup, and the section's whole choreography (every [data-draw],
 * [data-pop], [data-chain], [data-wave] selector its GSAP effect reaches
 * for) is defined here rather than in either consumer.
 *
 * Renders the CONTENTS of an <svg>, not the element itself — the two
 * consumers frame the sheet very differently (one full-bleed and
 * scrubbed, one in a fixed stage) and the viewBox is theirs to own.
 *
 * Carries no user-facing text. Every string on the sheet arrives as a
 * function from the consumer, which is what lets the same component
 * render Georgian in the planner and English in the section.
 */

interface Props {
  scene: Scene;
  /**
   * The accessible name for one cabinet. Localised, so it has to come
   * from the consumer — this module never carries user-facing text.
   */
  unitLabel: (hit: SceneHit) => string;
  /** The wording of a written note. Same rule as `unitLabel`. */
  noteLabel: (note: SceneNote) => string;
  /** Off for the planner, where nothing is animated and the halo is a
   *  cost without a purpose. */
  halo?: boolean;
  /** The section's pointer-driven inspect layer. */
  interactive?: boolean;
  /**
   * Opacity for the depth tints. The section animates them up late and
   * so passes nothing; the planner has no timeline to hang that on and
   * states the value, which is also what keeps the tints correct in the
   * server's markup and after a cold restore.
   */
  tint?: number;
  /** Unit id to outline — the planner's current selection. */
  highlight?: string | null;
}

export default function ElevationScene({
  scene,
  unitLabel,
  noteLabel,
  halo = true,
  interactive = true,
  tint,
  highlight = null,
}: Props) {
  const marked = highlight
    ? (scene.hits.find((h) => h.unitId === highlight) ?? null)
    : null;

  return (
    <>
      {/*
        THE HALO. One <use> per structural group, painted first so it
        sits under everything. Each clone inherits the two custom
        properties #glow overrides — a wider, dimmer stroke — and,
        because a <use> shadow tree mirrors the live element, it also
        inherits the dash state GSAP is writing. So the glow draws itself
        in step with the line it is glowing under, for six elements and
        zero tweens.
      */}
      {halo && (
        <g id="glow" aria-hidden="true">
          {GROUP_ORDER.map((id) => (
            <use key={id} href={`#${id}`} />
          ))}
        </g>
      )}

      {/* Where the pen tips are appended, above the linework. */}
      {halo && <g id="tips" aria-hidden="true" />}

      {scene.groups.map((group) => (
        <g key={group.id} id={group.id} className="dwg-line">
          {group.paths.map((path, i) =>
            path.role === "draw" ? (
              <path key={i} data-draw d={path.d} />
            ) : (
              <path key={i} data-pop d={path.d} />
            ),
          )}
        </g>
      ))}

      {/* Panel tints — depth, arriving late and barely there. Faces
          rather than flat rectangles, so the light reads as falling on
          surfaces. */}
      <g
        id="tints"
        aria-hidden="true"
        style={tint === undefined ? undefined : { opacity: tint }}
      >
        {scene.tints.map((d, i) => (
          <path key={i} data-tint className="dwg-tint" d={d} />
        ))}
      </g>

      <g id="dims" className="dwg-dim">
        {scene.chains.map((chain) => (
          <Chain key={chain.id} chain={chain} />
        ))}
      </g>

      {/*
        WRITTEN NOTES. Drawn in the annotation weight and grouped
        separately from the chains, because a note is not a measurement:
        the section's dimension waves must not sweep it up, and the
        planner redraws it with the linework it belongs to.
      */}
      {scene.notes.length > 0 && (
        <g id="notes" className="dwg-dim">
          {scene.notes.map((note) => (
            <g key={note.id} data-note={note.id} data-note-unit={note.unitId}>
              {note.paths.map((path, i) =>
                path.role === "draw" ? (
                  <path key={i} data-draw d={path.d} />
                ) : (
                  <path key={i} data-pop className="dwg-solid" d={path.d} />
                ),
              )}
              <text
                x={note.x}
                y={note.y}
                textAnchor="middle"
                className="dwg-note"
              >
                {noteLabel(note)}
              </text>
            </g>
          ))}
        </g>
      )}

      {interactive && (
        <g id="hits">
          {scene.hits.map((hit) => (
            <path
              key={hit.unitId}
              className="dwg-hit"
              data-hit={hit.unitId}
              role="button"
              tabIndex={-1}
              aria-label={unitLabel(hit)}
              d={hit.d}
            />
          ))}
        </g>
      )}

      {/*
        The highlight. Drawn once and moved rather than one per cabinet —
        only ever a single unit is under the pointer, or selected.

        The section moves it from JS and leaves the `d` empty on the
        server; the planner states it, so a restored selection is
        outlined on the first frame rather than after an effect runs.
      */}
      {(interactive || marked) && (
        <path
          data-highlight
          data-on={marked ? "" : undefined}
          className="dwg-highlight"
          d={marked?.d ?? ""}
          aria-hidden="true"
        />
      )}
    </>
  );
}

/**
 * One dimension chain: a single baseline, one extension line per stop,
 * and a measured segment between each neighbouring pair. Interior stops
 * carry two arrowheads pointing opposite ways, which is what makes a run
 * of five cabinets read as one chain rather than as five dimensions that
 * happen to be level with each other.
 */
function Chain({ chain }: { chain: SceneChain }) {
  return (
    <g
      data-chain={chain.id}
      data-wave={chain.wave}
      className={chain.wide ? "dwg-wide" : undefined}
    >
      {chain.paths.map((path, i) =>
        path.role === "draw" ? (
          <path key={i} data-draw d={path.d} />
        ) : (
          <path key={i} data-pop className="dwg-solid" d={path.d} />
        ),
      )}
      {chain.labels.map((label, i) => (
        <text
          key={i}
          data-value={label.value}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          transform={
            label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined
          }
          className="dwg-label"
        >
          {label.value}
        </text>
      ))}
    </g>
  );
}
