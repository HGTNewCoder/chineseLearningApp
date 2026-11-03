-- Custom flashcard decks. A deleted deck stays as a row with deleted = true so
-- the deletion syncs to the user's other devices; the newest updated_at wins.

create table if not exists public.decks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  deck_id text not null,
  name text not null,
  word_ids text[] not null default '{}',
  created_at bigint not null,
  updated_at bigint not null,
  deleted boolean not null default false,
  primary key (user_id, deck_id)
);

alter table public.decks enable row level security;

create policy "own decks" on public.decks
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
