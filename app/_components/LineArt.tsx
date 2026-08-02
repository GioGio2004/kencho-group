/*
 * The preloader's line drawing — a minimal kitchen vignette in single
 * 1.5px strokes, authored to read clearly at ~230px wide (390px phones).
 *
 * SWAPPING IN A CUSTOM ILLUSTRATION LATER:
 * keep the same contract and the Hero choreography works unchanged —
 *   - one <svg data-line-art> root, stroke="currentColor" everywhere,
 *   - main geometry paths inside  <g data-la="main">,
 *   - secondary strokes inside    <g data-la="detail">,
 *   - every path: fill="none", vectorEffect="non-scaling-stroke".
 * The Hero draws [data-la="main"] paths first, then [data-la="detail"],
 * then flashes the whole svg to brass via `color`.
 */
export default function LineArt() {
  return (
    <svg
      data-line-art
      viewBox="0 0 480 300"
      fill="none"
      aria-hidden="true"
      className="h-auto w-full"
    >
      <g
        data-la="main"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* floor */}
        <path d="M20 250 H460" vectorEffect="non-scaling-stroke" />
        {/* lower cabinet run */}
        <path d="M40 250 V180 H300 V250" vectorEffect="non-scaling-stroke" />
        {/* countertop overhang */}
        <path d="M32 180 H310" vectorEffect="non-scaling-stroke" />
        {/* upper cabinets */}
        <path d="M60 130 V60 H260 V130 H60" vectorEffect="non-scaling-stroke" />
        {/* tall unit, right */}
        <path d="M340 250 V70 H440 V250" vectorEffect="non-scaling-stroke" />
      </g>

      <g
        data-la="detail"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* lower door splits */}
        <path d="M105 180 V250" vectorEffect="non-scaling-stroke" />
        <path d="M170 180 V250" vectorEffect="non-scaling-stroke" />
        <path d="M235 180 V250" vectorEffect="non-scaling-stroke" />
        {/* lower door handles */}
        <path d="M88 196 H96" vectorEffect="non-scaling-stroke" />
        <path d="M153 196 H161" vectorEffect="non-scaling-stroke" />
        <path d="M218 196 H226" vectorEffect="non-scaling-stroke" />
        {/* upper door split + handles */}
        <path d="M160 60 V130" vectorEffect="non-scaling-stroke" />
        <path d="M146 98 H152" vectorEffect="non-scaling-stroke" />
        <path d="M168 98 H174" vectorEffect="non-scaling-stroke" />
        {/* tall unit: oven line + handle bar */}
        <path d="M340 160 H440" vectorEffect="non-scaling-stroke" />
        <path d="M370 143 H410" vectorEffect="non-scaling-stroke" />
        {/* open shelf under the uppers */}
        <path d="M60 152 H260" vectorEffect="non-scaling-stroke" />
        {/* pendant light: cord + shade */}
        <path d="M300 20 V52" vectorEffect="non-scaling-stroke" />
        <path d="M288 52 H312 L305 71 H295 Z" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
