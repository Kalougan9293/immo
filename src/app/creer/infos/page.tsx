import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { TextStudio } from "@/components/dynamic/TextStudio";
import { getTemplateById } from "@/data/templates";
import { DEFAULT_TEMPLATE_ID } from "@/lib/product";
import { redirect } from "next/navigation";

type InfosPageProps = {
  searchParams: Promise<{ template?: string }>;
};

export const metadata = {
  title: "Textes — ARÉO",
  description: "Style d’écriture et textes de votre vidéo immobilière.",
};

export default async function InfosPage({ searchParams }: InfosPageProps) {
  const params = await searchParams;
  const templateId = params.template ?? DEFAULT_TEMPLATE_ID;
  const template = getTemplateById(templateId) ?? getTemplateById(DEFAULT_TEMPLATE_ID);

  if (!template) {
    redirect(`/creer/medias?template=${DEFAULT_TEMPLATE_ID}`);
  }

  return (
    <AppShell contained>
      <Header
        showBack
        backHref={`/creer/medias?template=${template.id}`}
        stepLabel="2 / 4"
      />
      <main className="flex flex-1 flex-col">
        <TextStudio templateId={template.id} />
      </main>
    </AppShell>
  );
}
