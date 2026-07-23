"use client";

// Ported from overlays.jsx's AddMenu — builtin + custom types, plus a
// "Create a type…" sub-view that names a new type and picks a color.
import { useState } from "react";
import { BUILTIN_CARD_TYPES } from "@/lib/cardTypes";
import type { CardTypeDef } from "@/lib/types";

const CUSTOM_HUES = [200, 265, 330, 16, 48, 128, 178, 290];

export function AddMenu({
  customTypes,
  onPick,
  onClose,
  onCreateType,
}: {
  customTypes: CardTypeDef[];
  onPick: (type: string) => void;
  onClose: () => void;
  onCreateType: (name: string, hue: number) => void;
}) {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [name, setName] = useState("");
  const [hue, setHue] = useState(CUSTOM_HUES[0]);

  function create() {
    const n = name.trim();
    if (!n) return;
    onCreateType(n, hue);
  }

  return (
    <div className="menu-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="add-menu">
        {mode === "list" ? (
          <>
            <div className="add-menu-title">New card</div>
            {Object.values(BUILTIN_CARD_TYPES).map((t) => (
              <button key={t.key} className="add-row" style={{ "--hue": t.hue } as React.CSSProperties} onClick={() => onPick(t.key)}>
                <span className="swatch" />
                <span className="add-label">{t.label}</span>
                <span className="add-blurb">{t.blurb}</span>
              </button>
            ))}
            {customTypes.length ? <div className="add-divider" /> : null}
            {customTypes.map((t) => (
              <button key={t.key} className="add-row" style={{ "--hue": t.hue } as React.CSSProperties} onClick={() => onPick(t.key)}>
                <span className="swatch" />
                <span className="add-label">{t.label}</span>
                <span className="add-blurb">Your type</span>
              </button>
            ))}
            <div className="add-divider" />
            <button className="add-row add-create" onClick={() => setMode("create")}>
              <span className="plus-sq">+</span>
              <span className="add-label">Create a type…</span>
              <span className="add-blurb">School, fitness, anything</span>
            </button>
          </>
        ) : (
          <>
            <div className="add-menu-title">Create a type</div>
            <div className="create-form">
              <input
                className="create-name" autoFocus value={name}
                placeholder="Name it — e.g. School"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") create(); }}
              />
              <span className="create-label">Color</span>
              <div className="hue-row">
                {CUSTOM_HUES.map((h) => (
                  <button key={h} className={"hue-dot" + (hue === h ? " on" : "")}
                    style={{ "--hue": h } as React.CSSProperties} onClick={() => setHue(h)} aria-label={"hue " + h} />
                ))}
              </div>
              <div className="create-preview" style={{ "--hue": hue } as React.CSSProperties}>
                <span className="swatch" />
                <span className="add-label">{name.trim() || "New type"}</span>
              </div>
              <div className="create-actions">
                <button className="ghost-btn" onClick={() => setMode("list")}>Back</button>
                <button className="create-btn" disabled={!name.trim()} onClick={create}>Create &amp; add</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function EditTypeModal({
  typeDef,
  onClose,
  onSave,
}: {
  typeDef: CardTypeDef;
  onClose: () => void;
  onSave: (key: string, name: string, hue: number) => void;
}) {
  const [name, setName] = useState(typeDef.label);
  const [hue, setHue] = useState(typeDef.hue);
  function save() {
    const n = name.trim();
    if (!n) return;
    onSave(typeDef.key, n, hue);
  }
  return (
    <div className="menu-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="add-menu">
        <div className="add-menu-title">Edit type</div>
        <div className="create-form">
          <input className="create-name" autoFocus value={name} placeholder="Type name"
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
          <span className="create-label">Color</span>
          <div className="hue-row">
            {CUSTOM_HUES.map((h) => (
              <button key={h} className={"hue-dot" + (hue === h ? " on" : "")}
                style={{ "--hue": h } as React.CSSProperties} onClick={() => setHue(h)} aria-label={"hue " + h} />
            ))}
          </div>
          <div className="create-preview" style={{ "--hue": hue } as React.CSSProperties}>
            <span className="swatch" />
            <span className="add-label">{name.trim() || "Type"}</span>
          </div>
          <div className="create-actions">
            <button className="ghost-btn" onClick={onClose}>Cancel</button>
            <button className="create-btn" disabled={!name.trim()} onClick={save}>Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
