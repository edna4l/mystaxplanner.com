// Shared "what needs attention today" computation — extracted from
// today-view.tsx so the Board's new "Today at a glance" row and "Needs
// attention" section reuse the exact same due/overdue/streak-at-risk
// logic instead of a second, potentially-drifting copy.
import type { BoardSlot, Card } from "@/lib/types";
import { todayISO } from "@/lib/date";
import { expandRecurringBills } from "@/lib/recurrence";
import { BUILTIN_CARD_TYPES } from "@/lib/cardTypes";

export function isDone(c: Card) {
  return !!(c.checklist && c.checklist.length && c.checklist.every((x) => x.done));
}

export interface TodaySummary {
  dueToday: Card[];
  overdue: Card[];
  weekBills: Card[];
  weekTotal: number;
  habits: Card[];
  habitsRisk: Card[];
  // Nearest upcoming custom-type card (e.g. an "appointment"-style
  // type the user created) — custom types have no due/overdue concept
  // of their own, so this is just "soonest dated one," not a status.
  nextAppointment: Card | null;
}

export function computeTodaySummary(board: BoardSlot[]): TodaySummary {
  const today = todayISO(0);
  const weekEnd = todayISO(7);
  const rangeStart = todayISO(-60);

  const rawCards: Card[] = [];
  board.forEach((s) => s.cards.forEach((c) => rawCards.push(c)));

  const nonBills = rawCards.filter((c) => c.type !== "bill");
  const bills = rawCards.filter((c) => c.type === "bill");
  const all = [...nonBills, ...expandRecurringBills(bills, rangeStart, weekEnd)];

  const dueToday = all.filter(
    (c) => c.type !== "habit" && ((c.date && c.date === today) || (!c.date && /^today$/i.test((c.due || "").trim()))) && !(c.type === "bill" && c.paid) && !isDone(c),
  );
  const overdue = all.filter((c) => c.type !== "habit" && c.date && c.date < today && !(c.type === "bill" && c.paid) && !isDone(c));
  const weekBills = all
    .filter((c) => c.type === "bill" && !c.paid && c.date && c.date >= today && c.date <= weekEnd)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const habits = all.filter((c) => c.type === "habit");
  const habitsRisk = habits.filter((c) => {
    const d = c.days || [];
    return !d[d.length - 1];
  });
  const weekTotal = weekBills.reduce((a, c) => a + Number(c.amount || 0), 0);

  const upcomingCustom = all
    .filter((c) => !(c.type in BUILTIN_CARD_TYPES) && c.date && c.date >= today)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const nextAppointment = upcomingCustom[0] ?? null;

  return { dueToday, overdue, weekBills, weekTotal, habits, habitsRisk, nextAppointment };
}
