-- Enables Supabase Realtime (postgres_changes) for the tables the board
-- and profile/settings are built from, so a change made on one device/
-- tab shows up on another without a manual refresh. See the realtime
-- subscriptions in src/lib/useBoard.ts and src/lib/useProfile.ts — each
-- listens for changes on its own table(s) and re-syncs shortly after.
--
-- RLS already restricts every row to its owner (profiles/slots/cards
-- policies in schema.sql), so this only ever streams a user their own
-- changes, never anyone else's.

alter publication supabase_realtime add table public.slots;
alter publication supabase_realtime add table public.cards;
alter publication supabase_realtime add table public.profiles;
