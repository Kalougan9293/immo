-- ARÉO — Coffre Storage + tables (à coller dans Supabase → SQL Editor → Run)
-- Projet : LockIn (réutilisé pour ARÉO)

-- 1) Bucket médias sources + rendus
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'areo-media',
  'areo-media',
  false,
  104857600,
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif',
    'image/avif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Policies Storage
drop policy if exists "areo_auth_select" on storage.objects;
drop policy if exists "areo_auth_insert" on storage.objects;
drop policy if exists "areo_auth_update" on storage.objects;
drop policy if exists "areo_auth_delete" on storage.objects;
drop policy if exists "areo_guest_insert" on storage.objects;
drop policy if exists "areo_guest_select" on storage.objects;

-- Connectés : dossier = leur user_id
create policy "areo_auth_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'areo-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "areo_auth_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'areo-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "areo_auth_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'areo-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "areo_auth_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'areo-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Invités (test sans compte) : dossier guest/
create policy "areo_guest_insert"
on storage.objects for insert to anon
with check (
  bucket_id = 'areo-media'
  and (storage.foldername(name))[1] = 'guest'
);

create policy "areo_guest_select"
on storage.objects for select to anon
using (
  bucket_id = 'areo-media'
  and (storage.foldername(name))[1] = 'guest'
);

-- 3) Table vidéos finales (bibliothèque compte, max 3 côté app)
create table if not exists public.areo_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text not null,
  title text,
  storage_path text not null,
  source_paths text[] default '{}',
  created_at timestamptz not null default now()
);

create index if not exists areo_videos_user_created_idx
  on public.areo_videos (user_id, created_at desc);

alter table public.areo_videos enable row level security;

drop policy if exists "areo_videos_select_own" on public.areo_videos;
drop policy if exists "areo_videos_insert_own" on public.areo_videos;
drop policy if exists "areo_videos_delete_own" on public.areo_videos;

create policy "areo_videos_select_own"
on public.areo_videos for select to authenticated
using (auth.uid() = user_id);

create policy "areo_videos_insert_own"
on public.areo_videos for insert to authenticated
with check (auth.uid() = user_id);

create policy "areo_videos_delete_own"
on public.areo_videos for delete to authenticated
using (auth.uid() = user_id);
