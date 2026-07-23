"use client";

// Ported from home.jsx's QuickAdd overlay — freeform text -> parsed
// preview via parseQuickAdd(), opened with "/" and submitted with Enter.
import { useEffect, useMemo, useRef, useState } from "react";
import { parseQuickAdd, type ParsedQuickAdd } from "@/lib/quickAdd";
import { typeMeta } from "@/lib/cardTypes";
import { money } from "@/lib/date";

export function QuickAdd({ onClose, onSubmit }: { onClose: () => void; onSubmit: (parsed: ParsedQuickAdd) => void }) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const parsed = useMemo(() => parseQuickAdd(text), [text]);
  const T = parsed ? typeMeta(parsed.typeKey) : null;
  function submit() { if (parsed) onSubmit(parsed); }

  return (
    <div className="menu-overlay qa-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="qa-box">
        <div className="qa-input-row">
          <span className="qa-prompt">›</span>
          <input
            ref={inputRef} className="qa-input" value={text} placeholder="Add anything… e.g. Rent $1450 Jul 1"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
        </div>
        {text.trim() && parsed ? (
          <div className="qa-preview">
            <span className="qa-chip" style={{ "--hue": T ? T.hue : 240 } as React.CSSProperties}>
              <span className="swatch" />{T ? T.label : "Task"}
            </span>
            <span className="qa-title">{parsed.title}</span>
            {parsed.amount != null ? <span className="qa-meta mono">{money(parsed.amount)}</span> : null}
            {parsed.dueLabel ? <span className="qa-meta">{parsed.dueLabel}</span> : null}
            {parsed.cadence ? <span className="qa-meta">{parsed.cadence}</span> : null}
            <button className="qa-add" onClick={submit}>Add ⏎</button>
          </div>
        ) : (
          <div className="qa-hints">
            <span className="qa-hint-label">Try:</span>
            {["Rent $1450 Jul 1", "Call dentist tomorrow", "Drink water daily", "note: gift ideas"].map((ex) => (
              <button key={ex} className="qa-example" onClick={() => setText(ex)}>{ex}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
