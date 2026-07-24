// Groups every standalone bill card on the Board into one aggregate
// summary, so the Board can show a single "BILLS" stack tile instead of
// scattering each recurring series' root/history/exceptions across many
// individual tiles. See src/lib/recurrence.ts for the underlying
// recurring-series engine this composes with.
import type { BoardSlot, Card } from "@/lib/types";
import { todayISO, addDaysISO } from "@/lib/date";
import { isDueSoon, overdueLabel } from "@/lib/bills";
import { expandRecurringBills } from "@/lib/recurrence";

export interface BillGroup {
  rootId: string;
  title: string;
  // Root + materialized children only — real database rows, never a
  // synthetic virtual occurrence. This is exactly the fan's card list.
  realCards: Card[];
  nextDue: { date: string | null; amount: number; overdue: boolean; dueSoon: boolean } | null;
}

export interface BoardBillSummary {
  totalDueSoon: number;
  billCount: number;
  overdueCount: number;
  lines: { title: string; amount: number; overdue: boolean }[];
  groups: BillGroup[];
}

const PROJECTION_WINDOW_DAYS = 120;

function nextDueFor(root: Card, exceptions: Card[], today: string): BillGroup["nextDue"] {
  const occurrences = expandRecurringBills(
    [root, ...exceptions],
    today,
    addDaysISO(today, PROJECTION_WINDOW_DAYS),
  ).filter((c) => !c.paid);
  occurrences.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const next = occurrences[0];
  if (!next) return null;
  return {
    date: next.date,
    amount: Number(next.amount || 0),
    overdue: !!overdueLabel(next),
    dueSoon: isDueSoon(next),
  };
}

// Series roots are identified from every bill card on the board,
// regardless of which slot they're sitting in — a root that happens to
// be manually drag-stacked with other cards still needs to be
// recognized, otherwise every one of its (normally standalone) children
// would incorrectly scatter as individual tiles instead of folding into
// the aggregate. Board-view.tsx is what actually decides what to pull
// out of the grid, and it only ever excludes cards from single-card
// slots — a root's own manual stack is left exactly as the user made
// it; only its otherwise-standalone children (and one-offs) disappear
// into this aggregate, consistent with "manual grouping stays manual."
export function summarizeBillsForBoard(board: BoardSlot[], today = todayISO()): BoardBillSummary | null {
  const allBills: Card[] = [];
  board.forEach((s) => s.cards.forEach((c) => { if (c.type === "bill") allBills.push(c); }));
  if (!allBills.length) return null;

  const roots = new Map<string, Card>();
  const childrenByRoot = new Map<string, Card[]>();
  const oneOffs: Card[] = [];

  allBills.forEach((c) => {
    if (!c.origin) {
      if (c.recur_freq) roots.set(c.id, c);
      else oneOffs.push(c);
    }
  });
  allBills.forEach((c) => {
    if (c.origin && roots.has(c.origin)) {
      const arr = childrenByRoot.get(c.origin) ?? [];
      arr.push(c);
      childrenByRoot.set(c.origin, arr);
    }
  });

  const groups: BillGroup[] = [];
  roots.forEach((root) => {
    const exceptions = childrenByRoot.get(root.id) ?? [];
    groups.push({
      rootId: root.id,
      title: root.title,
      realCards: [root, ...exceptions].sort((a, b) => (a.occurrence_date || a.date || "").localeCompare(b.occurrence_date || b.date || "")),
      nextDue: nextDueFor(root, exceptions, today),
    });
  });
  oneOffs.forEach((c) => {
    groups.push({
      rootId: c.id,
      title: c.title,
      realCards: [c],
      nextDue: c.paid ? null : { date: c.date, amount: Number(c.amount || 0), overdue: !!overdueLabel(c), dueSoon: isDueSoon(c) },
    });
  });
  if (!groups.length) return null;

  groups.sort((a, b) => (a.nextDue?.date || "9999").localeCompare(b.nextDue?.date || "9999"));

  const totalDueSoon = groups.reduce((sum, g) => sum + (g.nextDue?.dueSoon ? g.nextDue.amount : 0), 0);
  const overdueCount = groups.filter((g) => g.nextDue?.overdue).length;
  const lines = groups
    .filter((g) => g.nextDue)
    .slice(0, 3)
    .map((g) => ({ title: g.title, amount: g.nextDue!.amount, overdue: !!g.nextDue!.overdue }));

  return { totalDueSoon, billCount: groups.length, overdueCount, lines, groups };
}
