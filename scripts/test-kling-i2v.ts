/**
 * Étape 1 — test wow : 1 photo → Kling I2V → MP4 local.
 *
 * Prérequis : FAL_KEY dans .env.local
 * Usage :
 *   npx tsx scripts/test-kling-i2v.ts
 *   npx tsx scripts/test-kling-i2v.ts public/templates/demo-sources/paris/02.jpg
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  generateKlingClipFromImage,
} from "../src/lib/ai/kling";
import { uploadLocalImageToFal } from "../src/lib/ai/fal";

async function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const raw = await fs.readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    }
  } catch {
    // .env.local optionnel si FAL_KEY déjà exportée
  }
}

async function main() {
  await loadEnvLocal();

  const input =
    process.argv[2] ??
    path.join(
      process.cwd(),
      "public",
      "templates",
      "demo-sources",
      "paris",
      "02.jpg",
    );

  await fs.access(input);
  const outDir = path.join(process.cwd(), "tmp", "kling-tests");
  await fs.mkdir(outDir, { recursive: true });

  console.log("→ Upload photo…", input);
  const imageUrl = await uploadLocalImageToFal(input);
  console.log("  OK", imageUrl.slice(0, 80) + "…");

  console.log("→ Kling I2V (standard, 5s, no audio)…");
  const { videoUrl, requestId } = await generateKlingClipFromImage({
    imageUrl,
    durationSec: 5,
  });
  console.log("  requestId", requestId);
  console.log("  videoUrl", videoUrl);

  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = path.join(outDir, `kling-${Date.now()}.mp4`);
  await fs.writeFile(dest, buf);
  console.log(
    `✓ Wow clip prêt : ${dest} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`,
  );
  console.log("Ouvre ce fichier et dis-moi si le niveau est OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
