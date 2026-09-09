import { redirect } from "next/navigation";
import { DEFAULT_TEMPLATE_ID } from "@/lib/product";

type EcriturePageProps = {
  searchParams: Promise<{ template?: string }>;
};

/** Fusionné dans /creer/infos (style + textes). */
export default async function EcriturePage({ searchParams }: EcriturePageProps) {
  const params = await searchParams;
  const template = params.template ?? DEFAULT_TEMPLATE_ID;
  redirect(`/creer/infos?template=${template}`);
}
