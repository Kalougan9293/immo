import type { TextLayerEdit } from "@/lib/render/edit-options";
import {
  CINEMA_META_FADE_SEC,
  CINEMA_TITLE_FADE_SEC,
} from "@/lib/render/edit-options";
import type { PropertyListing } from "./property";
import { propertyHasContent } from "./property";

/** Crème éditorial (réf. Gemini). */
export const CINEMA_TEXT_COLOR = "#F5F0E6";

export type CinemaStyleId =
  | "editorial"
  | "pulse"
  | "marina"
  | "noir"
  | "bold"
  | "warm";

export type CinemaStyle = {
  id: CinemaStyleId;
  fadeSeconds: number;
  transitions: readonly string[];
  motions: readonly string[];
  negative: string;
  /** Police overlay */
  fontId: "playfair" | "modern" | "cinzel" | "anton" | "serif" | "script";
  textColor: string;
  titleScale: number;
  grade: { brightness: number; contrast: number; saturation: number };
};

const FIDELITY =
  "Animate ONLY the provided real-estate photo. Strictly preserve exact furniture, layout, materials, colors — do not invent or rearrange anything. Adapt the camera move to whatever room or exterior is shown.";

const NO_EXTRAS =
  "No text, no people, no watermark, no logos.";

/** Motions order-agnostic — le style (vitesse / énergie) change, pas la pièce. */
const EDITORIAL_LOOK =
  "Luxury editorial real-estate cinema, 9:16, soft daylight, photoreal, filmic contrast, quiet prestige, extremely slow camera.";

const PULSE_LOOK =
  "Snappy luxury TikTok real-estate cinema, 9:16, crisp contrast, photoreal, energetic but locked gimbal, short punchy moves.";

const MARINA_LOOK =
  "Bright lifestyle villa cinema, 9:16, high-key midday sun, airy photoreal, floating glide, warm prestige.";

const NOIR_LOOK =
  "Dark prestige real-estate cinema, 9:16, moody low-key contrast, photoreal, almost-still tripod, quiet drama, restrained luxury.";

const BOLD_LOOK =
  "Bold vertical real-estate cinema, 9:16, high-contrast punch, photoreal, assertive locked moves toward architecture DETAIL, energetic impact.";

const WARM_LOOK =
  "Warm golden-hour real-estate cinema, 9:16, soft amber light feel, photoreal, wide gentle pans, romantic soft prestige.";

