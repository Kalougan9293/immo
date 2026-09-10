/**
 * Conservation bibliothèque = quota du plan (Starter 2 / Pro 5 / Agence 15).
 * Au-delà, la plus ancienne est supprimée (FIFO).
 */

import { PLANS } from "@/lib/billing";

export const MAX_SAVED_VIDEOS_PER_ACCOUNT = PLANS.agence.videosPerMonth;

export type SavedVideoRef = {
  id: string;
  createdAt: string | number | Date;
};

/**
 * Après ajout d'une nouvelle vidéo, retourne les ids à supprimer
 * pour rester dans la limite (les plus anciennes d'abord).
 */
export function getVideosToEvict<T extends SavedVideoRef>(
  existing: T[],
  incomingCount = 1,
  limit = MAX_SAVED_VIDEOS_PER_ACCOUNT,
): T[] {
  const overflow = existing.length + incomingCount - limit;
  if (overflow <= 0) return [];

  return [...existing]
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .slice(0, overflow);
}

export const VIDEO_RETENTION_COPY = {
  short: "Vidéos du mois selon votre offre",
  detail:
    "Chaque offre fixe un nombre de vidéos par mois. Au-delà du plafond de conservation, la plus ancienne est remplacée.",
} as const;
