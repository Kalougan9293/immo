import type { TextLayerEdit, TextStyleLook } from "@/lib/render/edit-options";
import {
  CINEMA_META_FADE_SEC,
  CINEMA_TITLE_FADE_SEC,
  lookForColor,
} from "@/lib/render/edit-options";
import {
  getWritingStyle,
  type WritingStyle,
} from "@/data/writing-styles";
import type { PropertyFieldKey, PropertyListing } from "./property";
import { orderedPropertyEntries, propertyHasContent } from "./property";
import { VEO_FIDELITY_PROMPT } from "@/lib/ai/veo";

/** Crème éditorial (réf. Gemini). */
export const CINEMA_TEXT_COLOR = "#F5F0E6";

export type CinemaStyleId =
  | "editorial"
  | "pulse"
  | "marina"
  | "noir"
  | "bold"
  | "warm";

/** Motion / rythme / grade — sans typo (écriture = WritingStyle). */
export type CinemaStyle = {
  id: CinemaStyleId;
  fadeSeconds: number;
  transitions: readonly string[];
  motions: readonly string[];
  negative: string;
  grade: { brightness: number; contrast: number; saturation: number };
};

const NO_EXTRAS =
  "Rock-steady gimbal / slider only — never handheld. Tack-sharp focus end-to-end, no motion smear, no zoom blur. No text, no people, no watermark, no logos.";

/**
 * ADN des 3 exemples accueil (qualité, pas le décor à copier) :
 * reveal de seuil, contre-plongée, axe vers le point le plus profond.
 */
const SHOWREEL_LOOK =
  "Luxury vertical 9:16 real-estate cinema, prestige agency showreel quality. Doorway / threshold reveals, slightly low angle for scale, axial push toward THIS photo’s own deepest focal point. Deep perspective, strong leading lines, filmic contrast, materials already in the frame (stone, wood, glass, water). Controlled gimbal — premium, not sleepy, not smear.";

const EDITORIAL_LOOK =
  "Mood: filmic contrast, warm architectural light when present, museum-steady prestige.";

const PULSE_LOOK =
  "Mood: snappy social energy, still tack-sharp, compact moves.";

const MARINA_LOOK =
  "Mood: high-key midday sun, airy glass-and-water lifestyle, floating glide.";

const NOIR_LOOK =
  "Mood: low-key shadow drama, quiet night-luxury stillness.";

const BOLD_LOOK =
  "Mood: high-contrast punch toward architectural detail.";

const WARM_LOOK =
  "Mood: golden-hour amber, romantic prestige, warm interiors.";

const OPENER_SHOT =
  "OPENER: locked slider threshold REVEAL — smooth forward push through the nearest frame (balcony, doorway, arch, pool edge, hallway) into the deepest focal point. Constant speed, strong parallax, brief settle.";

const CLOSER_SHOT =
  "FINALE: locked slow push-in on the deepest hero of this photo (view, window, fireplace, pool, facade), then HOLD still for a prestige ending beat.";

const SHOWREEL_SHOTS = [
  OPENER_SHOT,
  "SCALE: slightly low-angle locked forward glide selling volume — ceiling lines, floor or water reflections, architecture scale.",
  "AXIS: locked center-axis advance down the enfilade / hallway / aisle / pool toward the hero view (window, fireplace, skyline, far room).",
  "HERO: locked assertive push-in on the main subject (facade, island, staircase, fireplace, chandelier, water), then settle.",
  "WALK: locked lateral drift with a gentle forward bias, as if walking the listing, leading lines alive, crisp parallax.",
] as const;

function showreelShot(clipIndex: number, photoCount: number): string {
  const n = Math.max(1, photoCount);
  if (clipIndex === 0) return OPENER_SHOT;
  if (clipIndex === n - 1 && n > 1) return CLOSER_SHOT;
  return SHOWREEL_SHOTS[1 + ((clipIndex - 1) % (SHOWREEL_SHOTS.length - 1))];
}

