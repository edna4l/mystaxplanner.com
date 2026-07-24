// Shared card-sort options, reused by any view that lists real Card rows
// (the Bills page's own sort predates this and stays independent — see
// bills-view.tsx). Nulls always sink to the end regardless of direction.
import type { Card } from "@/lib/types";

export type CardSortKey = "date" | "amount" | "amount-asc" | "name" | "name-desc" | "category";

export function sortCards(cards: Card[], key: CardSortKey): Card[] {
  const s = [...cards];
  if (key === "amount") s.sort((a, b) => (b.amount ?? -Infinity) - (a.amount ?? -Infinity));
  else if (key === "amount-asc") s.sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity));
  else if (key === "name") s.sort((a, b) => a.title.localeCompare(b.title));
  else if (key === "name-desc") s.sort((a, b) => b.title.localeCompare(a.title));
  else if (key === "category") s.sort((a, b) => (a.category || "~").localeCompare(b.category || "~"));
  else s.sort((a, b) => (a.date || "~").localeCompare(b.date || "~"));
  return s;
}
