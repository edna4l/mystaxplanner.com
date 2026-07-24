"use client";

// Board-only aggregate summary of every standalone bill (see
// src/lib/billBoardStack.ts) — uses the same StackLayers visual as
// manually-grouped slots (square-card.tsx) so it reads as a real stack
// (layered depth + count badge) instead of a flat summary card.
import type { BoardBillSummary } from "@/lib/billBoardStack";
import { typeMeta } from "@/lib/cardTypes";
import { money } from "@/lib/date";
import { StackLayers } from "@/components/square-card";

export function BillStackTile({
  summary,
  onOpen,
  onReviewBills,
}: {
  summary: BoardBillSummary;
  onOpen: () => void;
  onReviewBills: () => void;
}) {
  const T = typeMeta("bill");
  const hues = Array(Math.min(summary.billCount, 3)).fill(T.hue);
  return (
    <StackLayers hues={hues} onOpen={onOpen}>
      <div className="card-top">
        <span className="type-tag"><span className="swatch" />Bills</span>
        <span className="stack-badge mono">{summary.billCount}</span>
      </div>
      <h3 className="card-title bill-stack-headline">{money(summary.totalDueSoon)} due soon</h3>
      <div className="prev">
        <span className="prev-sub">
          {summary.billCount} bill{summary.billCount === 1 ? "" : "s"}
          {summary.overdueCount ? ` • ${summary.overdueCount} overdue` : ""}
        </span>
        {summary.lines.slice(0, 2).map((l, i) => (
          <div className="prev-row between" key={i}>
            <span className="prev-sub bill-stack-line-title">{l.title}</span>
            <span className={"mono tiny" + (l.overdue ? " bill-stack-overdue" : "")}>{money(l.amount)}</span>
          </div>
        ))}
        <button className="link-btn bill-stack-review" onClick={(e) => { e.stopPropagation(); onReviewBills(); }}>
          Review bills →
        </button>
      </div>
    </StackLayers>
  );
}
