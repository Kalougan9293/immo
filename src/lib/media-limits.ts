/** Limites medias — 4 a 12 photos Veo Lite, pas de video user. */

import { TARGET_REEL_SECONDS } from "@/lib/product";

/** Min agents : 4 photos. Max : 12 (Lite tient le cout). */
export const MIN_PHOTOS_PER_REEL = 4;
export const MAX_PHOTOS_PER_REEL = 12;

/** MVP : pas de video utilisateur. */
export const MAX_VIDEOS_PER_MONTAGE = 0;

export const MAX_MEDIAS_PER_VIDEO = MAX_PHOTOS_PER_REEL;

/** @deprecated alias */
export const MAX_PHOTOS = MAX_PHOTOS_PER_REEL;

export const MAX_USER_VIDEO_SEC = 30;

export { TARGET_REEL_SECONDS };

export type MediaMixMode = "photos" | "video" | "mix";

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

export function detectMediaMixMode(
  medias: { kind: string }[],
): MediaMixMode | null {
  const { photos, videos } = countMediaKinds(medias);
  if (!photos && !videos) return null;
  if (videos > 0 && photos > 0) return "mix";
  if (videos > 0) return "video";
  return "photos";
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
  short: `${MIN_PHOTOS_PER_REEL}–${MAX_PHOTOS_PER_REEL} photos`,
  full: `${MIN_PHOTOS_PER_REEL} a ${MAX_PHOTOS_PER_REEL} photos. Reel ${TARGET_REEL_SECONDS} s (8–12 s).`,
  needMedia: `Ajoutez au moins ${MIN_PHOTOS_PER_REEL} photos.`,
  tooFewPhotos: `Minimum ${MIN_PHOTOS_PER_REEL} photos.`,
  tooManyPhotos: `Maximum ${MAX_PHOTOS_PER_REEL} photos.`,
  noVideo: "Les videos ne sont pas disponibles pour le moment — photos uniquement.",
  noMix: "Photos uniquement.",
  oneVideo: "Les videos ne sont pas disponibles pour le moment.",
  videoTooLong: `Video trop longue : ${MAX_USER_VIDEO_SEC} s maximum.`,
  modePhotos: "Photos",
  modeVideo: "Rush video",
  modeMix: "Photos + video",
};
