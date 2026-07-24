-- Read-only. For the "Morning walk" series, shows each row's `days`
-- array so we can tell whether real completion history is scattered
-- across the dated copies (in which case deleting them would lose
-- data) or whether they're all still untouched/default (safe to
-- collapse down to the one root card).
select id, origin, date, streak,
       days,
       (select count(*) from unnest(days) d where d) as true_count
from public.cards
where type = 'habit' and title ilike '%morning walk%'
order by date;
