import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { DynamicResultClient } from "@/components/dynamic/DynamicResultClient";
import { getTemplateById } from "@/data/templates";
import { DEFAULT_TEMPLATE_ID } from "@/lib/product";
import { redirect } from "next/navigation";

type ResultatPageProps = {
  searchParams: Promise<{ template?: string }>;
};

export const metadata = {
  title: "Votre Reel — ARÉO",
  description: "Reel prêt à télécharger.",
};

export default async function ResultatPage({ searchParams }: ResultatPageProps) {
  const params = await searchParams;
  const templateId = params.template ?? DEFAULT_TEMPLATE_ID;
  const template = getTemplateById(templateId) ?? getTemplateById(DEFAULT_TEMPLATE_ID);

  if (!template || template.category !== "dynamic") {
    redirect(`/creer/medias?template=${DEFAULT_TEMPLATE_ID}`);
  }

  return (
    <AppShell contained>
      <Header showBack backHref="/" stepLabel="4 / 4" />
      <main className="flex flex-1 flex-col">
        <DynamicResultClient templateId={template.id} />
      </main>
    </AppShell>
  );
}
