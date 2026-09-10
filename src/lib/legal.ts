/**
 * Identité éditeur. Chaînes vides = blancs dans CGU / CGV / mentions.
 * Remplir ici quand les infos seront disponibles.
 */
export const LEGAL = {
  brand: "ARÉO",
  siteUrl: "https://immo-sirx.onrender.com",
  companyName: "",
  legalForm: "",
  capital: "",
  siren: "",
  rcs: "",
  tva: "",
  address: "",
  publisher: "",
  email: "",
  updated: "10 septembre 2026",
  host: {
    name: "Render Services, Inc.",
    address:
      "525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis",
    website: "https://render.com",
  },
} as const;

/** Marqueur de blanc dans les textes juridiques. */
export const BLANK = "___";

export function legalField(value: string): string {
  return value.trim() || BLANK;
}
