"use client";

// Combines personal.jsx's ProfileEditor/AppearancePicker with app.jsx's
// TweaksUI into one modal. The original tweaks-panel.jsx shell isn't
// ported as-is since its visibility is gated on postMessage from a design
// -tool host that doesn't exist here — these are the same underlying
// tweaks (profiles.tweaks/accent), just presented as a normal settings UI.
import { useState } from "react";
import type { Profile } from "@/lib/types";
import type { Tweaks } from "@/lib/theme";
import { APPEARANCE_PRESETS, ACCENTS, applyBrand } from "@/lib/theme";
import { AvatarEdit } from "@/components/avatar";

export function PresetGrid({ current, onPick }: { current: string | null; onPick: (p: (typeof APPEARANCE_PRESETS)[number]) => void }) {
  return (
    <div className="preset-grid">
      {APPEARANCE_PRESETS.map((p) => (
        <button key={p.id} className={"preset" + (current === p.id ? " on" : "")} onClick={() => onPick(p)}>
          <span className="preset-swatch" style={{ background: p.bg }}>
            <span className="preset-card" style={{ background: p.card }} />
            <span className="preset-card sm" style={{ background: p.card }} />
            <span className="preset-ink" style={{ background: p.ink }} />
          </span>
          <span className="preset-label">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

export function AccentRow({ value, onPick }: { value: number | null | undefined; onPick: (hue: number) => void }) {
  return (
    <div className="accent-row">
      {ACCENTS.map((a) => (
        <button key={a.id} className={"accent-sw" + (value === a.hue ? " on" : "")} title={a.label}
          style={{ background: `oklch(0.58 0.15 ${a.hue})` }} onClick={() => onPick(a.hue)} />
      ))}
    </div>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o} className={"seg-b" + (value === o ? " on" : "")} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

export function SettingsModal({
  profile, onClose, onSaveProfile, onSaveTweaks,
}: {
  profile: Profile;
  onClose: () => void;
  onSaveProfile: (patch: Partial<Profile>) => void;
  onSaveTweaks: (patch: Partial<Tweaks>) => void;
}) {
  const [draft, setDraft] = useState({ name: profile.name, avatar: profile.avatar });
  const t = profile.tweaks;
  const dark = t.appearance === "Dark";

  function pickPreset(p: (typeof APPEARANCE_PRESETS)[number]) {
    onSaveProfile({ preset_id: p.id });
    onSaveTweaks({ appearance: p.appearance, palette: p.palette, bgTone: p.bgTone });
  }
  function pickAccent(hue: number) {
    onSaveProfile({ accent: hue });
    applyBrand(hue, dark);
  }
  function saveName() {
    onSaveProfile(draft);
  }

  return (
    <div className="menu-overlay ap-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ap-box pe-box">
        <div className="ap-head"><span>Settings</span><button className="icon-btn round" onClick={onClose}>×</button></div>

        <div className="ob-section">
          <span className="ob-label">Name</span>
          <input className="ob-input" value={draft.name} placeholder="Your name"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })} onBlur={saveName} />
        </div>
        <div className="ob-section">
          <span className="ob-label">Avatar</span>
          <AvatarEdit profile={draft} onChange={(patch) => { setDraft({ ...draft, ...patch }); onSaveProfile(patch); }} />
        </div>
        <div className="ob-section">
          <span className="ob-label">Look</span>
          <PresetGrid current={profile.preset_id} onPick={pickPreset} />
        </div>
        <div className="ob-section">
          <span className="ob-label">Accent color</span>
          <AccentRow value={profile.accent} onPick={pickAccent} />
        </div>

        <div className="ob-section">
          <span className="ob-label">Appearance</span>
          <Seg value={t.appearance} options={["Light", "Dark"]} onChange={(v) => onSaveTweaks({ appearance: v })} />
        </div>
        <div className="ob-section">
          <span className="ob-label">Card style</span>
          <Seg value={t.cardStyle} options={["Paper", "Flat", "Outline"]} onChange={(v) => onSaveTweaks({ cardStyle: v })} />
        </div>
        <div className="ob-section">
          <span className="ob-label">Background</span>
          <Seg value={t.bgTone} options={["Warm", "Cool", "Neutral"]} onChange={(v) => onSaveTweaks({ bgTone: v })} />
        </div>
        <div className="ob-section">
          <span className="ob-label">Density</span>
          <Seg value={t.density} options={["Compact", "Regular", "Comfy"]} onChange={(v) => onSaveTweaks({ density: v })} />
        </div>
        <div className="ob-section">
          <span className="ob-label">Font</span>
          <Seg value={t.fontPair} options={["Friendly", "Modern", "Classic"]} onChange={(v) => onSaveTweaks({ fontPair: v })} />
        </div>
        <div className="ob-section">
          <span className="ob-label">Expand animation</span>
          <Seg value={t.expandStyle} options={["Grow", "Pop", "Slide"]} onChange={(v) => onSaveTweaks({ expandStyle: v })} />
        </div>
        <div className="ob-section">
          <label className="ob-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={t.showType} onChange={(e) => onSaveTweaks({ showType: e.target.checked })} />
            Show type labels on cards
          </label>
        </div>
        <div className="ob-section">
          <span className="ob-label">Corner radius — {t.radius}px</span>
          <input type="range" min={4} max={28} step={1} value={t.radius}
            onChange={(e) => onSaveTweaks({ radius: Number(e.target.value) })} style={{ width: "100%" }} />
        </div>
      </div>
    </div>
  );
}
