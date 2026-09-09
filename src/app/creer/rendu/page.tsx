import { redirect } from "next/navigation";
import { DEFAULT_TEMPLATE_ID } from "@/lib/product";

/** Classic retiré du parcours produit — tout passe en Dynamic ~15 s. */
export default function RenduPage() {
  redirect(`/creer/medias?template=${DEFAULT_TEMPLATE_ID}`);
}
