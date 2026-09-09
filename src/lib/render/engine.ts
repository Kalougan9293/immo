import { getTemplateById } from "@/data/templates";

/** Moteurs de rendu ARÉO. */
export type RenderEngine = "ffmpeg" | "veo-fast";

/** Fallback si template inconnu. */
export const DEFAULT_RENDER_ENGINE: RenderEngine = "ffmpeg";

/** DYNAMIC → Veo Fast ; CLASSIC → Ken Burns FFmpeg. */
export function engineForTemplate(templateId: string): RenderEngine {
  const template = getTemplateById(templateId);
  if (template?.category === "dynamic") return "veo-fast";
  return "ffmpeg";
}

export function parseRenderEngine(value: unknown): RenderEngine | null {
  if (value === "ffmpeg" || value === "veo-fast") return value;
  return null;
}
