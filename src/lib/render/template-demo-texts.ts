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

  // ——— Fitness (anton) — Bien rare plus court ———
  if (templateId === "salle-fitness") {
    const look = {
      ...styleFromFont("anton"),
      color: "#FFFFFF",
      stroke: "none" as const,
      bg: "#0A0A0A",
      bgAlpha: 0.82,
    };
    const tag = {
      ...styleFromFont("anton"),
      color: "#0A0A0A",
      stroke: "none" as const,
      bg: "#FFE566",
      bgAlpha: 0.95,
    };
    const t1 = Math.max(1.55, Math.min(1.85, total * 0.18));
    const t2 = Math.max(2.4, Math.min(2.8, total * 0.26));
    const gap = 0.1;
    const t3Start = 0.12 + t1 + gap + t2 + gap;
    const t3 = Math.max(2.4, total - t3Start - 0.12);
    return [
      bandText(clips, "Bien rare !", look, 0.42, 1.55, {
        start: 0.12,
        duration: t1,
        anim: "glow",
      }),
      bandText(clips, "3p . 70m2 . Parking", look, 0.45, 1.05, {
        start: 0.12 + t1 + gap,
        duration: t2,
        anim: "fade",
      }),
      bandText(clips, "Disponible !", tag, 0.48, 1.2, {
        start: t3Start,
        duration: t3,
        anim: "glow",
      }),
    ];
  }

  // ——— Invest (cinzel + modern) — Quartier attractif plus court ———
  if (templateId === "restaurant-chic") {
    const brand = {
      ...styleFromFont("cinzel"),
      color: "#FFFFFF",
      stroke: "dark" as const,
      bg: null,
      bgAlpha: 0,
    };
    const body = {
      ...styleFromFont("modern"),
      color: "#FFFFFF",
      stroke: "dark" as const,
      bg: null,
      bgAlpha: 0,
    };
    const half = Math.max(3.2, total * 0.42);
    const quartierStart = 0.4 + half * 0.55;
    return [
      bandText(clips, "INVESTISSEMENT", brand, 0.16, 0.95, {
        start: 0.12,
        duration: Math.max(4, total - 0.25),
        x: 0.72,
        anim: "fade",
      }),
      bandText(clips, "8% de rendement", body, 0.45, 1.15, {
        start: 0.4,
        duration: half,
        anim: "fade",
      }),
      bandText(clips, "Quartier attractif", body, 0.56, 1.05, {
        start: quartierStart,
        duration: Math.min(2.0, Math.max(1.6, total - quartierStart - 0.2)),
        anim: "fade",
      }),
    ];
  }

  return [];
}

/** Calques FFmpeg démo — ASCII-safe (pas d’apostrophes). */
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

  if (templateId === "salle-fitness" && clipCount >= 1) {
    const t1 = Math.max(1.55, Math.min(1.85, total * 0.18));
    const t2 = Math.max(2.4, Math.min(2.8, total * 0.26));
    const gap = 0.1;
    const t3Start = 0.12 + t1 + gap + t2 + gap;
    const t3 = Math.max(2.4, total - t3Start - 0.12);
    return [
      {
        content: "Bien rare !",
        fontId: "anton",
        start: 0.12,
        duration: t1,
        x: 0.5,
        y: 0.42,
        scale: 1.55,
        color: "#FFFFFF",
        stroke: "none",
        bg: "#0A0A0A",
        bgAlpha: 0.82,
      },
      {
        content: "3p . 70m2 . Parking",
        fontId: "anton",
        start: 0.12 + t1 + gap,
        duration: t2,
        x: 0.5,
        y: 0.45,
        scale: 1.05,
        color: "#FFFFFF",
        stroke: "none",
        bg: "#0A0A0A",
        bgAlpha: 0.82,
      },
      {
        content: "Disponible !",
        fontId: "anton",
        start: t3Start,
        duration: t3,
        x: 0.5,
        y: 0.48,
        scale: 1.2,
        color: "#0A0A0A",
        stroke: "none",
        bg: "#FFE566",
        bgAlpha: 0.95,
      },
    ];
  }

  if (templateId === "restaurant-chic" && clipCount >= 1) {
    const half = Math.max(3.2, total * 0.42);
    const quartierStart = 0.4 + half * 0.55;
    return [
      {
        content: "INVESTISSEMENT",
        fontId: "cinzel",
        start: 0.12,
        duration: Math.max(4, total - 0.25),
        x: 0.72,
        y: 0.16,
        scale: 0.95,
        color: "#FFFFFF",
        stroke: "dark",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "8% de rendement",
        fontId: "modern",
        start: 0.4,
        duration: half,
        x: 0.5,
        y: 0.45,
        scale: 1.15,
        color: "#FFFFFF",
        stroke: "dark",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "Quartier attractif",
        fontId: "modern",
        start: quartierStart,
        duration: Math.min(2.0, Math.max(1.6, total - quartierStart - 0.2)),
        x: 0.5,
        y: 0.56,
        scale: 1.05,
        color: "#FFFFFF",
        stroke: "dark",
        bg: null,
        bgAlpha: 0,
      },
    ];
  }

  return [];
}
