import { TARGET_REEL_SECONDS } from "@/lib/product";

/**
 * Durées par plan pour une sortie ~targetSec après xfade.
 * total ≈ sum(d_i) − (n−1)×fade
 * Avec 12 photos : plans ~1–1,5 s OK (Veo Lite génère 4 s puis trim).
 */
export function computeEqualClipDurations(
  clipCount: number,
  fadeSec: number,
  targetSec = TARGET_REEL_SECONDS,
): number[] {
  const n = Math.max(1, Math.floor(clipCount));
  if (n === 1) return [Math.round(targetSec * 100) / 100];

  const fade = Math.max(0, Math.min(1.2, fadeSec));
  const sum = targetSec + (n - 1) * fade;
  const each = sum / n;
  const clamped = Math.max(0.95, Math.min(5.2, each));
  const out = Array.from({ length: n }, () => Math.round(clamped * 100) / 100);

  const approx = out.reduce((s, d) => s + d, 0) - (n - 1) * fade;
  const delta = targetSec - approx;
  if (Math.abs(delta) > 0.05) {
    out[n - 1] =
      Math.round(Math.max(0.95, Math.min(6, out[n - 1] + delta)) * 100) / 100;
  }
  return out;
}

/** Durée API Veo la plus proche (≥ slot, min 4 s). */
export function veoApiDurationForSlot(
  slotSec: number,
): "4s" | "6s" | "8s" {
  // Lite : rester sur 4 s dès que possible (cout)
  if (slotSec <= 4.5) return "4s";
  if (slotSec <= 6.5) return "6s";
  return "8s";
}

export function veoApiSeconds(d: "4s" | "6s" | "8s"): number {
  if (d === "6s") return 6;
  if (d === "8s") return 8;
  return 4;
}
