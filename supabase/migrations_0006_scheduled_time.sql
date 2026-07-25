-- Adds a time-of-day to a card, separate from its date — powers the
-- Planner's hourly daily schedule and the "drag a card from the
-- Unscheduled Stax tray onto 10:00 AM" interaction. Stored as plain
-- "HH:MM" (24h) text rather than a Postgres time type, matching how
-- `due` is already a free-text display string elsewhere in this
-- schema — the app only ever reads/writes it as a string, never does
-- date arithmetic on it in SQL.
--
-- Null means "no specific time" — a card can have a date but no
-- scheduled_time (shows on that day but not on the hourly timeline),
-- exactly like a card can already have a date but no due text.

alter table public.cards add column if not exists scheduled_time text;