function showreelTempo(photoCount: number, slotSec?: number): string {
  const n = Math.max(1, Math.floor(photoCount));
  const sec =
    slotSec ?? (n <= 5 ? 3.6 : n <= 8 ? 1.7 : 1.1);
  if (n <= 5 || sec >= 3) {
    return `Pacing: LONG TAKE (~${sec.toFixed(1)}s). Complete elegant move: begin, travel, 0.4s hold. Visible depth parallax. Confident — not a crawl, not a smash zoom.`;
  }
  if (n <= 8 || sec >= 1.4) {
    return `Pacing: MEDIUM TAKE (~${sec.toFixed(1)}s). Compact complete move, already in motion at frame 1, short settle. Controlled prestige energy.`;
  }
  return `Pacing: SHORT TAKE (~${sec.toFixed(1)}s). One micro push or micro glide, single direction, no pan, no smear, firm settle.`;
}

function styleMood(id: CinemaStyleId): string {
  if (id === "marina") return MARINA_LOOK;
  if (id === "warm") return WARM_LOOK;
  if (id === "pulse") return PULSE_LOOK;
  if (id === "noir") return NOIR_LOOK;
  if (id === "bold") return BOLD_LOOK;
  return EDITORIAL_LOOK;
}

export const CINEMA_STYLES: Record<CinemaStyleId, CinemaStyle> = {
  /** Reveal · push contrôlé · refs exemples */
  editorial: {
    id: "editorial",
    fadeSeconds: 0.18,
    transitions: [
      "distance",
      "smoothleft",
      "fadeblack",
      "radial",
      "smoothright",
      "distance",
      "fadeblack",
    ],
    motions: [...SHOWREEL_SHOTS],
    negative:
      "handheld shake, wobble, bobbing, motion smear, radial zoom blur, soft mushy focus, morphing furniture, invented objects, people, text, watermark, cartoon, warped walls, glacial meditative crawl, sleepy static frame",
    grade: { brightness: 0.03, contrast: 1.24, saturation: 0.96 },
  },
  /** Rapide · slides / wipes · punchy */
  pulse: {
    id: "pulse",
    fadeSeconds: 0.08,
    transitions: ["slideleft", "wipeleft", "slideright", "wiperight", "slideleft"],
    motions: [
      `${PULSE_LOOK} ${SHOWREEL_SHOTS[3]}`,
      `${PULSE_LOOK} ${SHOWREEL_SHOTS[1]}`,
      `${PULSE_LOOK} ${SHOWREEL_SHOTS[2]}`,
    ],
    negative:
      "slow dreamy drift, glacial pace, handheld, wobble, morphing, invented objects, people, text, watermark, soft mushy focus, fade to black",
    grade: { brightness: 0.06, contrast: 1.2, saturation: 1.12 },
  },
  /** Moyen · smooth glide lifestyle */
  marina: {
    id: "marina",
    fadeSeconds: 0.22,
    transitions: [
      "smoothleft",
      "smoothright",
      "fadeblack",
      "smoothleft",
      "distance",
    ],
    motions: [
      `${MARINA_LOOK} ${SHOWREEL_SHOTS[0]}`,
      `${MARINA_LOOK} ${SHOWREEL_SHOTS[1]}`,
      `${MARINA_LOOK} ${SHOWREEL_SHOTS[4]}`,
    ],
    negative:
      "handheld shake, wobble, aggressive smash zoom, morphing furniture, invented objects, people, text, watermark, cartoon, dark muddy grade, warped walls, TikTok snap",
    grade: { brightness: 0.1, contrast: 1.08, saturation: 1.16 },
  },
  /** Tres lent · fadeblack · grade sombre */
  noir: {
    id: "noir",
    fadeSeconds: 0.7,
    transitions: ["fadeblack", "fadeblack", "fadeblack", "fadeblack", "fadeblack"],
    motions: [
      `${NOIR_LOOK} ${SHOWREEL_SHOTS[3]}`,
      `${NOIR_LOOK} ${SHOWREEL_SHOTS[4]}`,
      `${NOIR_LOOK} ${SHOWREEL_SHOTS[2]}`,
    ],
    negative:
      "fast motion, whip pan, handheld, wobble, bright overexposed look, morphing, invented objects, people, text, watermark, cartoon, sunny high-key, snappy energy",
    grade: { brightness: -0.1, contrast: 1.28, saturation: 0.72 },
  },
  /** Percutant · cercle/wipe · zoom detail */
  bold: {
    id: "bold",
    fadeSeconds: 0.06,
    transitions: [
      "circleopen",
      "wipeleft",
      "wiperight",
      "circleopen",
      "wipeleft",
    ],
    motions: [
      `${BOLD_LOOK} ${SHOWREEL_SHOTS[3]}`,
      `${BOLD_LOOK} ${SHOWREEL_SHOTS[2]}`,
      `${BOLD_LOOK} ${SHOWREEL_SHOTS[1]}`,
    ],
    negative:
      "slow dreamy drift, soft mushy look, handheld, wobble, morphing, invented objects, people, text, watermark, gentle pan, romantic amber",
    grade: { brightness: 0.04, contrast: 1.28, saturation: 1.08 },
  },
  /** Doux · dissolve/blanc · grands pans */
  warm: {
    id: "warm",
    fadeSeconds: 0.28,
    transitions: [
      "dissolve",
      "fadeblack",
      "smoothleft",
      "dissolve",
      "fadewhite",
    ],
    motions: [
      `${WARM_LOOK} ${SHOWREEL_SHOTS[0]}`,
      `${WARM_LOOK} ${SHOWREEL_SHOTS[4]}`,
      `${WARM_LOOK} ${SHOWREEL_SHOTS[3]}`,
    ],
    negative:
      "harsh cold blue grade, aggressive smash zoom, handheld, wobble, morphing, invented objects, people, text, watermark, cartoon, TikTok snap, circle wipe",
    grade: { brightness: 0.1, contrast: 1.08, saturation: 1.22 },
  },
};

