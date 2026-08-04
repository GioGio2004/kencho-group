import type { UnitType } from "@/lib/elevation";

/*
 * MODULE ICONS — the five types, drawn rather than pictured.
 *
 * Same vocabulary as the sheet: hairline strokes, no fills, round caps,
 * front elevation. A set of filled glyphs here would be the one place on
 * the page where a cabinet is illustrated instead of drawn, and the
 * palette sits four inches from a technical drawing of the same objects.
 *
 * All five share a 24-unit box so they line up in a row, and the two
 * proportions inside it carry the actual information: base modules are
 * wide and stop short of the top, the tall unit is narrow and runs the
 * full height. That difference is the reason the tall unit has no wall
 * cabinet above it, so the icons make the rule visible before the
 * drawing has to explain it.
 */

const BASE = { x: 3, y: 5, w: 18, h: 15 };

export default function ModuleIcon({
  type,
  className,
}: {
  type: UnitType;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {type === "doors" && (
        <>
          <rect x={BASE.x} y={BASE.y} width={BASE.w} height={BASE.h} />
          <path d="M12 5v15" />
          <path d="M10.6 11.2v2.6M13.4 11.2v2.6" />
        </>
      )}

      {type === "drawers" && (
        <>
          <rect x={BASE.x} y={BASE.y} width={BASE.w} height={BASE.h} />
          <path d="M3 10h18M3 15h18" />
          <path d="M9.5 7.6h5M9.5 12.6h5M9.5 17.6h5" />
        </>
      )}

      {type === "oven" && (
        <>
          <rect x={BASE.x} y={BASE.y} width={BASE.w} height={BASE.h} />
          {/* Drawer over the appliance opening, then the door glass. */}
          <path d="M3 9h18" />
          <path d="M9.5 7h5" />
          <rect x={6} y={12} width={12} height={5} />
          <path d="M6 9.9h12" />
        </>
      )}

      {type === "sink" && (
        <>
          <rect x={BASE.x} y={BASE.y} width={BASE.w} height={BASE.h} />
          {/* The bowl sits in the worktop, so it breaks the top edge. */}
          <path d="M7 5v3.2a1.4 1.4 0 0 0 1.4 1.4h7.2A1.4 1.4 0 0 0 17 8.2V5" />
          <path d="M12 12.6v7.4" />
        </>
      )}

      {type === "tall" && (
        <>
          <rect x={6} y={2} width={12} height={20} />
          <path d="M12 2v20" />
          <path d="M10.7 10.6v2.8M13.3 10.6v2.8" />
        </>
      )}
    </svg>
  );
}
