"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Download,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CapCutEditor } from "@/components/rendu/CapCutEditor";
import { RenderWaitingOverlay } from "@/components/medias/RenderWaitingOverlay";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { createClient } from "@/lib/supabase/client";
import {
  AREO_MEDIA_BUCKET,
  loadRenderSession,
  loadUploadSession,
  resolveUploadFolder,
  saveRenderSession,
  saveUploadSession,
  uploadMediaFile,
  type RenderSession,
  type UploadedMedia,
} from "@/lib/storage";
import { getRecipe } from "@/lib/render/recipes";
import { MAX_USER_VIDEO_SEC } from "@/lib/media-limits";
import { starterTextsForTemplate } from "@/lib/render/template-demo-texts";
import {
  EDIT_TRANSITIONS,
  newId,
  type TimelineClip,
  type TimelineTextLayer,
} from "@/lib/render/edit-options";
import { engineForTemplate } from "@/lib/render/engine";
import { runRenderApi } from "@/lib/render/client";
import {
  buildCinemaTextLayers,
  cinemaTransitions,
  getCinemaStyle,
} from "@/lib/dynamic/cinema";
import { loadWritingStyleId } from "@/lib/writing/session";
import {
  loadPropertyListing,
  propertyHasContent,
} from "@/lib/dynamic/property";

type RenduClientProps = {
  templateId: string;
  templateTitle: string;
};

type SourceImage = {
  path: string;
  name: string;
  previewUrl: string;
};

function snapshotKey(
  clips: TimelineClip[],
  transitions: string[],
  texts: TimelineTextLayer[],
) {
  return JSON.stringify({
    clips: clips.map((c) => ({
      path: c.path,
      duration: c.duration,
      trimStart: c.trimStart ?? 0,
    })),
    transitions,
    texts: texts.map((t) => ({
      content: t.content,
      fontId: t.fontId,
      start: t.start,
      duration: t.duration,
      x: t.x,
      y: t.y,
      scale: t.scale ?? 1,
      color: t.color ?? "#FFFFFF",
      stroke: t.stroke ?? "dark",
      bg: t.bg ?? null,
      bgAlpha: t.bgAlpha ?? 0,
    })),
  });
}

