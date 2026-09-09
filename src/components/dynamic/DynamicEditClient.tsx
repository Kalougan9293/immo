"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import { CapCutEditor } from "@/components/rendu/CapCutEditor";
import { RenderWaitingOverlay } from "@/components/medias/RenderWaitingOverlay";
import { getRecipe } from "@/lib/render/recipes";
import {
  EDIT_TRANSITIONS,
  newId,
  type TimelineClip,
  type TimelineTextLayer,
} from "@/lib/render/edit-options";
import {
  AREO_MEDIA_BUCKET,
  loadRenderSession,
  resolveUploadFolder,
  saveRenderSession,
  uploadMediaFile,
  type RenderSession,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type DynamicEditClientProps = {
  templateId: string;
};

type CoverImage = {
  path: string;
  name: string;
  previewUrl: string;
};

function layersToTimeline(raw: unknown[] | undefined): TimelineTextLayer[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item, i) => {
    if (!item || typeof item !== "object") return [];
    const L = item as Record<string, unknown>;
    const content = typeof L.content === "string" ? L.content.trim() : "";
    if (!content) return [];
    return [
      {
        id: newId("txt"),
        content,
        fontId: typeof L.fontId === "string" ? L.fontId : "playfair",
        start: typeof L.start === "number" ? L.start : 0.4,
        duration: typeof L.duration === "number" ? L.duration : 2.5,
        x: typeof L.x === "number" ? L.x : 0.5,
        y: typeof L.y === "number" ? L.y : 0.76,
        scale: typeof L.scale === "number" ? L.scale : 1.1,
        color: typeof L.color === "string" ? L.color : "#F5F0E6",
        stroke:
          L.stroke === "none" ||
          L.stroke === "dark" ||
          L.stroke === "light" ||
          L.stroke === "gold"
            ? L.stroke
            : "dark",
        bg: null,
        bgAlpha: 0,
        lane: i % 2,
        look:
          L.look === "cinema" || L.look === "cinema-meta" ? L.look : undefined,
        fadeSec: typeof L.fadeSec === "number" ? L.fadeSec : undefined,
      } satisfies TimelineTextLayer,
    ];
  });
}

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
      color: t.color ?? "#F5F0E6",
      stroke: t.stroke ?? "dark",
      bg: t.bg ?? null,
      bgAlpha: t.bgAlpha ?? 0,
    })),
  });
}

