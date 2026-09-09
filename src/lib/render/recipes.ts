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
    imageSeconds: 4,
    videoMaxSeconds: 4.5,
    fadeSeconds: 0.38,
    kenBurnsZoom: 1.06,
    zoomSpeed: 1.0,
    motion: "crawl",
    transition: "fadeblack",
    grade: { brightness: 0.02, contrast: 1.08, saturation: 0.92 },
  },
  "dynamic-pulse": {
    imageSeconds: 4,
    videoMaxSeconds: 4.5,
    fadeSeconds: 0.18,
    kenBurnsZoom: 1.1,
    zoomSpeed: 0.55,
    motion: "pulse",
    transition: "slideleft",
    grade: { brightness: 0.04, contrast: 1.12, saturation: 1.05 },
  },
  "dynamic-marina": {
    imageSeconds: 4,
    videoMaxSeconds: 4.5,
    fadeSeconds: 0.32,
    kenBurnsZoom: 1.07,
    zoomSpeed: 0.85,
    motion: "glide",
    transition: "smoothleft",
    grade: { brightness: 0.05, contrast: 1.06, saturation: 1.08 },
  },
  "dynamic-noir": {
    imageSeconds: 4,
    videoMaxSeconds: 4.5,
    fadeSeconds: 0.55,
    kenBurnsZoom: 1.04,
    zoomSpeed: 1.15,
    motion: "crawl",
    transition: "fadeblack",
    grade: { brightness: -0.06, contrast: 1.22, saturation: 0.82 },
  },
  "dynamic-bold": {
    imageSeconds: 4,
    videoMaxSeconds: 4.5,
    fadeSeconds: 0.12,
    kenBurnsZoom: 1.14,
    zoomSpeed: 0.4,
    motion: "rush",
    transition: "circleopen",
    grade: { brightness: 0.05, contrast: 1.2, saturation: 1.12 },
  },
  "dynamic-warm": {
    imageSeconds: 4,
    videoMaxSeconds: 4.5,
    fadeSeconds: 0.4,
    kenBurnsZoom: 1.08,
    zoomSpeed: 0.9,
    motion: "drift",
    transition: "dissolve",
    grade: { brightness: 0.08, contrast: 1.02, saturation: 1.18 },
  },

  // ——— 1 Domino Paris — crawl doux, playfair ———
  "appartement-premium": {
    imageSeconds: 2.85,
    videoMaxSeconds: 4.0,
    fadeSeconds: 0.35,
    kenBurnsZoom: 1.08,
    zoomSpeed: 1.0,
    motion: "crawl",
    transition: "fade",
    grade: { brightness: 0.04, contrast: 1.05, saturation: 0.96 },
  },

  // ——— Paris Haussmann — crawl doux, sans texte ———
  "paris-haussmann": {
    imageSeconds: 2.2,
    videoMaxSeconds: 3.2,
    fadeSeconds: 0.22,
    kenBurnsZoom: 1.1,
    zoomSpeed: 0.88,
    motion: "crawl",
    transition: "fade",
    grade: { brightness: 0.05, contrast: 1.06, saturation: 0.98 },
  },

  // ——— Cascade villa — glide ———
  "villa-luxe": {
    imageSeconds: 2.4,
    videoMaxSeconds: 3.5,
    fadeSeconds: 0.22,
    kenBurnsZoom: 1.12,
    zoomSpeed: 0.75,
    motion: "glide",
    transition: "smoothleft",
    grade: { brightness: 0.05, contrast: 1.09, saturation: 1.15 },
  },

  // ——— Fitness — rush / anton ———
  "salle-fitness": {
    imageSeconds: 2.05,
    videoMaxSeconds: 2.85,
    fadeSeconds: 0.08,
    kenBurnsZoom: 1.13,
    zoomSpeed: 0.5,
    motion: "rush",
    transition: "wipeleft",
    grade: { brightness: 0.025, contrast: 1.2, saturation: 1.1 },
  },

  // ——— Brand invest — slide ———
  "restaurant-chic": {
    imageSeconds: 2.6,
    videoMaxSeconds: 3.8,
    fadeSeconds: 0.35,
    kenBurnsZoom: 1.09,
    zoomSpeed: 0.9,
    motion: "slide",
    transition: "fade",
    grade: { brightness: 0.04, contrast: 1.06, saturation: 1.04 },
  },
};

export function getRecipe(templateId: string): RenderRecipe {
  if (templateId in RECIPES) {
    return RECIPES[templateId as TemplateId];
  }
  return RECIPES["appartement-premium"];
}
