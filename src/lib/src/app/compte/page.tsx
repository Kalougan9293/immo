import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { VideoLibrary } from "@/components/compte/VideoLibrary";
import { CompteActions } from "@/components/compte/CompteActions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getUserLibraryVideos } from "@/lib/library";

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

  const videos = await getUserLibraryVideos();

  return (
    <AppShell contained className="workspace-canvas">
      <Header showBack backHref="/" />
      <main className="flex flex-1 flex-col px-6 pb-10 sm:px-8">
        <div className="animate-fade-up mx-auto w-full max-w-sm pt-2">
          <CompteActions />
        </div>

        <section
          id="vos-videos"
          className="animate-fade-up animate-delay-1 mx-auto mt-8 flex w-full max-w-sm scroll-mt-6 flex-1 flex-col pb-4"
        >
          <VideoLibrary videos={videos} />
        </section>
      </main>
    </AppShell>
  );
}
