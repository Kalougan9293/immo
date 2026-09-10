import { getTemplateById } from "@/data/templates";

/** Moteurs de rendu ARÉO. */
export type RenderEngine = "ffmpeg" | "veo-fast";

/** Fallback si template inconnu. */
export const DEFAULT_RENDER_ENGINE: RenderEngine = "veo-fast";

/** Produit : Veo Fast. CLASSIC (ffmpeg) seulement si un vieux template est encore appelé. */
export function engineForTemplate(templateId: string): RenderEngine {
  const template = getTemplateById(templateId);
  if (template?.category === "classic") return "ffmpeg";
  return "veo-fast";
}

export function parseRenderEngine(value: unknown): RenderEngine | null {
  if (value === "ffmpeg" || value === "veo-fast") return value;
  return null;
}
