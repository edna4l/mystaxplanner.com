// Shared read-only lenses over the same board data every other view
// already uses — the Planner never stores its own copy of anything,
// per the "don't create a second set of information" requirement. See
// src/components/planner-plan.tsx / planner-index.tsx.
import type { BoardSlot, Card } from "@/lib/types";
import type { Tweaks } from "@/lib/theme";
import { BUILTIN_CARD_TYPES } from "@/lib/cardTypes";
import { parseISO, toISODate, addDaysISO, todayISO } from "@/lib/date";
import { isDueSoon, overdueLabel, dueInLabel } from "@/lib/bills";
import { summarizeBillsForBoard } from "@/lib/billBoardStack";

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

type PaymentSchedule = Tweaks["paymentSchedule"];

// Everything landing on a given day, across every card type — a bill
// due that day, an appointment (custom type), a note pinned to it,
// whatever, PLUS any bill whose payment was scheduled for this day via
// the Financial Actions tray (paymentSchedule) — shown with that
// scheduled time even though its own due date may be a different day
// entirely. Paid bills are excluded either way.
export function cardsForDate(board: BoardSlot[], dateISO: string, paymentSchedule?: PaymentSchedule): Card[] {
  const cards = allCards(board);
  const scheduledIds = new Set(
    paymentSchedule ? Object.entries(paymentSchedule).filter(([, s]) => s.date === dateISO).map(([id]) => id) : [],
  );
  const base = cards.filter((c) => c.date === dateISO && !scheduledIds.has(c.id) && !(c.type === "bill" && c.paid));
  const scheduled: Card[] = [];
  scheduledIds.forEach((id) => {
    const bill = cards.find((c) => c.id === id);
    if (bill && !bill.paid) scheduled.push({ ...bill, scheduled_time: paymentSchedule![id].time });
  });
  return [...base, ...scheduled].sort(timeSort);
}

// Cards that haven't been placed into a specific time yet — the
// Unscheduled Stax tray. Bills never appear here (see financialActions
// below) — a bill record is financial information, not an activity to
// slot into an hour; only its payment, surfaced separately as a
// "financial action," is schedulable. A habit only shows if it hasn't
// been done yet today (nothing to schedule once it's checked off).
export function unscheduledCards(board: BoardSlot[]): Card[] {
  return allCards(board)
    .filter((c) => {
      if (c.type === "bill") return false;
      if (c.type === "habit") {
        const days = c.days || [];
        return !days[days.length - 1];
      }
      return !c.date || !c.scheduled_time;
    })
    .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || a.title.localeCompare(b.title));
}

export interface TrayGroup {
  key: string;
  type: string;
  title: string;
  cards: Card[];
}
export type TrayItem = { kind: "single"; card: Card } | { kind: "group"; group: TrayGroup };

// Collapses repeated custom-type cards sharing a title (several copies
// of the same recurring appointment, the classic case) into one
// "Title · N upcoming" chip instead of one chip per card — otherwise a
// weekly counseling session alone can fill the whole tray. Scoped to
// custom types only, same as the Board's equivalent grouping
// (src/lib/customStack.ts) — built-in types (tasks, projects, notes)
// keep their own titles distinct rather than risk merging two
// different tasks that happen to share a name.
export function groupTrayItems(cards: Card[]): TrayItem[] {
  const groupable = cards.filter((c) => !(c.type in BUILTIN_CARD_TYPES));
  const rest = cards.filter((c) => c.type in BUILTIN_CARD_TYPES);
  const byKey = new Map<string, Card[]>();
  groupable.forEach((c) => {
    const key = c.type + "::" + c.title.trim().toLowerCase();
    const arr = byKey.get(key) ?? [];
    arr.push(c);
    byKey.set(key, arr);
  });
  const items: TrayItem[] = rest.map((c) => ({ kind: "single" as const, card: c }));
  byKey.forEach((cs) => {
    if (cs.length > 1) {
      const sorted = [...cs].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
      items.push({ kind: "group", group: { key: sorted[0].type + "::" + sorted[0].title, type: sorted[0].type, title: sorted[0].title, cards: sorted } });
    } else {
      items.push({ kind: "single", card: cs[0] });
    }
  });
  return items;
}

export interface FinancialAction {
  card: Card;
  label: string;
  statusLabel: string;
}

// "Pay Water — overdue" style chips — one per recurring bill series'
// *current* due occurrence (never every future recurrence, reusing the
// same root+exception dedup billBoardStack.ts already does for the
// Board's bill stack) plus each standalone one-off bill. Excludes
// autopay bills (nothing to do) and anything hidden or force-included
// via the bill's own Planner preferences (expanded-card.tsx). Honors
// "remind on due date": suppresses the early due-soon warning so it
// only appears once actually due or overdue.
export function financialActions(board: BoardSlot[], tweaks: Tweaks): FinancialAction[] {
  const summary = summarizeBillsForBoard(board);
  if (!summary) return [];
  const hidden = new Set(tweaks.hiddenFromPlanner);
  const remind = new Set(tweaks.remindOnDueDate);
  const forced = new Set(tweaks.forcedPlannerBills);
  const today = todayISO();

  const out: FinancialAction[] = [];
  summary.groups.forEach((g) => {
    if (!g.nextDue) return;
    const occurrence = g.realCards.find((c) => (c.occurrence_date || c.date) === g.nextDue!.date) ?? g.realCards[0];
    if (!occurrence || occurrence.paid) return;
    if (hidden.has(g.rootId)) return;
    if (occurrence.autopay && !forced.has(g.rootId)) return;

    const isForced = forced.has(g.rootId);
    const dueNow = g.nextDue.overdue || (remind.has(g.rootId) ? occurrence.date === today : g.nextDue.dueSoon);
    if (!isForced && !dueNow) return;

    const status = overdueLabel(occurrence) || dueInLabel(occurrence) || (isDueSoon(occurrence) ? "due soon" : "not due yet");
    out.push({ card: occurrence, label: `Pay ${g.title}`, statusLabel: status });
  });
  return out.sort((a, b) => (a.card.date || "9999").localeCompare(b.card.date || "9999"));
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
