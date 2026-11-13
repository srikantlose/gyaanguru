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
--   topic          +5 for passing a lesson's quiz (older rows: lessons ticked before quizzes
--                  existed), ref = '<roadmap id>:<module>:<topic>'
--   roadmap_bonus  max(60, 8 x lessons, lessons capped at 40) once the roadmap is verified,
--                  ref = '<roadmap id>'
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
  ('completion-certificate', 'Completion Certificate', 'A printable certificate for a roadmap you''ve verified (every quiz passed and your recap approved), with its NSQF level, lessons and hours.', 100, 'perk', 'certificate', 'Certificate', 'marigold', true, 20),
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

-- ---------------------------------------------------------------------------
-- Proof of learning. Ticking a lesson only tracks progress; points come from
-- quizzes the server marks (answers never reach the browser) and, for the
-- roadmap bonus and certificate, a recap the AI approves. These tables are
-- written only by the server with the secret key (service_role); users can't
-- read them at all, because lesson_quizzes holds the answers.
-- ---------------------------------------------------------------------------

-- When the learner first opened each lesson. A lesson's quiz unlocks a few minutes later.
create table if not exists public.lesson_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  module_index integer not null,
  topic_index integer not null,
  first_opened_at timestamptz not null default now(),
  primary key (user_id, roadmap_id, module_index, topic_index)
);

-- One row per quiz handed out. questions includes the correct answers.
create table if not exists public.lesson_quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  module_index integer not null,
  topic_index integer not null,
  questions jsonb not null,
  answers jsonb,
  score integer,
  total integer,
  passed boolean not null default false,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists idx_lesson_quizzes_lesson
  on public.lesson_quizzes(user_id, roadmap_id, module_index, topic_index, created_at desc);
create index if not exists idx_lesson_quizzes_user_created on public.lesson_quizzes(user_id, created_at desc);

-- The learner's recap of a whole roadmap, and the AI's verdict on it.
create table if not exists public.roadmap_recaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  recap text not null,
  approved boolean not null,
  feedback text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_roadmap_recaps_lookup on public.roadmap_recaps(user_id, roadmap_id, created_at desc);

alter table public.lesson_views enable row level security;
alter table public.lesson_quizzes enable row level security;
alter table public.roadmap_recaps enable row level security;
-- No policies: with RLS on, signed-in users get nothing. The server's service_role bypasses RLS.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.lesson_views, public.lesson_quizzes, public.roadmap_recaps from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.lesson_views, public.lesson_quizzes, public.roadmap_recaps from anon;
  end if;
end $$;

-- Lessons in a roadmap and how many have a passed quiz.
create or replace function public.roadmap_quiz_counts(p_user_id uuid, p_roadmap_id uuid, p_content jsonb)
returns table (total integer, passed integer)
language sql
stable
set search_path = public
as $$
  select
    (select coalesce(sum(jsonb_array_length(case when jsonb_typeof(m -> 'topics') = 'array' then m -> 'topics' else '[]'::jsonb end)), 0)::integer
       from jsonb_array_elements(case when jsonb_typeof(p_content -> 'modules') = 'array' then p_content -> 'modules' else '[]'::jsonb end) m),
    (select count(distinct (q.module_index, q.topic_index))::integer
       from public.lesson_quizzes q
      where q.user_id = p_user_id
        and q.roadmap_id = p_roadmap_id
        and q.passed
        and q.module_index >= 0
        and q.topic_index >= 0
        and jsonb_typeof(p_content -> 'modules' -> q.module_index -> 'topics' -> q.topic_index) = 'object');
$$;

-- A roadmap is verified once every lesson's quiz is passed and a recap has been approved.
create or replace function public.roadmap_verified(p_user_id uuid, p_roadmap_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.roadmaps r
      cross join lateral public.roadmap_quiz_counts(p_user_id, r.id, r.content) c
     where r.id = p_roadmap_id
       and r.user_id = p_user_id
       and c.total > 0
       and c.passed >= c.total
  ) and exists (
    select 1 from public.roadmap_recaps rr
     where rr.user_id = p_user_id and rr.roadmap_id = p_roadmap_id and rr.approved
  );
$$;