export function DynamicEditClient({ templateId }: DynamicEditClientProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const addAtRef = useRef<"start" | "end">("end");
  const recipe = getRecipe(templateId);
  const defaultTransition =
    EDIT_TRANSITIONS.find((t) => t.id === recipe.transition)?.id ?? "fade";

  const [session, setSession] = useState<RenderSession | null>(null);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [texts, setTexts] = useState<TimelineTextLayer[]>([]);
  const [baselineKey, setBaselineKey] = useState("");
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitProgress, setWaitProgress] = useState(10);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState<CoverImage[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedCoverPath, setSelectedCoverPath] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const loaded = loadRenderSession();
    if (
      !loaded ||
      loaded.templateId !== templateId ||
      !loaded.masterStoragePath ||
      !loaded.masterSignedUrl
    ) {
      router.replace(`/creer/resultat?template=${templateId}`);
      return;
    }

    const duration = Math.max(4, loaded.durationSec ?? 12);
    const nextClips: TimelineClip[] = [
      {
        id: newId("clip"),
        path: loaded.masterStoragePath,
        name: "Reel cinéma",
        kind: "video",
        size: 0,
        previewUrl: loaded.masterSignedUrl,
        duration,
        trimStart: 0,
      },
    ];
    const nextTexts = layersToTimeline(loaded.textLayers);
    const nextTransitions: string[] = [];

    setSession(loaded);
    setClips(nextClips);
    setTransitions(nextTransitions);
    setTexts(nextTexts);
    setBaselineKey(snapshotKey(nextClips, nextTransitions, nextTexts));
    setCoverUrl(loaded.coverUrl ?? null);
    setSelectedCoverPath(loaded.coverPath ?? null);
    setReady(true);

    // Recharge / auto-cover si absente en session
    if (loaded.savedVideoId) {
      void (async () => {
        try {
          const res = await fetch(`/api/videos/${loaded.savedVideoId}`);
          const data = (await res.json()) as {
            coverUrl?: string | null;
            coverPath?: string | null;
            medias?: {
              path: string;
              kind: string;
              previewUrl?: string | null;
            }[];
          };
          if (!res.ok) return;

          if (data.coverUrl) {
            setCoverUrl(data.coverUrl);
            setSelectedCoverPath(data.coverPath ?? null);
            saveRenderSession({
              ...loaded,
              coverUrl: data.coverUrl,
              coverPath: data.coverPath ?? null,
            });
            return;
          }

          // Auto : 1ʳᵉ image source
          const first = (data.medias ?? []).find(
            (m) => m.kind === "image" && m.path,
          );
          if (!first) return;
          const apply = await fetch(
            `/api/videos/${loaded.savedVideoId}/cover`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sourcePath: first.path }),
            },
          );
          const applied = (await apply.json()) as {
            coverUrl?: string | null;
            coverPath?: string | null;
          };
          if (!apply.ok) return;
          setCoverUrl(applied.coverUrl ?? first.previewUrl ?? null);
          setSelectedCoverPath(applied.coverPath ?? first.path);
          saveRenderSession({
            ...loaded,
            coverUrl: applied.coverUrl ?? first.previewUrl ?? null,
            coverPath: applied.coverPath ?? first.path,
          });
        } catch {
          /* silencieux — couverture optionnelle */
        }
      })();
    }
  }, [templateId, router]);

  const dirty = useMemo(
    () =>
      Boolean(session && clips.length) &&
      snapshotKey(clips, transitions, texts) !== baselineKey,
    [session, clips, transitions, texts, baselineKey],
  );

  const pickAgentVideo = (position: "start" | "end") => {
    if (adding || exporting) return;
    addAtRef.current = position;
    fileRef.current?.click();
  };

  const openCoverPicker = async () => {
    if (!session?.savedVideoId || coverBusy || exporting) return;
    setPickerOpen(true);
    if (library.length) return;
    setLibraryLoading(true);
    try {
      const res = await fetch(`/api/videos/${session.savedVideoId}`);
      const data = (await res.json()) as {
        error?: string;
        medias?: {
          path: string;
          name: string;
          kind: string;
          previewUrl?: string | null;
        }[];
      };
      if (!res.ok) throw new Error(data.error || "Impossible de charger.");
      setLibrary(
        (data.medias ?? [])
          .filter((m) => m.kind === "image" && m.previewUrl)
          .map((m) => ({
            path: m.path,
            name: m.name,
            previewUrl: m.previewUrl as string,
          })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur couverture.");
    } finally {
      setLibraryLoading(false);
    }
  };

  const persistCover = (
    nextUrl: string | null,
    nextPath: string | null,
  ) => {
    setCoverUrl(nextUrl);
    setSelectedCoverPath(nextPath);
    if (!session) return;
    const next = {
      ...session,
      coverUrl: nextUrl,
      coverPath: nextPath,
    };
    setSession(next);
    saveRenderSession(next);
  };

  const applySourceCover = async (sourcePath: string, preview?: string) => {
    if (!session?.savedVideoId || coverBusy) return;
    setCoverBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${session.savedVideoId}/cover`, {
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
      persistCover(data.coverUrl ?? preview ?? null, data.coverPath ?? sourcePath);
      setPickerOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur couverture.");
    } finally {
      setCoverBusy(false);
    }
  };

  const uploadCover = async (file: File) => {
    if (!session?.savedVideoId || coverBusy) return;
    setCoverBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("cover", file);
      const res = await fetch(`/api/videos/${session.savedVideoId}/cover`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        error?: string;
        coverUrl?: string | null;
        coverPath?: string | null;
      };
      if (!res.ok) throw new Error(data.error || "Échec couverture.");
      persistCover(
        data.coverUrl ?? URL.createObjectURL(file),
        data.coverPath ?? null,
      );
      setPickerOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur couverture.");
    } finally {
      setCoverBusy(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const addAgentVideo = async (file: File, position: "start" | "end") => {
    setAdding(true);
    setError(null);
    try {
      const folder = await resolveUploadFolder();
      const uploaded = await uploadMediaFile(file, folder);
      const supabase = createClient();
      const { data } = await supabase.storage
        .from(AREO_MEDIA_BUCKET)
        .createSignedUrl(uploaded.path, 60 * 60);
      const previewUrl = data?.signedUrl ?? URL.createObjectURL(file);
      const agentDur = 4;
      const next: TimelineClip = {
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
          position === "start" ? [next, ...prev] : [...prev, next];
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
      setError(e instanceof Error ? e.message : "Upload impossible.");
    } finally {
      setAdding(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportPolish = async () => {
    if (!session || exporting || !clips.length) return;
    setExporting(true);
    setError(null);
    setWaitProgress(12);
    const tick = setInterval(() => {
      setWaitProgress((p) => (p >= 90 ? p : p + 1.5 + Math.random()));
    }, 400);

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          mode: "polish",
          medias: clips.map((c) => ({
            path: c.path,
            name: c.name,
            kind: c.kind,
          })),
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
                color: t.color ?? "#F5F0E6",
                stroke: t.stroke ?? "dark",
                bg: t.bg ?? null,
                bgAlpha: t.bgAlpha ?? 0,
                ...(t.look ? { look: t.look } : {}),
                ...(t.fadeSec != null ? { fadeSec: t.fadeSec } : {}),
              })),
            disableTripleStrip: true,
          },
          replaceVideoId: session.savedVideoId,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        signedUrl?: string;
        storagePath?: string;
        coverUrl?: string | null;
        coverPath?: string | null;
        saved?: boolean;
        savedVideoId?: string | null;
        evicted?: number;
      };

      if (!res.ok) throw new Error(data.error || "Échec de l’export.");
      if (!data.signedUrl || !data.storagePath) {
        throw new Error("URL manquante.");
      }

      const next: RenderSession = {
        ...session,
        signedUrl: data.signedUrl,
        storagePath: data.storagePath,
        saved: Boolean(data.saved),
        savedVideoId: data.savedVideoId ?? session.savedVideoId,
        evicted: data.evicted ?? 0,
        createdAt: new Date().toISOString(),
        textLayers: texts,
        coverUrl: data.coverUrl ?? coverUrl,
        coverPath: data.coverPath ?? selectedCoverPath,
      };
      saveRenderSession(next);
      clearInterval(tick);
      setWaitProgress(100);
      await new Promise((r) => setTimeout(r, 550));
      router.replace(`/creer/resultat?template=${templateId}`);
    } catch (e) {
      clearInterval(tick);
      setError(e instanceof Error ? e.message : "Erreur export.");
    } finally {
      setExporting(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted">
        Chargement…
      </div>
    );
  }

  const canCover = Boolean(session?.savedVideoId);

  return (
    <div className="relative flex w-full flex-1 flex-col pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="px-4 pt-1 text-center sm:px-6">
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
          Personnaliser
        </p>
        <p className="mt-1 text-[13px] text-muted">
          Timeline : <span className="text-pearl">Cover</span>,{" "}
          <span className="text-pearl">+ Intro</span>, Reel,{" "}
          <span className="text-pearl">+ Fin</span>.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void addAgentVideo(f, addAtRef.current);
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadCover(f);
        }}
      />

      {error ? (
        <p className="mt-2 px-4 text-center text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {adding ? (
        <p className="mt-2 px-4 text-center text-[12px] text-muted">
          Ajout de ta vidéo…
        </p>
      ) : null}

      <div className="mt-2 flex flex-1 flex-col">
        <CapCutEditor
          clips={clips}
          onClipsChange={setClips}
          transitions={transitions}
          onTransitionsChange={setTransitions}
          texts={texts}
          onTextsChange={setTexts}
          defaultTransition={defaultTransition}
          disabled={adding || coverBusy}
          exporting={exporting}
          onExport={() => void exportPolish()}
          onContinue={() =>
            router.push(`/creer/resultat?template=${templateId}`)
          }
          onAddBefore={() => pickAgentVideo("start")}
          onAddAfter={() => pickAgentVideo("end")}
          coverUrl={coverUrl}
          onCoverPress={canCover ? () => void openCoverPicker() : undefined}
          coverBusy={coverBusy}
          dirty={dirty}
          hasExport={Boolean(session?.signedUrl)}
        />
      </div>

      {exporting ? (
        <RenderWaitingOverlay
          previews={clips.map((c) => c.previewUrl || "").filter(Boolean)}
          status="Chargement"
          progress={waitProgress}
        />
      ) : null}

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
            onClick={() => !coverBusy && setPickerOpen(false)}
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
                onClick={() => !coverBusy && setPickerOpen(false)}
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
                        disabled={coverBusy}
                        onClick={() =>
                          void applySourceCover(img.path, img.previewUrl)
                        }
                        className={cn(
                          "relative aspect-square w-full overflow-hidden rounded-xl border touch-manipulation",
                          selectedCoverPath === img.path
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
                        {selectedCoverPath === img.path ? (
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
                      disabled={coverBusy}
                      onClick={() => coverInputRef.current?.click()}
                      className="flex aspect-square w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong text-muted-strong"
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
