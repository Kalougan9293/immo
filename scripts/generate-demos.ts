/**
 * Aperçus CLASSIC uniquement (slideshow FFmpeg, sans texte).
 * Les démos DYNAMIC se génèrent avec: npm run demos:dynamic
 *
 * Usage: npm run demos
 *        npx tsx scripts/generate-demos.ts appartement-premium
 */
import fs from "node:fs/promises";
import path from "node:path";
import { buildSlideshowMp4 } from "../src/lib/render/ffmpeg";
import { getRecipe } from "../src/lib/render/recipes";
import type { TemplateId } from "../src/data/templates";

const ROOT = process.cwd();
const SOURCES = path.join(ROOT, "public", "templates", "demo-sources");
const OUT = path.join(ROOT, "public", "templates", "demos");
const COVERS = path.join(ROOT, "public", "templates");

const JOBS: {
  id: TemplateId;
  folder: string;
  file: string;
  cover: string;
}[] = [
  {
    id: "appartement-premium",
    folder: "appart",
    file: "appartement-premium.mp4",
    cover: "appartement.jpg",
  },
  {
    id: "paris-haussmann",
    folder: "dynamic",
    file: "paris-haussmann.mp4",
    cover: "paris.jpg",
  },
  {
    id: "villa-luxe",
    folder: "villa",
    file: "villa-luxe.mp4",
    cover: "villa.jpg",
  },
];

async function listImages(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);
  return entries
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

async function main() {
  const { spawn } = await import("node:child_process");
  const ffmpegStatic = (await import("ffmpeg-static")).default;
  await fs.mkdir(OUT, { recursive: true });

  const only = process.argv
    .slice(2)
    .filter((a) => !a.startsWith("-")) as TemplateId[];
  const jobs = only.length
    ? JOBS.filter((j) => only.includes(j.id))
    : JOBS;

  for (const job of jobs) {
    const recipe = getRecipe(job.id);
    const dir = path.join(SOURCES, job.folder);
    let images = await listImages(dir);
    if (recipe.singleShot) {
      if (!images.length) {
        throw new Error(`${job.id}: besoin d'au moins 1 image dans ${dir}`);
      }
      images = [images[0]];
    } else if (images.length < 3) {
      throw new Error(`${job.id}: besoin d'au moins 3 images dans ${dir}`);
    }

    console.log(
      `-> ${job.id} (${images.length} photos, sans texte${recipe.singleShot ? ", single-shot" : ""})`,
    );
    console.time(job.id);
    const buf = await buildSlideshowMp4(
      images.map((localPath) => ({ localPath, kind: "image" as const })),
      job.id,
      { textLayers: [] },
    );
    console.timeEnd(job.id);

    const dest = path.join(OUT, job.file);
    await fs.writeFile(dest, buf);
    console.log(
      `  OK ${job.file} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`,
    );

    if (ffmpegStatic) {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          ffmpegStatic,
          [
            "-y",
            "-ss",
            "1.2",
            "-i",
            dest,
            "-frames:v",
            "1",
            "-update",
            "1",
            "-q:v",
            "2",
            path.join(COVERS, job.cover),
          ],
          { windowsHide: true },
        );
        child.on("error", reject);
        child.on("close", (code) =>
          code === 0 ? resolve() : reject(new Error(`cover exit ${code}`)),
        );
      });
      console.log(`  cover ${job.cover}`);
    }
  }

  console.log("Demos CLASSIC pretes (sans texte).");
  console.log("Dynamic: npm run demos:dynamic");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
