/** Produit unique — plus de choix de modèle côté client. */
export const DEFAULT_TEMPLATE_ID = "dynamic-reel";

/** Durée finale toujours entre 8 et 15 s. */
export const MIN_REEL_SECONDS = 8;
export const MAX_REEL_SECONDS = 15;
/** Valeur médiane (8 photos) — les clamps hors rythme utilisent ça. */
export const TARGET_REEL_SECONDS = 12;

/** Secondes API Veo min par photo. */
export const VEO_SECONDS_PER_PHOTO = 4;

/**
 * Toutes les photos du reel passent en Veo Fast (4–12).
 * 1080p sans audio ≈ $0.40 / photo → 4 ≈ $1.60 | 12 ≈ $4.80 ≈ 4,30 €
 */
export const MAX_VEO_PHOTOS_PER_REEL = 12;

/** Combien de photos (dans l’ordre) passent en Veo. */
export function veoPhotoBudget(photoCount: number): number {
  const n = Math.max(0, Math.floor(photoCount));
  return Math.min(MAX_VEO_PHOTOS_PER_REEL, n);
}

/**
 * Rythme selon le nombre de photos, borné à [8, 15] s.
 * 4 photos → 15 s (plans ~3,6–4,2 s) | 12 photos → 11 s (plans ≥ 1 s).
 * On ne descend pas à 8 s à 12 photos : un plan Veo de 0,8 s est illisible
 * (l’API génère 4 s, le début est quasi statique).
 */
export function targetReelSecondsForCount(
  clipCount: number,
  _fadeSec = 0.38,
): number {
  const n = Math.min(12, Math.max(4, Math.floor(clipCount)));
  const t = 15 - ((n - 4) / 8) * 4;
  return Math.round(Math.min(MAX_REEL_SECONDS, Math.max(MIN_REEL_SECONDS, t)) * 10) / 10;
}
