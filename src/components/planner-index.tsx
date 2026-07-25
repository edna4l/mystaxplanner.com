"use client";

// "Index" — the opening page of the digital binder: a fast overview
// built entirely from data other views already own (computeTodaySummary
// is the exact same source Today/Board use), plus shortcuts into the
// rest of the Planner. Nothing here is stored separately.
import type { BoardSlot, Card } from "@/lib/types";
import { computeTodaySummary, summaryHeadline } from "@/lib/todaySummary";
import { money, shortISO } from "@/lib/date";
import { NeedsAttention } from "@/components/needs-attention";
import type { PlannerTab } from "@/components/planner-view";

const SHORTCUTS: { key: PlannerTab; label: string; hue: number }[] = [
  { key: "focus", label: "Focus", hue: 230 },
  { key: "work", label: "Work", hue: 280 },
  { key: "finance", label: "Finance", hue: 150 },
  { key: "wellness", label: "Wellness", hue: 175 },
  { key: "home", label: "Home", hue: 70 },
  { key: "notes", label: "Notes", hue: 20 },
];

export function PlannerIndex({
  board,
  onOpenCard,
  onGo,
  onOpenTab,
  onStartFocusDeck,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onGo: (dest: "bills" | "board" | "calendar") => void;
  onOpenTab: (tab: PlannerTab) => void;
  onStartFocusDeck: () => void;
}) {
  const summary = computeTodaySummary(board);
  const headline = summaryHeadline(summary.dueToday, summary.overdue);
  const habitsDone = summary.habits.length - summary.habitsRisk.length;
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="planner-index">
      <div className="planner-index-head">
        <span className="planner-index-date">{dateLine}</span>
        <h2 className="planner-index-headline">{headline}</h2>
      </div>

      <div className="planner-index-grid">
        <div className="planner-index-card">
          <span className="planner-index-card-label">This week</span>
          <span className="planner-index-card-num mono">{money(summary.weekTotal)}</span>
          <span className="planner-index-card-sub">due across {summary.weekBills.length} bill{summary.weekBills.length === 1 ? "" : "s"}</span>
          <button className="link-btn" onClick={() => onGo("bills")}>Open Bills →</button>
        </div>
        <div className="planner-index-card">
          <span className="planner-index-card-label">Habits</span>
          <span className="planner-index-card-num mono">{habitsDone}/{summary.habits.length}</span>
          <span className="planner-index-card-sub">done today</span>
          <button className="link-btn" onClick={() => onOpenTab("wellness")}>Open Wellness →</button>
        </div>
        <div className="planner-index-card">
          <span className="planner-index-card-label">Next appointment</span>
          {summary.nextAppointment ? (
            <>
              <span className="planner-index-card-num">{summary.nextAppointment.title}</span>
              <span className="planner-index-card-sub">{shortISO(summary.nextAppointment.date)}</span>
            </>
          ) : (
            <span className="planner-index-card-sub">Nothing on the books</span>
          )}
          <button className="link-btn" onClick={() => onGo("calendar")}>Open Calendar →</button>
        </div>
      </div>

      <NeedsAttention summary={summary} onOpenCard={onOpenCard} onOpenCategory={() => onGo("board")} />

      <div className="planner-index-start">
        <button className="cover-add-btn" onClick={onStartFocusDeck}>Start my day</button>
      </div>

      <div className="planner-index-shortcuts">
        <span className="section-label">Jump to</span>
        <div className="planner-index-shortcut-row">
          {SHORTCUTS.map((s) => (
            <button key={s.key} className="planner-shortcut" style={{ "--hue": s.hue } as React.CSSProperties} onClick={() => onOpenTab(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
