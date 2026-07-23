"use client";

// Ported from calendar.jsx — month grid; dated cards land on their day,
// multiples layer into a cluster. Drag a reusable (undated) card onto a
// day to stamp a dated copy there, or drag a dated card onto another day
// to reschedule it.
import { useMemo, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { parseISO, toISODate } from "@/lib/date";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function DayCluster({ cards, onClick, onDragCard }: { cards: Card[]; onClick: () => void; onDragCard: (e: React.DragEvent, id: string) => void }) {
  const layers = Math.min(cards.length, 3);
  const top = cards[0];
  const T = typeMeta(top.type);
  const single = cards.length === 1;
  return (
    <div className="cal-cluster" onClick={onClick}>
      {Array.from({ length: layers - 1 }).map((_, i) => (
        <div key={i} className="cal-layer" style={{ "--hue": typeMeta(cards[i + 1].type).hue, "--i": layers - 1 - i } as React.CSSProperties} />
      ))}
      <div
        className={"cal-card" + (single ? " cal-drag" : "")}
        style={{ "--hue": T.hue, fontSize: "13px" } as React.CSSProperties}
        draggable={single}
        onDragStart={single ? (e) => { e.stopPropagation(); onDragCard(e, top.id); } : undefined}
      >
        <div className="cal-card-top">
          <span className="swatch" />
          {top.cover?.kind === "emoji" ? <span className="cal-emoji">{top.cover.val}</span> : null}
          {cards.length > 1 ? <span className="cal-badge mono">{cards.length}</span> : null}
        </div>
        <span className="cal-card-title">{top.title}</span>
      </div>
      <div className="cal-bars" aria-hidden="true">
        {cards.slice(0, 4).map((c, i) => (
          <span key={i} className="cal-bar" style={{ "--hue": typeMeta(c.type).hue } as React.CSSProperties}>
            {c.cover?.kind === "emoji" ? <span className="cal-bar-emoji">{c.cover.val}</span> : null}
          </span>
        ))}
        {cards.length > 4 ? <span className="cal-bar-more mono">+{cards.length - 4}</span> : null}
      </div>
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

  const allCards = useMemo(() => {
    const out: Card[] = [];
    board.forEach((s) => s.cards.forEach((c) => out.push(c)));
    return out;
  }, [board]);

  const byDay = useMemo(() => {
    const m: Record<number, Card[]> = {};
    allCards.forEach((c) => {
      const p = parseISO(c.date);
      if (p && p.y === vy && p.m === vm) (m[p.d] = m[p.d] || []).push(c);
    });
    Object.keys(m).forEach((k) => {
      const n = Number(k);
      m[n].sort((a, b) => (a.card_order == null ? 9999 : a.card_order) - (b.card_order == null ? 9999 : b.card_order));
    });
    return m;
  }, [allCards, vy, vm]);

  const unscheduled = useMemo(() => allCards.filter((c) => !parseISO(c.date)), [allCards]);

  const firstWd = new Date(vy, vm, 1).getDay();
  const daysIn = new Date(vy, vm + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  const isToday = (d: number) => init.getFullYear() === vy && init.getMonth() === vm && init.getDate() === d;

  function prev() { if (vm === 0) { setVm(11); setVy(vy - 1); } else setVm(vm - 1); }
  function next() { if (vm === 11) { setVm(0); setVy(vy + 1); } else setVm(vm + 1); }

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
                  <DayCluster cards={byDay[d]} onClick={() => openDay(d, byDay[d])} onDragCard={(e, id) => startDrag(e, id, "day")} />
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
    </div>
  );
}
