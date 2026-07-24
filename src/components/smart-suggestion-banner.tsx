"use client";

// Dismissible row of Smart Stack suggestions (src/lib/smartSuggestions.ts)
// on the Board. Reviewing just fans the matching cards open — the same
// view used everywhere else — so the user decides what to do, nothing
// is merged or deleted automatically.
import type { Card } from "@/lib/types";
import type { StackSuggestion } from "@/lib/smartSuggestions";

export function SmartSuggestionBanner({
  suggestions,
  onReview,
  onDismiss,
}: {
  suggestions: StackSuggestion[];
  onReview: (label: string, cards: Card[]) => void;
  onDismiss: (key: string) => void;
}) {
  if (!suggestions.length) return null;

  return (
    <div className="suggestions">
      {suggestions.map((s) => (
        <div className="suggestion-row" key={s.key}>
          <span className="suggestion-text">
            You have {s.cards.length} cards named &ldquo;{s.title}&rdquo; — want to review them?
          </span>
          <div className="suggestion-actions">
            <button className="link-btn" onClick={() => onReview(s.title, s.cards)}>Review</button>
            <button className="icon-btn round suggestion-dismiss" onClick={() => onDismiss(s.key)} title="Dismiss">×</button>
          </div>
        </div>
      ))}
    </div>
  );
}