-- Tick a lesson. This only tracks progress; it pays no points (see award_lesson_quiz).
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
  v_points integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_roadmap from public.roadmaps where id = p_roadmap_id and user_id = v_uid;
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

  select c.total, c.done into v_total, v_done
    from public.roadmap_lesson_counts(v_uid, p_roadmap_id, v_roadmap.content) c;
  select points into v_points from public.profiles where id = v_uid;

  return jsonb_build_object(
    'points', coalesce(v_points, 0),
    'topic_award', 0,
    'bonus_award', 0,
    'finished', v_total > 0 and v_done >= v_total
  );
end;
$$;

-- Server only (service_role). Pays the roadmap bonus once, if the roadmap is verified.
create or replace function public.award_roadmap_bonus(p_user_id uuid, p_roadmap_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roadmap public.roadmaps%rowtype;
  v_total integer;
  v_bonus integer;
begin
  -- Lock the roadmap so concurrent calls can't both pay.
  select * into v_roadmap from public.roadmaps where id = p_roadmap_id and user_id = p_user_id for update;
  if not found or not public.roadmap_verified(p_user_id, p_roadmap_id) then
    return 0;
  end if;

  select c.total into v_total from public.roadmap_quiz_counts(p_user_id, p_roadmap_id, v_roadmap.content) c;

  insert into public.point_events (user_id, amount, kind, ref, description)
  values (p_user_id, greatest(60, 8 * least(v_total, 40)), 'roadmap_bonus', p_roadmap_id::text, 'Verified roadmap: ' || v_roadmap.title)
  on conflict (user_id, kind, ref) do nothing
  returning amount into v_bonus;

  if v_bonus is null then
    return 0;
  end if;
  update public.profiles set points = coalesce(points, 0) + v_bonus where id = p_user_id;
  return v_bonus;
end;
$$;

-- Server only (service_role), called after the server has marked a quiz as passed.
-- Ticks the lesson, pays +5 the first time the lesson is paid (at most 15 lessons a day,
-- India time), then tries the roadmap bonus.
create or replace function public.award_lesson_quiz(p_user_id uuid, p_roadmap_id uuid, p_module_index integer, p_topic_index integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roadmap public.roadmaps%rowtype;
  v_topic jsonb;
  v_ref text := p_roadmap_id::text || ':' || p_module_index || ':' || p_topic_index;
  v_paid_today integer;
  v_award integer;
  v_reason text;
  v_bonus integer;
  v_points integer;
begin
  select * into v_roadmap from public.roadmaps where id = p_roadmap_id and user_id = p_user_id;
  if not found then
    raise exception 'roadmap_not_found';
  end if;
  if p_module_index < 0 or p_topic_index < 0 then
    raise exception 'topic_not_found';
  end if;
  v_topic := v_roadmap.content -> 'modules' -> p_module_index -> 'topics' -> p_topic_index;
  if v_topic is null or jsonb_typeof(v_topic) <> 'object' then
    raise exception 'topic_not_found';
  end if;
  if not exists (
    select 1 from public.lesson_quizzes
     where user_id = p_user_id and roadmap_id = p_roadmap_id
       and module_index = p_module_index and topic_index = p_topic_index and passed
  ) then
    raise exception 'quiz_not_passed';
  end if;

  insert into public.progress (user_id, roadmap_id, module_index, topic_index, completed, completed_at)
  values (p_user_id, p_roadmap_id, p_module_index, p_topic_index, true, now())
  on conflict (user_id, roadmap_id, module_index, topic_index) do nothing;

  -- Serialize this user's awards so the daily limit can't be raced.
  perform 1 from public.profiles where id = p_user_id for update;

  if exists (select 1 from public.point_events where user_id = p_user_id and kind = 'topic' and ref = v_ref) then
    v_reason := 'already_paid';
  else
    select count(*) into v_paid_today
      from public.point_events
     where user_id = p_user_id
       and kind = 'topic'
       and (created_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date;
    if v_paid_today >= 15 then
      v_reason := 'daily_limit';
    else
      insert into public.point_events (user_id, amount, kind, ref, description)
      values (p_user_id, 5, 'topic', v_ref, 'Passed quiz: ' || coalesce(nullif(v_topic ->> 'title', ''), 'untitled'))
      on conflict (user_id, kind, ref) do nothing
      returning amount into v_award;
      if v_award is null then
        v_reason := 'already_paid';
      else
        v_reason := 'paid';
        update public.profiles set points = coalesce(points, 0) + v_award where id = p_user_id;
      end if;
    end if;
  end if;

  v_bonus := public.award_roadmap_bonus(p_user_id, p_roadmap_id);
  select points into v_points from public.profiles where id = p_user_id;

  return jsonb_build_object(
    'points', coalesce(v_points, 0),
    'topic_award', coalesce(v_award, 0),
    'bonus_award', v_bonus,
    'reason', v_reason
  );
end;
$$;

-- For the signed-in learner: which lessons of a roadmap have a passed quiz, and the recap/bonus state.
create or replace function public.quiz_status(p_roadmap_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'passed', coalesce((
      select jsonb_agg(distinct jsonb_build_array(q.module_index, q.topic_index))
        from public.lesson_quizzes q
       where q.user_id = auth.uid() and q.roadmap_id = p_roadmap_id and q.passed
    ), '[]'::jsonb),
    'recap_approved', exists (
      select 1 from public.roadmap_recaps rr
       where rr.user_id = auth.uid() and rr.roadmap_id = p_roadmap_id and rr.approved
    ),
    'bonus_paid', exists (
      select 1 from public.point_events e
       where e.user_id = auth.uid() and e.kind = 'roadmap_bonus' and e.ref = p_roadmap_id::text
    )
  );
$$;

-- For the signed-in learner: ids of their verified roadmaps (certificate eligibility).
create or replace function public.verified_roadmaps()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.id from public.roadmaps r
   where r.user_id = auth.uid() and public.roadmap_verified(auth.uid(), r.id);
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
    -- A certificate needs proof: every lesson quiz passed and an approved recap.
    if not public.roadmap_verified(v_uid, p_target_id) then
      raise exception 'roadmap_not_verified';
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

-- Who may call what. Signed-in users: tick/untick, redeem, and read their own quiz state.
-- Server only (service_role, via SUPABASE_SECRET_KEY): paying for quizzes and the roadmap bonus.
-- Helpers: nobody calls them directly.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.roadmap_lesson_counts(uuid, uuid, jsonb)',
    'public.roadmap_quiz_counts(uuid, uuid, jsonb)',
    'public.roadmap_verified(uuid, uuid)',
    'public.complete_topic(uuid, integer, integer)',
    'public.uncomplete_topic(uuid, integer, integer)',
    'public.redeem_reward(text, uuid)',
    'public.award_roadmap_bonus(uuid, uuid)',
    'public.award_lesson_quiz(uuid, uuid, integer, integer)',
    'public.quiz_status(uuid)',
    'public.verified_roadmaps()'
  ] loop
    execute format('revoke all on function %s from public', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon', fn);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on function %s from authenticated', fn);
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.complete_topic(uuid, integer, integer) to authenticated;
    grant execute on function public.uncomplete_topic(uuid, integer, integer) to authenticated;
    grant execute on function public.redeem_reward(text, uuid) to authenticated;
    grant execute on function public.quiz_status(uuid) to authenticated;
    grant execute on function public.verified_roadmaps() to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.award_lesson_quiz(uuid, uuid, integer, integer) to service_role;
    grant execute on function public.award_roadmap_bonus(uuid, uuid) to service_role;
  end if;
end $$;

-- One-off data migrations, so re-running this file never repeats them.
create table if not exists public.app_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);
alter table public.app_migrations enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.app_migrations from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.app_migrations from anon;
  end if;
end $$;

-- Carry pre-ledger points into the ledger, once: back then every tick paid +5, so add a 'topic'
-- row for each lesson already ticked, then one 'adjust' row per user for whatever is left over.
-- Afterwards sum(amount) = profiles.points. It must not run again: ticks no longer pay, and a
-- 'topic' row for a merely ticked lesson would stop its quiz from ever paying.
do $$
begin
  if exists (select 1 from public.app_migrations where id = 'points_ledger_backfill') then
    return;
  end if;

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

  insert into public.app_migrations (id) values ('points_ledger_backfill');
end $$;

-- Make PostgREST pick up new columns immediately (avoids PGRST204 right after migrating).
notify pgrst, 'reload schema';
