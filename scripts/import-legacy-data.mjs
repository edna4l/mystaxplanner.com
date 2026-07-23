#!/usr/bin/env node
// One-time migration: reads a stax-data-export.json (the old prototype's
// localStorage dump — stax_board_v4/stax_types_v1/stax_profile_v1/
// stax_bills_layout) and seeds it into this project's Supabase tables
// under whichever account you log into below. Run once per account.
//
// Usage:
//   node --env-file=.env.local scripts/import-legacy-data.mjs ~/Downloads/stax-data-export.json
//
// You'll be prompted for the email/password of the Stax account you want
// this data to land in — the script signs in as that user so Row Level
// Security naturally scopes every insert to their account.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  console.error("Run with: node --env-file=.env.local scripts/import-legacy-data.mjs <path>");
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node --env-file=.env.local scripts/import-legacy-data.mjs <path-to-stax-data-export.json>");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(filePath, "utf8"));
const board = raw.stax_board_v4 || [];
const customTypes = raw.stax_types_v1 || [];
const profile = raw.stax_profile_v1 || null;
const billsLayout = raw.stax_bills_layout || null;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function mapCardFields(c) {
  return {
    type: c.type,
    title: c.title || "Untitled",
    date: c.date ? c.date : null,
    cover: c.cover ?? null,
    card_order: typeof c.order === "number" ? c.order : null,
    checklist: c.checklist ?? null,
    notes: c.notes ?? null,
    due: c.due ?? null,
    cadence: c.cadence ?? null,
    streak: c.streak ?? null,
    days: c.days ?? null,
    amount: c.amount ?? null,
    balance: c.balance ?? null,
    paid: c.paid ?? null,
    recur: c.recur ?? null,
    category: c.category ?? null,
    body: c.body ?? null,
  };
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const email = await rl.question("Email for the Stax account to import into: ");
  const password = await rl.question("Password: ");
  rl.close();

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr || !authData.user) {
    console.error("Login failed:", authErr?.message);
    process.exit(1);
  }
  const userId = authData.user.id;
  console.log(`Signed in as ${email} (${userId}).`);

  // --- profile + bills layout ---
  if (profile || billsLayout) {
    const patch = {};
    if (profile?.name) patch.name = profile.name;
    if (profile?.avatar) patch.avatar = profile.avatar;
    if (profile?.accent != null) patch.accent = profile.accent;
    if (billsLayout) patch.bills_layout = billsLayout;
    patch.onboarded = true;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) console.error("Profile update failed:", error.message);
    else console.log("Profile updated.");
  }

  // --- custom card types ---
  if (customTypes.length) {
    const rows = customTypes.map((t) => ({
      user_id: userId, key: t.key, label: t.label, hue: t.hue, blurb: t.blurb || "Custom",
    }));
    const { error } = await supabase.from("card_types").upsert(rows, { onConflict: "user_id,key" });
    if (error) console.error("Custom types insert failed:", error.message);
    else console.log(`Inserted ${rows.length} custom type(s).`);
  }

  // --- slots ---
  const slotRows = board.map((s) => ({ user_id: userId, name: s.name || "" }));
  const insertedSlots = [];
  for (const c of chunk(slotRows, 200)) {
    const { data, error } = await supabase.from("slots").insert(c).select("id");
    if (error) { console.error("Slot insert failed:", error.message); process.exit(1); }
    insertedSlots.push(...data);
  }
  console.log(`Inserted ${insertedSlots.length} slots.`);

  // --- cards (pass 1: insert without origin, track old id -> new id) ---
  const flatCards = [];
  board.forEach((s, slotIdx) => {
    s.cards.forEach((c, posIdx) => {
      flatCards.push({ oldId: c.id, originOldId: c.origin || null, slotId: insertedSlots[slotIdx].id, posIdx, fields: mapCardFields(c) });
    });
  });

  const idMap = new Map();
  for (const group of chunk(flatCards, 200)) {
    const rows = group.map((f) => ({ user_id: userId, slot_id: f.slotId, position_in_slot: f.posIdx, ...f.fields }));
    const { data, error } = await supabase.from("cards").insert(rows).select("id");
    if (error) { console.error("Card insert failed:", error.message); process.exit(1); }
    data.forEach((row, i) => idMap.set(group[i].oldId, row.id));
  }
  console.log(`Inserted ${idMap.size} cards.`);

  // --- cards (pass 2: backfill origin now that all new ids are known) ---
  const withOrigin = flatCards.filter((f) => f.originOldId && idMap.has(f.originOldId));
  let updated = 0;
  for (const group of chunk(withOrigin, 20)) {
    await Promise.all(group.map(async (f) => {
      const newId = idMap.get(f.oldId);
      const newOrigin = idMap.get(f.originOldId);
      const { error } = await supabase.from("cards").update({ origin: newOrigin }).eq("id", newId);
      if (error) console.error(`Origin backfill failed for ${f.oldId}:`, error.message);
      else updated++;
    }));
  }
  console.log(`Backfilled origin on ${updated} cards.`);

  console.log("Done.");
}

main();
