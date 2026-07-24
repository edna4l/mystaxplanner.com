// Recurring-bill occurrence generator. A root bill card (origin === null)
// with recur_freq set describes a rule; occurrences are generated
// virtually for display and only become real rows ("materialized") when
// they diverge from the rule (paid, edited, skipped) — see
// materializeOccurrence in useBoard.ts. See plans/snug-stargazing-spring
// (recurring bill series) for the full design.
import type { Card } from "@/lib/types";
import { parseISO, toISODate, shortISO } from "@/lib/date";

const MAX_ITERATIONS = 600;

function stepDate(anchor: { y: number; m: number; d: number }, freq: Card["recur_freq"], n: number): string | null {
  if (freq === "monthly") {
    let y = anchor.y;
    let m = anchor.m + n;
    while (m > 11) { m -= 12; y++; }
    while (m < 0) { m += 12; y--; }
    const daysIn = new Date(y, m + 1, 0).getDate();
    return toISODate(y, m, Math.min(anchor.d, daysIn));
  }
  if (freq === "yearly") {
    const y = anchor.y + n;
    const daysIn = new Date(y, anchor.m + 1, 0).getDate();
    return toISODate(y, anchor.m, Math.min(anchor.d, daysIn));
  }
  if (freq === "weekly" || freq === "biweekly") {
    const days = freq === "weekly" ? 7 : 14;
    const d = new Date(anchor.y, anchor.m, anchor.d);
    d.setDate(d.getDate() + days * n);
    return toISODate(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
}

// Every date the series rule produces within [rangeStart, rangeEnd],
// bounded by recur_until if set. Non-recurring roots just yield their own
// date if it falls in range.
export function projectOccurrenceDates(root: Card, rangeStart: string, rangeEnd: string): string[] {
  const anchor = parseISO(root.date);
  if (!anchor) return [];
  if (!root.recur_freq) {
    return root.date && root.date >= rangeStart && root.date <= rangeEnd ? [root.date] : [];
  }
  const until = root.recur_until;
  const out: string[] = [];
  for (let n = 0; n < MAX_ITERATIONS; n++) {
    const d = stepDate(anchor, root.recur_freq, n);
    if (!d) break;
    if (until && d > until) break;
    if (d > rangeEnd) break;
    if (d >= rangeStart) out.push(d);
  }
  return out;
}

function virtualOccurrence(root: Card, date: string): Card {
  return {
    ...root,
    id: `virtual:${root.id}:${date}`,
    date,
    due: shortISO(date),
    occurrence_date: date,
    origin: root.id,
    paid: false,
    skipped: null,
  };
}

export function isVirtualId(id: string): boolean {
  return id.startsWith("virtual:");
}

export function parseVirtualId(id: string): { rootId: string; date: string } | null {
  if (!isVirtualId(id)) return null;
  const rest = id.slice("virtual:".length);
  const sep = rest.lastIndexOf(":");
  if (sep < 0) return null;
  return { rootId: rest.slice(0, sep), date: rest.slice(sep + 1) };
}

// Merges a root's real materialized exceptions with generated virtual
// occurrences for any projected date that isn't materialized yet.
// Skipped exceptions are omitted entirely.
export function mergeOccurrences(root: Card, exceptions: Card[], rangeStart: string, rangeEnd: string): Card[] {
  const dates = projectOccurrenceDates(root, rangeStart, rangeEnd);
  const byDate = new Map<string, Card>();
  exceptions.forEach((e) => { if (e.occurrence_date) byDate.set(e.occurrence_date, e); });

  const out: Card[] = [];
  for (const d of dates) {
    const existing = byDate.get(d);
    if (existing) {
      if (!existing.skipped) out.push(existing);
    } else {
      out.push(virtualOccurrence(root, d));
    }
  }
  return out;
}

// Top-level helper for view components: given every bill-type card and a
// display range, returns the effective list — plain one-off bills as-is,
// plus each recurring series' real+virtual occurrences for that range.
export function expandRecurringBills(allBills: Card[], rangeStart: string, rangeEnd: string): Card[] {
  const rootIds = new Set<string>();
  allBills.forEach((c) => { if (!c.origin && c.recur_freq) rootIds.add(c.id); });

  const exceptionsByRoot = new Map<string, Card[]>();
  allBills.forEach((c) => {
    if (c.origin && rootIds.has(c.origin)) {
      const arr = exceptionsByRoot.get(c.origin) ?? [];
      arr.push(c);
      exceptionsByRoot.set(c.origin, arr);
    }
  });

  const out: Card[] = [];
  allBills.forEach((c) => {
    if (rootIds.has(c.id) || (c.origin && rootIds.has(c.origin))) return; // handled below
    if (!c.date || (c.date >= rangeStart && c.date <= rangeEnd)) out.push(c);
  });
  allBills.forEach((c) => {
    if (!rootIds.has(c.id)) return;
    out.push(...mergeOccurrences(c, exceptionsByRoot.get(c.id) ?? [], rangeStart, rangeEnd));
  });
  return out;
}
