import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PricingGrid } from "@/components/pricing/PricingGrid";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { parsePlanId, PLAN_META_KEY, type PlanId } from "@/lib/billing";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = {
  title: "Tarifs — ARÉO",
  description: "Starter, Pro, Agence — reels verticaux HD, 8 à 15 s, 4 à 12 photos.",
};

export default async function TarifsPage() {
  const { messages } = await getDictionary();

  let currentPlanId: PlanId | null = null;
  let loggedIn = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    loggedIn = Boolean(user);
    if (user) {
      currentPlanId = parsePlanId(
        (user.user_metadata as Record<string, unknown> | undefined)?.[
          PLAN_META_KEY
        ],
      );
    }
  }

  return (
    <AppShell contained>
      <Header showBack backHref="/" />
      <main className="flex flex-1 flex-col px-5 pb-8 sm:px-8">
        <div className="animate-fade-up mx-auto w-full max-w-3xl pt-4 text-center">
          <h1 className="font-display text-4xl font-medium text-pearl sm:text-5xl">
            {messages.pricing.title}
          </h1>
          <PricingGrid
            t={messages}
            currentPlanId={currentPlanId}
            loggedIn={loggedIn}
          />
        </div>
      </main>
      <SiteFooter />
    </AppShell>
  );
}
