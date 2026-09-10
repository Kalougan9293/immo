/** Offres mensuelles ARÉO — Veo Fast 1080p, 4–12 photos / vidéo. */

export const PLAN_IDS = ["starter", "pro", "agence"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const DEFAULT_PLAN_ID: PlanId = "starter";
export const PLAN_META_KEY = "areo_plan";
export const QUOTA_USED_KEY = "areo_quota_used";
export const QUOTA_MONTH_KEY = "areo_quota_month";

/**
 * Coût API au plafond (12 × 4 s × 0,10 $ ≈ 4,80 $ → 4,30 €).
 * Marge unitaire serrée demandée : +0,20 € → 4,50 €.
 */
export const API_COST_EUR_AT_MAX_PHOTOS = 4.3;
export const MARGIN_EUR_PER_VIDEO = 0.2;
export const UNIT_COST_EUR_AT_MAX_PHOTOS =
  API_COST_EUR_AT_MAX_PHOTOS + MARGIN_EUR_PER_VIDEO;

export type Plan = {
  id: PlanId;
  priceEur: number;
  videosPerMonth: number;
  /** Coût API indicatif (usage moyen ~10 photos, sauf Pro max = 12). */
  apiCostEurFrom: number;
  apiCostEurTo: number;
  highlighted?: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    priceEur: 10,
    videosPerMonth: 2,
    apiCostEurFrom: 7.2,
    apiCostEurTo: 7.2,
  },
  pro: {
    id: "pro",
    priceEur: 29,
    videosPerMonth: 5,
    apiCostEurFrom: 18,
    apiCostEurTo: 21.5,
    highlighted: true,
  },
  agence: {
    id: "agence",
    priceEur: 79,
    videosPerMonth: 15,
    apiCostEurFrom: 54,
    apiCostEurTo: 64.5,
  },
};

export const PLAN_LIST: Plan[] = PLAN_IDS.map((id) => PLANS[id]);

export function parsePlanId(raw: unknown): PlanId {
  if (raw === "starter" || raw === "pro" || raw === "agence") return raw;
  return DEFAULT_PLAN_ID;
}

export function planFromMetadata(
  metadata: Record<string, unknown> | undefined | null,
): Plan {
  return PLANS[parsePlanId(metadata?.[PLAN_META_KEY])];
}

export function quotaFullMessage(plan: Plan): string {
  return `Quota atteint (${plan.videosPerMonth} vidéos ce mois sur ${plan.id === "agence" ? "Agence" : plan.id === "pro" ? "Pro" : "Starter"}). Passez à l’offre supérieure.`;
}
