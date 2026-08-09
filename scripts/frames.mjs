#!/usr/bin/env node
/**
 * Frame pipeline for the scroll-scrubbed hero walkthrough.
 *
 *   npm run frames
 *
 * Decodes public/source/walkthrough.mp4 into two WebP tiers under
 * public/frames/, plus the two poster images used for LCP. Re-run this
 * after replacing the source video — everything below the CONFIG block
 * adapts to the new duration, fps and resolution automatically.
 *
 * If a tier lands over budget the script retries on its own: quality
 * drops by QUALITY_STEP, and after RETRIES_BEFORE_THINNING attempts it
 * also drops a third of the frames. It reports every attempt.
 */

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import ffmpeg from "@ffmpeg-installer/ffmpeg";

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ===================================================================
 * CONFIG — tune here.
 * ================================================================ */
const CONFIG = {
  source: "public/source/walkthrough.mp4",
  outDir: "public/frames",

  tiers: {
    desktop: {
      /** Hard ceiling on frame count; the source may have fewer. */
      maxFrames: 240,
      /** Capped to the source width — upscaling only costs bytes. */
      width: 1920,
      quality: 82,
      /*
       * Deliberately generous: the preloader now tracks the frame
       * download with real progress and holds the curtain for it, so
       * the sequence is allowed to cost what a sharp full-screen
       * walkthrough costs. The budget is a guard against runaway
       * encodes, not a target.
       */
      budgetMB: 45,
    },
    mobile: {
      /*
       * 1 = every frame, so phones get exactly the same motion as
       * desktop — only the pixel dimensions differ. Frames are held as
       * <img>, whose decoded surface the browser can evict, so a full
       * sequence does not pin memory. Raise to 2 only if the byte
       * budget genuinely cannot be met.
       */
      everyNth: 1,
      width: 960,
      quality: 76,
      budgetMB: 12,
    },
  },

  poster: {
    /** Frame index (1-based) used for the poster stills. */
    frame: 1,
    desktopWidth: 1920,
    mobileWidth: 960,
    quality: 84,
  },

  /** Budget retry behaviour. */
  QUALITY_STEP: 4,
  RETRIES_BEFORE_THINNING: 2,
  MAX_ATTEMPTS: 6,
};
/* =================================================================== */

const bin = ffmpeg.path;

async function probe(file) {
  // ffmpeg writes stream info to stderr and exits non-zero without -o.
  const { stderr } = await run(bin, ["-i", file], {
    maxBuffer: 1 << 24,
  }).catch((e) => ({ stderr: e.stderr ?? "" }));

  const duration = /Duration: (\d+):(\d+):([\d.]+)/.exec(stderr);
  const video = /Video: .*?, (\d+)x(\d+)/.exec(stderr);
  const fps = /([\d.]+) fps/.exec(stderr);
  if (!duration || !video || !fps) {
    throw new Error(`Could not probe ${file}\n${stderr}`);
  }
  const seconds =
    Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
  return {
    seconds,
    width: Number(video[1]),
    height: Number(video[2]),
    fps: Number(fps[1]),
    totalFrames: Math.floor(seconds * Number(fps[1])),
  };
}

async function dirSizeMB(dir) {
  const files = await fs.readdir(dir);
  let bytes = 0;
  for (const f of files) bytes += (await fs.stat(path.join(dir, f))).size;
  return { mb: bytes / (1024 * 1024), count: files.length };
}

async function emptyDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Extract `count` frames evenly across the clip. `select` picks source
 * frames by index so sampling stays even regardless of source fps.
 */
async function extract({ src, dir, count, totalFrames, width, quality }) {
  await emptyDir(dir);
  const step = Math.max(1, Math.round(totalFrames / count));
  await run(
    bin,
    [
      "-y",
      "-i", src,
      "-vf", `select='not(mod(n\\,${step}))',scale=${width}:-2:flags=lanczos`,
      "-vsync", "0",
      "-frames:v", String(count),
      "-c:v", "libwebp",
      "-quality", String(quality),
      "-compression_level", "6",
      "-preset", "picture",
      path.join(dir, "frame_%04d.webp"),
    ],
    { maxBuffer: 1 << 26 },
  );
  return dirSizeMB(dir);
}

