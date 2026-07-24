-- Read-only. Direct look at the actual rows behind STORAGE UNIT, CAR
-- INSURANCE, and WATER, so I can see their real origin/recur_freq/
-- occurrence_date/skipped values instead of guessing at theories that
-- didn't pan out.
select id, title, origin, recur_freq, recur_until, occurrence_date, skipped, date, amount, paid, slot_id
from public.cards
where type = 'bill' and title in ('STORAGE UNIT', 'CAR INSURANCE', 'WATER')
order by title, date;
