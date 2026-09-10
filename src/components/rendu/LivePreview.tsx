"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  clampTextScale,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_SCALE,
  findClipAtTime,
  getFont,
  MAX_EDIT_TEXT,
  textLayerMotion,
  totalTimelineDuration,
  type TimelineClip,
  type TimelineTextLayer,
} from "@/lib/render/edit-options";
import { cn } from "@/lib/utils";

type LivePreviewProps = {
  clips: TimelineClip[];
  texts: TimelineTextLayer[];
  transitions: string[];
  currentTime: number;
  playing: boolean;
  compact: boolean;
  selectedTextId?: string | null;
  onTextSelect?: (id: string) => void;
  onTextPositionChange?: (id: string, x: number, y: number) => void;
  onTextContentChange?: (id: string, content: string) => void;
  onTextScaleChange?: (id: string, scale: number) => void;
  onTextDelete?: (id: string) => void;
  /** Avant un geste (déplacer / taille) — pour undo */
  onHistoryCheckpoint?: () => void;
  className?: string;
};

function MediaLayer({
  clip,
  localTime,
  opacity,
  videoRef,
  playing,
}: {
  clip: TimelineClip;
  localTime: number;
  opacity: number;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  playing: boolean;
}) {
  const zoom =
    clip.kind !== "video"
      ? 1 + 0.12 * Math.min(1, localTime / Math.max(0.01, clip.duration))
      : 1;

  useEffect(() => {
    const el = videoRef?.current;
    if (!el || clip.kind !== "video") return;
    const mediaTime = (clip.trimStart ?? 0) + localTime;
    if (Math.abs(el.currentTime - mediaTime) > 0.25) {
      try {
        el.currentTime = mediaTime;
      } catch {
        /* ignore */
      }
    }
    if (playing) void el.play().catch(() => undefined);
    else el.pause();
  }, [clip.id, clip.kind, clip.trimStart, localTime, playing, videoRef]);

  if (!clip.previewUrl) {
    return <div className="absolute inset-0 bg-surface" style={{ opacity }} />;
  }

  if (clip.kind === "video") {
    return (
      <video
        ref={videoRef}
        key={clip.id}
        src={clip.previewUrl}
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={clip.id}
      src={clip.previewUrl}
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
      style={{
        opacity,
        transform: `scale(${zoom})`,
        transformOrigin: "center center",
      }}
    />
  );
}

function textVisualStyle(layer: TimelineTextLayer): React.CSSProperties {
  const scale = layer.scale ?? DEFAULT_TEXT_SCALE;
  const color = layer.color ?? DEFAULT_TEXT_COLOR;
  const stroke = layer.stroke ?? "dark";
  const bg = layer.bg;
  const bgAlpha = layer.bgAlpha ?? 0;

  const softShadow =
    stroke === "none"
      ? layer.fontId === "playfair" || layer.fontId === "cinzel" || layer.fontId === "script"
        ? "0 1px 3px rgba(0,0,0,0.35), 0 4px 18px rgba(0,0,0,0.22)"
        : "0 1px 2px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.28)"
      : stroke === "light"
        ? "0 0 1px rgba(255,255,255,0.7), 0 2px 10px rgba(0,0,0,0.45)"
        : stroke === "gold"
          ? "0 0 1px rgba(196,165,116,0.85), 0 2px 10px rgba(0,0,0,0.5)"
          : layer.look === "cinema" || layer.look === "cinema-meta"
            ? "0 2px 0 rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.85)"
            : "0 1px 0 rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.8)";

  const isBanger = layer.fontId === "anton" || layer.fontId === "black";
  const isSoft =
    layer.fontId === "playfair" ||
    layer.fontId === "cinzel" ||
    layer.fontId === "script";
  const isCinema =
    layer.look === "cinema" || layer.look === "cinema-meta";

  return {
    fontFamily: getFont(layer.fontId).cssFamily,
    fontStyle: layer.italic ? ("italic" as const) : undefined,
    fontSize: `${Math.round((isBanger ? 16.5 : isCinema ? 16.2 : 15.5) * scale)}px`,
    fontWeight: isBanger || layer.fontId === "modern" ? 900 : isSoft ? 500 : 600,
    letterSpacing: isCinema
      ? layer.look === "cinema"
        ? "0.32em"
        : "0.18em"
      : isSoft
        ? layer.fontId === "cinzel"
          ? "0.22em"
          : "0.08em"
        : layer.fontId === "anton"
          ? "0.02em"
          : "0.03em",
    textTransform:
      isCinema || layer.fontId === "anton"
        ? ("uppercase" as const)
        : undefined,
    lineHeight: isBanger ? 1.05 : isCinema ? 1.2 : 1.15,
    color,
    textShadow: softShadow,
    backgroundColor:
      bg && bgAlpha > 0.02
        ? `${bg}${Math.round(bgAlpha * 255)
            .toString(16)
            .padStart(2, "0")}`
        : undefined,
    padding:
      bg && bgAlpha > 0.02
        ? `${Math.round((isBanger ? 5 : 4) * scale)}px ${Math.round((isBanger ? 12 : 10) * scale)}px`
        : undefined,
    borderRadius: bg && bgAlpha > 0.02 ? `${Math.round(isBanger ? 3 : 5) * scale}px` : undefined,
  };
}

function PreviewText({
  layer,
  selected,
  opacity,
  ty,
  pop,
  onSelect,
  onMove,
  onChange,
  onScale,
  onDelete,
  onHistoryCheckpoint,
}: {
  layer: TimelineTextLayer;
  selected: boolean;
  /** 0–1 fondu entrée/sortie (1 si édition hors plage) */
  opacity: number;
  ty: number;
  pop: number;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onChange?: (id: string, content: string) => void;
  onScale?: (id: string, scale: number) => void;
  onDelete?: (id: string) => void;
  onHistoryCheckpoint?: () => void;
}) {
  const editableRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = editableRef.current;
    if (!selected || !el) return;
    if (el.textContent !== layer.content) {
      el.textContent = layer.content || "";
    }
    const id = window.setTimeout(() => {
      el.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }, 30);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, layer.id]);

  const onBodyPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect?.(layer.id);
    if (!onMove) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    frameRef.current = (e.currentTarget as HTMLElement).closest(
      "[data-preview-frame]",
    ) as HTMLElement | null;

    const move = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
      if (!moved && dist < 6) return;
      if (!moved) onHistoryCheckpoint?.();
      moved = true;
      setDragging(true);
      editableRef.current?.blur();
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      onMove(layer.id, x, y);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragging(false);
      if (!moved && selected) editableRef.current?.focus();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /** Poignée diagonale (coin bas-droit) → taille */
  const onScalePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(layer.id);
    if (!onScale || !boxRef.current) return;
    onHistoryCheckpoint?.();

    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = layer.scale ?? DEFAULT_TEXT_SCALE;
    const box = boxRef.current.getBoundingClientRect();
    const startDiag = Math.hypot(box.width, box.height) || 80;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      // Distance depuis le centre du texte (approx via coin)
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const delta = (dx + dy) / 2;
      const next = clampTextScale(startScale * (1 + delta / startDiag));
      onScale(layer.id, next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Mouvement lié aux effets entrée / sortie choisis
  const visual = textVisualStyle(layer);

  return (
    <div
      ref={boxRef}
      className={cn(
        "absolute z-10 max-w-[88%]",
        selected ? "p-1" : "px-1.5 py-0.5",
        dragging && "opacity-90",
      )}
      style={{
        left: `${(layer.x ?? 0.5) * 100}%`,
        top: `${(layer.y ?? 0.82) * 100}%`,
        opacity,
        transform: `translate(-50%, calc(-50% + ${ty}px)) scale(${pop})`,
        willChange: "opacity, transform",
      }}
    >
      <div
        onPointerDown={onBodyPointerDown}
        className={cn(
          "relative text-center leading-snug",
          selected
            ? "cursor-grab touch-none rounded-sm ring-1 ring-gold/85 active:cursor-grabbing"
            : "cursor-pointer",
          dragging && "cursor-grabbing",
        )}
        style={visual}
      >
        <div className="flex items-center justify-center gap-1.5">
          {layer.icon === "whatsapp" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/brand/whatsapp.svg"
              alt=""
              className="pointer-events-none size-[1.1em] shrink-0"
              aria-hidden
            />
          ) : null}
          {layer.icon === "pin" || /^[\u{1F4CD}\u{1F4CC}]/u.test(layer.content) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/brand/pin.svg"
              alt=""
              className="pointer-events-none size-[0.95em] shrink-0"
              aria-hidden
            />
          ) : null}
          {selected ? (
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Éditer le texte"
              onInput={(e) => {
                const raw = e.currentTarget.textContent ?? "";
                const clipped = raw.slice(0, MAX_EDIT_TEXT);
                if (raw.length > MAX_EDIT_TEXT) {
                  e.currentTarget.textContent = clipped;
                }
                onChange?.(layer.id, clipped);
              }}
              onKeyDown={(e) => e.stopPropagation()}
              className="min-w-[2.5rem] whitespace-pre-line outline-none empty:before:content-['Votre_texte'] empty:before:opacity-45"
            />
          ) : (
            <p className="pointer-events-none whitespace-pre-line">
              {(layer.icon === "pin" ||
              /^[\u{1F4CD}\u{1F4CC}]/u.test(layer.content)
                ? layer.content.replace(/^[\u{1F4CD}\u{1F4CC}]\s*/u, "")
                : layer.content) || "Votre texte"}
            </p>
          )}
        </div>

        {selected ? (
          <button
            type="button"
            data-delete-handle
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete?.(layer.id);
            }}
            className="absolute bottom-0 left-0 z-20 flex size-6 -translate-x-full translate-y-full touch-manipulation items-center justify-center rounded-[3px] border border-gold/80 bg-background/90 text-pearl/90 hover:text-red-400"
            aria-label="Supprimer le texte"
          >
            <Trash2 className="size-3" strokeWidth={2.25} />
          </button>
        ) : null}

        {selected && layer.content.trim() ? (
          <span
            data-scale-handle
            onPointerDown={onScalePointerDown}
            className="absolute -right-2 -bottom-2 z-20 flex size-6 touch-none cursor-nwse-resize items-center justify-center"
            aria-label="Redimensionner"
          >
            <span className="pointer-events-none size-3 rounded-[2px] border border-gold/80 bg-background/90" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function LivePreview({
  clips,
  texts,
  transitions,
  currentTime,
  playing,
  compact,
  selectedTextId,
  onTextSelect,
  onTextPositionChange,
  onTextContentChange,
  onTextScaleChange,
  onTextDelete,
  onHistoryCheckpoint,
  className,
}: LivePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hit = findClipAtTime(clips, currentTime);
  const total = totalTimelineDuration(clips);

  const fade = 0.28;
  let primary = hit;
  let secondary: {
    index: number;
    clip: TimelineClip;
    localTime: number;
  } | null = null;
  let primaryOpacity = 1;
  let secondaryOpacity = 0;

  if (hit && clips.length > 1) {
    const local = hit.localTime;
    const dur = hit.clip.duration;
    const nearEnd = dur - local < fade && hit.index < clips.length - 1;

    if (nearEnd) {
      const t = (dur - local) / fade;
      primaryOpacity = Math.max(0, Math.min(1, t));
      secondaryOpacity = 1 - primaryOpacity;
      const next = clips[hit.index + 1];
      secondary = { index: hit.index + 1, clip: next, localTime: 0 };
    }
  }

  const visibleTexts = texts.filter((t) => {
    const end = t.start + t.duration;
    const inRange = currentTime >= t.start && currentTime < end;
    return inRange || t.id === selectedTextId;
  });

  const transitionHint =
    hit &&
    hit.index < clips.length - 1 &&
    hit.clip.duration - hit.localTime < 0.4
      ? transitions[hit.index]
      : null;

  return (
    <div
      data-preview-frame
      className={cn(
        "relative mx-auto overflow-hidden rounded-2xl border border-border bg-[#1a1a1c] transition-all duration-300",
        compact ? "aspect-[9/16] w-[42%]" : "aspect-[9/16] w-full max-w-[280px]",
        className,
      )}
    >
      {secondary ? (
        <MediaLayer
          clip={secondary.clip}
          localTime={secondary.localTime}
          opacity={secondaryOpacity}
          playing={false}
        />
      ) : null}

      {primary ? (
        <MediaLayer
          clip={primary.clip}
          localTime={primary.localTime}
          opacity={primaryOpacity}
          videoRef={videoRef}
          playing={playing}
        />
      ) : (
        <div className="absolute inset-0 bg-surface" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/5" />

      {visibleTexts.map((t) => {
        const selected = selectedTextId === t.id;
        const motion = textLayerMotion(t, currentTime);
        // Hors plage + sélectionné = édition : opaque ; sinon effets entrée/sortie
        const opacity = motion.opacity > 0 ? motion.opacity : selected ? 1 : 0;
        const ty = motion.opacity > 0 ? motion.ty : 0;
        const pop = motion.opacity > 0 ? motion.pop : 1;
        return (
          <PreviewText
            key={t.id}
            layer={t}
            selected={selected}
            opacity={opacity}
            ty={ty}
            pop={pop}
            onSelect={onTextSelect}
            onMove={onTextPositionChange}
            onChange={onTextContentChange}
            onScale={onTextScaleChange}
            onDelete={onTextDelete}
            onHistoryCheckpoint={onHistoryCheckpoint}
          />
        );
      })}

      {transitionHint ? (
        <span className="pointer-events-none absolute top-2 right-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] tracking-wide text-white/80 uppercase">
          {transitionHint}
        </span>
      ) : null}

      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] tabular-nums text-white/85">
        {currentTime.toFixed(1)}s / {total.toFixed(1)}s
      </div>
    </div>
  );
}
