"use client";

// "End my day" — a manual summary of what's left today (never a timed
// popup, so it never guesses at your schedule or timezone). Shows
// today's remaining queue with quick actions; each one reuses an
// existing mutation, and "Reschedule" just opens the card in the
// normal editor rather than duplicating a date picker here.
import type { Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";

export function DailyReset({
  total,
  unfinished,
  onOpenCard,
  onMoveToTomorrow,
  onDelete,
  onClose,
}: {
  total: number;
  unfinished: Card[];
  onOpenCard: (card: Card) => void;
  onMoveToTomorrow: (card: Card) => void;
  onDelete: (card: Card) => void;
  onClose: () => void;
}) {
  const done = Math.max(0, total - unfinished.length);

  return (
    <div className="ob-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ob-card focus-card">
        <h2 className="focus-done-title">You completed {done} of {total || done} today.</h2>

        {unfinished.length ? (
          <>
            <p className="ob-sub">{unfinished.length} unfinished {unfinished.length === 1 ? "card" : "cards"} remain:</p>
            <div className="daily-reset-list">
              {unfinished.map((c) => {
                const T = typeMeta(c.type);
                return (
                  <div className="daily-reset-row" key={c.id} style={{ "--hue": T.hue } as React.CSSProperties}>
                    <button className="link-btn daily-reset-row-title" onClick={() => onOpenCard(c)}>{c.title}</button>
                    <div className="daily-reset-row-actions">
                      <button className="link-btn" onClick={() => onMoveToTomorrow(c)}>Move to tomorrow</button>
                      <button className="icon-btn round" onClick={() => onDelete(c)} title="Delete">×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="ob-sub">Everything&rsquo;s done. 🎉</p>
        )}

        <button className="cover-add-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
