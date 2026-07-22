"use client";

import { useMemo, useState } from "react";
import { useBoard } from "@/lib/useBoard";
import { BUILTIN_CARD_TYPES } from "@/lib/cardTypes";
import type { BoardSlot, Card } from "@/lib/types";
import { Topbar } from "@/components/topbar";
import { BoardView } from "@/components/board-view";
import { TodayView } from "@/components/today-view";
import { AddMenu } from "@/components/add-menu";
import { ExpandedCard } from "@/components/expanded-card";
import { StackFan } from "@/components/stack-fan";

type Open = { kind: "card"; cardId: string } | { kind: "fan"; slotId: string } | null;

export default function HomeClient() {
  const { board, loading, addCard, updateCard, deleteCard, merge, unstack, ungroup } = useBoard();
  const [view, setView] = useState<"today" | "board">("today");
  const [open, setOpen] = useState<Open>(null);
  const [addOpen, setAddOpen] = useState(false);

  const openCard = useMemo<Card | null>(() => {
    if (!open || open.kind !== "card") return null;
    for (const s of board) {
      const c = s.cards.find((x) => x.id === open.cardId);
      if (c) return c;
    }
    return null;
  }, [open, board]);

  const openSlot = useMemo<BoardSlot | null>(() => {
    if (!open || open.kind !== "fan") return null;
    return board.find((s) => s.id === open.slotId) ?? null;
  }, [open, board]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  async function handleAdd(type: string) {
    const card = await addCard(type, BUILTIN_CARD_TYPES);
    setAddOpen(false);
    if (card) setOpen({ kind: "card", cardId: card.id });
  }

  if (loading) {
    return <div className="app"><div className="today-empty" style={{ padding: 40, textAlign: "center" }}>Loading your board…</div></div>;
  }

  return (
    <div className="app">
      <Topbar greeting={greeting} dateStr={dateStr} view={view} onView={setView} onAdd={() => setAddOpen(true)} />

      {view === "today" ? (
        <TodayView
          board={board}
          onOpenCard={(c) => setOpen({ kind: "card", cardId: c.id })}
          onUpdate={updateCard}
          onGo={() => setView("board")}
        />
      ) : (
        <BoardView
          board={board}
          onOpenCard={(c) => setOpen({ kind: "card", cardId: c.id })}
          onOpenStack={(s) => setOpen({ kind: "fan", slotId: s.id })}
          onMerge={merge}
        />
      )}

      {openCard ? (
        <ExpandedCard
          card={openCard}
          onClose={() => setOpen(null)}
          onUpdate={(patch) => updateCard(openCard.id, patch)}
          onDelete={() => { deleteCard(openCard.id); setOpen(null); }}
        />
      ) : null}

      {openSlot ? (
        <StackFan
          slot={openSlot}
          onClose={() => setOpen(null)}
          onOpenCard={(c) => setOpen({ kind: "card", cardId: c.id })}
          onUnstack={(cardId) => unstack(openSlot.id, cardId)}
          onUngroup={() => { ungroup(openSlot.id); setOpen(null); }}
        />
      ) : null}

      {addOpen ? <AddMenu onPick={handleAdd} onClose={() => setAddOpen(false)} /> : null}
    </div>
  );
}
