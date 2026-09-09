/**
 * Démos DYNAMIC = vrai pipeline ARÉO (Veo Fast + FFmpeg + textes cinéma).
 * Même set de photos × 3 styles → l’aperçu = le rendu produit.
 *
 * Usage:
 *   npx tsx scripts/generate-dynamic-demos.ts
 *   npx tsx scripts/generate-dynamic-demos.ts dynamic-pulse
 *
 * Coût approx. : 3 modèles × 3 photos × 4s × $0.10 ≈ $3.60
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { TemplateId } from "../src/data/templates";
import type { PropertyListing } from "../src/lib/dynamic/property";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "templates", "demos");
const COVERS = path.join(ROOT, "public", "templates");

/** Photos partagées — la différence vient uniquement du style cinéma. */
const SHARED_PHOTOS = [
  "public/templates/demo-sources/paris/01.jpg",
  "public/templates/demo-sources/paris/02.jpg",
  "public/templates/demo-sources/paris/04.jpg",
];

const DEMO_PROPERTY: PropertyListing = {
  titleLine1: "Paris",
  titleLine2: "16ème",
  specs: "3 pièces · 85 m²",
  highlight: "Exclusivité",
  cta: "Contactez-nous",
};

const JOBS: {
  id: TemplateId;
  file: string;
  cover: string;
}[] = [
  {
    id: "dynamic-reel",
    file: "dynamic-reel.mp4",
    cover: "dynamic.jpg",
  },
  {
    id: "dynamic-pulse",
    file: "dynamic-pulse.mp4",
    cover: "dynamic-pulse.jpg",
  },
  {
    id: "dynamic-marina",
    file: "dynamic-marina.mp4",
    cover: "dynamic-marina.jpg",
  },
  {
    id: "dynamic-noir",
    file: "dynamic-noir.mp4",
    cover: "dynamic-noir.jpg",
  },
  {
    id: "dynamic-bold",
    file: "dynamic-bold.mp4",
    cover: "dynamic-bold.jpg",
  },
  {
    id: "dynamic-warm",
    file: "dynamic-warm.mp4",
    cover: "dynamic-warm.jpg",
  },
];

async function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
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

async function extractCover(
  ffmpeg: string,
  videoPath: string,
  coverPath: string,
) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      ffmpeg,
      [
        "-y",
        "-ss",
        "1.5",
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-update",
        "1",
        "-q:v",
        "2",
        coverPath,
      ],
      { windowsHide: true },
    );
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`cover exit ${code}`)),
    );
  });
}

async function main() {
  await loadEnvLocal();
  if (!process.env.FAL_KEY?.trim()) {
    throw new Error("FAL_KEY manquante dans .env.local");
  }

  const { buildVeoReelMp4 } = await import("../src/lib/render/ffmpeg");
  const ffmpegStatic = (await import("ffmpeg-static")).default;
  if (!ffmpegStatic) throw new Error("ffmpeg-static introuvable");

  await fs.mkdir(OUT, { recursive: true });

  const only = process.argv
    .slice(2)
    .filter((a) => !a.startsWith("-")) as TemplateId[];
  const jobs = only.length
    ? JOBS.filter((j) => only.includes(j.id))
    : JOBS;

  const medias = await Promise.all(
    SHARED_PHOTOS.map(async (rel) => {
      const localPath = path.join(ROOT, rel);
      await fs.access(localPath);
      return { localPath, kind: "image" as const };
    }),
  );

  console.log(
    `DYNAMIC demos WYSIWYG — ${jobs.length} modèle(s) × ${medias.length} photos (Veo Fast)`,
  );
  console.log(
    `Coût approx. ~$${(jobs.length * medias.length * 4 * 0.1).toFixed(2)}`,
  );

  for (const job of jobs) {
    console.log(`\n→ ${job.id}`);
    console.time(job.id);
    const { final } = await buildVeoReelMp4(
      medias,
      job.id,
      undefined,
      DEMO_PROPERTY,
    );
    console.timeEnd(job.id);

    const dest = path.join(OUT, job.file);
    await fs.writeFile(dest, final);
    console.log(
      `  OK ${job.file} (${(final.length / 1024 / 1024).toFixed(2)} MB)`,
    );

    const coverPath = path.join(COVERS, job.cover);
    await extractCover(ffmpegStatic, dest, coverPath);
    console.log(`  cover ${job.cover}`);
  }

  console.log("\nDémos DYNAMIC ARÉO prêtes (pipeline réel).");
  console.log("Pense à bumper ?v= dans src/data/templates.ts");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
