"use client";

// "Plan" — the Planner's default tab. Day/Week/Plan sub-views over the
// same cards every other view already reads (see src/lib/plannerData.ts
// — nothing here is a second copy of anything), plus the "standout"
// interaction: drag a card out of the Unscheduled Stax tray onto an
// hour to give it a real time, without leaving whatever project/series
// it already belongs to.
import { useMemo, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { todayISO, shortISO, addDaysISO } from "@/lib/date";
import { cardsForDate, unscheduledCards, weekDates } from "@/lib/plannerData";
import { HourlySchedule, DayColumn, WD_LABEL, WD_HUE } from "@/components/planner-shared";

export function PlannerPlan({
  board,
  onOpenCard,
  onUpdateCard,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onUpdateCard: (id: string, patch: Partial<Card>) => void;
}) {
  const [subView, setSubView] = useState<"Day" | "Week" | "Plan">("Week");
  const [anchor, setAnchor] = useState(todayISO());
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const today = todayISO();

  const days = useMemo(() => weekDates(anchor), [anchor]);
  const tray = useMemo(() => unscheduledCards(board), [board]);

  function nudge(deltaDays: number) {
    setAnchor(addDaysISO(anchor, deltaDays));
  }

  const trayProps = (card: Card) => ({
    draggable: true,
    onDragStart: () => setDragCardId(card.id),
    onDragEnd: () => setDragCardId(null),
  });

  return (
    <div className="pl-plan">
      <div className="pl-toolbar">
        <div className="seg">
          {(["Day", "Week", "Plan"] as const).map((v) => (
            <button key={v} className={"seg-b" + (subView === v ? " on" : "")} onClick={() => setSubView(v)}>{v}</button>
          ))}
        </div>
        <div className="pl-nav">
          <button className="bext" onClick={() => setAnchor(today)}>Today</button>
          <button className="bmonth-nav" onClick={() => nudge(subView === "Day" ? -1 : -7)}>‹</button>
          <span className="pl-nav-label">{shortISO(anchor)}</span>
          <button className="bmonth-nav" onClick={() => nudge(subView === "Day" ? 1 : 7)}>›</button>
        </div>
      </div>

      <div className="pl-body">
        <div className="pl-main">
          {subView === "Week" ? (
            <div className="pl-week">
              {days.map((d, i) => (
                <DayColumn key={d} dateISO={d} label={WD_LABEL[i]} hue={WD_HUE[i]} board={board} onOpenCard={onOpenCard} isToday={d === today} />
              ))}
            </div>
          ) : subView === "Day" ? (
            <div className="pl-day-focus">
              <HourlySchedule dateISO={anchor} board={board} onUpdateCard={onUpdateCard} onOpenCard={onOpenCard} dragCardId={dragCardId} onDragCardChange={setDragCardId} />
            </div>
          ) : (
            <div className="pl-agenda">
              {days.map((d, i) => {
                const cards = cardsForDate(board, d);
                return (
                  <div className="pl-agenda-day" key={d}>
                    <span className="section-label">{WD_LABEL[i]} · {shortISO(d)}</span>
                    {cards.length ? cards.map((c) => (
                      <button key={c.id} className="pl-agenda-row" onClick={(e) => onOpenCard(c, e.currentTarget.getBoundingClientRect())}>
                        {c.scheduled_time ? <span className="mono tiny">{c.scheduled_time}</span> : null}
                        <span>{c.title}</span>
                      </button>
                    )) : <span className="pl-day-empty">Nothing yet</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="pl-rail">
          <span className="section-label">Daily schedule</span>
          <HourlySchedule dateISO={today} board={board} onUpdateCard={onUpdateCard} onOpenCard={onOpenCard} dragCardId={dragCardId} onDragCardChange={setDragCardId} />
        </aside>
      </div>

      <div className="pl-tray">
        <div className="pl-tray-head">
          <span className="section-label">Unscheduled Stax</span>
          <span className="pl-tray-hint">Drag a card onto an hour to give it a time</span>
        </div>
        <div className="pl-tray-row">
          {tray.length ? tray.map((c) => {
            const T = typeMeta(c.type);
            return (
              <div key={c.id} className="pl-tray-card" style={{ "--hue": T.hue } as React.CSSProperties} {...trayProps(c)} onClick={(e) => onOpenCard(c, e.currentTarget.getBoundingClientRect())}>
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
