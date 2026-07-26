"use client";

// "Work" — projects and deadlines, not another generic task list. Same
// drag-a-card-onto-an-hour interaction as Plan (see planner-shared.tsx),
// scoped to project/task cards. Reads the same board data as every
// other Planner tab; nothing here is stored separately.
//
// Simplified from the original brief: "Meetings," "Content calendar,"
// and "Waiting-on" items need a concept (a meeting type, a status
// field) that doesn't exist anywhere in the app yet, so rather than
// fake a section with no real data behind it, they're left out until
// there's something real to show. "Work notes" is left to the Notes
// tab instead of duplicating it here. "Milestones" reuses each
// project's existing checklist — the next unfinished step stands in
// for a milestone, since there's no separate milestone concept either.
import { useMemo, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { todayISO, shortISO, addDaysISO } from "@/lib/date";
import { allCards, unscheduledCards, weekDates } from "@/lib/plannerData";
import { HourlySchedule, DayColumn, WD_LABEL, WD_HUE, type DragItem } from "@/components/planner-shared";

function pct(checklist: Card["checklist"]) {
  if (!checklist || !checklist.length) return 0;
  return Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
}

function nextStep(checklist: Card["checklist"]): string | null {
  return checklist?.find((c) => !c.done)?.text ?? null;
}

export function PlannerWork({
  board,
  onOpenCard,
  onUpdateCard,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onUpdateCard: (id: string, patch: Partial<Card>) => void;
}) {
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const today = todayISO();
  const weekdays = useMemo(() => weekDates(today).slice(0, 5), [today]);
  const workFilter = (c: Card) => c.type === "project" || c.type === "task";

  const projects = useMemo(
    () => allCards(board).filter((c) => c.type === "project").sort((a, b) => pct(b.checklist) - pct(a.checklist)),
    [board],
  );
  const deadlines = useMemo(() => {
    const horizon = addDaysISO(today, 14);
    return allCards(board)
      .filter((c) => (c.type === "project" || c.type === "task") && c.date && c.date <= horizon)
      .sort((a, b) => (a.date as string).localeCompare(b.date as string));
  }, [board, today]);
  const tray = useMemo(() => unscheduledCards(board).filter(workFilter), [board]);

  return (
    <div className="planner-work">
      <div className="planner-work-projects">
        <span className="section-label">Active projects</span>
        {projects.length ? (
          <div className="planner-index-grid">
            {projects.map((p) => {
              const T = typeMeta(p.type);
              const step = nextStep(p.checklist);
              return (
                <button key={p.id} className="planner-index-card planner-project-card" style={{ "--hue": T.hue } as React.CSSProperties} onClick={(e) => onOpenCard(p, e.currentTarget.getBoundingClientRect())}>
                  <span className="planner-index-card-label">{p.title}</span>
                  <div className="prev-row">
                    <div className="bar"><div className="bar-fill" style={{ width: pct(p.checklist) + "%" }} /></div>
                    <span className="mono tiny">{pct(p.checklist)}%</span>
                  </div>
                  <span className="planner-index-card-sub">{step ? `Next: ${step}` : (p.checklist?.length ? "All steps done" : "No steps yet")}</span>
                </button>
              );
            })}
          </div>
        ) : <p className="planner-soon-sub">No project cards yet — create one from + New card.</p>}
      </div>

      {deadlines.length ? (
        <div className="pl-agenda-day">
          <span className="section-label">Upcoming deadlines</span>
          {deadlines.map((c) => (
            <button key={c.id} className="pl-agenda-row" onClick={(e) => onOpenCard(c, e.currentTarget.getBoundingClientRect())}>
              <span className="mono tiny">{shortISO(c.date)}</span>
              <span>{c.title}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="pl-body">
        <div className="pl-main">
          <span className="section-label">Workweek</span>
          <div className="pl-week">
            {weekdays.map((d, i) => (
              <DayColumn key={d} dateISO={d} label={WD_LABEL[i]} hue={WD_HUE[i]} board={board} onOpenCard={onOpenCard} isToday={d === today} filter={workFilter} />
            ))}
          </div>
        </div>
        <aside className="pl-rail">
          <span className="section-label">Today&rsquo;s schedule</span>
          <HourlySchedule dateISO={today} board={board} onUpdateCard={onUpdateCard} onOpenCard={onOpenCard} dragItem={dragItem} onDragItemChange={setDragItem} />
        </aside>
      </div>

      <div className="pl-tray">
        <div className="pl-tray-head">
          <span className="section-label">Unscheduled work</span>
          <span className="pl-tray-hint">Drag a project or task onto an hour to give it a time</span>
        </div>
        <div className="pl-tray-row">
          {tray.length ? tray.map((c) => {
            const T = typeMeta(c.type);
            return (
              <div
                key={c.id}
                className="pl-tray-card"
                style={{ "--hue": T.hue } as React.CSSProperties}
                draggable
                onDragStart={() => setDragItem({ kind: "card", id: c.id })}
                onDragEnd={() => setDragItem(null)}
                onClick={(e) => onOpenCard(c, e.currentTarget.getBoundingClientRect())}
              >
                <span className="swatch" />
                <span className="pl-tray-card-title">{c.title}</span>
              </div>
            );
          }) : <span className="pl-day-empty">Everything&rsquo;s scheduled.</span>}
        </div>
      </div>
    </div>
  );
}
