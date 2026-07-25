// Shared bill-status helpers used by both the Bills page and the Board's
// aggregate bill stack tile, so "due soon"/"overdue"/"remaining" mean the
// same thing everywhere instead of two definitions drifting apart.
import type { Card } from "@/lib/types";
import { parseISO } from "@/lib/date";

export function remainingDue(b: Card) {
  const bal = Number(b.balance || 0);
  if (bal <= 0) return b.paid ? 0 : Number(b.amount || 0);
  return b.paid ? Math.max(0, bal - Number(b.amount || 0)) : bal;
}

export function isDueSoon(b: Card) {
  if (b.paid) return false;
  const p = parseISO(b.date);
  if (!p) return false;
  const d = new Date(p.y, p.m, p.d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  return diff >= 0 && diff <= 3;
}

// "Due today"/"Due tomorrow"/"Due in Nd" — used wherever "Due soon" was
// previously shown as a bare label, so the badge itself answers "how soon."
export function dueInLabel(b: Card): string | null {
  if (b.paid) return null;
  const p = parseISO(b.date);
  if (!p) return null;
  const d = new Date(p.y, p.m, p.d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff}d`;
}

// "Past due" for anything overdue within the current calendar month;
// "N months past due" once a full calendar month boundary has passed —
// matches how people actually talk about a bill they've missed.
export function overdueLabel(b: Card): string | null {
  if (b.paid) return null;
  const p = parseISO(b.date);
  if (!p) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(p.y, p.m, p.d);
  if (d >= today) return null;
  const months = (today.getFullYear() - p.y) * 12 + (today.getMonth() - p.m);
  return months <= 0 ? "Past due" : `${months} month${months === 1 ? "" : "s"} past due`;
}
