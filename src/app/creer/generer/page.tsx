import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { DynamicGenerateClient } from "@/components/dynamic/DynamicGenerateClient";
import { getTemplateById } from "@/data/templates";
import { redirect } from "next/navigation";

type GenererPageProps = {
  searchParams: Promise<{ template?: string }>;
};

export const metadata = {
  title: "Génération cinéma — ARÉO",
  description: "Génération de votre Reel immobilier cinéma.",
};

export default async function GenererPage({ searchParams }: GenererPageProps) {
  const params = await searchParams;
  const template = params.template
    ? getTemplateById(params.template)
    : undefined;

  if (!params.template || !template || template.category !== "dynamic") {
    redirect("/creer");
  }

  return (
    <AppShell contained>
      <Header showBack={false} stepLabel="4 / 4" />
      <main className="flex flex-1 flex-col">
        <DynamicGenerateClient templateId={template.id} />
      </main>
    </AppShell>
  );
}
