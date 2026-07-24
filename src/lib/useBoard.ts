"use client";

// Supabase-backed replacement for app.jsx's loadBoard()/localStorage pair.
// Same shape (BoardSlot[] = slots with .cards attached) so the ported UI
// components barely need to change, but every mutation now writes through
// to Postgres instead of localStorage, which is what makes the board sync
// across devices for a logged-in user.
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BoardSlot, Card, Slot, CardTypeDef } from "@/lib/types";
import { newCardFields, defaultTitleFor, registerCardType, unregisterCardType } from "@/lib/cardTypes";
import { shortISO, addDaysISO } from "@/lib/date";
import { parseVirtualId, isVirtualId } from "@/lib/recurrence";

function groupIntoSlots(slots: Slot[], cards: Card[]): BoardSlot[] {
  const bySlot = new Map<string, Card[]>();
  cards.forEach((c) => {
    const arr = bySlot.get(c.slot_id) ?? [];
    arr.push(c);
    bySlot.set(c.slot_id, arr);
  });
  bySlot.forEach((arr) => arr.sort((a, b) => a.position_in_slot - b.position_in_slot));
  return slots
    .map((s) => ({ ...s, cards: bySlot.get(s.id) ?? [] }))
    .filter((s) => s.cards.length > 0);
}

