// Detects the exact data pattern behind two real bugs found this
// session (the "Morning walk" habit and "Disney Plus" bill duplication)
// — several standalone cards of the same type sharing an identical
// title, with no structural link between them. Bills already have a
// real recurring-series engine (recurrence.ts) and custom types already
// auto-group by title (customStack.ts), so this only looks at the
// built-in types that have neither: habit, task, project, note.
// Purely a suggestion — never merges or deletes anything itself; the
// user reviews the matching cards themselves via the existing fan view.
import type { BoardSlot, Card } from "@/lib/types";

const WATCHED_TYPES = new Set(["habit", "task", "project", "note"]);
const MIN_GROUP_SIZE = 3;

export interface StackSuggestion {
  key: string;
  type: string;
  title: string;
  cards: Card[];
}

export function detectStackSuggestions(board: BoardSlot[], dismissed: string[]): StackSuggestion[] {
  const dismissedSet = new Set(dismissed);
  const byKey = new Map<string, Card[]>();

  board.forEach((s) => {
    if (s.cards.length !== 1) return;
    const c = s.cards[0];
    if (!WATCHED_TYPES.has(c.type)) return;
    const key = c.type + "::" + c.title.trim().toLowerCase();
    const arr = byKey.get(key) ?? [];
    arr.push(c);
    byKey.set(key, arr);
  });

  const suggestions: StackSuggestion[] = [];
  byKey.forEach((cards, key) => {
    if (cards.length < MIN_GROUP_SIZE || dismissedSet.has(key)) return;
    suggestions.push({ key, type: cards[0].type, title: cards[0].title, cards });
  });
  return suggestions.sort((a, b) => b.cards.length - a.cards.length);
}
