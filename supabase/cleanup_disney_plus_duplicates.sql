-- Destructive. Deletes all 21 "Disney Plus" bill rows (20 independent
-- $0 monthly-recurring roots from a bulk-import artifact, plus 1 skip
-- marker pointing at one of them) — confirmed via diagnostic query that
-- every row is unpaid with a $0 amount, i.e. never real financial data.
-- If you want to actually track a Disney+ bill going forward, re-add it
-- once through "+ Add bill" afterward.
begin;

delete from public.cards
where type = 'bill' and title ilike '%disney%';

delete from public.slots s
where not exists (select 1 from public.cards c where c.slot_id = s.id);

commit;
