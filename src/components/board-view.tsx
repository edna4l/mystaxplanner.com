"use client";

// Ported from app.jsx's board grid + dragPropsFor (drag-to-stack).
// Restructured into named sections: Today at a glance, Needs attention,
// Your stacks (anything recurring/grouped — bills, custom-type groups,
// manual stacks, habits, projects), and Notes & one-time items
// (everything else).
import { useMemo, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { SquareCard, StackTile } from "@/components/square-card";
import { BillStackTile } from "@/components/bill-stack-tile";
import { summarizeBillsForBoard } from "@/lib/billBoardStack";
import { CustomGroupStackTile } from "@/components/custom-group-tile";
import { groupCustomTypesForBoard } from "@/lib/customStack";
import { computeTodaySummary } from "@/lib/todaySummary";
import { TodayGlance } from "@/components/today-glance";
import { NeedsAttention } from "@/components/needs-attention";

export function BoardView({
  board,
  onOpenCard,
  onOpenStack,
  onMerge,
  onOpenBillStack,
  onReviewBills,
  onOpenCardGroup,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onOpenStack: (slot: BoardSlot) => void;
  onMerge: (sourceSlotId: string, targetSlotId: string) => void;
  onOpenBillStack: (cards: Card[]) => void;
  onReviewBills: () => void;
  onOpenCardGroup: (label: string, cards: Card[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Standalone bills (single-card slots) are pulled out of the grid and
  // summarized into one aggregate tile — manually-stacked slots are left
  // untouched. See src/lib/billBoardStack.ts.
  const billSummary = useMemo(() => summarizeBillsForBoard(board), [board]);
  // Custom-type cards sharing a title (e.g. several "CBT Counseling"
  // cards) get the same treatment, purely for display — ungrouped
  // singles just fall through to the Notes & one-time items bucket
  // below like any other non-recurring card. See src/lib/customStack.ts.
  const customGroups = useMemo(() => groupCustomTypesForBoard(board).groups, [board]);
  const todaySummary = useMemo(() => computeTodaySummary(board), [board]);

  const groupedCardIds = useMemo(() => {
    const ids = new Set<string>();
    if (billSummary) billSummary.groups.forEach((g) => g.allCardIds.forEach((id) => ids.add(id)));
    customGroups.forEach((g) => g.cards.forEach((c) => ids.add(c.id)));
    return ids;
  }, [billSummary, customGroups]);

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

  function slotTile(s: BoardSlot, wide?: boolean) {
    const over = overId === s.id;
    const dp = dragPropsFor(s.id);
    const cls = "slot" + (over ? " over" : "") + (dragId === s.id ? " dragging" : "") + (wide ? " wide" : "");
    if (s.cards.length === 1) {
      return (
        <div key={s.id} className={cls} {...dp}>
          <SquareCard card={s.cards[0]} onOpen={(e) => onOpenCard(s.cards[0], e.currentTarget.getBoundingClientRect())} />
        </div>
      );
    }
    return (
      <div key={s.id} className={cls} {...dp}>
        <StackTile cards={s.cards} slotName={s.name} onOpen={() => onOpenStack(s)} />
      </div>
    );
  }

  const stackSlots: React.ReactNode[] = [];
  const noteSlots: React.ReactNode[] = [];

  if (billSummary) {
    stackSlots.push(
      <div key="__bills" className="slot wide">
        <BillStackTile
          summary={billSummary}
          onOpen={() => onOpenBillStack(billSummary.groups.flatMap((g) => g.realCards))}
          onReviewBills={onReviewBills}
        />
      </div>,
    );
  }
  customGroups.forEach((g) => {
    stackSlots.push(
      <div key={"__cg_" + g.key} className="slot wide">
        <CustomGroupStackTile group={g} onOpen={() => onOpenCardGroup(g.title, g.cards)} />
      </div>,
    );
  });

  board.forEach((s) => {
    if (s.cards.length === 1 && groupedCardIds.has(s.cards[0].id)) return;
    if (s.cards.length > 1) {
      stackSlots.push(slotTile(s));
      return;
    }
    const card = s.cards[0];
    if (card.type === "habit") { stackSlots.push(slotTile(s)); return; }
    if (card.type === "project") { stackSlots.push(slotTile(s, (card.checklist?.length ?? 0) > 0)); return; }
    noteSlots.push(slotTile(s));
  });

  return (
    <>
      <TodayGlance summary={todaySummary} onOpenCard={onOpenCard} />
      <NeedsAttention summary={todaySummary} onOpenCard={onOpenCard} onOpenCategory={onOpenCardGroup} />
      {stackSlots.length ? (
        <>
          <span className="section-label board-section-label">Your stacks</span>
          <main className="board">{stackSlots}</main>
        </>
      ) : null}
      {noteSlots.length ? (
        <>
          <span className="section-label board-section-label">Notes &amp; one-time items</span>
          <main className="board">{noteSlots}</main>
        </>
      ) : null}
    </>
  );
}
