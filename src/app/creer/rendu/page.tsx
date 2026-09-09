import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { getTemplateById } from "@/data/templates";
import { RenduClient } from "@/components/rendu/RenduClient";
import { redirect } from "next/navigation";

type RenduPageProps = {
  searchParams: Promise<{ template?: string }>;
};

export const metadata = {
  title: "Éditer — ARÉO",
  description: "Ajustez durées, ordre et textes sur votre modèle pré-fait.",
};

export default async function RenduPage({ searchParams }: RenduPageProps) {
  const params = await searchParams;
  const template = params.template
    ? getTemplateById(params.template)
    : undefined;

  if (!params.template || !template) {
    redirect("/creer");
  }

  // DYNAMIC : édition textes / signature après génération cinéma
  if (template.category === "dynamic") {
    redirect(`/creer/infos?template=${template.id}`);
  }

  return (
    <AppShell contained>
      <Header
        showBack
        backHref={`/creer/medias?template=${template.id}`}
        stepLabel="3 / 3"
      />
      <main className="flex flex-1 flex-col items-center px-4 pt-2 pb-28 text-center sm:px-6">
        <RenduClient
          templateId={template.id}
          templateTitle={template.title}
        />
      </main>
    </AppShell>
  );
}
