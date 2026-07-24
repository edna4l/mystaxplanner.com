-- Recurring bills: stop pre-generating a row per future month. A root
-- bill card (origin is null) can carry a recurrence rule; occurrences
-- are generated virtually for display (src/lib/recurrence.ts) and only
-- become real rows when they diverge (paid, edited, skipped). Run once
-- in the Supabase SQL Editor — safe to re-run (IF NOT EXISTS guards).
alter table public.cards add column if not exists recur_freq text;
alter table public.cards add column if not exists recur_until date;
alter table public.cards add column if not exists occurrence_date date;
-- Not used until the series-editing controls phase (skip-this-occurrence),
-- added now alongside the other columns to avoid a second migration later.
alter table public.cards add column if not exists skipped boolean;

-- Backfill: existing recurring-series children were already "materialized
-- occurrences" for their own date — mark them as such so the new merge
-- logic recognizes them instead of generating a duplicate virtual card
-- for the same date.
update public.cards set occurrence_date = date
  where origin is not null and type = 'bill' and date is not null and occurrence_date is null;

-- Backfill: existing recurring root bills (origin is null) get a
-- machine-readable recur_freq inferred from the old free-text `recur`
-- column, so the generator knows to project future occurrences for them.
-- Anything not recognized as "Monthly" is left alone (no recurrence
-- generated) — safe, conservative default.
update public.cards set recur_freq = 'monthly'
  where origin is null and type = 'bill' and recur_freq is null and lower(coalesce(recur, '')) = 'monthly';
