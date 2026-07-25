"use client";

// "Notes" — every Note-type card in one place, searchable, split into
// notes tied to a day versus general ones. "Quick notes," "brain
// dump," "ideas," and "pinned notes" from the brief are all the same
// underlying card here — there's no separate concept for any of them,
// so rather than invent four categories with no real distinction
// between them, this shows one list and lets the date (which already
// exists) be the one real axis: dated reads as a journal entry for
// that day, undated reads as a standing note.
//
// Left out: Gratitude (same as brain dump — just a note, no way to
// tell them apart), tags/folders (the editor doesn't expose a
// category field for notes today — adding one is a real, separate
// change to expanded-card.tsx, not something to fake here), and
// "attach to a project" (no note→project link exists anywhere).
// "Pin to today" and "Convert to task" below are real, working
// mutations, not placeholders.
import { useMemo, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { todayISO, shortISO } from "@/lib/date";
import { allCards } from "@/lib/plannerData";

function NoteCard({
  note, onOpenCard, onUpdateCard,
}: {
  note: Card;
  onOpenCard: (c: Card, r: DOMRect | null) => void;
  onUpdateCard: (id: string, patch: Partial<Card>) => void;
}) {
  const T = typeMeta(note.type);
  return (
    <div className="planner-note-card" style={{ "--hue": T.hue } as React.CSSProperties}>
      <button className="planner-note-body" onClick={(e) => onOpenCard(note, e.currentTarget.getBoundingClientRect())}>
        <span className="planner-note-title">{note.title}</span>
        {note.body ? <p className="prev-note">{note.body}</p> : <span className="planner-index-card-sub">Empty note</span>}
        {note.date ? <span className="planner-note-date mono">{shortISO(note.date)}</span> : null}
      </button>
      <div className="planner-note-actions">
        {!note.date ? <button className="link-btn" onClick={() => onUpdateCard(note.id, { date: todayISO() })}>Pin to today</button> : null}
        <button
          className="link-btn"
          onClick={() => onUpdateCard(note.id, { type: "task", checklist: [], notes: note.body || note.notes || "", due: note.due || "" })}
        >
          Convert to task
        </button>
      </div>
    </div>
  );
}

export function PlannerNotes({
  board,
  onOpenCard,
  onUpdateCard,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onUpdateCard: (id: string, patch: Partial<Card>) => void;
}) {
  const [search, setSearch] = useState("");
  const notes = useMemo(() => allCards(board).filter((c) => c.type === "note"), [board]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.title.toLowerCase().includes(q) || (n.body || "").toLowerCase().includes(q));
  }, [notes, search]);
  const dated = filtered.filter((n) => n.date).sort((a, b) => (b.date as string).localeCompare(a.date as string));
  const undated = filtered.filter((n) => !n.date);

  return (
    <div className="planner-notes">
      <input
        className="inp bsearch"
        type="search"
        placeholder="Search notes…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {dated.length ? (
        <div className="planner-notes-section">
          <span className="section-label">Dated</span>
          <div className="planner-notes-grid">
            {dated.map((n) => <NoteCard key={n.id} note={n} onOpenCard={onOpenCard} onUpdateCard={onUpdateCard} />)}
          </div>
        </div>
      ) : null}

      <div className="planner-notes-section">
        <span className="section-label">General</span>
        {undated.length ? (
          <div className="planner-notes-grid">
            {undated.map((n) => <NoteCard key={n.id} note={n} onOpenCard={onOpenCard} onUpdateCard={onUpdateCard} />)}
          </div>
        ) : <p className="planner-soon-sub">{notes.length ? "No notes match that search." : "No note cards yet — create one from + New card."}</p>}
      </div>
    </div>
  );
}
