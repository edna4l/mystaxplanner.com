"use client";

// Trimmed port of overlays.jsx's AddMenu — builtin types only for now;
// "create a custom type" isn't wired to Supabase's card_types table yet.
import { BUILTIN_CARD_TYPES } from "@/lib/cardTypes";

export function AddMenu({ onPick, onClose }: { onPick: (type: string) => void; onClose: () => void }) {
  return (
    <div className="menu-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="add-menu">
        <div className="add-menu-title">New card</div>
        {Object.values(BUILTIN_CARD_TYPES).map((t) => (
          <button key={t.key} className="add-row" style={{ "--hue": t.hue } as React.CSSProperties} onClick={() => onPick(t.key)}>
            <span className="swatch" />
            <span className="add-label">{t.label}</span>
            <span className="add-blurb">{t.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
