"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  WRITING_STYLES,
  getWritingStyle,
  type WritingStyleId,
} from "@/data/writing-styles";
import { Button } from "@/components/ui/Button";
import {
  TEXT_COLORS,
  colorsForFont,
  getFont,
  lookForColor,
  strokeCssColor,
  type TextStyleLook,
} from "@/lib/render/edit-options";
import {
  AREO_MEDIA_BUCKET,
  loadUploadSession,
} from "@/lib/storage";
import { saveWritingStyleId } from "@/lib/writing/session";
import {
  DEFAULT_FIELD_ORDER,
  EMPTY_PROPERTY,
  colorForField,
  loadPropertyListing,
  lookForField,
  primaryWritingStyleId,
  savePropertyListing,
  styleForField,
  type PropertyFieldKey,
  type PropertyListing,
} from "@/lib/dynamic/property";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/I18nProvider";

type TextStudioProps = {
  templateId: string;
};

const LOOK_PRESETS: {
  id: string;
  label: string;
  look: TextStyleLook;
}[] = [
  {
    id: "soft",
    label: "Doux",
    look: { stroke: "dark", bg: null, bgAlpha: 0 },
  },
  {
    id: "outline",
    label: "Contour",
    look: { stroke: "light", bg: null, bgAlpha: 0 },
  },
  {
    id: "banner",
    label: "Bandeau",
    look: { stroke: "none", bg: "#0A0A0C", bgAlpha: 0.55 },
  },
  {
    id: "gold",
    label: "Or",
    look: { stroke: "gold", bg: null, bgAlpha: 0 },
  },
];

function looksEqual(a: TextStyleLook, b: TextStyleLook): boolean {
  return (
    a.stroke === b.stroke &&
    (a.bg ?? null) === (b.bg ?? null) &&
    Math.abs((a.bgAlpha ?? 0) - (b.bgAlpha ?? 0)) < 0.02
  );
}

function paintCss(
  color: string,
  look: TextStyleLook,
  fontFamily: string,
  fontWeight: number,
  italic = false,
): CSSProperties {
  const stroke = strokeCssColor(look.stroke);
  const hasBg = Boolean(look.bg && look.bgAlpha > 0.02);
  return {
    fontFamily,
    color,
    fontWeight,
    fontStyle: italic ? "italic" : undefined,
    backgroundColor: hasBg
      ? `${look.bg}${Math.round(look.bgAlpha * 255)
          .toString(16)
          .padStart(2, "0")}`
      : undefined,
    WebkitTextStroke: stroke ? `1px ${stroke}` : undefined,
    paintOrder: "stroke fill",
    textShadow:
      !stroke && !hasBg
        ? undefined
        : look.stroke === "dark"
          ? "0 1px 2px rgba(0,0,0,0.45)"
          : look.stroke === "light"
            ? "0 1px 2px rgba(255,255,255,0.3)"
            : undefined,
  };
}

const FIELD_META: Record<
  PropertyFieldKey,
  { label: string; placeholder: string }
> = {
  titleLine1: {
    label: "Titre principal",
    placeholder: "Ex. Neuilly — 16ème",
  },
  specs: {
    label: "Caractéristiques",
    placeholder: "3 pièces, 85 m²",
  },
  highlight: {
    label: "Prix",
    placeholder: "890 000 €",
  },
  cta: {
    label: "Coordonnées",
    placeholder: "06 12 34 56 78",
  },
};

