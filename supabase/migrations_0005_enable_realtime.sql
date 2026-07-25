-- Enables Supabase Realtime (postgres_changes) for the tables the board
-- and profile/settings are built from, so a change made on one device/
-- tab shows up on another without a manual refresh. See the realtime
-- subscriptions in src/lib/useBoard.ts and src/lib/useProfile.ts — each
-- listens for changes on its own table(s) and re-syncs shortly after.
--
-- RLS already restricts every row to its owner (profiles/slots/cards
-- policies in schema.sql), so this only ever streams a user their own
-- changes, never anyone else's.
--
-- Safe to re-run: the "add table" calls are skipped if already applied
-- (running them twice raises "already member of publication").
--
-- REPLICA IDENTITY FULL is the part that was missing before and is why
-- nothing was actually syncing: the client subscribes with a
-- `user_id=eq.<id>` filter, and Realtime can only evaluate a filter
-- against columns present in the change payload. By default Postgres
-- only includes primary-key columns for UPDATE/DELETE payloads — not
-- user_id — so every update/delete event silently failed the filter
-- and was never delivered. FULL includes every column, every time.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'slots'
  ) then
    alter publication supabase_realtime add table public.slots;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cards'
  ) then
    alter publication supabase_realtime add table public.cards;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

alter table public.slots replica identity full;
alter table public.cards replica identity full;
alter table public.profiles replica identity full;
