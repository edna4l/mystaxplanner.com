"use client";

// "Start my day" — a brief plan summary, then a full-screen, one-card-
// at-a-time flow over today's queue (overdue + due today + habits not
// yet done, the same data Needs Attention and the Now bucket already
// use). Actions are worded per card type instead of one generic
// "Complete" — a bill gets Mark paid/Reviewed/Reschedule/Skip for now,
// a habit gets Done today, a project/note/custom type opens the real
// card since "continue"/"review"/"view" need more than this compact
// preview shows. Every mutating action is undoable via Back for one
// step, reusing existing mutations — nothing new to persist except the
// tomorrow-reminder snooze (profile.tweaks.snoozedBills).
import { useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { money, shortISO, todayISO } from "@/lib/date";
import { overdueLabel } from "@/lib/bills";
import { markHabitDoneToday } from "@/lib/habits";
import { completionPatch, opensCardInstead, primaryActionLabel } from "@/lib/cardActions";
import * as fx from "@/lib/fx";

type TallyKey = "paid" | "reviewed" | "completed" | "doneToday" | "rescheduled" | "skipped";

interface HistoryEntry {
  index: number;
  tallyKey: TallyKey;
  revert: () => void;
}

function estimateMinutes(n: number) {
  return Math.max(1, Math.round(n * 0.6));
}

function FocusCardPreview({ card }: { card: Card }) {
  const T = typeMeta(card.type);
  return (
    <div className="focus-card-preview">
      <span className="type-tag"><span className="swatch" />{T.label}</span>
      <h2 className="focus-card-title">{card.title}</h2>
      {card.type === "bill" && card.amount != null ? <span className="amount mono">{money(card.amount)}</span> : null}
      {card.type === "habit" ? <span className="prev-sub">Current streak: <b className="mono">{card.streak || 0}</b> days</span> : null}
      {card.due || card.date ? <span className="prev-sub">Due {card.due || shortISO(card.date)}</span> : null}
      {card.notes ? <p className="prev-note">{card.notes}</p> : null}
    </div>
  );
}

function FocusProgress({ index, total }: { index: number; total: number }) {
  if (total <= 10) {
    return (
      <div className="focus-dots" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={"focus-dot" + (i <= index ? " on" : "")} />
        ))}
      </div>
    );
  }
  return (
    <div className="focus-bar" aria-hidden="true">
      <span style={{ width: `${((index + 1) / total) * 100}%` }} />
    </div>
  );
}

function sessionSummary(tally: Record<TallyKey, number>): string {
  const clauses: string[] = [];
  if (tally.paid) clauses.push(`${tally.paid} bill${tally.paid === 1 ? "" : "s"} paid`);
  if (tally.reviewed) clauses.push(`${tally.reviewed} bill${tally.reviewed === 1 ? "" : "s"} reviewed`);
  if (tally.completed) clauses.push(`${tally.completed} task${tally.completed === 1 ? "" : "s"} completed`);
  if (tally.doneToday) clauses.push(`${tally.doneToday} habit${tally.doneToday === 1 ? "" : "s"} done`);
  if (tally.rescheduled) clauses.push(`${tally.rescheduled} item${tally.rescheduled === 1 ? "" : "s"} rescheduled`);
  if (tally.skipped) clauses.push(`${tally.skipped} skipped`);
  return clauses.length ? clauses.join(", ") + "." : "";
}

