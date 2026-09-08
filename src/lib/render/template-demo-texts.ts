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
 * Polices uniques par modèle :
 * 1 playfair · 2 script · 3 serif · 4 sans · 5 anton · 6 cinzel+modern
 */
export function starterTextsForTemplate(
  templateId: string,
  clips: Pick<TimelineClip, "duration">[],
): TimelineTextLayer[] {
  if (!clips.length) return [];
  const total = totalDuration(clips);

  // ——— 1 Domino milieu-bas (playfair) ———
  if (templateId === "appartement-premium") {
    const look = {
      ...styleFromFont("playfair"),
      color: "#FFFFFF",
      stroke: "none" as const,
      bg: null,
      bgAlpha: 0,
    };
    // 1 → 1+2 → 2+3 → 3+4
    const pStart = 0.2;
    const aStart = 1.2;
    const pEnd = Math.min(total * 0.38, 5.2);
    const mStart = pEnd;
    const aEnd = Math.min(total * 0.62, 8.4);
    const eStart = aEnd;
    const mEnd = Math.min(total * 0.82, 11.2);
    const eEnd = total - 0.15;
    return [
      bandText(clips, "Paris 16eme", look, 0.58, 1.35, {
        start: pStart,
        duration: pEnd - pStart,
        anim: "fade",
      }),
      bandText(clips, "Avenue Foch", look, 0.7, 1.12, {
        start: aStart,
        duration: aEnd - aStart,
        anim: "fade",
      }),
      bandText(clips, "70m2 - 3 pieces", look, 0.58, 1.15, {
        start: mStart,
        duration: mEnd - mStart,
        anim: "fade",
      }),
      bandText(clips, "280 000 EUR", look, 0.7, 1.2, {
        start: eStart,
        duration: eEnd - eStart,
        anim: "fade",
      }),
    ];
  }

  // ——— 2 Dubai Marina (script) + bandeau tel ———
  if (templateId === "maison-moderne") {
    const top = {
      ...styleFromFont("script"),
      color: "#FFFFFF",
      stroke: "dark" as const,
      bg: null,
      bgAlpha: 0,
    };
    const mid = {
      ...styleFromFont("script"),
      color: "#FFFFFF",
      stroke: "none" as const,
      bg: null,
      bgAlpha: 0,
    };
    const phone = {
      ...styleFromFont("script"),
      color: "#111111",
      stroke: "none" as const,
      bg: "#FFFFFF",
      bgAlpha: 0.94,
    };
    const d = Math.max(3.5, total - 0.25);
    return [
      bandText(clips, "Dubai, La Marina", top, 0.16, 1.35, {
        start: 0.12,
        duration: d,
        anim: "glow",
      }),
      bandText(clips, "Dubai, Real Estate", mid, 0.48, 1.05, {
        start: 0.35,
        duration: d - 0.2,
        anim: "fade",
        // “transparent” via faible contraste / stroke light
        color: "#FFFFFF",
        bgAlpha: 0,
      }),
      bandText(clips, "+971 545 265", phone, 0.84, 1.05, {
        start: 0.2,
        duration: d - 0.08,
        anim: "fade",
      }),
    ];
  }

  // ——— 3 Cascade (serif) ———
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

  // ——— 4 One-shot (sans) — texte discret listing ———
  if (templateId === "hotel-boutique") {
    const look = {
      ...styleFromFont("sans"),
      color: "#FFFFFF",
      stroke: "dark" as const,
      bg: null,
      bgAlpha: 0,
    };
    const d = Math.max(4, total - 0.3);
    return [
      bandText(clips, "FOR SALE", look, 0.2, 1.1, {
        start: 0.2,
        duration: d * 0.55,
        anim: "fade",
      }),
      bandText(clips, "6 Bd - 5 000 sqft", look, 0.8, 0.95, {
        start: 0.8,
        duration: d - 0.5,
        anim: "fade",
      }),
    ];
  }

  // ——— 5 Fitness (anton) ———
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
    const t1 = Math.max(3.2, Math.min(3.6, total * 0.34));
    const t2 = Math.max(2.8, Math.min(3.3, total * 0.3));
    const gap = 0.1;
    const t3Start = 0.12 + t1 + gap + t2 + gap;
    const t3 = Math.max(2.8, total - t3Start - 0.12);
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

  // ——— 6 Invest (cinzel special + modern) ———
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
        start: 0.4 + half * 0.55,
        duration: Math.max(3, total - (0.4 + half * 0.55) - 0.15),
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

  if (templateId === "appartement-premium" && clipCount >= 1) {
    const pStart = 0.2;
    const aStart = 1.2;
    const pEnd = Math.min(total * 0.38, 5.2);
    const mStart = pEnd;
    const aEnd = Math.min(total * 0.62, 8.4);
    const eStart = aEnd;
    const mEnd = Math.min(total * 0.82, 11.2);
    const eEnd = total - 0.15;
    return [
      {
        content: "Paris 16eme",
        fontId: "playfair",
        start: pStart,
        duration: pEnd - pStart,
        x: 0.5,
        y: 0.58,
        scale: 1.35,
        color: "#FFFFFF",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "Avenue Foch",
        fontId: "playfair",
        start: aStart,
        duration: aEnd - aStart,
        x: 0.5,
        y: 0.7,
        scale: 1.12,
        color: "#FFFFFF",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "70m2 - 3 pieces",
        fontId: "playfair",
        start: mStart,
        duration: mEnd - mStart,
        x: 0.5,
        y: 0.58,
        scale: 1.15,
        color: "#FFFFFF",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "280 000 EUR",
        fontId: "playfair",
        start: eStart,
        duration: eEnd - eStart,
        x: 0.5,
        y: 0.7,
        scale: 1.2,
        color: "#FFFFFF",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
    ];
  }

  if (templateId === "maison-moderne" && clipCount >= 1) {
    const d = Math.max(3.5, total - 0.25);
    return [
      {
        content: "Dubai, La Marina",
        fontId: "script",
        start: 0.12,
        duration: d,
        x: 0.5,
        y: 0.16,
        scale: 1.35,
        color: "#FFFFFF",
        stroke: "dark",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "Dubai, Real Estate",
        fontId: "script",
        start: 0.35,
        duration: d - 0.2,
        x: 0.5,
        y: 0.48,
        scale: 1.05,
        color: "#FFFFFF",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "+971 545 265",
        fontId: "script",
        start: 0.2,
        duration: d - 0.08,
        x: 0.5,
        y: 0.84,
        scale: 1.05,
        color: "#111111",
        stroke: "none",
        bg: "#FFFFFF",
        bgAlpha: 0.94,
      },
    ];
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

  if (templateId === "hotel-boutique" && clipCount >= 1) {
    const d = Math.max(4, total - 0.3);
    return [
      {
        content: "FOR SALE",
        fontId: "sans",
        start: 0.2,
        duration: d * 0.55,
        x: 0.5,
        y: 0.2,
        scale: 1.1,
        color: "#FFFFFF",
        stroke: "dark",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "6 Bd - 5 000 sqft",
        fontId: "sans",
        start: 0.8,
        duration: d - 0.5,
        x: 0.5,
        y: 0.8,
        scale: 0.95,
        color: "#FFFFFF",
        stroke: "dark",
        bg: null,
        bgAlpha: 0,
      },
    ];
  }

  if (templateId === "salle-fitness" && clipCount >= 1) {
    const t1 = Math.max(3.2, Math.min(3.6, total * 0.34));
    const t2 = Math.max(2.8, Math.min(3.3, total * 0.3));
    const gap = 0.1;
    const t3Start = 0.12 + t1 + gap + t2 + gap;
    const t3 = Math.max(2.8, total - t3Start - 0.12);
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
        start: 0.4 + half * 0.55,
        duration: Math.max(3, total - (0.4 + half * 0.55) - 0.15),
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
