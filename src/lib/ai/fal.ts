import { fal } from "@fal-ai/client";

/** Configure le client fal avec FAL_KEY (serveur uniquement). */
export function ensureFalCredentials() {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    throw new Error(
      "FAL_KEY manquante. Ajoute-la dans .env.local (clé sur https://fal.ai/dashboard/keys).",
    );
  }
  fal.config({ credentials: key });
}

/** Upload fichier local → URL fal (I2V Veo en prod ; lab Kling aussi). */
export async function uploadLocalImageToFal(
  localPath: string,
): Promise<string> {
  ensureFalCredentials();
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const buf = await readFile(localPath);
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