function FieldStylePicker({
  styleId,
  color,
  look,
  open,
  onToggle,
  onSelect,
  names,
}: {
  styleId: WritingStyleId;
  color: string;
  look: TextStyleLook;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: WritingStyleId) => void;
  names: Record<string, string>;
}) {
  const style = getWritingStyle(styleId);
  const font = getFont(style.fontId);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onToggle();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`Style ${names[styleId] ?? styleId}`}
        className={cn(
          "flex h-[42px] min-w-[4.25rem] flex-col items-center justify-center rounded-lg border px-1.5 transition-all",
          open
            ? "border-gold/55 bg-background"
            : "border-border bg-background hover:border-border-strong",
        )}
      >
        <span
          key={`${styleId}-${style.pacing}-${color}`}
          className={cn(
            "rounded-sm px-1 text-[15px] leading-none",
            style.pacing === "cascade" && "animate-fade-up",
          )}
          style={{
            ...paintCss(
              color,
              look,
              font.cssFamily,
              style.fontId === "anton" || style.fontId === "black" ? 900 : 600,
              style.italic === true,
            ),
            letterSpacing: style.cinemaLook ? "0.06em" : undefined,
          }}
        >
          Aa
        </span>
        <span className="mt-0.5 max-w-[3.6rem] truncate text-[9px] tracking-wide text-muted uppercase">
          {names[styleId] ?? styleId}
        </span>
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+6px)] right-0 z-40 max-h-[18rem] w-[12.5rem] overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          {WRITING_STYLES.map((s) => {
            const f = getFont(s.fontId);
            const active = s.id === styleId;
            const sampleLook = lookForColor(s.textColor);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelect(s.id);
                  onToggle();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                  active ? "bg-gold/15" : "hover:bg-background",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-[14px]",
                    s.pacing === "cascade" && "animate-fade-up",
                  )}
                  style={{
                    ...paintCss(
                      s.textColor,
                      sampleLook,
                      f.cssFamily,
                      s.fontId === "anton" || s.fontId === "black" ? 900 : 600,
                      s.italic === true,
                    ),
                    letterSpacing: s.cinemaLook ? "0.05em" : undefined,
                    background: sampleLook.bg
                      ? `${sampleLook.bg}${Math.round(sampleLook.bgAlpha * 255)
                          .toString(16)
                          .padStart(2, "0")}`
                      : "#0c0c0e",
                  }}
                >
                  Aa
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-pearl">
                    {names[s.id] ?? s.id}
                  </span>
                  <span className="block text-[10px] text-muted">
                    {s.italic
                      ? "Italique"
                      : s.pacing === "cascade"
                        ? "Cascade"
                        : s.pacing === "sequential"
                          ? "Séquentiel"
                          : "Ensemble"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FieldColorPicker({
  fontId,
  color,
  look,
  open,
  onToggle,
  onSelectColor,
  onSelectLook,
}: {
  fontId: string;
  color: string;
  look: TextStyleLook;
  open: boolean;
  onToggle: () => void;
  onSelectColor: (c: string, look: TextStyleLook) => void;
  onSelectLook: (look: TextStyleLook) => void;
}) {
  const colors = colorsForFont(fontId);
  const palette = [
    ...colors,
    ...TEXT_COLORS.filter(
      (c) => !colors.some((x) => x.toUpperCase() === c.toUpperCase()),
    ),
  ];
  const font = getFont(fontId);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onToggle();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label="Couleur et effet du texte"
        className={cn(
          "flex size-[42px] items-center justify-center rounded-lg border transition-all",
          open
            ? "border-gold/55 bg-background"
            : "border-border bg-background hover:border-border-strong",
        )}
      >
        <span
          className="flex size-7 items-center justify-center rounded-md border border-white/15 text-[11px] font-semibold leading-none"
          style={paintCss(color, look, font.cssFamily, 700)}
        >
          Aa
        </span>
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+6px)] right-0 z-40 w-[16.5rem] rounded-xl border border-border bg-surface p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <p className="mb-1.5 px-0.5 text-[10px] tracking-wide text-muted uppercase">
            Effet
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {LOOK_PRESETS.map((fx) => {
              const active = looksEqual(look, fx.look);
              return (
                <button
                  key={fx.id}
                  type="button"
                  onClick={() => onSelectLook(fx.look)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition-colors",
                    active
                      ? "border-gold/55 bg-gold/10"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <span
                    className="flex h-8 w-full items-center justify-center rounded-md text-[13px] font-semibold leading-none"
                    style={paintCss(color, fx.look, font.cssFamily, 700)}
                  >
                    Aa
                  </span>
                  <span className="text-[9px] tracking-wide text-muted uppercase">
                    {fx.label}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-2.5 mb-1.5 px-0.5 text-[10px] tracking-wide text-muted uppercase">
            Couleur
          </p>
          <div className="flex flex-wrap gap-1.5">
            {palette.map((c) => {
              const active = color.toUpperCase() === c.toUpperCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSelectColor(c, look)}
                  className={cn(
                    "size-8 shrink-0 rounded-full border touch-manipulation",
                    active
                      ? "border-gold ring-2 ring-gold/35"
                      : "border-white/20",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TextStudio({ templateId }: TextStudioProps) {
  const t = useT();
  const router = useRouter();
  const [listing, setListing] = useState<PropertyListing>(EMPTY_PROPERTY);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openStyleFor, setOpenStyleFor] = useState<PropertyFieldKey | null>(
    null,
  );
  const [openColorFor, setOpenColorFor] = useState<PropertyFieldKey | null>(
    null,
  );

  useEffect(() => {
    const upload = loadUploadSession();
    if (!upload || upload.templateId !== templateId || !upload.medias.length) {
      router.replace(`/creer/medias?template=${templateId}`);
      return;
    }

    const savedListing = loadPropertyListing();
    if (savedListing) setListing(savedListing);

    const first = upload.medias[0];
    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.storage
          .from(AREO_MEDIA_BUCKET)
          .createSignedUrl(first.path, 60 * 30);
        setPreviewUrl(data?.signedUrl ?? first.previewUrl ?? null);
      } catch {
        setPreviewUrl(first.previewUrl ?? null);
      }
      setReady(true);
    })();
  }, [templateId, router]);

  const order = listing.fieldOrder?.length
    ? listing.fieldOrder
    : DEFAULT_FIELD_ORDER;

  const previewLines = order
    .map((key) => ({
      key,
      text: listing[key]?.trim() ?? "",
      styleId: styleForField(listing, key),
      color: colorForField(listing, key),
      look: lookForField(listing, key),
    }))
    .filter((l) => l.text);

  const moveField = (index: number, dir: -1 | 1) => {
    const next = [...order];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setListing((prev) => ({ ...prev, fieldOrder: next }));
  };

  const updateField = (key: PropertyFieldKey, value: string) => {
    setListing((prev) => ({ ...prev, [key]: value }));
  };

  const updateFieldStyle = (key: PropertyFieldKey, styleId: WritingStyleId) => {
    const next = getWritingStyle(styleId);
    setListing((prev) => ({
      ...prev,
      fieldStyles: { ...prev.fieldStyles, [key]: styleId },
      fieldColors: { ...prev.fieldColors, [key]: next.textColor },
      fieldLooks: {
        ...prev.fieldLooks,
        [key]: lookForColor(next.textColor),
      },
    }));
  };

  const updateFieldColor = (
    key: PropertyFieldKey,
    color: string,
    look?: TextStyleLook,
  ) => {
    setListing((prev) => ({
      ...prev,
      fieldColors: { ...prev.fieldColors, [key]: color },
      fieldLooks: {
        ...prev.fieldLooks,
        [key]: look ?? lookForColor(color),
      },
    }));
  };

  const updateFieldLook = (key: PropertyFieldKey, look: TextStyleLook) => {
    setListing((prev) => ({
      ...prev,
      fieldLooks: { ...prev.fieldLooks, [key]: look },
    }));
  };

  const handleContinue = () => {
    if (!listing.titleLine1.trim() && !listing.highlight.trim()) {
      setError("Ajoute au moins un titre ou un prix.");
      return;
    }
    setError(null);
    const next = { ...listing, titleLine2: "" };
    saveWritingStyleId(primaryWritingStyleId(next));
    savePropertyListing(next);
    router.push(`/creer/generer?template=${templateId}`);
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted">
        {t.common.loading}
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="animate-fade-up px-5 pt-1 text-center sm:px-8">
        <h2 className="font-display text-3xl font-medium tracking-tight text-pearl sm:text-4xl">
          {t.writing.title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted">
          La taille et le rythme se gèrent dans la session d’après !
        </p>
      </div>

      <div className="mx-auto mt-5 flex w-full max-w-lg flex-col gap-5 px-5 sm:max-w-2xl sm:px-8 lg:max-w-5xl lg:flex-row lg:items-stretch lg:gap-6">
        {/* Aperçu : même hauteur que la colonne des cases (desktop) */}
        <div className="animate-fade-up mx-auto w-full max-w-[240px] shrink-0 lg:mx-0 lg:flex lg:w-[min(34%,280px)] lg:max-w-[280px] lg:self-stretch">
          <div className="relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-[1.6rem] border border-border bg-black shadow-[0_20px_50px_rgba(0,0,0,0.45)] lg:mx-0 lg:aspect-auto lg:h-full lg:min-h-[28rem]">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt=""
                fill
                unoptimized
                className="object-cover opacity-90"
                sizes="(min-width: 1024px) 280px, 240px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-[#1a1c22] to-[#0b0b0c]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end gap-2 px-4 pb-8 pt-20 text-center sm:gap-2.5 sm:pb-9">
              {previewLines.length ? (
                previewLines.map((line, i) => {
                  const w = getWritingStyle(line.styleId);
                  const f = getFont(w.fontId);
                  const isTitle = line.key === "titleLine1";
                  const paint = line.look;
                  const hasBg = Boolean(paint.bg && paint.bgAlpha > 0.02);
                  return (
                    <p
                      key={`${line.key}-${line.styleId}-${line.text}-${line.color}`}
                      className={cn(
                        "max-w-full break-words leading-snug",
                        hasBg && "px-2.5 py-1",
                        w.pacing === "cascade" && "animate-fade-up",
                        w.pacing === "cascade" && i === 1 && "animate-delay-1",
                        w.pacing === "cascade" && i === 2 && "animate-delay-2",
                        isTitle
                          ? "text-[1.35rem] sm:text-[1.45rem]"
                          : line.key === "highlight"
                            ? "text-[0.95rem] tracking-wide"
                            : "text-[0.8rem] tracking-wide opacity-90",
                      )}
                      style={{
                        ...paintCss(
                          line.color,
                          paint,
                          f.cssFamily,
                          isTitle && (w.fontId === "anton" || w.fontId === "black")
                            ? 900
                            : isTitle
                              ? 600
                              : 500,
                          w.italic === true,
                        ),
                        letterSpacing: w.cinemaLook ? "0.04em" : undefined,
                      }}
                    >
                      {line.text}
                    </p>
                  );
                })
              ) : (
                <p className="text-[0.85rem] text-pearl/40">Vos textes ici</p>
              )}
            </div>
          </div>
        </div>

        <div className="animate-fade-up animate-delay-1 flex min-w-0 flex-1 flex-col gap-3 lg:justify-between">
          {order.map((key, index) => {
            const meta = FIELD_META[key];
            const styleId = styleForField(listing, key);
            const fieldStyle = getWritingStyle(styleId);
            const fieldFont = getFont(fieldStyle.fontId);
            const fieldColor = colorForField(listing, key);
            const fieldLook = lookForField(listing, key);
            return (
              <div
                key={key}
                className="flex flex-1 items-start gap-2 rounded-xl border border-border bg-surface/60 p-2.5 lg:min-h-[5.75rem]"
              >
                <div className="flex flex-col gap-0.5 pt-1">
                  <button
                    type="button"
                    aria-label="Monter"
                    disabled={index === 0}
                    onClick={() => moveField(index, -1)}
                    className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-pearl disabled:opacity-25"
                  >
                    <ChevronUp className="size-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label="Descendre"
                    disabled={index === order.length - 1}
                    onClick={() => moveField(index, 1)}
                    className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-pearl disabled:opacity-25"
                  >
                    <ChevronDown className="size-4" strokeWidth={2} />
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center text-left">
                  <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
                    {meta.label}
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="relative flex min-w-0 flex-1 items-center">
                      <input
                        type="text"
                        value={listing[key]}
                        onChange={(e) => updateField(key, e.target.value)}
                        placeholder={meta.placeholder}
                        maxLength={80}
                        className="min-w-0 w-full rounded-lg border border-border bg-background py-2.5 pr-10 pl-3 text-[16px] outline-none transition-colors placeholder:text-muted/45 focus:border-gold/50"
                        style={{
                          fontFamily: fieldFont.cssFamily,
                          color: fieldColor,
                          fontStyle: fieldStyle.italic ? "italic" : undefined,
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Effacer le texte"
                        disabled={!listing[key]}
                        onClick={() => updateField(key, "")}
                        className="absolute right-1.5 z-10 flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-red-400 disabled:opacity-25"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                    <FieldStylePicker
                      styleId={styleId}
                      color={fieldColor}
                      look={fieldLook}
                      open={openStyleFor === key}
                      onToggle={() => {
                        setOpenColorFor(null);
                        setOpenStyleFor((cur) => (cur === key ? null : key));
                      }}
                      onSelect={(id) => updateFieldStyle(key, id)}
                      names={t.writing.names}
                    />
                    <FieldColorPicker
                      fontId={fieldStyle.fontId}
                      color={fieldColor}
                      look={fieldLook}
                      open={openColorFor === key}
                      onToggle={() => {
                        setOpenStyleFor(null);
                        setOpenColorFor((cur) => (cur === key ? null : key));
                      }}
                      onSelectColor={(c, L) => updateFieldColor(key, c, L)}
                      onSelectLook={(L) => updateFieldLook(key, L)}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {error ? (
            <p className="text-center text-[13px] text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 px-5 pt-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-lg justify-center gap-3 sm:max-w-2xl lg:max-w-5xl">
          <Button
            variant="ghost"
            onClick={() =>
              router.push(`/creer/medias?template=${templateId}`)
            }
          >
            {t.common.back}
          </Button>
          <Button
            fullWidth
            className="sm:w-auto sm:min-w-[220px]"
            variant="gold"
            showArrow
            onClick={handleContinue}
          >
            Générer
          </Button>
        </div>
      </div>
    </div>
  );
}
