/*
 * Line-art of a Kencho signature interior: an arched niche with backlit
 * shelves beside a vertical wood-slat wall — drawn stroke-by-stroke by
 * GSAP DrawSVG during the intro, then "filled in" with wood and LED glow.
 *
 * Two stroke layers render the same paths: a blurred gold layer underneath
 * (the glow) and a crisp layer on top. Both are drawn simultaneously.
 */

const STROKES: { cls: string; d: string }[] = [
  { cls: "kg-line-floor", d: "M25 210 H375" },
  { cls: "kg-line-arch", d: "M55 210 V115 Q55 65 105 65 Q155 65 155 115 V210" },
  { cls: "kg-line-shelves", d: "M67 133 H143 M67 168 H143 M67 198 H143" },
  {
    cls: "kg-line-slats-a",
    d: "M195 55 V210 M229 45 V210 M263 60 V210 M297 50 V210 M331 65 V210",
  },
  {
    cls: "kg-line-slats-b",
    d: "M212 80 V210 M246 95 V210 M280 105 V210 M314 88 V210 M348 100 V210",
  },
  {
    cls: "kg-line-dim",
    d: "M55 44 H155 M55 39 V49 M155 39 V49 M368 45 V210 M363 45 H373 M363 210 H373",
  },
];

const SLAT_FILLS: { x: number; y: number }[] = [
  { x: 192, y: 55 },
  { x: 209, y: 80 },
  { x: 226, y: 45 },
  { x: 243, y: 95 },
  { x: 260, y: 60 },
  { x: 277, y: 105 },
  { x: 294, y: 50 },
  { x: 311, y: 88 },
  { x: 328, y: 65 },
  { x: 345, y: 100 },
];

const SHELF_GLOWS: { y: number }[] = [{ y: 131 }, { y: 166 }, { y: 196 }];

const LED_STRIPS: { x: number; y: number }[] = [
  { x: 204.5, y: 92 },
  { x: 238.5, y: 106 },
  { x: 272.5, y: 116 },
  { x: 306.5, y: 100 },
  { x: 340.5, y: 112 },
];

function StrokeLayer({ className }: { className: string }) {
  return (
    <g className={className} fill="none" strokeLinecap="round">
      {STROKES.map((s) => (
        <path key={s.cls} className={s.cls} d={s.d} />
      ))}
    </g>
  );
}

export default function KenchoLineArt() {
  return (
    <svg
      data-intro-art
      viewBox="0 0 400 240"
      className="h-auto w-full max-w-3xl"
      role="img"
      aria-label="კენჭო ჯგუფის ინტერიერის ესკიზი — თაღოვანი ნიშა და ხის ლამელების კედელი"
    >
      <defs>
        <filter id="kg-blur-fill" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        <filter id="kg-blur-stroke" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <linearGradient id="kg-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e4720" />
          <stop offset="1" stopColor="#452a10" />
        </linearGradient>
      </defs>

      <g className="kg-fills">
        <path
          d="M55 210 V115 Q55 65 105 65 Q155 65 155 115 V210 Z"
          fill="url(#kg-wood)"
        />
        <g fill="#eab558" filter="url(#kg-blur-fill)">
          {SHELF_GLOWS.map((s) => (
            <rect key={`sg-${s.y}`} x={67} y={s.y} width={76} height={3.5} />
          ))}
          {LED_STRIPS.map((l) => (
            <rect key={`lg-${l.x}`} x={l.x} y={l.y} width={2} height={210 - l.y} />
          ))}
        </g>
        <g fill="#f2c477">
          {SHELF_GLOWS.map((s) => (
            <rect key={`sc-${s.y}`} x={67} y={s.y} width={76} height={3} />
          ))}
          {LED_STRIPS.map((l) => (
            <rect key={`lc-${l.x}`} x={l.x} y={l.y} width={1.4} height={210 - l.y} />
          ))}
        </g>
        <g>
          {SLAT_FILLS.map((s, i) => (
            <rect
              key={`sf-${s.x}`}
              x={s.x}
              y={s.y}
              width={6}
              height={210 - s.y}
              fill={i % 2 === 0 ? "#7e5226" : "#96652f"}
            />
          ))}
        </g>
      </g>

      <g filter="url(#kg-blur-stroke)">
        <g className="kg-lines-glow" stroke="#e9c87f" strokeWidth={2.2}>
          <StrokeLayer className="kg-strokes" />
        </g>
      </g>
      <g className="kg-lines-crisp" stroke="#d4a344" strokeWidth={1.4}>
        <StrokeLayer className="kg-strokes" />
      </g>
    </svg>
  );
}
