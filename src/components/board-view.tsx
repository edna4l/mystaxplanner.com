"use client";

// Ported from app.jsx's board grid + dragPropsFor (drag-to-stack).
import { useMemo, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { SquareCard, StackTile } from "@/components/square-card";
import { BillStackTile } from "@/components/bill-stack-tile";
import { summarizeBillsForBoard } from "@/lib/billBoardStack";

export function BoardView({
  board,
  onOpenCard,
  onOpenStack,
  onMerge,
  onOpenBillStack,
  onReviewBills,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onOpenStack: (slot: BoardSlot) => void;
  onMerge: (sourceSlotId: string, targetSlotId: string) => void;
  onOpenBillStack: (cards: Card[]) => void;
  onReviewBills: () => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Standalone bills (single-card slots) are pulled out of the grid and
  // summarized into one aggregate tile — manually-stacked slots are left
  // untouched. See src/lib/billBoardStack.ts.
  const billSummary = useMemo(() => summarizeBillsForBoard(board), [board]);
  const billCardIds = useMemo(
    () => (billSummary ? new Set(billSummary.groups.flatMap((g) => g.realCards.map((c) => c.id))) : null),
    [billSummary],
  );

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
      {billSummary ? (
        <div className="slot">
          <BillStackTile
            summary={billSummary}
            onOpen={() => onOpenBillStack(billSummary.groups.flatMap((g) => g.realCards))}
            onReviewBills={onReviewBills}
          />
        </div>
      ) : null}
      {board.map((s) => {
        if (billCardIds && s.cards.length === 1 && billCardIds.has(s.cards[0].id)) return null;
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
