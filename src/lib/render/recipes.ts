import type { TemplateId } from "@/data/templates";

/**
 * 6 signatures distinctes — 1 police dominante par modèle.
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

  // ——— 2 Dubai Marina — drift, script ———
  "maison-moderne": {
    imageSeconds: 2.7,
    videoMaxSeconds: 4.0,
    fadeSeconds: 0.28,
    kenBurnsZoom: 1.1,
    zoomSpeed: 0.85,
    motion: "drift",
    transition: "dissolve",
    grade: { brightness: 0.055, contrast: 1.06, saturation: 1.06 },
  },

  // ——— 3 Cascade villa — glide ———
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

  // ——— 4 One-shot avance rapide — sweep, pas de zoom punch ———
  "hotel-boutique": {
    imageSeconds: 11.5,
    videoMaxSeconds: 11.5,
    fadeSeconds: 0.05,
    kenBurnsZoom: 1.38,
    zoomSpeed: 1.0,
    motion: "sweep",
    transition: "fade",
    grade: { brightness: 0.03, contrast: 1.1, saturation: 1.04 },
    singleShot: true,
  },

  // ——— 5 Dynamique fitness — rush / anton ———
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

  // ——— 6 Brand invest — slide ———
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
  return RECIPES["maison-moderne"];
}
