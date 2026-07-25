"use client";

// Ported from app.jsx's board grid + dragPropsFor (drag-to-stack).
// Restructured into named sections: Today at a glance, Needs attention,
// a view switch (Stacks/Cards/Timeline), and the board itself. "Stacks"
// groups anything recurring/grouped (bills, custom-type groups, manual
// stacks, habits, projects) under "Your stacks" with everything else
// under "Notes & one-time items"; "Cards" is a flat grid of every real
// card with no grouping at all; "Timeline" is the same grouped tiles as
// Stacks, laid out chronologically by month instead of by category.
// Same sort options as the Bills page (bills-view.tsx).
import { useMemo, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import type { Tweaks } from "@/lib/theme";
import { SquareCard, StackTile } from "@/components/square-card";
import { BillStackTile } from "@/components/bill-stack-tile";
import { summarizeBillsForBoard } from "@/lib/billBoardStack";
import { CustomGroupStackTile } from "@/components/custom-group-tile";
import { groupCustomTypesForBoard } from "@/lib/customStack";
import { computeTodaySummary } from "@/lib/todaySummary";
import { soonestDate, todayISO } from "@/lib/date";
import { TodayGlance } from "@/components/today-glance";
import { NeedsAttention } from "@/components/needs-attention";
import { SmartSuggestionBanner } from "@/components/smart-suggestion-banner";
import { detectStackSuggestions } from "@/lib/smartSuggestions";

type SortKey = "date" | "amount" | "amount-asc" | "name" | "name-desc" | "category";
type BoardMode = Tweaks["boardView"];
const BOARD_MODES: BoardMode[] = ["Stacks", "Cards", "Timeline", "Now/Next/Later"];

interface SortableTile {
  key: string;
  node: React.ReactNode;
  title: string;
  date: string | null;
  amount: number | null;
  category: string | null;
  // Only set for single-card tiles — lets Now/Next/Later special-case
  // habits (whose .date is normally unset) against todaySummary's
  // habitsRisk list instead of bucketing them by date like everything
  // else.
  type?: string;
  cardId?: string;
}

function cmpBy(key: SortKey): (a: SortableTile, b: SortableTile) => number {
  if (key === "amount") return (a, b) => (b.amount ?? -Infinity) - (a.amount ?? -Infinity);
  if (key === "amount-asc") return (a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity);
  if (key === "name") return (a, b) => a.title.localeCompare(b.title);
  if (key === "name-desc") return (a, b) => b.title.localeCompare(a.title);
  if (key === "category") return (a, b) => (a.category || "~").localeCompare(b.category || "~");
  return (a, b) => (a.date || "~").localeCompare(b.date || "~");
}

function monthLabel(dateKey: string): string {
  if (dateKey === "undated") return "No date";
  const [y, m] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function BoardEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="board-empty">
      <span className="board-empty-icon" aria-hidden="true">🗂️</span>
      <h3 className="board-empty-title">Your board is empty</h3>
      <p className="board-empty-sub">Bills, tasks, habits, notes — everything you add lands here as a card.</p>
      <button className="cover-add-btn" onClick={onAdd}>+ Add your first card</button>
    </div>
  );
}

