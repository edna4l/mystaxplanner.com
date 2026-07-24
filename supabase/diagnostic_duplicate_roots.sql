-- Read-only. Finds any bill title with MORE THAN ONE independent root
-- (origin is null, recur_freq is monthly) — the Disney Plus signature:
-- several supposedly-separate "series" that are really one bill that
-- never got consolidated. Legitimate distinct bills that happen to
-- share a name are rare, so review before assuming this is exhaustive.
select title, count(*) as root_count,
       sum((amount = 0)::int) as zero_amount_count,
       min(created_at) as earliest, max(created_at) as latest
from public.cards
where type = 'bill' and origin is null and recur_freq = 'monthly'
group by title
having count(*) > 1
order by root_count desc;
