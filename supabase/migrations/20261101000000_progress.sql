-- Hanzi Trainer: per-user progress, synced from the browser (local-first).
-- Timestamps are milliseconds since the epoch, matching the client.
-- Row-level security restricts every row to its owner.

create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  settings_updated_at bigint not null default 0,
  reset_at bigint not null default 0
);

create table if not exists public.cards (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word_id text not null,
  box smallint not null check (box between 1 and 5),
  next_due bigint not null,
  last_reviewed bigint,
  reviews integer not null default 0,
  lapses integer not null default 0,
  primary key (user_id, word_id)
);

create table if not exists public.lesson_words (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id text not null,
  word_id text not null,
  primary key (user_id, lesson_id, word_id)
);

create table if not exists public.daily_activity (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.lesson_words enable row level security;
alter table public.daily_activity enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own cards" on public.cards
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own lesson words" on public.lesson_words
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own daily activity" on public.daily_activity
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
