"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, Trash2, Film, FileImage } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  resolveUploadFolder,
  saveUploadSession,
  clearRenderSession,
  loadUploadSession,
  uploadMediaFile,
  type UploadedMedia,
} from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  MAX_PHOTOS_PER_REEL,
  MEDIA_LIMITS_COPY,
  MIN_PHOTOS_PER_REEL,
  countMediaKinds,
  validateMediaSelection,
} from "@/lib/media-limits";
import { RenderWaitingOverlay } from "@/components/medias/RenderWaitingOverlay";
import { useT } from "@/components/i18n/I18nProvider";

const ACCEPT =
  "image/*,.heic,.heif,.webp,.avif,.jpg,.jpeg,.png,.gif,.bmp,.tif,.tiff";

type MediaItem = {
  id: string;
  file?: File;
  remotePath?: string;
  name: string;
  previewUrl: string;
  kind: "image" | "video" | "other";
  revokeOnRemove: boolean;
  durationSec?: number;
};

type MediaUploaderProps = {
  templateId: string;
  /** Recharge la session (flux Refaire) */
  restoreSession?: boolean;
  /** classic → CapCut ; dynamic → infos → generation cinema */
  flow?: "classic" | "dynamic";
};

function detectKind(file: File): MediaItem["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (
    ext &&
    [
      "heic",
      "heif",
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "bmp",
      "tif",
      "tiff",
      "avif",
    ].includes(ext)
  ) {
    return "image";
  }
  if (ext && ["mp4", "mov", "m4v", "webm", "avi", "mkv"].includes(ext)) {
    return "video";
  }
  return "other";
}

