import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  planFromMetadata,
  QUOTA_MONTH_KEY,
  QUOTA_USED_KEY,
  type Plan,
} from "@/lib/billing";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type AccountBilling = {
  plan: Plan;
  usedThisMonth: number;
  remaining: number;
  monthStartIso: string;
};

export function billingMonthStartIso(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01T00:00:00.000Z`;
}

export function billingMonthKey(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function quotaUsedFromMetadata(
  metadata: Record<string, unknown> | undefined | null,
  monthKey: string,
): number {
  const metaMonth = String(metadata?.[QUOTA_MONTH_KEY] ?? "");
  const metaUsed = Number(metadata?.[QUOTA_USED_KEY]);
  if (metaMonth !== monthKey || !Number.isFinite(metaUsed)) return 0;
  return Math.max(0, Math.floor(metaUsed));
}

export async function countVideosThisMonth(
  supabase: Supabase,
  userId: string,
  monthStartIso = billingMonthStartIso(),
): Promise<number> {
  const { count, error } = await supabase
    .from("areo_videos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStartIso);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getAccountBillingForUser(
  supabase: Supabase,
  user: User,
): Promise<AccountBilling> {
  const plan = planFromMetadata(user.user_metadata as Record<string, unknown>);
  const monthStartIso = billingMonthStartIso();
  const monthKey = billingMonthKey();
  const rowCount = await countVideosThisMonth(
    supabase,
    user.id,
    monthStartIso,
  );
  const usedThisMonth = Math.max(
    quotaUsedFromMetadata(
      user.user_metadata as Record<string, unknown>,
      monthKey,
    ),
    rowCount,
  );
  return {
    plan,
    usedThisMonth,
    remaining: Math.max(0, plan.videosPerMonth - usedThisMonth),
    monthStartIso,
  };
}

/** Incrémente le quota après une génération réussie (l’effacement ne le rend pas). */
export async function recordQuotaGeneration(
  supabase: Supabase,
  userId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const monthKey = billingMonthKey();
  const rowCount = await countVideosThisMonth(supabase, userId);
  const fromMeta = quotaUsedFromMetadata(
    user.user_metadata as Record<string, unknown>,
    monthKey,
  );
  const next = Math.max(fromMeta + 1, rowCount);

  const { error } = await supabase.auth.updateUser({
    data: {
      [QUOTA_MONTH_KEY]: monthKey,
      [QUOTA_USED_KEY]: next,
    },
  });
  if (error) {
    console.error("[quota] record failed", error.message);
  }
}

export async function getAccountBilling(): Promise<AccountBilling | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getAccountBillingForUser(supabase, user);
}
