import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { MediaUploader } from "@/components/medias/MediaUploader";
import { getTemplateById } from "@/data/templates";
import { redirect } from "next/navigation";

type MediasPageProps = {
  searchParams: Promise<{ template?: string; refaire?: string }>;
};

export const metadata = {
  title: "Ajouter vos médias — ARÉO",
  description: "Importez vos photos et vidéos pour générer votre film.",
};

export default async function MediasPage({ searchParams }: MediasPageProps) {
  const params = await searchParams;
  const template = params.template
    ? getTemplateById(params.template)
    : undefined;

  if (!params.template || !template) {
    redirect("/creer");
  }

  const isRedo = params.refaire === "1";

  return (
    <AppShell contained>
      <Header
        showBack
        backHref={isRedo ? "/compte" : "/creer"}
        stepLabel="2 / 3"
      />
      <main className="flex flex-1 flex-col">
        <MediaUploader
          templateId={template.id}
          templateTitle={template.title}
          restoreSession={isRedo}
        />
      </main>
    </AppShell>
  );
}