export function MediaUploader({
  templateId,
  restoreSession = false,
  flow = "classic",
}: MediaUploaderProps) {
  const t = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [working, setWorking] = useState(false);
  const [waitStatus, setWaitStatus] = useState(t.media.preparing);
  const [waitProgress, setWaitProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(!restoreSession);

  useEffect(() => {
    if (!restoreSession) return;
    const session = loadUploadSession();
    if (session?.templateId === templateId && session.medias.length) {
      setItems(
        session.medias.map((m, i) => ({
          id: `remote-${i}-${m.path}`,
          remotePath: m.path,
          name: m.name,
          previewUrl: m.previewUrl || "",
          kind: m.kind,
          revokeOnRemove: false,
        })),
      );
    }
    setHydrated(true);
  }, [restoreSession, templateId]);

  const { photos: photoCount } = countMediaKinds(items);
  const canAddPhoto = photoCount < MAX_PHOTOS_PER_REEL;
  const atLimit = !canAddPhoto;
  const selectionError = validateMediaSelection(items);
  const canContinue = !selectionError;

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    let photosLeft =
      MAX_PHOTOS_PER_REEL - items.filter((i) => i.kind === "image").length;

    if (photosLeft <= 0) {
      setError(MEDIA_LIMITS_COPY.tooManyPhotos);
      return;
    }

    const accepted: MediaItem[] = [];
    const messages: string[] = [];

    for (const file of files) {
      const kind = detectKind(file);
      if (kind === "video") {
        messages.push(MEDIA_LIMITS_COPY.noVideo);
        continue;
      }
      if (kind === "other") {
        messages.push(`${file.name} : format non supporté.`);
        continue;
      }
      if (photosLeft <= 0) {
        messages.push(MEDIA_LIMITS_COPY.tooManyPhotos);
        continue;
      }

      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        kind: "image",
        revokeOnRemove: true,
      });
      photosLeft -= 1;
    }

    if (accepted.length) {
      setItems((prev) => [...prev, ...accepted]);
    }
    setError(messages.length ? messages[0] : null);
  }, [items]);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.revokeOnRemove && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
    setError(null);
  };

  const moveItem = (from: number, to: number) => {
    if (working) return;
    setItems((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const onItemDragStart = (e: DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const onItemDrop = (e: DragEvent, toIndex: number) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isFinite(from)) moveItem(from, toIndex);
  };

  const openPicker = () => {
    if (atLimit || working) return;
    inputRef.current?.click();
  };

  const handleContinue = async () => {
    if (working) return;
    const invalid = validateMediaSelection(items);
    if (invalid) {
      setError(invalid);
      return;
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase non configuré (.env.local).");
      return;
    }

    setWorking(true);
    setError(null);
    setWaitStatus(t.media.preparing);
    setWaitProgress(4);

    try {
      const folder = await resolveUploadFolder();
      const uploaded: UploadedMedia[] = [];
      const toUpload = items.filter((i) => i.file);

      let uploadedCount = 0;
      for (const item of items) {
        if (item.remotePath) {
          uploaded.push({
            path: item.remotePath,
            name: item.name,
            kind: item.kind,
            size: item.file?.size ?? 0,
            previewUrl: item.previewUrl || undefined,
          });
          continue;
        }
        if (!item.file) continue;
        setWaitStatus(t.media.uploading);
        const result = await uploadMediaFile(item.file, folder);
        uploaded.push({
          ...result,
          previewUrl: item.previewUrl || undefined,
        });
        uploadedCount += 1;
        setWaitProgress(
          Math.round(
            (uploadedCount / Math.max(1, toUpload.length)) * 92,
          ),
        );
      }

      if (!uploaded.length) {
        throw new Error("Aucun média valide.");
      }

      // Même parcours DYNAMIC / CLASSIC : écriture → textes → timeline
      clearRenderSession();
      saveUploadSession({
        templateId,
        medias: uploaded,
        createdAt: new Date().toISOString(),
      });

      setWaitStatus(t.media.openingEditor);
      setWaitProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      router.push(`/creer/infos?template=${templateId}`);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Échec de l’envoi.";
      setError(
        message.includes("Bucket") || message.includes("not found")
          ? "Coffre absent : exécute le SQL supabase/migrations/001_areo_storage.sql dans Supabase."
          : message,
      );
      setWorking(false);
      setWaitProgress(0);
    }
  };

  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      if (!atLimit && !working) setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!atLimit && !working) setDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (atLimit || working) return;
      if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
    },
  };

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted">
        {t.common.loading}
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="animate-fade-up px-5 pt-1 text-center sm:px-8">
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
          {t.media.step}
        </p>
        <h2 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-pearl sm:text-4xl">
          {t.media.title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted">
          {t.media.hint}
        </p>
      </div>

      <div className="animate-fade-up animate-delay-1 mx-auto mt-6 flex w-full max-w-lg flex-1 flex-col px-5 sm:max-w-xl sm:px-8">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          disabled={working || atLimit}
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* État vide : grande zone d’ajout */}
        {items.length === 0 ? (
          <button
            type="button"
            onClick={openPicker}
            disabled={working}
            {...dropHandlers}
            className={cn(
              "relative flex min-h-[52vh] w-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed transition-all duration-300 outline-none disabled:opacity-60",
              dragging
                ? "border-gold/70 bg-gold-soft shadow-[0_0_40px_rgba(196,165,116,0.2)]"
                : "border-border-strong bg-surface/80 hover:border-gold/40 hover:bg-surface-elevated",
            )}
          >
            <div
              className={cn(
                "flex size-20 items-center justify-center rounded-2xl border transition-colors",
                dragging
                  ? "border-gold/50 bg-gold/20 text-gold"
                  : "border-white/12 bg-white/[0.04] text-pearl",
              )}
            >
              <Plus className="size-10" strokeWidth={1.5} />
            </div>
            <p className="mt-5 text-[19px] font-medium tracking-wide text-pearl sm:text-[21px]">
              {t.media.dropTitle}
            </p>
            <p className="mt-2 max-w-[220px] text-center text-[12px] leading-relaxed text-muted">
              {t.media.dropHint}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-[13px] tracking-[0.14em] text-muted-strong uppercase sm:text-[14px]">
              <ImagePlus className="size-5" strokeWidth={1.75} />
              {t.media.browse}
            </span>
          </button>
        ) : (
          /* État rempli : grille — « + » fixe en case 1, médias ensuite */
          <div {...dropHandlers}>
            <p className="mb-3 text-[12px] tracking-wide text-muted">
              {photoCount}/{MAX_PHOTOS_PER_REEL} photos
              {photoCount < MIN_PHOTOS_PER_REEL ? (
                <span className="text-gold">
                  {" "}
                  · encore {MIN_PHOTOS_PER_REEL - photoCount}
                </span>
              ) : null}
              {items.length > 1 ? (
                <span className="text-muted-strong">
                  {" "}
                  · {t.media.reorder}
                </span>
              ) : null}
            </p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <li>
                <button
                  type="button"
                  disabled={working || atLimit}
                  onClick={openPicker}
                  className={cn(
                    "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed transition-colors",
                    atLimit
                      ? "cursor-not-allowed border-border text-muted opacity-50"
                      : dragging
                        ? "border-gold/60 bg-gold-soft text-gold"
                        : "border-border-strong text-muted-strong hover:border-gold/40 hover:text-pearl",
                  )}
                  aria-label={
                    atLimit
                      ? `Limite atteinte (${MAX_PHOTOS_PER_REEL} photos max)`
                      : "Ajouter encore"
                  }
                >
                  <Plus className="size-6" strokeWidth={1.5} />
                  <span className="text-[10px] tracking-wide uppercase">
                    {atLimit ? "Max" : "Ajouter"}
                  </span>
                </button>
              </li>

              {items.map((item, index) => (
                <li
                  key={item.id}
                  draggable={!working}
                  onDragStart={(e) => onItemDragStart(e, index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onItemDrop(e, index)}
                  className="group relative aspect-square cursor-grab overflow-hidden rounded-xl border border-border bg-surface active:cursor-grabbing"
                >
                  {item.kind === "image" && item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="pointer-events-none h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : item.kind === "video" && item.previewUrl ? (
                    <video
                      src={item.previewUrl}
                      muted
                      playsInline
                      className="pointer-events-none h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
                      {item.kind === "video" ? (
                        <Film className="size-5" strokeWidth={1.5} />
                      ) : (
                        <FileImage className="size-5" strokeWidth={1.5} />
                      )}
                      <span className="max-w-[90%] truncate px-1 text-[9px]">
                        {item.name}
                      </span>
                    </div>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => removeItem(item.id)}
                    className="absolute top-1.5 right-1.5 flex size-9 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-black/55 text-white opacity-100 backdrop-blur-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-40"
                    aria-label="Retirer"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error ? (
          <p className="mt-4 text-center text-[13px] text-red-400" role="alert">
            {error}
          </p>
        ) : selectionError && items.length > 0 ? (
          <p className="mt-4 text-center text-[13px] text-muted" role="status">
            {selectionError}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 px-5 pt-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-lg justify-center sm:max-w-xl">
          <Button
            fullWidth
            className="sm:w-auto sm:min-w-[220px]"
            variant={canContinue ? "gold" : "primary"}
            disabled={!canContinue || working}
            showArrow={!working}
            onClick={() => void handleContinue()}
          >
            {flow === "dynamic" ? "Continuer" : t.media.continueEdit}
          </Button>
        </div>
      </div>

      {working ? (
        <RenderWaitingOverlay
          previews={items.map((i) => i.previewUrl).filter(Boolean)}
          status={waitStatus}
          progress={waitProgress}
        />
      ) : null}
    </div>
  );
}
