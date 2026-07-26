"use client";

// Shared pieces between Planner tabs that show a schedule or a week
// strip (Plan, Work, and later Wellness/Home) — kept in one place so
// "drag a card onto an hour" behaves identically everywhere it shows
// up, instead of drifting across copies.
import { useMemo, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import type { Tweaks } from "@/lib/theme";
import { typeMeta } from "@/lib/cardTypes";
import { money } from "@/lib/date";
import { cardsForDate } from "@/lib/plannerData";

export const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am..9pm
export const WD_LABEL = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
// A fixed weekday palette (Monday's always this hue, Tuesday's always
// that one) rather than deriving it from the date — otherwise the same
// weekday would paint a different color every week, which reads as
// arbitrary instead of a stable, learnable rhythm.
export const WD_HUE = [30, 330, 210, 280, 190, 150, 55];

// What's being dragged onto an hour — a real card (dropping sets its
// own date/scheduled_time) or a Financial Action chip (dropping only
// ever writes to Tweaks.paymentSchedule, never the bill's own date —
// see src/lib/plannerData.ts's financialActions()).
export type DragItem = { kind: "card"; id: string } | { kind: "payment"; billId: string };

export function hourLabel(h: number): string {
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

export function HourlySchedule({
  dateISO, board, onUpdateCard, onOpenCard, dragItem, onDragItemChange, paymentSchedule, onSchedulePayment,
}: {
  dateISO: string;
  board: BoardSlot[];
  onUpdateCard: (id: string, patch: Partial<Card>) => void;
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  dragItem: DragItem | null;
  onDragItemChange: (item: DragItem | null) => void;
  paymentSchedule?: Tweaks["paymentSchedule"];
  onSchedulePayment?: (billId: string, date: string, time: string) => void;
}) {
  const [overHour, setOverHour] = useState<number | null>(null);
  const dayCards = useMemo(() => cardsForDate(board, dateISO, paymentSchedule), [board, dateISO, paymentSchedule]);
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
          onDragOver={(e) => { if (dragItem) { e.preventDefault(); setOverHour(h); } }}
          onDragLeave={() => setOverHour((o) => (o === h ? null : o))}
          onDrop={(e) => {
            e.preventDefault();
            const hh = `${String(h).padStart(2, "0")}:00`;
            if (dragItem?.kind === "card") onUpdateCard(dragItem.id, { date: dateISO, scheduled_time: hh });
            else if (dragItem?.kind === "payment" && onSchedulePayment) onSchedulePayment(dragItem.billId, dateISO, hh);
            onDragItemChange(null);
            setOverHour(null);
          }}
          onOpenCard={onOpenCard}
        />
      ))}
    </div>
  );
}

export function DayColumn({
  dateISO, label, hue, board, onOpenCard, isToday, filter,
}: {
  dateISO: string;
  label: string;
  hue: number;
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  isToday: boolean;
  filter?: (c: Card) => boolean;
}) {
  const cards = useMemo(() => {
    const all = cardsForDate(board, dateISO);
    return filter ? all.filter(filter) : all;
  }, [board, dateISO, filter]);
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
