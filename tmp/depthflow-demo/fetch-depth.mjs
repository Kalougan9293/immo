/**
 * Lab only — cartes de profondeur Depth Anything via fal.
 * Usage : node tmp/depthflow-demo/fetch-depth.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fal } from "@fal-ai/client";

const ROOT = path.resolve("D:/Desktop/IMMO");
const OUT = path.join(ROOT, "tmp/depthflow-demo");

const PHOTOS = [
  {
    id: "couloir",
    file: "public/examples/visite-prestige.jpg",
  },
  {
    id: "chambre",
    file: "public/templates/demo-sources/paris/04.jpg",
  },
  {
    id: "cuisine",
    file: "public/templates/demo-sources/paris/03.jpg",
  },
];

const DEPTH_MODELS = [
  "fal-ai/image-preprocessors/depth-anything/v2",
  "fal-ai/image-preprocessors/depth-anything",
  "fal-ai/imageutils/depth",
];

async function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
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
}

function imageUrlFromResult(data) {
  if (!data || typeof data !== "object") return null;
  const d = data;
  return (
    d.image?.url ||
    d.depth_map?.url ||
    d.depth?.url ||
    d.images?.[0]?.url ||
    null
  );
}

async function estimateDepth(imageUrl) {
  let lastErr = null;
  for (const model of DEPTH_MODELS) {
    try {
      const result = await fal.subscribe(model, {
        input: { image_url: imageUrl },
        logs: false,
      });
      const url = imageUrlFromResult(result.data);
      if (!url) {
        lastErr = new Error(`${model} : pas d’URL (${JSON.stringify(result.data).slice(0, 200)})`);
        continue;
      }
      return { url, model };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Aucun modèle depth n’a répondu");
}

async function uploadLocal(localPath) {
  const buf = await fs.readFile(localPath);
  const ext = path.extname(localPath).toLowerCase() || ".jpg";
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";
  const file = new File([buf], `areo-photo${ext}`, { type: mime });
  return fal.storage.upload(file);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  await loadEnvLocal();
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new Error("FAL_KEY manquante dans .env.local");
  fal.config({ credentials: key });

  await fs.mkdir(path.join(OUT, "depth"), { recursive: true });
  const manifest = [];

  for (const photo of PHOTOS) {
    const local = path.join(ROOT, photo.file);
    console.log(`\n→ ${photo.id}`);
    const imageUrl = await uploadLocal(local);
    const { url, model } = await estimateDepth(imageUrl);
    const dest = path.join(OUT, "depth", `${photo.id}.png`);
    await download(url, dest);
    console.log(`  depth: ${model}`);
    console.log(`  saved: ${dest}`);
    manifest.push({
      id: photo.id,
      photo: local,
      depth: dest,
      model,
    });
  }

  await fs.writeFile(
    path.join(OUT, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  console.log("\nOK", path.join(OUT, "manifest.json"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
