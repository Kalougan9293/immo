"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Pause,
  Play,
  Plus,
  Scissors,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { LivePreview } from "@/components/rendu/LivePreview";
import { ClipFilmstrip } from "@/components/rendu/ClipFilmstrip";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/I18nProvider";
import {
  clampClipDuration,
  clampTextDuration,
  clampTextScale,
  clipStarts,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_SCALE,
  DEFAULT_TEXT_STROKE,
  EDIT_TRANSITIONS,
  EDITOR_FONTS,
  findClipAtTime,
  formatTimecode,
  getFont,
  lookForColor,
  colorsForFont,
  MAX_EDIT_TEXT,
  MAX_TIMELINE_EXPORT_SEC,
  MIN_CLIP_SEC,
  newId,
  strokeCssColor,
  styleFromFont,
  totalTimelineDuration,
  type TimelineClip,
  type TimelineTextLayer,
} from "@/lib/render/edit-options";

const TRACK_H = 56;
const TEXT_ROW_H = 34;
/** Jamais d’espace vide entre rangées texte */
const TEXT_ROW_GAP = 0;
const MIN_CLIP_PX = 36;
const LONG_PRESS_MS = 280;
const PAD = 8;
/** Largeur des slots « + » intro / signature / couverture sur la piste vidéo */
const END_CAP_W = 48;
const MAX_TEXT_LANES = 6;

/**
 * Lignes timeline : packing serré depuis le haut (jamais de rangée vide).
 * Aucun chevauchement temporel sur une même rangée.
 * `pinned` = texte en cours de drag (conserve sa rangée le temps du geste).
 */
function rangesOverlap(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): boolean {
  return a0 < b1 - 0.001 && b0 < a1 - 0.001;
}

function resolveTextLanes(
  layers: TimelineTextLayer[],
  pinned?: { id: string; lane: number } | null,
): Map<string, number> {
  const placed: { id: string; start: number; end: number; lane: number }[] =
    [];
  const lanes = new Map<string, number>();

  const laneFree = (lane: number, start: number, end: number) =>
    placed.every(
      (p) =>
        p.lane !== lane || !rangesOverlap(start, end, p.start, p.end),
    );

  const place = (t: TimelineTextLayer, lane: number) => {
    const start = t.start;
    const end = t.start + Math.max(0.05, t.duration);
    const L = Math.max(0, Math.min(MAX_TEXT_LANES - 1, Math.round(lane)));
    placed.push({ id: t.id, start, end, lane: L });
    lanes.set(t.id, L);
  };

  if (pinned) {
    const pinLayer = layers.find((t) => t.id === pinned.id);
    if (pinLayer) place(pinLayer, pinned.lane);
  }

  const sorted = [...layers]
    .filter((t) => t.id !== pinned?.id)
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));

  for (const t of sorted) {
    const start = t.start;
    const end = t.start + Math.max(0.05, t.duration);
    let lane = 0;
    for (let L = 0; L < MAX_TEXT_LANES; L++) {
      if (laneFree(L, start, end)) {
        lane = L;
        break;
      }
      lane = Math.min(MAX_TEXT_LANES - 1, L);
    }
    place(t, lane);
  }
  return lanes;
}

function clipWidth(duration: number, pps: number) {
  return Math.max(MIN_CLIP_PX, duration * pps);
}

/** Timeline continue (clips collés) — style CapCut */
function timeToX(time: number, pps: number) {
  return time * pps;
}

function xToTime(x: number, pps: number) {
  return Math.max(0, x / pps);
}

function indexFromX(x: number, clips: TimelineClip[], pps: number): number {
  let acc = 0;
  let target = 0;
  for (let i = 0; i < clips.length; i++) {
    const w = clipWidth(clips[i].duration, pps);
    if (x < acc + w / 2) {
      target = i;
      break;
    }
    acc += w;
    target = i;
  }
  return target;
}

type GhostState =
  | {
      kind: "clip";
      id: string;
      previewUrl?: string;
      label: string;
      clientX: number;
      clientY: number;
      dropIndex: number;
    }
  | {
      kind: "text";
      id: string;
      label: string;
      clientX: number;
      clientY: number;
      width: number;
    };

type CapCutEditorProps = {
  clips: TimelineClip[];
  onClipsChange: (clips: TimelineClip[]) => void;
  transitions: string[];
  onTransitionsChange: (t: string[]) => void;
  texts: TimelineTextLayer[];
  onTextsChange: (t: TimelineTextLayer[]) => void;
  defaultTransition: string;
  disabled?: boolean;
  exporting?: boolean;
  onExport: () => void;
  /** Si fourni : bouton actif quand le montage est à jour (ex. aller au téléchargement). */
  onContinue?: () => void;
  /** Slots « + » avant / après la piste vidéo (intro / signature agent). */
  onAddBefore?: () => void;
  onAddAfter?: () => void;
  /** Vignette couverture (poster) à gauche de la timeline. */
  coverUrl?: string | null;
  onCoverPress?: () => void;
  coverBusy?: boolean;
  dirty: boolean;
  hasExport?: boolean;
};

