/**
 * Règle MVP de conservation des vidéos par compte.
 * Max 3 vidéos : au-delà, la plus ancienne est supprimée (FIFO).
 */

export const MAX_SAVED_VIDEOS_PER_ACCOUNT = 3;

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
  short: `Jusqu’à ${MAX_SAVED_VIDEOS_PER_ACCOUNT} vidéos sauvegardées`,
  detail: `Chaque compte conserve jusqu’à ${MAX_SAVED_VIDEOS_PER_ACCOUNT} vidéos. Au-delà, la plus ancienne est remplacée automatiquement.`,
} as const;
