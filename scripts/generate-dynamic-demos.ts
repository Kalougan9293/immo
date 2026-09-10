/**
 * Démos DYNAMIC Veo — sans texte (motion uniquement).
 * Usage:
 *   npx tsx scripts/generate-dynamic-demos.ts
 *   npx tsx scripts/generate-dynamic-demos.ts dynamic-marina
 *
 * Cout approx. : 3 modeles × 3 photos × 4s × $0.10 ≈ $3.60
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { TemplateId } from "../src/data/templates";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "templates", "demos");
const COVERS = path.join(ROOT, "public", "templates");

/** Photos partagees — la difference vient uniquement du style cinema. */
const SHARED_PHOTOS = [
  "public/templates/demo-sources/paris/01.jpg",
  "public/templates/demo-sources/paris/02.jpg",
  "public/templates/demo-sources/paris/04.jpg",
];

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
    id: "dynamic-marina",
    file: "dynamic-marina.mp4",
    cover: "dynamic-marina.jpg",
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
    const { finalPath, cleanup } = await buildVeoReelMp4(
      medias,
      job.id,
      undefined,
      null, // aperçu motion sans texte
    );
    console.timeEnd(job.id);

    const dest = path.join(OUT, job.file);
    await fs.copyFile(finalPath, dest);
    await cleanup();
    const stat = await fs.stat(dest);
    console.log(
      `  OK ${job.file} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`,
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