export const CINEMA_STYLES: Record<CinemaStyleId, CinemaStyle> = {
  /** Lent · fadeblack · prestige calme (démo Editorial) */
  editorial: {
    id: "editorial",
    fadeSeconds: 0.45,
    transitions: ["fadeblack", "fadeblack", "fadeblack", "distance", "fade"],
    motions: [
      `${FIDELITY} ${EDITORIAL_LOOK} Locked tripod EXTREMELY SLOW constant-speed PUSH-IN, rock-steady, subtle depth parallax only. ${NO_EXTRAS}`,
      `${FIDELITY} ${EDITORIAL_LOOK} Locked tripod ultra-slow LATERAL DRIFT right then settle, gimbal locked, no shake. ${NO_EXTRAS}`,
      `${FIDELITY} ${EDITORIAL_LOOK} Locked slider very slow PUSH-IN toward the brightest architectural focal point, quiet luxury. ${NO_EXTRAS}`,
      `${FIDELITY} ${EDITORIAL_LOOK} Locked tripod ultra-slow DRIFT left with minimal parallax, serene cinema, rock-steady. ${NO_EXTRAS}`,
      `${FIDELITY} ${EDITORIAL_LOOK} Locked gentle SLOW PUSH-IN then soft hold, editorial real-estate mood, rock-steady. ${NO_EXTRAS}`,
    ],
    negative:
      "handheld shake, wobble, bobbing, fast whip, morphing furniture, invented objects, people, text, watermark, cartoon, warped walls",
    fontId: "playfair",
    textColor: CINEMA_TEXT_COLOR,
    titleScale: 1.78,
    grade: { brightness: 0.03, contrast: 1.1, saturation: 0.94 },
  },
  /** Rapide · slides / wipes · punchy (Pulse) */
  pulse: {
    id: "pulse",
    fadeSeconds: 0.14,
    transitions: ["slideleft", "wipeleft", "slideright", "slideleft", "wiperight"],
    motions: [
      `${FIDELITY} ${PULSE_LOOK} Locked tripod SHORT energetic SMOOTH push-in at constant speed then brief hold, no shake. ${NO_EXTRAS}`,
      `${FIDELITY} ${PULSE_LOOK} Locked tripod quick micro PUSH then SNAP settle, snappy luxury, rock-steady. ${NO_EXTRAS}`,
      `${FIDELITY} ${PULSE_LOOK} Locked slider crisp FORWARD GLIDE, faster than editorial but still smooth, no handheld. ${NO_EXTRAS}`,
      `${FIDELITY} ${PULSE_LOOK} Locked tripod snappy micro DRIFT right then hard settle, punchy real-estate feel. ${NO_EXTRAS}`,
      `${FIDELITY} ${PULSE_LOOK} Locked assertive PUSH-IN toward architecture detail, brisk tempo, rock-steady. ${NO_EXTRAS}`,
    ],
    negative:
      "slow dreamy drift, handheld, wobble, morphing, invented objects, people, text, watermark, soft mushy focus",
    fontId: "modern",
    textColor: "#FFFFFF",
    titleScale: 1.62,
    grade: { brightness: 0.04, contrast: 1.14, saturation: 1.06 },
  },
  /** Moyen · smoothleft/fade · glide lifestyle (Marina) */
  marina: {
    id: "marina",
    fadeSeconds: 0.3,
    transitions: ["smoothleft", "fade", "smoothright", "fade", "smoothleft"],
    motions: [
      `${FIDELITY} ${MARINA_LOOK} Locked floating FORWARD GLIDE at medium-slow speed, soft parallax, bright airy light, rock-steady. ${NO_EXTRAS}`,
      `${FIDELITY} ${MARINA_LOOK} Locked gentle LATERAL DRIFT with sunny lifestyle mood, smooth constant speed, no shake. ${NO_EXTRAS}`,
      `${FIDELITY} ${MARINA_LOOK} Locked slider dreamy medium PUSH-IN, warm daylight, calm villa prestige, rock-steady. ${NO_EXTRAS}`,
      `${FIDELITY} ${MARINA_LOOK} Locked floating push toward depth of the space, bright high-key, soft reflections, rock-steady. ${NO_EXTRAS}`,
      `${FIDELITY} ${MARINA_LOOK} Locked gentle reveal PUSH-IN as if stepping into the space, airy lifestyle cinema, rock-steady. ${NO_EXTRAS}`,
    ],
    negative:
      "handheld shake, wobble, aggressive smash zoom, morphing furniture, invented objects, people, text, watermark, cartoon, dark muddy grade, warped walls",
    fontId: "cinzel",
    textColor: "#F7F3EB",
    titleScale: 1.48,
    grade: { brightness: 0.06, contrast: 1.05, saturation: 1.1 },
  },
  /** Très lent · fadeblack long · grade sombre (Noir) */
  noir: {
    id: "noir",
    fadeSeconds: 0.55,
    transitions: ["fadeblack", "fadeblack", "fadeblack", "fadeblack", "fade"],
    motions: [
      `${FIDELITY} ${NOIR_LOOK} Locked tripod NEARLY STATIC then ultra-micro PUSH-IN, rock-steady, prestige stillness. ${NO_EXTRAS}`,
      `${FIDELITY} ${NOIR_LOOK} Locked tripod extremely slow crawl FORWARD with minimal parallax, moody cinema, no shake. ${NO_EXTRAS}`,
      `${FIDELITY} ${NOIR_LOOK} Locked almost-still frame with tiny LATERAL micro-drift, dark luxury mood, rock-steady. ${NO_EXTRAS}`,
      `${FIDELITY} ${NOIR_LOOK} Locked ultra-slow PUSH toward depth of the room then hold, dramatic restraint. ${NO_EXTRAS}`,
      `${FIDELITY} ${NOIR_LOOK} Locked tripod glacial push-in, quiet noir prestige, rock-steady. ${NO_EXTRAS}`,
    ],
    negative:
      "fast motion, whip pan, handheld, wobble, bright overexposed look, morphing, invented objects, people, text, watermark, cartoon",
    fontId: "playfair",
    textColor: "#D4A84B",
    titleScale: 1.7,
    grade: { brightness: -0.06, contrast: 1.22, saturation: 0.82 },
  },
  /** Percutant · cercle/wipe · zoom détail (Bold) */
  bold: {
    id: "bold",
    fadeSeconds: 0.12,
    transitions: [
      "circleopen",
      "wipeleft",
      "wiperight",
      "circleopen",
      "wipeleft",
    ],
    motions: [
      `${FIDELITY} ${BOLD_LOOK} Locked assertive PUSH-IN toward a clear architectural DETAIL (molding, fixture, material), then hard settle. ${NO_EXTRAS}`,
      `${FIDELITY} ${BOLD_LOOK} Locked fast-but-smooth FORWARD RUSH at constant speed, impactful reveal of the space, no shake. ${NO_EXTRAS}`,
      `${FIDELITY} ${BOLD_LOOK} Locked punchy micro ZOOM into texture or furniture focal point, snappy settle, rock-steady. ${NO_EXTRAS}`,
      `${FIDELITY} ${BOLD_LOOK} Locked decisive LATERAL SNAP drift then stop, bold vertical energy, no handheld. ${NO_EXTRAS}`,
      `${FIDELITY} ${BOLD_LOOK} Locked strong PUSH toward room depth, high-impact real-estate tempo, rock-steady. ${NO_EXTRAS}`,
    ],
    negative:
      "slow dreamy drift, soft mushy look, handheld, wobble, morphing, invented objects, people, text, watermark",
    fontId: "anton",
    textColor: "#FFFFFF",
    titleScale: 1.88,
    grade: { brightness: 0.05, contrast: 1.2, saturation: 1.12 },
  },
  /** Doux · dissolve/blanc · grands pans (Ambre) */
  warm: {
    id: "warm",
    fadeSeconds: 0.4,
    transitions: ["dissolve", "fadewhite", "fade", "dissolve", "fadewhite"],
    motions: [
      `${FIDELITY} ${WARM_LOOK} Locked wide gentle LATERAL PAN across the full room, soft constant speed, warm soft prestige. ${NO_EXTRAS}`,
      `${FIDELITY} ${WARM_LOOK} Locked slow panoramic DRIFT left revealing space, romantic amber mood, rock-steady. ${NO_EXTRAS}`,
      `${FIDELITY} ${WARM_LOOK} Locked soft medium PUSH-IN with warm daylight feel, gentle and airy, no shake. ${NO_EXTRAS}`,
      `${FIDELITY} ${WARM_LOOK} Locked wide lateral SWEEP right then soft settle, golden lifestyle cinema. ${NO_EXTRAS}`,
      `${FIDELITY} ${WARM_LOOK} Locked dreamy slow pan with subtle parallax, soft warm prestige, rock-steady. ${NO_EXTRAS}`,
    ],
    negative:
      "harsh contrast, cold blue grade, aggressive smash zoom, handheld, wobble, morphing, invented objects, people, text, watermark, cartoon",
    fontId: "script",
    textColor: "#F7F3EB",
    titleScale: 1.55,
    grade: { brightness: 0.08, contrast: 1.02, saturation: 1.18 },
  },
};

