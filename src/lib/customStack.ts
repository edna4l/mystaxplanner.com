// Display-only grouping for custom card types (e.g. a user-created
// "CBT Counseling" type) — these have no shared series id the way bills
// do (see src/lib/billBoardStack.ts), so cards are grouped purely by
// matching type + title text. No database change; purely a Board
// rendering concern. Only single-card slots are considered — anything
// the user has manually drag-stacked stays untouched, same rule as
// bills.
import type { BoardSlot, Card } from "@/lib/types";
import { BUILTIN_CARD_TYPES } from "@/lib/cardTypes";
import { soonestDate } from "@/lib/date";

export interface CustomGroup {
  key: string;
  type: string;
  title: string;
  cards: Card[];
  nextDate: string | null;
}

export function groupCustomTypesForBoard(board: BoardSlot[]): { groups: CustomGroup[]; singles: Card[] } {
  const standaloneCustom: Card[] = [];
  board.forEach((s) => {
    if (s.cards.length === 1 && !(s.cards[0].type in BUILTIN_CARD_TYPES)) standaloneCustom.push(s.cards[0]);
  });

  const byKey = new Map<string, Card[]>();
  standaloneCustom.forEach((c) => {
    const key = c.type + "::" + c.title.trim().toLowerCase();
    const arr = byKey.get(key) ?? [];
    arr.push(c);
    byKey.set(key, arr);
  });

  const groups: CustomGroup[] = [];
  const singles: Card[] = [];
  byKey.forEach((cards, key) => {
    if (cards.length > 1) {
      groups.push({
        key,
        type: cards[0].type,
        title: cards[0].title,
        cards: [...cards].sort((a, b) => (a.date || "").localeCompare(b.date || "")),
        nextDate: soonestDate(cards.map((c) => c.date)),
      });
    } else {
      singles.push(cards[0]);
    }
  });

  return { groups, singles };
}
