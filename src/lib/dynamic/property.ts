/** Infos bien — parcours DYNAMIC (écriture type Gemini / éditorial). */

export type PropertyListing = {
  /** Ligne 1 titre — ex. "Banlieue" */
  titleLine1: string;
  /** Ligne 2 titre — ex. "Parisienne" */
  titleLine2: string;
  /** Specs — ex. "3 pièces, 85m²" */
  specs: string;
  /** Prix ou accroche — ex. "390 000 €" / "Exclusivité" */
  highlight: string;
  /** CTA final — ex. "Contactez-nous" */
  cta: string;
};

export const PROPERTY_SESSION_KEY = "areo-property-listing";

export const EMPTY_PROPERTY: PropertyListing = {
  titleLine1: "",
  titleLine2: "",
  specs: "",
  highlight: "",
  cta: "",
};

export function normalizeProperty(raw: unknown): PropertyListing {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const s = (k: string) =>
    typeof o[k] === "string" ? (o[k] as string).trim().slice(0, 80) : "";
  return {
    titleLine1: s("titleLine1"),
    titleLine2: s("titleLine2"),
    specs: s("specs"),
    highlight: s("highlight"),
    cta: s("cta"),
  };
}

export function propertyHasContent(p: PropertyListing): boolean {
  return Boolean(
    p.titleLine1 || p.titleLine2 || p.specs || p.highlight || p.cta,
  );
}

export function savePropertyListing(listing: PropertyListing) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    PROPERTY_SESSION_KEY,
    JSON.stringify(normalizeProperty(listing)),
  );
}

export function loadPropertyListing(): PropertyListing | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PROPERTY_SESSION_KEY);
  if (!raw) return null;
  try {
    return normalizeProperty(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearPropertyListing() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PROPERTY_SESSION_KEY);
}
