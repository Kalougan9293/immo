/** Infos bien — champs + ordre + style d’écriture par ligne. */

import {
  getWritingStyle,
  type WritingStyleId,
  WRITING_STYLES,
} from "@/data/writing-styles";
import {
  lookForColor,
  type TextStyleLook,
  type TextStroke,
} from "@/lib/render/edit-options";

export type PropertyFieldKey =
  | "titleLine1"
  | "specs"
  | "highlight"
  | "cta";

export const PROPERTY_FIELD_KEYS: PropertyFieldKey[] = [
  "titleLine1",
  "specs",
  "highlight",
  "cta",
];

export const DEFAULT_FIELD_ORDER: PropertyFieldKey[] = [
  "titleLine1",
  "specs",
  "highlight",
  "cta",
];

export const DEFAULT_FIELD_STYLE: WritingStyleId = "editorial";

export type PropertyListing = {
  /** Titre principal — ex. localité */
  titleLine1: string;
  /** @deprecated conservé pour sessions anciennes */
  titleLine2: string;
  /** Caractéristiques — ex. "3 pièces, 85m²" */
  specs: string;
  /** Prix */
  highlight: string;
  /** Coordonnées / contact */
  cta: string;
  /** Ordre d’apparition (prix en premier, etc.) */
  fieldOrder: PropertyFieldKey[];
  /** Style d’écriture par champ */
  fieldStyles: Record<PropertyFieldKey, WritingStyleId>;
  /** Couleur texte par champ (#hex) */
  fieldColors: Record<PropertyFieldKey, string>;
  /** Contour / bandeau par champ */
  fieldLooks: Record<PropertyFieldKey, TextStyleLook>;
};

export const PROPERTY_SESSION_KEY = "areo-property-listing";

export function defaultFieldStyles(
  fallback: WritingStyleId = DEFAULT_FIELD_STYLE,
): Record<PropertyFieldKey, WritingStyleId> {
  return {
    titleLine1: fallback,
    specs: fallback,
    highlight: fallback,
    cta: fallback,
  };
}

export function defaultFieldColors(
  fallback = "#F7F3EB",
): Record<PropertyFieldKey, string> {
  return {
    titleLine1: fallback,
    specs: fallback,
    highlight: fallback,
    cta: fallback,
  };
}

export function defaultFieldLooks(
  colors: Record<PropertyFieldKey, string> = defaultFieldColors(),
): Record<PropertyFieldKey, TextStyleLook> {
  return {
    titleLine1: { ...lookForColor(colors.titleLine1) },
    specs: { ...lookForColor(colors.specs) },
    highlight: { ...lookForColor(colors.highlight) },
    cta: { ...lookForColor(colors.cta) },
  };
}

export const EMPTY_PROPERTY: PropertyListing = {
  titleLine1: "",
  titleLine2: "",
  specs: "",
  highlight: "",
  cta: "",
  fieldOrder: [...DEFAULT_FIELD_ORDER],
  fieldStyles: defaultFieldStyles(),
  fieldColors: defaultFieldColors(),
  fieldLooks: defaultFieldLooks(),
};

function normalizeFieldOrder(raw: unknown): PropertyFieldKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_FIELD_ORDER];
  const seen = new Set<PropertyFieldKey>();
  const out: PropertyFieldKey[] = [];
  for (const item of raw) {
    if (
      (item === "titleLine1" ||
        item === "specs" ||
        item === "highlight" ||
        item === "cta") &&
      !seen.has(item)
    ) {
      seen.add(item);
      out.push(item);
    }
  }
  for (const k of DEFAULT_FIELD_ORDER) {
    if (!seen.has(k)) out.push(k);
  }
  return out;
}

function isWritingStyleId(v: unknown): v is WritingStyleId {
  return (
    typeof v === "string" && WRITING_STYLES.some((s) => s.id === v)
  );
}

function normalizeFieldStyles(raw: unknown): Record<PropertyFieldKey, WritingStyleId> {
  const base = defaultFieldStyles();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const key of PROPERTY_FIELD_KEYS) {
    if (isWritingStyleId(o[key])) base[key] = o[key];
  }
  return base;
}

function normalizeFieldColors(raw: unknown): Record<PropertyFieldKey, string> {
  const base = defaultFieldColors();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const key of PROPERTY_FIELD_KEYS) {
    const v = o[key];
    if (typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v)) {
      base[key] = `#${v.slice(1).toUpperCase()}`;
    }
  }
  return base;
}

