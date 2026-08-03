import type { Scene, SceneChain, SceneHit } from "@/lib/elevation";
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
 */

interface Props {
  scene: Scene;
  /**
   * The accessible name for one cabinet. Localised, so it has to come
   * from the consumer — this module never carries user-facing text.
   */
  unitLabel: (hit: SceneHit) => string;
  /** Off for the planner, where nothing is animated and the halo is a
   *  cost without a purpose. */
  halo?: boolean;
  /** Off for the planner's non-interactive preview. */
  interactive?: boolean;
}

export default function ElevationScene({
  scene,
  unitLabel,
  halo = true,
  interactive = true,
}: Props) {
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
      <g id="tints" aria-hidden="true">
        {scene.tints.map((d, i) => (
          <path key={i} data-tint className="dwg-tint" d={d} />
        ))}
      </g>

      <g id="dims" className="dwg-dim">
        {scene.chains.map((chain) => (
          <Chain key={chain.id} chain={chain} />
        ))}
      </g>

      {interactive && (
        <>
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

          {/* The highlight the hit targets drive. Drawn once and moved,
              rather than one per cabinet — only ever a single unit is
              under the pointer. */}
          <path data-highlight className="dwg-highlight" d="" aria-hidden="true" />
        </>
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
