-- Read-only. Full picture of every "Disney Plus" bill row: origin
-- (which root, if any, it belongs to), recur_freq (is IT a root),
-- occurrence_date/skipped (materialized-exception bookkeeping), date,
-- amount, paid, and when it was actually created — so we can tell
-- whether this is one series that over-generated, two separate roots
-- both producing monthly rows, or leftover legacy data.
select id, origin, recur_freq, recur_until, occurrence_date, skipped,
       date, amount, paid, created_at
from public.cards
where type = 'bill' and title ilike '%disney%'
order by created_at, date;
