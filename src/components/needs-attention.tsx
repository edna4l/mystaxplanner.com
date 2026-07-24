"use client";

// "Needs attention" row for the top of the Board — overdue items
// (any type) and habits not yet done today, pulled from the same
// computeTodaySummary data as TodayView and TodayGlance.
import type { Card } from "@/lib/types";
import type { TodaySummary } from "@/lib/todaySummary";
import { typeMeta } from "@/lib/cardTypes";

export function NeedsAttention({
  summary,
  onOpenCard,
}: {
  summary: TodaySummary;
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
}) {
  const items: { card: Card; reason: string }[] = [
    ...summary.overdue.map((c) => ({ card: c, reason: c.type === "bill" ? "Overdue bill" : "Overdue" })),
    ...summary.habitsRisk.map((c) => ({ card: c, reason: "Missed habit" })),
  ].slice(0, 6);

  if (!items.length) return null;

  return (
    <div className="needs-attention">
      <span className="section-label">Needs attention</span>
      <div className="na-row">
        {items.map(({ card, reason }) => {
          const T = typeMeta(card.type);
          return (
            <button
              key={card.id}
              className="na-item"
              style={{ "--hue": T.hue } as React.CSSProperties}
              onClick={(e) => onOpenCard(card, e.currentTarget.getBoundingClientRect())}
            >
              <span className="na-title">{card.title}</span>
              <span className="na-reason">{reason}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
