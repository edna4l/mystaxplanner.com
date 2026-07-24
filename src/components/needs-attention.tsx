"use client";

// "Needs attention" chip row for the top of the Board — buckets
// overdue/at-risk items by reason (rather than one undifferentiated
// pile), matching how people actually think about what needs a look:
// "3 bills need review," "2 habits missed." A single-card category
// opens that card directly; a multi-card category fans open.
import type { Card } from "@/lib/types";
import type { TodaySummary } from "@/lib/todaySummary";

interface AttentionCategory {
  key: string;
  label: string;
  cards: Card[];
}

function attentionCategories(summary: TodaySummary): AttentionCategory[] {
  const overdueBills = summary.overdue.filter((c) => c.type === "bill");
  const overdueOther = summary.overdue.filter((c) => c.type !== "bill");
  const cats: AttentionCategory[] = [];
  if (overdueBills.length) {
    cats.push({ key: "bills", label: `${overdueBills.length} bill${overdueBills.length === 1 ? "" : "s"} need review`, cards: overdueBills });
  }
  if (overdueOther.length) {
    cats.push({ key: "other", label: `${overdueOther.length} item${overdueOther.length === 1 ? "" : "s"} overdue`, cards: overdueOther });
  }
  if (summary.habitsRisk.length) {
    cats.push({ key: "habits", label: `${summary.habitsRisk.length} habit${summary.habitsRisk.length === 1 ? "" : "s"} missed`, cards: summary.habitsRisk });
  }
  return cats;
}

export function NeedsAttention({
  summary,
  onOpenCard,
  onOpenCategory,
}: {
  summary: TodaySummary;
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onOpenCategory: (label: string, cards: Card[]) => void;
}) {
  const categories = attentionCategories(summary);
  if (!categories.length) return null;

  return (
    <div className="needs-attention">
      <span className="section-label">Needs attention</span>
      <div className="attention-row">
        {categories.map((cat) => (
          <button
            key={cat.key}
            className="attention-chip"
            onClick={(e) => {
              if (cat.cards.length === 1) onOpenCard(cat.cards[0], e.currentTarget.getBoundingClientRect());
              else onOpenCategory(cat.label, cat.cards);
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
