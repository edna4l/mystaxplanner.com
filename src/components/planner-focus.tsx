"use client";

// "Focus" — action-oriented, not another dashboard: launch points for
// Start/End My Day (the exact same flows Today already uses, not a
// second copy), what's due right now, what's scheduled next, and a
// self-contained Pomodoro timer. Reads the same board data as every
// other Planner tab — see src/lib/plannerData.ts.
import { useEffect, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { todayISO } from "@/lib/date";
import { computeTodaySummary } from "@/lib/todaySummary";
import { cardsForDate } from "@/lib/plannerData";

const POMODORO_WORK_MIN = 25;
const POMODORO_BREAK_MIN = 5;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function PomodoroTimer() {
  // mode/secondsLeft update together in one functional setState below,
  // so the tick handler never reads a mode value from an outer closure
  // that could be stale by the time it fires — without that, a second
  // work/break cycle running back-to-back (no pause in between, so the
  // effect never re-runs) would pick up whatever mode was current when
  // the interval was first set up, not the one just transitioned to.
  const [state, setState] = useState<{ mode: "work" | "break"; secondsLeft: number }>({
    mode: "work", secondsLeft: POMODORO_WORK_MIN * 60,
  });
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setState((prev) => {
        if (prev.secondsLeft <= 1) {
          const nextMode = prev.mode === "work" ? "break" : "work";
          return { mode: nextMode, secondsLeft: (nextMode === "work" ? POMODORO_WORK_MIN : POMODORO_BREAK_MIN) * 60 };
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  function reset(nextMode: "work" | "break") {
    setRunning(false);
    setState({ mode: nextMode, secondsLeft: (nextMode === "work" ? POMODORO_WORK_MIN : POMODORO_BREAK_MIN) * 60 });
  }

  const mins = Math.floor(state.secondsLeft / 60);
  const secs = state.secondsLeft % 60;

  return (
    <div className={"pomodoro" + (state.mode === "break" ? " break" : "")}>
      <span className="pomodoro-mode">{state.mode === "work" ? "Focus" : "Break"}</span>
      <span className="pomodoro-clock mono">{pad2(mins)}:{pad2(secs)}</span>
      <div className="pomodoro-actions">
        <button className="cover-add-btn" onClick={() => setRunning((r) => !r)}>{running ? "Pause" : "Start"}</button>
        <button className="link-btn" onClick={() => reset(state.mode)}>Reset</button>
      </div>
    </div>
  );
}

export function PlannerFocus({
  board,
  onOpenCard,
  onStartFocusDeck,
  onOpenDailyReset,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onStartFocusDeck: () => void;
  onOpenDailyReset: () => void;
}) {
  const summary = computeTodaySummary(board);
  const priorities = [...summary.overdue, ...summary.dueToday].slice(0, 3);
  const now = new Date();
  const nowHHMM = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const nextBlock = cardsForDate(board, todayISO())
    .filter((c) => c.scheduled_time && c.scheduled_time >= nowHHMM)
    .sort((a, b) => (a.scheduled_time as string).localeCompare(b.scheduled_time as string))[0] ?? null;
  const habitsDone = summary.habits.length - summary.habitsRisk.length;

  return (
    <div className="planner-focus">
      <div className="focus-launch">
        <button className="ob-start today-focus-btn" onClick={onStartFocusDeck}>Start my day</button>
        <button className="ob-skip today-reset-btn" onClick={onOpenDailyReset}>End my day</button>
      </div>

      {nextBlock ? (
        <div className="planner-next-block" style={{ "--hue": typeMeta(nextBlock.type).hue } as React.CSSProperties}>
          <span className="planner-index-card-label">Up next</span>
          <button className="planner-next-block-title" onClick={(e) => onOpenCard(nextBlock, e.currentTarget.getBoundingClientRect())}>
            {nextBlock.scheduled_time} · {nextBlock.title}
          </button>
        </div>
      ) : null}

      <div className="planner-index-grid">
        <div className="planner-index-card">
          <span className="planner-index-card-label">Top priorities</span>
          {priorities.length ? priorities.map((c) => (
            <button key={c.id} className="pl-agenda-row" style={{ padding: "3px 0" }} onClick={(e) => onOpenCard(c, e.currentTarget.getBoundingClientRect())}>
              {c.title}
            </button>
          )) : <span className="planner-index-card-sub">Nothing urgent right now.</span>}
        </div>
        <div className="planner-index-card">
          <span className="planner-index-card-label">Habits today</span>
          <span className="planner-index-card-num mono">{habitsDone}/{summary.habits.length}</span>
          <span className="planner-index-card-sub">done so far</span>
        </div>
      </div>

      <div className="planner-pomodoro-wrap">
        <span className="section-label">Focus timer</span>
        <PomodoroTimer />
      </div>
    </div>
  );
}
