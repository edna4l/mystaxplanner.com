"use client";

// A calendar-day fan: a read-only stack of cards that share a date.
// Trimmed port of overlays.jsx's StackFan with hideStackControls=true.
import { useMemo, useState } from "react";
import type { Card } from "@/lib/types";
import { SquareCard } from "@/components/square-card";
import { sortCards, type CardSortKey } from "@/lib/sortCards";
import { useEscapeKey } from "@/lib/useEscapeKey";

export function DayFan({
  title,
  cards,
  onClose,
  onOpenCard,
  secondaryAction,
}: {
  title: string;
  cards: Card[];
  onClose: () => void;
  onOpenCard: (card: Card) => void;
  secondaryAction?: { label: string; onClick: () => void };
}) {
  const [sortBy, setSortBy] = useState<CardSortKey>("date");
  const sorted = useMemo(() => sortCards(cards, sortBy), [cards, sortBy]);
  useEscapeKey(onClose);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fan" onMouseDown={(e) => e.stopPropagation()}>
        <div className="fan-head">
          <span className="fan-title static">{title}</span>
          <span className="fan-count mono">{cards.length} cards</span>
          {cards.length > 1 ? (
            <select className="bsort fan-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as CardSortKey)} title="Sort">
              <option value="date">Sort: Date</option>
              <option value="amount">Sort: Amount (high→low)</option>
              <option value="amount-asc">Sort: Amount (low→high)</option>
              <option value="name">Sort: A→Z</option>
              <option value="name-desc">Sort: Z→A</option>
              <option value="category">Sort: Category</option>
            </select>
          ) : null}
          <button className="icon-btn round" onClick={onClose}>×</button>
        </div>
        <div className="fan-grid">
          {sorted.map((c) => (
            <div className="fan-item" key={c.id}>
              <div className="fan-card-wrap">
                <SquareCard card={c} onOpen={() => onOpenCard(c)} />
              </div>
            </div>
          ))}
        </div>
        <div className="fan-foot">
          <span className="hint mono">tap a card to open it</span>
          {secondaryAction ? (
            <button className="link-btn" onClick={secondaryAction.onClick}>{secondaryAction.label}</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
