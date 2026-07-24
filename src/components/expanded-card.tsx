"use client";

// Trimmed port of overlays.jsx's ExpandedCard + card.jsx's ExpandedBody.
// Covers title, cover picker, and the per-type body editor; type-switching
// and the recurrence/auto-fill Schedule section aren't ported yet.
import { useState } from "react";
import type { Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { CoverPicker } from "@/components/cover-picker";
import { SensitiveWarning } from "@/components/sensitive-warning";
import * as fx from "@/lib/fx";

function pct(checklist: Card["checklist"]) {
  if (!checklist || !checklist.length) return 0;
  return Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
}

function Checklist({ items, onChange }: { items: Card["checklist"]; onChange: (v: { text: string; done: boolean }[]) => void }) {
  const [text, setText] = useState("");
  const list = items || [];
  function toggle(i: number, srcEl: HTMLElement) {
    const next = list.map((it, idx) => (idx === i ? { ...it, done: !it.done } : it));
    const wasAll = list.length > 0 && list.every((x) => x.done);
    const isAll = next.length > 0 && next.every((x) => x.done);
    if (isAll && !wasAll) fx.burst(srcEl, { emoji: "✅", count: 20 });
    onChange(next);
  }
  function add() {
    const t = text.trim();
    if (!t) return;
    onChange([...list, { text: t, done: false }]);
    setText("");
  }
  function del(i: number) {
    onChange(list.filter((_, idx) => idx !== i));
  }
  return (
    <div className="check">
      {list.map((it, i) => (
        <div key={i} className={"check-row" + (it.done ? " checked" : "")}>
          <button className="box" onClick={(e) => toggle(i, e.currentTarget)} aria-label="toggle">
            {it.done ? <span className="tick" /> : null}
          </button>
          <span className="check-text">{it.text}</span>
          <button className="x" onClick={() => del(i)} aria-label="remove">×</button>
        </div>
      ))}
      <div className="check-add">
        <input
          value={text}
          placeholder="Add a step…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
        />
        <button onClick={add}>Add</button>
      </div>
    </div>
  );
}

function ExpandedBody({ card, onUpdate }: { card: Card; onUpdate: (patch: Partial<Card>) => void }) {
  if (card.type === "habit") {
    const days = card.days || [];
    const todayIdx = days.length - 1;
    function toggleDay(idx: number) {
      const next = days.slice();
      next[idx] = !next[idx];
      let s = 0;
      for (let i = next.length - 1; i >= 0; i--) { if (next[i]) s++; else break; }
      if (s > (card.streak || 0) && (s === 7 || s === 30 || s === 100)) fx.streak(s);
      onUpdate({ days: next, streak: s });
    }
    return (
      <div className="body">
        <div className="streak-big">
          <span className="mono streak-num">{card.streak || 0}</span>
          <span className="streak-cap">day streak</span>
        </div>
        <div className="month-grid">
          {days.map((on, i) => (
            <button key={i} className={"mday" + (on ? " mday-on" : "") + (i === todayIdx ? " mday-today" : "")} onClick={() => toggleDay(i)} />
          ))}
        </div>
        <button className="big-btn" onClick={() => toggleDay(todayIdx)}>
          {days[todayIdx] ? "Done today ✓" : "Mark today done"}
        </button>
        <label className="field">
          <span className="field-label">Cadence</span>
          <input className="inp" value={card.cadence || ""} onChange={(e) => onUpdate({ cadence: e.target.value })} />
        </label>
      </div>
    );
  }

  if (card.type === "bill") {
    return (
      <div className="body">
        <div className="amount-edit">
          <span className="cur mono">$</span>
          <input
            className="amount-inp mono"
            type="number"
            value={card.amount ?? 0}
            onChange={(e) => onUpdate({ amount: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <button className={"big-btn" + (card.paid ? " big-btn-on" : "")} onClick={(e) => { if (!card.paid) fx.coin(e.currentTarget); onUpdate({ paid: !card.paid }); }}>
          {card.paid ? "Paid ✓" : "Mark as paid"}
        </button>
        <div className="two">
          <label className="field"><span className="field-label">Due</span>
            <input className="inp" value={card.due || ""} onChange={(e) => onUpdate({ due: e.target.value })} />
          </label>
          <label className="field"><span className="field-label">Repeats</span>
            <input className="inp" value={card.recur || ""} onChange={(e) => onUpdate({ recur: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span className="field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={!!card.autopay} onChange={(e) => onUpdate({ autopay: e.target.checked })} />
            Autopay enabled
          </span>
        </label>
        <div className="two">
          <label className="field"><span className="field-label">Last 4 digits (optional)</span>
            <input className="inp" maxLength={4} inputMode="numeric" placeholder="e.g. 4321"
              value={card.last4 || ""} onChange={(e) => onUpdate({ last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </label>
          <label className="field"><span className="field-label">Payment website</span>
            <input className="inp" type="url" placeholder="e.g. chase.com" value={card.pay_url || ""} onChange={(e) => onUpdate({ pay_url: e.target.value })} />
          </label>
        </div>
        <label className="field"><span className="field-label">Category</span>
          <input className="inp" value={card.category || ""} onChange={(e) => onUpdate({ category: e.target.value })} />
        </label>
        <label className="field"><span className="field-label">Notes</span>
          <input className="inp" value={card.notes || ""} onChange={(e) => onUpdate({ notes: e.target.value })} />
        </label>
        <SensitiveWarning text={card.notes} />
        <label className="field"><span className="field-label">Calendar date</span>
          <input className="inp" type="date" value={card.date || ""} onChange={(e) => onUpdate({ date: e.target.value })} />
        </label>
      </div>
    );
  }

  if (card.type === "note") {
    return (
      <div className="body">
        <textarea className="inp area tall" value={card.body || ""} placeholder="Write anything…" onChange={(e) => onUpdate({ body: e.target.value })} />
        <SensitiveWarning text={card.body} />
        <label className="field"><span className="field-label">Calendar date</span>
          <input className="inp" type="date" value={card.date || ""} onChange={(e) => onUpdate({ date: e.target.value })} />
        </label>
      </div>
    );
  }

  const p = pct(card.checklist);
  return (
    <div className="body">
      <div className="body-row">
        <div className="bar"><div className="bar-fill" style={{ width: p + "%" }} /></div>
        <span className="mono tiny">{p}%</span>
      </div>
      <Checklist items={card.checklist} onChange={(v) => onUpdate({ checklist: v })} />
      {card.type === "task" ? (
        <label className="field"><span className="field-label">Due</span>
          <input className="inp" value={card.due || ""} placeholder="e.g. Today, Fri, Jun 30" onChange={(e) => onUpdate({ due: e.target.value })} />
        </label>
      ) : null}
      <label className="field"><span className="field-label">Notes</span>
        <textarea className="inp area" value={card.notes || ""} placeholder="Notes…" onChange={(e) => onUpdate({ notes: e.target.value })} />
      </label>
      <SensitiveWarning text={card.notes} />
      <label className="field"><span className="field-label">Calendar date</span>
        <input className="inp" type="date" value={card.date || ""} onChange={(e) => onUpdate({ date: e.target.value })} />
      </label>
    </div>
  );
}

export function ExpandedCard({
  card,
  onClose,
  onUpdate,
  onDelete,
  series,
  onSplitSeries,
  onStopRecurrence,
}: {
  card: Card;
  onClose: () => void;
  onUpdate: (patch: Partial<Card>) => void;
  onDelete: () => void;
  series?: { isRoot: boolean } | null;
  onSplitSeries?: () => void;
  onStopRecurrence?: () => void;
}) {
  const T = typeMeta(card.type);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="panel" style={{ "--hue": T.hue } as React.CSSProperties} onMouseDown={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span className="type-tag big"><span className="swatch" />{T.label}</span>
          <div className="panel-actions">
            <button className="icon-btn" onClick={onDelete}>{series && !series.isRoot ? "Skip" : "Delete"}</button>
            <button className="icon-btn round" onClick={onClose}>×</button>
          </div>
        </div>
        <input
          className="panel-title"
          value={card.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Untitled"
        />
        <CoverPicker card={card} onUpdate={onUpdate} />
        <ExpandedBody card={card} onUpdate={onUpdate} />
        {series ? (
          <div className="series-actions">
            {!series.isRoot ? (
              <button className="link-btn" onClick={onSplitSeries}>Change this and future occurrences…</button>
            ) : null}
            <button className="link-btn" onClick={onStopRecurrence}>Stop repeating after this</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
