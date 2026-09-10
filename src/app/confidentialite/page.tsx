import { LegalDoc } from "@/components/legal/LegalDoc";
import { LEGAL_DOCS } from "@/lib/legal-docs";

export const metadata = {
  title: "Confidentialité — ARÉO",
  description: "Politique de confidentialité et protection des données ARÉO.",
};

export default function ConfidentialitePage() {
  return <LegalDoc doc={LEGAL_DOCS.confidentialite} />;
}
