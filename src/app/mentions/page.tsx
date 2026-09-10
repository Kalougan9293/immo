import { LegalDoc } from "@/components/legal/LegalDoc";
import { LEGAL_DOCS } from "@/lib/legal-docs";

export const metadata = {
  title: "Mentions légales — ARÉO",
  description: "Mentions légales du site ARÉO.",
};

export default function MentionsPage() {
  return <LegalDoc doc={LEGAL_DOCS.mentions} />;
}
