/**
 * Makes the project's shared `lib/*.ts` modules importable by plain Node.
 *
 *   node --import ./scripts/alias-hook.mjs scripts/whatever.mjs
 *
 * Node 24 strips TypeScript types on its own, so a lib module can be
 * unit-tested directly — no bundler, no test runner, and no copy of the
 * logic living in the test. Two things still stand in the way, and this
 * removes both:
 *
 *   - `@/…` is a tsconfig path alias Node knows nothing about.
 *   - `import x from "./x.json"` is what Next accepts; Node requires an
 *     `with { type: "json" }` attribute the source does not carry.
 */
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

/** Already a file:// URL — do NOT run it back through pathToFileURL, which
 *  on Windows turns "/C:/…" into "C:\C:\…". */
const ROOT = new URL("../", import.meta.url).href;

/** TypeScript imports are written without an extension; Node's resolver
 *  needs the real filename. */
const EXTENSIONS = [".ts", ".tsx", ".mjs", ".js", ""];

function alias(specifier) {
  const base = new URL(specifier.slice(2), ROOT).href;
  for (const ext of EXTENSIONS) {
    if (existsSync(fileURLToPath(base + ext))) return base + ext;
  }
  return base;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier.startsWith("@/") ? alias(specifier) : specifier,
      context,
    );
  },

  load(url, context, nextLoad) {
    /*
     * Only OUR json, and never a dependency's. The first version of this
     * hook rewrote every .json in the process and broke Playwright, whose
     * own browsers.json is read through a path that does not expect an ES
     * module wrapper — the failure surfaced as an unrelated TypeError
     * deep inside playwright-core.
     */
    if (
      url.startsWith(ROOT) &&
      url.endsWith(".json") &&
      !url.includes("/node_modules/")
    ) {
      // Handed back as a module rather than as `format: "json"`, so the
      // missing import attribute never gets checked.
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`,
      };
    }
    return nextLoad(url, context);
  },
});
