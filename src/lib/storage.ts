import { createClient } from "@/lib/supabase/client";

export const AREO_MEDIA_BUCKET = "areo-media";

export const UPLOAD_SESSION_KEY = "areo-upload-session";
export const RENDER_SESSION_KEY = "areo-render-session";

export type UploadedMedia = {
  path: string;
  name: string;
  kind: "image" | "video" | "other";
  size: number;
  /** Aperçu signé (ex. Refaire) — session only */
  previewUrl?: string;
};

export type UploadSession = {
  templateId: string;
  medias: UploadedMedia[];
  createdAt: string;
};

export type RenderSession = {
  templateId: string;
  signedUrl: string;
  storagePath: string;
  /** Master DYNAMIC sans textes (pour re-éditer) */
  masterStoragePath?: string | null;
  masterSignedUrl?: string | null;
  textLayers?: unknown[];
  durationSec?: number | null;
  /** Couverture (poster) — auto 1ʳᵉ photo, changeable */
  coverUrl?: string | null;
  coverPath?: string | null;
  saved: boolean;
  savedVideoId: string | null;
  evicted: number;
  mediaCount: number;
  createdAt: string;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
}

export async function resolveUploadFolder(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) return user.id;

  const guestKey = "areo-guest-id";
  let guestId = window.localStorage.getItem(guestKey);
  if (!guestId) {
    guestId = crypto.randomUUID();
    window.localStorage.setItem(guestKey, guestId);
  }
  return `guest/${guestId}`;
}

export async function uploadMediaFile(
  file: File,
  folder: string,
): Promise<UploadedMedia> {
  const supabase = createClient();
  const safeName = sanitizeFileName(file.name);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { error } = await supabase.storage
    .from(AREO_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    throw new Error(error.message);
  }

  const kind = file.type.startsWith("video/")
    ? "video"
    : file.type.startsWith("image/")
      ? "image"
      : "other";

  return {
    path,
    name: file.name,
    kind,
    size: file.size,
  };
}

export function saveUploadSession(session: UploadSession) {
  window.sessionStorage.setItem(UPLOAD_SESSION_KEY, JSON.stringify(session));
}

export function loadUploadSession(): UploadSession | null {
  const raw = window.sessionStorage.getItem(UPLOAD_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UploadSession;
  } catch {
    return null;
  }
}

export function saveRenderSession(session: RenderSession) {
  window.sessionStorage.setItem(RENDER_SESSION_KEY, JSON.stringify(session));
}

export function loadRenderSession(): RenderSession | null {
  const raw = window.sessionStorage.getItem(RENDER_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RenderSession;
  } catch {
    return null;
  }
}

export function clearRenderSession() {
  window.sessionStorage.removeItem(RENDER_SESSION_KEY);
}
