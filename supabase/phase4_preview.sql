-- Read-only. Run this FIRST and review the numbers before running
-- migrations_0004_cleanup_redundant_bill_children.sql. Shows exactly which
-- child rows that script would delete: unpaid, future-dated, unedited
-- copies of their series root (i.e. never paid, never touched, and the
-- generator (src/lib/recurrence.ts) will regenerate an identical virtual
-- occurrence for that date automatically).

with root as (
  select id, title, amount, category, notes, last4, pay_url, autopay, cover
  from public.cards
  where type = 'bill' and origin is null
),
deletable as (
  select c.id, c.title, c.date, c.amount
  from public.cards c
  join root r on r.id = c.origin
  where c.type = 'bill'
    and c.paid = false
    and coalesce(c.skipped, false) = false
    and c.date > current_date
    and c.title is not distinct from r.title
    and c.amount is not distinct from r.amount
    and c.category is not distinct from r.category
    and c.notes is not distinct from r.notes
    and c.last4 is not distinct from r.last4
    and c.pay_url is not distinct from r.pay_url
    and c.autopay is not distinct from r.autopay
    and c.cover is not distinct from r.cover
)
select count(*) as would_delete from deletable;

-- Sanity check: this + the rows that WON'T match (paid, past, edited, or
-- skipped) should add up to the 560 total child rows from the diagnostic.
-- A sample of what would be kept as real "exception" rows instead of
-- deleted, so you can see why (paid / past / edited from its root):
with root as (
  select id, title, amount, category, notes, last4, pay_url, autopay, cover
  from public.cards
  where type = 'bill' and origin is null
)
select
  c.id, c.title, c.date, c.paid,
  (c.date <= current_date) as is_past,
  (c.title is distinct from r.title
    or c.amount is distinct from r.amount
    or c.category is distinct from r.category
    or c.notes is distinct from r.notes
    or c.last4 is distinct from r.last4
    or c.pay_url is distinct from r.pay_url
    or c.autopay is distinct from r.autopay
    or c.cover is distinct from r.cover) as diverged_from_root
from public.cards c
join root r on r.id = c.origin
where c.type = 'bill'
  and not (
    c.paid = false
    and coalesce(c.skipped, false) = false
    and c.date > current_date
    and c.title is not distinct from r.title
    and c.amount is not distinct from r.amount
    and c.category is not distinct from r.category
    and c.notes is not distinct from r.notes
    and c.last4 is not distinct from r.last4
    and c.pay_url is not distinct from r.pay_url
    and c.autopay is not distinct from r.autopay
    and c.cover is not distinct from r.cover
  )
order by c.date desc
limit 30;
