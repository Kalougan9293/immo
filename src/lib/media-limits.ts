/** Limites medias — 4 à 12 photos Veo Lite, pas de vidéo user. */

import { TARGET_REEL_SECONDS } from "@/lib/product";

/** Min agents : 4 photos. Max : 12 (Lite tient le coût). */
export const MIN_PHOTOS_PER_REEL = 4;
export const MAX_PHOTOS_PER_REEL = 12;

/** MVP : pas de vidéo utilisateur à l’upload. */
export const MAX_VIDEOS_PER_MONTAGE = 0;

export const MAX_MEDIAS_PER_VIDEO = MAX_PHOTOS_PER_REEL;

/** @deprecated alias */
export const MAX_PHOTOS = MAX_PHOTOS_PER_REEL;

/** Plafond durée clips intro/outro (montage). */
export const MAX_USER_VIDEO_SEC = 30;

const IMAGE_EXTS = [
  "heic",
  "heif",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "avif",
];

const VIDEO_EXTS = ["mp4", "mov", "m4v", "webm", "avi", "mkv"];

export { TARGET_REEL_SECONDS };

export type MediaKind = "image" | "video" | "other";

export function detectMediaKind(file: {
  type?: string;
  name: string;
}): MediaKind {
  const type = file.type ?? "";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && IMAGE_EXTS.includes(ext)) return "image";
  if (ext && VIDEO_EXTS.includes(ext)) return "video";
  return "other";
}

export function countMediaKinds(
  medias: { kind: string }[],
): { photos: number; videos: number } {
  let photos = 0;
  let videos = 0;
  for (const m of medias) {
    if (m.kind === "video") videos += 1;
    else if (m.kind === "image") photos += 1;
  }
  return { photos, videos };
}

/** null = OK, sinon message d’erreur FR. */
export function validateMediaSelection(
  medias: { kind: string }[],
): string | null {
  const { photos, videos } = countMediaKinds(medias);

  if (videos > 0) {
    return MEDIA_LIMITS_COPY.noVideo;
  }
  if (!photos) {
    return MEDIA_LIMITS_COPY.needMedia;
  }
  if (photos < MIN_PHOTOS_PER_REEL) {
    return MEDIA_LIMITS_COPY.tooFewPhotos;
  }
  if (photos > MAX_PHOTOS_PER_REEL) {
    return MEDIA_LIMITS_COPY.tooManyPhotos;
  }
  return null;
}

export const MEDIA_LIMITS_COPY = {
  needMedia: `Ajoutez au moins ${MIN_PHOTOS_PER_REEL} photos.`,
  tooFewPhotos: `Minimum ${MIN_PHOTOS_PER_REEL} photos.`,
  tooManyPhotos: `Maximum ${MAX_PHOTOS_PER_REEL} photos.`,
  noVideo: "Les vidéos ne sont pas disponibles — photos uniquement.",
};
