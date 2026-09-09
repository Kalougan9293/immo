import {
  newId,
  styleFromFont,
  type TextLayerEdit,
  type TimelineClip,
  type TimelineTextLayer,
} from "@/lib/render/edit-options";

type Look = ReturnType<typeof styleFromFont>;

function bandText(
  clips: Pick<TimelineClip, "duration">[],
  content: string,
  look: Look,
  y: number,
  scale: number,
  opts?: Partial<TimelineTextLayer>,
): TimelineTextLayer {
  return {
    id: newId("txt"),
    content,
    fontId: look.fontId,
    start: 0.08,
    duration: Math.max(1.5, totalDuration(clips) - 0.2),
    x: 0.5,
    y,
    lane: y < 0.5 ? 0 : 1,
    scale,
    color: look.color,
    stroke: look.stroke,
    bg: look.bg ?? null,
    bgAlpha: look.bgAlpha ?? 0,
    ...opts,
  };
}

function totalDuration(clips: Pick<TimelineClip, "duration">[]): number {
  return clips.reduce((s, c) => s + c.duration, 0);
}

/**
 * Polices : 1 playfair · paris none · villa serif · fitness anton · restaurant cinzel+modern
 */
export function starterTextsForTemplate(
  templateId: string,
  clips: Pick<TimelineClip, "duration">[],
): TimelineTextLayer[] {
  if (!clips.length) return [];
  const total = totalDuration(clips);

  // ——— DYNAMIC Reel — battements courts, style cinéma ———
  if (templateId === "dynamic-reel") {
    const look = {
      ...styleFromFont("playfair"),
      color: "#FFFFFF",
      stroke: "dark" as const,
      bg: null,
      bgAlpha: 0,
    };
    const beat = Math.max(1.5, Math.min(2.2, total * 0.18));
    const gap = 0.12;
    const lines = [
      { t: "Bien d exception", y: 0.72, sc: 1.25 },
      { t: "Visite immersive", y: 0.72, sc: 1.1 },
      { t: "Contactez-nous", y: 0.72, sc: 1.05 },
    ];
    return lines.map((line, i) => {
      const start = 0.2 + i * (beat + gap);
      if (start + 0.8 > total) return null;
      return bandText(clips, line.t, look, line.y, line.sc, {
        start,
        duration: Math.min(beat, total - start - 0.1),
        anim: "fade",
      });
    }).filter(Boolean) as TimelineTextLayer[];
  }

  // ——— Paris Haussmann — volontairement sans texte ———
  if (templateId === "paris-haussmann") {
    return [];
  }

  // ——— 1 Domino (playfair) — battements courts ———
  if (templateId === "appartement-premium") {
    const look = {
      ...styleFromFont("playfair"),
      color: "#FFFFFF",
      stroke: "none" as const,
      bg: null,
      bgAlpha: 0,
    };
    const beat = Math.max(1.35, Math.min(1.7, total * 0.16));
    const gap = 0.08;
    const lines = [
      { t: "Paris 16eme", y: 0.58, sc: 1.35 },
      { t: "Avenue Foch", y: 0.7, sc: 1.12 },
      { t: "70m2 - 3 pieces", y: 0.58, sc: 1.15 },
      { t: "280 000 EUR", y: 0.7, sc: 1.2 },
    ];
    return lines.map((line, i) => {
      const start = 0.15 + i * (beat + gap);
      return bandText(clips, line.t, look, line.y, line.sc, {
        start,
        duration: beat,
        anim: "fade",
      });
    });
  }

  // ——— Villa cascade (serif) ———
  if (templateId === "villa-luxe") {
    const look = {
      ...styleFromFont("serif"),
      color: "#FFFFFF",
      stroke: "dark" as const,
      bg: null,
      bgAlpha: 0,
    };
    const step = Math.max(1.35, Math.min(1.85, total * 0.14));
    const lines = [
      { t: "Villa d exception", y: 0.38, sc: 1.28 },
      { t: "Cote d Azur", y: 0.48, sc: 1.12 },
      { t: "350 m2", y: 0.58, sc: 1.08 },
      { t: "4 pieces", y: 0.68, sc: 1.05 },
      { t: "390 000 EUR", y: 0.78, sc: 1.15 },
    ];
    return lines.map((line, i) => {
      const start = 0.25 + i * step;
      return bandText(clips, line.t, look, line.y, line.sc, {
        start,
        duration: Math.max(2.8, total - start - 0.12),
        anim: "fade",
      });
    });
  }

  return [];
}

/** Calques FFmpeg demo — ASCII-safe (pas d'apostrophes). */
export function demoTextLayersForTemplate(
  templateId: string,
  imageSeconds: number,
  clipCount: number,
): TextLayerEdit[] {
  const total = imageSeconds * Math.max(1, clipCount);

  if (templateId === "paris-haussmann") {
    return [];
  }

  if (templateId === "appartement-premium" && clipCount >= 1) {
    const beat = Math.max(1.35, Math.min(1.7, total * 0.16));
    const gap = 0.08;
    const lines = [
      { t: "Paris 16eme", y: 0.58, sc: 1.35 },
      { t: "Avenue Foch", y: 0.7, sc: 1.12 },
      { t: "70m2 - 3 pieces", y: 0.58, sc: 1.15 },
      { t: "280 000 EUR", y: 0.7, sc: 1.2 },
    ];
    return lines.map((line, i) => {
      const start = 0.15 + i * (beat + gap);
      return {
        content: line.t,
        fontId: "playfair",
        start,
        duration: beat,
        x: 0.5,
        y: line.y,
        scale: line.sc,
        color: "#FFFFFF",
        stroke: "none" as const,
        bg: null,
        bgAlpha: 0,
      };
    });
  }

  if (templateId === "villa-luxe" && clipCount >= 1) {
    const step = Math.max(1.35, Math.min(1.85, total * 0.14));
    const lines = [
      { t: "Villa d exception", y: 0.38, sc: 1.28 },
      { t: "Cote d Azur", y: 0.48, sc: 1.12 },
      { t: "350 m2", y: 0.58, sc: 1.08 },
      { t: "4 pieces", y: 0.68, sc: 1.05 },
      { t: "390 000 EUR", y: 0.78, sc: 1.15 },
    ];
    return lines.map((line, i) => {
      const start = 0.25 + i * step;
      return {
        content: line.t,
        fontId: "serif",
        start,
        duration: Math.max(2.8, total - start - 0.12),
        x: 0.5,
        y: line.y,
        scale: line.sc,
        color: "#FFFFFF",
        stroke: "dark" as const,
        bg: null,
        bgAlpha: 0,
      };
    });
  }



  return [];
}
