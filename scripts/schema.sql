-- GyaanGuru database schema for Supabase.
--
-- Run this whole file in the Supabase SQL editor. It is idempotent: safe to re-run,
-- and it upgrades databases created with the older scripts/00x_*.sql migrations.
--
-- Tables: profiles, roadmaps, progress, plus point_events, reward_catalog and
-- reward_redemptions for points and rewards. NSQF reference data is read from
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

-- adjust_points(delta) let any signed-in user add any number of points. Points now only change
-- through complete_topic() and redeem_reward() further down.
drop function if exists public.adjust_points(integer);

-- profiles.points is written only by those functions. Users may still edit the rest of their row.
-- (Revoking table-level UPDATE also drops earlier column grants, so this block is re-runnable.)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke insert, update on public.profiles from authenticated;
    grant insert (id, email, full_name, onboarded, onboarded_at, onboarding_data) on public.profiles to authenticated;
    grant update (email, full_name, onboarded, onboarded_at, onboarding_data) on public.profiles to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke insert, update, delete on public.profiles from anon;
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

-- Progress is written only by complete_topic() / uncomplete_topic(), which check that the lesson
-- exists in the roadmap. Direct writes would let anyone tick lessons that don't exist.
drop policy if exists "Users can create their own progress" on public.progress;
drop policy if exists "Users can insert their own progress" on public.progress;
drop policy if exists "Users can update their own progress" on public.progress;
drop policy if exists "Users can delete their own progress" on public.progress;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke insert, update, delete on public.progress from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke insert, update, delete on public.progress from anon;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Points and rewards
--
-- point_events is the ledger: every change to profiles.points has a row here, and
-- profiles.points always equals the sum of the caller's amounts. Award rows are unique per
-- (user, kind, ref), which is what stops a lesson or a roadmap paying out twice.
--   topic          +5 for a lesson, ref = '<roadmap id>:<module>:<topic>'
--   roadmap_bonus  max(60, 8 x lessons, lessons capped at 40), ref = '<roadmap id>'
--   redeem         minus the reward's cost, ref = '<redemption id>'
--   adjust         opening balance carried over from before the ledger existed
-- ---------------------------------------------------------------------------
create table if not exists public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  kind text not null check (kind in ('topic', 'roadmap_bonus', 'redeem', 'adjust')),
  ref text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);

create index if not exists idx_point_events_user_created on public.point_events(user_id, created_at desc);

alter table public.point_events enable row level security;

drop policy if exists "Users can view their own point events" on public.point_events;
create policy "Users can view their own point events"
  on public.point_events for select using (auth.uid() = user_id);

