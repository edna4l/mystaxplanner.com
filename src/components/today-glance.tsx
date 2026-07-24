"use client";

// "Today at a glance" chip row for the top of the Board — reuses
// computeTodaySummary (src/lib/todaySummary.ts), the same data TodayView
// itself is built on, so the two never disagree. Each stat renders as
// its own visual block rather than plain inline text.
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
      <div className="glance-chip">{tasksToday} task{tasksToday === 1 ? "" : "s"} today</div>
      <div className="glance-chip">{money(summary.weekTotal)} due this week</div>
      {summary.habits.length ? (
        <div className="glance-chip">{habitsDone} of {summary.habits.length} habit{summary.habits.length === 1 ? "" : "s"} today</div>
      ) : null}
      {summary.nextAppointment ? (
        <button
          className="glance-chip glance-link"
          onClick={(e) => onOpenCard(summary.nextAppointment as Card, e.currentTarget.getBoundingClientRect())}
        >
          Next: {summary.nextAppointment.title} · {shortISO(summary.nextAppointment.date)}
        </button>
      ) : null}
    </div>
  );
}
