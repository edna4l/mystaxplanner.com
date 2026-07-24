-- Read-only. Replaces phase4_preview.sql's criteria: a future/unpaid/
-- unskipped child bill is now flagged for deletion if EITHER
--   (a) it exactly matches its root's CURRENT values, or
--   (b) it matches the majority ("modal") value-combination shared by 3+
--       of its own sibling children — strong evidence of a stale
--       bulk-generated block (e.g. the root's amount was edited later and
--       old copies never picked up the change), not an intentional
--       one-off edit.
-- Anything that doesn't fit either case is left alone as a possible
-- genuine per-occurrence exception.

with target as (
  select c.id, c.slot_id, c.origin, c.title, c.date,
         c.amount, c.category, c.notes, c.last4, c.pay_url, c.autopay, c.cover
  from public.cards c
  where c.type = 'bill'
    and c.paid = false
    and coalesce(c.skipped, false) = false
    and c.date > current_date
    and c.origin is not null
),
root as (
  select id, title, amount, category, notes, last4, pay_url, autopay, cover
  from public.cards
  where type = 'bill' and origin is null
),
grouped as (
  select origin, title, amount, category, notes, last4, pay_url, autopay, cover,
         count(*) as grp_count
  from target
  group by origin, title, amount, category, notes, last4, pay_url, autopay, cover
),
modal as (
  select distinct on (origin)
    origin, title, amount, category, notes, last4, pay_url, autopay, cover, grp_count
  from grouped
  order by origin, grp_count desc, title
),
flagged as (
  select t.id, t.title, t.date, t.amount,
         (t.title is not distinct from r.title and t.amount is not distinct from r.amount
           and t.category is not distinct from r.category and t.notes is not distinct from r.notes
           and t.last4 is not distinct from r.last4 and t.pay_url is not distinct from r.pay_url
           and t.autopay is not distinct from r.autopay and t.cover is not distinct from r.cover) as matches_root,
         (m.grp_count >= 3
           and t.title is not distinct from m.title and t.amount is not distinct from m.amount
           and t.category is not distinct from m.category and t.notes is not distinct from m.notes
           and t.last4 is not distinct from m.last4 and t.pay_url is not distinct from m.pay_url
           and t.autopay is not distinct from m.autopay and t.cover is not distinct from m.cover) as matches_stale_block
  from target t
  join root r on r.id = t.origin
  join modal m on m.origin = t.origin
)
select count(*) as would_delete from flagged where matches_root or matches_stale_block;

-- Breakdown: how many via each rule (rows can match both).
with target as (
  select c.id, c.origin, c.title, c.date,
         c.amount, c.category, c.notes, c.last4, c.pay_url, c.autopay, c.cover
  from public.cards c
  where c.type = 'bill'
    and c.paid = false
    and coalesce(c.skipped, false) = false
    and c.date > current_date
    and c.origin is not null
),
root as (
  select id, title, amount, category, notes, last4, pay_url, autopay, cover
  from public.cards
  where type = 'bill' and origin is null
),
grouped as (
  select origin, title, amount, category, notes, last4, pay_url, autopay, cover, count(*) as grp_count
  from target
  group by origin, title, amount, category, notes, last4, pay_url, autopay, cover
),
modal as (
  select distinct on (origin) origin, title, amount, category, notes, last4, pay_url, autopay, cover, grp_count
  from grouped
  order by origin, grp_count desc, title
),
flagged as (
  select t.id,
         (t.title is not distinct from r.title and t.amount is not distinct from r.amount
           and t.category is not distinct from r.category and t.notes is not distinct from r.notes
           and t.last4 is not distinct from r.last4 and t.pay_url is not distinct from r.pay_url
           and t.autopay is not distinct from r.autopay and t.cover is not distinct from r.cover) as matches_root,
         (m.grp_count >= 3
           and t.title is not distinct from m.title and t.amount is not distinct from m.amount
           and t.category is not distinct from m.category and t.notes is not distinct from m.notes
           and t.last4 is not distinct from m.last4 and t.pay_url is not distinct from m.pay_url
           and t.autopay is not distinct from m.autopay and t.cover is not distinct from m.cover) as matches_stale_block
  from target t
  join root r on r.id = t.origin
  join modal m on m.origin = t.origin
)
select
  count(*) filter (where matches_root and not matches_stale_block) as root_match_only,
  count(*) filter (where matches_stale_block and not matches_root) as stale_block_only,
  count(*) filter (where matches_root and matches_stale_block) as both,
  count(*) filter (where not matches_root and not matches_stale_block) as would_keep
from flagged;

-- Sample of rows that would still be KEPT (true outliers), so you can
-- eyeball whether they look like real one-off edits worth preserving.
with target as (
  select c.id, c.origin, c.title, c.date,
         c.amount, c.category, c.notes, c.last4, c.pay_url, c.autopay, c.cover
  from public.cards c
  where c.type = 'bill'
    and c.paid = false
    and coalesce(c.skipped, false) = false
    and c.date > current_date
    and c.origin is not null
),
root as (
  select id, title, amount, category, notes, last4, pay_url, autopay, cover
  from public.cards
  where type = 'bill' and origin is null
),
grouped as (
  select origin, title, amount, category, notes, last4, pay_url, autopay, cover, count(*) as grp_count
  from target
  group by origin, title, amount, category, notes, last4, pay_url, autopay, cover
),
modal as (
  select distinct on (origin) origin, title, amount, category, notes, last4, pay_url, autopay, cover, grp_count
  from grouped
  order by origin, grp_count desc, title
)
select t.title, t.date, t.amount, t.category, r.amount as root_amount, r.category as root_category
from target t
join root r on r.id = t.origin
join modal m on m.origin = t.origin
where not (
    t.title is not distinct from r.title and t.amount is not distinct from r.amount
    and t.category is not distinct from r.category and t.notes is not distinct from r.notes
    and t.last4 is not distinct from r.last4 and t.pay_url is not distinct from r.pay_url
    and t.autopay is not distinct from r.autopay and t.cover is not distinct from r.cover
  )
  and not (
    m.grp_count >= 3
    and t.title is not distinct from m.title and t.amount is not distinct from m.amount
    and t.category is not distinct from m.category and t.notes is not distinct from m.notes
    and t.last4 is not distinct from m.last4 and t.pay_url is not distinct from m.pay_url
    and t.autopay is not distinct from m.autopay and t.cover is not distinct from m.cover
  )
order by t.title, t.date
limit 40;
