import { LegalDoc } from "@/components/legal/LegalDoc";
import { LEGAL_DOCS } from "@/lib/legal-docs";

export const metadata = {
  title: "CGV — ARÉO",
  description: "Conditions générales de vente des abonnements ARÉO.",
};

export default function CgvPage() {
  return <LegalDoc doc={LEGAL_DOCS.cgv} />;
}
