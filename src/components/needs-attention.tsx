"use client";

// "Needs attention" tile for the top of the Board — overdue items (any
// type) and habits not yet done today, pulled from the same
// computeTodaySummary data as TodayView and TodayGlance. Rendered as a
// single layered stack tile (reusing StackTile's look) rather than a
// row of individual cards, so it stays a fixed small footprint no
// matter how many things need attention — fans open on click.
import type { Card } from "@/lib/types";
import type { TodaySummary } from "@/lib/todaySummary";
import { StackTile } from "@/components/square-card";

export function needsAttentionItems(summary: TodaySummary): Card[] {
  return [...summary.overdue, ...summary.habitsRisk];
}

export function NeedsAttention({
  summary,
  onOpen,
}: {
  summary: TodaySummary;
  onOpen: (cards: Card[]) => void;
}) {
  const items = needsAttentionItems(summary);
  if (!items.length) return null;

  return (
    <div className="needs-attention">
      <div className="slot na-slot">
        <StackTile cards={items} slotName="Needs attention" onOpen={() => onOpen(items)} />
      </div>
    </div>
  );
}
