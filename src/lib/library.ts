import { createClient } from "@/lib/supabase/server";
import { AREO_MEDIA_BUCKET } from "@/lib/storage";

export type LibraryVideo = {
  id: string;
  title: string;
  templateId: string;
  createdAt: string;
  signedUrl: string | null;
  coverUrl: string | null;
  hasSources: boolean;
};

export async function getUserLibraryVideos(): Promise<LibraryVideo[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("areo_videos")
    .select(
      "id, title, template_id, created_at, storage_path, cover_path, source_paths",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error || !data) return [];

  const videos: LibraryVideo[] = [];

  for (const row of data) {
    const { data: signed } = await supabase.storage
      .from(AREO_MEDIA_BUCKET)
      .createSignedUrl(row.storage_path as string, 60 * 60);

    let coverUrl: string | null = null;
    if (row.cover_path) {
      const { data: coverSigned } = await supabase.storage
        .from(AREO_MEDIA_BUCKET)
        .createSignedUrl(row.cover_path as string, 60 * 60);
      coverUrl = coverSigned?.signedUrl ?? null;
    }

    const sources = Array.isArray(row.source_paths)
      ? (row.source_paths as string[])
      : [];

    videos.push({
      id: row.id as string,
      title: (row.title as string) || "Vidéo ARÉO",
      templateId: row.template_id as string,
      createdAt: row.created_at as string,
      signedUrl: signed?.signedUrl ?? null,
      coverUrl,
      hasSources: sources.length > 0,
    });
  }

  return videos;
}
