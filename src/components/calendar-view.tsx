"use client";

// Ported from calendar.jsx — month grid; dated cards land on their day,
// multiples layer into a cluster. Drag a reusable (undated) card onto a
// day to stamp a dated copy there, or drag a dated card onto another day
// to reschedule it.
import { useMemo, useRef, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { parseISO, toISODate, money } from "@/lib/date";
import { overdueLabel } from "@/lib/bills";
import { expandRecurringBills } from "@/lib/recurrence";
import { useEscapeKey } from "@/lib/useEscapeKey";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Mouse hover (and, since Safari maps Apple Pencil hover to the same
// mouse events, a hovering stylus on iPad) shows this after a short
// delay. Touch has no hover concept, so it gets a long-press instead —
// same 320ms-hold/10px-move-cancels timing board-view.tsx already uses
// for its touch drag, so a "hold to peek" feels consistent with a
// "hold to drag" elsewhere in the app. Either way this never fully
// opens the card — it's peek-and-let-go, not a substitute for it.
const HOVER_DELAY = 220;
const LONG_PRESS_MS = 380;
const MOVE_CANCEL_PX = 10;

function CalendarEntryPreview({ card, rect }: { card: Card; rect: DOMRect }) {
  const T = typeMeta(card.type);
  const width = 250;
  const gap = 10;
  const left = Math.min(Math.max(gap, rect.left), window.innerWidth - width - gap);
  const spaceBelow = window.innerHeight - rect.bottom;
  const top = spaceBelow > 190 ? rect.bottom + gap : Math.max(gap, rect.top - gap - 170);
  const checklistTotal = card.checklist?.length ?? 0;
  const checklistDone = card.checklist?.filter((i) => i.done).length ?? 0;
  const overdue = card.type === "bill" ? overdueLabel(card) : null;
  return (
    <div
      className="cal-preview"
      style={{ "--hue": T.hue, top, left, width } as React.CSSProperties}
      // Prevents a touch-preview's underlying finger-down from also
      // being read as a click on whatever's behind the popover.
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <span className="type-tag"><span className="swatch" />{T.label}</span>
      <strong className="cal-preview-title">{card.title}</strong>
      {card.type === "bill" && card.amount != null ? (
        <span className="prev-sub">
          <b className="mono">{money(card.amount)}</b>
          {card.category ? ` · ${card.category}` : ""}
          {card.paid ? " · Paid" : overdue ? ` · ${overdue}` : card.due ? ` · Due ${card.due}` : ""}
        </span>
      ) : null}
      {card.type === "habit" ? (
        <span className="prev-sub">Current streak: <b className="mono">{card.streak || 0}</b> days</span>
      ) : null}
      {(card.type === "task" || card.type === "project") && checklistTotal > 0 ? (
        <span className="prev-sub"><b className="mono">{checklistDone}/{checklistTotal}</b> steps done</span>
      ) : null}
      {card.scheduled_time ? <span className="prev-sub mono">{card.scheduled_time}</span> : null}
      {(card.type === "task" || card.type === "project") && card.due ? (
        <span className="prev-sub">Due {card.due}</span>
      ) : null}
      {card.notes ? <p className="prev-note">{card.notes}</p> : card.body ? <p className="prev-note">{card.body}</p> : null}
    </div>
  );
}

// Shows up to 2 compact single-line entries per day, with a "+N more"
// indicator for the rest — full details are one click away (opens the
// single card, or a DayFan for multiple). Dragging is only enabled when
// the cell holds exactly one card, since a multi-card cell's entries
// aren't individually draggable targets yet.
function DayCluster({
  cards, onClick, onDragCard, onPeek, onPeekEnd,
}: {
  cards: Card[];
  onClick: () => void;
  onDragCard: (e: React.DragEvent, id: string) => void;
  onPeek: (card: Card, rect: DOMRect) => void;
  onPeekEnd: () => void;
}) {
  const visible = cards.slice(0, 2);
  const overflow = cards.length - visible.length;
  const single = cards.length === 1;
  const hoverTimer = useRef<number | null>(null);
  const touchTimer = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const longPressFired = useRef(false);

  function clearHoverTimer() {
    if (hoverTimer.current != null) { window.clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  }
  function clearTouchTimer() {
    if (touchTimer.current != null) { window.clearTimeout(touchTimer.current); touchTimer.current = null; }
  }
  function startHover(e: React.MouseEvent<HTMLDivElement>, card: Card) {
    clearHoverTimer();
    const rect = e.currentTarget.getBoundingClientRect();
    hoverTimer.current = window.setTimeout(() => onPeek(card, rect), HOVER_DELAY);
  }
  function endHover() {
    clearHoverTimer();
    onPeekEnd();
  }
  function startTouch(e: React.TouchEvent<HTMLDivElement>, card: Card) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    longPressFired.current = false;
    const rect = e.currentTarget.getBoundingClientRect();
    clearTouchTimer();
    touchTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      onPeek(card, rect);
    }, LONG_PRESS_MS);
  }
  function moveTouch(e: React.TouchEvent<HTMLDivElement>) {
    if (!touchStart.current || touchTimer.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearTouchTimer();
  }
  function endTouch(e: React.TouchEvent<HTMLDivElement>) {
    clearTouchTimer();
    if (longPressFired.current) {
      // Held long enough to peek — release just closes the peek instead
      // of also opening the card, the same way an iOS long-press-peek
      // doesn't act like a plain tap once it's triggered.
      e.preventDefault();
      onPeekEnd();
      longPressFired.current = false;
    }
  }

  return (
    <div className="cal-cluster" onClick={onClick}>
      {visible.map((c) => {
        const T = typeMeta(c.type);
        return (
          <div
            key={c.id}
            className={"cal-entry" + (single ? " cal-drag" : "")}
            style={{ "--hue": T.hue } as React.CSSProperties}
            draggable={single}
            onDragStart={single ? (e) => { e.stopPropagation(); onPeekEnd(); onDragCard(e, c.id); } : undefined}
            onMouseEnter={(e) => startHover(e, c)}
            onMouseLeave={endHover}
            onTouchStart={(e) => startTouch(e, c)}
            onTouchMove={moveTouch}
            onTouchEnd={endTouch}
            onTouchCancel={endTouch}
          >
            <span className="swatch" />
            {c.cover?.kind === "emoji" ? <span className="cal-emoji">{c.cover.val}</span> : null}
            <span className="cal-entry-title">{c.title}</span>
          </div>
        );
      })}
      {overflow > 0 ? <span className="cal-more mono">+{overflow} more</span> : null}
    </div>
  );
}

export function CalendarView({
  board,
  onOpenCard,
  onOpenDay,
  onSetDate,
  onStamp,
  onAddOnDate,
  onAddReusable,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card) => void;
  onOpenDay: (label: string, cards: Card[]) => void;
  onSetDate: (cardId: string, date: string) => void;
  onStamp: (cardId: string, date: string) => void;
  onAddOnDate: (date: string) => void;
  onAddReusable: () => void;
}) {
  const init = new Date();
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());
  const [dropDay, setDropDay] = useState<number | null>(null);
  const [peek, setPeek] = useState<{ card: Card; rect: DOMRect } | null>(null);
  useEscapeKey(() => setPeek(null));

  const allCards = useMemo(() => {
    const out: Card[] = [];
    board.forEach((s) => s.cards.forEach((c) => out.push(c)));
    return out;
  }, [board]);

  const monthStart = toISODate(vy, vm, 1);
  const monthEnd = toISODate(vy, vm, new Date(vy, vm + 1, 0).getDate());
  const displayCards = useMemo(() => {
    const nonBills = allCards.filter((c) => c.type !== "bill");
    const bills = allCards.filter((c) => c.type === "bill");
    return [...nonBills, ...expandRecurringBills(bills, monthStart, monthEnd)];
  }, [allCards, monthStart, monthEnd]);

  const byDay = useMemo(() => {
    const m: Record<number, Card[]> = {};
    displayCards.forEach((c) => {
      const p = parseISO(c.date);
      if (p && p.y === vy && p.m === vm) (m[p.d] = m[p.d] || []).push(c);
    });
    Object.keys(m).forEach((k) => {
      const n = Number(k);
      m[n].sort((a, b) => (a.card_order == null ? 9999 : a.card_order) - (b.card_order == null ? 9999 : b.card_order));
    });
    return m;
  }, [displayCards, vy, vm]);

  const unscheduled = useMemo(() => allCards.filter((c) => !parseISO(c.date)), [allCards]);

  const firstWd = new Date(vy, vm, 1).getDay();
  const daysIn = new Date(vy, vm + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  const isToday = (d: number) => init.getFullYear() === vy && init.getMonth() === vm && init.getDate() === d;

  function prev() { setPeek(null); if (vm === 0) { setVm(11); setVy(vy - 1); } else setVm(vm - 1); }
  function next() { setPeek(null); if (vm === 11) { setVm(0); setVy(vy + 1); } else setVm(vm + 1); }

  function openDay(d: number, cards: Card[]) {
    if (cards.length === 1) onOpenCard(cards[0]);
    else onOpenDay(MON[vm].slice(0, 3) + " " + d, cards);
  }

  function startDrag(e: React.DragEvent, cardId: string, source: "tray" | "day") {
    try {
      e.dataTransfer.effectAllowed = source === "tray" ? "copy" : "move";
      e.dataTransfer.setData("text/plain", source + "|" + cardId);
    } catch {}
  }
  function dropOn(e: React.DragEvent, d: number) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    setDropDay(null);
    if (!raw) return;
    const i = raw.indexOf("|");
    const source = i < 0 ? "day" : raw.slice(0, i);
    const id = i < 0 ? raw : raw.slice(i + 1);
    const iso = toISODate(vy, vm, d);
    if (source === "tray") onStamp(id, iso);
    else onSetDate(id, iso);
  }

  return (
    <div className="calendar">
      <div className="cal-head">
        <button className="cal-nav" onClick={prev}>‹</button>
        <h2 className="cal-month">{MON[vm]} <span className="mono">{vy}</span></h2>
        <button className="cal-nav" onClick={next}>›</button>
      </div>
      <div className="cal-grid">
        {WD.map((w) => <div key={w} className="cal-wd">{w}</div>)}
        {cells.map((d, i) => (
          <div
            key={i}
            className={"cal-cell" + (d == null ? " empty" : "") + (d && isToday(d) ? " today" : "") + (d != null && dropDay === d ? " drop" : "")}
            onDragOver={d != null ? (e) => { e.preventDefault(); setDropDay(d); } : undefined}
            onDragLeave={d != null ? () => setDropDay((x) => (x === d ? null : x)) : undefined}
            onDrop={d != null ? (e) => dropOn(e, d) : undefined}
          >
            {d != null ? (
              <>
                <div className="cal-cell-head">
                  <span className="cal-date mono">{d}</span>
                  <button className="cal-add" title="Add a card on this day" onClick={() => onAddOnDate(toISODate(vy, vm, d))}>+</button>
                </div>
                {byDay[d] ? (
                  <DayCluster
                    cards={byDay[d]}
                    onClick={() => openDay(d, byDay[d])}
                    onDragCard={(e, id) => startDrag(e, id, "day")}
                    onPeek={(card, rect) => setPeek({ card, rect })}
                    onPeekEnd={() => setPeek(null)}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        ))}
      </div>
      <div className="cal-unsched">
        <div className="cal-unsched-top">
          <span className="cal-unsched-label">Reusable cards</span>
          <span className="cal-unsched-help">Drag one onto a day to add it there — the original stays here, so you can reuse it across many days.</span>
        </div>
        <div className="cal-unsched-row">
          {unscheduled.map((c) => {
            const T = typeMeta(c.type);
            return (
              <button
                key={c.id}
                className="cal-chip cal-drag"
                style={{ "--hue": T.hue } as React.CSSProperties}
                draggable={true}
                onDragStart={(e) => startDrag(e, c.id, "tray")}
                onClick={() => onOpenCard(c)}
              >
                <span className="swatch" />{c.title}
              </button>
            );
          })}
          <button className="cal-chip-add" onClick={onAddReusable}>+ New reusable card</button>
        </div>
      </div>
      {peek ? <CalendarEntryPreview card={peek.card} rect={peek.rect} /> : null}
    </div>
  );
}
