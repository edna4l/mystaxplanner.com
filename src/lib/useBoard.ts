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
import { parseISO, toISODate } from "@/lib/date";

const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

  async function deleteCard(cardId: string) {
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

  // Copy each recurring bill dated in the source month into targetY/targetM,
  // skipping any series (origin) that already has a copy there; shifts the
  // day-of-month, clamped to the target month's day count. Mirrors app.jsx's
  // extendBills(), used both by the manual "Extend forward/back" buttons and
  // BillsView's auto-carry-forward into empty months.
  async function extendBills(cardsToExtend: Card[], targetY: number, targetM: number) {
    if (!userId || !cardsToExtend.length) return;
    const existing = new Set<string>();
    board.forEach((s) => s.cards.forEach((c) => {
      if (c.type !== "bill" || !c.date) return;
      const p = parseISO(c.date);
      if (p && p.y === targetY && p.m === targetM) existing.add(c.origin || c.id);
    }));
    const daysInTarget = new Date(targetY, targetM + 1, 0).getDate();
    const toCreate = cardsToExtend.filter((c) => !existing.has(c.origin || c.id));
    if (!toCreate.length) return;

    const created: { slot: Slot; card: Card }[] = [];
    for (const c of toCreate) {
      const root = c.origin || c.id;
      const p = parseISO(c.date);
      let date: string | null = null;
      let due = c.due || "";
      if (p) {
        const day = Math.min(p.d, daysInTarget);
        date = toISODate(targetY, targetM, day);
        due = MON3[targetM] + " " + day;
      }
      const { data: slot } = await supabase.from("slots").insert({ user_id: userId, name: "" }).select().single();
      if (!slot) continue;
      const copyFields = { ...c } as Partial<Card>;
      delete copyFields.id;
      delete copyFields.created_at;
      delete copyFields.updated_at;
      delete copyFields.slot_id;
      const { data: card } = await supabase
        .from("cards")
        .insert({ ...copyFields, user_id: userId, slot_id: slot.id, date, due, paid: false, origin: root, position_in_slot: 0 })
        .select()
        .single();
      if (card) created.push({ slot, card: card as Card });
    }
    if (created.length) setBoard((b) => [...created.map((r) => ({ ...r.slot, cards: [r.card] })), ...b]);
  }

  async function bulkDeleteBills(ids: string[]) {
    if (!ids.length) return;
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
    stampCard, extendBills, bulkDeleteBills, bulkMarkBills, applyCardOrder, restoreCards,
    createCustomType, updateCustomType, deleteCustomType,
  };
}
