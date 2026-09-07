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
  saveRenderSession,
  saveUploadSession,
  type RenderSession,
  type UploadedMedia,
} from "@/lib/storage";
import { getRecipe } from "@/lib/render/recipes";
import { starterTextsForTemplate } from "@/lib/render/template-demo-texts";
import {
  EDIT_TRANSITIONS,
  newId,
  type TimelineClip,
  type TimelineTextLayer,
} from "@/lib/render/edit-options";

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
            m.kind === "video" ? recipe.videoMaxSeconds : recipe.imageSeconds,
        }));

        const nextTransitions = nextClips
          .slice(0, -1)
          .map(() => defaultTransition);

        setClips(nextClips);
        setTransitions(nextTransitions);
        const starters = starterTextsForTemplate(templateId, nextClips);
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
      };
      if (!res.ok) throw new Error(data.error || "Échec couverture.");
      setSelectedPath(sourcePath);
      setCoverUrl(data.coverUrl ?? preview ?? null);
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
      };
      if (!res.ok) throw new Error(data.error || "Échec couverture.");
      setSelectedPath(null);
      setCoverUrl(data.coverUrl ?? URL.createObjectURL(file));
      setPickerOpen(false);
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : "Erreur couverture.");
    } finally {
      setBusy(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const exportTimeline = async () => {
    if (!canEdit || exporting || !dirty) return;
    setExporting(true);
    setEditError(null);
    setWaitStatus("Montage HD en cours…");
    setWaitProgress(14);

    let tick: ReturnType<typeof setInterval> | null = setInterval(() => {
      setWaitProgress((p) => {
        if (p >= 86) return p;
        const room = 86 - p;
        return Math.min(86, p + Math.max(0.2, room * 0.02) + Math.random() * 0.4);
      });
    }, 700);

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

      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          medias,
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
              })),
          },
          replaceVideoId: result?.savedVideoId ?? null,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        signedUrl?: string;
        storagePath?: string;
        saved?: boolean;
        savedVideoId?: string | null;
        evicted?: number;
      };

      if (!res.ok) {
        throw new Error(data.error || "Échec de l’export.");
      }

      const signedUrl = data.signedUrl;
      const storagePath = data.storagePath;
      const saved = Boolean(data.saved);
      const savedVideoId = data.savedVideoId ?? result?.savedVideoId ?? null;
      const evicted = data.evicted ?? 0;

      if (!signedUrl || !storagePath) {
        throw new Error(data.error || "Échec de l’export.");
      }

      if (tick) {
        clearInterval(tick);
        tick = null;
      }
      setWaitStatus("Presque prêt…");
      setWaitProgress(100);

      const nextSession: RenderSession = {
        templateId,
        signedUrl,
        storagePath,
        saved,
        savedVideoId,
        evicted,
        mediaCount: medias.length,
        createdAt: new Date().toISOString(),
      };
      saveRenderSession(nextSession);
      setResult(nextSession);
      setExportedKey(snapshotKey(clips, transitions, texts));
      setCoverUrl(null);
      setSelectedPath(null);
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
            disabled={exporting || busy}
            exporting={exporting}
            dirty={dirty}
            hasExport={hasExport}
            onExport={() => void exportTimeline()}
          />
          {editError ? (
            <p className="mt-2 text-center text-[12px] text-red-400" role="alert">
              {editError}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-6 text-center text-[12px] text-muted">
          Session médias absente — relancez depuis Médias pour éditer.
        </p>
      )}

      {canSetCover ? (
        <div className="mt-8 text-left">
          <p className="text-[12px] font-medium tracking-wide text-pearl">
            Couverture
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={busy || exporting}
              onClick={() => void openPicker()}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-xl border transition-all",
                coverUrl
                  ? "border-gold/50"
                  : "border-dashed border-border-strong hover:border-gold/40",
              )}
              aria-label="Choisir la couverture"
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-muted">
                  <ImagePlus className="size-5" strokeWidth={1.5} />
                </span>
              )}
            </button>
            <button
              type="button"
              disabled={busy || exporting}
              onClick={() => void openPicker()}
              className="text-left text-[13px] font-medium text-pearl"
            >
              {coverUrl ? "Changer" : "Choisir une image"}
            </button>
          </div>
          {coverError && !pickerOpen ? (
            <p className="mt-2 text-[12px] text-red-400">{coverError}</p>
          ) : null}
        </div>
      ) : null}

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
              <h3 className="font-display text-lg font-semibold text-pearl">
                Couverture
              </h3>
              <button
                type="button"
                onClick={() => !busy && setPickerOpen(false)}
                className="flex size-9 items-center justify-center rounded-full border border-border"
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
