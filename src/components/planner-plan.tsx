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
import { todayISO, shortISO, money, addDaysISO } from "@/lib/date";
import { cardsForDate, unscheduledCards, weekDates } from "@/lib/plannerData";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am..9pm
const WD_LABEL = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
// A fixed weekday palette (Monday's always this hue, Tuesday's always
// that one) rather than deriving it from the date — otherwise the same
// weekday would paint a different color every week, which reads as
// arbitrary instead of a stable, learnable rhythm.
const WD_HUE = [30, 330, 210, 280, 190, 150, 55];

function hourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

function cardMeta(c: Card): string | null {
  if (c.type === "bill" && c.amount != null) return money(c.amount);
  if (c.type === "habit") return c.streak ? `🔥 ${c.streak}d` : null;
  return null;
}

function ScheduleRow({
  hour, card, isDropTarget, onDragOver, onDragLeave, onDrop, onOpenCard,
}: {
  hour: number;
  card: Card | null;
  isDropTarget: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
}) {
  const T = card ? typeMeta(card.type) : null;
  return (
    <div
      className={"pl-hour" + (isDropTarget ? " over" : "")}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className="pl-hour-label mono">{hourLabel(hour)}</span>
      <div className="pl-hour-slot">
        {card ? (
          <button
            className="pl-block"
            style={{ "--hue": T!.hue } as React.CSSProperties}
            onClick={(e) => onOpenCard(card, e.currentTarget.getBoundingClientRect())}
          >
            <span className="pl-block-title">{card.title}</span>
            {cardMeta(card) ? <span className="pl-block-meta mono">{cardMeta(card)}</span> : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function HourlySchedule({
  dateISO, board, onUpdateCard, onOpenCard, dragCardId, onDragCardChange,
}: {
  dateISO: string;
  board: BoardSlot[];
  onUpdateCard: (id: string, patch: Partial<Card>) => void;
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  dragCardId: string | null;
  onDragCardChange: (id: string | null) => void;
}) {
  const [overHour, setOverHour] = useState<number | null>(null);
  const dayCards = useMemo(() => cardsForDate(board, dateISO), [board, dateISO]);
  const byHour = new Map<number, Card>();
  dayCards.forEach((c) => {
    if (!c.scheduled_time) return;
    const h = Number(c.scheduled_time.split(":")[0]);
    if (!byHour.has(h)) byHour.set(h, c);
  });

  return (
    <div className="pl-schedule">
      {HOURS.map((h) => (
        <ScheduleRow
          key={h}
          hour={h}
          card={byHour.get(h) ?? null}
          isDropTarget={overHour === h}
          onDragOver={(e) => { if (dragCardId) { e.preventDefault(); setOverHour(h); } }}
          onDragLeave={() => setOverHour((o) => (o === h ? null : o))}
          onDrop={(e) => {
            e.preventDefault();
            if (dragCardId) onUpdateCard(dragCardId, { date: dateISO, scheduled_time: `${String(h).padStart(2, "0")}:00` });
            onDragCardChange(null);
            setOverHour(null);
          }}
          onOpenCard={onOpenCard}
        />
      ))}
    </div>
  );
}

function DayColumn({
  dateISO, label, hue, board, onOpenCard, isToday,
}: {
  dateISO: string;
  label: string;
  hue: number;
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  isToday: boolean;
}) {
  const cards = useMemo(() => cardsForDate(board, dateISO), [board, dateISO]);
  const dayNum = Number(dateISO.slice(8, 10));
  return (
    <div className={"pl-day" + (isToday ? " today" : "")} style={{ "--hue": hue } as React.CSSProperties}>
      <div className="pl-day-head">
        <span className="pl-day-wd">{label}</span>
        <span className="pl-day-num mono">{dayNum}</span>
      </div>
      <div className="pl-day-cards">
        {cards.length ? cards.map((c) => {
          const T = typeMeta(c.type);
          return (
            <button key={c.id} className="pl-day-card" style={{ "--hue": T.hue } as React.CSSProperties} onClick={(e) => onOpenCard(c, e.currentTarget.getBoundingClientRect())}>
              {c.scheduled_time ? <span className="pl-day-card-time mono">{c.scheduled_time}</span> : null}
              <span className="pl-day-card-title">{c.title}</span>
            </button>
          );
        }) : <span className="pl-day-empty">Nothing yet</span>}
      </div>
    </div>
  );
}

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
