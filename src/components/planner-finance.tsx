"use client";

// "Finance" — a lighter lens over the exact same bill data Bills owns,
// using the identical month-total/paid/unpaid math bills-view.tsx uses
// (expandRecurringBills over the current calendar month) so the two
// pages can never show a different number for the same thing.
//
// Simplified from the original brief: "Savings target" and "No-spend
// tracker" need a goal/streak concept that doesn't exist anywhere in
// the app yet — left out rather than faked. "Subscriptions" reuses
// recurring bill series (a monthly/weekly/etc. root) as the closest
// real match to what most people mean by a subscription.
import { useMemo } from "react";
import type { BoardSlot } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { todayISO, toISODate, money, shortISO } from "@/lib/date";
import { expandRecurringBills } from "@/lib/recurrence";
import { isDueSoon, overdueLabel } from "@/lib/bills";
import { allCards } from "@/lib/plannerData";

export function PlannerFinance({
  board,
  onGo,
}: {
  board: BoardSlot[];
  onGo: () => void;
}) {
  const allBills = useMemo(() => allCards(board).filter((c) => c.type === "bill"), [board]);

  const today = new Date();
  const vy = today.getFullYear();
  const vm = today.getMonth();
  const monthStart = toISODate(vy, vm, 1);
  const monthEnd = toISODate(vy, vm, new Date(vy, vm + 1, 0).getDate());
  const bills = useMemo(() => expandRecurringBills(allBills, monthStart, monthEnd), [allBills, monthStart, monthEnd]);

  const total = bills.reduce((a, c) => a + Number(c.amount || 0), 0);
  const unpaid = bills.filter((b) => !b.paid);
  const dueSum = unpaid.reduce((a, c) => a + Number(c.amount || 0), 0);
  const paidSum = total - dueSum;
  const pct = total > 0 ? Math.round((paidSum / total) * 100) : 0;

  const dueSoon = unpaid.filter((b) => isDueSoon(b) || overdueLabel(b)).sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const subscriptions = useMemo(
    () => allBills.filter((c) => !c.origin && c.recur_freq).sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)),
    [allBills],
  );

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    unpaid.forEach((b) => {
      const k = b.category || "Uncategorized";
      m.set(k, (m.get(k) || 0) + Number(b.amount || 0));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [unpaid]);

  return (
    <div className="planner-finance">
      <div className="planner-index-grid">
        <div className="planner-index-card">
          <span className="planner-index-card-label">This month</span>
          <span className="planner-index-card-num mono">{money(total)}</span>
          <span className="planner-index-card-sub">{bills.length} bill{bills.length === 1 ? "" : "s"}</span>
        </div>
        <div className="planner-index-card">
          <span className="planner-index-card-label">Paid vs unpaid</span>
          <span className="planner-index-card-num mono">{pct}%</span>
          <span className="planner-index-card-sub">{money(paidSum)} paid · {money(dueSum)} left</span>
        </div>
        <div className="planner-index-card">
          <span className="planner-index-card-label">Subscriptions</span>
          <span className="planner-index-card-num mono">{subscriptions.length}</span>
          <span className="planner-index-card-sub">recurring series</span>
        </div>
      </div>

      <div className="pl-agenda-day">
        <span className="section-label">Bills due soon</span>
        {dueSoon.length ? dueSoon.map((b) => (
          <div key={b.id} className="pl-agenda-row" style={{ cursor: "default" }}>
            <span className="mono tiny">{shortISO(b.date)}</span>
            <span>{b.title}</span>
            <span className="mono tiny" style={{ marginLeft: "auto" }}>{money(b.amount)}</span>
          </div>
        )) : <span className="planner-index-card-sub">Nothing due soon.</span>}
      </div>

      <div className="pl-agenda-day">
        <span className="section-label">Subscriptions</span>
        {subscriptions.length ? subscriptions.map((s) => {
          const T = typeMeta("bill");
          return (
            <div key={s.id} className="pl-agenda-row" style={{ "--hue": T.hue, cursor: "default" } as React.CSSProperties}>
              <span>{s.title}</span>
              <span className="mono tiny" style={{ marginLeft: "auto" }}>{money(s.amount)}/{s.recur_freq}</span>
            </div>
          );
        }) : <span className="planner-index-card-sub">No recurring bills yet.</span>}
      </div>

      {byCategory.length ? (
        <div className="pl-agenda-day">
          <span className="section-label">Spending by category</span>
          {byCategory.map(([cat, amt]) => (
            <div key={cat} className="pl-agenda-row" style={{ cursor: "default" }}>
              <span>{cat}</span>
              <span className="mono tiny" style={{ marginLeft: "auto" }}>{money(amt)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <button className="cover-add-btn" style={{ alignSelf: "flex-start" }} onClick={onGo}>Open full Bills dashboard →</button>
    </div>
  );
}
