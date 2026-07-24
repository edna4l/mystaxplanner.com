-- Destructive. Deletes the 25 "Morning walk" copies that were all
-- bulk-created in the same instant with identical, untouched days/
-- streak values (confirmed via diagnostic query — none hold unique
-- data), keeping only the root habit card.
begin;

delete from public.cards
where type = 'habit' and origin = '166bc50b-b4cb-4f55-a899-de21214393e2';

-- Clean up whichever slots are now empty as a result.
delete from public.slots s
where not exists (select 1 from public.cards c where c.slot_id = s.id);

commit;
