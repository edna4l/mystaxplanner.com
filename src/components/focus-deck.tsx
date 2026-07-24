"use client";

// "Start my day" — a full-screen, one-card-at-a-time flow over today's
// queue (overdue + due today + habits not yet done, the same data
// Needs Attention and the Now bucket already use). All actions reuse
// existing mutations — nothing new to persist.
import { useState } from "react";
import type { Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { money, shortISO, todayISO } from "@/lib/date";
import { markHabitDoneToday } from "@/lib/habits";
import * as fx from "@/lib/fx";

export function FocusDeck({
  queue,
  onUpdate,
  onClose,
}: {
  queue: Card[];
  onUpdate: (id: string, patch: Partial<Card>) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rescheduling, setRescheduling] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);
  const [stepsText, setStepsText] = useState("");

  const card = queue[index];

  function advance() {
    setRescheduling(false);
    setBreakingDown(false);
    setStepsText("");
    setIndex((i) => i + 1);
  }

  function complete(e: React.MouseEvent<HTMLButtonElement>) {
    if (!card) return;
    if (card.type === "bill") {
      fx.coin(e.currentTarget);
      onUpdate(card.id, { paid: true });
    } else if (card.type === "habit") {
      const { days, streak, milestone } = markHabitDoneToday(card);
      if (milestone) fx.streak(streak);
      else fx.burst(e.currentTarget, { emoji: "🔥", count: 14 });
      onUpdate(card.id, { days, streak });
    } else if (card.checklist && card.checklist.length) {
      onUpdate(card.id, { checklist: card.checklist.map((c) => ({ ...c, done: true })) });
    } else {
      // No checklist to mark done — synthesize a single completed item
      // so this registers as done through the app's existing isDone()
      // definition (src/lib/todaySummary.ts) everywhere, no new field.
      onUpdate(card.id, { checklist: [{ text: card.title, done: true }] });
    }
    advance();
  }

  function reschedule(date: string) {
    if (!card) return;
    onUpdate(card.id, { date });
    advance();
  }

  function submitSteps() {
    if (!card) return;
    const items = stepsText.split("\n").map((t) => t.trim()).filter(Boolean).map((text) => ({ text, done: false }));
    if (items.length) onUpdate(card.id, { checklist: items });
    advance();
  }

  if (!queue.length || index >= queue.length) {
    return (
      <div className="ob-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="ob-card focus-card focus-done">
          <h2 className="focus-done-title">{queue.length ? "You're all caught up! 🎉" : "Nothing needs you right now."}</h2>
          <button className="cover-add-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  const T = typeMeta(card.type);
  const canBreakDown = (card.type === "task" || card.type === "project") && !(card.checklist && card.checklist.length);

  return (
    <div className="ob-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ob-card focus-card" style={{ "--hue": T.hue } as React.CSSProperties}>
        <div className="focus-progress">
          <span className="mono tiny">{index + 1} of {queue.length}</span>
          <button className="icon-btn round" onClick={onClose}>×</button>
        </div>

        <div className="focus-card-preview">
          <span className="type-tag"><span className="swatch" />{T.label}</span>
          <h2 className="focus-card-title">{card.title}</h2>
          {card.type === "bill" && card.amount != null ? <span className="amount mono">{money(card.amount)}</span> : null}
          {card.type === "habit" ? <span className="prev-sub">Current streak: <b className="mono">{card.streak || 0}</b> days</span> : null}
          {card.due || card.date ? <span className="prev-sub">Due {card.due || shortISO(card.date)}</span> : null}
          {card.notes ? <p className="prev-note">{card.notes}</p> : null}
        </div>

        {rescheduling ? (
          <div className="focus-reschedule">
            <button className="bext" onClick={() => reschedule(todayISO(1))}>Tomorrow</button>
            <button className="bext" onClick={() => reschedule(todayISO(7))}>Next week</button>
            <input type="date" className="inp" onChange={(e) => e.target.value && reschedule(e.target.value)} />
          </div>
        ) : breakingDown ? (
          <div className="focus-breakdown">
            <textarea
              className="inp area"
              placeholder="One step per line…"
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
            />
            <div className="focus-actions">
              <button className="cover-add-btn" onClick={submitSteps} disabled={!stepsText.trim()}>Save steps</button>
              <button className="link-btn" onClick={() => setBreakingDown(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="focus-actions">
            <button className="cover-add-btn focus-complete" onClick={complete}>Complete</button>
            {card.type !== "habit" ? <button className="bext" onClick={() => setRescheduling(true)}>Reschedule</button> : null}
            {canBreakDown ? <button className="bext" onClick={() => setBreakingDown(true)}>Break into steps</button> : null}
            <button className="link-btn" onClick={advance}>Skip</button>
          </div>
        )}
      </div>
    </div>
  );
}
