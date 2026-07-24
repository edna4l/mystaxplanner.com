-- Read-only. Shows how many habit-type cards exist per title, and
-- whether they're linked via origin (stamped copies) or fully
-- independent rows, so we can tell real duplication apart from
-- intentional separate habits before touching anything.
select title, count(*) as card_count,
       count(*) filter (where origin is null) as roots,
       count(*) filter (where origin is not null) as linked_copies,
       min(created_at) as earliest, max(created_at) as latest
from public.cards
where type = 'habit'
group by title
order by card_count desc;

-- Sample of the "Morning walk" rows themselves (or whichever title has
-- the most cards above) to see the actual streak/days values side by
-- side.
select id, origin, streak, created_at, date
from public.cards
where type = 'habit' and title ilike '%morning walk%'
order by created_at
limit 40;
