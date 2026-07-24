// Mirrors the Data Model section of the prototype's README, adapted to
// normalized Supabase rows (see supabase/schema.sql) instead of one
// localStorage blob. snake_case matches the Postgres column names exactly
// so rows can be used straight off the wire without a mapping layer.

export type Cover =
  | { kind: "emoji"; val: string; list?: string[] }
  | { kind: "image"; val: string };

export type ChecklistItem = { text: string; done: boolean };

export type BuiltinType = "task" | "project" | "habit" | "bill" | "note";

export interface Card {
  id: string;
  user_id: string;
  slot_id: string;
  type: BuiltinType | string;
  title: string;
  date: string | null;
  origin: string | null;
  cover: Cover | null;
  card_order: number | null;
  position_in_slot: number;

  checklist: ChecklistItem[] | null;
  notes: string | null;
  due: string | null;
  cadence: string | null;
  streak: number | null;
  days: boolean[] | null;
  amount: number | null;
  balance: number | null;
  paid: boolean | null;
  recur: string | null;
  category: string | null;
  body: string | null;
  // Structured, lower-risk bill fields — last4/pay_url/autopay exist so
  // users don't need to put payment-card/account details in free text.
  last4: string | null;
  pay_url: string | null;
  autopay: boolean | null;

  created_at: string;
  updated_at: string;
}

export interface Slot {
  id: string;
  user_id: string;
  name: string;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

// Client-side shape: a slot with its cards attached, matching the
// prototype's Slot = { id, name, cards: Card[] } exactly.
export interface BoardSlot extends Slot {
  cards: Card[];
}

export interface CardTypeDef {
  key: string;
  label: string;
  hue: number;
  blurb: string;
  custom?: boolean;
}

export interface Profile {
  id: string;
  name: string;
  avatar: Cover | null;
  accent: number | null;
  tweaks: import("./theme").Tweaks;
  preset_id: string | null;
  bills_layout: string;
  onboarded: boolean;
}
