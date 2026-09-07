import {
  newId,
  styleFromFont,
  type TextLayerEdit,
  type TimelineClip,
  type TimelineTextLayer,
} from "@/lib/render/edit-options";

type Look = ReturnType<typeof styleFromFont>;

/** Texte sur une plage (bandeau). */
function bandText(
  clips: Pick<TimelineClip, "duration">[],
  content: string,
  look: Look,
  y: number,
  scale: number,
  opts?: Partial<TimelineTextLayer>,
): TimelineTextLayer {
  const total = clips.reduce((s, c) => s + c.duration, 0);
  return {
    id: newId("txt"),
    content,
    fontId: look.fontId,
    start: 0.08,
    duration: Math.max(1.5, total - 0.2),
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
 * Textes signature du modèle — démo + précharge étape 3.
 * Soft/luxe = serif fin + ombre douce / coin.
 * Banger = Anton/Black + mask noir ou highlight jaune.
 */
export function starterTextsForTemplate(
  templateId: string,
  clips: Pick<TimelineClip, "duration">[],
): TimelineTextLayer[] {
  if (!clips.length) return [];

  const total = totalDuration(clips);

  // ——— 1 Soft urbain ———
  if (templateId === "appartement-premium" && clips.length >= 5) {
    const titleLook = {
      ...styleFromFont("playfair"),
      color: "#F7F3EB",
      stroke: "none" as const,
      bg: null,
      bgAlpha: 0,
    };
    const placeLook = {
      ...styleFromFont("modern"),
      color: "#F7F3EB",
      stroke: "none" as const,
      bg: "#0A0A0A",
      bgAlpha: 0.42,
    };
    const priceLook = {
      ...styleFromFont("modern"),
      color: "#1A1A1A",
      stroke: "none" as const,
      bg: "#F7F3EB",
      bgAlpha: 0.92,
    };
    const introDur = Math.max(2.8, total * 0.48);
    const priceStart = Math.min(total - 2.4, total * 0.52);
    const priceDur = Math.max(2.2, total - priceStart - 0.12);
    return [
      bandText(clips, "Appartement 3 pièces", titleLook, 0.7, 1.18, {
        start: 0.18,
        duration: introDur,
        anim: "fade",
      }),
      bandText(clips, "Paris", placeLook, 0.79, 0.9, {
        icon: "pin",
        start: 0.18,
        duration: introDur,
      }),
      bandText(clips, "350 000 €", priceLook, 0.78, 1.15, {
        start: priceStart,
        duration: priceDur,
      }),
    ];
  }

  // ——— 2 Classic + WhatsApp ———
  if (templateId === "maison-moderne") {
    const top = {
      ...styleFromFont("playfair"),
      color: "#FFFFFF",
      stroke: "none" as const,
      bg: null,
      bgAlpha: 0,
    };
    const phone = {
      ...styleFromFont("modern"),
      color: "#111111",
      stroke: "none" as const,
      bg: "#FFFFFF",
      bgAlpha: 0.94,
    };
    return [
      bandText(clips, "Dubaï, La Marina", top, 0.18, 1.12),
      bandText(clips, "+971 454 454", phone, 0.83, 0.98, {
        icon: "whatsapp",
      }),
    ];
  }

  // ——— 3 Instagram BANGER ———
  if (templateId === "villa-luxe") {
    const hook = {
      ...styleFromFont("black"),
      color: "#0A0A0A",
      stroke: "none" as const,
      bg: "#FFE566",
      bgAlpha: 0.95,
    };
    const title = {
      ...styleFromFont("anton"),
      color: "#FFFFFF",
      stroke: "none" as const,
      bg: "#0A0A0A",
      bgAlpha: 0.78,
    };
    const place = {
      ...styleFromFont("modern"),
      color: "#FFFFFF",
      stroke: "none" as const,
      bg: null,
      bgAlpha: 0,
    };
    const half = Math.max(2.2, total * 0.45);
    return [
      bandText(clips, "JUST LISTED", hook, 0.2, 0.95, {
        start: 0.12,
        duration: half,
        anim: "glow",
      }),
      bandText(clips, "VILLA · IBIZA", title, 0.42, 1.55, {
        start: 0.2,
        duration: Math.max(2.5, total - 0.4),
        anim: "glow",
      }),
      bandText(clips, "Private pool · Sea view", place, 0.82, 0.88, {
        start: half * 0.85,
        duration: Math.max(2, total - half * 0.85 - 0.15),
      }),
    ];
  }

  // ——— 4 Soft / éditorial hôtel ———
  if (templateId === "hotel-boutique") {
    const place = {
      ...styleFromFont("playfair"),
      color: "#F7F3EB",
      stroke: "none" as const,
      bg: null,
      bgAlpha: 0,
    };
    const sub = {
      ...styleFromFont("cinzel"),
      color: "#E8DFD0",
      stroke: "none" as const,
      bg: null,
      bgAlpha: 0,
    };
    const card = {
      ...styleFromFont("modern"),
      color: "#1A1A1A",
      stroke: "none" as const,
      bg: "#F7F3EB",
      bgAlpha: 0.9,
    };
    return [
      // Coin haut-gauche (soft) — x décalé
      bandText(clips, "Miami Beach", place, 0.17, 1.05, { x: 0.28 }),
      bandText(clips, "BOUTIQUE", sub, 0.25, 0.72, { x: 0.28 }),
      bandText(clips, "estate@miam.com", card, 0.84, 0.85),
    ];
  }

  // ——— 5 Fitness BANGER ———
  if (templateId === "salle-fitness") {
    const hook = {
      ...styleFromFont("anton"),
      color: "#FFFFFF",
      stroke: "none" as const,
      bg: "#0A0A0A",
      bgAlpha: 0.82,
    };
    const tag = {
      ...styleFromFont("black"),
      color: "#0A0A0A",
      stroke: "none" as const,
      bg: "#FFE566",
      bgAlpha: 0.95,
    };
    return [
      bandText(clips, "TRAIN HARD", hook, 0.4, 1.65, { anim: "glow" }),
      bandText(clips, "OPEN NOW", tag, 0.55, 1.05, {
        start: 0.35,
        duration: Math.max(2, total - 0.5),
        anim: "glow",
      }),
    ];
  }

  // ——— 6 Restaurant soft gourmand ———
  if (templateId === "restaurant-chic") {
    const title = {
      ...styleFromFont("playfair"),
      color: "#F7F3EB",
      stroke: "none" as const,
      bg: null,
      bgAlpha: 0,
    };
    const sub = {
      ...styleFromFont("script"),
      color: "#E8C87A",
      stroke: "none" as const,
      bg: null,
      bgAlpha: 0,
    };
    return [
      bandText(clips, "Table pour deux", title, 0.72, 1.15),
      bandText(clips, "Réservez ce soir", sub, 0.82, 1.05),
    ];
  }

  return [];
}

/** Calques FFmpeg démo — temps relatifs aux clips média. */
export function demoTextLayersForTemplate(
  templateId: string,
  imageSeconds: number,
  clipCount: number,
): TextLayerEdit[] {
  const total = imageSeconds * Math.max(1, clipCount);

  if (templateId === "appartement-premium" && clipCount >= 5) {
    const introDur = Math.max(2.8, total * 0.48);
    const priceStart = Math.min(total - 2.4, total * 0.52);
    const priceDur = Math.max(2.2, total - priceStart - 0.12);
    return [
      {
        content: "Appartement 3 pièces",
        fontId: "playfair",
        start: 0.18,
        duration: introDur,
        x: 0.5,
        y: 0.7,
        scale: 1.18,
        color: "#F7F3EB",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "Paris",
        fontId: "modern",
        start: 0.18,
        duration: introDur,
        x: 0.5,
        y: 0.79,
        scale: 0.9,
        color: "#F7F3EB",
        stroke: "none",
        bg: "#0A0A0A",
        bgAlpha: 0.42,
        icon: "pin",
      },
      {
        content: "350 000 €",
        fontId: "modern",
        start: priceStart,
        duration: priceDur,
        x: 0.5,
        y: 0.78,
        scale: 1.15,
        color: "#1A1A1A",
        stroke: "none",
        bg: "#F7F3EB",
        bgAlpha: 0.92,
      },
    ];
  }

  if (templateId === "maison-moderne" && clipCount >= 1) {
    const d = Math.max(2, total - 0.25);
    return [
      {
        content: "Dubaï, La Marina",
        fontId: "playfair",
        start: 0.12,
        duration: d,
        x: 0.5,
        y: 0.18,
        scale: 1.12,
        color: "#FFFFFF",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "+971 454 454",
        fontId: "modern",
        start: 0.12,
        duration: d,
        x: 0.5,
        y: 0.83,
        scale: 0.98,
        color: "#111111",
        stroke: "none",
        bg: "#FFFFFF",
        bgAlpha: 0.94,
        icon: "whatsapp",
      },
    ];
  }

  if (templateId === "villa-luxe" && clipCount >= 1) {
    const half = Math.max(2.2, total * 0.45);
    return [
      {
        content: "JUST LISTED",
        fontId: "black",
        start: 0.12,
        duration: half,
        x: 0.5,
        y: 0.2,
        scale: 0.95,
        color: "#0A0A0A",
        stroke: "none",
        bg: "#FFE566",
        bgAlpha: 0.95,
      },
      {
        content: "VILLA · IBIZA",
        fontId: "anton",
        start: 0.2,
        duration: Math.max(2.5, total - 0.4),
        x: 0.5,
        y: 0.42,
        scale: 1.55,
        color: "#FFFFFF",
        stroke: "none",
        bg: "#0A0A0A",
        bgAlpha: 0.78,
      },
      {
        content: "Private pool · Sea view",
        fontId: "modern",
        start: half * 0.85,
        duration: Math.max(2, total - half * 0.85 - 0.15),
        x: 0.5,
        y: 0.82,
        scale: 0.88,
        color: "#FFFFFF",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
    ];
  }

  if (templateId === "hotel-boutique" && clipCount >= 1) {
    const d = Math.max(2, total - 0.25);
    return [
      {
        content: "Miami Beach",
        fontId: "playfair",
        start: 0.12,
        duration: d,
        x: 0.28,
        y: 0.17,
        scale: 1.05,
        color: "#F7F3EB",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "BOUTIQUE",
        fontId: "cinzel",
        start: 0.12,
        duration: d,
        x: 0.28,
        y: 0.25,
        scale: 0.72,
        color: "#E8DFD0",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "estate@miam.com",
        fontId: "modern",
        start: 0.12,
        duration: d,
        x: 0.5,
        y: 0.84,
        scale: 0.85,
        color: "#1A1A1A",
        stroke: "none",
        bg: "#F7F3EB",
        bgAlpha: 0.9,
      },
    ];
  }

  if (templateId === "salle-fitness" && clipCount >= 1) {
    const d = Math.max(2, total - 0.35);
    return [
      {
        content: "TRAIN HARD",
        fontId: "anton",
        start: 0.1,
        duration: d,
        x: 0.5,
        y: 0.4,
        scale: 1.65,
        color: "#FFFFFF",
        stroke: "none",
        bg: "#0A0A0A",
        bgAlpha: 0.82,
      },
      {
        content: "OPEN NOW",
        fontId: "black",
        start: 0.35,
        duration: Math.max(2, total - 0.5),
        x: 0.5,
        y: 0.55,
        scale: 1.05,
        color: "#0A0A0A",
        stroke: "none",
        bg: "#FFE566",
        bgAlpha: 0.95,
      },
    ];
  }

  if (templateId === "restaurant-chic" && clipCount >= 1) {
    const d = Math.max(2, total - 0.25);
    return [
      {
        content: "Table pour deux",
        fontId: "playfair",
        start: 0.12,
        duration: d,
        x: 0.5,
        y: 0.72,
        scale: 1.15,
        color: "#F7F3EB",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
      {
        content: "Réservez ce soir",
        fontId: "script",
        start: 0.12,
        duration: d,
        x: 0.5,
        y: 0.82,
        scale: 1.05,
        color: "#E8C87A",
        stroke: "none",
        bg: null,
        bgAlpha: 0,
      },
    ];
  }

  return [];
}
