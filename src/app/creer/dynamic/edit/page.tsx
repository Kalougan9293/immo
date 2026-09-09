import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { DynamicEditClient } from "@/components/dynamic/DynamicEditClient";
import { getTemplateById } from "@/data/templates";
import { DEFAULT_TEMPLATE_ID } from "@/lib/product";
import { redirect } from "next/navigation";

type EditPageProps = {
  searchParams: Promise<{ template?: string }>;
};

export const metadata = {
  title: "Personnaliser — ARÉO",
  description: "Ajuste les textes, couleur et effets.",
};

export default async function DynamicEditPage({ searchParams }: EditPageProps) {
  const params = await searchParams;
  const templateId = params.template ?? DEFAULT_TEMPLATE_ID;
  const template = getTemplateById(templateId) ?? getTemplateById(DEFAULT_TEMPLATE_ID);

  if (!template || template.category !== "dynamic") {
    redirect(`/creer/medias?template=${DEFAULT_TEMPLATE_ID}`);
  }

  return (
    <AppShell contained>
      <Header
        showBack
        backHref={`/creer/resultat?template=${template.id}`}
        stepLabel="3 / 4"
      />
      <main className="flex flex-1 flex-col">
        <DynamicEditClient templateId={template.id} />
      </main>
    </AppShell>
  );
}
