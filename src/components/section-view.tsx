"use client";

// Ported from sections.jsx — dedicated, organized screens for each card
// type: Task (grouped by urgency), Project (progress cards), Habit
// (streak rows), Note (masonry grid, drag-reorder), and a generic card
// grid fallback for any other type. Custom-type edit/delete controls
// aren't wired up yet since custom types themselves aren't ported.
import { useState } from "react";
import type { Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { todayISO, shortISO } from "@/lib/date";
import { SquareCard } from "@/components/square-card";

function byOrder(cards: Card[]) {
  return [...cards].sort((a, b) => (a.card_order == null ? 9999 : a.card_order) - (b.card_order == null ? 9999 : b.card_order));
}

function useReorder(onReorder?: (ids: string[]) => void) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  function itemProps(id: string, ids: string[]): React.HTMLAttributes<HTMLElement> {
    return {
      draggable: true,
      onDragStart: () => setDragId(id),
      onDragEnd: () => { setDragId(null); setOverId(null); },
      onDragOver: (e) => { if (dragId && dragId !== id) { e.preventDefault(); setOverId(id); } },
      onDrop: (e) => {
        if (dragId && onReorder) {
          e.preventDefault();
          const origIdx = ids.indexOf(dragId);
          const targetIdx = ids.indexOf(id);
          const rest = ids.filter((x) => x !== dragId);
          let at = rest.indexOf(id);
          if (at < 0) at = rest.length;
          else if (origIdx < targetIdx) at += 1;
          rest.splice(at, 0, dragId);
          onReorder(rest);
        }
        setDragId(null);
        setOverId(null);
      },
    };
  }
  return { dragId, overId, itemProps };
}

function pct(cl: Card["checklist"]) {
  if (!cl || !cl.length) return 0;
  return Math.round((cl.filter((c) => c.done).length / cl.length) * 100);
}

function SectionShell({
  hue, title, sub, onAdd, addLabel, children,
}: { hue: number; title: string; sub: string; onAdd: () => void; addLabel: string; children: React.ReactNode }) {
  return (
    <div className="section" style={{ "--hue": hue } as React.CSSProperties}>
      <div className="section-head">
        <div className="section-head-l">
          <span className="section-dot" />
          <div>
            <h2 className="section-title">{title}</h2>
            <span className="section-sub">{sub}</span>
          </div>
        </div>
        <div className="section-actions">
          <button className="add-btn" onClick={onAdd}>{addLabel}</button>
        </div>
      </div>
      {children}
    </div>
  );
}

