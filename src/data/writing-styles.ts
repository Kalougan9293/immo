/**
 * Style d’écriture — indépendant du style motion (template).
 * Choisi après l’upload, avec aperçu sur un extrait du bien.
 */

export type WritingPacing = "cascade" | "sequential" | "simultaneous";

export type WritingStyleId =
  | "editorial"
  | "italic"
  | "snap"
  | "prestige"
  | "impact"
  | "warm"
  | "punch"
  | "slim"
  | "amber"
  | "clean";

export type WritingFontId =
  | "playfair"
  | "modern"
  | "cinzel"
  | "anton"
  | "serif"
  | "script"
  | "lora"
  | "black"
  | "narrow"
  | "impact";

export type WritingStyle = {
  id: WritingStyleId;
  /** Police éditeur */
  fontId: WritingFontId;
  textColor: string;
  titleScale: number;
  pacing: WritingPacing;
  /** Typo cinéma (tracking + caps) — désactivé pour script / italique */
  cinemaLook: boolean;
  /** Italique (preview CSS + police italique FFmpeg) */
  italic?: boolean;
};

export const WRITING_STYLES: WritingStyle[] = [
  {
    id: "editorial",
    fontId: "playfair",
    textColor: "#F5F0E6",
    titleScale: 1.78,
    pacing: "sequential",
    cinemaLook: true,
  },
  {
    id: "italic",
    fontId: "playfair",
    textColor: "#F7F3EB",
    titleScale: 1.72,
    pacing: "sequential",
    cinemaLook: false,
    italic: true,
  },
  {
    id: "snap",
    fontId: "modern",
    textColor: "#FFFFFF",
    titleScale: 1.62,
    pacing: "cascade",
    cinemaLook: true,
  },
  {
    id: "prestige",
    fontId: "cinzel",
    textColor: "#F7F3EB",
    titleScale: 1.48,
    pacing: "simultaneous",
    cinemaLook: true,
  },
  {
    id: "impact",
    fontId: "anton",
    textColor: "#FFFFFF",
    titleScale: 1.88,
    pacing: "cascade",
    cinemaLook: true,
  },
  {
    id: "warm",
    fontId: "lora",
    textColor: "#E8DFD0",
    titleScale: 1.58,
    pacing: "sequential",
    cinemaLook: false,
    italic: true,
  },
  {
    id: "punch",
    fontId: "black",
    textColor: "#0A0A0A",
    titleScale: 1.7,
    pacing: "cascade",
    cinemaLook: false,
  },
  {
    id: "slim",
    fontId: "narrow",
    textColor: "#FFFFFF",
    titleScale: 1.55,
    pacing: "simultaneous",
    cinemaLook: true,
  },
  {
    id: "amber",
    fontId: "script",
    textColor: "#F7F3EB",
    titleScale: 1.55,
    pacing: "sequential",
    cinemaLook: false,
  },
  {
    id: "clean",
    fontId: "serif",
    textColor: "#F5F0E6",
    titleScale: 1.42,
    pacing: "simultaneous",
    cinemaLook: true,
  },
];

export function getWritingStyle(id: string | null | undefined): WritingStyle {
  return (
    WRITING_STYLES.find((s) => s.id === id) ?? WRITING_STYLES[0]
  );
}
