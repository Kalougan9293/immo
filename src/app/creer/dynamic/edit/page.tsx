import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { DynamicEditClient } from "@/components/dynamic/DynamicEditClient";
import { getTemplateById } from "@/data/templates";
import { redirect } from "next/navigation";

type EditPageProps = {
  searchParams: Promise<{ template?: string }>;
};

export const metadata = {
  title: "Personnaliser — ARÉO",
  description: "Ajuste les textes et ajoute ta signature vidéo.",
};

export default async function DynamicEditPage({ searchParams }: EditPageProps) {
  const params = await searchParams;
  const template = params.template
    ? getTemplateById(params.template)
    : undefined;

  if (!params.template || !template || template.category !== "dynamic") {
    redirect("/creer");
  }

  return (
    <AppShell contained>
      <Header
        showBack
        backHref={`/creer/resultat?template=${template.id}`}
        stepLabel="4 / 4"
      />
      <main className="flex flex-1 flex-col">
        <DynamicEditClient templateId={template.id} />
      </main>
    </AppShell>
  );
}
