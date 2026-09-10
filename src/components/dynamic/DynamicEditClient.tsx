"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { runRenderApi } from "@/lib/render/client";

type DynamicEditClientProps = {
  templateId: string;
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
        bg:
          typeof L.bg === "string" && /^#[0-9A-Fa-f]{6}$/.test(L.bg)
            ? L.bg
            : null,
        bgAlpha: typeof L.bgAlpha === "number" ? L.bgAlpha : 0,
        italic: L.italic === true,
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
  const [coverPath, setCoverPath] = useState<string | null>(null);

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
    setCoverPath(loaded.coverPath ?? null);
    setReady(true);

    // Sync cover depuis le compte (choisie à l’étape médias)
    if (loaded.savedVideoId && !loaded.coverUrl) {
      void (async () => {
        try {
          const res = await fetch(`/api/videos/${loaded.savedVideoId}`);
          const data = (await res.json()) as {
            coverUrl?: string | null;
            coverPath?: string | null;
          };
          if (!res.ok || !data.coverUrl) return;
          setCoverUrl(data.coverUrl);
          setCoverPath(data.coverPath ?? null);
          saveRenderSession({
            ...loaded,
            coverUrl: data.coverUrl,
            coverPath: data.coverPath ?? null,
          });
        } catch {
          /* silencieux */
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
    setWaitProgress(8);
    const startedAt = Date.now();
    const tick = setInterval(() => {
      const ratio = (Date.now() - startedAt) / 18_000;
      const eased = 1 - Math.exp(-ratio * 1.6);
      setWaitProgress(Math.min(90, 8 + eased * 82));
    }, 350);

    try {
      const data = await runRenderApi({
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
              enter: t.enter ?? "fade",
              exit: t.exit ?? "fade",
            })),
          disableTripleStrip: true,
        },
        replaceVideoId: session.savedVideoId,
        coverPath,
      });

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
        coverPath: data.coverPath ?? coverPath,
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

  return (
    <div className="relative flex w-full flex-1 flex-col pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="px-4 pt-1 text-center sm:px-6">
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
          Personnaliser
        </p>
        <p className="mt-1 text-[13px] text-muted">
          Timeline : <span className="text-pearl">+ Intro</span>, Reel,{" "}
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
          disabled={adding}
          exporting={exporting}
          onExport={() => void exportPolish()}
          onContinue={() =>
            router.push(`/creer/resultat?template=${templateId}`)
          }
          onAddBefore={() => pickAgentVideo("start")}
          onAddAfter={() => pickAgentVideo("end")}
          dirty={dirty}
          hasExport={Boolean(session?.signedUrl)}
          lockFont
        />
      </div>

      {exporting ? (
        <RenderWaitingOverlay
          previews={clips.map((c) => c.previewUrl || "").filter(Boolean)}
          status="Chargement"
          progress={waitProgress}
        />
      ) : null}
    </div>
  );
}
