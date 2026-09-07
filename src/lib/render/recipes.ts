import type { TemplateId } from "@/data/templates";

/**
 * 6 signatures vraiment distinctes — rythme / zoom / transition / motion.
 */
export type MotionStyle =
  | "punch" // zoom agressif, rapide
  | "drift" // zoom + pan doux
  | "crawl" // quasi immobile, très lent
  | "slide" // pans latéraux dominants
  | "pulse" // zoom in/out alterné marqué
  | "glide" // zoom progressif fluide
  | "rush"; // pan latéral dynamique + zoom léger (sport)

export type RenderRecipe = {
  imageSeconds: number;
  videoMaxSeconds: number;
  fadeSeconds: number;
  /** Zoom max (1.05 = subtil, 1.25 = fort) */
  kenBurnsZoom: number;
  /**
   * Vitesse du zoom : portion du plan pour atteindre le zoom max.
   * 0.45 = rapide (atteint tôt), 1.0 = lent (sur toute la durée).
   */
  zoomSpeed: number;
  motion: MotionStyle;
  /** Transition xfade FFmpeg */
  transition: string;
  grade: { brightness: number; contrast: number; saturation: number };
  tripleStrip?: boolean;
  tripleStripSeconds?: number;
};

export const RECIPES: Record<TemplateId, RenderRecipe> = {
  // ——— Appartement : urbain, rythme posé — zoom jusqu’à la coupe ———
  "appartement-premium": {
    imageSeconds: 2.75,
    videoMaxSeconds: 3.8,
    fadeSeconds: 0.32,
    kenBurnsZoom: 1.14,
    zoomSpeed: 1.0,
    motion: "punch",
    transition: "wipeleft",
    grade: { brightness: 0.045, contrast: 1.08, saturation: 0.98 },
    tripleStrip: true,
    tripleStripSeconds: 3.2,
  },

  // ——— Maison : visite chaleureuse, rythme médian, fade classique ———
  "maison-moderne": {
    imageSeconds: 3.2,
    videoMaxSeconds: 4.5,
    fadeSeconds: 0.4,
    kenBurnsZoom: 1.11,
    zoomSpeed: 0.85,
    motion: "drift",
    transition: "fade",
    grade: { brightness: 0.035, contrast: 1.06, saturation: 1.1 },
  },

  // ——— Villa : Instagram luxe — plans courts, lumineux, push-in doux ———
  "villa-luxe": {
    imageSeconds: 2.15,
    videoMaxSeconds: 3.3,
    fadeSeconds: 0.16,
    kenBurnsZoom: 1.13,
    zoomSpeed: 0.68,
    motion: "glide",
    transition: "dissolve",
    grade: { brightness: 0.055, contrast: 1.09, saturation: 1.16 },
  },

  // ——— Hôtel : pans lents, intime, dissolve ———
  "hotel-boutique": {
    imageSeconds: 3.7,
    videoMaxSeconds: 5.2,
    fadeSeconds: 0.6,
    kenBurnsZoom: 1.08,
    zoomSpeed: 0.95,
    motion: "slide",
    transition: "smoothleft",
    grade: { brightness: -0.02, contrast: 1.04, saturation: 1.0 },
  },

  // ——— Fitness : pans dynamiques, cuts nets, pas de pulse zoom nauséeux ———
  "salle-fitness": {
    imageSeconds: 1.85,
    videoMaxSeconds: 2.6,
    fadeSeconds: 0.1,
    kenBurnsZoom: 1.1,
    zoomSpeed: 1.0,
    motion: "rush",
    transition: "wipeleft",
    grade: { brightness: 0.02, contrast: 1.18, saturation: 1.08 },
  },

  // ——— Restaurant : ambre, glide gourmand ———
  "restaurant-chic": {
    imageSeconds: 3.1,
    videoMaxSeconds: 4.3,
    fadeSeconds: 0.48,
    kenBurnsZoom: 1.14,
    zoomSpeed: 0.75,
    motion: "glide",
    transition: "diagtl",
    grade: { brightness: -0.02, contrast: 1.1, saturation: 1.22 },
  },
};

export function getRecipe(templateId: string): RenderRecipe {
  if (templateId in RECIPES) {
    return RECIPES[templateId as TemplateId];
  }
  return RECIPES["maison-moderne"];
}
