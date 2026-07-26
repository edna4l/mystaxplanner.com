"use client";

// "Plan" — the Planner's default tab. Day/Week/Plan sub-views over the
// same cards every other view already reads (see src/lib/plannerData.ts
// — nothing here is a second copy of anything), plus the "standout"
// interaction: drag a card out of the Unscheduled Stax tray onto an
// hour to give it a real time, without leaving whatever project/series
// it already belongs to.
//
// Bill records don't appear in the tray — a bill is financial
// information, not an activity to schedule. Only its *payment* is
// schedulable, surfaced separately as a "Financial action" ("Pay
// Water — overdue") that's dedup'd to one chip per current due
// occurrence (never every future recurrence) and dragged the same way,
// except dropping one only ever writes to Tweaks.paymentSchedule —
// never the bill's own date, so its real due date stays accurate
// everywhere else. See the bill editor's own Planner section
// (expanded-card.tsx) for hiding/forcing/remind-on-due-date controls.
import { useMemo, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import type { Tweaks } from "@/lib/theme";
import { BUILTIN_CARD_TYPES, typeMeta } from "@/lib/cardTypes";
import { todayISO, shortISO, addDaysISO } from "@/lib/date";
import { cardsForDate, unscheduledCards, weekDates, groupTrayItems, financialActions } from "@/lib/plannerData";
import { HourlySchedule, DayColumn, WD_LABEL, WD_HUE, type DragItem } from "@/components/planner-shared";

const TRAY_FILTERS = ["All", "Tasks", "Projects", "Habits", "Appointments", "Financial actions"] as const;
type TrayFilter = (typeof TRAY_FILTERS)[number];

export function PlannerPlan({
  board,
  tweaks,
  onOpenCard,
  onUpdateCard,
  onUpdateTweaks,
}: {
  board: BoardSlot[];
  tweaks: Tweaks;
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onUpdateCard: (id: string, patch: Partial<Card>) => void;
  onUpdateTweaks: (patch: Partial<Tweaks>) => void;
}) {
  const [subView, setSubView] = useState<"Day" | "Week" | "Plan">("Week");
  const [anchor, setAnchor] = useState(todayISO());
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [trayFilter, setTrayFilter] = useState<TrayFilter>("All");
  const today = todayISO();

  const days = useMemo(() => weekDates(anchor), [anchor]);

  const rawTray = useMemo(() => unscheduledCards(board), [board]);
  const filteredTray = useMemo(() => {
    if (trayFilter === "All" || trayFilter === "Financial actions") return rawTray;
    if (trayFilter === "Appointments") return rawTray.filter((c) => !(c.type in BUILTIN_CARD_TYPES));
    const wanted = trayFilter === "Tasks" ? "task" : trayFilter === "Projects" ? "project" : "habit";
    return rawTray.filter((c) => c.type === wanted);
  }, [rawTray, trayFilter]);
  const trayItems = useMemo(() => groupTrayItems(filteredTray), [filteredTray]);
  const finActions = useMemo(() => financialActions(board, tweaks), [board, tweaks]);

  function nudge(deltaDays: number) {
    setAnchor(addDaysISO(anchor, deltaDays));
  }

  function schedulePayment(billId: string, date: string, time: string) {
    onUpdateTweaks({ paymentSchedule: { ...tweaks.paymentSchedule, [billId]: { date, time } } });
  }

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
              <HourlySchedule
                dateISO={anchor} board={board} onUpdateCard={onUpdateCard} onOpenCard={onOpenCard}
                dragItem={dragItem} onDragItemChange={setDragItem}
                paymentSchedule={tweaks.paymentSchedule} onSchedulePayment={schedulePayment}
              />
            </div>
          ) : (
            <div className="pl-agenda">
              {days.map((d, i) => {
                const cards = cardsForDate(board, d, tweaks.paymentSchedule);
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
          <HourlySchedule
            dateISO={today} board={board} onUpdateCard={onUpdateCard} onOpenCard={onOpenCard}
            dragItem={dragItem} onDragItemChange={setDragItem}
            paymentSchedule={tweaks.paymentSchedule} onSchedulePayment={schedulePayment}
          />
        </aside>
      </div>

      {finActions.length ? (
        <div className="pl-fin-strip">
          <div className="pl-tray-head">
            <span className="section-label">Financial actions</span>
            <span className="pl-tray-hint">Drag a payment onto an hour — the bill's due date never changes</span>
          </div>
          <div className="pl-tray-row">
            {finActions.map((fa) => (
              <div
                key={fa.card.id}
                className="pl-tray-card pl-fin-card"
                draggable
                onDragStart={() => setDragItem({ kind: "payment", billId: fa.card.id })}
                onDragEnd={() => setDragItem(null)}
                onClick={(e) => onOpenCard(fa.card, e.currentTarget.getBoundingClientRect())}
              >
                <span className="swatch" />
                <span className="pl-tray-card-title">{fa.label}</span>
                <span className="pl-fin-status">{fa.statusLabel}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="pl-tray">
        <div className="pl-tray-head">
          <span className="section-label">Unscheduled Stax</span>
          <span className="pl-tray-hint">Drag a card onto an hour to give it a time</span>
        </div>
        <div className="pl-tray-filters">
          {TRAY_FILTERS.map((f) => (
            <button key={f} className={"filter-chip" + (trayFilter === f ? " active" : "")} onClick={() => setTrayFilter(f)}>{f}</button>
          ))}
        </div>
        <div className="pl-tray-row">
          {trayFilter === "Financial actions" ? (
            finActions.length ? finActions.map((fa) => (
              <div
                key={fa.card.id}
                className="pl-tray-card pl-fin-card"
                draggable
                onDragStart={() => setDragItem({ kind: "payment", billId: fa.card.id })}
                onDragEnd={() => setDragItem(null)}
                onClick={(e) => onOpenCard(fa.card, e.currentTarget.getBoundingClientRect())}
              >
                <span className="swatch" />
                <span className="pl-tray-card-title">{fa.label}</span>
                <span className="pl-fin-status">{fa.statusLabel}</span>
              </div>
            )) : <span className="pl-day-empty">Nothing due.</span>
          ) : trayItems.length ? trayItems.map((item) => item.kind === "single" ? (
            <div
              key={item.card.id}
              className="pl-tray-card"
              style={{ "--hue": typeMeta(item.card.type).hue } as React.CSSProperties}
              draggable
              onDragStart={() => setDragItem({ kind: "card", id: item.card.id })}
              onDragEnd={() => setDragItem(null)}
              onClick={(e) => onOpenCard(item.card, e.currentTarget.getBoundingClientRect())}
            >
              <span className="swatch" />
              <span className="pl-tray-card-title">{item.card.title}</span>
            </div>
          ) : (
            <button
              key={item.group.key}
              className="pl-tray-card pl-tray-group"
              style={{ "--hue": typeMeta(item.group.type).hue } as React.CSSProperties}
              onClick={(e) => onOpenCard(item.group.cards[0], e.currentTarget.getBoundingClientRect())}
              title={`${item.group.cards.length} cards — opens the nearest one`}
            >
              <span className="swatch" />
              <span className="pl-tray-card-title">{item.group.title} · {item.group.cards.length} upcoming</span>
            </button>
          )) : <span className="pl-day-empty">Everything&rsquo;s scheduled.</span>}
        </div>
      </div>
    </div>
  );
}