/** Map template DYNAMIC → style cinéma */
export const TEMPLATE_CINEMA_STYLE: Record<string, CinemaStyleId> = {
  "dynamic-reel": "editorial",
  "dynamic-marina": "marina",
  "dynamic-warm": "warm",
};

export function getCinemaStyle(templateId: string): CinemaStyle {
  const id = TEMPLATE_CINEMA_STYLE[templateId] ?? "editorial";
  return CINEMA_STYLES[id];
}

export function cinemaFadeSeconds(
  templateId: string,
  photoCount = 8,
): number {
  const base = getCinemaStyle(templateId).fadeSeconds;
  const n = Math.max(1, Math.floor(photoCount));
  if (n <= 5) return Math.max(base, 0.22);
  if (n >= 10) return Math.min(base, 0.14);
  return base;
}

export function cinemaMotionPrompt(
  templateId: string,
  clipIndex: number,
  photoCount = 8,
  slotSec?: number,
): string {
  const style = getCinemaStyle(templateId);
  const shot = showreelShot(clipIndex, photoCount);
  return [
    VEO_FIDELITY_PROMPT,
    SHOWREEL_LOOK,
    styleMood(style.id),
    showreelTempo(photoCount, slotSec),
    `Camera: ${shot}`,
    NO_EXTRAS,
  ].join(" ");
}

/** Peu de photos / plans longs → fondus cinéma. Beaucoup de photos → coupes plus nettes. */
export function cinemaTransitions(
  templateId: string,
  junctionCount: number,
  photoCount = 8,
): string[] {
  const style = getCinemaStyle(templateId);
  const cinematic = [
    "distance",
    "fadeblack",
    "smoothleft",
    "distance",
    "smoothright",
  ] as const;
  const snappy = [
    "radial",
    "smoothleft",
    "distance",
    "smoothright",
    "radial",
  ] as const;
  const pool =
    photoCount <= 6
      ? cinematic
      : photoCount >= 10
        ? snappy
        : style.transitions;
  const out: string[] = [];
  for (let i = 0; i < junctionCount; i++) {
    out.push(pool[i % pool.length]);
  }
  return out;
}

export function cinemaNegative(templateId: string): string {
  const styleNeg = getCinemaStyle(templateId).negative;
  return `${styleNeg}, invented furniture, morphing, camera shake, handheld, people, text, watermark, dutch angle, smash zoom`;
}

export const CINEMA_FADE_SECONDS = 0.38;

type ClipTiming = { start: number; duration: number };

