/**
 * Modèle timeline type CapCut + polices éditeur.
 */

export const MIN_CLIP_SEC = 0.5;
export const MAX_CLIP_SEC = 60;
/** Durée max exportable (s) — au-delà, bouton grisé + alerte */
export const MAX_TIMELINE_EXPORT_SEC = 60;
export const MIN_TEXT_SEC = 0.4;
export const MAX_TEXT_SEC = 16;
export const MAX_EDIT_TEXT = 48;

export type TimelineClip = {
  id: string;
  path: string;
  name: string;
  kind: "image" | "video" | "other";
  size: number;
  previewUrl?: string;
  /** Durée affichée sur la timeline (s) */
  duration: number;
  /** Début dans le média source (s) — coupe / ciseaux */
  trimStart?: number;
};

export type TimelineTextLayer = {
  id: string;
  content: string;
  fontId: string;
  start: number;
  duration: number;
  /** Position relative sur l’image (0–1), centre du texte */
  x: number;
  y: number;
  /** Rangée timeline (0 = haut) — chevauchements */
  lane?: number;
  /** Échelle taille (1 = défaut) */
  scale?: number;
  /** Couleur de remplissage #RRGGBB */
  color?: string;
  /** Contour */
  stroke?: TextStroke;
  /** Fond #RRGGBB — null / absent = transparent */
  bg?: string | null;
  /** Opacité du fond 0–1 */
  bgAlpha?: number;
  /** Animation entrée/sortie (fade = défaut, glow = halo, write = bientôt) */
  anim?: "fade" | "glow" | "write";
  /** Icône optionnelle (ex. WhatsApp, pin lieu) */
  icon?: "whatsapp" | "pin";
};

export type TextStroke = "dark" | "light" | "gold" | "none";

export const MIN_TEXT_SCALE = 0.45;
export const MAX_TEXT_SCALE = 3.2;
export const DEFAULT_TEXT_SCALE = 1;
export const DEFAULT_TEXT_COLOR = "#FFFFFF";
export const DEFAULT_TEXT_STROKE: TextStroke = "dark";

/** Fondu entrée/sortie unique pour tous les textes (preview + export), ~discret */
export const TEXT_FADE_SECONDS = 0.28;

export function clampTextScale(s: number): number {
  return (
    Math.round(
      Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, s)) * 100,
    ) / 100
  );
}

/** Opacité 0–1 selon le playhead (fondu uniforme entrée/sortie). */
export function textLayerOpacity(
  layer: Pick<TimelineTextLayer, "start" | "duration">,
  currentTime: number,
): number {
  const start = layer.start;
  const end = start + Math.max(0.05, layer.duration);
  if (currentTime < start || currentTime >= end) return 0;
  const fade = Math.min(TEXT_FADE_SECONDS, (end - start) / 2);
  if (fade <= 0.001) return 1;
  const fadeIn = Math.min(1, (currentTime - start) / fade);
  const fadeOut = Math.min(1, (end - currentTime) / fade);
  return Math.min(fadeIn, fadeOut);
}

