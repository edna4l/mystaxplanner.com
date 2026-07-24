"use client";

// Ported from app.jsx's board grid + dragPropsFor (drag-to-stack).
// Restructured into named sections: Today at a glance, Needs attention,
// Your stacks (anything recurring/grouped — bills, custom-type groups,
// manual stacks, habits, projects), and Notes & one-time items
// (everything else). Same sort options as the Bills page (bills-view.tsx).
import { useMemo, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { SquareCard, StackTile } from "@/components/square-card";
import { BillStackTile } from "@/components/bill-stack-tile";
import { summarizeBillsForBoard } from "@/lib/billBoardStack";
import { CustomGroupStackTile } from "@/components/custom-group-tile";
import { groupCustomTypesForBoard } from "@/lib/customStack";
import { computeTodaySummary } from "@/lib/todaySummary";
import { soonestDate } from "@/lib/date";
import { TodayGlance } from "@/components/today-glance";
import { NeedsAttention } from "@/components/needs-attention";

type SortKey = "date" | "amount" | "amount-asc" | "name" | "name-desc" | "category";

interface SortableTile {
  key: string;
  node: React.ReactNode;
  title: string;
  date: string | null;
  amount: number | null;
  category: string | null;
}

function cmpBy(key: SortKey): (a: SortableTile, b: SortableTile) => number {
  if (key === "amount") return (a, b) => (b.amount ?? -Infinity) - (a.amount ?? -Infinity);
  if (key === "amount-asc") return (a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity);
  if (key === "name") return (a, b) => a.title.localeCompare(b.title);
  if (key === "name-desc") return (a, b) => b.title.localeCompare(a.title);
  if (key === "category") return (a, b) => (a.category || "~").localeCompare(b.category || "~");
  return (a, b) => (a.date || "~").localeCompare(b.date || "~");
}

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
  const [sortBy, setSortBy] = useState<SortKey>("date");

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

  const stackSlots: SortableTile[] = [];
  const noteSlots: SortableTile[] = [];

  if (billSummary) {
    const billsDate = billSummary.groups.map((g) => g.nextDue?.date).filter((d): d is string => !!d).sort()[0] ?? null;
    stackSlots.push({
      key: "__bills",
      title: "Bills",
      date: billsDate,
      amount: billSummary.totalDueSoon,
      category: null,
      node: (
        <div key="__bills" className="slot wide">
          <BillStackTile
            summary={billSummary}
            onOpen={() => onOpenBillStack(billSummary.groups.flatMap((g) => g.realCards))}
            onReviewBills={onReviewBills}
          />
        </div>
      ),
    });
  }
  customGroups.forEach((g) => {
    stackSlots.push({
      key: "__cg_" + g.key,
      title: g.title,
      date: g.nextDate,
      amount: null,
      category: null,
      node: (
        <div key={"__cg_" + g.key} className="slot wide">
          <CustomGroupStackTile group={g} onOpen={() => onOpenCardGroup(g.title, g.cards)} />
        </div>
      ),
    });
  });

  board.forEach((s) => {
    if (s.cards.length === 1 && groupedCardIds.has(s.cards[0].id)) return;
    if (s.cards.length > 1) {
      stackSlots.push({
        key: s.id,
        title: s.name || s.cards[0].title,
        date: soonestDate(s.cards.map((c) => c.date)),
        amount: null,
        category: null,
        node: slotTile(s),
      });
      return;
    }
    const card = s.cards[0];
    const tile: SortableTile = {
      key: s.id,
      title: card.title,
      date: card.date,
      amount: card.type === "bill" ? card.amount : null,
      category: card.category,
      node: slotTile(s, card.type === "project" && (card.checklist?.length ?? 0) > 0),
    };
    if (card.type === "habit" || card.type === "project") stackSlots.push(tile);
    else noteSlots.push(tile);
  });

  const sortedStacks = [...stackSlots].sort(cmpBy(sortBy));
  const sortedNotes = [...noteSlots].sort(cmpBy(sortBy));

  return (
    <>
      <TodayGlance summary={todaySummary} onOpenCard={onOpenCard} />
      <NeedsAttention summary={todaySummary} onOpenCard={onOpenCard} onOpenCategory={onOpenCardGroup} />
      {stackSlots.length || noteSlots.length ? (
        <div className="board-sort-row">
          <select className="bsort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} title="Sort board">
            <option value="date">Sort: Date</option>
            <option value="amount">Sort: Amount (high→low)</option>
            <option value="amount-asc">Sort: Amount (low→high)</option>
            <option value="name">Sort: A→Z</option>
            <option value="name-desc">Sort: Z→A</option>
            <option value="category">Sort: Category</option>
          </select>
        </div>
      ) : null}
      {sortedStacks.length ? (
        <>
          <span className="section-label board-section-label">Your stacks</span>
          <main className="board">{sortedStacks.map((t) => t.node)}</main>
        </>
      ) : null}
      {sortedNotes.length ? (
        <>
          <span className="section-label board-section-label">Notes &amp; one-time items</span>
          <main className="board">{sortedNotes.map((t) => t.node)}</main>
        </>
      ) : null}
    </>
  );
}
