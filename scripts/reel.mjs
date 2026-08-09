#!/usr/bin/env node
/**
 * Encode pipeline for the services reel background footage.
 *
 *   npm run reel
 *
 * Reads the high-quality master at public/source/workshop-reel.mp4 and
 * writes the two web encodes plus the poster still that ServicesReel
 * serves:
 *
 *   public/video/workshop-reel.mp4         1080p, CRF-driven high quality
 *   public/video/workshop-reel-mobile.mp4  960px, for phone data plans
 *   public/video/workshop-reel-poster.jpg  the film's own first frame
 *
 * CRF encoding rather than a bitrate target: the encoder spends bytes
 * where the picture needs them, which is what the previous ~1.2 Mbps
 * files were starved of. Re-run after replacing the master.
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
  source: "public/source/workshop-reel.mp4",
  outDir: "public/video",

  desktop: {
    file: "workshop-reel.mp4",
    /** Longest edge; capped to the source, never upscaled. */
    width: 1920,
    /** x264 CRF: 18 is visually lossless territory, 23 is default.
     *  20 keeps wood grain and highlights without an absurd file. */
    crf: 20,
    preset: "slow",
  },
  mobile: {
    file: "workshop-reel-mobile.mp4",
    width: 960,
    crf: 23,
    preset: "slow",
  },
  poster: {
    file: "workshop-reel-poster.jpg",
    width: 1920,
    quality: 3, // mjpeg qscale: 2–5 is high quality
  },
};
/* =================================================================== */

const bin = ffmpeg.path;

async function probe(file) {
  const { stderr } = await run(bin, ["-i", file], {
    maxBuffer: 1 << 24,
  }).catch((e) => ({ stderr: e.stderr ?? "" }));
  const video = /Video: .*?, (\d+)x(\d+)/.exec(stderr);
  const duration = /Duration: (\d+):(\d+):([\d.]+)/.exec(stderr);
  if (!video || !duration) throw new Error(`Could not probe ${file}\n${stderr}`);
  const seconds =
    Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
  return { width: Number(video[1]), height: Number(video[2]), seconds };
}

async function encode(src, out, { width, crf, preset }, sourceWidth) {
  const w = Math.min(width, sourceWidth);
  await run(
    bin,
    [
      "-y",
      "-i", src,
      "-vf", `scale=${w}:-2:flags=lanczos`,
      "-c:v", "libx264",
      "-crf", String(crf),
      "-preset", preset,
      "-pix_fmt", "yuv420p",
      "-profile:v", "high",
      // The file starts playing before it finishes downloading.
      "-movflags", "+faststart",
      // Background footage is mute by contract.
      "-an",
      out,
    ],
    { maxBuffer: 1 << 26 },
  );
  const { size } = await fs.stat(out);
  return { mb: size / (1024 * 1024), width: w };
}

async function poster(src, out, { width, quality }, sourceWidth) {
  const w = Math.min(width, sourceWidth);
  await run(bin, [
    "-y",
    "-i", src,
    "-vf", `select='eq(n\\,0)',scale=${w}:-2:flags=lanczos`,
    "-frames:v", "1",
    "-qscale:v", String(quality),
    out,
  ]);
  const { size } = await fs.stat(out);
  return size / 1024;
}

async function main() {
  const src = path.join(ROOT, CONFIG.source);
  await fs.access(src).catch(() => {
    throw new Error(
      `Master not found at ${CONFIG.source}.\n` +
        `Drop the highest-quality export you have there (1080p or better) and re-run.`,
    );
  });

  const info = await probe(src);
  console.log(
    `\nMaster: ${info.width}x${info.height}, ${info.seconds.toFixed(1)}s\n`,
  );
  if (info.width < 1920) {
    console.log(
      `  note: the master is ${info.width}px wide — the desktop encode is capped there.\n` +
        `  A 1920px (or larger) master is what actually raises the quality.\n`,
    );
  }

  const outDir = path.join(ROOT, CONFIG.outDir);
  await fs.mkdir(outDir, { recursive: true });

  const d = await encode(
    src,
    path.join(outDir, CONFIG.desktop.file),
    CONFIG.desktop,
    info.width,
  );
  console.log(
    `  desktop: ${d.width}px CRF ${CONFIG.desktop.crf} → ${d.mb.toFixed(1)} MB`,
  );

  const m = await encode(
    src,
    path.join(outDir, CONFIG.mobile.file),
    CONFIG.mobile,
    info.width,
  );
  console.log(
    `  mobile:  ${m.width}px CRF ${CONFIG.mobile.crf} → ${m.mb.toFixed(1)} MB`,
  );

  const kb = await poster(
    src,
    path.join(outDir, CONFIG.poster.file),
    CONFIG.poster,
    info.width,
  );
  console.log(`  poster:  ${kb.toFixed(0)} KB\n`);
}

main().catch((err) => {
  console.error("\nreel.mjs failed:", err.message);
  process.exit(1);
});
