import type { TemplateId } from "@/data/templates";

/**
 * Signatures distinctes — 1 police dominante par modèle.
 */
export type MotionStyle =
  | "punch"
  | "drift"
  | "crawl"
  | "slide"
  | "pulse"
  | "glide"
  | "rush"
  /** Zoom fixe + pan rapide (effet avance rapide / one-shot) */
  | "sweep";

export type RenderRecipe = {
  imageSeconds: number;
  videoMaxSeconds: number;
  fadeSeconds: number;
  kenBurnsZoom: number;
  zoomSpeed: number;
  motion: MotionStyle;
  transition: string;
  grade: { brightness: number; contrast: number; saturation: number };
  tripleStrip?: boolean;
  tripleStripSeconds?: number;
  /** Démo / rendu : un seul média, plan long type time-lapse */
  singleShot?: boolean;
};

export const RECIPES: Record<TemplateId, RenderRecipe> = {
  "dynamic-reel": {
    imageSeconds: 3.6,
    videoMaxSeconds: 4.5,
    fadeSeconds: 0.22,
    kenBurnsZoom: 1.08,
    zoomSpeed: 0.85,
    motion: "glide",
    transition: "fadeblack",
    grade: { brightness: 0.03, contrast: 1.24, saturation: 0.96 },
  },
  "dynamic-marina": {
    imageSeconds: 3.0,
    videoMaxSeconds: 4.5,
    fadeSeconds: 0.28,
    kenBurnsZoom: 1.07,
    zoomSpeed: 0.8,
    motion: "glide",
    transition: "smoothleft",
    grade: { brightness: 0.1, contrast: 1.02, saturation: 1.16 },
  },
  "dynamic-warm": {
    imageSeconds: 3.3,
    videoMaxSeconds: 4.5,
    fadeSeconds: 0.48,
    kenBurnsZoom: 1.08,
    zoomSpeed: 0.85,
    motion: "drift",
    transition: "dissolve",
    grade: { brightness: 0.12, contrast: 0.98, saturation: 1.28 },
  },

  // ——— Classic — rythmes bien distincts ———
  "appartement-premium": {
    imageSeconds: 3.2,
    videoMaxSeconds: 4.2,
    fadeSeconds: 0.42,
    kenBurnsZoom: 1.06,
    zoomSpeed: 1.15,
    motion: "crawl",
    transition: "fadeblack",
    grade: { brightness: 0.04, contrast: 1.05, saturation: 0.96 },
  },

  "paris-haussmann": {
    imageSeconds: 2.0,
    videoMaxSeconds: 2.9,
    fadeSeconds: 0.16,
    kenBurnsZoom: 1.12,
    zoomSpeed: 0.7,
    motion: "pulse",
    transition: "slideleft",
    grade: { brightness: 0.05, contrast: 1.08, saturation: 0.98 },
  },

  "villa-luxe": {
    imageSeconds: 2.7,
    videoMaxSeconds: 3.8,
    fadeSeconds: 0.28,
    kenBurnsZoom: 1.1,
    zoomSpeed: 0.8,
    motion: "glide",
    transition: "smoothleft",
    grade: { brightness: 0.06, contrast: 1.06, saturation: 1.14 },
  },
};

export function getRecipe(templateId: string): RenderRecipe {
  if (templateId in RECIPES) {
    return RECIPES[templateId as TemplateId];
  }
  return RECIPES["appartement-premium"];
}
