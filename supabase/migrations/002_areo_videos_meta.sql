-- ARÉO — Métadonnées bibliothèque (couverture + update)
-- À coller dans Supabase → SQL Editor → Run

alter table public.areo_videos
  add column if not exists cover_path text;

drop policy if exists "areo_videos_update_own" on public.areo_videos;

create policy "areo_videos_update_own"
on public.areo_videos for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
