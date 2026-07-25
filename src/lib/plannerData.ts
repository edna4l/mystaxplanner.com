// Shared read-only lenses over the same board data every other view
// already uses — the Planner never stores its own copy of anything,
// per the "don't create a second set of information" requirement. See
// src/components/planner-plan.tsx / planner-index.tsx.
import type { BoardSlot, Card } from "@/lib/types";
import { parseISO, toISODate, addDaysISO } from "@/lib/date";

export function allCards(board: BoardSlot[]): Card[] {
  const out: Card[] = [];
  board.forEach((s) => s.cards.forEach((c) => out.push(c)));
  return out;
}

function timeSort(a: Card, b: Card): number {
  if (a.scheduled_time && b.scheduled_time) return a.scheduled_time.localeCompare(b.scheduled_time);
  if (a.scheduled_time) return -1;
  if (b.scheduled_time) return 1;
  return a.title.localeCompare(b.title);
}

// Everything landing on a given day, across every card type — a bill
// due that day, an appointment (custom type), a note pinned to it,
// whatever. Paid bills are excluded (nothing left to do about them).
export function cardsForDate(board: BoardSlot[], dateISO: string): Card[] {
  return allCards(board)
    .filter((c) => c.date === dateISO && !(c.type === "bill" && c.paid))
    .sort(timeSort);
}

// Cards that haven't been placed into a specific time yet — no date at
// all, or a date but no time-of-day. The Unscheduled Stax tray. Habits
// are excluded (they're tracked via their own rolling window, not a
// due date) and paid bills are excluded (nothing left to schedule).
export function unscheduledCards(board: BoardSlot[]): Card[] {
  return allCards(board)
    .filter((c) => c.type !== "habit" && !(c.type === "bill" && c.paid) && (!c.date || !c.scheduled_time))
    .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || a.title.localeCompare(b.title));
}

// The Monday..Sunday week containing anchorISO, as 7 local-date ISO
// strings — matches addDaysISO's local (not UTC) date math, so this
// can't land on the wrong day near a timezone boundary.
export function weekDates(anchorISO: string): string[] {
  const p = parseISO(anchorISO);
  if (!p) return [];
  const jsDay = new Date(p.y, p.m, p.d).getDay(); // 0=Sun..6=Sat
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = addDaysISO(toISODate(p.y, p.m, p.d), mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}