export function luminanceHex(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 1;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contour auto selon la couleur (suggestion) */
export function strokeForColor(color: string): TextStroke {
  return luminanceHex(color) > 0.55 ? "dark" : "light";
}

export function strokeCssColor(stroke: TextStroke): string | null {
  if (stroke === "dark") return "#0A0A0A";
  if (stroke === "light") return "#FFFFFF";
  if (stroke === "gold") return "#C4A574";
  return null;
}

export type EditorFont = {
  id: string;
  label: string;
  cssFamily: string;
  ffmpegPaths: string[];
  /** Look prédéfini (couleur + contour + fond) */
  defaultColor: string;
  stroke: TextStroke;
  bg: string | null;
  bgAlpha: number;
};

/** 11 polices — soft serif + banger sans inclus */
export const EDITOR_FONTS: EditorFont[] = [
  {
    id: "sans",
    label: "Sans",
    cssFamily: "var(--font-outfit), system-ui, sans-serif",
    ffmpegPaths: [
      "public/fonts/Arial-Bold.ttf",
      "public/fonts/SegoeUI-Bold.ttf",
      "C:/Windows/Fonts/arialbd.ttf",
      "C:/Windows/Fonts/segoeuib.ttf",
      "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    defaultColor: "#FFFFFF",
    stroke: "dark",
    bg: null,
    bgAlpha: 0,
  },
  {
    id: "modern",
    label: "Modern",
    cssFamily: "var(--font-montserrat), system-ui, sans-serif",
    ffmpegPaths: [
      "public/fonts/Montserrat-Black.ttf",
      "public/fonts/SegoeUI-Bold.ttf",
      "public/fonts/Arial-Bold.ttf",
      "C:/Windows/Fonts/segoeuib.ttf",
      "C:/Windows/Fonts/arialbd.ttf",
      "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    defaultColor: "#F7F3EB",
    stroke: "dark",
    bg: null,
    bgAlpha: 0,
  },
  {
    id: "anton",
    label: "Banger",
    cssFamily: "var(--font-anton), Impact, sans-serif",
    ffmpegPaths: [
      "public/fonts/Anton-Regular.ttf",
      "public/fonts/BebasNeue-Regular.ttf",
      "public/fonts/Montserrat-Black.ttf",
      "C:/Windows/Fonts/impact.ttf",
      "C:/Windows/Fonts/arialbd.ttf",
    ],
    defaultColor: "#FFFFFF",
    stroke: "none",
    bg: "#0A0A0A",
    bgAlpha: 0.72,
  },
  {
    id: "black",
    label: "Black",
    cssFamily: "var(--font-montserrat), system-ui, sans-serif",
    ffmpegPaths: [
      "public/fonts/Montserrat-Black.ttf",
      "public/fonts/Arial-Bold.ttf",
      "C:/Windows/Fonts/arialbd.ttf",
    ],
    defaultColor: "#0A0A0A",
    stroke: "none",
    bg: "#FFE566",
    bgAlpha: 0.95,
  },
  {
    id: "serif",
    label: "Éditorial",
    cssFamily: "var(--font-cormorant), Georgia, serif",
    ffmpegPaths: [
      "C:/Windows/Fonts/georgia.ttf",
      "C:/Windows/Fonts/times.ttf",
      "/System/Library/Fonts/Supplemental/Georgia.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ],
    defaultColor: "#F7F3EB",
    stroke: "dark",
    bg: "#0A0A0A",
    bgAlpha: 0.5,
  },
  {
    id: "playfair",
    label: "Luxe",
    cssFamily: "var(--font-playfair), Georgia, serif",
    ffmpegPaths: [
      "public/fonts/PlayfairDisplay-Variable.ttf",
      "public/fonts/Georgia-Bold.ttf",
      "C:/Windows/Fonts/georgiab.ttf",
      "/System/Library/Fonts/Supplemental/Georgia.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ],
    defaultColor: "#C4A574",
    stroke: "dark",
    bg: null,
    bgAlpha: 0,
  },
  {
    id: "lora",
    label: "Chaleureux",
    cssFamily: "var(--font-lora), Georgia, serif",
    ffmpegPaths: [
      "C:/Windows/Fonts/georgia.ttf",
      "/System/Library/Fonts/Supplemental/Georgia.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ],
    defaultColor: "#E8DFD0",
    stroke: "dark",
    bg: "#2A2A2C",
    bgAlpha: 0.55,
  },
  {
    id: "cinzel",
    label: "Prestige",
    cssFamily: "var(--font-cinzel), 'Times New Roman', serif",
    ffmpegPaths: [
      "public/fonts/Cinzel-Variable.ttf",
      "public/fonts/Georgia-Bold.ttf",
      "C:/Windows/Fonts/georgiab.ttf",
      "C:/Windows/Fonts/times.ttf",
      "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ],
    defaultColor: "#C4A574",
    stroke: "dark",
    bg: "#0A0A0A",
    bgAlpha: 0.45,
  },
  {
    id: "impact",
    label: "Accroche",
    cssFamily: "var(--font-anton), Impact, Haettenschweiler, sans-serif",
    ffmpegPaths: [
      "public/fonts/Anton-Regular.ttf",
      "public/fonts/BebasNeue-Regular.ttf",
      "C:/Windows/Fonts/impact.ttf",
      "C:/Windows/Fonts/arialbd.ttf",
      "/System/Library/Fonts/Supplemental/Impact.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    defaultColor: "#FFFFFF",
    stroke: "dark",
    bg: null,
    bgAlpha: 0,
  },
  {
    id: "narrow",
    label: "Condensé",
    cssFamily: '"Arial Narrow", "Helvetica Condensed", sans-serif',
    ffmpegPaths: [
      "C:/Windows/Fonts/arialn.ttf",
      "C:/Windows/Fonts/arial.ttf",
      "/System/Library/Fonts/Supplemental/Arial Narrow.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
    defaultColor: "#FFFFFF",
    stroke: "none",
    bg: "#0A0A0A",
    bgAlpha: 0.62,
  },
  {
    id: "script",
    label: "Signature",
    cssFamily: "var(--font-script), 'Segoe Script', cursive",
    ffmpegPaths: [
      "C:/Windows/Fonts/segoesc.ttf",
      "C:/Windows/Fonts/comic.ttf",
      "/System/Library/Fonts/Supplemental/Brush Script.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
    defaultColor: "#F7F3EB",
    stroke: "none",
    bg: null,
    bgAlpha: 0,
  },
];

export const TEXT_FONT_PRESETS = EDITOR_FONTS.map((f) => ({
  id: f.id,
  fontId: f.id,
  label: f.label,
}));

/** Palette master — luxe + un peu plus de contraste (~12) */
export const TEXT_COLORS = [
  "#FFFFFF", // blanc franc
  "#F7F3EB", // crème
  "#E8DFD0", // ivoire
  "#C4A574", // or soft
  "#D4A84B", // or soutenu
  "#FFE566", // highlight banger
  "#9A9184", // taupe
  "#2A2A2C", // anthracite
  "#0A0A0A", // noir
  "#1E3A2F", // forêt
  "#5C6B5E", // sauge
  "#7A3E3E", // bordeaux
  "#3D4F6F", // bleu nuit
] as const;

export type TextColor = (typeof TEXT_COLORS)[number];

export type TextStyleLook = {
  stroke: TextStroke;
  bg: string | null;
  bgAlpha: number;
};

const TEXT_COLOR_LOOKS: Record<string, TextStyleLook> = {
  "#FFFFFF": { stroke: "dark", bg: null, bgAlpha: 0 },
  "#F7F3EB": { stroke: "dark", bg: null, bgAlpha: 0 },
  "#E8DFD0": { stroke: "dark", bg: "#0A0A0A", bgAlpha: 0.45 },
  "#C4A574": { stroke: "dark", bg: null, bgAlpha: 0 },
  "#D4A84B": { stroke: "dark", bg: null, bgAlpha: 0 },
  "#FFE566": { stroke: "none", bg: "#0A0A0A", bgAlpha: 0.88 },
  "#9A9184": { stroke: "dark", bg: "#0A0A0A", bgAlpha: 0.55 },
  "#2A2A2C": { stroke: "light", bg: "#F7F3EB", bgAlpha: 0.88 },
  "#0A0A0A": { stroke: "light", bg: "#FFFFFF", bgAlpha: 0.9 },
  "#1E3A2F": { stroke: "light", bg: "#F7F3EB", bgAlpha: 0.82 },
  "#5C6B5E": { stroke: "light", bg: "#F7F3EB", bgAlpha: 0.8 },
  "#7A3E3E": { stroke: "light", bg: "#F7F3EB", bgAlpha: 0.85 },
  "#3D4F6F": { stroke: "light", bg: "#F7F3EB", bgAlpha: 0.84 },
};

/** Couleurs utiles par police — le reste est masqué */
const FONT_COLOR_ALLOW: Record<string, readonly string[]> = {
  sans: ["#FFFFFF", "#F7F3EB", "#C4A574", "#D4A84B", "#0A0A0A", "#2A2A2C"],
  modern: [
    "#FFFFFF",
    "#F7F3EB",
    "#E8DFD0",
    "#C4A574",
    "#0A0A0A",
    "#3D4F6F",
    "#5C6B5E",
  ],
  anton: ["#FFFFFF", "#FFE566", "#0A0A0A", "#F7F3EB", "#D4A84B"],
  black: ["#0A0A0A", "#FFFFFF", "#FFE566", "#F7F3EB"],
  serif: ["#F7F3EB", "#E8DFD0", "#C4A574", "#FFFFFF", "#9A9184", "#0A0A0A"],
  playfair: ["#C4A574", "#D4A84B", "#F7F3EB", "#FFFFFF", "#E8DFD0", "#0A0A0A"],
  lora: ["#E8DFD0", "#F7F3EB", "#C4A574", "#9A9184", "#7A3E3E", "#1E3A2F"],
  cinzel: ["#C4A574", "#D4A84B", "#F7F3EB", "#FFFFFF", "#0A0A0A", "#E8DFD0"],
  impact: ["#FFFFFF", "#FFE566", "#F7F3EB", "#D4A84B", "#0A0A0A", "#7A3E3E"],
  narrow: ["#FFFFFF", "#F7F3EB", "#C4A574", "#D4A84B", "#0A0A0A", "#2A2A2C"],
  script: ["#F7F3EB", "#E8DFD0", "#C4A574", "#D4A84B", "#FFFFFF", "#7A3E3E"],
};

export function lookForColor(color: string): TextStyleLook {
  return (
    TEXT_COLOR_LOOKS[color] ?? {
      stroke: strokeForColor(color),
      bg: null,
      bgAlpha: 0,
    }
  );
}

/** Couleurs proposées pour une police (ordre = TEXT_COLORS). */
export function colorsForFont(fontId: string): string[] {
  const allow = FONT_COLOR_ALLOW[fontId];
  if (!allow?.length) return [...TEXT_COLORS];
  const set = new Set(allow);
  return TEXT_COLORS.filter((c) => set.has(c));
}

export function styleFromFont(fontId: string): {
  fontId: string;
  color: string;
  stroke: TextStroke;
  bg: string | null;
  bgAlpha: number;
} {
  const f = getFont(fontId);
  return {
    fontId: f.id,
    color: f.defaultColor,
    stroke: f.stroke,
    bg: f.bg,
    bgAlpha: f.bgAlpha,
  };
}

export function getFont(fontId: string): EditorFont {
  return EDITOR_FONTS.find((f) => f.id === fontId) ?? EDITOR_FONTS[0];
}

/** Transitions distinctives (FFmpeg xfade) */
export const EDIT_TRANSITIONS: { id: string; label: string }[] = [
  { id: "fade", label: "Fondu" },
  { id: "fadeblack", label: "Noir" },
  { id: "fadewhite", label: "Blanc" },
  { id: "dissolve", label: "Dissolve" },
  { id: "wipeleft", label: "Wipe ←" },
  { id: "wiperight", label: "Wipe →" },
  { id: "smoothleft", label: "Glisse" },
  { id: "circleopen", label: "Cercle" },
];

export function clampClipDuration(sec: number): number {
  return Math.round(Math.min(MAX_CLIP_SEC, Math.max(MIN_CLIP_SEC, sec)) * 100) / 100;
}

export function clampTextDuration(sec: number): number {
  return Math.round(Math.min(MAX_TEXT_SEC, Math.max(MIN_TEXT_SEC, sec)) * 100) / 100;
}

export function sanitizeEditText(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_EDIT_TEXT);
}

export function totalTimelineDuration(clips: { duration: number }[]): number {
  return clips.reduce((s, c) => s + c.duration, 0);
}

export function clipStarts(clips: { duration: number }[]): number[] {
  const starts: number[] = [];
  let t = 0;
  for (const c of clips) {
    starts.push(t);
    t += c.duration;
  }
  return starts;
}

export function findClipAtTime(
  clips: TimelineClip[],
  time: number,
): { index: number; clip: TimelineClip; localTime: number; start: number } | null {
  if (!clips.length) return null;
  const starts = clipStarts(clips);
  const total = totalTimelineDuration(clips);
  const t = Math.max(0, Math.min(time, Math.max(0, total - 0.001)));

  for (let i = 0; i < clips.length; i++) {
    const start = starts[i];
    const end = start + clips[i].duration;
    if (t >= start && t < end) {
      return { index: i, clip: clips[i], localTime: t - start, start };
    }
  }
  const last = clips.length - 1;
  return {
    index: last,
    clip: clips[last],
    localTime: clips[last].duration,
    start: starts[last],
  };
}

export function formatTimecode(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Legacy + timeline CapCut */
export type DurationPresetId = "court" | "modele" | "long";

export type TextLayerEdit = {
  content: string;
  fontId: string;
  start: number;
  duration: number;
  /** 0–1 centre horizontal */
  x: number;
  /** 0–1 centre vertical */
  y: number;
  scale?: number;
  color?: string;
  stroke?: TextStroke;
  bg?: string | null;
  bgAlpha?: number;
  icon?: "whatsapp" | "pin";
};

export type RenderEditOptions = {
  durationPreset?: DurationPresetId;
  transition?: string;
  text?: string;
  disableTripleStrip?: boolean;
  /** Durées par média (ordre = medias[]) */
  clipDurations?: number[];
  /** Débuts source (s) pour coupe vidéo */
  clipTrimStarts?: number[];
  /** Transitions entre plans (n-1) */
  transitions?: string[];
  textLayers?: TextLayerEdit[];
};

export const DURATION_PRESETS: {
  id: DurationPresetId;
  label: string;
  hint: string;
  imageScale: number;
  videoScale: number;
  fadeScale: number;
}[] = [
  {
    id: "court",
    label: "Court",
    hint: "Plans rapides",
    imageScale: 0.65,
    videoScale: 0.7,
    fadeScale: 0.75,
  },
  {
    id: "modele",
    label: "Modèle",
    hint: "Signature du template",
    imageScale: 1,
    videoScale: 1,
    fadeScale: 1,
  },
  {
    id: "long",
    label: "Long",
    hint: "Plans posés",
    imageScale: 1.4,
    videoScale: 1.3,
    fadeScale: 1.15,
  },
];

export function getDurationPreset(id: DurationPresetId | undefined) {
  return (
    DURATION_PRESETS.find((p) => p.id === id) ??
    DURATION_PRESETS.find((p) => p.id === "modele")!
  );
}

function isTransitionId(id: unknown): id is string {
  return typeof id === "string" && EDIT_TRANSITIONS.some((t) => t.id === id);
}

export function normalizeEditOptions(
  raw: unknown,
): RenderEditOptions | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;

  const durationPreset =
    o.durationPreset === "court" ||
    o.durationPreset === "modele" ||
    o.durationPreset === "long"
      ? o.durationPreset
      : undefined;

  const transition = isTransitionId(o.transition) ? o.transition : undefined;

  const text = sanitizeEditText(
    typeof o.text === "string" ? o.text : undefined,
  );

  const disableTripleStrip = o.disableTripleStrip === true;

  const clipDurations = Array.isArray(o.clipDurations)
    ? o.clipDurations
        .map((d) => (typeof d === "number" ? clampClipDuration(d) : null))
        .filter((d): d is number => d != null)
    : undefined;

  const clipTrimStarts = Array.isArray(o.clipTrimStarts)
    ? o.clipTrimStarts.map((d) =>
        typeof d === "number" ? Math.max(0, Math.round(d * 100) / 100) : 0,
      )
    : undefined;

  const transitions = Array.isArray(o.transitions)
    ? o.transitions.map((t) => (isTransitionId(t) ? t : "fade"))
    : undefined;

  const textLayers = Array.isArray(o.textLayers)
    ? o.textLayers.flatMap((layer): TextLayerEdit[] => {
        if (!layer || typeof layer !== "object") return [];
        const L = layer as Record<string, unknown>;
        const content = sanitizeEditText(
          typeof L.content === "string" ? L.content : undefined,
        );
        if (!content) return [];
        const fontId =
          typeof L.fontId === "string" &&
          EDITOR_FONTS.some((f) => f.id === L.fontId)
            ? L.fontId
            : "sans";
        const start =
          typeof L.start === "number" ? Math.max(0, L.start) : 0;
        const duration =
          typeof L.duration === "number"
            ? clampTextDuration(L.duration)
            : 2.5;
        const x =
          typeof L.x === "number" ? Math.min(1, Math.max(0, L.x)) : 0.5;
        const y =
          typeof L.y === "number" ? Math.min(1, Math.max(0, L.y)) : 0.82;
        const scale =
          typeof L.scale === "number" ? clampTextScale(L.scale) : 1;
        const color =
          typeof L.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(L.color)
            ? L.color
            : DEFAULT_TEXT_COLOR;
        const stroke: TextStroke =
          L.stroke === "dark" ||
          L.stroke === "light" ||
          L.stroke === "none" ||
          L.stroke === "gold"
            ? L.stroke
            : strokeForColor(color);
        const bg =
          typeof L.bg === "string" && /^#[0-9A-Fa-f]{6}$/.test(L.bg)
            ? L.bg
            : null;
        const bgAlpha =
          typeof L.bgAlpha === "number"
            ? Math.min(1, Math.max(0, L.bgAlpha))
            : bg
              ? 0.6
              : 0;
        const icon =
          L.icon === "whatsapp" || L.icon === "pin" ? L.icon : undefined;
        const row: TextLayerEdit = {
          content,
          fontId,
          start,
          duration,
          x,
          y,
          scale,
          color,
          stroke,
          bg,
          bgAlpha,
        };
        if (icon) row.icon = icon;
        return [row];
      })
    : undefined;

  if (
    !durationPreset &&
    !transition &&
    !text &&
    !disableTripleStrip &&
    !clipDurations?.length &&
    !clipTrimStarts?.length &&
    !transitions?.length &&
    !textLayers?.length
  ) {
    return undefined;
  }

  return {
    ...(durationPreset ? { durationPreset } : {}),
    ...(transition ? { transition } : {}),
    ...(text ? { text } : {}),
    ...(disableTripleStrip ? { disableTripleStrip: true } : {}),
    ...(clipDurations?.length ? { clipDurations } : {}),
    ...(clipTrimStarts?.length ? { clipTrimStarts } : {}),
    ...(transitions?.length ? { transitions } : {}),
    ...(textLayers?.length ? { textLayers } : {}),
  };
}