export function BoardView({
  board,
  onOpenCard,
  onOpenStack,
  onMerge,
  onOpenBillStack,
  onReviewBills,
  onOpenCardGroup,
  boardView,
  onChangeBoardView,
  dismissedSuggestions,
  onDismissSuggestion,
  onAdd,
  onUpdateCard,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onOpenStack: (slot: BoardSlot) => void;
  onMerge: (sourceSlotId: string, targetSlotId: string) => void;
  onOpenBillStack: (cards: Card[]) => void;
  onReviewBills: () => void;
  onOpenCardGroup: (label: string, cards: Card[]) => void;
  boardView: BoardMode;
  onChangeBoardView: (mode: BoardMode) => void;
  dismissedSuggestions: string[];
  onDismissSuggestion: (key: string) => void;
  onAdd: () => void;
  onUpdateCard: (id: string, patch: Partial<Card>) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [laneOverKey, setLaneOverKey] = useState<string | null>(null);
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
  const suggestions = useMemo(() => detectStackSuggestions(board, dismissedSuggestions), [board, dismissedSuggestions]);

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

  // Now/Next/Later buckets are purely computed from date (see nowTiles/
  // nextTiles/laterTiles below) — there's no persisted "which lane" field
  // to write to, so dragging a card into a different lane just moves its
  // due date into that lane's range instead. Only single-card slots have
  // one unambiguous date to move; manual multi-card stacks are left out
  // (dragId simply won't resolve to a single card for those, so the drop
  // silently no-ops), and habits don't move since their lane comes from
  // streak risk, not a date field.
  function laneTargetDate(key: string): string | null {
    if (key === "now") return todayISO(0);
    if (key === "next") return todayISO(3);
    return null; // Later: no date at all, same as any other undated card
  }
  function laneDropProps(key: string): React.HTMLAttributes<HTMLDivElement> {
    return {
      onDragOver: (e) => { if (dragId) { e.preventDefault(); setLaneOverKey(key); } },
      onDragLeave: () => setLaneOverKey((k) => (k === key ? null : k)),
      onDrop: (e) => {
        e.preventDefault();
        if (dragId) {
          const slot = board.find((s) => s.id === dragId);
          if (slot && slot.cards.length === 1 && slot.cards[0].type !== "habit") {
            onUpdateCard(slot.cards[0].id, { date: laneTargetDate(key) });
          }
        }
        setDragId(null); setLaneOverKey(null);
      },
    };
  }

  if (!board.length) {
    return <main className="board"><BoardEmpty onAdd={onAdd} /></main>;
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
            onOpen={() => onOpenBillStack(billSummary.groups.flatMap((g) => g.realCards.filter((c) => !c.paid)))}
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
      type: card.type,
      cardId: card.id,
      node: slotTile(s, card.type === "project" && (card.checklist?.length ?? 0) > 0),
    };
    if (card.type === "habit" || card.type === "project") stackSlots.push(tile);
    else noteSlots.push(tile);
  });

  // Cards mode bypasses every grouping above — literally one tile per
  // real card, the pre-stacking flat grid.
  const flatTiles: SortableTile[] = [];
  if (boardView === "Cards") {
    board.forEach((s) => {
      s.cards.forEach((c) => {
        flatTiles.push({
          key: c.id,
          title: c.title,
          date: c.date,
          amount: c.type === "bill" ? c.amount : null,
          category: c.category,
          node: (
            <div key={c.id} className="slot">
              <SquareCard card={c} onOpen={(e) => onOpenCard(c, e.currentTarget.getBoundingClientRect())} />
            </div>
          ),
        });
      });
    });
  }

  const sortedStacks = [...stackSlots].sort(cmpBy(sortBy));
  const sortedNotes = [...noteSlots].sort(cmpBy(sortBy));
  const sortedFlat = [...flatTiles].sort(cmpBy(sortBy));

  // Timeline reuses the same grouped tiles as Stacks (so it doesn't
  // re-flood the board with e.g. every individual bill history row) but
  // lays them out chronologically by month instead of by category. Not
  // memoized — stackSlots/noteSlots above are freshly rebuilt every
  // render already, so there's nothing to gain by memoizing this too,
  // and useMemo can't be called this late anyway (it'd run after the
  // `!board.length` early return above on some renders but not others,
  // which breaks the Rules of Hooks).
  let monthGroups: { key: string; label: string; tiles: SortableTile[] }[] = [];
  if (boardView === "Timeline") {
    const byMonth = new Map<string, SortableTile[]>();
    [...stackSlots, ...noteSlots].forEach((t) => {
      const key = t.date ? t.date.slice(0, 7) : "undated";
      const arr = byMonth.get(key) ?? [];
      arr.push(t);
      byMonth.set(key, arr);
    });
    monthGroups = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, tiles]) => ({ key, label: monthLabel(key), tiles: tiles.sort(cmpBy("date")) }));
  }

  // Now/Next/Later: same grouped tiles as Stacks/Timeline, bucketed by
  // urgency instead of category or month. A habit's own .date is
  // normally unset (it's tracked via a rolling completion window, not a
  // due date), so habits are special-cased against todaySummary's
  // habitsRisk instead — not done today lands in Now, already done
  // today is omitted entirely (nothing left to act on).
  const nowTiles: SortableTile[] = [];
  const nextTiles: SortableTile[] = [];
  const laterTiles: SortableTile[] = [];
  if (boardView === "Now/Next/Later") {
    const today = todayISO(0);
    const weekEnd = todayISO(7);
    const riskyHabitIds = new Set(todaySummary.habitsRisk.map((c) => c.id));
    [...stackSlots, ...noteSlots].forEach((t) => {
      if (t.type === "habit") {
        if (t.cardId && riskyHabitIds.has(t.cardId)) nowTiles.push(t);
        return;
      }
      if (!t.date) { laterTiles.push(t); return; }
      if (t.date <= today) nowTiles.push(t);
      else if (t.date <= weekEnd) nextTiles.push(t);
      else laterTiles.push(t);
    });
  }

  const hasAnyTiles = boardView === "Cards" ? sortedFlat.length > 0 : stackSlots.length > 0 || noteSlots.length > 0;

  return (
    <>
      <TodayGlance summary={todaySummary} onOpenCard={onOpenCard} />
      <NeedsAttention summary={todaySummary} onOpenCard={onOpenCard} onOpenCategory={onOpenCardGroup} />
      <SmartSuggestionBanner suggestions={suggestions} onReview={onOpenCardGroup} onDismiss={onDismissSuggestion} />
      <div className="board-sort-row">
        <div className="view-switch">
          {BOARD_MODES.map((m) => (
            <button key={m} className={"view-switch-b" + (boardView === m ? " on" : "")} onClick={() => onChangeBoardView(m)}>
              {m}
            </button>
          ))}
        </div>
        {hasAnyTiles && boardView !== "Timeline" && boardView !== "Now/Next/Later" ? (
          <select className="bsort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} title="Sort board">
            <option value="date">Sort: Date</option>
            <option value="amount">Sort: Amount (high→low)</option>
            <option value="amount-asc">Sort: Amount (low→high)</option>
            <option value="name">Sort: A→Z</option>
            <option value="name-desc">Sort: Z→A</option>
            <option value="category">Sort: Category</option>
          </select>
        ) : null}
      </div>

      {boardView === "Cards" ? (
        sortedFlat.length ? (
          <main className="board">{sortedFlat.map((t) => t.node)}</main>
        ) : (
          <main className="board"><BoardEmpty onAdd={onAdd} /></main>
        )
      ) : boardView === "Timeline" ? (
        monthGroups.length ? (
          <div className="timeline">
            {monthGroups.map((g) => (
              <div className="timeline-month" key={g.key}>
                <div className="timeline-month-head">
                  <span className="timeline-dot" />
                  <span className="section-label">{g.label}</span>
                </div>
                <main className="board timeline-board">{g.tiles.map((t) => t.node)}</main>
              </div>
            ))}
          </div>
        ) : (
          <main className="board"><BoardEmpty onAdd={onAdd} /></main>
        )
      ) : boardView === "Now/Next/Later" ? (
        nowTiles.length || nextTiles.length || laterTiles.length ? (
          <div className="nnl-lanes">
            {[
              { key: "now", label: "Now", sub: "Urgent", tiles: nowTiles, empty: "Nothing urgent right now." },
              { key: "next", label: "Next", sub: "Upcoming", tiles: nextTiles, empty: "Nothing coming up yet." },
              { key: "later", label: "Later", sub: "Not urgent", tiles: laterTiles, empty: "Nothing on the horizon." },
            ].map((g) => (
              <div
                className={"nnl-lane nnl-lane-" + g.key + (laneOverKey === g.key ? " over" : "")}
                key={g.key}
                {...laneDropProps(g.key)}
              >
                <div className="nnl-lane-head">
                  <span className="nnl-lane-dot" />
                  <span className="section-label">{g.label}</span>
                  <span className="nnl-lane-sub">{g.sub}</span>
                </div>
                {g.tiles.length ? (
                  <main className="board nnl-lane-board">{[...g.tiles].sort(cmpBy("date")).map((t) => t.node)}</main>
                ) : (
                  <div className="nnl-lane-empty">{g.empty}</div>
                )}
                {laneOverKey === g.key ? <div className="nnl-lane-drop-hint">Move to {g.label}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <main className="board"><BoardEmpty onAdd={onAdd} /></main>
        )
      ) : hasAnyTiles ? (
        <>
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
      ) : (
        <main className="board"><BoardEmpty onAdd={onAdd} /></main>
      )}
    </>
  );
}