export function FocusDeck({
  queue,
  onUpdate,
  onOpenCard,
  onSnoozeBill,
  onSkipBill,
  onUnskipBill,
  onClose,
}: {
  queue: Card[];
  onUpdate: (id: string, patch: Partial<Card>) => void;
  onOpenCard: (card: Card) => void;
  onSnoozeBill: (card: Card) => void;
  onSkipBill: (card: Card) => Promise<{ id: string; wasVirtual: boolean } | null>;
  onUnskipBill: (id: string, wasVirtual: boolean) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"intro" | "deck">(queue.length ? "intro" : "deck");
  const [index, setIndex] = useState(0);
  const [rescheduling, setRescheduling] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);
  const [stepsText, setStepsText] = useState("");
  const [exiting, setExiting] = useState<Card | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tally, setTally] = useState<Record<TallyKey, number>>({
    paid: 0, reviewed: 0, completed: 0, doneToday: 0, rescheduled: 0, skipped: 0,
  });

  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    if (actionTimer.current) clearTimeout(actionTimer.current);
  }, []);

  const card = queue[index];

  function advance() {
    if (!card) return;
    setExiting(card);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setExiting(null), 240);
    setRescheduling(false);
    setBreakingDown(false);
    setStepsText("");
    setIndex((i) => i + 1);
  }

  function commit(tallyKey: TallyKey, revert: () => void, label: string) {
    if (!card) return;
    setHistory((h) => [...h, { index, tallyKey, revert }]);
    setTally((t) => ({ ...t, [tallyKey]: t[tallyKey] + 1 }));
    setLastAction(label);
    if (actionTimer.current) clearTimeout(actionTimer.current);
    actionTimer.current = setTimeout(() => setLastAction(null), 5000);
    advance();
  }

  function goBack() {
    setHistory((h) => {
      if (!h.length) return h;
      const entry = h[h.length - 1];
      entry.revert();
      setTally((t) => ({ ...t, [entry.tallyKey]: Math.max(0, t[entry.tallyKey] - 1) }));
      setIndex(entry.index);
      setExiting(null);
      setLastAction(null);
      setRescheduling(false);
      setBreakingDown(false);
      return h.slice(0, -1);
    });
  }

  function markPaid(e: React.MouseEvent<HTMLButtonElement>) {
    if (!card) return;
    const prevPaid = card.paid;
    fx.coin(e.currentTarget);
    onUpdate(card.id, { paid: true });
    commit("paid", () => onUpdate(card.id, { paid: prevPaid }), `${card.title} marked paid.`);
  }

  function reviewedBill() {
    if (!card) return;
    commit("reviewed", () => {}, `${card.title} reviewed.`);
  }

  function remindTomorrow() {
    if (!card) return;
    onSnoozeBill(card);
    commit("rescheduled", () => {}, `We’ll remind you about ${card.title} tomorrow.`);
  }

  function skipBillForNow() {
    if (!card) return;
    const target = card;
    const skipRef: { current: { id: string; wasVirtual: boolean } | null } = { current: null };
    onSkipBill(target).then((r) => { skipRef.current = r; });
    commit(
      "skipped",
      () => { if (skipRef.current) onUnskipBill(skipRef.current.id, skipRef.current.wasVirtual); },
      `${target.title} skipped for now.`,
    );
  }

  function skipGeneric() {
    if (!card) return;
    commit("skipped", () => {}, `${card.title} skipped.`);
  }

  function completeTask(e: React.MouseEvent<HTMLButtonElement>) {
    if (!card) return;
    const patch = completionPatch(card);
    if (!patch) return;
    const prevChecklist = card.checklist;
    onUpdate(card.id, patch);
    fx.burst(e.currentTarget, { emoji: "✓", count: 10 });
    commit("completed", () => onUpdate(card.id, { checklist: prevChecklist }), `${card.title} completed.`);
  }

  function doneToday(e: React.MouseEvent<HTMLButtonElement>) {
    if (!card) return;
    const prevDays = card.days;
    const prevStreak = card.streak;
    const { days, streak, milestone } = markHabitDoneToday(card);
    if (milestone) fx.streak(streak);
    else fx.burst(e.currentTarget, { emoji: "🔥", count: 14 });
    onUpdate(card.id, { days, streak });
    commit("doneToday", () => onUpdate(card.id, { days: prevDays, streak: prevStreak }), `${card.title} done today.`);
  }

  function reschedule(date: string) {
    if (!card) return;
    const prevDate = card.date;
    onUpdate(card.id, { date });
    commit("rescheduled", () => onUpdate(card.id, { date: prevDate }), `${card.title} moved to ${shortISO(date)}.`);
  }

  function submitSteps() {
    if (!card) return;
    const items = stepsText.split("\n").map((t) => t.trim()).filter(Boolean).map((text) => ({ text, done: false }));
    if (!items.length) return;
    const prevChecklist = card.checklist;
    onUpdate(card.id, { checklist: items });
    commit("rescheduled", () => onUpdate(card.id, { checklist: prevChecklist }), `${card.title} broken into ${items.length} steps.`);
  }

  if (phase === "intro" && queue.length) {
    const overdueCount = queue.filter((c) => overdueLabel(c)).length;
    const minutes = estimateMinutes(queue.length);
    return (
      <div className="ob-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="ob-card focus-card focus-intro">
          <h2 className="focus-intro-title">Here&rsquo;s your plan for today</h2>
          <p className="focus-intro-sub">
            {queue.length} item{queue.length === 1 ? "" : "s"} need{queue.length === 1 ? "s" : ""} attention
            {overdueCount ? `, ${overdueCount} overdue` : ""}.
          </p>
          <p className="focus-intro-time">About {minutes} minute{minutes === 1 ? "" : "s"} to review.</p>
          <div className="focus-actions">
            <button className="cover-add-btn" onClick={() => setPhase("deck")}>Begin</button>
            <button className="link-btn" onClick={onClose}>Not now</button>
          </div>
        </div>
      </div>
    );
  }

  if (!queue.length || index >= queue.length) {
    const summary = sessionSummary(tally);
    return (
      <div className="ob-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="ob-card focus-card focus-done">
          <h2 className="focus-done-title">{queue.length ? "You’re ready for the day." : "Nothing needs you right now."}</h2>
          {summary ? <p className="ob-sub">{summary}</p> : null}
          <button className="cover-add-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  const T = typeMeta(card.type);
  const canBreakDown = (card.type === "task" || card.type === "project") && !(card.checklist && card.checklist.length);
  const overdue = overdueLabel(card);
  const showsOpenAction = opensCardInstead(card.type);

  return (
    <div className="ob-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="focus-card-stack">
        {exiting ? (
          <div className="ob-card focus-card focus-card-exit" style={{ "--hue": typeMeta(exiting.type).hue } as React.CSSProperties}>
            <FocusCardPreview card={exiting} />
          </div>
        ) : null}
        <div className="ob-card focus-card focus-card-enter" key={card.id} style={{ "--hue": T.hue } as React.CSSProperties}>
          <div className="focus-progress">
            <button className="link-btn focus-back" onClick={goBack} disabled={!history.length}>&larr; Back</button>
            <div className="focus-progress-mid">
              <FocusProgress index={index} total={queue.length} />
              <span className="mono tiny">{index + 1} of {queue.length}</span>
            </div>
            <button className="icon-btn round" onClick={onClose}>×</button>
          </div>

          <FocusCardPreview card={card} />

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
          ) : card.type === "bill" ? (
            <div className="focus-actions">
              <button className="cover-add-btn focus-complete" onClick={markPaid}>Mark paid</button>
              <button className="bext" onClick={reviewedBill}>Reviewed</button>
              {overdue ? (
                <button className="bext" onClick={remindTomorrow}>Remind me tomorrow</button>
              ) : (
                <button className="bext" onClick={() => setRescheduling(true)}>Reschedule</button>
              )}
              <button className="link-btn" onClick={skipBillForNow}>Skip for now</button>
            </div>
          ) : showsOpenAction ? (
            <div className="focus-actions">
              <button className="cover-add-btn focus-complete" onClick={() => onOpenCard(card)}>{primaryActionLabel(card.type)}</button>
              <button className="bext" onClick={() => setRescheduling(true)}>Reschedule</button>
              <button className="link-btn" onClick={skipGeneric}>Skip</button>
            </div>
          ) : (
            <div className="focus-actions">
              <button className="cover-add-btn focus-complete" onClick={card.type === "habit" ? doneToday : completeTask}>
                {primaryActionLabel(card.type)}
              </button>
              {card.type !== "habit" ? <button className="bext" onClick={() => setRescheduling(true)}>Reschedule</button> : null}
              {canBreakDown ? <button className="bext" onClick={() => setBreakingDown(true)}>Break into steps</button> : null}
              <button className="link-btn" onClick={skipGeneric}>Skip</button>
            </div>
          )}

          {lastAction ? (
            <div className="focus-undo-toast">
              <span>{lastAction}</span>
              <button className="link-btn" onClick={goBack}>Undo</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
