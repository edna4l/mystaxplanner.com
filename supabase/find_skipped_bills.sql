-- Read-only. Lists every bill occurrence currently marked "skipped" (i.e.
-- deliberately hidden by a delete on a recurring occurrence), so we can
-- confirm which rows are the July/August ones before removing the skip
-- markers.
select id, title, date, occurrence_date, amount, origin
from public.cards
where type = 'bill' and skipped = true
order by title, date;
