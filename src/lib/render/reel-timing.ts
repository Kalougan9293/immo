import { TARGET_REEL_SECONDS } from "@/lib/product";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Durées par plan pour une sortie ~targetSec après xfade.
 * Premier et dernier plans un peu plus longs (entrée / hold).
 * total ≈ sum(d_i) − (n−1)×fade
 */
export function computeEqualClipDurations(
  clipCount: number,
  fadeSec: number,
  targetSec = TARGET_REEL_SECONDS,
): number[] {
  const n = Math.max(1, Math.floor(clipCount));
  if (n === 1) return [round2(targetSec)];

  const fade = Math.max(0, Math.min(1.2, fadeSec));
  const minClip = n >= 10 ? 1.0 : n >= 7 ? 1.15 : 1.4;
  const maxClip = 4;

  const weights = Array.from({ length: n }, (_, i) => {
    if (i === 0) return 1.16;
    if (i === n - 1) return 1.2;
    return 1;
  });
  const wsum = weights.reduce((a, b) => a + b, 0);
  const budget = targetSec + (n - 1) * fade;
  const d = weights.map((w) =>
    Math.max(minClip, Math.min(maxClip, (budget * w) / wsum)),
  );

  const approx = d.reduce((s, x) => s + x, 0) - (n - 1) * fade;
  const delta = targetSec - approx;
  if (Math.abs(delta) > 0.04) {
    const middles = d.map((_, i) => i).filter((i) => i !== 0 && i !== n - 1);
    const idxs = middles.length ? middles : d.map((_, i) => i);
    const share = delta / idxs.length;
    for (const i of idxs) {
      d[i] = Math.max(minClip, Math.min(maxClip, d[i] + share));
    }
  }

  return d.map(round2);
}

/** Durée API Veo la plus proche (≥ slot, min 4 s). */
export function veoApiDurationForSlot(
  slotSec: number,
): "4s" | "6s" | "8s" {
  // Fast : rester sur 4 s dès que possible (coût)
  if (slotSec <= 4.5) return "4s";
  if (slotSec <= 6.5) return "6s";
  return "8s";
}

export function veoApiSeconds(d: "4s" | "6s" | "8s"): number {
  if (d === "6s") return 6;
  if (d === "8s") return 8;
  return 4;
}

/**
 * Fenêtre dans le clip Veo 4 s : on saute le démarrage quasi statique
 * quand le plan final est plus court que l’API.
 */
export function veoTrimStartSec(apiSec: number, slotSec: number): number {
  const take = Math.min(apiSec, Math.max(0.5, slotSec));
  const unused = apiSec - take;
  if (unused <= 0.2) return 0;
  return round2(Math.min(unused * 0.42, unused - 0.05));
}