async function buildTier(name, opts) {
  let { count, width, quality, budgetMB, src, totalFrames } = opts;
  const dir = path.join(ROOT, CONFIG.outDir, name);

  for (let attempt = 1; attempt <= CONFIG.MAX_ATTEMPTS; attempt++) {
    const { mb, count: written } = await extract({
      src, dir, count, totalFrames, width, quality,
    });
    const size = mb.toFixed(2);
    if (mb <= budgetMB) {
      console.log(
        `  ${name}: ${written} frames @ ${width}px q${quality} → ${size} MB (budget ${budgetMB} MB) ✓`,
      );
      return { frames: written, mb, width, quality };
    }
    console.log(
      `  ${name}: ${written} frames @ q${quality} → ${size} MB — over ${budgetMB} MB, retrying`,
    );
    quality -= CONFIG.QUALITY_STEP;
    if (attempt >= CONFIG.RETRIES_BEFORE_THINNING) {
      count = Math.max(24, Math.round(count * (2 / 3)));
    }
  }
  throw new Error(`${name} tier could not be brought under ${budgetMB} MB`);
}

async function buildPoster(src, width, quality, outFile) {
  await run(bin, [
    "-y",
    "-i", src,
    "-vf", `select='eq(n\\,${CONFIG.poster.frame - 1})',scale=${width}:-2:flags=lanczos`,
    "-frames:v", "1",
    "-c:v", "libwebp",
    "-quality", String(quality),
    outFile,
  ]);
  const { size } = await fs.stat(outFile);
  return size / 1024;
}

async function main() {
  const src = path.join(ROOT, CONFIG.source);
  await fs.access(src).catch(() => {
    throw new Error(`Source video not found at ${CONFIG.source}`);
  });

  const info = await probe(src);
  console.log(
    `\nSource: ${info.width}x${info.height}, ${info.fps} fps, ` +
      `${info.seconds.toFixed(2)}s → ~${info.totalFrames} frames\n`,
  );

  // Never upscale: the tier width is capped at the source width.
  const desktopWidth = Math.min(CONFIG.tiers.desktop.width, info.width);
  const mobileWidth = Math.min(CONFIG.tiers.mobile.width, info.width);
  if (desktopWidth < CONFIG.tiers.desktop.width) {
    console.log(
      `  note: desktop tier capped at the source width (${desktopWidth}px) ` +
        `instead of ${CONFIG.tiers.desktop.width}px — upscaling adds bytes, not detail.\n`,
    );
  }

  const desktopCount = Math.min(CONFIG.tiers.desktop.maxFrames, info.totalFrames);
  const mobileCount = Math.max(
    2,
    Math.round(desktopCount / CONFIG.tiers.mobile.everyNth),
  );

  console.log("Building tiers:");
  const desktop = await buildTier("desktop", {
    src,
    count: desktopCount,
    totalFrames: info.totalFrames,
    width: desktopWidth,
    quality: CONFIG.tiers.desktop.quality,
    budgetMB: CONFIG.tiers.desktop.budgetMB,
  });
  const mobile = await buildTier("mobile", {
    src,
    count: mobileCount,
    totalFrames: info.totalFrames,
    width: mobileWidth,
    quality: CONFIG.tiers.mobile.quality,
    budgetMB: CONFIG.tiers.mobile.budgetMB,
  });

  const posterDir = path.join(ROOT, CONFIG.outDir);
  const kbD = await buildPoster(
    src,
    Math.min(CONFIG.poster.desktopWidth, info.width),
    CONFIG.poster.quality,
    path.join(posterDir, "poster-desktop.webp"),
  );
  const kbM = await buildPoster(
    src,
    Math.min(CONFIG.poster.mobileWidth, info.width),
    CONFIG.poster.quality,
    path.join(posterDir, "poster-mobile.webp"),
  );
  console.log(
    `  posters: desktop ${kbD.toFixed(0)} KB, mobile ${kbM.toFixed(0)} KB\n`,
  );

  /* The component reads this instead of hard-coding counts, so swapping
   * the video never requires touching TypeScript. */
  const manifest = {
    generatedFrom: path.basename(CONFIG.source),
    source: {
      width: info.width,
      height: info.height,
      fps: info.fps,
      seconds: Number(info.seconds.toFixed(2)),
    },
    aspect: Number((info.width / info.height).toFixed(4)),
    tiers: {
      desktop: { frames: desktop.frames, width: desktop.width, dir: "desktop" },
      mobile: { frames: mobile.frames, width: mobile.width, dir: "mobile" },
    },
    poster: { desktop: "poster-desktop.webp", mobile: "poster-mobile.webp" },
  };
  await fs.writeFile(
    path.join(posterDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  console.log(`Wrote ${CONFIG.outDir}/manifest.json`);
  console.log(
    `Totals — desktop ${desktop.frames} frames / ${desktop.mb.toFixed(2)} MB, ` +
      `mobile ${mobile.frames} frames / ${mobile.mb.toFixed(2)} MB\n`,
  );
}

main().catch((err) => {
  console.error("\nframes.mjs failed:", err.message);
  process.exit(1);
});
