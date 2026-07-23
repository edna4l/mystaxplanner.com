"use client";

// Ported from search.jsx — global search (Cmd/Ctrl+K), searches every
// card's title/category/notes/due/body text.
import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";

export function SearchModal({
  board, onOpen, onClose,
}: { board: BoardSlot[]; onOpen: (c: Card) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const all: Card[] = [];
    board.forEach((s) => s.cards.forEach((c) => all.push(c)));
    if (!query) return all.slice(0, 8);
    return all.filter((c) => {
      const hay = [c.title, c.category, c.notes, c.due, c.body].filter(Boolean).join(" ").toLowerCase();
      return hay.indexOf(query) !== -1;
    }).slice(0, 40);
  }, [q, board]);

  return (
    <div className="search-scrim" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-head">
          <span className="search-icon">⌕</span>
          <input
            ref={inputRef} className="search-input" placeholder="Search cards, bills, notes…"
            value={q} onChange={(e) => setQ(e.target.value)}
          />
          <button className="search-close" onClick={onClose}>Esc</button>
        </div>
        <div className="search-results">
          {results.length === 0 ? <div className="search-empty">No matches</div> : results.map((c) => {
            const T = typeMeta(c.type);
            return (
              <button key={c.id} className="search-row" style={{ "--hue": T.hue } as React.CSSProperties} onClick={() => { onOpen(c); onClose(); }}>
                <span className="search-swatch" />
                <span className="search-row-title">{c.title}</span>
                <span className="search-row-type">{T.label}</span>
                {c.type === "bill" && c.amount ? <span className="search-row-sub mono">${c.amount}</span> : null}
                {c.due ? <span className="search-row-sub">{c.due}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
