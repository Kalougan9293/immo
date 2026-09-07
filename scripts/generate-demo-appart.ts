/**
 * Régénère uniquement la démo Appartement Premium.
 * Usage: npx tsx scripts/generate-demo-appart.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { buildSlideshowMp4 } from "../src/lib/render/ffmpeg";
import { getRecipe } from "../src/lib/render/recipes";
import { demoTextLayersForTemplate } from "../src/lib/render/template-demo-texts";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "public", "templates", "demo-sources", "appart");
const OUT = path.join(
  ROOT,
  "public",
  "templates",
  "demos",
  "appartement-premium.mp4",
);
const COVER = path.join(ROOT, "public", "templates", "appartement.jpg");

async function main() {
  const ffmpegStatic = (await import("ffmpeg-static")).default;
  const entries = await fs.readdir(DIR);
  const images = entries
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => path.join(DIR, f));
  if (images.length < 3) throw new Error("Besoin d’au moins 3 images");

  const recipe = getRecipe("appartement-premium");
  const textLayers = demoTextLayersForTemplate(
    "appartement-premium",
    recipe.imageSeconds,
    images.length,
  );

  console.log(`→ appartement-premium (${images.length} photos, ${textLayers.length} textes)`);
  console.time("appart");
  const buf = await buildSlideshowMp4(
    images.map((localPath) => ({ localPath, kind: "image" as const })),
    "appartement-premium",
    { textLayers },
  );
  console.timeEnd("appart");
  await fs.writeFile(OUT, buf);
  console.log(`  OK ${(buf.length / 1024 / 1024).toFixed(2)} MB`);

  if (ffmpegStatic) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        ffmpegStatic,
        ["-y", "-ss", "1", "-i", OUT, "-frames:v", "1", "-q:v", "2", COVER],
        { windowsHide: true },
      );
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`cover exit ${code}`)),
      );
    });
    console.log("  cover OK");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
