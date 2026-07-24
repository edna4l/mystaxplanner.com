-- Read-only. Finds bill rows whose `origin` points at a card id that
-- doesn't exist at all anymore (a true dangling reference) — this is
-- the original bug you reported at the very start of this project,
-- from before promoteRootsBeforeDelete existed to prevent it. These
-- rows never get grouped into the Board's aggregate Bills tile because
-- there's no root left to group them under.
select c.id, c.title, c.origin, c.date, c.amount, c.paid
from public.cards c
where c.type = 'bill' and c.origin is not null
  and not exists (select 1 from public.cards r where r.id = c.origin)
order by c.title, c.date;
