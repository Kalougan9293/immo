import { LegalDoc } from "@/components/legal/LegalDoc";
import { LEGAL_DOCS } from "@/lib/legal-docs";

export const metadata = {
  title: "CGU — ARÉO",
  description: "Conditions générales d’utilisation d’ARÉO.",
};

export default function CguPage() {
  return <LegalDoc doc={LEGAL_DOCS.cgu} />;
}