/** Map template DYNAMIC → style cinéma */
export const TEMPLATE_CINEMA_STYLE: Record<string, CinemaStyleId> = {
  "dynamic-reel": "editorial",
  "dynamic-pulse": "pulse",
  "dynamic-marina": "marina",
  "dynamic-noir": "noir",
  "dynamic-bold": "bold",
  "dynamic-warm": "warm",
};

export function getCinemaStyle(templateId: string): CinemaStyle {
  const id = TEMPLATE_CINEMA_STYLE[templateId] ?? "editorial";
  return CINEMA_STYLES[id];
}

export function cinemaMotionPrompt(
  templateId: string,
  clipIndex: number,
): string {
  const style = getCinemaStyle(templateId);
  return style.motions[clipIndex % style.motions.length];
}

export function cinemaTransitions(
  templateId: string,
  junctionCount: number,
): string[] {
  const style = getCinemaStyle(templateId);
  const out: string[] = [];
  for (let i = 0; i < junctionCount; i++) {
    out.push(style.transitions[i % style.transitions.length]);
  }
  return out;
}

export function cinemaNegative(templateId: string): string {
  return getCinemaStyle(templateId).negative;
}

export const CINEMA_FADE_SECONDS = 0.38;

type ClipTiming = { start: number; duration: number };

function clipTimelines(
  clipCount: number,
  clipSec: number,
  fadeSec: number,
): ClipTiming[] {
  const clips: ClipTiming[] = [];
  let cursor = 0;
  for (let i = 0; i < clipCount; i++) {
    clips.push({ start: cursor, duration: clipSec });
    cursor += clipSec - (i < clipCount - 1 ? fadeSec : 0);
  }
  return clips;
}