export function CapCutEditor({
  clips,
  onClipsChange,
  transitions,
  onTransitionsChange,
  texts,
  onTextsChange,
  defaultTransition,
  disabled,
  exporting,
  onExport,
  onContinue,
  onAddBefore,
  onAddAfter,
  coverUrl = null,
  onCoverPress,
  coverBusy = false,
  dirty,
  hasExport = false,
}: CapCutEditorProps) {
  const t = useT();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textsRef = useRef(texts);
  textsRef.current = texts;
  const [compact, setCompact] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [pps, setPps] = useState(40);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [gapIndex, setGapIndex] = useState<number | null>(null);
  const [ghost, setGhost] = useState<GhostState | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const transitionPreviewUntil = useRef<number | null>(null);
  const historyRef = useRef<
    { clips: TimelineClip[]; transitions: string[]; texts: TimelineTextLayer[] }[]
  >([]);
  const contentHistId = useRef<string | null>(null);

  const total = totalTimelineDuration(clips);
  const starts = clipStarts(clips);
  const overLimit = total > MAX_TIMELINE_EXPORT_SEC;
  const selectedText = texts.find((t) => t.id === selectedTextId) ?? null;
  const hitAtPlayhead = findClipAtTime(clips, currentTime);
  const canSplit =
    Boolean(hitAtPlayhead) &&
    hitAtPlayhead!.clip.kind === "video" &&
    hitAtPlayhead!.localTime >= MIN_CLIP_SEC &&
    hitAtPlayhead!.clip.duration - hitAtPlayhead!.localTime >= MIN_CLIP_SEC;

  const pushHistory = useCallback(() => {
    historyRef.current.push({
      clips: clips.map((c) => ({ ...c })),
      transitions: [...transitions],
      texts: texts.map((t) => ({ ...t })),
    });
    if (historyRef.current.length > 40) historyRef.current.shift();
    setCanUndo(true);
  }, [clips, transitions, texts]);

  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) {
      setCanUndo(false);
      return;
    }
    onClipsChange(prev.clips);
    onTransitionsChange(prev.transitions);
    onTextsChange(prev.texts);
    setCanUndo(historyRef.current.length > 0);
    setGapIndex(null);
    setPlaying(false);
  };

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || total <= 0) return;
    const fit = () => {
      const usable = Math.max(200, el.clientWidth - 24);
      setPps(Math.min(80, Math.max(22, usable / Math.max(total, 8))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [total, clips.length]);

  useEffect(() => {
    if (!playing || total <= 0) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setCurrentTime((t) => {
        const next = t + dt;
        const stopAt = transitionPreviewUntil.current;
        if (stopAt != null && next >= stopAt) {
          transitionPreviewUntil.current = null;
          setPlaying(false);
          return Math.min(stopAt, total);
        }
        if (next >= total) {
          setPlaying(false);
          return total;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  /** Place le curseur avant la jointure et lit ~1 s pour voir la transition */
  const previewTransitionAt = useCallback(
    (gapIdx: number) => {
      if (gapIdx < 0 || gapIdx >= clips.length - 1) return;
      const seam = starts[gapIdx + 1];
      if (seam == null) return;
      const from = Math.max(0, seam - 0.45);
      const until = Math.min(total, seam + 0.55);
      transitionPreviewUntil.current = until;
      setCurrentTime(from);
      setPlaying(true);
    },
    [clips.length, starts, total],
  );

  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const coverPadX = onCoverPress ? END_CAP_W + 6 : 0;
  const beforePadX = onAddBefore ? END_CAP_W + 6 : 0;
  const trackOriginX = coverPadX + beforePadX;

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const track = el.querySelector(
        "[data-timeline-track]",
      ) as HTMLElement | null;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const x = clientX - rect.left + el.scrollLeft - PAD - trackOriginX;
      setCurrentTime(Math.max(0, Math.min(total, xToTime(x, pps))));
    },
    [pps, total, trackOriginX],
  );

  const moveClip = (from: number, to: number) => {
    if (to < 0 || to >= clips.length || from === to) return;
    pushHistory();
    const next = [...clips];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onClipsChange(next);
    onTransitionsChange(
      next.slice(0, -1).map((_, i) => transitions[i] || defaultTransition),
    );
  };

  const updateClipDuration = (id: string, duration: number) => {
    onClipsChange(
      clips.map((c) =>
        c.id === id ? { ...c, duration: clampClipDuration(duration) } : c,
      ),
    );
  };

  const removeClip = (id: string) => {
    if (disabled || clips.length <= 1) return;
    const index = clips.findIndex((c) => c.id === id);
    if (index < 0) return;
    pushHistory();
    const next = clips.filter((c) => c.id !== id);
    const nextTrans = [...transitions];
    if (index < nextTrans.length) nextTrans.splice(index, 1);
    else if (nextTrans.length) nextTrans.pop();
    onClipsChange(next);
    onTransitionsChange(
      next.slice(0, -1).map((_, j) => nextTrans[j] || defaultTransition),
    );
    setSelectedClipId(null);
    setGapIndex(null);
    const newTotal = totalTimelineDuration(next);
    setCurrentTime((t) => Math.min(t, Math.max(0, newTotal - 0.01)));
    setPlaying(false);
  };

  const updateText = (id: string, patch: Partial<TimelineTextLayer>) => {
    const base = textsRef.current;
    const nextList = base.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch };
      if (patch.content != null) {
        next.content = patch.content.slice(0, MAX_EDIT_TEXT);
      }
      if (patch.duration != null) {
        next.duration = clampTextDuration(patch.duration);
      }
      if (patch.start != null) {
        next.start = Math.max(0, Math.min(Math.max(0, total - 0.2), patch.start));
      }
      if (patch.x != null) next.x = Math.min(1, Math.max(0, patch.x));
      if (patch.y != null) next.y = Math.min(1, Math.max(0, patch.y));
      if (patch.lane != null) {
        next.lane = Math.max(
          0,
          Math.min(MAX_TEXT_LANES - 1, Math.round(patch.lane)),
        );
      }
      if (patch.scale != null) next.scale = clampTextScale(patch.scale);
      if (patch.color != null) next.color = patch.color;
      if (patch.stroke != null) next.stroke = patch.stroke;
      if ("bg" in patch) next.bg = patch.bg ?? null;
      if (patch.bgAlpha != null) next.bgAlpha = patch.bgAlpha;
      return next;
    });
    textsRef.current = nextList;
    onTextsChange(nextList);
  };

  const addText = () => {
    if (!clips.length) return;
    pushHistory();

    // 1er texte → 0s ; suivants → juste à droite du dernier
    const start = texts.length
      ? Math.max(...texts.map((t) => t.start + t.duration))
      : 0;

    const fontStyle = styleFromFont("playfair");
    const layer: TimelineTextLayer = {
      id: newId("txt"),
      content: "Votre texte",
      fontId: fontStyle.fontId,
      start,
      duration: clampTextDuration(2.5),
      x: 0.5,
      y: 0.78,
      lane: 0,
      scale: DEFAULT_TEXT_SCALE,
      color: fontStyle.color,
      stroke: fontStyle.stroke,
      bg: fontStyle.bg,
      bgAlpha: fontStyle.bgAlpha,
    };
    const nextTexts = [...textsRef.current, layer];
    textsRef.current = nextTexts;
    onTextsChange(nextTexts);
    setSelectedTextId(layer.id);
    setSelectedClipId(null);
    setGapIndex(null);
    setStyleOpen(false);
    setPlaying(false);
    setCurrentTime(start);
  };

  const splitAtPlayhead = () => {
    if (!canSplit || !hitAtPlayhead || disabled) return;
    pushHistory();
    const { index, clip, localTime } = hitAtPlayhead;
    const leftDur = clampClipDuration(localTime);
    const rightDur = clampClipDuration(clip.duration - localTime);
    const left: TimelineClip = { ...clip, id: newId("clip"), duration: leftDur };
    const right: TimelineClip = {
      ...clip,
      id: newId("clip"),
      duration: rightDur,
      trimStart: (clip.trimStart ?? 0) + leftDur,
    };
    const next = [...clips];
    next.splice(index, 1, left, right);
    onClipsChange(next);
    const nextTrans = [...transitions];
    nextTrans.splice(index, 0, defaultTransition);
    onTransitionsChange(
      next.slice(0, -1).map((_, i) => nextTrans[i] || defaultTransition),
    );
    setSelectedClipId(right.id);
  };

  const onTrimPointerDown = (
    e: ReactPointerEvent,
    clipId: string,
    edge: "left" | "right",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    clearLongPress();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip || disabled) return;
    pushHistory();
    const startX = e.clientX;
    const startDur = clip.duration;
    const startTrim = clip.trimStart ?? 0;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (edge === "right") {
        updateClipDuration(clipId, startDur + dx / pps);
      } else if (clip.kind === "video") {
        // Trim gauche = avance dans la source
        const delta = dx / pps;
        const nextTrim = Math.max(0, startTrim + delta);
        const nextDur = clampClipDuration(startDur - (nextTrim - startTrim));
        onClipsChange(
          clips.map((c) =>
            c.id === clipId
              ? { ...c, trimStart: nextTrim, duration: nextDur }
              : c,
          ),
        );
      } else {
        updateClipDuration(clipId, startDur - dx / pps);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onClipPointerDown = (
    e: ReactPointerEvent,
    clip: TimelineClip,
    index: number,
  ) => {
    if (
      disabled ||
      (e.target as HTMLElement).closest("[data-trim], [data-delete-clip]")
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    setSelectedClipId(clip.id);
    setSelectedTextId(null);
    setGapIndex(null);
    setCurrentTime(starts[index]);

    const originX = e.clientX;
    const originY = e.clientY;
    let dragging = false;
    let fromIndex = index;

    const startGhost = (cx: number, cy: number) => {
      if (!dragging) pushHistory();
      dragging = true;
      setGhost({
        kind: "clip",
        id: clip.id,
        previewUrl: clip.previewUrl,
        label: `${clip.duration.toFixed(1)}s`,
        clientX: cx,
        clientY: cy,
        dropIndex: index,
      });
      setDropIndex(index);
    };

    clearLongPress();
    longPressRef.current = setTimeout(() => {
      startGhost(originX, originY);
    }, LONG_PRESS_MS);

    const onMove = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - originX, ev.clientY - originY);
      if (!dragging && dist > 8) {
        clearLongPress();
        startGhost(ev.clientX, ev.clientY);
      }
      if (!dragging) return;

      const el = scrollerRef.current;
      const track = el?.querySelector(
        "[data-timeline-track]",
      ) as HTMLElement | null;
      let nextDrop = fromIndex;
      if (el && track) {
        const rect = track.getBoundingClientRect();
        const x =
          ev.clientX - rect.left + el.scrollLeft - PAD - trackOriginX;
        nextDrop = indexFromX(x, clips, pps);
        // Auto-scroll near edges
        if (ev.clientX > rect.right - 40) el.scrollLeft += 12;
        if (ev.clientX < rect.left + 40) el.scrollLeft -= 12;
      }

      setGhost({
        kind: "clip",
        id: clip.id,
        previewUrl: clip.previewUrl,
        label: `${clip.duration.toFixed(1)}s`,
        clientX: ev.clientX,
        clientY: ev.clientY,
        dropIndex: nextDrop,
      });
      setDropIndex(nextDrop);
    };

    const onUp = (ev: PointerEvent) => {
      clearLongPress();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      if (dragging) {
        const el = scrollerRef.current;
        const track = el?.querySelector(
          "[data-timeline-track]",
        ) as HTMLElement | null;
        if (el && track) {
          const rect = track.getBoundingClientRect();
          const x =
            ev.clientX - rect.left + el.scrollLeft - PAD - trackOriginX;
          const to = indexFromX(x, clips, pps);
          const from = clips.findIndex((c) => c.id === clip.id);
          if (from >= 0) moveClip(from, to);
        }
      }
      setGhost(null);
      setDropIndex(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  /** Fige les rangées dès qu’il y a chevauchement (évite les sauts auto). */
  useEffect(() => {
    // Pendant un drag texte, on laisse la rangée choisie (repack au relâchement)
    if (ghost?.kind === "text") return;
    const resolved = resolveTextLanes(texts);
    let changed = false;
    const next = texts.map((t) => {
      const lane = resolved.get(t.id) ?? 0;
      if (t.lane === lane) return t;
      changed = true;
      return { ...t, lane };
    });
    if (!changed) return;
    textsRef.current = next;
    onTextsChange(next);
  }, [texts, onTextsChange, ghost]);

  const onTextBlockPointerDown = (
    e: ReactPointerEvent,
    layer: TimelineTextLayer,
  ) => {
    if (disabled || (e.target as HTMLElement).dataset.trim) return;
    e.preventDefault();
    e.stopPropagation();

    setSelectedTextId(layer.id);
    setSelectedClipId(null);
    setGapIndex(null);
    setCurrentTime(layer.start);

    const originX = e.clientX;
    const originY = e.clientY;
    const blockW = Math.max(36, timeToX(layer.duration, pps));
    const resolvedAtStart = resolveTextLanes(textsRef.current);
    const startLane = layer.lane ?? resolvedAtStart.get(layer.id) ?? 0;
    let dragging = false;
    let lastLane = startLane;
    let lastStart = layer.start;
    let raf = 0;
    let pending: { start: number; lane: number } | null = null;

    const flushDrag = () => {
      raf = 0;
      if (!pending) return;
      updateText(layer.id, pending);
      pending = null;
    };

    const queueDrag = (start: number, lane: number) => {
      lastStart = start;
      lastLane = lane;
      pending = { start, lane };
      if (!raf) raf = requestAnimationFrame(flushDrag);
    };

    clearLongPress();
    longPressRef.current = setTimeout(() => {
      if (!dragging) {
        pushHistory();
        if (layer.lane == null) {
          updateText(layer.id, { lane: startLane });
        }
      }
      dragging = true;
      setGhost({
        kind: "text",
        id: layer.id,
        label: layer.content || "Texte",
        clientX: originX,
        clientY: originY,
        width: blockW,
      });
    }, LONG_PRESS_MS);

    const onMove = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - originX, ev.clientY - originY);
      if (!dragging && dist > 8) {
        clearLongPress();
        if (!dragging) {
          pushHistory();
          // Fige la rangée actuelle (évite les sauts auto en chevauchement)
          if (layer.lane == null) {
            updateText(layer.id, { lane: startLane });
          }
        }
        dragging = true;
      }
      if (!dragging) return;

      const el = scrollerRef.current;
      const track = el?.querySelector(
        "[data-text-track]",
      ) as HTMLElement | null;
      if (el && track) {
        const rect = track.getBoundingClientRect();
        const x =
          ev.clientX -
          rect.left +
          el.scrollLeft -
          PAD -
          trackOriginX -
          blockW / 2;
        const t = Math.max(
          0,
          Math.min(Math.max(0, total - layer.duration), xToTime(x, pps)),
        );
        // Rangée : hystérésis — ne change qu’en sortant clairement de la ligne
        const rowPitch = TEXT_ROW_H + TEXT_ROW_GAP;
        const y = ev.clientY - rect.top;
        const maxLane = Math.min(
          MAX_TEXT_LANES - 1,
          Math.max(startLane + 1, lastLane + 1, 1),
        );
        let lane = lastLane;
        const rowTop = lastLane * rowPitch;
        const rowBot = rowTop + TEXT_ROW_H;
        if (y < rowTop - 2) {
          lane = Math.max(0, lastLane - 1);
        } else if (y > rowBot + 2) {
          lane = Math.min(maxLane, lastLane + 1);
        }
        // Saut multi-lignes si le pointeur est bien dans une autre rangée
        const aimed = Math.max(
          0,
          Math.min(maxLane, Math.floor(y / rowPitch)),
        );
        if (aimed !== lastLane) {
          const aTop = aimed * rowPitch;
          if (y >= aTop + 6 && y <= aTop + TEXT_ROW_H - 6) {
            lane = aimed;
          }
        }
        queueDrag(t, lane);
      }

      setGhost({
        kind: "text",
        id: layer.id,
        label: layer.content || "Texte",
        clientX: ev.clientX,
        clientY: ev.clientY,
        width: blockW,
      });
    };

    const onUp = () => {
      clearLongPress();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (pending) {
        updateText(layer.id, pending);
        pending = null;
      }
      setGhost(null);
      // Ancre la rangée (évite le recalcul auto qui “saute”)
      if (dragging) {
        updateText(layer.id, { start: lastStart, lane: lastLane });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onTextTrimPointerDown = (
    e: ReactPointerEvent,
    textId: string,
    edge: "left" | "right",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    clearLongPress();
    const layer = texts.find((t) => t.id === textId);
    if (!layer || disabled) return;
    pushHistory();
    const startX = e.clientX;
    const startDur = layer.duration;
    const startStart = layer.start;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (edge === "right") {
        updateText(textId, { duration: startDur + dx / pps });
      } else {
        const nextStart = Math.max(0, startStart + dx / pps);
        updateText(textId, {
          start: nextStart,
          duration: clampTextDuration(startDur - (nextStart - startStart)),
        });
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const afterCapW = onAddAfter ? END_CAP_W + 6 : 0;
  const clipOffsetX = trackOriginX;
  const timelineInner = Math.max(
    timeToX(Math.max(total, 1), pps) + clipOffsetX + afterCapW,
    (scrollerRef.current?.clientWidth ?? 280) - 16,
  );
  const timelineWidth = timelineInner + PAD * 2;

  const draggingClipId = ghost?.kind === "clip" ? ghost.id : null;
  const draggingTextId = ghost?.kind === "text" ? ghost.id : null;

  let lastTextEndX = 0;
  for (const layer of texts) {
    lastTextEndX = Math.max(
      lastTextEndX,
      timeToX(layer.start + layer.duration, pps),
    );
  }
  const addTextLeft = texts.length ? lastTextEndX + 6 : 0;
  const pinnedLane =
    draggingTextId != null
      ? {
          id: draggingTextId,
          lane:
            texts.find((t) => t.id === draggingTextId)?.lane ?? 0,
        }
      : null;
  const textLanes = resolveTextLanes(texts, pinnedLane);
  const textLaneCount = texts.length
    ? Math.max(0, ...Array.from(textLanes.values())) + 1
    : 1;
  // Une rangée de marge seulement pendant le drag
  const textRowsVisual = textLaneCount + (draggingTextId ? 1 : 0);
  const textTrackHeight =
    textRowsVisual * TEXT_ROW_H +
    Math.max(0, textRowsVisual - 1) * TEXT_ROW_GAP;
  const audioRowTop = textTrackHeight;
  const tracksBelowVideoHeight = audioRowTop + TEXT_ROW_H;
  const textTrackWidth = Math.max(
    timelineInner,
    clipOffsetX + addTextLeft + 72,
  );

  const ghostPortal =
    portalReady && ghost
      ? createPortal(
          <div
            className="pointer-events-none fixed z-[9999]"
            style={{
              left: ghost.clientX,
              top: ghost.clientY,
              transform: "translate(-50%, -110%)",
            }}
          >
            {ghost.kind === "clip" ? (
              <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl border-2 border-gold bg-black shadow-2xl">
                {ghost.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ghost.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-muted">{ghost.label}</span>
                )}
              </div>
            ) : (
              <div
                className="flex h-9 items-center truncate rounded-md border-2 border-gold bg-gold-soft px-2 text-[11px] text-pearl shadow-2xl"
                style={{ width: Math.min(160, ghost.width), maxWidth: 160 }}
              >
                {ghost.label}
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="mt-4 w-full text-left">
      {ghostPortal}

      <div className="flex flex-col items-center">
        <LivePreview
          clips={clips}
          texts={texts}
          transitions={transitions}
          currentTime={currentTime}
          playing={playing}
          compact={compact}
          selectedTextId={selectedTextId}
          onTextSelect={(id) => {
            setSelectedTextId(id);
            setSelectedClipId(null);
            setGapIndex(null);
            setPlaying(false);
            contentHistId.current = null;
          }}
          onTextPositionChange={(id, x, y) => updateText(id, { x, y })}
          onTextContentChange={(id, content) => {
            if (contentHistId.current !== id) {
              pushHistory();
              contentHistId.current = id;
            }
            updateText(id, { content: content.slice(0, MAX_EDIT_TEXT) });
          }}
          onTextScaleChange={(id, scale) => updateText(id, { scale })}
          onTextDelete={(id) => {
            pushHistory();
            const next = textsRef.current.filter((t) => t.id !== id);
            textsRef.current = next;
            onTextsChange(next);
            if (selectedTextId === id) {
              setSelectedTextId(null);
              setStyleOpen(false);
            }
            contentHistId.current = null;
          }}
          onHistoryCheckpoint={pushHistory}
        />

        <div className="mt-3 flex w-full items-center justify-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              transitionPreviewUntil.current = null;
              setPlaying((p) => !p);
            }}
            className="flex size-11 items-center justify-center rounded-full border border-border bg-surface text-pearl touch-manipulation"
            aria-label={playing ? "Pause" : "Lecture"}
          >
            {playing ? (
              <Pause className="size-3.5" strokeWidth={1.75} />
            ) : (
              <Play className="size-3.5 translate-x-px" strokeWidth={1.75} />
            )}
          </button>
          <span className="min-w-[4.2rem] text-center text-[11px] tabular-nums text-muted">
            {formatTimecode(currentTime)} / {formatTimecode(total)}
          </span>
          <button
            type="button"
            disabled={disabled || !canSplit}
            onClick={splitAtPlayhead}
            title={
              canSplit
                ? "Couper la vidéo à la tête de lecture"
                : "Placez la tête sur une vidéo pour couper"
            }
            className={cn(
              "flex size-11 items-center justify-center rounded-full border touch-manipulation",
              canSplit
                ? "border-border bg-surface text-pearl hover:border-gold/40"
                : "border-border/50 text-muted/40",
            )}
            aria-label="Couper"
          >
            <Scissors className="size-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            disabled={disabled || !canUndo}
            onClick={undo}
            title="Annuler"
            className={cn(
              "flex size-11 items-center justify-center rounded-full border touch-manipulation",
              canUndo
                ? "border-border bg-surface text-pearl hover:border-gold/40"
                : "border-border/50 text-muted/40",
            )}
            aria-label="Annuler"
          >
            <Undo2 className="size-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCompact((c) => !c)}
            className="flex min-h-11 touch-manipulation items-center gap-0.5 rounded-full border border-border px-3 py-2 text-[10px] text-muted-strong"
          >
            {compact ? (
              <>
                <ChevronUp className="size-3" /> Agrandir
              </>
            ) : (
              <>
                <ChevronDown className="size-3" /> Réduire
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            Timeline
          </p>
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "text-[11px] tabular-nums",
                overLimit ? "font-medium text-red-400" : "text-muted",
              )}
            >
              {total.toFixed(1)} s
            </p>
            {overLimit ? (
              <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
                60 secondes max !
              </span>
            ) : null}
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="scrollbar-none overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-[#0e0e10] [-webkit-overflow-scrolling:touch]"
        >
          <div
            data-timeline-track
            className="relative cursor-grab select-none px-2 py-3 active:cursor-grabbing"
            style={{ width: timelineWidth, minWidth: "100%" }}
            onPointerDown={(e) => {
              if (
                (e.target as HTMLElement).closest(
                  "[data-clip],[data-text],[data-gap],[data-scale-handle],[data-end-cap],[data-cover-slot]",
                )
              )
                return;

              const el = scrollerRef.current;
              if (!el) return;

              const startX = e.clientX;
              const startScroll = el.scrollLeft;
              let dragged = false;

              const onMove = (ev: PointerEvent) => {
                const dx = ev.clientX - startX;
                if (!dragged && Math.abs(dx) < 4) return;
                dragged = true;
                el.scrollLeft = startScroll - dx;
              };
              const onUp = (ev: PointerEvent) => {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
                // Clic simple = seek + désélection ; glisser = scroll la bande
                if (!dragged) {
                  setSelectedClipId(null);
                  setSelectedTextId(null);
                  setGapIndex(null);
                  seekFromClientX(ev.clientX);
                }
              };
              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
          >
            <div
              className="relative mb-2 h-4"
              style={{ width: timelineInner }}
            >
              {Array.from({ length: Math.ceil(total) + 1 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute top-0 text-[9px] text-muted/70 tabular-nums"
                  style={{ left: clipOffsetX + timeToX(i, pps) }}
                >
                  {i}s
                </span>
              ))}
            </div>

            {/* Piste vidéo — clips collés + slots intro / signature */}
            <div
              className="relative"
              style={{ height: TRACK_H, width: timelineInner }}
            >
              {onCoverPress ? (
                <button
                  type="button"
                  data-cover-slot
                  disabled={disabled || exporting || coverBusy}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCoverPress();
                  }}
                  className="absolute top-0 z-[5] flex touch-manipulation flex-col items-center justify-center overflow-hidden rounded-md border border-gold/50 bg-[#1a1a1c] transition-colors hover:border-gold disabled:opacity-40"
                  style={{ left: 0, width: END_CAP_W, height: TRACK_H }}
                  aria-label="Changer la couverture"
                  title="Couverture — vignette du Reel"
                >
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="size-4 text-gold" strokeWidth={1.75} />
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-black/65 py-0.5 text-center text-[8px] font-medium tracking-wide text-pearl">
                    Cover
                  </span>
                </button>
              ) : null}

              {onAddBefore ? (
                <button
                  type="button"
                  data-end-cap="before"
                  disabled={disabled || exporting}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddBefore();
                  }}
                  className="absolute top-0 z-[5] flex touch-manipulation flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-gold/45 bg-gold-soft/40 text-gold transition-colors hover:border-gold hover:bg-gold-soft disabled:opacity-40"
                  style={{
                    left: coverPadX,
                    width: END_CAP_W,
                    height: TRACK_H,
                  }}
                  aria-label="Ajouter une vidéo d’intro"
                  title="Intro — avant le Reel"
                >
                  <Plus className="size-5" strokeWidth={2} />
                  <span className="text-[9px] font-medium tracking-wide">
                    Intro
                  </span>
                </button>
              ) : null}

              {clips.map((clip, i) => {
                const w = clipWidth(clip.duration, pps);
                const left = clipOffsetX + timeToX(starts[i], pps);
                const selected = selectedClipId === clip.id;
                const isGhostSource = draggingClipId === clip.id;
                const showDropBefore =
                  dropIndex === i &&
                  draggingClipId &&
                  draggingClipId !== clip.id;

                return (
                  <div
                    key={clip.id}
                    data-clip
                    role="button"
                    tabIndex={0}
                    onPointerDown={(e) => onClipPointerDown(e, clip, i)}
                    className={cn(
                      "absolute top-0 touch-none rounded-md border transition-opacity",
                      selected
                        ? "z-10 overflow-visible border-gold ring-1 ring-gold/40"
                        : "z-[1] overflow-hidden border-white/10",
                      isGhostSource && "opacity-30",
                    )}
                    style={{ left, width: w, height: TRACK_H }}
                  >
                    {showDropBefore ? (
                      <span className="absolute top-0 bottom-0 left-0 z-30 w-0.5 bg-gold" />
                    ) : null}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[5px]">
                      <ClipFilmstrip clip={clip} width={w} height={TRACK_H} />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute right-1 bottom-0.5 text-[9px] tabular-nums text-white/95 drop-shadow">
                        {clip.duration.toFixed(1)}s
                      </span>
                    </div>
                    {selected && clips.length > 1 ? (
                      <button
                        type="button"
                        data-delete-clip
                        disabled={disabled}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeClip(clip.id);
                        }}
                        className="absolute top-1/2 left-1/2 z-20 flex size-9 -translate-x-1/2 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-black/40 text-white/75 backdrop-blur-[1px] hover:bg-black/55 hover:text-red-300 disabled:opacity-40"
                        aria-label="Supprimer le clip"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                      </button>
                    ) : null}
                    {selected ? (
                      <>
                        <span
                          data-trim="left"
                          onPointerDown={(e) =>
                            onTrimPointerDown(e, clip.id, "left")
                          }
                          className="absolute top-1/2 left-0 z-30 flex h-[calc(100%+14px)] w-10 -translate-x-1/2 -translate-y-1/2 touch-none cursor-ew-resize items-center justify-center"
                          aria-label="Raccourcir le début"
                        >
                          <span className="pointer-events-none h-[85%] w-1.5 rounded-full bg-gold shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" />
                        </span>
                        <span
                          data-trim="right"
                          onPointerDown={(e) =>
                            onTrimPointerDown(e, clip.id, "right")
                          }
                          className="absolute top-1/2 right-0 z-30 flex h-[calc(100%+14px)] w-10 translate-x-1/2 -translate-y-1/2 touch-none cursor-ew-resize items-center justify-center"
                          aria-label="Allonger la fin"
                        >
                          <span className="pointer-events-none h-[85%] w-1.5 rounded-full bg-gold shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" />
                        </span>
                      </>
                    ) : null}
                  </div>
                );
              })}

              {onAddAfter ? (
                <button
                  type="button"
                  data-end-cap="after"
                  disabled={disabled || exporting}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAfter();
                  }}
                  className="absolute top-0 z-[5] flex touch-manipulation flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-gold/45 bg-gold-soft/40 text-gold transition-colors hover:border-gold hover:bg-gold-soft disabled:opacity-40"
                  style={{
                    left: clipOffsetX + timeToX(Math.max(total, 0.1), pps) + 6,
                    width: END_CAP_W,
                    height: TRACK_H,
                  }}
                  aria-label="Ajouter une vidéo de signature"
                  title="Signature — après le Reel"
                >
                  <Plus className="size-5" strokeWidth={2} />
                  <span className="text-[9px] font-medium tracking-wide">
                    Fin
                  </span>
                </button>
              ) : null}

              {/* Transitions sur les jointures */}
              {clips.slice(0, -1).map((_, i) => {
                const seamX = clipOffsetX + timeToX(starts[i + 1], pps);
                const active = gapIndex === i;
                return (
                  <button
                    key={`tr-${i}`}
                    type="button"
                    data-gap
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (active) {
                        setGapIndex(null);
                        transitionPreviewUntil.current = null;
                        setPlaying(false);
                      } else {
                        setGapIndex(i);
                        setSelectedClipId(null);
                        setSelectedTextId(null);
                        previewTransitionAt(i);
                      }
                    }}
                    className={cn(
                      "absolute top-1/2 z-20 flex size-10 -translate-x-1/2 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border text-[9px] shadow",
                      active
                        ? "border-gold bg-gold text-background"
                        : "border-white/25 bg-[#1a1a1c] text-pearl hover:border-gold/60",
                    )}
                    style={{ left: seamX }}
                    aria-label={`Transition ${i + 1}`}
                  >
                    ◆
                  </button>
                );
              })}

              <div
                className="pointer-events-none absolute top-[-6px] bottom-[-6px] z-30 w-px bg-gold"
                style={{ left: clipOffsetX + timeToX(currentTime, pps) }}
              >
                <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-gold" />
              </div>
            </div>

            {/* Piste texte — +texte à droite ; +audio (démo) toujours en bas */}
            <div
              data-text-track
              className="relative mt-2"
              style={{
                height: tracksBelowVideoHeight,
                width: textTrackWidth,
              }}
            >
              {texts.map((layer) => {
                const left = clipOffsetX + timeToX(layer.start, pps);
                const w = Math.max(36, timeToX(layer.duration, pps));
                const lane = textLanes.get(layer.id) ?? layer.lane ?? 0;
                const top = lane * (TEXT_ROW_H + TEXT_ROW_GAP);
                const isDragging = draggingTextId === layer.id;
                return (
                  <div
                    key={layer.id}
                    data-text
                    role="button"
                    tabIndex={0}
                    onPointerDown={(e) => onTextBlockPointerDown(e, layer)}
                    className={cn(
                      "absolute flex items-center rounded-md border px-2 text-[11px] text-pearl",
                      selectedTextId === layer.id
                        ? "z-10 overflow-visible border-gold bg-gold-soft"
                        : "z-[1] overflow-hidden border-white/20 bg-white/10",
                      isDragging && "opacity-40 z-20",
                      !isDragging && "transition-[top,left] duration-150 ease-out",
                    )}
                    style={{
                      left,
                      width: w,
                      top,
                      height: TEXT_ROW_H,
                    }}
                  >
                    <span className="truncate pointer-events-none">
                      {layer.content || "Texte…"}
                    </span>
                    {selectedTextId === layer.id ? (
                      <>
                        <span
                          data-trim="left"
                          onPointerDown={(e) =>
                            onTextTrimPointerDown(e, layer.id, "left")
                          }
                          className="absolute top-1/2 left-0 z-30 flex h-[calc(100%+14px)] w-10 -translate-x-1/2 -translate-y-1/2 touch-none cursor-ew-resize items-center justify-center"
                          aria-label="Raccourcir le début du texte"
                        >
                          <span className="pointer-events-none h-[80%] w-1.5 rounded-full bg-gold shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
                        </span>
                        <span
                          data-trim="right"
                          onPointerDown={(e) =>
                            onTextTrimPointerDown(e, layer.id, "right")
                          }
                          className="absolute top-1/2 right-0 z-30 flex h-[calc(100%+14px)] w-10 translate-x-1/2 -translate-y-1/2 touch-none cursor-ew-resize items-center justify-center"
                          aria-label="Allonger la fin du texte"
                        >
                          <span className="pointer-events-none h-[80%] w-1.5 rounded-full bg-gold shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
                        </span>
                      </>
                    ) : null}
                  </div>
                );
              })}

              <button
                type="button"
                disabled={disabled}
                onClick={addText}
                className="absolute inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 text-[10px] font-medium text-muted-strong hover:border-gold/40 hover:text-pearl"
                style={{
                  left: clipOffsetX + addTextLeft,
                  top: 0,
                  height: TEXT_ROW_H,
                }}
              >
                <Plus className="size-3" strokeWidth={2} />
                {t.editor.text}
              </button>

              <button
                type="button"
                disabled
                title={t.editor.audioSoon}
                className="absolute inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-dashed border-border/70 px-2 text-[10px] font-medium text-muted/55"
                style={{
                  left: 0,
                  top: audioRowTop,
                  height: TEXT_ROW_H,
                }}
                aria-label={t.editor.audioSoon}
              >
                <Plus className="size-3" strokeWidth={2} />
                {t.editor.audio}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inspecteur : transitions OU texte seulement */}
      {gapIndex != null ? (
        <div className="mt-3 rounded-2xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-pearl">
              Transition · {gapIndex + 1} → {gapIndex + 2}
            </p>
            <button type="button" onClick={() => setGapIndex(null)}>
              <X className="size-4 text-muted" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {EDIT_TRANSITIONS.map((t) => {
              const active =
                (transitions[gapIndex] || defaultTransition) === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    pushHistory();
                    const next = [...transitions];
                    next[gapIndex] = t.id;
                    onTransitionsChange(next);
                    previewTransitionAt(gapIndex);
                  }}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-[11px]",
                    active
                      ? "border-gold/50 bg-gold-soft text-pearl"
                      : "border-border text-muted-strong",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : selectedText ? (
        <div className="mt-3 rounded-2xl border border-border bg-surface p-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setStyleOpen((o) => !o)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[15px] font-medium"
                style={{
                  fontFamily: getFont(selectedText.fontId).cssFamily,
                  color: selectedText.color ?? DEFAULT_TEXT_COLOR,
                  WebkitTextStroke: (() => {
                    const c = strokeCssColor(
                      selectedText.stroke ?? DEFAULT_TEXT_STROKE,
                    );
                    return c ? `0.7px ${c}` : undefined;
                  })(),
                  paintOrder: "stroke fill",
                  background:
                    selectedText.bg && (selectedText.bgAlpha ?? 0) > 0.02
                      ? `${selectedText.bg}${Math.round((selectedText.bgAlpha ?? 0.55) * 255).toString(16).padStart(2, "0")}`
                      : "#141416",
                }}
              >
                Aa
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[12px] font-medium text-pearl">
                  Style
                </span>
                <span className="block truncate text-[10px] text-muted">
                  Police · taille · couleur
                </span>
              </span>
              {styleOpen ? (
                <ChevronUp className="size-4 shrink-0 text-muted" />
              ) : (
                <ChevronDown className="size-4 shrink-0 text-muted" />
              )}
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                pushHistory();
                onTextsChange(texts.filter((t) => t.id !== selectedText.id));
                setSelectedTextId(null);
                setStyleOpen(false);
              }}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-red-400 hover:border-red-400/40"
              aria-label="Supprimer le texte"
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
            </button>
          </div>

          {styleOpen ? (
            <div className="mt-2 space-y-2.5 rounded-xl border border-border bg-background p-2">
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-9">
                {EDITOR_FONTS.map((f) => {
                  const active = selectedText.fontId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={disabled}
                      title={f.label}
                      onClick={() => {
                        pushHistory();
                        updateText(selectedText.id, styleFromFont(f.id));
                      }}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-lg border text-[13px]",
                        active
                          ? "border-gold ring-1 ring-gold/40"
                          : "border-white/10",
                      )}
                      style={{
                        fontFamily: f.cssFamily,
                        color: f.defaultColor,
                        background:
                          f.bg && f.bgAlpha > 0.02
                            ? `${f.bg}${Math.round(f.bgAlpha * 255)
                                .toString(16)
                                .padStart(2, "0")}`
                            : "#121214",
                        WebkitTextStroke: strokeCssColor(f.stroke)
                          ? `0.6px ${strokeCssColor(f.stroke)}`
                          : undefined,
                        paintOrder: "stroke fill",
                      }}
                    >
                      Aa
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    pushHistory();
                    updateText(selectedText.id, {
                      scale: clampTextScale(
                        (selectedText.scale ?? DEFAULT_TEXT_SCALE) - 0.1,
                      ),
                    });
                  }}
                  className="flex h-10 min-w-12 items-center justify-center rounded-lg border border-border bg-surface text-[13px] font-semibold text-pearl hover:border-gold/40 disabled:opacity-40"
                  aria-label="Réduire la police"
                >
                  A−
                </button>
                <span className="min-w-12 text-center text-[12px] tabular-nums text-muted-strong">
                  {Math.round(
                    (selectedText.scale ?? DEFAULT_TEXT_SCALE) * 100,
                  )}
                  %
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    pushHistory();
                    updateText(selectedText.id, {
                      scale: clampTextScale(
                        (selectedText.scale ?? DEFAULT_TEXT_SCALE) + 0.1,
                      ),
                    });
                  }}
                  className="flex h-10 min-w-12 items-center justify-center rounded-lg border border-border bg-surface text-[15px] font-semibold text-pearl hover:border-gold/40 disabled:opacity-40"
                  aria-label="Agrandir la police"
                >
                  A+
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-1.5">
                {colorsForFont(selectedText.fontId).map((c) => {
                  const active =
                    (selectedText.color ?? DEFAULT_TEXT_COLOR) === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        pushHistory();
                        const look = lookForColor(c);
                        updateText(selectedText.id, {
                          color: c,
                          stroke: look.stroke,
                          bg: look.bg,
                          bgAlpha: look.bgAlpha,
                        });
                      }}
                      className={cn(
                        "size-9 shrink-0 rounded-full border touch-manipulation",
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
      ) : null}

      <div className="mt-4">
        <Button
          fullWidth
          variant={
            (dirty || Boolean(onContinue && hasExport)) && !overLimit
              ? "gold"
              : "ghost"
          }
          disabled={
            disabled ||
            exporting ||
            overLimit ||
            (!dirty && !(onContinue && hasExport))
          }
          onClick={() => {
            if (dirty) onExport();
            else onContinue?.();
          }}
        >
          {exporting
            ? t.editor.exporting
            : overLimit
              ? t.editor.tooLong
              : dirty
                ? hasExport
                  ? t.editor.exportEdit
                  : t.editor.generate
                : onContinue && hasExport
                  ? t.editor.downloadReady
                  : t.editor.upToDate}
        </Button>
      </div>
    </div>
  );
}
