"use client";

// Ported from app.jsx's board grid + dragPropsFor (drag-to-stack).
import { useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { SquareCard, StackTile } from "@/components/square-card";

export function BoardView({
  board,
  onOpenCard,
  onOpenStack,
  onMerge,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onOpenStack: (slot: BoardSlot) => void;
  onMerge: (sourceSlotId: string, targetSlotId: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function dragPropsFor(slotId: string): React.HTMLAttributes<HTMLDivElement> {
    return {
      draggable: true,
      onDragStart: () => setDragId(slotId),
      onDragEnd: () => { setDragId(null); setOverId(null); },
      onDragOver: (e) => { if (dragId && dragId !== slotId) { e.preventDefault(); setOverId(slotId); } },
      onDragLeave: () => setOverId((o) => (o === slotId ? null : o)),
      onDrop: (e) => { e.preventDefault(); if (dragId) onMerge(dragId, slotId); setDragId(null); setOverId(null); },
    };
  }

  if (!board.length) {
    return <main className="board"><div className="section-empty">No cards yet — tap “+ New card” to start.</div></main>;
  }

  return (
    <main className="board">
      {board.map((s) => {
        const over = overId === s.id;
        const dp = dragPropsFor(s.id);
        if (s.cards.length === 1) {
          return (
            <div key={s.id} className={"slot" + (over ? " over" : "") + (dragId === s.id ? " dragging" : "")} {...dp}>
              <SquareCard card={s.cards[0]} onOpen={(e) => onOpenCard(s.cards[0], e.currentTarget.getBoundingClientRect())} />
            </div>
          );
        }
        return (
          <div key={s.id} className={"slot" + (over ? " over" : "") + (dragId === s.id ? " dragging" : "")} {...dp}>
            <StackTile cards={s.cards} slotName={s.name} onOpen={() => onOpenStack(s)} />
          </div>
        );
      })}
    </main>
  );
}
