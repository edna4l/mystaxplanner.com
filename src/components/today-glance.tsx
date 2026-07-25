"use client";

// "Today at a glance" summary line for the top of the Board — reuses
// computeTodaySummary (src/lib/todaySummary.ts), the same data TodayView
// itself is built on, so the two never disagree. Rendered as one flowing
// line ("N tasks today · $X due this week · ...") rather than separate
// bordered chips — most of these stats aren't actionable on their own,
// so pill buttons overstated how interactive this row is.
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

  const items: React.ReactNode[] = [
    <span key="tasks">{tasksToday} task{tasksToday === 1 ? "" : "s"} today</span>,
    <span key="week">{money(summary.weekTotal)} due this week</span>,
  ];
  if (summary.habits.length) {
    items.push(
      <span key="habits">{habitsDone} of {summary.habits.length} habit{summary.habits.length === 1 ? "" : "s"} today</span>,
    );
  }
  if (summary.nextAppointment) {
    const appt = summary.nextAppointment;
    items.push(
      <button key="appt" className="glance-link" onClick={(e) => onOpenCard(appt, e.currentTarget.getBoundingClientRect())}>
        Next: {appt.title} · {shortISO(appt.date)}
      </button>,
    );
  }

  return (
    <div className="glance">
      {items.map((item, i) => (
        <span className="glance-item" key={i}>
          {i > 0 ? <span className="glance-dot" aria-hidden="true">·</span> : null}
          {item}
        </span>
      ))}
    </div>
  );
}
