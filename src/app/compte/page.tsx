import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { VideoLibrary } from "@/components/compte/VideoLibrary";
import { CompteActions } from "@/components/compte/CompteActions";
import { AccountPlan } from "@/components/compte/AccountPlan";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getUserLibraryVideos } from "@/lib/library";
import { getAccountBillingForUser } from "@/lib/billing-account";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

export const metadata = {
  title: "Mon espace — ARÉO",
};

export default async function ComptePage() {
  if (!isSupabaseConfigured()) {
    redirect("/inscription");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const billing = await getAccountBillingForUser(supabase, user);
  const videos = await getUserLibraryVideos(billing.plan.videosPerMonth);
  const locale = await getLocale();
  const t = getMessages(locale);

  return (
    <AppShell contained className="workspace-canvas">
      <Header showBack backHref="/" />
      <main className="flex flex-1 flex-col px-6 pb-10 sm:px-8">
        <div className="animate-fade-up mx-auto w-full max-w-sm pt-6">
          <AccountPlan billing={billing} locale={locale} />
        </div>

        <div className="animate-fade-up mx-auto mt-8 w-full max-w-sm">
          <CompteActions quotaFull={billing.remaining <= 0} />
        </div>

        <section
          id="vos-videos"
          className="animate-fade-up animate-delay-1 mx-auto mt-8 flex w-full max-w-sm scroll-mt-6 flex-1 flex-col pb-4"
        >
          <VideoLibrary videos={videos} />
        </section>

        <div className="mx-auto mt-10 w-full max-w-sm pb-2 text-center">
          <button
            type="button"
            disabled
            title={t.compte.cancelSoon}
            className="cursor-not-allowed text-[12px] text-muted/50"
          >
            {t.compte.cancel}
          </button>
        </div>
      </main>
      <SiteFooter />
    </AppShell>
  );
}
