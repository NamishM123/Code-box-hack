-- Run in Supabase SQL Editor or through the Supabase CLI after creating the project.
-- Every user-owned row is protected by auth.uid().

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null default 'Untitled room',
  room_type text not null check (room_type in ('living', 'bedroom', 'office', 'studio')),
  width_ft numeric,
  depth_ft numeric,
  detected_room jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_photos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.room_designs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null default 'Untitled layout',
  layout jsonb not null default '{}'::jsonb,
  saved_products jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.room_photos enable row level security;
alter table public.room_designs enable row level security;

create policy "Users manage their rooms" on public.rooms for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their room photos" on public.room_photos for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their room designs" on public.room_designs for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public) values ('room-photos', 'room-photos', false) on conflict (id) do nothing;
create policy "Users upload their room photos" on storage.objects for insert to authenticated with check (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users read their room photos" on storage.objects for select to authenticated using (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users update their room photos" on storage.objects for update to authenticated using (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users delete their room photos" on storage.objects for delete to authenticated using (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
