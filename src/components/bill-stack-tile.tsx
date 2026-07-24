"use client";

// Board-only aggregate summary of every standalone bill (see
// src/lib/billBoardStack.ts) — a sibling to StackTile rather than a
// variant of it, since its content (labeled money rows) doesn't fit the
// layered-pile/swatch-chip visual language square-card.tsx's StackTile
// uses for manually-grouped slots.
import type { BoardBillSummary } from "@/lib/billBoardStack";
import { typeMeta } from "@/lib/cardTypes";
import { money } from "@/lib/date";

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
  return (
    <div className="card bill-stack" style={{ "--hue": T.hue } as React.CSSProperties} onClick={onOpen}>
      <div className="card-top">
        <span className="type-tag"><span className="swatch" />Bills</span>
      </div>
      <h3 className="card-title">{money(summary.totalDueSoon)} due soon</h3>
      <div className="prev">
        <span className="prev-sub">
          {summary.billCount} bill{summary.billCount === 1 ? "" : "s"}
          {summary.overdueCount ? ` • ${summary.overdueCount} overdue` : ""}
        </span>
        {summary.lines.map((l, i) => (
          <div className="prev-row between" key={i}>
            <span className="prev-sub">{l.title}</span>
            <span className={"mono tiny" + (l.overdue ? " bill-stack-overdue" : "")}>{money(l.amount)}</span>
          </div>
        ))}
        <button className="link-btn bill-stack-review" onClick={(e) => { e.stopPropagation(); onReviewBills(); }}>
          Review bills →
        </button>
      </div>
    </div>
  );
}
