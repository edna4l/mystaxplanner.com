// Ported from data.jsx — the built-in type registry plus the "blank card"
// factory. Custom types (created in-app) are merged in at runtime by
// useBoard() once they're loaded from Supabase's card_types table.
import type { Card, CardTypeDef } from "./types";

export const BUILTIN_CARD_TYPES: Record<string, CardTypeDef> = {
  task: { key: "task", label: "Task", hue: 245, blurb: "A single thing to do" },
  project: { key: "project", label: "Project", hue: 305, blurb: "A goal with steps" },
  habit: { key: "habit", label: "Habit", hue: 152, blurb: "Something you repeat" },
  bill: { key: "bill", label: "Bill", hue: 72, blurb: "Money in or out" },
  note: { key: "note", label: "Note", hue: 22, blurb: "A thought to keep" },
};

export function typeMeta(
  type: string,
  customTypes: Record<string, CardTypeDef> = {},
): CardTypeDef {
  return BUILTIN_CARD_TYPES[type] ?? customTypes[type] ?? BUILTIN_CARD_TYPES.note;
}

// Column defaults per type — matches base{} in data.jsx's newCard(). Only
// the columns a given type actually reads are set; the rest stay null.
type NewCardFields = Partial<
  Pick<
    Card,
    | "checklist"
    | "notes"
    | "due"
    | "date"
    | "cadence"
    | "streak"
    | "days"
    | "amount"
    | "paid"
    | "recur"
    | "category"
    | "body"
  >
>;

export function newCardFields(type: string): NewCardFields {
  switch (type) {
    case "task":
      return { checklist: [], notes: "", due: "", date: null };
    case "project":
      return { checklist: [], notes: "", date: null };
    case "habit":
      return { cadence: "Daily", streak: 0, days: Array(28).fill(false) };
    case "bill":
      return { amount: 0, due: "", paid: false, recur: "Monthly", category: "", date: null };
    case "note":
      return { body: "", date: null };
    default:
      return { checklist: [], notes: "", date: null };
  }
}

export function defaultTitleFor(type: string, customTypes: Record<string, CardTypeDef> = {}) {
  const label = typeMeta(type, customTypes).label ?? "Card";
  return "Untitled " + label;
}