function clipTimelines(
  clipCount: number,
  clipSec: number,
  fadeSec: number,
  clipDurations?: number[],
): ClipTiming[] {
  const clips: ClipTiming[] = [];
  let cursor = 0;
  for (let i = 0; i < clipCount; i++) {
    const duration =
      clipDurations && clipDurations[i] != null
        ? Math.max(0.5, clipDurations[i])
        : clipSec;
    clips.push({ start: cursor, duration });
    cursor += duration - (i < clipCount - 1 ? fadeSec : 0);
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
  writing: WritingStyle,
  pad: number,
  look: "cinema" | "cinema-meta",
  startOverride?: number,
  durationOverride?: number,
  colorOverride?: string,
  paintOverride?: TextStyleLook,
): TextLayerEdit {
  const fadeSec =
    look === "cinema" ? CINEMA_TITLE_FADE_SEC : CINEMA_META_FADE_SEC;
  const start = startOverride ?? clip.start + pad;
  const duration =
    durationOverride ?? Math.max(1.8, clip.duration - pad - 0.28);
  const color = colorOverride ?? writing.textColor;
  const paint = paintOverride ?? lookForColor(color);
  return {
    content,
    fontId: writing.fontId,
    start,
    duration,
    x: 0.5,
    y,
    scale,
    color,
    stroke: paint.stroke,
    bg: paint.bg,
    bgAlpha: paint.bgAlpha,
    ...(writing.italic ? { italic: true } : {}),
    ...(writing.cinemaLook ? { look } : {}),
    fadeSec,
    enter: "fade" as const,
    exit: "fade" as const,
  };
}

function entryLook(
  key: PropertyFieldKey,
): "cinema" | "cinema-meta" {
  return key === "titleLine1" ? "cinema" : "cinema-meta";
}

function entryScale(key: PropertyFieldKey, titleScale: number): number {
  if (key === "titleLine1") return Math.min(1.42, titleScale);
  if (key === "highlight") return 1.15;
  if (key === "cta") return 1.08;
  return 1.05;
}

/**
 * Écriture selon le style choisi (typo + rythme) et l’ordre des champs.
 */
export function buildCinemaTextLayers(
  property: PropertyListing,
  clipCount: number,
  clipSec = 4,
  fadeSec?: number,
  templateId = "dynamic-reel",
  writingStyle?: WritingStyle | string | null,
  clipDurations?: number[],
): TextLayerEdit[] {
  if (!propertyHasContent(property) || clipCount < 1) return [];

  const cinema = getCinemaStyle(templateId);
  const fade = fadeSec ?? cinema.fadeSeconds;
  const clips = clipTimelines(clipCount, clipSec, fade, clipDurations);
  const layers: TextLayerEdit[] = [];
  const totalDur =
    clips[clips.length - 1].start + clips[clips.length - 1].duration;

  // writingStyle legacy ignoré si fieldStyles présents (toujours via property)
  void writingStyle;

  const entries = orderedPropertyEntries(property).map((e) => {
    const w = getWritingStyle(e.styleId);
    return {
      content: e.content,
      key: e.key,
      writing: w,
      color: e.color,
      paint: e.look,
      y: e.key === "cta" ? 0.86 : e.key === "titleLine1" ? 0.72 : 0.76,
      scale: entryScale(e.key, w.titleScale),
      look: entryLook(e.key),
    };
  });

  if (!entries.length) return [];

  // Timing par ligne (chaque champ peut avoir son rythme)
  entries.forEach((e, i) => {
    const w = e.writing;
    if (w.pacing === "simultaneous") {
      const first = clips[0];
      const pad = 0.55;
      const dur = Math.max(2.2, totalDur - pad - 0.35);
      const baseY = 0.62;
      layers.push(
        layer(
          e.content,
          first,
          baseY + i * 0.08,
          e.scale,
          w,
          pad,
          e.look,
          first.start + pad,
          dur,
          e.color,
          e.paint,
        ),
      );
      return;
    }

    if (w.pacing === "cascade") {
      const beat = Math.max(
        1.15,
        Math.min(2.0, totalDur / Math.max(3, entries.length)),
      );
      const gap = 0.16;
      const start = 0.35 + i * (beat * 0.55 + gap);
      if (start + 0.85 > totalDur) return;
      const dur = Math.min(beat + 0.5, totalDur - start - 0.1);
      layers.push(
        layer(
          e.content,
          clips[0],
          0.68 + (i % 3) * 0.06,
          e.scale,
          w,
          0,
          e.look,
          start,
          dur,
          e.color,
          e.paint,
        ),
      );
      return;
    }

    const idx = Math.min(i, clips.length - 1);
    const clip = clips[idx];
    const pad = clipCount === 1 ? 0.72 : 0.5;
    layers.push(
      layer(
        e.content,
        clip,
        e.y,
        e.scale,
        w,
        pad,
        e.look,
        undefined,
        undefined,
        e.color,
        e.paint,
      ),
    );
  });

  return layers;
}
