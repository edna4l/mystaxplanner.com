"use client";

// Trimmed port of overlays.jsx's StackFan — shows the stack's cards and
// lets you open one or pop it out; drag-to-reorder/drag-out isn't ported.
import type { BoardSlot, Card } from "@/lib/types";
import { SquareCard } from "@/components/square-card";

export function StackFan({
  slot,
  onClose,
  onOpenCard,
  onUnstack,
  onUngroup,
}: {
  slot: BoardSlot;
  onClose: () => void;
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onUnstack: (cardId: string) => void;
  onUngroup: () => void;
}) {
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fan" onMouseDown={(e) => e.stopPropagation()}>
        <div className="fan-head">
          <span className="fan-title static">{slot.name || "Stack"}</span>
          <span className="fan-count mono">{slot.cards.length} cards</span>
          <button className="icon-btn round" onClick={onClose}>×</button>
        </div>
        <div className="fan-grid">
          {slot.cards.map((c) => (
            <div className="fan-item" key={c.id}>
              <div className="fan-card-wrap">
                <SquareCard card={c} onOpen={(e) => onOpenCard(c, e.currentTarget.getBoundingClientRect())} />
              </div>
              <div className="fan-item-actions">
                <button className="unstack" onClick={() => onUnstack(c.id)}>Pop out →</button>
              </div>
            </div>
          ))}
        </div>
        <div className="fan-foot">
          <span className="hint mono">tap a card to open it</span>
          <button className="ghost-btn" onClick={onUngroup}>Ungroup all</button>
        </div>
      </div>
    </div>
  );
}
