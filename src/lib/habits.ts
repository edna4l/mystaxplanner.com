// Shared habit-completion logic — extracted from today-view.tsx's mark()
// so Focus Deck can reuse the exact same streak computation instead of a
// second, potentially-drifting copy.
import type { Card } from "@/lib/types";

export interface HabitCompletion {
  days: boolean[];
  streak: number;
  // 7/30/100-day streak just hit — callers use this to trigger the
  // bigger celebration animation instead of the regular one.
  milestone: boolean;
}

export function markHabitDoneToday(card: Card): HabitCompletion {
  const days = (card.days || []).slice();
  const i = days.length - 1;
  days[i] = true;
  let streak = 0;
  for (let j = days.length - 1; j >= 0; j--) {
    if (days[j]) streak++;
    else break;
  }
  return { days, streak, milestone: streak === 7 || streak === 30 || streak === 100 };
}
