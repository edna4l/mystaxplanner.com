"use client";

// A calendar-day fan: a read-only stack of cards that share a date.
// Trimmed port of overlays.jsx's StackFan with hideStackControls=true.
import type { Card } from "@/lib/types";
import { SquareCard } from "@/components/square-card";

export function DayFan({
  title,
  cards,
  onClose,
  onOpenCard,
}: {
  title: string;
  cards: Card[];
  onClose: () => void;
  onOpenCard: (card: Card) => void;
}) {
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fan" onMouseDown={(e) => e.stopPropagation()}>
        <div className="fan-head">
          <span className="fan-title static">{title}</span>
          <span className="fan-count mono">{cards.length} cards</span>
          <button className="icon-btn round" onClick={onClose}>×</button>
        </div>
        <div className="fan-grid">
          {cards.map((c) => (
            <div className="fan-item" key={c.id}>
              <div className="fan-card-wrap">
                <SquareCard card={c} onOpen={() => onOpenCard(c)} />
              </div>
            </div>
          ))}
        </div>
        <div className="fan-foot">
          <span className="hint mono">tap a card to open it</span>
        </div>
      </div>
    </div>
  );
}
