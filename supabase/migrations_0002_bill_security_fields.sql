-- Adds structured, lower-risk fields to bill cards (nickname is already
-- the card's title; this adds last4/payment site/autopay so users don't
-- need to put that info in free-text notes). Run this once in the
-- Supabase SQL Editor against your existing project — safe to re-run
-- (IF NOT EXISTS guards).
alter table public.cards add column if not exists last4 text;
alter table public.cards add column if not exists pay_url text;
alter table public.cards add column if not exists autopay boolean;
-- last4's max length (4 digits) is enforced in the UI (input maxLength),
-- not a DB constraint, to keep this migration safely re-runnable.
