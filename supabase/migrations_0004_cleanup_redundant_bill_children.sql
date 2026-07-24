-- Destructive. Run phase4_preview_v2.sql FIRST and review the numbers
-- before running this. Deletes redundant pre-generated future bill rows
-- now superseded by Phase 1+2's virtual-occurrence generator
-- (src/lib/recurrence.ts) — a future/unpaid/unskipped child is deleted if
-- it EITHER exactly matches its root's current values, OR matches a
-- value-combination shared by 3+ of its own siblings (a stale bulk block
-- — e.g. the root's amount was edited later and old copies never picked
-- up the change). Anything that doesn't fit either case (a true one-off
-- outlier) is left alone.
begin;

with target as (
  select c.id, c.slot_id, c.origin, c.title,
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
deletable as (
  select t.id, t.slot_id
  from target t
  join root r on r.id = t.origin
  join modal m on m.origin = t.origin
  where
    (t.title is not distinct from r.title and t.amount is not distinct from r.amount
      and t.category is not distinct from r.category and t.notes is not distinct from r.notes
      and t.last4 is not distinct from r.last4 and t.pay_url is not distinct from r.pay_url
      and t.autopay is not distinct from r.autopay and t.cover is not distinct from r.cover)
    or
    (m.grp_count >= 3
      and t.title is not distinct from m.title and t.amount is not distinct from m.amount
      and t.category is not distinct from m.category and t.notes is not distinct from m.notes
      and t.last4 is not distinct from m.last4 and t.pay_url is not distinct from m.pay_url
      and t.autopay is not distinct from m.autopay and t.cover is not distinct from m.cover)
)
delete from public.cards where id in (select id from deletable);

-- Each deleted card had its own slot (one card per slot, per the app's
-- model) — clean up whichever slots are now empty as a result.
delete from public.slots s
where not exists (select 1 from public.cards c where c.slot_id = s.id);

commit;
