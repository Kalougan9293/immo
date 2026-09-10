import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { AREO_MEDIA_BUCKET } from "@/lib/storage";
import { VEO_I2V_MODEL } from "@/lib/ai/veo";

/** Bump si le prompt / modèle Veo change — invalide l’ancien cache. */
const VEO_CACHE_VERSION = "veo-fast-1080p-v2-showreel";

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      download: (
        path: string,
      ) => Promise<{ data: Blob | null; error: { message?: string } | null }>;
      upload: (
        path: string,
        body: Buffer,
        options: {
          contentType: string;
          upsert: boolean;
          cacheControl: string;
        },
      ) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

function cacheRootFromMediaPath(mediaPath: string): string {
  if (mediaPath.startsWith("guest/")) {
    const parts = mediaPath.split("/");
    return `${parts[0]}/${parts[1]}`;
  }
  return mediaPath.split("/")[0] || "guest";
}

export function veoClipCacheKey(input: {
  sourcePath: string;
  templateId: string;
  index: number;
  count: number;
  duration: string;
}): string {
  return createHash("sha256")
    .update(VEO_CACHE_VERSION)
    .update("|")
    .update(VEO_I2V_MODEL)
    .update("|")
    .update(input.templateId)
    .update("|")
    .update(input.duration)
    .update("|")
    .update(String(input.index))
    .update("|")
    .update(String(input.count))
    .update("|")
    .update(input.sourcePath)
    .digest("hex")
    .slice(0, 32);
}

export function veoClipCacheStoragePath(
  ownerMediaPath: string,
  key: string,
): string {
  return `${cacheRootFromMediaPath(ownerMediaPath)}/veo-cache/${key}.mp4`;
}

export async function readVeoClipCache(
  supabase: StorageClient,
  ownerMediaPath: string,
  key: string,
  destPath: string,
): Promise<boolean> {
  const storagePath = veoClipCacheStoragePath(ownerMediaPath, key);
  const { data, error } = await supabase.storage
    .from(AREO_MEDIA_BUCKET)
    .download(storagePath);
  if (error || !data) return false;
  const buf = Buffer.from(await data.arrayBuffer());
  if (buf.byteLength < 8_000) return false;
  await fs.writeFile(destPath, buf);
  return true;
}

export async function writeVeoClipCache(
  supabase: StorageClient,
  ownerMediaPath: string,
  key: string,
  localPath: string,
): Promise<void> {
  const storagePath = veoClipCacheStoragePath(ownerMediaPath, key);
  const buf = await fs.readFile(localPath);
  const { error } = await supabase.storage
    .from(AREO_MEDIA_BUCKET)
    .upload(storagePath, buf, {
      contentType: "video/mp4",
      upsert: true,
      cacheControl: "86400",
    });
  if (error) {
    console.error("[veo-cache] write failed", storagePath, error.message);
  } else {
    console.log("[veo-cache] saved", storagePath);
  }
}