function TaskBody({ cards, onOpen }: { cards: Card[]; onOpen: (c: Card) => void }) {
  const t = todayISO();
  const groups: Record<string, Card[]> = { Overdue: [], Today: [], "This week": [], Later: [], "No date": [], Done: [] };
  cards.forEach((c) => {
    const done = !!(c.checklist && c.checklist.length && c.checklist.every((x) => x.done));
    if (done) return void groups.Done.push(c);
    if (!c.date) return void groups[c.due ? "This week" : "No date"].push(c);
    if (c.date < t) return void groups.Overdue.push(c);
    if (c.date === t) return void groups.Today.push(c);
    const diff = (new Date(c.date).getTime() - new Date(t).getTime()) / 86400000;
    if (diff <= 7) return void groups["This week"].push(c);
    groups.Later.push(c);
  });
  const order = ["Overdue", "Today", "This week", "Later", "No date", "Done"];
  return (
    <div className="sec-groups">
      {order.filter((k) => groups[k].length).map((k) => (
        <div className="sec-group" key={k}>
          <div className="sec-group-head"><span>{k}</span><span className="mono">{groups[k].length}</span></div>
          <div className="sec-rows">
            {groups[k].map((c) => {
              const p = pct(c.checklist);
              return (
                <button className="sec-row" key={c.id} onClick={() => onOpen(c)}>
                  <span className="sec-row-name">{c.cover?.kind === "emoji" ? <span className="row-emoji">{c.cover.val}</span> : null}{c.title}</span>
                  {c.checklist && c.checklist.length ? (
                    <span className="sec-row-prog"><span className="mini-bar"><span style={{ width: p + "%" }} /></span><span className="mono tiny">{p}%</span></span>
                  ) : <span />}
                  <span className="sec-row-meta mono">{c.date ? shortISO(c.date) : (c.due || "—")}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectBody({ cards, onOpen }: { cards: Card[]; onOpen: (c: Card) => void }) {
  const sorted = [...cards].sort((a, b) => pct(b.checklist) - pct(a.checklist));
  return (
    <div className="proj-list">
      {sorted.map((c) => {
        const p = pct(c.checklist);
        const left = (c.checklist || []).filter((x) => !x.done).length;
        return (
          <button className="proj-card" key={c.id} onClick={() => onOpen(c)}>
            <div className="proj-top"><span className="proj-name">{c.cover?.kind === "emoji" ? <span className="row-emoji">{c.cover.val}</span> : null}{c.title}</span><span className="proj-pct mono">{p}%</span></div>
            <span className="proj-bar"><span style={{ width: p + "%" }} /></span>
            <span className="proj-meta">{left ? left + " steps left" : (c.checklist || []).length ? "All done" : "No steps yet"}{c.date ? " · " + shortISO(c.date) : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

function HabitBody({ cards, onUpdate, onOpen }: { cards: Card[]; onUpdate: (id: string, patch: Partial<Card>) => void; onOpen: (c: Card) => void }) {
  function toggleToday(c: Card) {
    const days = (c.days || []).slice();
    const i = days.length - 1;
    days[i] = !days[i];
    let s = 0;
    for (let j = days.length - 1; j >= 0; j--) { if (days[j]) s++; else break; }
    onUpdate(c.id, { days, streak: s });
  }
  return (
    <div className="habit-list">
      {cards.map((c) => {
        const days = (c.days || []).slice(-14);
        const doneToday = (c.days || [])[(c.days || []).length - 1];
        return (
          <div className="habit-card" key={c.id}>
            <div className="habit-l">
              <button className="habit-name" onClick={() => onOpen(c)}>{c.cover?.kind === "emoji" ? <span className="row-emoji">{c.cover.val}</span> : null}{c.title}</button>
              <span className="habit-cad">{c.cadence || "Daily"}</span>
            </div>
            <div className="habit-dots">
              {days.map((on, i) => <span key={i} className={"hdot" + (on ? " on" : "")} />)}
            </div>
            <div className="habit-r">
              <span className="habit-streak"><b className="mono">{c.streak || 0}</b> day streak</span>
              <button className={"habit-mark" + (doneToday ? " on" : "")} onClick={() => toggleToday(c)}>{doneToday ? "Done ✓" : "Mark today"}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NoteBody({ cards, onOpen, onReorder }: { cards: Card[]; onOpen: (c: Card) => void; onReorder: (ids: string[]) => void }) {
  const ordered = byOrder(cards);
  const ids = ordered.map((c) => c.id);
  const { dragId, overId, itemProps } = useReorder(onReorder);
  return (
    <div className="note-grid">
      {ordered.map((c) => (
        <button
          className={"note-card" + (dragId === c.id ? " dragging" : "") + (overId === c.id ? " reorder-over" : "")}
          key={c.id}
          {...itemProps(c.id, ids)}
          onClick={() => onOpen(c)}
        >
          <span className="note-title">{c.cover?.kind === "emoji" ? <span className="row-emoji">{c.cover.val}</span> : null}{c.title}</span>
          <span className="note-body">{c.body || "Empty note"}</span>
          {c.date ? <span className="note-date mono">{shortISO(c.date)}</span> : null}
        </button>
      ))}
    </div>
  );
}

function GridBody({ cards, onOpen, onReorder }: { cards: Card[]; onOpen: (c: Card) => void; onReorder: (ids: string[]) => void }) {
  const ordered = byOrder(cards);
  const ids = ordered.map((c) => c.id);
  const { dragId, overId, itemProps } = useReorder(onReorder);
  return (
    <div className="sec-cardgrid">
      {ordered.map((c) => (
        <div
          className={"sec-cardgrid-item" + (dragId === c.id ? " dragging" : "") + (overId === c.id ? " reorder-over" : "")}
          key={c.id}
          {...itemProps(c.id, ids)}
        >
          <SquareCard card={c} showType={false} onOpen={() => onOpen(c)} />
        </div>
      ))}
    </div>
  );
}

export function SectionView({
  cards, type, onUpdate, onOpen, onAdd, onReorder,
}: {
  cards: Card[];
  type: string;
  onUpdate: (id: string, patch: Partial<Card>) => void;
  onOpen: (c: Card) => void;
  onAdd: (type: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const T = typeMeta(type);
  const builtinSub: Record<string, string> = {
    task: cards.length + (cards.length === 1 ? " task" : " tasks"),
    project: cards.length + (cards.length === 1 ? " project" : " projects"),
    habit: cards.length + (cards.length === 1 ? " habit" : " habits"),
    note: cards.length + (cards.length === 1 ? " note" : " notes"),
  };
  const sub = builtinSub[type] || (cards.length + (cards.length === 1 ? " card" : " cards"));
  const addLabel = "+ Add " + (T.label || "card").toLowerCase();

  let body: React.ReactNode;
  if (cards.length === 0) body = <div className="section-empty">Nothing here yet — tap “{addLabel}” to start.</div>;
  else if (type === "task") body = <TaskBody cards={cards} onOpen={onOpen} />;
  else if (type === "project") body = <ProjectBody cards={cards} onOpen={onOpen} />;
  else if (type === "habit") body = <HabitBody cards={cards} onUpdate={onUpdate} onOpen={onOpen} />;
  else if (type === "note") body = <NoteBody cards={cards} onOpen={onOpen} onReorder={onReorder} />;
  else body = <GridBody cards={cards} onOpen={onOpen} onReorder={onReorder} />;

  return (
    <SectionShell hue={T.hue} title={T.label} sub={sub} onAdd={() => onAdd(type)} addLabel={addLabel}>
      {body}
    </SectionShell>
  );
}
