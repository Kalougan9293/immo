import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { DynamicGenerateClient } from "@/components/dynamic/DynamicGenerateClient";
import { getTemplateById } from "@/data/templates";
import { DEFAULT_TEMPLATE_ID } from "@/lib/product";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAccountBillingForUser } from "@/lib/billing-account";

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

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(
        `/inscription?plan=starter&next=${encodeURIComponent(`/creer/generer?template=${template.id}`)}`,
      );
    }
    const billing = await getAccountBillingForUser(supabase, user);
    if (billing.remaining <= 0) {
      redirect("/compte?quota=1");
    }
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
