// Ported from home.jsx's parseQuickAdd — freeform text -> best-guess type,
// date, amount, due label, and cadence. Custom types match against the
// live CARD_TYPES registry same as the prototype did with window.CARD_TYPES.
import { CARD_TYPES } from "@/lib/cardTypes";
import { isoOf, todayISO } from "@/lib/date";

const WD3 = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WDFULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON3 = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONFULL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortISOq(iso: string) {
  const p = iso.split("-").map(Number);
  if (p.length !== 3) return iso;
  return MONFULL[(p[1] - 1) % 12] + " " + p[2];
}

function isoFromMonthDay(monIdx: number, day: number) {
  const now = new Date();
  const y = now.getFullYear();
  let cand = new Date(y, monIdx, day);
  const t0 = new Date(todayISO(0));
  if (cand < t0) cand = new Date(y + 1, monIdx, day);
  return isoOf(cand);
}
function nextWeekday(wd: number) {
  const now = new Date();
  const cur = now.getDay();
  const off = (wd - cur + 7) % 7;
  const d = new Date();
  d.setDate(d.getDate() + off);
  return { iso: isoOf(d), label: off === 0 ? "Today" : WDFULL[wd] };
}

export interface ParsedQuickAdd {
  typeKey: string;
  title: string;
  date: string;
  dueLabel: string;
  amount: number | null;
  cadence: string;
}

export function parseQuickAdd(raw: string): ParsedQuickAdd | null {
  const text = (raw || "").trim();
  if (!text) return null;
  let work = " " + text + " ";
  const res = { typeKey: null as string | null, date: "", dueLabel: "", amount: null as number | null, cadence: "" };

  const pfx = text.match(/^(task|project|habit|bill|note)\s*[:\-]\s*/i);
  if (pfx) { res.typeKey = pfx[1].toLowerCase(); work = work.replace(new RegExp("\\s" + pfx[1] + "\\s*[:\\-]\\s*", "i"), " "); }

  if (!res.typeKey) {
    for (const k in CARD_TYPES) {
      const T = CARD_TYPES[k];
      if (T.custom && T.label) {
        const re = new RegExp("\\b" + T.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
        if (re.test(work)) { res.typeKey = k; work = work.replace(re, " "); break; }
      }
    }
  }

  let m;
  const am = work.match(/\$\s?(\d+(?:[.,]\d{1,2})?)/);
  if (am) { res.amount = parseFloat(am[1].replace(/,/g, "")); work = work.replace(am[0], " "); }

  if ((m = work.match(/\b(\d{4}-\d{2}-\d{2})\b/))) { res.date = m[1]; res.dueLabel = shortISOq(m[1]); work = work.replace(m[0], " "); }
  if (!res.date && (m = work.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i))) {
    const mi = MON3.indexOf(m[1].slice(0, 3).toLowerCase());
    if (mi >= 0) { res.date = isoFromMonthDay(mi, parseInt(m[2], 10)); res.dueLabel = MONFULL[mi] + " " + parseInt(m[2], 10); work = work.replace(m[0], " "); }
  }
  if (!res.date && (m = work.match(/\b(\d{1,2})\/(\d{1,2})\b/))) { res.date = isoFromMonthDay(parseInt(m[1], 10) - 1, parseInt(m[2], 10)); res.dueLabel = shortISOq(res.date); work = work.replace(m[0], " "); }
  if (!res.date && /\btoday\b/i.test(work)) { res.date = todayISO(0); res.dueLabel = "Today"; work = work.replace(/\btoday\b/i, " "); }
  if (!res.date && /\btomorrow\b/i.test(work)) { res.date = todayISO(1); res.dueLabel = "Tomorrow"; work = work.replace(/\btomorrow\b/i, " "); }
  if (!res.date && (m = work.match(/\b(mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)[a-z]*\b/i))) {
    const wd = WD3.indexOf(m[1].slice(0, 3).toLowerCase());
    if (wd >= 0) { const nx = nextWeekday(wd); res.date = nx.iso; res.dueLabel = nx.label; work = work.replace(m[0], " "); }
  }

  if (/\b(every\s*day|daily)\b/i.test(work)) { res.cadence = "Daily"; if (!res.typeKey) res.typeKey = "habit"; work = work.replace(/\b(every\s*day|daily)\b/i, " "); }
  else if (/\bweekdays?\b/i.test(work)) { res.cadence = "Weekdays"; if (!res.typeKey) res.typeKey = "habit"; work = work.replace(/\bweekdays?\b/i, " "); }
  else if (/\bweekly\b/i.test(work)) { res.cadence = "Weekly"; if (!res.typeKey) res.typeKey = "habit"; work = work.replace(/\bweekly\b/i, " "); }

  if (!res.typeKey) res.typeKey = res.amount != null ? "bill" : "task";

  let title = work.replace(/\s+/g, " ").trim();
  title = title.replace(/\b(on|due|at|by|for)\s*$/i, "").replace(/^\s*(on|due|at|by|for)\b/i, "").trim();
  if (!title) title = "Untitled";
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return { typeKey: res.typeKey, title, date: res.date, dueLabel: res.dueLabel, amount: res.amount, cadence: res.cadence };
}
