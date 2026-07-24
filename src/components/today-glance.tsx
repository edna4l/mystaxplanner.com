"use client";

// Compact "Today at a glance" strip for the top of the Board — reuses
// computeTodaySummary (src/lib/todaySummary.ts), the same data TodayView
// itself is built on, so the two never disagree.
import type { Card } from "@/lib/types";
import type { TodaySummary } from "@/lib/todaySummary";
import { money, shortISO } from "@/lib/date";

export function TodayGlance({
  summary,
  onOpenCard,
}: {
  summary: TodaySummary;
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
}) {
  const tasksToday = summary.dueToday.filter((c) => c.type !== "bill").length;
  const habitsDone = summary.habits.length - summary.habitsRisk.length;

  return (
    <div className="glance">
      <span className="glance-stat">{tasksToday} task{tasksToday === 1 ? "" : "s"} today</span>
      <span className="glance-stat">{money(summary.weekTotal)} due this week</span>
      {summary.habits.length ? (
        <span className="glance-stat">{habitsDone} of {summary.habits.length} habit{summary.habits.length === 1 ? "" : "s"} today</span>
      ) : null}
      {summary.nextAppointment ? (
        <button
          className="glance-stat glance-link"
          onClick={(e) => onOpenCard(summary.nextAppointment as Card, e.currentTarget.getBoundingClientRect())}
        >
          Next: {summary.nextAppointment.title} · {shortISO(summary.nextAppointment.date)}
        </button>
      ) : null}
    </div>
  );
}
