-- GyaanGuru database schema for Supabase.
--
-- Run this whole file in the Supabase SQL editor. It is idempotent: safe to re-run,
-- and it upgrades databases created with the older scripts/00x_*.sql migrations.
--
-- Tables: profiles, roadmaps, progress. NSQF reference data is read from
-- data/*.json by the app, so no reference table is needed.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by the on_auth_user_created trigger
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  points integer not null default 0,
  onboarded boolean not null default false,
  onboarded_at timestamptz,
  onboarding_data jsonb, -- onboarding form answers; also holds current_nsqf_level
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists points integer not null default 0;
alter table public.profiles add column if not exists onboarded boolean not null default false;
alter table public.profiles add column if not exists onboarded_at timestamptz;
alter table public.profiles add column if not exists onboarding_data jsonb;

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic points change for the calling user, clamped at 0. Runs as the caller (security invoker),
-- so RLS limits it to the caller's own profile row. Used by /api/progress.
create or replace function public.adjust_points(delta integer)
returns integer
language sql
set search_path = public
as $$
  update public.profiles
     set points = greatest(0, coalesce(points, 0) + delta)
   where id = auth.uid()
  returning points;
$$;

revoke all on function public.adjust_points(integer) from public;
do $$
begin
  -- Supabase's default privileges grant EXECUTE to anon; signed-out callers have no row to update anyway.
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.adjust_points(integer) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.adjust_points(integer) to authenticated;
  end if;
end $$;

-- Backfill profiles for users who signed up before the trigger existed.
insert into public.profiles (id, email, full_name)
select u.id, u.email, u.raw_user_meta_data ->> 'full_name'
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- roadmaps: generated learning roadmaps; `content` holds the module/topic tree
-- ---------------------------------------------------------------------------
create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  topic text not null,
  experience_level text,
  goal text,
  time_commitment text,
  additional_info text,
  content jsonb not null, -- { title, description, modules: [{ id, title, topics: [...] }], nsqf? }
  nsqf_level integer,
  nsqf_description text,
  created_at timestamptz not null default now()
);

alter table public.roadmaps add column if not exists nsqf_level integer;
alter table public.roadmaps add column if not exists nsqf_description text;

create index if not exists idx_roadmaps_user_id on public.roadmaps(user_id);
create index if not exists idx_roadmaps_created_at on public.roadmaps(created_at desc);

alter table public.roadmaps enable row level security;

drop policy if exists "Users can view their own roadmaps" on public.roadmaps;
create policy "Users can view their own roadmaps"
  on public.roadmaps for select using (auth.uid() = user_id);

drop policy if exists "Users can create their own roadmaps" on public.roadmaps;
drop policy if exists "Users can insert their own roadmaps" on public.roadmaps;
create policy "Users can insert their own roadmaps"
  on public.roadmaps for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own roadmaps" on public.roadmaps;
create policy "Users can update their own roadmaps"
  on public.roadmaps for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own roadmaps" on public.roadmaps;
create policy "Users can delete their own roadmaps"
  on public.roadmaps for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- progress: one row per completed topic, addressed by its position in
-- roadmaps.content.modules[module_index].topics[topic_index]
-- ---------------------------------------------------------------------------
create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  module_index integer not null,
  topic_index integer not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Upgrade path for databases created by 001_setup_database.sql / 003_create_progress_table.sql,
-- which keyed progress by a topic_id column the app never writes.
alter table public.progress add column if not exists module_index integer;
alter table public.progress add column if not exists topic_index integer;
alter table public.progress add column if not exists completed_at timestamptz;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'progress' and column_name = 'topic_id'
  ) then
    alter table public.progress alter column topic_id drop not null;
  end if;
end $$;

-- /api/progress upserts with onConflict "user_id,roadmap_id,module_index,topic_index".
create unique index if not exists progress_user_roadmap_position_key
  on public.progress(user_id, roadmap_id, module_index, topic_index);
create index if not exists idx_progress_user_id on public.progress(user_id);
create index if not exists idx_progress_roadmap_id on public.progress(roadmap_id);

alter table public.progress enable row level security;

drop policy if exists "Users can view their own progress" on public.progress;
create policy "Users can view their own progress"
  on public.progress for select using (auth.uid() = user_id);

drop policy if exists "Users can create their own progress" on public.progress;
drop policy if exists "Users can insert their own progress" on public.progress;
create policy "Users can insert their own progress"
  on public.progress for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own progress" on public.progress;
create policy "Users can update their own progress"
  on public.progress for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own progress" on public.progress;
create policy "Users can delete their own progress"
  on public.progress for delete using (auth.uid() = user_id);

-- Make PostgREST pick up new columns immediately (avoids PGRST204 right after migrating).
notify pgrst, 'reload schema';