-- The catalog. kind 'perk' items do something in the app (perk says what);
-- kind 'demo' items are placeholders and nothing is delivered.
create table if not exists public.reward_catalog (
  id text primary key,
  name text not null,
  description text not null,
  cost integer not null check (cost > 0),
  kind text not null check (kind in ('perk', 'demo')),
  perk text check (perk in ('streak_freeze', 'certificate', 'sticker_pack')),
  category text not null default 'General',
  tone text not null default 'marigold' check (tone in ('brand', 'marigold', 'coral', 'lagoon', 'leaf', 'bubblegum')),
  featured boolean not null default false,
  active boolean not null default true,
  sort integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.reward_catalog enable row level security;

drop policy if exists "Signed-in users can view the reward catalog" on public.reward_catalog;
create policy "Signed-in users can view the reward catalog"
  on public.reward_catalog for select to authenticated using (true);

insert into public.reward_catalog (id, name, description, cost, kind, perk, category, tone, featured, sort)
values
  ('streak-freeze', 'Streak Freeze', 'Covers one missed day so a busy day doesn''t break your streak. It''s used up on the first day you miss after buying it.', 120, 'perk', 'streak_freeze', 'Streak', 'lagoon', true, 10),
  ('completion-certificate', 'Completion Certificate', 'A printable certificate for a roadmap you''ve finished, with its NSQF level, lessons and hours.', 100, 'perk', 'certificate', 'Certificate', 'marigold', true, 20),
  ('sticker-pack', 'Sticker Pack', 'Six extra stickers for your dashboard. Drag them anywhere; double-click one to send it home.', 80, 'perk', 'sticker_pack', 'Fun', 'bubblegum', false, 30),
  ('amazon-voucher-500', 'Amazon Voucher', 'Use it for books, gadgets, and everyday essentials.', 500, 'demo', null, 'Shopping', 'coral', true, 110),
  ('learning-perk', 'Learning Perk Pack', 'Unlock a premium mentorship session, curated course bundle, or digital skill pass.', 650, 'demo', null, 'Learning', 'brand', true, 120),
  ('digital-bundle', 'Digital Wellness Bundle', 'Redeem a curated set of productivity tools, wellness educators, and creative resources.', 420, 'demo', null, 'Digital', 'lagoon', false, 130),
  ('shopping-cashback', 'Shopping Cashback Mock', 'A simulated store credit for participating online retail categories.', 320, 'demo', null, 'Cashback', 'leaf', false, 140),
  ('mentor-boost', 'Mentor Boost Credits', 'Get extra AI mentor access and a targeted learning support boost for your next goal.', 275, 'demo', null, 'Support', 'bubblegum', false, 150),
  ('skill-badge-kit', 'Skill Badge Kit', 'Claim a mock premium completion kit with exclusive digital badges and certificates.', 180, 'demo', null, 'Badges', 'marigold', false, 160)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  cost = excluded.cost,
  kind = excluded.kind,
  perk = excluded.perk,
  category = excluded.category,
  tone = excluded.tone,
  featured = excluded.featured,
  sort = excluded.sort;

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id text not null references public.reward_catalog(id) on delete restrict,
  reward_name text not null,
  cost integer not null check (cost > 0),
  target_id uuid, -- the roadmap, for a certificate
  status text not null check (status in ('active', 'requested')),
  created_at timestamptz not null default now()
);

create index if not exists idx_reward_redemptions_user on public.reward_redemptions(user_id, created_at desc);
-- One certificate per roadmap, one sticker pack per learner (redeem_reward checks first; these are the backstop).
create unique index if not exists reward_redemptions_one_certificate
  on public.reward_redemptions(user_id, reward_id, target_id) where target_id is not null;
create unique index if not exists reward_redemptions_one_sticker_pack
  on public.reward_redemptions(user_id) where reward_id = 'sticker-pack';

alter table public.reward_redemptions enable row level security;

drop policy if exists "Users can view their own redemptions" on public.reward_redemptions;
create policy "Users can view their own redemptions"
  on public.reward_redemptions for select using (auth.uid() = user_id);

-- Only the functions below write these tables.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke insert, update, delete on public.point_events, public.reward_catalog, public.reward_redemptions from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.point_events, public.reward_catalog, public.reward_redemptions from anon;
  end if;
end $$;

-- Lessons in a roadmap's content, and how many of them the user has ticked.
create or replace function public.roadmap_lesson_counts(p_user_id uuid, p_roadmap_id uuid, p_content jsonb)
returns table (total integer, done integer)
language sql
stable
set search_path = public
as $$
  select
    (select coalesce(sum(jsonb_array_length(case when jsonb_typeof(m -> 'topics') = 'array' then m -> 'topics' else '[]'::jsonb end)), 0)::integer
       from jsonb_array_elements(case when jsonb_typeof(p_content -> 'modules') = 'array' then p_content -> 'modules' else '[]'::jsonb end) m),
    (select count(*)::integer
       from public.progress p
      where p.user_id = p_user_id
        and p.roadmap_id = p_roadmap_id
        and p.module_index >= 0
        and p.topic_index >= 0
        and jsonb_typeof(p_content -> 'modules' -> p.module_index -> 'topics' -> p.topic_index) = 'object');
$$;

