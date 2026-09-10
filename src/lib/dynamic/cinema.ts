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
  "Rock-steady gimbal only — never handheld. Tack-sharp focus end-to-end, no motion smear, no zoom blur. No text, no people, no watermark, no logos.";

/**
 * Réfs. exemples (visite prestige / villa / Haussmann) :
 * reveal d’entrée, push contrôlé, angle bas, contraste filmique, netteté.
 */
const EDITORIAL_LOOK =
  "Luxury vertical real-estate cinema reel, 9:16, prestige listing tour like a high-end agency showreel: strong filmic contrast, deep perspective, warm architectural LEDs when present, polished marble / wood / stone textures, confident but CONTROLLED camera energy — premium, not sleepy, not smear-blur.";

const PULSE_LOOK =
  "Ultra-snappy TikTok real-estate cinema, 9:16, crisp high contrast, photoreal, locked gimbal, VERY SHORT punchy moves, social-media energy, fast tempo.";

const MARINA_LOOK =
  "Bright lifestyle villa cinema, 9:16, blown-out high-key midday sun, airy photoreal, FLOATING Steadicam glide, sunny vacation prestige.";

const NOIR_LOOK =
  "Dark prestige real-estate cinema, 9:16, heavy low-key shadows, desaturated mood, photoreal, ALMOST FROZEN tripod, quiet drama, night-luxury stillness.";

const BOLD_LOOK =
  "Aggressive vertical real-estate cinema, 9:16, extreme high-contrast punch, photoreal, HARD locked moves toward architecture DETAIL, slam-impact energy.";

const WARM_LOOK =
  "Warm golden-hour real-estate cinema, 9:16, strong amber/orange light, soft photoreal, WIDE sweeping pans across the whole room, romantic soft prestige.";

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
    motions: [
      `${EDITORIAL_LOOK} Locked slider doorway / threshold REVEAL: smooth FORWARD PUSH into the deepest focal point (window, fireplace, skyline or far room), strong depth, constant controlled speed. ${NO_EXTRAS}`,
      `${EDITORIAL_LOOK} Slightly LOW-ANGLE locked forward GLIDE that sells architecture scale — ceiling lines, floor reflections, pool or facade when present. ${NO_EXTRAS}`,
      `${EDITORIAL_LOOK} Locked center-axis ADVANCE down a hallway / aisle / enfilade toward the hero view, museum-steady prestige reveal. ${NO_EXTRAS}`,
      `${EDITORIAL_LOOK} Locked assertive PUSH-IN toward the main architectural hero (island, staircase, fireplace, chandelier), then brief settle. ${NO_EXTRAS}`,
      `${EDITORIAL_LOOK} Locked lateral DRIFT with gentle forward bias, as if walking the room, leading lines alive, crisp parallax. ${NO_EXTRAS}`,
    ],
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
      `${PULSE_LOOK} Locked tripod SHORT energetic SMOOTH push-in then hard settle, snappy luxury, no shake. ${NO_EXTRAS}`,
      `${PULSE_LOOK} Locked tripod quick micro PUSH then SNAP settle, punchy social tempo, rock-steady. ${NO_EXTRAS}`,
      `${PULSE_LOOK} Locked slider crisp FORWARD RUSH, much faster than editorial, brief hold, no handheld. ${NO_EXTRAS}`,
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
      `${MARINA_LOOK} Locked floating FORWARD GLIDE at medium-confident speed, soft parallax, bright airy light, rock-steady. ${NO_EXTRAS}`,
      `${MARINA_LOOK} Locked gentle LATERAL DRIFT with sunny lifestyle mood, smooth constant speed, no shake. ${NO_EXTRAS}`,
      `${MARINA_LOOK} Locked floating reveal as if stepping into the space toward the view, high-key daylight, soft reflections. ${NO_EXTRAS}`,
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
      `${NOIR_LOOK} Locked tripod NEARLY STATIC then ultra-micro PUSH-IN, rock-steady, prestige stillness. ${NO_EXTRAS}`,
      `${NOIR_LOOK} Locked almost-still frame with tiny LATERAL micro-drift, heavy shadow mood, no shake. ${NO_EXTRAS}`,
      `${NOIR_LOOK} Locked glacial crawl FORWARD with minimal parallax then long hold, dramatic restraint. ${NO_EXTRAS}`,
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
      `${BOLD_LOOK} Locked assertive PUSH-IN toward a clear architectural DETAIL (molding, fixture, material), then hard settle. ${NO_EXTRAS}`,
      `${BOLD_LOOK} Locked fast-but-smooth FORWARD RUSH at constant speed, impactful reveal, no shake. ${NO_EXTRAS}`,
      `${BOLD_LOOK} Locked punchy micro ZOOM into texture or furniture focal point, snappy settle, rock-steady. ${NO_EXTRAS}`,
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
      `${WARM_LOOK} Locked confident FORWARD PUSH-IN in golden light toward the room’s warmest focal point, soft prestige. ${NO_EXTRAS}`,
      `${WARM_LOOK} Locked wide gentle LATERAL PAN across the FULL room width, soft constant speed, amber prestige. ${NO_EXTRAS}`,
      `${WARM_LOOK} Locked reveal glide as if entering the space at golden hour, romantic warm lifestyle cinema. ${NO_EXTRAS}`,
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

export function cinemaMotionPrompt(
  templateId: string,
  clipIndex: number,
  photoCount = 8,
): string {
  const style = getCinemaStyle(templateId);
  const motion = style.motions[clipIndex % style.motions.length];
  // Peu de photos = plans longs (~3 s) : accélérer l’énergie caméra
  // Beaucoup de photos = plans courts : rester contrôlé pour éviter le smear
  const n = Math.max(1, Math.floor(photoCount));
  const tempo =
    n <= 5
      ? "Tempo: FEW shots — make this clip MORE DYNAMIC: faster confident push / glide, punchy prestige energy, clear parallax, settle briefly at the end. Still tack-sharp, no smear."
      : n <= 8
        ? "Tempo: medium shot count — assertive but controlled camera energy."
        : "Tempo: many short shots — keep moves compact and controlled, no smear.";
  return `${VEO_FIDELITY_PROMPT} ${tempo} Camera: ${motion}`;
}

/** Transitions plus sèches quand peu de plans (évite le côté “mou”). */
export function cinemaTransitions(
  templateId: string,
  junctionCount: number,
  photoCount = 8,
): string[] {
  const style = getCinemaStyle(templateId);
  const snappy =
    photoCount <= 5
      ? (["distance", "radial", "smoothleft", "distance", "smoothright"] as const)
      : null;
  const pool = snappy ?? style.transitions;
  const out: string[] = [];
  for (let i = 0; i < junctionCount; i++) {
    out.push(pool[i % pool.length]);
  }
  return out;
}

export function cinemaNegative(templateId: string): string {
  const styleNeg = getCinemaStyle(templateId).negative;
  return `${styleNeg}, invented furniture, morphing, camera shake, handheld, people, text, watermark`;
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
