/**
 * Étape 1b — 5 photos → Kling (prompt stable) → assemblage FFmpeg.
 *
 * Usage: npx tsx scripts/test-kling-reel.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  generateKlingClipFromImage,
} from "../src/lib/ai/kling";
import { uploadLocalImageToFal } from "../src/lib/ai/fal";

const PHOTOS = [
  "public/templates/demo-sources/paris/01.jpg",
  "public/templates/demo-sources/paris/02.jpg",
  "public/templates/demo-sources/paris/04.jpg",
  "public/templates/demo-sources/paris/05.jpg",
  "public/templates/demo-sources/paris/06.jpg",
];

async function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const raw = await fs.readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] == null) process.env[m[1]] = val;
    }
  } catch {
    /* ignore */
  }
}

async function getFfmpeg(): Promise<string> {
  const ffmpegStatic = (await import("ffmpeg-static")).default;
  if (!ffmpegStatic) throw new Error("ffmpeg-static introuvable");
  return ffmpegStatic;
}

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`exit ${code}`)),
    );
  });
}

async function main() {
  await loadEnvLocal();
  const ffmpeg = await getFfmpeg();
  const outDir = path.join(process.cwd(), "tmp", "kling-tests", "reel");
  await fs.mkdir(outDir, { recursive: true });

  const clipPaths: string[] = [];

  for (let i = 0; i < PHOTOS.length; i++) {
    const local = path.join(process.cwd(), PHOTOS[i]);
    await fs.access(local);
    console.log(`\n=== Clip ${i + 1}/${PHOTOS.length} ===`);
    console.log("photo", PHOTOS[i]);

    const imageUrl = await uploadLocalImageToFal(local);
    const { videoUrl, requestId } = await generateKlingClipFromImage({
      imageUrl,
      durationSec: 4,
    });
    console.log("requestId", requestId);

    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const dest = path.join(outDir, `clip-${String(i + 1).padStart(2, "0")}.mp4`);
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log("saved", dest);
    clipPaths.push(dest);
  }

  // Normalise chaque clip en 1080x1920 / 30fps pour xfade
  const normalized: string[] = [];
  for (let i = 0; i < clipPaths.length; i++) {
    const norm = path.join(outDir, `n-${String(i + 1).padStart(2, "0")}.mp4`);
    await run(ffmpeg, [
      "-y",
      "-i",
      clipPaths[i],
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-an",
      norm,
    ]);
    normalized.push(norm);
  }

  // xfade chain (fade 0.35s entre clips de ~4s)
  const fade = 0.35;
  const clipDur = 4;
  const inputs = normalized.flatMap((p) => ["-i", p]);
  const filterParts: string[] = [];
  let last = "[0:v]";
  let offset = clipDur - fade;
  for (let i = 1; i < normalized.length; i++) {
    const out = i === normalized.length - 1 ? "[vout]" : `[v${i}]`;
    filterParts.push(
      `${last}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(2)}${out}`,
    );
    last = out;
    offset += clipDur - fade;
  }

  const finalPath = path.join(outDir, `areo-reel-${Date.now()}.mp4`);
  await run(ffmpeg, [
    "-y",
    ...inputs,
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    "[vout]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    finalPath,
  ]);

  console.log("\n✓ Reel assemblé :", finalPath);
  console.log("Ouvre ce fichier pour juger stabilité + transitions.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
