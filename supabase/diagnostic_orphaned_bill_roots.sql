-- Read-only. Finds bill "roots" (origin is null) that have no
-- recur_freq but still have other bill rows pointing at them via
-- origin — the signature of the promoteRootsBeforeDelete bug (a
-- deleted root's sibling got promoted to replace it, but never
-- inherited recur_freq/recur_until, silently dropping the whole
-- series out of the recurring-bill engine).
select r.id as root_id, r.title, r.date as root_date, r.amount as root_amount, r.paid as root_paid,
       count(c.id) as orphaned_children
from public.cards r
join public.cards c on c.origin = r.id
where r.type = 'bill' and r.origin is null and r.recur_freq is null
  and c.type = 'bill'
group by r.id, r.title, r.date, r.amount, r.paid
order by orphaned_children desc;

-- For each affected title, show every row's date/amount/paid so we can
-- confirm the cadence (and infer the right recur_freq) before fixing
-- anything.
select id, origin, title, date, amount, paid
from public.cards
where type = 'bill' and title in (
  select r.title from public.cards r
  join public.cards c on c.origin = r.id
  where r.type = 'bill' and r.origin is null and r.recur_freq is null and c.type = 'bill'
  group by r.title
)
order by title, date;
