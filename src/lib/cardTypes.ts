// Ported from data.jsx — the built-in type registry plus the "blank card"
// factory. Mirrors the prototype's window.CARD_TYPES pattern: CARD_TYPES
// starts as the 5 builtins and custom types get merged in at runtime (by
// useBoard, once loaded from Supabase's card_types table) via
// registerCardType(). Everything just reads typeMeta(type) — no need to
// thread a customTypes prop through every component.
import type { Card, CardTypeDef } from "./types";

export const BUILTIN_CARD_TYPES: Record<string, CardTypeDef> = {
  task: { key: "task", label: "Task", hue: 245, blurb: "A single thing to do" },
  project: { key: "project", label: "Project", hue: 305, blurb: "A goal with steps" },
  habit: { key: "habit", label: "Habit", hue: 152, blurb: "Something you repeat" },
  bill: { key: "bill", label: "Bill", hue: 72, blurb: "Money in or out" },
  note: { key: "note", label: "Note", hue: 22, blurb: "A thought to keep" },
};

export const CARD_TYPES: Record<string, CardTypeDef> = { ...BUILTIN_CARD_TYPES };

export function registerCardType(def: CardTypeDef) {
  CARD_TYPES[def.key] = def;
}

export function unregisterCardType(key: string) {
  delete CARD_TYPES[key];
}

export function typeMeta(type: string): CardTypeDef {
  return CARD_TYPES[type] ?? CARD_TYPES.note;
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
    | "last4"
    | "pay_url"
    | "autopay"
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
      return { amount: 0, due: "", paid: false, recur: "Monthly", category: "", date: null, last4: "", pay_url: "", autopay: false };
    case "note":
      return { body: "", date: null };
    default:
      return { checklist: [], notes: "", date: null };
  }
}

export function defaultTitleFor(type: string) {
  return "Untitled " + (typeMeta(type).label || "Card");
}
