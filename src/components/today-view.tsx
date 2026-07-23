"use client";

// Trimmed port of home.jsx's TodayView — due today/overdue, bills this
// week, streaks at risk. The Weekly Review card and Quick Add parser
// aren't ported yet.
import { useMemo } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { todayISO, shortISO, money } from "@/lib/date";
import * as fx from "@/lib/fx";

function isDone(c: Card) {
  return !!(c.checklist && c.checklist.length && c.checklist.every((x) => x.done));
}

function TodayRow({ card, onOpen, onPay, onMark }: { card: Card; onOpen: (c: Card, rect: DOMRect | null) => void; onPay: (c: Card, el: HTMLElement) => void; onMark: (c: Card, el: HTMLElement) => void }) {
  const T = typeMeta(card.type);
  return (
    <div className="trow" style={{ "--hue": T.hue } as React.CSSProperties}>
      {card.type === "bill" ? (
        <button className={"paydot" + (card.paid ? " on" : "")} title="Mark paid" onClick={(e) => { if (!card.paid) onPay(card, e.currentTarget); }} />
      ) : card.type === "habit" ? (
        <button className="trow-habit" onClick={(e) => onMark(card, e.currentTarget)} title="Mark done">✓</button>
      ) : (
        <span className="trow-dot" />
      )}
      <button className="trow-main" onClick={(e) => onOpen(card, e.currentTarget.getBoundingClientRect())}>
        {card.cover?.kind === "emoji" ? <span className="trow-emoji">{card.cover.val}</span> : null}
        <span className="trow-name">{card.title}</span>
        <span className="trow-type">{T.label}</span>
      </button>
      <span className="trow-meta mono">
        {card.type === "bill" && card.amount != null ? money(card.amount) : card.due || (card.date ? shortISO(card.date) : "")}
      </span>
    </div>
  );
}

export function TodayView({
  board,
  onOpenCard,
  onUpdate,
  onGo,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onUpdate: (cardId: string, patch: Partial<Card>) => void;
  onGo: (dest: "board") => void;
}) {
  const today = todayISO(0);
  const weekEnd = todayISO(7);
  const all = useMemo(() => {
    const out: Card[] = [];
    board.forEach((s) => s.cards.forEach((c) => out.push(c)));
    return out;
  }, [board]);

  const dueToday = all.filter(
    (c) => c.type !== "habit" && ((c.date && c.date === today) || (!c.date && /^today$/i.test((c.due || "").trim()))) && !(c.type === "bill" && c.paid) && !isDone(c),
  );
  const overdue = all.filter((c) => c.type !== "habit" && c.date && c.date < today && !(c.type === "bill" && c.paid) && !isDone(c));
  const weekBills = all
    .filter((c) => c.type === "bill" && !c.paid && c.date && c.date >= today && c.date <= weekEnd)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const habits = all.filter((c) => c.type === "habit");
  const habitsRisk = habits.filter((c) => {
    const d = c.days || [];
    return !d[d.length - 1];
  });
  const weekTotal = weekBills.reduce((a, c) => a + Number(c.amount || 0), 0);

  function pay(card: Card, el: HTMLElement) {
    fx.coin(el);
    onUpdate(card.id, { paid: true });
  }
  function mark(card: Card, el: HTMLElement) {
    const days = (card.days || []).slice();
    const i = days.length - 1;
    days[i] = true;
    let s = 0;
    for (let j = days.length - 1; j >= 0; j--) { if (days[j]) s++; else break; }
    if (s === 7 || s === 30 || s === 100) fx.streak(s);
    else fx.burst(el, { emoji: "🔥", count: 14 });
    onUpdate(card.id, { days, streak: s });
  }

  const nDue = dueToday.length + overdue.length;
  const headline = nDue === 0 ? "You're all caught up." : nDue + (nDue === 1 ? " thing needs you today." : " things need you today.");
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="today">
      <div className="today-hero-wrap" data-phase="afternoon">
        <span className="today-orb" />
        <span className="today-orb-glow" />
        <div className="today-hero">
          <div className="today-hero-text">
            <span className="today-phase">{dateLine}</span>
            <h2 className="today-headline">{headline}</h2>
          </div>
        </div>
      </div>

      <div className="today-stats">
        <button className="tstat" onClick={() => onGo("board")}>
          <span className="tstat-num">{dueToday.length}</span><span className="tstat-cap">Due today</span>
        </button>
        <button className="tstat" onClick={() => onGo("board")}>
          <span className="tstat-num mono">{money(weekTotal)}</span><span className="tstat-cap">Bills this week</span>
        </button>
        <button className="tstat" onClick={() => onGo("board")}>
          <span className="tstat-num">{habitsRisk.length}</span><span className="tstat-cap">Streaks at risk</span>
        </button>
      </div>

      <div className="today-cols">
        <div className="today-col">
          {overdue.length ? (
            <div className="today-block">
              <div className="today-block-head over"><span>Overdue</span><span className="mono">{overdue.length}</span></div>
              {overdue.map((c) => <TodayRow key={c.id} card={c} onOpen={onOpenCard} onPay={pay} onMark={mark} />)}
            </div>
          ) : null}
          <div className="today-block">
            <div className="today-block-head"><span>Due today</span><span className="mono">{dueToday.length}</span></div>
            {dueToday.length ? dueToday.map((c) => <TodayRow key={c.id} card={c} onOpen={onOpenCard} onPay={pay} onMark={mark} />) : (
              <div className="today-empty">Nothing due today. 🎉</div>
            )}
          </div>
        </div>
        <div className="today-col">
          <div className="today-block">
            <div className="today-block-head"><span>Bills this week</span><span className="mono">{money(weekTotal)}</span></div>
            {weekBills.length ? weekBills.map((c) => <TodayRow key={c.id} card={c} onOpen={onOpenCard} onPay={pay} onMark={mark} />) : (
              <div className="today-empty">No bills due in the next 7 days.</div>
            )}
          </div>
          <div className="today-block">
            <div className="today-block-head"><span>Keep your streaks</span><span className="mono">{habitsRisk.length}</span></div>
            {habits.length ? (
              habitsRisk.length ? habitsRisk.map((c) => (
                <div className="trisk" key={c.id} style={{ "--hue": typeMeta("habit").hue } as React.CSSProperties}>
                  <button className="trow-habit" onClick={(e) => mark(c, e.currentTarget)}>✓</button>
                  <button className="trow-main" onClick={(e) => onOpenCard(c, e.currentTarget.getBoundingClientRect())}>
                    <span className="trow-name">{c.title}</span>
                    <span className="trow-type">{c.streak ? "🔥 " + c.streak + "-day streak" : "Start a streak"}</span>
                  </button>
                  <span className="trow-meta">Tap ✓</span>
                </div>
              )) : <div className="today-empty">All habits done today. 🎉</div>
            ) : <div className="today-empty">No habits yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
