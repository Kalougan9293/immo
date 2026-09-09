/**
 * Comparaison même photo : Kling Pro vs Veo 3.1 (crédits fal).
 * Usage: npx tsx scripts/test-kling-vs-veo.ts [chemin-photo]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fal } from "@fal-ai/client";
import {
  DEFAULT_INTERIOR_MOTION_PROMPT,
  DEFAULT_NEGATIVE_PROMPT,
} from "../src/lib/ai/kling";
import { uploadLocalImageToFal } from "../src/lib/ai/fal";

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

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
  console.log(
    `  → ${dest} (${((await fs.stat(dest)).size / 1024 / 1024).toFixed(2)} MB)`,
  );
}

async function main() {
  await loadEnvLocal();
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new Error("FAL_KEY manquante");
  fal.config({ credentials: key });

  const input =
    process.argv[2] ??
    path.join(
      process.cwd(),
      "public/templates/demo-sources/paris/02.jpg",
    );
  await fs.access(input);

  const outDir = path.join(process.cwd(), "tmp", "kling-tests", "compare");
  await fs.mkdir(outDir, { recursive: true });

  console.log("Upload…", input);
  const imageUrl = await uploadLocalImageToFal(input);
  const stamp = Date.now();

  // ——— Kling Pro ———
  console.log("\n=== Kling V3 Pro (5s) ===");
  const kling = await fal.subscribe(
    "fal-ai/kling-video/v3/pro/image-to-video",
    {
      input: {
        start_image_url: imageUrl,
        prompt: DEFAULT_INTERIOR_MOTION_PROMPT,
        negative_prompt: DEFAULT_NEGATIVE_PROMPT,
        duration: "5",
        generate_audio: false,
      },
      logs: true,
    },
  );
  const klingUrl = (kling.data as { video?: { url?: string } }).video?.url;
  if (!klingUrl) throw new Error("Kling Pro: pas d’URL");
  await download(klingUrl, path.join(outDir, `kling-pro-${stamp}.mp4`));

  // ——— Veo 3.1 ———
  console.log("\n=== Veo 3.1 (même photo) ===");
  const veo = await fal.subscribe("fal-ai/veo3.1/image-to-video", {
    input: {
      image_url: imageUrl,
      prompt: DEFAULT_INTERIOR_MOTION_PROMPT,
      generate_audio: false,
      aspect_ratio: "9:16",
      duration: "6s",
    },
    logs: true,
  });
  const veoUrl = (veo.data as { video?: { url?: string } }).video?.url;
  if (!veoUrl) throw new Error("Veo: pas d’URL");
  await download(veoUrl, path.join(outDir, `veo31-${stamp}.mp4`));

  console.log("\n✓ Compare les 2 fichiers dans :", outDir);
  console.log("  kling-pro-*.mp4  vs  veo31-*.mp4");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
