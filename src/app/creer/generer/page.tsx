import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { DynamicGenerateClient } from "@/components/dynamic/DynamicGenerateClient";
import { getTemplateById } from "@/data/templates";
import { DEFAULT_TEMPLATE_ID } from "@/lib/product";
import { redirect } from "next/navigation";

type GenererPageProps = {
  searchParams: Promise<{ template?: string }>;
};

export const metadata = {
  title: "Génération — ARÉO",
  description: "Génération de votre Reel immobilier.",
};

export default async function GenererPage({ searchParams }: GenererPageProps) {
  const params = await searchParams;
  const templateId = params.template ?? DEFAULT_TEMPLATE_ID;
  const template = getTemplateById(templateId) ?? getTemplateById(DEFAULT_TEMPLATE_ID);

  if (!template || template.category !== "dynamic") {
    redirect(`/creer/medias?template=${DEFAULT_TEMPLATE_ID}`);
  }

  return (
    <AppShell contained>
      <Header showBack={false} stepLabel="3 / 4" />
      <main className="flex flex-1 flex-col">
        <DynamicGenerateClient templateId={template.id} />
      </main>
    </AppShell>
  );
}
