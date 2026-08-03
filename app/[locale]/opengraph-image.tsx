import { ImageResponse } from "next/og";
import { PALETTE, SITE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kencho Group — custom furniture in Tbilisi";

/*
 * Wordmark-on-warm-background OG card. Latin-only text so the bundled
 * font renders every locale safely; replace with a designed static
 * image once the real logo SVG arrives.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: PALETTE.sand,
          color: PALETTE.ink,
        }}
      >
        <div
          style={{
            fontSize: 132,
            letterSpacing: "0.28em",
            marginLeft: "0.28em",
            display: "flex",
          }}
        >
          {SITE.wordmark}
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 36,
            letterSpacing: "0.6em",
            marginLeft: "0.6em",
            color: PALETTE.clay,
            display: "flex",
          }}
        >
          {SITE.wordmarkSub}
        </div>
        <div
          style={{
            marginTop: 54,
            fontSize: 26,
            letterSpacing: "0.18em",
            color: PALETTE.inkSoft,
            display: "flex",
          }}
        >
          CUSTOM FURNITURE — TBILISI
        </div>
      </div>
    ),
    size,
  );
}
