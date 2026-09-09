import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { DynamicResultClient } from "@/components/dynamic/DynamicResultClient";
import { getTemplateById } from "@/data/templates";
import { redirect } from "next/navigation";

type ResultatPageProps = {
  searchParams: Promise<{ template?: string }>;
};

export const metadata = {
  title: "Votre Reel — ARÉO",
  description: "Reel cinéma DYNAMIC prêt à télécharger.",
};

export default async function ResultatPage({ searchParams }: ResultatPageProps) {
  const params = await searchParams;
  const template = params.template
    ? getTemplateById(params.template)
    : undefined;

  if (!params.template || !template || template.category !== "dynamic") {
    redirect("/creer");
  }

  return (
    <AppShell contained>
      <Header showBack backHref="/creer" stepLabel="4 / 4" />
      <main className="flex flex-1 flex-col">
        <DynamicResultClient templateId={template.id} />
      </main>
    </AppShell>
  );
}