export function RenduClient({ templateId, templateTitle }: RenduClientProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const agentVideoRef = useRef<HTMLInputElement>(null);
  const addAtRef = useRef<"start" | "end">("end");
  const recipe = getRecipe(templateId);
  const defaultTransition =
    EDIT_TRANSITIONS.find((t) => t.id === recipe.transition)?.id ?? "fade";

  const [result, setResult] = useState<RenderSession | null>(null);
  const [ready, setReady] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState<SourceImage[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [texts, setTexts] = useState<TimelineTextLayer[]>([]);
  const [exportedKey, setExportedKey] = useState<string>("");

  const [exporting, setExporting] = useState(false);
  const [waitProgress, setWaitProgress] = useState(12);
  const [waitStatus, setWaitStatus] = useState("Export en cours…");
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadRenderSession();
    const hasResult = Boolean(loaded && loaded.templateId === templateId);
    if (hasResult && loaded) {
      setResult(loaded);
      setCoverUrl(loaded.coverUrl ?? null);
      setSelectedPath(loaded.coverPath ?? null);
    }

    const upload = loadUploadSession();
    if (upload && upload.templateId === templateId && upload.medias.length) {
      void (async () => {
        const supabase = createClient();
        const paths = upload.medias.map((m) => m.path);
        const { data } = await supabase.storage
          .from(AREO_MEDIA_BUCKET)
          .createSignedUrls(paths, 60 * 60);

        const urlByPath = new Map(
          (data ?? [])
            .filter((row) => row.signedUrl && row.path)
            .map((row) => [row.path as string, row.signedUrl as string]),
        );

        const nextClips: TimelineClip[] = upload.medias.map((m) => ({
          id: newId("clip"),
          path: m.path,
          name: m.name,
          kind: m.kind,
          size: m.size,
          previewUrl: urlByPath.get(m.path) ?? m.previewUrl,
          duration:
            m.kind === "video" ? MAX_USER_VIDEO_SEC : recipe.imageSeconds,
        }));

        const nextTransitions = nextClips
          .slice(0, -1)
          .map((_, i) => {
            if (engineForTemplate(templateId) === "veo-fast") {
              const cinema = getCinemaStyle(templateId);
              const list = cinemaTransitions(
                templateId,
                nextClips.length - 1,
                nextClips.length,
              );
              return (
                EDIT_TRANSITIONS.find((t) => t.id === list[i])?.id ??
                cinema.transitions[0] ??
                defaultTransition
              );
            }
            return defaultTransition;
          });

        setClips(nextClips);
        setTransitions(nextTransitions);

        const property = loadPropertyListing();
        const writingId = loadWritingStyleId();
        let starters: TimelineTextLayer[];
        if (property && propertyHasContent(property)) {
          const fade =
            engineForTemplate(templateId) === "veo-fast"
              ? getCinemaStyle(templateId).fadeSeconds
              : recipe.fadeSeconds;
          const layers = buildCinemaTextLayers(
            property,
            nextClips.length,
            recipe.imageSeconds,
            fade,
            templateId,
            writingId,
            nextClips.map((c) => c.duration),
          );
          starters = layers.map((L) => ({
            id: newId("txt"),
            content: L.content,
            fontId: L.fontId,
            start: L.start,
            duration: L.duration,
            x: L.x,
            y: L.y,
            scale: L.scale,
            color: L.color,
            stroke: L.stroke,
            bg: L.bg ?? null,
            bgAlpha: L.bgAlpha ?? 0,
            look: L.look,
            fadeSec: L.fadeSec,
            lane: (L.y ?? 0.8) < 0.5 ? 0 : 1,
          }));
        } else {
          starters = starterTextsForTemplate(templateId, nextClips);
        }
        setTexts(starters);
        setExportedKey(
          hasResult
            ? snapshotKey(nextClips, nextTransitions, starters)
            : "",
        );
      })();
    }

    setReady(true);
  }, [templateId, recipe.imageSeconds, recipe.videoMaxSeconds, defaultTransition]);

  // Recharge / auto-cover après export sauvegardé
  useEffect(() => {
    const videoId = result?.savedVideoId;
    if (!videoId || coverUrl) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}`);
        const data = (await res.json()) as {
          coverUrl?: string | null;
          coverPath?: string | null;
          medias?: {
            path: string;
            kind: string;
            previewUrl?: string | null;
          }[];
        };
        if (!res.ok || cancelled) return;

        if (data.coverUrl) {
          setCoverUrl(data.coverUrl);
          setSelectedPath(data.coverPath ?? null);
          setResult((prev) => {
            if (!prev || prev.savedVideoId !== videoId) return prev;
            const next = {
              ...prev,
              coverUrl: data.coverUrl,
              coverPath: data.coverPath ?? null,
            };
            saveRenderSession(next);
            return next;
          });
          return;
        }

        const first = (data.medias ?? []).find(
          (m) => m.kind === "image" && m.path,
        );
        if (!first) return;
        const apply = await fetch(`/api/videos/${videoId}/cover`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourcePath: first.path }),
        });
        const applied = (await apply.json()) as {
          coverUrl?: string | null;
          coverPath?: string | null;
        };
        if (!apply.ok || cancelled) return;
        const nextUrl = applied.coverUrl ?? first.previewUrl ?? null;
        const nextPath = applied.coverPath ?? first.path;
        setCoverUrl(nextUrl);
        setSelectedPath(nextPath);
        setResult((prev) => {
          if (!prev || prev.savedVideoId !== videoId) return prev;
          const next = {
            ...prev,
            coverUrl: nextUrl,
            coverPath: nextPath,
          };
          saveRenderSession(next);
          return next;
        });
      } catch {
        /* couverture optionnelle */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [result?.savedVideoId, coverUrl]);

  const canSetCover = Boolean(result?.saved && result.savedVideoId);
  const canEdit = clips.length > 0;
  const hasExport = Boolean(result);

  const currentKey = useMemo(
    () => snapshotKey(clips, transitions, texts),
    [clips, transitions, texts],
  );
  // Premier passage : toujours « dirty » jusqu’au premier export HD
  const dirty = canEdit && (!hasExport || currentKey !== exportedKey);

  const openPicker = async () => {
    if (!result?.savedVideoId || busy) return;
    setPickerOpen(true);
    setCoverError(null);
    if (library.length) return;

    setLibraryLoading(true);
    try {
      const res = await fetch(`/api/videos/${result.savedVideoId}`);
      const data = (await res.json()) as {
        error?: string;
        medias?: {
          path: string;
          name: string;
          kind: string;
          previewUrl?: string | null;
        }[];
      };
      if (!res.ok) throw new Error(data.error || "Impossible de charger les images.");

      const images = (data.medias ?? [])
        .filter((m) => m.kind === "image" && m.previewUrl)
        .map((m) => ({
          path: m.path,
          name: m.name,
          previewUrl: m.previewUrl as string,
        }));
      setLibrary(images);
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : "Erreur chargement.");
    } finally {
      setLibraryLoading(false);
    }
  };

  const applySourceCover = async (sourcePath: string, preview?: string) => {
    if (!result?.savedVideoId || busy) return;
    setBusy(true);
    setCoverError(null);
    try {
      const res = await fetch(`/api/videos/${result.savedVideoId}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePath }),
      });
      const data = (await res.json()) as {
        error?: string;
        coverUrl?: string | null;
        coverPath?: string | null;
      };
      if (!res.ok) throw new Error(data.error || "Échec couverture.");
      setSelectedPath(data.coverPath ?? sourcePath);
      setCoverUrl(data.coverUrl ?? preview ?? null);
      if (result) {
        const next = {
          ...result,
          coverUrl: data.coverUrl ?? preview ?? null,
          coverPath: data.coverPath ?? sourcePath,
        };
        setResult(next);
        saveRenderSession(next);
      }
      setPickerOpen(false);
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : "Erreur couverture.");
    } finally {
      setBusy(false);
    }
  };

  const uploadCover = async (file: File) => {
    if (!result?.savedVideoId || busy) return;
    setBusy(true);
    setCoverError(null);
    try {
      const form = new FormData();
      form.append("cover", file);
      const res = await fetch(`/api/videos/${result.savedVideoId}/cover`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        error?: string;
        coverUrl?: string | null;
        coverPath?: string | null;
      };
      if (!res.ok) throw new Error(data.error || "Échec couverture.");
      setSelectedPath(data.coverPath ?? null);
      setCoverUrl(data.coverUrl ?? URL.createObjectURL(file));
      const next = {
        ...result,
        coverUrl: data.coverUrl ?? null,
        coverPath: data.coverPath ?? null,
      };
      setResult(next);
      saveRenderSession(next);
      setPickerOpen(false);
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : "Erreur couverture.");
    } finally {
      setBusy(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const pickAgentVideo = (position: "start" | "end") => {
    if (adding || exporting || busy) return;
    addAtRef.current = position;
    agentVideoRef.current?.click();
  };

  const addAgentVideo = async (file: File, position: "start" | "end") => {
    setAdding(true);
    setEditError(null);
    try {
      const folder = await resolveUploadFolder();
      const uploaded = await uploadMediaFile(file, folder);
      const supabase = createClient();
      const { data } = await supabase.storage
        .from(AREO_MEDIA_BUCKET)
        .createSignedUrl(uploaded.path, 60 * 60);
      const previewUrl = data?.signedUrl ?? URL.createObjectURL(file);
      const agentDur = Math.min(4, recipe.videoMaxSeconds);
      const nextClip: TimelineClip = {
        id: newId("clip"),
        path: uploaded.path,
        name: position === "start" ? "Intro" : "Signature",
        kind: "video",
        size: file.size,
        previewUrl,
        duration: agentDur,
        trimStart: 0,
      };

      setClips((prev) => {
        const updated =
          position === "start" ? [nextClip, ...prev] : [...prev, nextClip];
        setTransitions(
          Array.from(
            { length: Math.max(0, updated.length - 1) },
            () => defaultTransition,
          ),
        );
        return updated;
      });

      if (position === "start") {
        setTexts((prev) =>
          prev.map((t) => ({
            ...t,
            start: t.start + agentDur,
          })),
        );
      }
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Upload impossible.");
    } finally {
      setAdding(false);
      if (agentVideoRef.current) agentVideoRef.current.value = "";
    }
  };

  const exportTimeline = async () => {
    if (!canEdit || exporting || !dirty) return;
    setExporting(true);
    setEditError(null);
    const useVeo = engineForTemplate(templateId) === "veo-fast";
    setWaitStatus(
      useVeo
        ? "Animation IA des pièces…"
        : "Montage HD en cours…",
    );
    setWaitProgress(8);
    const startedAt = Date.now();
    const estMs = useVeo
      ? 14_000 + Math.max(1, clips.length) * 22_000
      : 16_000;
    let tick: ReturnType<typeof setInterval> | null = setInterval(() => {
      const ratio = (Date.now() - startedAt) / estMs;
      const eased = 1 - Math.exp(-ratio * 1.35);
      const next = Math.min(90, 8 + eased * 82);
      setWaitProgress(next);
      if (useVeo) {
        if (next < 12) setWaitStatus("Préparation…");
        else if (next < 72) setWaitStatus("Plans cinéma…");
        else if (next < 86) setWaitStatus("Assemblage…");
        else setWaitStatus("Finalisation…");
      }
    }, 450);

    try {
      const medias: UploadedMedia[] = clips.map((c) => ({
        path: c.path,
        name: c.name,
        kind: c.kind,
        size: c.size,
        previewUrl: c.previewUrl,
      }));

      saveUploadSession({
        templateId,
        medias,
        createdAt: new Date().toISOString(),
      });

      const data = await runRenderApi({
        templateId,
        medias,
        engine: engineForTemplate(templateId),
        edits: {
          clipDurations: clips.map((c) => c.duration),
          clipTrimStarts: clips.map((c) => c.trimStart ?? 0),
          transitions: transitions.slice(0, Math.max(0, clips.length - 1)),
          textLayers: texts
            .filter((t) => t.content.trim())
            .map((t) => ({
              content: t.content,
              fontId: t.fontId,
              start: t.start,
              duration: t.duration,
              x: t.x,
              y: t.y,
              scale: t.scale ?? 1,
              color: t.color ?? "#FFFFFF",
              stroke: t.stroke ?? "dark",
              bg: t.bg ?? null,
              bgAlpha: t.bgAlpha ?? 0,
              enter: t.enter ?? "fade",
              exit: t.exit ?? "fade",
              ...(t.fadeSec != null ? { fadeSec: t.fadeSec } : {}),
            })),
        },
        replaceVideoId: result?.savedVideoId ?? null,
      });

      setWaitStatus("Assemblage du Reel…");
      setWaitProgress(92);

      const signedUrl = data.signedUrl;
      const storagePath = data.storagePath;
      const saved = Boolean(data.saved);
      const savedVideoId = data.savedVideoId ?? result?.savedVideoId ?? null;
      const evicted = data.evicted ?? 0;

      if (!signedUrl || !storagePath) {
        throw new Error("Échec de l’export.");
      }

      if (tick) {
        clearInterval(tick);
        tick = null;
      }
      setWaitStatus("Presque prêt…");
      setWaitProgress(100);
      await new Promise((r) => setTimeout(r, 550));

      const nextSession: RenderSession = {
        templateId,
        signedUrl,
        storagePath,
        saved,
        savedVideoId,
        evicted,
        mediaCount: medias.length,
        createdAt: new Date().toISOString(),
        coverUrl: data.coverUrl ?? coverUrl,
        coverPath: data.coverPath ?? selectedPath,
      };
      saveRenderSession(nextSession);
      setResult(nextSession);
      setExportedKey(snapshotKey(clips, transitions, texts));
      if (data.coverUrl) {
        setCoverUrl(data.coverUrl);
        setSelectedPath(data.coverPath ?? null);
      }
      setLibrary([]);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Échec de l’export.");
    } finally {
      if (tick) clearInterval(tick);
      setExporting(false);
      setWaitProgress(12);
    }
  };

  if (!ready) {
    return (
      <div className="animate-fade-up w-full max-w-lg py-16 text-center text-muted">
        Chargement…
      </div>
    );
  }

  if (!result && !canEdit) {
    return (
      <div className="animate-fade-up w-full max-w-sm text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-surface text-muted">
          <AlertCircle className="size-6" strokeWidth={1.5} />
        </div>
        <h2 className="mt-6 font-display text-3xl font-medium text-pearl">
          Aucune vidéo
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Le montage se lance depuis l’étape Médias.
        </p>
        <div className="mt-8">
          <Button
            href={`/creer/medias?template=${templateId}`}
            fullWidth
            variant="gold"
            showArrow
          >
            Retour aux médias
          </Button>
        </div>
      </div>
    );
  }

  const previewUrls = clips
    .map((c) => c.previewUrl)
    .filter((u): u is string => Boolean(u));

  return (
    <div className="animate-fade-up w-full max-w-lg pb-8">
      {exporting ? (
        <RenderWaitingOverlay
          previews={previewUrls}
          status={waitStatus}
          progress={waitProgress}
        />
      ) : null}

      <Badge tone="gold">{templateTitle}</Badge>
      <h2 className="mt-3 text-center font-display text-3xl font-medium text-pearl">
        Éditer
      </h2>

      {canEdit ? (
        <>
          <CapCutEditor
            clips={clips}
            onClipsChange={(next) => {
              setClips(next);
              setTransitions((prev) =>
                next.slice(0, -1).map((_, i) => prev[i] || defaultTransition),
              );
            }}
            transitions={transitions}
            onTransitionsChange={setTransitions}
            texts={texts}
            onTextsChange={setTexts}
            defaultTransition={defaultTransition}
            disabled={exporting || busy || adding}
            exporting={exporting}
            dirty={dirty}
            hasExport={hasExport}
            onExport={() => void exportTimeline()}
            onAddBefore={() => pickAgentVideo("start")}
            onAddAfter={() => pickAgentVideo("end")}
            coverUrl={coverUrl}
            onCoverPress={
              canSetCover ? () => void openPicker() : undefined
            }
            coverBusy={busy}
          />
          {adding ? (
            <p className="mt-2 text-center text-[12px] text-muted">
              Ajout de ta vidéo…
            </p>
          ) : null}
          {editError ? (
            <p className="mt-2 text-center text-[12px] text-red-400" role="alert">
              {editError}
            </p>
          ) : null}
          {coverError && !pickerOpen ? (
            <p className="mt-2 text-center text-[12px] text-red-400" role="alert">
              {coverError}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-6 text-center text-[12px] text-muted">
          Session médias absente — relancez depuis Médias pour éditer.
        </p>
      )}

      {result ? (
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            fullWidth
            variant="gold"
            icon={downloading ? Loader2 : Download}
            disabled={downloading || exporting || dirty}
            className={downloading ? "[&_svg]:animate-spin" : undefined}
            onClick={() => {
              if (downloading) return;
              setDownloading(true);
              void downloadFile(result.signedUrl, `areo-${templateId}.mp4`)
                .catch(() => setCoverError("Téléchargement impossible."))
                .finally(() => setDownloading(false));
            }}
          >
            {dirty
              ? "Exportez d’abord"
              : downloading
                ? "Téléchargement…"
                : "Télécharger HD"}
          </Button>
          <Button href="/compte" fullWidth variant="ghost">
            Voir mon espace
          </Button>
          <Link
            href={`/creer/medias?template=${templateId}`}
            className="text-sm text-gold transition-opacity hover:opacity-80"
          >
            Nouveau montage
          </Link>
        </div>
      ) : null}

      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadCover(file);
        }}
      />
      <input
        ref={agentVideoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void addAgentVideo(file, addAtRef.current);
        }}
      />

      {pickerOpen ? (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => !busy && setPickerOpen(false)}
          />
          <div className="relative z-10 flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-surface sm:mx-4 sm:rounded-[1.75rem]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-pearl">
                  Couverture
                </h3>
                <p className="text-[12px] text-muted">
                  Auto = 1ʳᵉ photo. Change si tu n’aimes pas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setPickerOpen(false)}
                className="flex size-11 touch-manipulation items-center justify-center rounded-full border border-border"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {libraryLoading ? (
                <div className="flex justify-center py-10 text-muted">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : (
                <ul className="grid grid-cols-3 gap-2">
                  {library.map((img) => (
                    <li key={img.path}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void applySourceCover(img.path, img.previewUrl)
                        }
                        className={cn(
                          "relative aspect-square w-full overflow-hidden rounded-xl border",
                          selectedPath === img.path
                            ? "border-gold"
                            : "border-border",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.previewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        {selectedPath === img.path ? (
                          <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-gold text-background">
                            <Check className="size-3" strokeWidth={2.5} />
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => coverInputRef.current?.click()}
                      className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong text-muted-strong"
                    >
                      <ImagePlus className="size-5" />
                      <span className="text-[10px] uppercase">Autre</span>
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