/**
 * Tracking FFmpeg (drawtext n’a pas de letter-spacing) :
 * espaces fins entre lettres, mot intact éditable côté UI.
 */
export function applyCinemaTracking(
  text: string,
  look: "cinema" | "cinema-meta",
): string {
  const upper = text.toLocaleUpperCase("fr-FR").trim();
  if (!upper) return upper;
  const gap = look === "cinema" ? "\u2009" : "\u200A";
  const wordGap = look === "cinema" ? "   " : "  ";
  return upper
    .split(/\s+/)
    .map((word) => word.split("").join(gap))
    .join(wordGap);
}

function layer(
  content: string,
  clip: ClipTiming,
  y: number,
  scale: number,
  style: CinemaStyle,
  pad: number,
  look: "cinema" | "cinema-meta",
): TextLayerEdit {
  const fadeSec =
    look === "cinema" ? CINEMA_TITLE_FADE_SEC : CINEMA_META_FADE_SEC;
  const start = clip.start + pad;
  const duration = Math.max(1.8, clip.duration - pad - 0.28);
  const useCinemaLook = style.fontId !== "script";
  return {
    content,
    fontId: style.fontId,
    start,
    duration,
    x: 0.5,
    y,
    scale,
    color: style.textColor,
    stroke: "dark",
    bg: null,
    bgAlpha: 0,
    ...(useCinemaLook ? { look } : {}),
    fadeSec,
  };
}

/**
 * Écriture éditoriale selon le style du modèle DYNAMIC.
 */
export function buildCinemaTextLayers(
  property: PropertyListing,
  clipCount: number,
  clipSec = 4,
  fadeSec?: number,
  templateId = "dynamic-reel",
): TextLayerEdit[] {
  if (!propertyHasContent(property) || clipCount < 1) return [];

  const style = getCinemaStyle(templateId);
  const fade = fadeSec ?? style.fadeSeconds;
  const clips = clipTimelines(clipCount, clipSec, fade);
  const layers: TextLayerEdit[] = [];
  const ts = style.titleScale;

  // Entrée plus lente → titres respirent
  const titlePad = 0.72;

  if (property.titleLine1) {
    layers.push(
      layer(
        property.titleLine1,
        clips[0],
        property.titleLine2 ? 0.66 : 0.72,
        Math.min(1.42, ts),
        style,
        titlePad,
        "cinema",
      ),
    );
  }
  if (property.titleLine2) {
    layers.push(
      layer(
        property.titleLine2,
        clips[0],
        0.77,
        Math.min(1.32, ts),
        style,
        titlePad,
        "cinema",
      ),
    );
  }

  if (property.specs) {
    const idx = clipCount >= 2 ? 1 : 0;
    const y = clipCount >= 2 ? 0.76 : 0.84;
    const pad = clipCount >= 2 ? 0.55 : 2.2;
    layers.push(
      layer(property.specs, clips[idx], y, 1.05, style, pad, "cinema-meta"),
    );
  }

  if (property.highlight) {
    if (clipCount >= 3) {
      layers.push(
        layer(
          property.highlight,
          clips[2],
          0.76,
          1.15,
          style,
          0.55,
          "cinema-meta",
        ),
      );
    } else if (clipCount === 2 && !property.specs) {
      layers.push(
        layer(
          property.highlight,
          clips[1],
          0.76,
          1.15,
          style,
          0.55,
          "cinema-meta",
        ),
      );
    } else if (clipCount === 1 && !property.titleLine1) {
      layers.push(
        layer(
          property.highlight,
          clips[0],
          0.76,
          1.15,
          style,
          0.72,
          "cinema-meta",
        ),
      );
    }
  }

  if (property.cta) {
    const last = clips[clips.length - 1];
    if (clipCount === 1) {
      layers.push(
        layer(property.cta, last, 0.88, 0.98, style, 2.6, "cinema-meta"),
      );
    } else if (clipCount === 2 && property.specs) {
      layers.push(
        layer(property.cta, last, 0.86, 1.0, style, 2.0, "cinema-meta"),
      );
    } else if (clipCount >= 3) {
      const y = clipCount === 3 && property.highlight ? 0.86 : 0.76;
      const pad = clipCount === 3 && property.highlight ? 2.0 : 0.55;
      layers.push(
        layer(property.cta, last, y, 1.08, style, pad, "cinema-meta"),
      );
    } else {
      layers.push(
        layer(property.cta, last, 0.76, 1.08, style, 0.55, "cinema-meta"),
      );
    }
  }

  return layers;
}
