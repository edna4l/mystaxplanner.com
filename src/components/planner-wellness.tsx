"use client";

// "Wellness" — a real weekly habit tracker plus upcoming appointments,
// both lenses over cards that already exist elsewhere.
//
// Simplified from the original brief: Water/Exercise/Sleep/Medication
// aren't separate tracked concepts in this app — a habit card already
// covers exactly this ("Water," "Exercise," "Take vitamins" are just
// habit titles), so rather than build four bespoke single-purpose
// widgets, this shows every habit through one tracker that works for
// any of them. "Health appointments" reuses the same custom-type-with-
// a-date cards the rest of the app calls appointments — there's no way
// to tell a health appointment from any other kind, so it's labeled
// honestly as "Upcoming appointments," not narrowed to health. "Mood
// check-in" and "Self-care plans" need a concept (a daily mood value,
// a plan structure) nothing in the app has yet, so they're left out
// rather than faked. A "choose which trackers appear" setting isn't
// built either — there's only one real tracker so far, nothing to
// choose between yet.
import { useMemo } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { typeMeta, BUILTIN_CARD_TYPES } from "@/lib/cardTypes";
import { todayISO, addDaysISO, shortISO } from "@/lib/date";
import { allCards } from "@/lib/plannerData";

const WD1 = ["S", "M", "T", "W", "T", "F", "S"];

function last7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(todayISO(), -(6 - i)));
}

function HabitRow({ card, dates, onOpenCard }: { card: Card; dates: string[]; onOpenCard: (c: Card, r: DOMRect | null) => void }) {
  const days = card.days || [];
  const recent = days.slice(-7);
  return (
    <div className="wellness-habit-row" style={{ "--hue": typeMeta(card.type).hue } as React.CSSProperties}>
      <button className="wellness-habit-title" onClick={(e) => onOpenCard(card, e.currentTarget.getBoundingClientRect())}>{card.title}</button>
      <div className="dots">
        {dates.map((d, i) => (
          <span key={d} className={"dot" + (recent[i] ? " dot-on" : "")} title={d} />
        ))}
      </div>
      <span className="wellness-habit-streak mono">{card.streak ? `🔥 ${card.streak}` : "—"}</span>
    </div>
  );
}

export function PlannerWellness({
  board,
  onOpenCard,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
}) {
  const habits = useMemo(() => allCards(board).filter((c) => c.type === "habit"), [board]);
  const appointments = useMemo(() => {
    const today = todayISO();
    return allCards(board)
      .filter((c) => !(c.type in BUILTIN_CARD_TYPES) && c.date && c.date >= today)
      .sort((a, b) => (a.date as string).localeCompare(b.date as string))
      .slice(0, 8);
  }, [board]);
  const dates = last7Dates();

  return (
    <div className="planner-wellness">
      <div className="wellness-tracker">
        <div className="wellness-tracker-head">
          <span className="section-label">Habit tracker</span>
          <div className="wellness-wd-row">
            {dates.map((d, i) => <span key={d} className="wellness-wd">{WD1[new Date(d + "T00:00:00").getDay()] ?? WD1[i]}</span>)}
          </div>
        </div>
        {habits.length ? habits.map((h) => <HabitRow key={h.id} card={h} dates={dates} onOpenCard={onOpenCard} />) : (
          <p className="planner-soon-sub">No habit cards yet — create one from + New card.</p>
        )}
      </div>

      <div className="pl-agenda-day">
        <span className="section-label">Upcoming appointments</span>
        {appointments.length ? appointments.map((a) => {
          const T = typeMeta(a.type);
          return (
            <button key={a.id} className="pl-agenda-row" style={{ "--hue": T.hue } as React.CSSProperties} onClick={(e) => onOpenCard(a, e.currentTarget.getBoundingClientRect())}>
              <span className="mono tiny">{shortISO(a.date)}</span>
              <span>{a.title}</span>
              <span className="prev-sub" style={{ marginLeft: "auto" }}>{T.label}</span>
            </button>
          );
        }) : <span className="planner-index-card-sub">Nothing scheduled.</span>}
      </div>
    </div>
  );
}
