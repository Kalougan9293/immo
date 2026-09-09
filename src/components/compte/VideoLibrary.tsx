"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Film,
  ImagePlus,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import type { LibraryVideo } from "@/lib/library";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { saveUploadSession, type UploadedMedia } from "@/lib/storage";
import { downloadFile } from "@/lib/download";
import { DEFAULT_TEMPLATE_ID } from "@/lib/product";

type VideoLibraryProps = {
  videos: LibraryVideo[];
};

type LocalVideo = LibraryVideo;

export function VideoLibrary({ videos: initial }: VideoLibraryProps) {
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState<LocalVideo[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [busy, setBusy] = useState<
    "rename" | "cover" | "redo" | "download" | "delete" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const active = videos.find((v) => v.id === activeId) ?? null;

  useEffect(() => {
    setVideos(initial);
  }, [initial]);

  useEffect(() => {
    if (!active) {
      setEditingTitle(false);
      setError(null);
      setConfirmDelete(false);
      return;
    }
    setTitleDraft(active.title);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmDelete) setConfirmDelete(false);
        else setActiveId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active, confirmDelete]);

  const updateLocal = useCallback((id: string, patch: Partial<LocalVideo>) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    );
  }, []);

  const saveTitle = async () => {
    if (!active || busy) return;
    const title = titleDraft.trim();
    if (!title || title === active.title) {
      setEditingTitle(false);
      setTitleDraft(active.title);
      return;
    }

    setBusy("rename");
    setError(null);
    try {
      const res = await fetch(`/api/videos/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await res.json()) as { error?: string; title?: string };
      if (!res.ok) throw new Error(data.error || "Échec du renommage.");
      updateLocal(active.id, { title: data.title || title });
      setEditingTitle(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur renommage.");
    } finally {
      setBusy(null);
    }
  };

  const onCoverPicked = async (fileList: FileList | null) => {
    if (!active || !fileList?.[0] || busy) return;
    const file = fileList[0];
    setBusy("cover");
    setError(null);
    try {
      const form = new FormData();
      form.append("cover", file);
      const res = await fetch(`/api/videos/${active.id}/cover`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        error?: string;
        coverUrl?: string | null;
      };
      if (!res.ok) throw new Error(data.error || "Échec couverture.");
      updateLocal(active.id, { coverUrl: data.coverUrl ?? null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur couverture.");
    } finally {
      setBusy(null);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const startRedo = async () => {
    if (!active || busy) return;
    if (!active.hasSources) {
      setError("Médias sources indisponibles pour cette vidéo.");
      return;
    }

    setBusy("redo");
    setError(null);
    try {
      const res = await fetch(`/api/videos/${active.id}`);
      const data = (await res.json()) as {
        error?: string;
        templateId?: string;
        medias?: (UploadedMedia & { previewUrl?: string | null })[];
      };
      if (!res.ok || !data.templateId || !data.medias?.length) {
        throw new Error(data.error || "Impossible de reprendre ce montage.");
      }

      saveUploadSession({
        templateId: data.templateId,
        medias: data.medias.map((m) => ({
          path: m.path,
          name: m.name,
          kind: m.kind,
          size: m.size,
          previewUrl: m.previewUrl || undefined,
        })),
        createdAt: new Date().toISOString(),
      });

      router.push(`/creer/medias?template=${DEFAULT_TEMPLATE_ID}&refaire=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur Refaire.");
      setBusy(null);
    }
  };

  const deleteVideo = async () => {
    if (!active || busy) return;

    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/videos/${active.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Échec de la suppression.");
      setVideos((prev) => prev.filter((v) => v.id !== active.id));
      setConfirmDelete(false);
      setActiveId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur suppression.");
      setBusy(null);
      setConfirmDelete(false);
    }
  };

  if (videos.length === 0) {
    return (
      <div className="workspace-empty flex flex-1 flex-col items-center justify-center rounded-[1.5rem] px-6 py-12">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-surface text-muted-strong">
          <Film className="size-5" strokeWidth={1.5} />
        </div>
        <p className="mt-5 text-center text-[14px] font-medium tracking-wide text-pearl">
          Aucune création pour l’instant
        </p>
        <p className="mt-2 max-w-[220px] text-center text-[12px] leading-relaxed text-muted">
          Vos vidéos s’afficheront ici après génération.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-[12px] tracking-wide text-muted">
        {videos.length} vidéo{videos.length > 1 ? "s" : ""}
      </p>
      <ul className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {videos.map((video) => (
          <li key={video.id}>
            <button
              type="button"
              onClick={() => setActiveId(video.id)}
              className={cn(
                "group relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-surface text-left outline-none transition-all",
                "hover:border-gold/40 active:scale-[0.98]",
              )}
              aria-label={`Ouvrir ${video.title}`}
            >
              {video.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.coverUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : video.signedUrl ? (
                <video
                  src={video.signedUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-black/60 text-muted">
                  <Film className="size-5" strokeWidth={1.5} />
                </div>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
              <span className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white opacity-90 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <Play className="size-3.5 fill-current" strokeWidth={0} />
              </span>
              <span className="absolute inset-x-0 bottom-0 truncate px-2 pb-2 text-[10px] font-medium text-white/95">
                {video.title}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
        >
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => !busy && setActiveId(null)}
          />

          <div className="relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-surface shadow-[0_-8px_48px_rgba(0,0,0,0.45)] sm:mx-4 sm:rounded-[1.75rem]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                {editingTitle ? (
                  <input
                    autoFocus
                    value={titleDraft}
                    maxLength={80}
                    disabled={busy === "rename"}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={() => void saveTitle()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveTitle();
                      }
                      if (e.key === "Escape") {
                        setEditingTitle(false);
                        setTitleDraft(active.title);
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-display text-lg font-semibold text-pearl outline-none focus:border-gold/50"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingTitle(true)}
                    className="group flex max-w-full items-center gap-2 text-left"
                  >
                    <h3 className="truncate font-display text-xl font-semibold tracking-wide text-pearl">
                      {active.title}
                    </h3>
                    <Pencil
                      className="size-3.5 shrink-0 text-muted opacity-70 transition-opacity group-hover:opacity-100"
                      strokeWidth={1.75}
                    />
                  </button>
                )}
                <p className="mt-0.5 text-[11px] text-muted">
                  {new Date(active.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setActiveId(null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-strong transition-colors hover:border-border-strong hover:text-pearl"
                aria-label="Fermer"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="relative mx-auto aspect-[9/16] w-full max-h-[min(44dvh,420px)] overflow-hidden bg-black sm:max-h-[min(50dvh,500px)]">
                {active.signedUrl ? (
                  <video
                    key={active.signedUrl}
                    src={active.signedUrl}
                    controls
                    playsInline
                    autoPlay
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[13px] text-muted">
                    Aperçu indisponible
                  </div>
                )}
              </div>

              <div className="space-y-2 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {error ? (
                  <p className="text-center text-[12px] text-red-400" role="alert">
                    {error}
                  </p>
                ) : null}

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onCoverPicked(e.target.files)}
                />

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    fullWidth
                    variant="ghost"
                    icon={busy === "cover" ? Loader2 : ImagePlus}
                    disabled={Boolean(busy)}
                    className={busy === "cover" ? "[&_svg]:animate-spin" : undefined}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    Couverture
                  </Button>
                  {active.signedUrl ? (
                    <Button
                      fullWidth
                      variant="gold"
                      icon={busy === "download" ? Loader2 : Download}
                      disabled={Boolean(busy)}
                      className={
                        busy === "download" ? "[&_svg]:animate-spin" : undefined
                      }
                      onClick={() => {
                        if (busy || !active.signedUrl) return;
                        setBusy("download");
                        setError(null);
                        void downloadFile(
                          active.signedUrl,
                          `${active.title.replace(/[^\w\- ]+/g, "").trim() || "areo"}.mp4`,
                        )
                          .catch(() => {
                            setError("Téléchargement impossible. Réessayez.");
                          })
                          .finally(() => setBusy(null));
                      }}
                    >
                      {busy === "download" ? "…" : "Télécharger"}
                    </Button>
                  ) : (
                    <Button fullWidth variant="ghost" disabled>
                      Télécharger
                    </Button>
                  )}
                  <Button
                    fullWidth
                    variant="ghost"
                    icon={busy === "redo" ? Loader2 : RefreshCw}
                    disabled={Boolean(busy) || !active.hasSources}
                    className={busy === "redo" ? "[&_svg]:animate-spin" : undefined}
                    onClick={() => void startRedo()}
                  >
                    Refaire
                  </Button>
                  <Button
                    fullWidth
                    variant="ghost"
                    icon={busy === "delete" ? Loader2 : Trash2}
                    disabled={Boolean(busy)}
                    className={cn(
                      "text-red-400 hover:text-red-300",
                      busy === "delete" && "[&_svg]:animate-spin",
                    )}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Effacer
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {confirmDelete ? (
            <div
              className="animate-fade-in absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-confirm-title"
            >
              <div className="w-full max-w-xs rounded-2xl border border-border bg-surface p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                <p
                  id="delete-confirm-title"
                  className="text-center font-display text-xl font-medium text-pearl"
                >
                  Êtes-vous sûr ?
                </p>
                <p className="mt-2 text-center text-[13px] leading-relaxed text-muted">
                  Cette vidéo sera définitivement effacée.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button
                    fullWidth
                    variant="ghost"
                    disabled={busy === "delete"}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Non
                  </Button>
                  <Button
                    fullWidth
                    variant="gold"
                    disabled={busy === "delete"}
                    icon={busy === "delete" ? Loader2 : undefined}
                    className={cn(
                      "border-red-400/40 bg-red-500/15 text-red-200 hover:border-red-400/60 hover:bg-red-500/25",
                      busy === "delete" && "[&_svg]:animate-spin",
                    )}
                    onClick={() => void deleteVideo()}
                  >
                    Oui
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
