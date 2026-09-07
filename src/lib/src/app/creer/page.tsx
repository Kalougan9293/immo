import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { TemplateSelector } from "@/components/templates/TemplateSelector";

export const metadata = {
  title: "Choisir un modèle — ARÉO",
  description: "Sélectionnez le template vidéo immobilier qui correspond à votre bien.",
};

export default function CreerPage() {
  return (
    <AppShell contained>
      <Header showBack backHref="/" stepLabel="1 / 3" />
      <main className="flex flex-1 flex-col">
        <TemplateSelector />
      </main>
    </AppShell>
  );
}
