"use client";

// Ported from bills.jsx — dedicated Bills (finance) view with switchable
// layouts (List/Calendar/Cards/Category), sort controls, a payoff
// tracker, a 6-month spend trend, due-soon highlighting, and bulk
// select/mark/delete.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { parseISO, money } from "@/lib/date";
import { SquareCard } from "@/components/square-card";
import * as fx from "@/lib/fx";

const BMON = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const BMON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BWD = ["S", "M", "T", "W", "T", "F", "S"];

type SortKey = "date" | "amount" | "amount-asc" | "name" | "name-desc" | "category";

function formatDue(b: Card) {
  const p = parseISO(b.date);
  if (p) return BMON3[p.m] + " " + p.d;
  return b.due || "—";
}

function remainingDue(b: Card) {
  const bal = Number(b.balance || 0);
  if (bal <= 0) return b.paid ? 0 : Number(b.amount || 0);
  return b.paid ? Math.max(0, bal - Number(b.amount || 0)) : bal;
}

function isDueSoon(b: Card) {
  if (b.paid) return false;
  const p = parseISO(b.date);
  if (!p) return false;
  const d = new Date(p.y, p.m, p.d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  return diff >= 0 && diff <= 3;
}

function cmpBy(key: SortKey): (a: Card, b: Card) => number {
  if (key === "amount") return (a, b) => Number(b.amount || 0) - Number(a.amount || 0);
  if (key === "amount-asc") return (a, b) => Number(a.amount || 0) - Number(b.amount || 0);
  if (key === "name") return (a, b) => (a.title || "").localeCompare(b.title || "");
  if (key === "name-desc") return (a, b) => (b.title || "").localeCompare(a.title || "");
  if (key === "category") return (a, b) => (a.category || "~").localeCompare(b.category || "~");
  return (a, b) => (a.date || "~").localeCompare(b.date || "~");
}

function sortBills(bills: Card[], sortBy: SortKey, subSort?: SortKey) {
  const s = [...bills];
  if (sortBy === "category") {
    const catCmp = cmpBy("category");
    const subCmp = cmpBy(subSort || "date");
    s.sort((a, b) => catCmp(a, b) || subCmp(a, b));
  } else s.sort(cmpBy(sortBy));
  return s;
}

function groupKeyFor(b: Card, sortBy: SortKey): string | null {
  if (sortBy === "category") return b.category || "Uncategorized";
  if (sortBy === "date") {
    const p = parseISO(b.date);
    return p ? BMON[p.m] + " " + p.y : "No date";
  }
  return null;
}

function BillsRow({
  b, onUpdate, onOpen, hideCat, selected, onToggleSelect,
}: {
  b: Card; onUpdate: (id: string, patch: Partial<Card>) => void; onOpen: (b: Card) => void;
  hideCat?: boolean; selected?: boolean; onToggleSelect?: (id: string) => void;
}) {
  const remaining = remainingDue(b);
  const soon = isDueSoon(b);
  return (
    <div className={"brow" + (soon ? " brow-soon" : "")} style={{ "--hue": typeMeta("bill").hue } as React.CSSProperties}>
      <button
        className={"paydot" + (b.paid ? " on" : "")}
        title={b.paid ? "Paid" : "Mark paid"}
        onClick={(e) => { if (!b.paid) fx.coin(e.currentTarget); onUpdate(b.id, { paid: !b.paid }); }}
      />
      <span className="brow-name" onClick={() => onOpen(b)}>
        {b.cover?.kind === "emoji" ? <span className="brow-emoji">{b.cover.val}</span> : null}
        {b.title}
        {soon ? <span className="brow-soon-badge">Due soon</span> : null}
      </span>
      {hideCat ? <span /> : <span className="brow-cat">{b.category || "—"}</span>}
      <span className="brow-note">{b.notes || "—"}</span>
      <span className="brow-due mono">{formatDue(b)}</span>
      <span className="brow-amt-due mono">{remaining > 0 ? money(remaining) : "—"}</span>
      <span className="brow-amt-paid mono">{b.paid ? money(b.amount) : "—"}</span>
      {onToggleSelect ? (
        <input type="checkbox" className="brow-check" checked={!!selected} onChange={() => onToggleSelect(b.id)} title="Select for bulk actions" />
      ) : <span />}
    </div>
  );
}

function BillsList({
  bills, sortBy, subSort, onUpdate, onOpen, selected, onToggleSelect,
}: {
  bills: Card[]; sortBy: SortKey; subSort: SortKey; onUpdate: (id: string, patch: Partial<Card>) => void;
  onOpen: (b: Card) => void; selected: Set<string>; onToggleSelect: (id: string) => void;
}) {
  const sorted = sortBills(bills, sortBy, subSort);
  const groupSums: Record<string, number> = {};
  if (sortBy === "category") {
    sorted.forEach((b) => {
      if (b.paid) return;
      const k = groupKeyFor(b, sortBy) as string;
      groupSums[k] = (groupSums[k] || 0) + Number(b.amount || 0);
    });
  }
  let lastKey: string | null = null;
  return (
    <div className="blist">
      <div className="brow brow-h"><span /><span>Bill</span><span>Category</span><span>Notes</span><span>Due Date</span><span>Amount Due</span><span>Amount Paid</span><span /></div>
      {sorted.map((b) => {
        const key = groupKeyFor(b, sortBy);
        const isNew = key !== null && key !== lastKey;
        lastKey = key;
        return (
          <div key={b.id}>
            {isNew ? (
              <div className="blist-break">
                <span>{key}</span>
                {sortBy === "category" ? <span className="blist-break-sum mono">{money(groupSums[key as string])}</span> : null}
              </div>
            ) : null}
            <BillsRow b={b} onUpdate={onUpdate} onOpen={onOpen} selected={selected.has(b.id)} onToggleSelect={onToggleSelect} />
          </div>
        );
      })}
    </div>
  );
}

function BillsCards({ bills, sortBy, subSort, onOpen }: { bills: Card[]; sortBy: SortKey; subSort: SortKey; onOpen: (b: Card) => void }) {
  const sorted = sortBills(bills, sortBy, subSort);
  return (
    <div className="bcards">
      {sorted.map((b) => (
        <div className="bcard-wrap" key={b.id}>
          <SquareCard card={b} onOpen={() => onOpen(b)} />
        </div>
      ))}
    </div>
  );
}

function BillsCategory({
  bills, sortBy, subSort, onUpdate, onOpen, selected, onToggleSelect,
}: {
  bills: Card[]; sortBy: SortKey; subSort: SortKey; onUpdate: (id: string, patch: Partial<Card>) => void;
  onOpen: (b: Card) => void; selected: Set<string>; onToggleSelect: (id: string) => void;
}) {
  const groups: Record<string, Card[]> = {};
  bills.forEach((b) => { const k = b.category || "Uncategorized"; (groups[k] = groups[k] || []).push(b); });
  const keys = Object.keys(groups).sort();
  const within = sortBy === "category" ? (subSort || "date") : sortBy;
  return (
    <div className="bcat">
      {keys.map((k) => {
        const items = sortBills(groups[k], within);
        const sum = items.reduce((a, c) => a + (c.paid ? 0 : Number(c.amount || 0)), 0);
        return (
          <div className="bcat-group" key={k}>
            <div className="bcat-head"><span className="bcat-name">{k}</span><span className="bcat-sum mono">{money(sum)}</span></div>
            <div className="brow brow-h"><span /><span>Bill</span><span /><span>Notes</span><span>Due Date</span><span>Amount Due</span><span>Amount Paid</span><span /></div>
            {items.map((b) => (
              <BillsRow key={b.id} b={b} onUpdate={onUpdate} onOpen={onOpen} hideCat selected={selected.has(b.id)} onToggleSelect={onToggleSelect} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function BillsBalance({ total, paidSum, dueSum, paidCount, count }: { total: number; paidSum: number; dueSum: number; paidCount: number; count: number }) {
  const pct = total > 0 ? Math.round((paidSum / total) * 100) : 0;
  const cleared = dueSum <= 0 && count > 0;
  return (
    <div className={"bpayoff" + (cleared ? " done" : "")}>
      <div className="bpayoff-top">
        <div className="bpayoff-lead">
          <span className="bpayoff-cap">{cleared ? "All caught up" : "Left to pay"}</span>
          <span className="bpayoff-num mono">{money(dueSum)}</span>
        </div>
        <div className="bpayoff-meta">
          <span className="bpayoff-pct mono">{pct}%</span>
          <span className="bpayoff-count">{paidCount} of {count} paid · {money(paidSum)} cleared</span>
        </div>
      </div>
      <div className="bpayoff-track"><span style={{ width: pct + "%" }} /></div>
    </div>
  );
}

function BillsCalendar({ vy, vm, bills, onUpdate, onOpen }: { vy: number; vm: number; bills: Card[]; onUpdate: (id: string, patch: Partial<Card>) => void; onOpen: (b: Card) => void }) {
  const byDay: Record<number, Card[]> = {};
  bills.forEach((b) => {
    const p = parseISO(b.date);
    if (p && p.y === vy && p.m === vm) (byDay[p.d] = byDay[p.d] || []).push(b);
  });
  const firstWd = new Date(vy, vm, 1).getDay();
  const daysIn = new Date(vy, vm + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === vy && today.getMonth() === vm && today.getDate() === d;

  return (
    <div className="bcal">
      <div className="bcal-grid bcal-wds">
        {BWD.map((w, i) => <div key={i} className="bcal-wd">{w}</div>)}
      </div>
      <div className="bcal-grid">
        {cells.map((d, i) => {
          const items = d != null ? (byDay[d] || []) : [];
          return (
            <div key={i} className={"bcal-cell" + (d == null ? " empty" : "") + (d && isToday(d) ? " today" : "")}>
              {d != null ? <span className="bcal-date mono">{d}</span> : null}
              {items.map((b) => (
                <div key={b.id} className={"bcal-bill" + (b.paid ? " paid" : "")} style={{ "--hue": typeMeta("bill").hue } as React.CSSProperties} title={b.title + " · " + money(b.amount)}>
                  <button className={"bcal-dot" + (b.paid ? " on" : "")} title={b.paid ? "Paid" : "Mark paid"} onClick={(e) => { if (!b.paid) fx.coin(e.currentTarget); onUpdate(b.id, { paid: !b.paid }); }} />
                  <span className="bcal-bill-name" onClick={() => onOpen(b)}>{b.title}</span>
                  <span className="bcal-bill-amt mono">{money(b.amount)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BillsTrend({ allBills, vy, vm }: { allBills: Card[]; vy: number; vm: number }) {
  const months: { y: number; m: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    let y = vy, m = vm - i;
    while (m < 0) { m += 12; y -= 1; }
    months.push({ y, m });
  }
  const totals = months.map(({ y, m }) => allBills.reduce((a, b) => {
    const p = parseISO(b.date);
    return p && p.y === y && p.m === m ? a + Number(b.amount || 0) : a;
  }, 0));
  const max = Math.max(1, ...totals);
  return (
    <div className="btrend">
      {months.map(({ y, m }, i) => (
        <div key={i} className={"btrend-col" + (y === vy && m === vm ? " on" : "")}>
          <span className="btrend-amt mono">{totals[i] > 0 ? money(totals[i]) : ""}</span>
          <div className="btrend-bar" style={{ height: Math.max(4, Math.round((totals[i] / max) * 64)) + "px" }} />
          <span className="btrend-label">{BMON3[m]}</span>
        </div>
      ))}
    </div>
  );
}

export function BillsView({
  board, onUpdate, onOpen, onAddBill, onExtend, onBulkDelete, onBulkMark,
}: {
  board: { cards: Card[] }[];
  onUpdate: (id: string, patch: Partial<Card>) => void;
  onOpen: (b: Card) => void;
  onAddBill: () => void;
  onExtend: (cards: Card[], targetY: number, targetM: number) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkMark: (ids: string[], paid: boolean) => void;
}) {
  const now = new Date();
  const [vy, setVy] = useState(now.getFullYear());
  const [vm, setVm] = useState(now.getMonth());
  const [layout, setLayout] = useState<"List" | "Calendar" | "Cards" | "Category">("List");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [subSort, setSubSort] = useState<SortKey>("date");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const autoTried = useRef<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function prevMonth() { if (vm === 0) { setVm(11); setVy(vy - 1); } else setVm(vm - 1); }
  function nextMonth() { if (vm === 11) { setVm(0); setVy(vy + 1); } else setVm(vm + 1); }

  const allBills = useMemo(() => {
    const out: Card[] = [];
    board.forEach((s) => s.cards.forEach((c) => { if (c.type === "bill") out.push(c); }));
    return out;
  }, [board]);

  const bills = useMemo(() => allBills.filter((b) => {
    const p = parseISO(b.date);
    return !p || (p.y === vy && p.m === vm);
  }), [allBills, vy, vm]);

  const recurring = useMemo(() => bills.filter((b) => {
    const p = parseISO(b.date);
    return !!p && p.y === vy && p.m === vm && (b.recur || "Monthly") !== "None";
  }), [bills, vy, vm]);

  const total = bills.reduce((a, c) => a + Number(c.amount || 0), 0);
  const unpaid = bills.filter((b) => !b.paid);
  const dueSum = unpaid.reduce((a, c) => a + Number(c.amount || 0), 0);
  const paidSum = total - dueSum;
  const paidCount = bills.length - unpaid.length;

  useEffect(() => {
    const key = vy + "-" + vm;
    if (bills.length === 0 && !autoTried.current.has(key)) {
      autoTried.current.add(key);
      let py = vy, pm = vm - 1;
      if (pm < 0) { pm = 11; py -= 1; }
      const prevRecurring = allBills.filter((b) => {
        const p = parseISO(b.date);
        return !!p && p.y === py && p.m === pm && (b.recur || "Monthly") !== "None";
      });
      if (prevRecurring.length) onExtend(prevRecurring, vy, vm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vy, vm, bills.length, allBills]);

  useEffect(() => { setSelected(new Set()); }, [vy, vm, layout]);

  function extend(dir: number) {
    let ty = vy, tm = vm + dir;
    if (tm < 0) { tm = 11; ty -= 1; } else if (tm > 11) { tm = 0; ty += 1; }
    onExtend(recurring, ty, tm);
    setVy(ty); setVm(tm);
  }

  return (
    <div className="bills">
      <div className="bills-head">
        <div>
          <h2 className="bills-title">Bills</h2>
          <span className="bills-sub">{bills.length} {bills.length === 1 ? "bill" : "bills"} · {money(total)} this month</span>
        </div>
        <div className="bills-actions">
          <div className="bills-layout">
            {(["List", "Calendar", "Cards", "Category"] as const).map((l) => (
              <button key={l} className={"bl" + (layout === l ? " on" : "")} onClick={() => setLayout(l)}>{l}</button>
            ))}
          </div>
          <button className="add-btn" onClick={onAddBill}>+ Add bill</button>
        </div>
      </div>

      <div className="bmonth">
        <button className="bmonth-nav" onClick={prevMonth} title="Previous month">‹</button>
        <span className="bmonth-label">{BMON[vm]} <span className="mono">{vy}</span></span>
        <button className="bmonth-nav" onClick={nextMonth} title="Next month">›</button>
        <div className="bmonth-ext">
          {layout !== "Calendar" ? (
            <select className="bsort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} title="Sort bills">
              <option value="date">Sort: Due date</option>
              <option value="amount">Sort: Amount (high→low)</option>
              <option value="amount-asc">Sort: Amount (low→high)</option>
              <option value="name">Sort: A→Z</option>
              <option value="name-desc">Sort: Z→A</option>
              <option value="category">Sort: Category</option>
            </select>
          ) : null}
          {layout !== "Calendar" && sortBy === "category" ? (
            <select className="bsort" value={subSort} onChange={(e) => setSubSort(e.target.value as SortKey)} title="Sort within each category">
              <option value="date">Then by: Due date</option>
              <option value="amount">Then by: Amount (high→low)</option>
              <option value="amount-asc">Then by: Amount (low→high)</option>
              <option value="name">Then by: A→Z</option>
            </select>
          ) : null}
          <button className="bext" onClick={() => extend(-1)} disabled={!recurring.length} title="Copy this month's recurring bills into the previous month">← Extend back</button>
          <button className="bext" onClick={() => extend(1)} disabled={!recurring.length} title="Copy this month's recurring bills into the next month">Extend forward →</button>
        </div>
      </div>

      <BillsTrend allBills={allBills} vy={vy} vm={vm} />

      <div className="bills-stats">
        <div className="bstat"><span className="bstat-num mono">{money(dueSum)}</span><span className="bstat-cap">Unpaid · {unpaid.length}</span></div>
        <div className="bstat"><span className="bstat-num mono">{money(paidSum)}</span><span className="bstat-cap">Paid</span></div>
        <div className="bstat"><span className="bstat-num mono">{money(total)}</span><span className="bstat-cap">Month total</span></div>
      </div>
      {bills.length > 0 ? <BillsBalance total={total} paidSum={paidSum} dueSum={dueSum} paidCount={paidCount} count={bills.length} /> : null}
      {selected.size > 0 ? (
        <div className="bbulk">
          <span className="bbulk-count">{selected.size} selected</span>
          <button className="bbulk-btn" onClick={() => { onBulkMark(Array.from(selected), true); setSelected(new Set()); }}>Mark paid</button>
          <button className="bbulk-btn" onClick={() => { onBulkMark(Array.from(selected), false); setSelected(new Set()); }}>Mark unpaid</button>
          <button className="bbulk-btn bbulk-danger" onClick={() => { onBulkDelete(Array.from(selected)); setSelected(new Set()); }}>Delete</button>
          <button className="bbulk-clear" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      ) : null}
      {bills.length === 0 ? (
        <div className="bills-empty">No bills in {BMON[vm]} {vy}. Use the arrows to change month, "Extend" to roll bills over, or "+ Add bill".</div>
      ) : layout === "Calendar" ? (
        <BillsCalendar vy={vy} vm={vm} bills={bills} onUpdate={onUpdate} onOpen={onOpen} />
      ) : layout === "Cards" ? (
        <BillsCards bills={bills} sortBy={sortBy} subSort={subSort} onOpen={onOpen} />
      ) : layout === "Category" ? (
        <BillsCategory bills={bills} sortBy={sortBy} subSort={subSort} onUpdate={onUpdate} onOpen={onOpen} selected={selected} onToggleSelect={toggleSelect} />
      ) : (
        <BillsList bills={bills} sortBy={sortBy} subSort={subSort} onUpdate={onUpdate} onOpen={onOpen} selected={selected} onToggleSelect={toggleSelect} />
      )}
    </div>
  );
}
