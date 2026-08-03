#!/usr/bin/env node
/**
 * Theme integrity: the two rules the token refactor established.
 *
 *   node --import ./scripts/alias-hook.mjs scripts/verify-theme.mjs
 *
 * 1. NO LITERAL COLOUR outside app/theme.css. A hex or an rgb()/rgba()
 *    anywhere else means a value has escaped the token source, which is
 *    exactly the state this refactor existed to end. Two exceptions are
 *    allowed and both are structural — see ALLOWED below.
 *
 * 2. PALETTE IN lib/site.ts MATCHES THE THEME. The OpenGraph card and
 *    the theme-color meta tag render where no stylesheet exists, so they
 *    hold literals. Nothing in the language can keep those in step with
 *    the CSS, so this does.
 *
 * Static analysis only — no browser needed, so it can run in a hook or a
 * pre-commit without a dev server.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE } from "../lib/site.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const THEME = join(ROOT, "app", "theme.css");

/**
 * Literals that may live outside the theme file, each with the reason
 * it cannot be a token. Anything not on this list is a failure.
 */
const ALLOWED = [
  {
    file: "app/globals.css",
    value: "#000",
    why: "marquee mask gradient — only the alpha channel is sampled, the colour is meaningless",
  },
  {
    file: "lib/site.ts",
    value: "*",
    why: "PALETTE, for the Satori/edge renderers that have no CSSOM — parity asserted below",
  },
  {
    file: "app/_components/Projects.tsx",
    value: "#efe7dd",
    why: "WARM_BLUR comment documenting the base64 blur tone",
  },
];

const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d/g;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "shots"]);
const EXTS = /\.(tsx?|css|mjs)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTS.test(name)) out.push(full);
  }
  return out;
}

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

/* ---- 1. no literal colour outside the theme ---- */
const strays = [];
for (const file of walk(join(ROOT, "app")).concat(walk(join(ROOT, "lib")))) {
  if (file === THEME) continue;
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  // The verification harnesses parse colours by construction.
  if (rel.startsWith("scripts/")) continue;

  const source = readFileSync(file, "utf8");
  source.split("\n").forEach((line, i) => {
    const hits = line.match(COLOUR);
    if (!hits) return;
    for (const hit of hits) {
      const excused = ALLOWED.some(
        (a) => a.file === rel && (a.value === "*" || hit.startsWith(a.value)),
      );
      if (!excused) strays.push(`${rel}:${i + 1}  ${hit}  ${line.trim().slice(0, 60)}`);
    }
  });
}
check(
  "no literal colour outside app/theme.css",
  strays.length === 0,
  strays.length ? `\n      ${strays.join("\n      ")}` : "",
);

/* ---- 2. PALETTE matches the theme ---- */
const theme = readFileSync(THEME, "utf8");
const tokenOf = (name) => {
  const m = theme.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
};

const parity = [
  ["sand", "sand"],
  ["ink", "ink"],
  ["clay", "clay"],
  ["charcoalDeep", "dwg-bg"],
];
for (const [key, token] of parity) {
  const want = tokenOf(token);
  check(
    `PALETTE.${key} matches --${token}`,
    want !== null && PALETTE[key].toLowerCase() === want.toLowerCase(),
    `PALETTE ${PALETTE[key]} vs theme ${want}`,
  );
}

console.log(failures ? `\n${failures} FAILED` : "\nall theme checks passed");
process.exit(failures ? 1 : 0);
