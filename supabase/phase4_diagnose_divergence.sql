-- Read-only. For the future/unpaid child rows that look "diverged" from
-- their root, breaks down exactly which field(s) differ and how often —
-- so we can tell stale duplicates (root changed later, copies never
-- updated) apart from genuine one-off edits.
with root as (
  select id, title, amount, category, notes, last4, pay_url, autopay, cover
  from public.cards
  where type = 'bill' and origin is null
)
select
  count(*) filter (where c.title is distinct from r.title) as title_diff,
  count(*) filter (where c.amount is distinct from r.amount) as amount_diff,
  count(*) filter (where c.category is distinct from r.category) as category_diff,
  count(*) filter (where c.notes is distinct from r.notes) as notes_diff,
  count(*) filter (where c.last4 is distinct from r.last4) as last4_diff,
  count(*) filter (where c.pay_url is distinct from r.pay_url) as pay_url_diff,
  count(*) filter (where c.autopay is distinct from r.autopay) as autopay_diff,
  count(*) filter (where c.cover is distinct from r.cover) as cover_diff,
  count(*) as total_diverged
from public.cards c
join root r on r.id = c.origin
where c.type = 'bill'
  and c.paid = false
  and coalesce(c.skipped, false) = false
  and c.date > current_date
  and (
    c.title is distinct from r.title
    or c.amount is distinct from r.amount
    or c.category is distinct from r.category
    or c.notes is distinct from r.notes
    or c.last4 is distinct from r.last4
    or c.pay_url is distinct from r.pay_url
    or c.autopay is distinct from r.autopay
    or c.cover is distinct from r.cover
  );

-- Side-by-side for one example series (PGE) so we can see the actual
-- values, not just "different" — pick whichever title shows up most in
-- the diverged sample above if not PGE.
with root as (
  select id, title, amount, category, notes, last4, pay_url, autopay, cover
  from public.cards
  where type = 'bill' and origin is null
)
select r.title as root_title, r.amount as root_amount, r.category as root_category,
       c.date as child_date, c.amount as child_amount, c.category as child_category
from public.cards c
join root r on r.id = c.origin
where c.type = 'bill' and r.title = 'PGE'
order by c.date desc
limit 10;
