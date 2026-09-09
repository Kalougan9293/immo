/** Produit unique — plus de choix de modèle côté client. */
export const DEFAULT_TEMPLATE_ID = "dynamic-reel";

/** Durée finale toujours entre 8 et 12 s (quel que soit le nb de photos). */
export const MIN_REEL_SECONDS = 8;
export const TARGET_REEL_SECONDS = 12;

/** Secondes API Veo min par photo. */
export const VEO_SECONDS_PER_PHOTO = 4;

/**
 * Toutes les photos → Veo Lite (max = plafond upload).
 * ~$0.03/s × 4 s ≈ $0.12/photo → 12 photos ≈ $1.44
 */
export const MAX_VEO_PHOTOS_PER_REEL = 12;

/**
 * Durée cible fixe dans [8, 12] — le rythme des plans s’adapte au nombre de photos.
 * 4 photos → ~3 s/plan | 12 photos → ~1 s/plan
 */
export function targetReelSecondsForCount(
  _clipCount: number,
  _fadeSec = 0.38,
): number {
  return TARGET_REEL_SECONDS;
}
