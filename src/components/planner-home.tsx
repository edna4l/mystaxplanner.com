"use client";

// "Home" — the one thing the brief called out as fitting extremely
// well here is real and already built: reusable (undated) cards,
// the exact same tray Calendar already offers, stamped onto today
// with one tap instead of a full drag rebuild for a mutation
// (stampCard creates a dated copy, unlike Plan/Work's tray which just
// moves the same card) that's meaningfully different from the rest of
// the Planner's drag-to-schedule.
//
// Simplified from the brief: Chores, Grocery list, Meal plan, Cleaning
// schedule, Errands, Pet care, Household purchases, and Family events
// all need either a new card type or a reliable way to tell "this task
// is a household one" from any other task/bill — nothing in the data
// model marks that today. Rather than guess from a title or invent a
// category convention no one's agreed to, this shows plain tasks
// generically (Work already claims projects) and leaves the rest for
// when there's a real signal to filter on.
import { useMemo } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { todayISO } from "@/lib/date";
import { allCards } from "@/lib/plannerData";

function pct(checklist: Card["checklist"]) {
  if (!checklist || !checklist.length) return 0;
  return Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
}

export function PlannerHome({
  board,
  onOpenCard,
  onStampCard,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onStampCard: (cardId: string, date: string) => void;
}) {
  const reusables = useMemo(() => allCards(board).filter((c) => !c.origin && !c.date && c.type !== "bill" && c.type !== "habit"), [board]);
  const tasks = useMemo(() => allCards(board).filter((c) => c.type === "task" && !c.date), [board]);

  return (
    <div className="planner-home">
      <div className="wellness-tracker">
        <span className="section-label">Household reusables</span>
        <p className="pl-tray-hint">Cards with no fixed date — add one to today, or drag it onto a day from Calendar.</p>
        <div className="pl-tray-row">
          {reusables.length ? reusables.map((c) => {
            const T = typeMeta(c.type);
            return (
              <div key={c.id} className="pl-tray-card home-reusable" style={{ "--hue": T.hue } as React.CSSProperties}>
                <span className="swatch" />
                <span className="pl-tray-card-title" onClick={(e) => onOpenCard(c, e.currentTarget.getBoundingClientRect())}>{c.title}</span>
                <button className="home-reusable-add" title="Add to today" onClick={() => onStampCard(c.id, todayISO())}>+</button>
              </div>
            );
          }) : <span className="planner-index-card-sub">No reusable cards yet — create one and leave its date blank.</span>}
        </div>
      </div>

      <div className="planner-work-projects">
        <span className="section-label">Unscheduled tasks</span>
        {tasks.length ? (
          <div className="planner-index-grid">
            {tasks.map((t) => {
              const T = typeMeta(t.type);
              return (
                <button key={t.id} className="planner-index-card planner-project-card" style={{ "--hue": T.hue } as React.CSSProperties} onClick={(e) => onOpenCard(t, e.currentTarget.getBoundingClientRect())}>
                  <span className="planner-index-card-label">{t.title}</span>
                  {t.checklist && t.checklist.length ? (
                    <div className="prev-row">
                      <div className="bar"><div className="bar-fill" style={{ width: pct(t.checklist) + "%" }} /></div>
                      <span className="mono tiny">{pct(t.checklist)}%</span>
                    </div>
                  ) : <span className="planner-index-card-sub">No steps yet</span>}
                </button>
              );
            })}
          </div>
        ) : <p className="planner-soon-sub">Nothing unscheduled — everything&rsquo;s either done or on the calendar.</p>}
      </div>
    </div>
  );
}
