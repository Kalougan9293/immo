import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { MediaUploader } from "@/components/medias/MediaUploader";
import { getTemplateById } from "@/data/templates";
import { DEFAULT_TEMPLATE_ID } from "@/lib/product";
import { redirect } from "next/navigation";

type MediasPageProps = {
  searchParams: Promise<{ template?: string; refaire?: string }>;
};

export const metadata = {
  title: "Ajouter vos médias — ARÉO",
  description: "Importez vos photos pour générer votre film.",
};

export default async function MediasPage({ searchParams }: MediasPageProps) {
  const params = await searchParams;
  const templateId = params.template ?? DEFAULT_TEMPLATE_ID;
  const template = getTemplateById(templateId) ?? getTemplateById(DEFAULT_TEMPLATE_ID);

  if (!template) {
    redirect(`/creer/medias?template=${DEFAULT_TEMPLATE_ID}`);
  }

  const isRedo = params.refaire === "1";

  return (
    <AppShell contained>
      <Header
        showBack
        backHref={isRedo ? "/compte" : "/"}
        stepLabel="1 / 4"
      />
      <main className="flex flex-1 flex-col">
        <MediaUploader
          templateId={template.id}
          restoreSession={isRedo}
          flow="dynamic"
        />
      </main>
    </AppShell>
  );
}
