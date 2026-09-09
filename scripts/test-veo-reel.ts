/**
 * 3 photos → Veo 3.1 I2V (fidélité photo) → assemblage FFmpeg.
 * Coût approx. standard : 3 × 4s × $0.20 = ~$2.40 ; Fast : × $0.10 = ~$1.20.
 *
 * Usage:
 *   npx tsx scripts/test-veo-reel.ts
 *   npx tsx scripts/test-veo-reel.ts --fast
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fal } from "@fal-ai/client";
import { uploadLocalImageToFal } from "../src/lib/ai/fal";

const PHOTOS = [
  "public/templates/demo-sources/paris/01.jpg",
  "public/templates/demo-sources/paris/02.jpg",
  "public/templates/demo-sources/paris/04.jpg",
];

/** Fidélité max : animer la photo, ne rien inventer. */
const VEO_FIDELITY_PROMPT =
  "Animate ONLY the provided real-estate photo. Strictly preserve the exact room layout, furniture, decor, materials, colors, and architecture — do not add, remove, replace, invent, or rearrange any objects, furniture, plants, art, or people. Locked-off cinematic slow push-in on a tripod slider, extremely smooth constant speed, rock-steady, subtle depth parallax only. Photorealistic, natural daylight matching the source image. No text, no watermark.";

const VEO_NEGATIVE =
  "invented furniture, new objects, extra decor, morphing, melting walls, warped geometry, camera shake, handheld, wobble, people, text, watermark, logo, cartoon";

const CLIP_DURATION_SEC = 4;
const CLIP_DURATION = "4s" as const;
const USE_FAST = process.argv.includes("--fast");
const VEO_MODEL = USE_FAST
  ? "fal-ai/veo3.1/fast/image-to-video"
  : "fal-ai/veo3.1/image-to-video";
const PRICE_PER_SEC = USE_FAST ? 0.1 : 0.2;

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
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new Error("FAL_KEY manquante");
  fal.config({ credentials: key });

  const ffmpeg = await getFfmpeg();
  const outDir = path.join(
    process.cwd(),
    "tmp",
    "kling-tests",
    USE_FAST ? "veo-fast-reel" : "veo-reel",
  );
  await fs.mkdir(outDir, { recursive: true });

  console.log(
    `Veo 3.1 ${USE_FAST ? "Fast" : "Standard"} × ${PHOTOS.length} clips × ${CLIP_DURATION} (~$${(PHOTOS.length * CLIP_DURATION_SEC * PRICE_PER_SEC).toFixed(2)} sans audio)`,
  );
  console.log("model", VEO_MODEL);

  const clipPaths: string[] = [];

  for (let i = 0; i < PHOTOS.length; i++) {
    const local = path.join(process.cwd(), PHOTOS[i]);
    await fs.access(local);
    console.log(`\n=== Clip ${i + 1}/${PHOTOS.length} ===`);
    console.log("photo", PHOTOS[i]);

    const imageUrl = await uploadLocalImageToFal(local);
    const result = await fal.subscribe(VEO_MODEL, {
      input: {
        image_url: imageUrl,
        prompt: VEO_FIDELITY_PROMPT,
        negative_prompt: VEO_NEGATIVE,
        generate_audio: false,
        aspect_ratio: "9:16",
        duration: CLIP_DURATION,
        resolution: "720p",
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS" && update.logs) {
          for (const log of update.logs) console.log("[veo]", log.message);
        }
      },
    });

    const videoUrl = (result.data as { video?: { url?: string } }).video?.url;
    if (!videoUrl) throw new Error("Veo: pas d’URL");
    console.log("requestId", result.requestId);

    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const dest = path.join(outDir, `clip-${String(i + 1).padStart(2, "0")}.mp4`);
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log("saved", dest);
    clipPaths.push(dest);
  }

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

  const fade = 0.35;
  const inputs = normalized.flatMap((p) => ["-i", p]);
  const filterParts: string[] = [];
  let last = "[0:v]";
  let offset = CLIP_DURATION_SEC - fade;
  for (let i = 1; i < normalized.length; i++) {
    const out = i === normalized.length - 1 ? "[vout]" : `[v${i}]`;
    filterParts.push(
      `${last}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(2)}${out}`,
    );
    last = out;
    offset += CLIP_DURATION_SEC - fade;
  }

  const tag = USE_FAST ? "fast" : "std";
  const finalPath = path.join(outDir, `areo-veo-${tag}-reel-${Date.now()}.mp4`);
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

  console.log(`\n✓ Reel Veo ${USE_FAST ? "Fast" : "Standard"} 3 plans :`, finalPath);
  console.log("Compare avec le reel Standard dans tmp/kling-tests/veo-reel/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