-- Tick a lesson. Pays +5 the first time this lesson is ever ticked, and the roadmap bonus the
-- first time every lesson in the roadmap is ticked.
create or replace function public.complete_topic(p_roadmap_id uuid, p_module_index integer, p_topic_index integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_roadmap public.roadmaps%rowtype;
  v_topic jsonb;
  v_total integer;
  v_done integer;
  v_topic_award integer;
  v_bonus_award integer;
  v_points integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Lock the roadmap so two lessons ticked at once can't both miss (or both pay) the bonus.
  select * into v_roadmap from public.roadmaps where id = p_roadmap_id and user_id = v_uid for update;
  if not found then
    raise exception 'roadmap_not_found';
  end if;

  -- jsonb treats negative indexes as counting from the end, so reject them first.
  if p_module_index < 0 or p_topic_index < 0 then
    raise exception 'topic_not_found';
  end if;
  v_topic := v_roadmap.content -> 'modules' -> p_module_index -> 'topics' -> p_topic_index;
  if v_topic is null or jsonb_typeof(v_topic) <> 'object' then
    raise exception 'topic_not_found';
  end if;

  insert into public.progress (user_id, roadmap_id, module_index, topic_index, completed, completed_at)
  values (v_uid, p_roadmap_id, p_module_index, p_topic_index, true, now())
  on conflict (user_id, roadmap_id, module_index, topic_index) do nothing;

  insert into public.point_events (user_id, amount, kind, ref, description)
  values (
    v_uid, 5, 'topic',
    p_roadmap_id::text || ':' || p_module_index || ':' || p_topic_index,
    'Lesson: ' || coalesce(nullif(v_topic ->> 'title', ''), 'untitled')
  )
  on conflict (user_id, kind, ref) do nothing
  returning amount into v_topic_award;

  select c.total, c.done into v_total, v_done
    from public.roadmap_lesson_counts(v_uid, p_roadmap_id, v_roadmap.content) c;

  if v_total > 0 and v_done >= v_total then
    insert into public.point_events (user_id, amount, kind, ref, description)
    values (v_uid, greatest(60, 8 * least(v_total, 40)), 'roadmap_bonus', p_roadmap_id::text, 'Finished roadmap: ' || v_roadmap.title)
    on conflict (user_id, kind, ref) do nothing
    returning amount into v_bonus_award;
  end if;

  v_topic_award := coalesce(v_topic_award, 0);
  v_bonus_award := coalesce(v_bonus_award, 0);

  update public.profiles
     set points = coalesce(points, 0) + v_topic_award + v_bonus_award
   where id = v_uid
  returning points into v_points;

  return jsonb_build_object(
    'points', coalesce(v_points, 0),
    'topic_award', v_topic_award,
    'bonus_award', v_bonus_award,
    'finished', v_total > 0 and v_done >= v_total
  );
end;
$$;

-- Untick a lesson. Points already earned stay earned, and ticking it again pays nothing.
create or replace function public.uncomplete_topic(p_roadmap_id uuid, p_module_index integer, p_topic_index integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_points integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.progress
   where user_id = v_uid
     and roadmap_id = p_roadmap_id
     and module_index = p_module_index
     and topic_index = p_topic_index;

  select points into v_points from public.profiles where id = v_uid;

  return jsonb_build_object('points', coalesce(v_points, 0), 'topic_award', 0, 'bonus_award', 0, 'finished', false);
end;
$$;

-- Spend points on a catalog item. The profile row is locked first, so concurrent redemptions
-- queue up and the balance can't go below 0.
create or replace function public.redeem_reward(p_reward_id text, p_target_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reward public.reward_catalog%rowtype;
  v_points integer;
  v_roadmap public.roadmaps%rowtype;
  v_total integer;
  v_done integer;
  v_target uuid;
  v_redemption_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_reward from public.reward_catalog where id = p_reward_id and active;
  if not found then
    raise exception 'reward_not_found';
  end if;

  select points into v_points from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found';
  end if;

  if v_reward.perk = 'certificate' then
    if p_target_id is null then
      raise exception 'target_required';
    end if;
    select * into v_roadmap from public.roadmaps where id = p_target_id and user_id = v_uid;
    if not found then
      raise exception 'roadmap_not_found';
    end if;
    select c.total, c.done into v_total, v_done
      from public.roadmap_lesson_counts(v_uid, p_target_id, v_roadmap.content) c;
    if v_total = 0 or v_done < v_total then
      raise exception 'roadmap_not_finished';
    end if;
    if exists (select 1 from public.reward_redemptions where user_id = v_uid and reward_id = p_reward_id and target_id = p_target_id) then
      raise exception 'already_redeemed';
    end if;
    v_target := p_target_id;
  elsif v_reward.perk = 'sticker_pack' then
    if exists (select 1 from public.reward_redemptions where user_id = v_uid and reward_id = p_reward_id) then
      raise exception 'already_redeemed';
    end if;
  end if;

  if coalesce(v_points, 0) < v_reward.cost then
    raise exception 'insufficient_points';
  end if;

  insert into public.reward_redemptions (user_id, reward_id, reward_name, cost, target_id, status)
  values (v_uid, v_reward.id, v_reward.name, v_reward.cost, v_target, case when v_reward.kind = 'perk' then 'active' else 'requested' end)
  returning id into v_redemption_id;

  insert into public.point_events (user_id, amount, kind, ref, description)
  values (
    v_uid, -v_reward.cost, 'redeem', v_redemption_id::text,
    'Redeemed: ' || v_reward.name || case when v_target is not null then ' (' || v_roadmap.title || ')' else '' end
  );

  update public.profiles set points = points - v_reward.cost where id = v_uid returning points into v_points;

  return jsonb_build_object('points', v_points, 'redemption_id', v_redemption_id, 'reward_name', v_reward.name, 'cost', v_reward.cost);
end;
$$;

revoke all on function public.roadmap_lesson_counts(uuid, uuid, jsonb) from public;
revoke all on function public.complete_topic(uuid, integer, integer) from public;
revoke all on function public.uncomplete_topic(uuid, integer, integer) from public;
revoke all on function public.redeem_reward(text, uuid) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.roadmap_lesson_counts(uuid, uuid, jsonb) from anon;
    revoke execute on function public.complete_topic(uuid, integer, integer) from anon;
    revoke execute on function public.uncomplete_topic(uuid, integer, integer) from anon;
    revoke execute on function public.redeem_reward(text, uuid) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.roadmap_lesson_counts(uuid, uuid, jsonb) from authenticated;
    grant execute on function public.complete_topic(uuid, integer, integer) to authenticated;
    grant execute on function public.uncomplete_topic(uuid, integer, integer) to authenticated;
    grant execute on function public.redeem_reward(text, uuid) to authenticated;
  end if;
end $$;

-- Carry existing points into the ledger: a +5 'topic' row for every lesson already ticked, then
-- one 'adjust' row per user for whatever is left over. Afterwards sum(amount) = profiles.points.
-- Both inserts skip rows that already exist, so re-running this changes nothing.
insert into public.point_events (user_id, amount, kind, ref, description, created_at)
select p.user_id, 5, 'topic',
       p.roadmap_id::text || ':' || p.module_index || ':' || p.topic_index,
       'Lesson (ticked before the points ledger)',
       coalesce(p.completed_at, p.created_at)
  from public.progress p
 where p.module_index is not null and p.topic_index is not null
on conflict (user_id, kind, ref) do nothing;

insert into public.point_events (user_id, amount, kind, ref, description)
select pr.id, pr.points - coalesce(e.total, 0), 'adjust', 'opening-balance', 'Opening balance'
  from public.profiles pr
  left join (select user_id, sum(amount)::integer as total from public.point_events group by user_id) e on e.user_id = pr.id
 where pr.points - coalesce(e.total, 0) <> 0
   and exists (select 1 from auth.users u where u.id = pr.id)
on conflict (user_id, kind, ref) do nothing;

-- Make PostgREST pick up new columns immediately (avoids PGRST204 right after migrating).
notify pgrst, 'reload schema';