function isTextStroke(v: unknown): v is TextStroke {
  return v === "dark" || v === "light" || v === "gold" || v === "none";
}

function normalizeLook(raw: unknown, fallbackColor: string): TextStyleLook {
  const fallback = lookForColor(fallbackColor);
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  const bg =
    o.bg === null
      ? null
      : typeof o.bg === "string" && /^#[0-9A-Fa-f]{6}$/.test(o.bg)
        ? `#${o.bg.slice(1).toUpperCase()}`
        : fallback.bg;
  const bgAlpha =
    typeof o.bgAlpha === "number"
      ? Math.min(1, Math.max(0, o.bgAlpha))
      : fallback.bgAlpha;
  return {
    stroke: isTextStroke(o.stroke) ? o.stroke : fallback.stroke,
    bg,
    bgAlpha,
  };
}

function normalizeFieldLooks(
  raw: unknown,
  colors: Record<PropertyFieldKey, string>,
): Record<PropertyFieldKey, TextStyleLook> {
  const base = defaultFieldLooks(colors);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const key of PROPERTY_FIELD_KEYS) {
    base[key] = normalizeLook(o[key], colors[key]);
  }
  return base;
}

export function normalizeProperty(raw: unknown): PropertyListing {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const s = (k: string) =>
    typeof o[k] === "string" ? (o[k] as string).trim().slice(0, 80) : "";
  const fieldColors = normalizeFieldColors(o.fieldColors);
  return {
    titleLine1: s("titleLine1"),
    titleLine2: s("titleLine2"),
    specs: s("specs"),
    highlight: s("highlight"),
    cta: s("cta"),
    fieldOrder: normalizeFieldOrder(o.fieldOrder),
    fieldStyles: normalizeFieldStyles(o.fieldStyles),
    fieldColors,
    fieldLooks: normalizeFieldLooks(o.fieldLooks, fieldColors),
  };
}

export function propertyHasContent(p: PropertyListing): boolean {
  return Boolean(p.titleLine1 || p.specs || p.highlight || p.cta || p.titleLine2);
}

export function styleForField(
  property: PropertyListing,
  key: PropertyFieldKey,
): WritingStyleId {
  return property.fieldStyles?.[key] ?? DEFAULT_FIELD_STYLE;
}

export function colorForField(
  property: PropertyListing,
  key: PropertyFieldKey,
): string {
  return (
    property.fieldColors?.[key] ??
    getWritingStyle(styleForField(property, key)).textColor
  );
}

export function lookForField(
  property: PropertyListing,
  key: PropertyFieldKey,
): TextStyleLook {
  return (
    property.fieldLooks?.[key] ?? lookForColor(colorForField(property, key))
  );
}

export function orderedPropertyEntries(
  property: PropertyListing,
): {
  key: PropertyFieldKey;
  content: string;
  styleId: WritingStyleId;
  color: string;
  look: TextStyleLook;
}[] {
  const order = property.fieldOrder?.length
    ? property.fieldOrder
    : DEFAULT_FIELD_ORDER;
  const values: Record<PropertyFieldKey, string> = {
    titleLine1: property.titleLine1,
    specs: property.specs,
    highlight: property.highlight,
    cta: property.cta,
  };
  if (property.titleLine2?.trim()) {
    values.titleLine1 = [values.titleLine1, property.titleLine2.trim()]
      .filter(Boolean)
      .join(" · ");
  }
  return order
    .map((key) => ({
      key,
      content: values[key]?.trim() ?? "",
      styleId: styleForField(property, key),
      color: colorForField(property, key),
      look: lookForField(property, key),
    }))
    .filter((e) => e.content);
}

/** Style majoritaire — compat edits.writingStyleId */
export function primaryWritingStyleId(
  property: PropertyListing,
): WritingStyleId {
  const counts = new Map<WritingStyleId, number>();
  for (const key of PROPERTY_FIELD_KEYS) {
    const id = styleForField(property, key);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: WritingStyleId = DEFAULT_FIELD_STYLE;
  let n = 0;
  for (const [id, c] of counts) {
    if (c > n) {
      best = id;
      n = c;
    }
  }
  return getWritingStyle(best).id;
}

export function savePropertyListing(listing: PropertyListing) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    PROPERTY_SESSION_KEY,
    JSON.stringify(normalizeProperty(listing)),
  );
}

export function loadPropertyListing(): PropertyListing | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PROPERTY_SESSION_KEY);
  if (!raw) return null;
  try {
    return normalizeProperty(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearPropertyListing() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PROPERTY_SESSION_KEY);
}
