"use client";

// "End my day" — review everything left as a group and decide what
// happens to each, in contrast to Focus Deck's one-at-a-time flow.
// Never a timed popup, so it never guesses at your schedule or
// timezone. Wording is deliberately non-scolding: an unfinished list
// isn't a report card. Each row reuses an existing mutation (or, for
// "Remind me tomorrow" on an overdue bill, a session-only snooze that
// leaves the real due date untouched — see profile.tweaks.snoozedBills
// in src/lib/theme.ts).
import { useState } from "react";
import type { Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { todayISO } from "@/lib/date";
import { overdueLabel } from "@/lib/bills";
import { markHabitDoneToday } from "@/lib/habits";
import { canComplete, completionPatch } from "@/lib/cardActions";
import { useEscapeKey } from "@/lib/useEscapeKey";

function headlineFor(remaining: number, tomorrowCount: number, anyProgress: boolean): { title: string; sub: string } {
  if (remaining === 0) {
    if (!anyProgress) return { title: "Everything’s done. 🎉", sub: "Nothing needs a decision today." };
    const tomorrowLine = tomorrowCount ? `Tomorrow has ${tomorrowCount} planned item${tomorrowCount === 1 ? "" : "s"}. ` : "";
    return { title: "Your day is wrapped up.", sub: `${tomorrowLine}Nothing was left floating.` };
  }
  if (!anyProgress) {
    return {
      title: "Nothing completed yet — and that’s okay.",
      sub: `Decide what should happen to these ${remaining} item${remaining === 1 ? "" : "s"}.`,
    };
  }
  return {
    title: "Let’s wrap up your day.",
    sub: `${remaining} item${remaining === 1 ? "" : "s"} still need${remaining === 1 ? "s" : ""} a plan.`,
  };
}

function DailyResetRow({
  card, onUpdate, onOpenCard, onSnoozeBill, onDismiss, onReturn, onMovedToTomorrow,
}: {
  card: Card;
  onUpdate: (id: string, patch: Partial<Card>) => void;
  onOpenCard: (card: Card) => void;
  onSnoozeBill: (card: Card) => void;
  onDismiss: (card: Card) => void;
  onReturn: (id: string) => void;
  onMovedToTomorrow: () => void;
}) {
  const [pickingDate, setPickingDate] = useState(false);
  const T = typeMeta(card.type);
  const overdueBill = card.type === "bill" && !!overdueLabel(card);
  const completable = canComplete(card);

  function moveToTomorrow() {
    if (overdueBill) onSnoozeBill(card);
    else onUpdate(card.id, { date: todayISO(1) });
    onMovedToTomorrow();
  }
  function chooseDate(date: string) {
    onUpdate(card.id, { date });
    if (date === todayISO(1)) onMovedToTomorrow();
    setPickingDate(false);
  }
  function markComplete() {
    if (card.type === "habit") {
      const { days, streak } = markHabitDoneToday(card);
      onUpdate(card.id, { days, streak });
      return;
    }
    const patch = completionPatch(card);
    if (patch) onUpdate(card.id, patch);
  }

  return (
    <div className="daily-reset-row" style={{ "--hue": T.hue } as React.CSSProperties}>
      <button className="link-btn daily-reset-row-title" onClick={() => onOpenCard(card)}>{card.title}</button>
      <div className="daily-reset-row-actions">
        <button className="link-btn" onClick={moveToTomorrow}>{overdueBill ? "Remind me tomorrow" : "Move to tomorrow"}</button>
        {pickingDate ? (
          <input
            type="date"
            className="inp daily-reset-date"
            autoFocus
            onChange={(e) => e.target.value && chooseDate(e.target.value)}
            onBlur={() => setPickingDate(false)}
          />
        ) : (
          <button className="link-btn" onClick={() => setPickingDate(true)}>Choose another date</button>
        )}
        <button className="link-btn" onClick={() => onReturn(card.id)}>Return to its stack</button>
        {completable ? <button className="link-btn" onClick={markComplete}>Mark complete</button> : null}
        <button className="link-btn daily-reset-dismiss" onClick={() => onDismiss(card)}>Dismiss for now</button>
      </div>
    </div>
  );
}

export function DailyReset({
  unfinished,
  onUpdate,
  onOpenCard,
  onSnoozeBill,
  onDismiss,
  onClose,
}: {
  unfinished: Card[];
  onUpdate: (id: string, patch: Partial<Card>) => void;
  onOpenCard: (card: Card) => void;
  onSnoozeBill: (card: Card) => void;
  onDismiss: (card: Card) => void;
  onClose: () => void;
}) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [tomorrowCount, setTomorrowCount] = useState(0);
  const [actioned, setActioned] = useState(false);
  useEscapeKey(onClose);

  const visible = unfinished.filter((c) => !hiddenIds.has(c.id));
  const { title, sub } = headlineFor(visible.length, tomorrowCount, actioned);

  function handleReturn(id: string) {
    setHiddenIds((s) => new Set(s).add(id));
    setActioned(true);
  }
  function handleMovedToTomorrow() {
    setTomorrowCount((n) => n + 1);
    setActioned(true);
  }
  function handleDismiss(card: Card) {
    setActioned(true);
    onDismiss(card);
  }
  function handleSnooze(card: Card) {
    setActioned(true);
    onSnoozeBill(card);
  }
  function handleUpdate(id: string, patch: Partial<Card>) {
    setActioned(true);
    onUpdate(id, patch);
  }

  return (
    <div className="ob-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ob-card focus-card daily-reset-card">
        <h2 className="focus-done-title">{title}</h2>
        <p className="ob-sub">{sub}</p>

        {visible.length ? (
          <div className="daily-reset-list">
            {visible.map((c) => (
              <DailyResetRow
                key={c.id}
                card={c}
                onUpdate={handleUpdate}
                onOpenCard={onOpenCard}
                onSnoozeBill={handleSnooze}
                onDismiss={handleDismiss}
                onReturn={handleReturn}
                onMovedToTomorrow={handleMovedToTomorrow}
              />
            ))}
          </div>
        ) : null}

        <button className="cover-add-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
