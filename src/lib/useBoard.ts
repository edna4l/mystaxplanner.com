"use client";

// Supabase-backed replacement for app.jsx's loadBoard()/localStorage pair.
// Same shape (BoardSlot[] = slots with .cards attached) so the ported UI
// components barely need to change, but every mutation now writes through
// to Postgres instead of localStorage, which is what makes the board sync
// across devices for a logged-in user.
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BoardSlot, Card, Slot, CardTypeDef } from "@/lib/types";
import { newCardFields, defaultTitleFor } from "@/lib/cardTypes";

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
    const [{ data: slots }, { data: cards }] = await Promise.all([
      supabase.from("slots").select("*").order("sort_order", { ascending: true }),
      supabase.from("cards").select("*").order("position_in_slot", { ascending: true }),
    ]);
    setBoard(groupIntoSlots(slots ?? [], (cards ?? []) as Card[]));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    reload();
  }, [reload]);

  // --- mutations -----------------------------------------------------------

  async function addCard(type: string, customTypes: Record<string, CardTypeDef> = {}, date?: string) {
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
        title: defaultTitleFor(type, customTypes),
        position_in_slot: 0,
        ...fields,
      })
      .select()
      .single();
    if (cardErr || !card) return null;

    setBoard((b) => [{ ...slot, cards: [card as Card] }, ...b]);
    return card as Card;
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

  return { board, loading, userId, reload, addCard, updateCard, deleteCard, merge, unstack, ungroup, renameSlot, stampCard };
}