export function useBoard() {
  const supabase = createClient();
  const [board, setBoard] = useState<BoardSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [customTypes, setCustomTypes] = useState<CardTypeDef[]>([]);

  const reload = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBoard([]);
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const [{ data: slots }, { data: cards }, { data: types }] = await Promise.all([
      supabase.from("slots").select("*").order("sort_order", { ascending: true }),
      supabase.from("cards").select("*").order("position_in_slot", { ascending: true }),
      supabase.from("card_types").select("*").order("created_at", { ascending: true }),
    ]);
    const typeDefs: CardTypeDef[] = (types ?? []).map((t) => ({
      key: t.key, label: t.label, hue: t.hue, blurb: t.blurb || "Custom", custom: true,
    }));
    typeDefs.forEach(registerCardType);
    setCustomTypes(typeDefs);
    setBoard(groupIntoSlots(slots ?? [], (cards ?? []) as Card[]));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    reload();
  }, [reload]);

  // --- mutations -----------------------------------------------------------

  async function addCard(type: string, date?: string) {
    if (!userId) return null;
    const { data: slot, error: slotErr } = await supabase
      .from("slots")
      .insert({ user_id: userId, name: "" })
      .select()
      .single();
    if (slotErr || !slot) return null;

    const fields = newCardFields(type);
    if (date) fields.date = date;
    const { data: card, error: cardErr } = await supabase
      .from("cards")
      .insert({
        user_id: userId,
        slot_id: slot.id,
        type,
        title: defaultTitleFor(type),
        position_in_slot: 0,
        ...fields,
      })
      .select()
      .single();
    if (cardErr || !card) return null;

    setBoard((b) => [{ ...slot, cards: [card as Card] }, ...b]);
    return card as Card;
  }

  // Re-inserts full card snapshots (one per slot each, so a card that was
  // stacked with others comes back on its own — a deliberate simplification
  // vs. the prototype's exact-snapshot undo). Backs the undo toast on
  // deleteCard/bulkDeleteBills.
  async function restoreCards(cards: Card[]) {
    if (!userId || !cards.length) return;
    const created: { slot: Slot; card: Card }[] = [];
    for (const c of cards) {
      const { data: slot } = await supabase.from("slots").insert({ user_id: userId, name: "" }).select().single();
      if (!slot) continue;
      const copyFields = { ...c } as Partial<Card>;
      delete copyFields.id;
      delete copyFields.created_at;
      delete copyFields.updated_at;
      delete copyFields.slot_id;
      const { data: card } = await supabase
        .from("cards")
        .insert({ ...copyFields, user_id: userId, slot_id: slot.id, position_in_slot: 0 })
        .select()
        .single();
      if (card) created.push({ slot, card: card as Card });
    }
    if (created.length) setBoard((b) => [...created.map((r) => ({ ...r.slot, cards: [r.card] })), ...b]);
  }

  // Turns a virtual recurring-bill occurrence (id shaped "virtual:<rootId>:<date>",
  // see src/lib/recurrence.ts) into a real row the moment it diverges from
  // its series rule — paid, edited, or skipped. occurrence_date always
  // stays the originally-projected slot date even if `patch.date` moves the
  // occurrence to a different day, so the rule doesn't regenerate a
  // duplicate virtual card for that slot.
  async function materializeOccurrence(virtualId: string, patch: Partial<Card>) {
    const parsed = parseVirtualId(virtualId);
    if (!parsed || !userId) return null;
    let root: Card | null = null;
    board.forEach((s) => s.cards.forEach((c) => { if (c.id === parsed.rootId) root = c; }));
    if (!root) return null;
    const r = root as Card;

    const { data: slot } = await supabase.from("slots").insert({ user_id: userId, name: "" }).select().single();
    if (!slot) return null;

    const copyFields = { ...r } as Partial<Card>;
    delete copyFields.id;
    delete copyFields.created_at;
    delete copyFields.updated_at;
    delete copyFields.slot_id;
    delete copyFields.recur_freq;
    delete copyFields.recur_until;

    const { data: card } = await supabase
      .from("cards")
      .insert({
        ...copyFields,
        user_id: userId,
        slot_id: slot.id,
        date: parsed.date,
        due: shortISO(parsed.date),
        occurrence_date: parsed.date,
        origin: r.id,
        paid: false,
        skipped: false,
        position_in_slot: 0,
        ...patch,
      })
      .select()
      .single();
    if (!card) return null;

    setBoard((b) => [{ ...slot, cards: [card as Card] }, ...b]);
    return card as Card;
  }

  // Marks a single occurrence as skipped so the generator omits it, without
  // touching any other occurrence in the series. Virtual occurrences get
  // materialized with skipped:true; already-materialized exception rows are
  // just flagged in place (a plain delete would remove the divergence and
  // let the rule regenerate a virtual occurrence for that date instead).
  // Returns how the skip was applied, so a caller can undo it correctly:
  // a virtual occurrence gets a brand-new row (wasVirtual: true) that undo
  // should delete outright to fall back to a normal virtual occurrence
  // again; an already-materialized row just gets flagged (wasVirtual:
  // false) and undo should simply clear the flag, preserving whatever
  // that row's own values already were.
  async function skipOccurrence(id: string): Promise<{ id: string; wasVirtual: boolean } | null> {
    if (isVirtualId(id)) {
      const card = await materializeOccurrence(id, { skipped: true });
      return card ? { id: card.id, wasVirtual: true } : null;
    }
    setBoard((b) => b.map((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, skipped: true } : c)) })));
    await supabase.from("cards").update({ skipped: true }).eq("id", id);
    return { id, wasVirtual: false };
  }

  // Reverses skipOccurrence. For a row that was materialized purely to
  // record the skip, deletes it outright (falling back to a generated
  // virtual occurrence again, so it stays in sync with the series going
  // forward); for a row that already existed, just clears the flag.
  async function unskipOccurrence(id: string, wasVirtual: boolean) {
    if (wasVirtual) {
      let slotId: string | null = null;
      board.forEach((s) => s.cards.forEach((c) => { if (c.id === id) slotId = c.slot_id; }));
      setBoard((b) => b.map((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== id) })).filter((s) => s.cards.length > 0));
      await supabase.from("cards").delete().eq("id", id);
      if (slotId) await supabase.from("slots").delete().eq("id", slotId);
      return;
    }
    setBoard((b) => b.map((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, skipped: false } : c)) })));
    await supabase.from("cards").update({ skipped: false }).eq("id", id);
  }

  // Ends a series so nothing generates after the given occurrence — the
  // occurrence itself (root or child) still stands, but recur_until caps
  // the rule right there. Non-destructive: any already-materialized rows
  // past that date stay in the database, just no longer surfaced by the
  // generator (mergeOccurrences only visits projected dates).
  async function stopRecurrence(cardId: string) {
    let root: Card | null = null;
    let stopDate: string | null = null;

    if (isVirtualId(cardId)) {
      const parsed = parseVirtualId(cardId);
      if (!parsed) return;
      stopDate = parsed.date;
      board.forEach((s) => s.cards.forEach((c) => { if (c.id === parsed.rootId) root = c; }));
    } else {
      let card: Card | null = null;
      board.forEach((s) => s.cards.forEach((c) => { if (c.id === cardId) card = c; }));
      if (!card) return;
      const cc = card as Card;
      if (!cc.origin) {
        root = cc;
        stopDate = cc.date;
      } else {
        stopDate = cc.occurrence_date || cc.date;
        board.forEach((s) => s.cards.forEach((c) => { if (c.id === cc.origin) root = c; }));
      }
    }
    if (!root || !stopDate) return;
    const r = root as Card;

    setBoard((b) => b.map((s) => ({ ...s, cards: s.cards.map((c) => (c.id === r.id ? { ...c, recur_until: stopDate } : c)) })));
    await supabase.from("cards").update({ recur_until: stopDate }).eq("id", r.id);
  }

  // "Edit this and future occurrences": caps the existing series the day
  // before this occurrence, then turns this occurrence into a new series
  // root carrying the rest of the original recur_freq/recur_until — so any
  // field edits the caller makes next (via the normal onUpdate path) only
  // affect this occurrence forward, leaving earlier occurrences untouched.
  // Returns the new root card so the caller can retarget an open editor.
  async function splitSeriesFrom(occurrenceId: string): Promise<Card | null> {
    if (!userId) return null;
    let root: Card | null = null;
    let occurrenceDate: string | null = null;
    let existingRow: Card | null = null;

    if (isVirtualId(occurrenceId)) {
      const parsed = parseVirtualId(occurrenceId);
      if (!parsed) return null;
      occurrenceDate = parsed.date;
      board.forEach((s) => s.cards.forEach((c) => { if (c.id === parsed.rootId) root = c; }));
    } else {
      board.forEach((s) => s.cards.forEach((c) => { if (c.id === occurrenceId) existingRow = c; }));
      if (!existingRow) return null;
      occurrenceDate = (existingRow as Card).occurrence_date || (existingRow as Card).date;
      board.forEach((s) => s.cards.forEach((c) => { if (c.id === (existingRow as Card).origin) root = c; }));
    }
    if (!root || !occurrenceDate) return null;
    const r = root as Card;
    const oldUntil = r.recur_until;
    const dayBefore = addDaysISO(occurrenceDate, -1);

    await supabase.from("cards").update({ recur_until: dayBefore }).eq("id", r.id);
    setBoard((b) => b.map((s) => ({ ...s, cards: s.cards.map((c) => (c.id === r.id ? { ...c, recur_until: dayBefore } : c)) })));

    let newRoot: Card;
    if (existingRow) {
      const updates: Partial<Card> = { origin: null, recur_freq: r.recur_freq, recur_until: oldUntil, occurrence_date: null };
      await supabase.from("cards").update(updates).eq("id", (existingRow as Card).id);
      newRoot = { ...(existingRow as Card), ...updates };
      setBoard((b) => b.map((s) => ({ ...s, cards: s.cards.map((c) => (c.id === newRoot.id ? newRoot : c)) })));
    } else {
      const { data: slot } = await supabase.from("slots").insert({ user_id: userId, name: "" }).select().single();
      if (!slot) return null;
      const copyFields = { ...r } as Partial<Card>;
      delete copyFields.id;
      delete copyFields.created_at;
      delete copyFields.updated_at;
      delete copyFields.slot_id;
      const { data: card } = await supabase
        .from("cards")
        .insert({
          ...copyFields,
          user_id: userId,
          slot_id: slot.id,
          date: occurrenceDate,
          due: shortISO(occurrenceDate),
          occurrence_date: null,
          origin: null,
          recur_freq: r.recur_freq,
          recur_until: oldUntil,
          paid: false,
          skipped: false,
          position_in_slot: 0,
        })
        .select()
        .single();
      if (!card) return null;
      newRoot = card as Card;
      setBoard((b) => [{ ...slot, cards: [newRoot] }, ...b]);
    }

    // Any later materialized exceptions of the old root now belong under
    // the new root instead (the old root's rule no longer reaches them).
    const laterExceptions: Card[] = [];
    board.forEach((s) => s.cards.forEach((c) => {
      if (c.origin === r.id && c.id !== newRoot.id && c.occurrence_date && c.occurrence_date >= (occurrenceDate as string)) laterExceptions.push(c);
    }));
    if (laterExceptions.length) {
      const ids = laterExceptions.map((c) => c.id);
      await supabase.from("cards").update({ origin: newRoot.id }).in("id", ids);
      setBoard((b) => b.map((s) => ({ ...s, cards: s.cards.map((c) => (ids.includes(c.id) ? { ...c, origin: newRoot.id } : c)) })));
    }

    return newRoot;
  }

  // --- custom card types -----------------------------------------------------

  async function createCustomType(label: string, hue: number) {
    if (!userId) return null;
    const key = "ctype_" + crypto.randomUUID().slice(0, 8);
    const def: CardTypeDef = { key, label, hue, blurb: "Custom", custom: true };
    const { error } = await supabase.from("card_types").insert({ user_id: userId, key, label, hue, blurb: "Custom" });
    if (error) return null;
    registerCardType(def);
    setCustomTypes((p) => [...p, def]);
    return key;
  }

  async function updateCustomType(key: string, label: string, hue: number) {
    registerCardType({ key, label, hue, blurb: "Custom", custom: true });
    setCustomTypes((p) => p.map((d) => (d.key === key ? { ...d, label, hue } : d)));
    await supabase.from("card_types").update({ label, hue }).eq("key", key);
  }

  async function deleteCustomType(key: string) {
    if (!userId) return;
    const idSet = new Set(board.flatMap((s) => s.cards.filter((c) => c.type === key).map((c) => c.id)));
    const emptiedSlotIds = board.filter((s) => s.cards.length && s.cards.every((c) => idSet.has(c.id))).map((s) => s.id);
    setBoard((b) => b.map((s) => ({ ...s, cards: s.cards.filter((c) => !idSet.has(c.id)) })).filter((s) => s.cards.length > 0));
    unregisterCardType(key);
    setCustomTypes((p) => p.filter((d) => d.key !== key));
    if (idSet.size) await supabase.from("cards").delete().in("id", Array.from(idSet));
    if (emptiedSlotIds.length) await supabase.from("slots").delete().in("id", emptiedSlotIds);
    await supabase.from("card_types").delete().eq("key", key);
  }

  async function updateCard(cardId: string, patch: Partial<Card>) {
    setBoard((b) =>
      b.map((s) => ({ ...s, cards: s.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) })),
    );
    await supabase.from("cards").update(patch).eq("id", cardId);
  }

  // If any of the cards about to be deleted is the root of a recurring
  // series (origin === null, other cards' origin points at it) and that
  // series has surviving members outside the delete set, promote the
  // earliest surviving member to be the new root instead of leaving the
  // rest of the series pointing at a since-deleted id. Without this, the
  // FK's `on delete set null` silently ungroups every remaining occurrence
  // from the series (no crash, but "N copies / Remove all copies" breaks).
  async function promoteRootsBeforeDelete(idsBeingDeleted: string[]) {
    const deleteSet = new Set(idsBeingDeleted);
    const allCards: Card[] = [];
    board.forEach((s) => s.cards.forEach((c) => allCards.push(c)));

    for (const id of idsBeingDeleted) {
      const card = allCards.find((c) => c.id === id);
      if (!card || card.origin) continue; // not a root
      const siblings = allCards.filter((c) => c.origin === id && !deleteSet.has(c.id));
      if (!siblings.length) continue;
      siblings.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
      const [newRoot, ...others] = siblings;

      await supabase.from("cards").update({ origin: null }).eq("id", newRoot.id);
      const otherIds = others.map((o) => o.id);
      if (otherIds.length) await supabase.from("cards").update({ origin: newRoot.id }).in("id", otherIds);

      setBoard((b) => b.map((s) => ({
        ...s,
        cards: s.cards.map((c) => {
          if (c.id === newRoot.id) return { ...c, origin: null };
          if (otherIds.includes(c.id)) return { ...c, origin: newRoot.id };
          return c;
        }),
      })));
    }
  }

  async function deleteCard(cardId: string) {
    await promoteRootsBeforeDelete([cardId]);
    let emptiedSlotId: string | null = null;
    setBoard((b) =>
      b
        .map((s) => {
          if (!s.cards.some((c) => c.id === cardId)) return s;
          const remaining = s.cards.filter((c) => c.id !== cardId);
          if (remaining.length === 0) emptiedSlotId = s.id;
          return { ...s, cards: remaining };
        })
        .filter((s) => s.cards.length > 0),
    );
    await supabase.from("cards").delete().eq("id", cardId);
    if (emptiedSlotId) await supabase.from("slots").delete().eq("id", emptiedSlotId);
  }

  // Drag sourceSlot onto targetSlot: move all of source's cards into target,
  // then remove the now-empty source slot. Mirrors app.jsx's merge().
  async function merge(sourceSlotId: string, targetSlotId: string) {
    if (sourceSlotId === targetSlotId) return;
    const source = board.find((s) => s.id === sourceSlotId);
    const target = board.find((s) => s.id === targetSlotId);
    if (!source || !target) return;

    const startPos = target.cards.length;
    setBoard((b) =>
      b
        .map((s) =>
          s.id === targetSlotId ? { ...s, cards: [...s.cards, ...source.cards] } : s,
        )
        .filter((s) => s.id !== sourceSlotId),
    );

    await Promise.all(
      source.cards.map((c, i) =>
        supabase.from("cards").update({ slot_id: targetSlotId, position_in_slot: startPos + i }).eq("id", c.id),
      ),
    );
    await supabase.from("slots").delete().eq("id", sourceSlotId);
  }

  // Pop one card out of a stack into its own new slot.
  async function unstack(slotId: string, cardId: string) {
    if (!userId) return;
    const { data: newSlot } = await supabase
      .from("slots")
      .insert({ user_id: userId, name: "" })
      .select()
      .single();
    if (!newSlot) return;

    setBoard((b) => {
      const out: BoardSlot[] = [];
      let popped: Card | null = null;
      for (const s of b) {
        if (s.id === slotId) {
          popped = s.cards.find((c) => c.id === cardId) ?? null;
          const rest = s.cards.filter((c) => c.id !== cardId);
          if (rest.length) out.push({ ...s, cards: rest });
        } else out.push(s);
      }
      if (popped) out.push({ ...newSlot, cards: [{ ...popped, slot_id: newSlot.id }] });
      return out;
    });

    await supabase.from("cards").update({ slot_id: newSlot.id, position_in_slot: 0 }).eq("id", cardId);
  }

  // Split every card in a stack out into its own slot.
  async function ungroup(slotId: string) {
    if (!userId) return;
    const slot = board.find((s) => s.id === slotId);
    if (!slot) return;

    const newSlots = await Promise.all(
      slot.cards.map(() => supabase.from("slots").insert({ user_id: userId, name: "" }).select().single()),
    );

    setBoard((b) => {
      const out: BoardSlot[] = [];
      for (const s of b) {
        if (s.id === slotId) {
          s.cards.forEach((c, i) => {
            const ns = newSlots[i].data;
            if (ns) out.push({ ...ns, cards: [{ ...c, slot_id: ns.id }] });
          });
        } else out.push(s);
      }
      return out;
    });

    await Promise.all(
      slot.cards.map((c, i) => {
        const ns = newSlots[i].data;
        return ns ? supabase.from("cards").update({ slot_id: ns.id, position_in_slot: 0 }).eq("id", c.id) : null;
      }),
    );
    await supabase.from("slots").delete().eq("id", slotId);
  }

  async function renameSlot(slotId: string, name: string) {
    setBoard((b) => b.map((s) => (s.id === slotId ? { ...s, name } : s)));
    await supabase.from("slots").update({ name }).eq("id", slotId);
  }

  // Assign an explicit display order (0..n) to the given cards, by id
  // position. Mirrors app.jsx's applyCardOrder() — used by the Note and
  // custom-type Section views' drag-to-reorder.
  async function applyCardOrder(orderedIds: string[]) {
    const rank: Record<string, number> = {};
    orderedIds.forEach((id, i) => { rank[id] = i; });
    setBoard((b) => b.map((s) => ({ ...s, cards: s.cards.map((c) => (c.id in rank ? { ...c, card_order: rank[c.id] } : c)) })));
    await Promise.all(orderedIds.map((id, i) => supabase.from("cards").update({ card_order: i }).eq("id", id)));
  }

  // Stamp a dated COPY of a reusable (undated) card onto a calendar day —
  // the original stays in the tray so it can be reused across many days.
  // Mirrors app.jsx's stampCard().
  async function stampCard(cardId: string, date: string) {
    if (!userId) return;
    let master: Card | null = null;
    board.forEach((s) => s.cards.forEach((c) => { if (c.id === cardId) master = c; }));
    if (!master) return;
    const m = master as Card;

    const { data: slot } = await supabase.from("slots").insert({ user_id: userId, name: "" }).select().single();
    if (!slot) return;

    const copyFields = { ...m } as Partial<Card>;
    delete copyFields.id;
    delete copyFields.created_at;
    delete copyFields.updated_at;
    delete copyFields.slot_id;

    const { data: copy } = await supabase
      .from("cards")
      .insert({ ...copyFields, user_id: userId, slot_id: slot.id, date, origin: m.origin || m.id, position_in_slot: 0 })
      .select()
      .single();
    if (!copy) return;

    setBoard((b) => [{ ...slot, cards: [copy as Card] }, ...b]);
  }

  async function bulkDeleteBills(ids: string[]) {
    if (!ids.length) return;
    await promoteRootsBeforeDelete(ids);
    const idSet = new Set(ids);
    const emptiedSlotIds = board.filter((s) => s.cards.every((c) => idSet.has(c.id))).map((s) => s.id);
    setBoard((b) => b.map((s) => ({ ...s, cards: s.cards.filter((c) => !idSet.has(c.id)) })).filter((s) => s.cards.length > 0));
    await supabase.from("cards").delete().in("id", ids);
    if (emptiedSlotIds.length) await supabase.from("slots").delete().in("id", emptiedSlotIds);
  }

  async function bulkMarkBills(ids: string[], paid: boolean) {
    if (!ids.length) return;
    const idSet = new Set(ids);
    setBoard((b) => b.map((s) => ({ ...s, cards: s.cards.map((c) => (idSet.has(c.id) ? { ...c, paid } : c)) })));
    await supabase.from("cards").update({ paid }).in("id", ids);
  }

  return {
    board, loading, userId, customTypes, reload, addCard, updateCard, deleteCard, merge, unstack, ungroup, renameSlot,
    stampCard, bulkDeleteBills, bulkMarkBills, applyCardOrder, restoreCards, materializeOccurrence,
    skipOccurrence, unskipOccurrence, stopRecurrence, splitSeriesFrom,
    createCustomType, updateCustomType, deleteCustomType,
  };
}
