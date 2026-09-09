import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { PropertyInfoForm } from "@/components/dynamic/PropertyInfoForm";
import { getTemplateById } from "@/data/templates";
import { redirect } from "next/navigation";

type InfosPageProps = {
  searchParams: Promise<{ template?: string }>;
};

export const metadata = {
  title: "Infos du bien — ARÉO",
  description: "Textes cinéma pour votre Reel DYNAMIC.",
};

export default async function InfosPage({ searchParams }: InfosPageProps) {
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
        backHref={`/creer/medias?template=${template.id}`}
        stepLabel="3 / 4"
      />
      <main className="flex flex-1 flex-col">
        <PropertyInfoForm templateId={template.id} />
      </main>
    </AppShell>
  );
}
