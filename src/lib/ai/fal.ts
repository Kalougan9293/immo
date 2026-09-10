import { fal } from "@fal-ai/client";
import { env } from "node:process";

const FAL_KEY_NAMES = ["FAL_KEY", "FAL_API_KEY"] as const;

/** Strip BOM / quotes / `FAL_KEY=…` collé tel quel dans Render. */
function cleanSecret(raw: string | undefined, keyName: string): string | null {
  if (!raw) return null;
  let v = raw.replace(/^\uFEFF/, "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  const prefix = `${keyName}=`;
  if (v.startsWith(prefix)) {
    v = v.slice(prefix.length).trim();
  }
  v = v.split(/\r?\n/)[0]?.trim() ?? "";
  return v || null;
}

function readEnv(name: string): string | undefined {
  // Accès dynamique (`env[name]`) : Next n’inline pas `undefined` au `next build`.
  return env[name] ?? process.env[name];
}

function readFalKey(): string | null {
  for (const name of FAL_KEY_NAMES) {
    const key = cleanSecret(readEnv(name), name);
    if (key) return key;
  }
  return null;
}

function logMissingFalKey() {
  const falLike = Object.keys(env).filter((k) => /fal/i.test(k));
  console.error(
    "[fal] FAL_KEY absente au runtime. Variables *fal* vues :",
    falLike.length ? falLike.join(", ") : "(aucune)",
  );
}

/** Configure le client fal avec FAL_KEY (serveur uniquement). */
export function ensureFalCredentials() {
  const key = readFalKey();
  if (!key) {
    logMissingFalKey();
    throw new Error(
      "Service de génération indisponible. FAL_KEY n’est pas visible sur le serveur Render (nom exact FAL_KEY, puis un nouveau deploy).",
    );
  }
  fal.config({ credentials: key });
}

/** true si une clé fal est chargée (diagnostic serveur). */
export function hasFalCredentials(): boolean {
  return Boolean(readFalKey());
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
