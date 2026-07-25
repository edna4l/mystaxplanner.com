// Shared "what does completing/acting on a card mean" logic for Focus
// Deck and Daily Reset, so the two review flows respond the same way to
// the same card instead of two copies of this branching drifting apart.
// Habit completion isn't included here — it needs streak math, already
// centralized in markHabitDoneToday (src/lib/habits.ts).
import type { Card } from "@/lib/types";

// Bills: paid. Task/project: every checklist item done (or a single
// synthesized one, so a checklist-less task still registers as done
// through the app's existing isDone() definition). Habit/note/custom
// ("appointment") types have no one-tap completion concept, hence null.
export function completionPatch(card: Card): Partial<Card> | null {
  if (card.type === "bill") return { paid: true };
  if (card.type === "task" || card.type === "project") {
    if (card.checklist && card.checklist.length) {
      return { checklist: card.checklist.map((c) => ({ ...c, done: true })) };
    }
    return { checklist: [{ text: card.title, done: true }] };
  }
  return null;
}

export function canComplete(card: Card): boolean {
  return card.type === "bill" || card.type === "task" || card.type === "project" || card.type === "habit";
}

// The label for a card's primary review-flow action — this is what
// makes the deck feel like it's actually looking at what's in front of
// it instead of showing the same generic "Complete" for everything.
export function primaryActionLabel(type: string): string {
  switch (type) {
    case "bill": return "Mark paid";
    case "task": return "Complete task";
    case "habit": return "Done today";
    case "project": return "Continue project";
    case "note": return "Review note";
    default: return "View appointment"; // any custom type
  }
}

// Project/note/appointment don't complete in one tap — the honest
// action is to actually open them, since "continue"/"review"/"view"
// all imply looking at content the compact preview doesn't show.
export function opensCardInstead(type: string): boolean {
  return !(type === "bill" || type === "task" || type === "habit");
}
