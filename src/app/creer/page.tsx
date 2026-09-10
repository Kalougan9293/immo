import { redirect } from "next/navigation";
import { DEFAULT_TEMPLATE_ID } from "@/lib/product";

export const metadata = {
  title: "Créer — ARÉO",
  description: "Importez vos photos pour générer votre Reel immobilier.",
};

/** Plus de choix de modèle — entrée directe aux photos. */
export default function CreerPage() {
  redirect(`/creer/medias?template=${DEFAULT_TEMPLATE_ID}`);
}
