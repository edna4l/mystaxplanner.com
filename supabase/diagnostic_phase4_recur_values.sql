-- Read-only. Shows what's actually in your data so the Phase 4 cleanup
-- script can be written correctly instead of guessing. Safe to run any
-- time — no writes.

-- 1) Every distinct free-text recurrence value on root bills (origin is
--    null), and how many roots use each.
select recur, count(*) as root_count
from public.cards
where type = 'bill' and origin is null
group by recur
order by root_count desc;

-- 2) How many roots already got a machine-readable recur_freq from the
--    earlier migration vs. how many didn't.
select
  (recur_freq is not null) as has_recur_freq,
  count(*) as root_count
from public.cards
where type = 'bill' and origin is null
group by (recur_freq is not null);

-- 3) Overall bill counts: total bill rows, how many are root vs. child
--    (series member), how many children are still unpaid+future-dated
--    (the likely-redundant placeholder rows Phase 4 would target).
select
  count(*) filter (where origin is null) as root_bills,
  count(*) filter (where origin is not null) as child_bills,
  count(*) filter (where origin is not null and paid = false and date > current_date) as unpaid_future_children
from public.cards
where type = 'bill';
