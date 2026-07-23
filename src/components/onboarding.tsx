"use client";

// Ported from personal.jsx's Onboarding — first-run name/avatar/preset/
// accent setup, shown when profiles.onboarded is false.
import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import type { Tweaks } from "@/lib/theme";
import { applyBrand } from "@/lib/theme";
import { AvatarEdit } from "@/components/avatar";
import { PresetGrid, AccentRow } from "@/components/settings-modal";

export function Onboarding({
  profile, onDone, onSaveTweaks,
}: {
  profile: Profile;
  onDone: (patch: Partial<Profile>) => void;
  onSaveTweaks: (patch: Partial<Tweaks>) => void;
}) {
  const [draft, setDraft] = useState({ name: profile.name, avatar: profile.avatar, accent: profile.accent as number | null });
  const [presetId, setPresetId] = useState("warm-light");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  function pickPreset(p: { id: string; appearance: Tweaks["appearance"]; palette: Tweaks["palette"]; bgTone: Tweaks["bgTone"] }) {
    setPresetId(p.id);
    onSaveTweaks({ appearance: p.appearance, palette: p.palette, bgTone: p.bgTone });
  }
  function pickAccent(hue: number) {
    setDraft({ ...draft, accent: hue });
    applyBrand(hue, document.documentElement.getAttribute("data-appearance") === "dark");
  }
  function finish() {
    onDone({ ...draft, preset_id: presetId, onboarded: true });
  }

  return (
    <div className="ob-overlay">
      <div className="ob-card">
        <div className="ob-logo"><span className="logo-sq" /><span className="logo-sq" /></div>
        <h1 className="ob-title">Make it yours</h1>
        <p className="ob-sub">A planner that feels like you. Set this up in ten seconds — change it anytime.</p>

        <div className="ob-section">
          <span className="ob-label">Your name</span>
          <input
            ref={inputRef} className="ob-input" value={draft.name} placeholder="What should we call you?"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") finish(); }}
          />
        </div>

        <div className="ob-section">
          <span className="ob-label">Avatar <span className="ob-opt">optional</span></span>
          <AvatarEdit profile={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} />
        </div>

        <div className="ob-section">
          <span className="ob-label">Pick a look</span>
          <PresetGrid current={presetId} onPick={pickPreset} />
        </div>

        <div className="ob-section">
          <span className="ob-label">Accent color</span>
          <AccentRow value={draft.accent} onPick={pickAccent} />
        </div>

        <div className="ob-foot">
          <button className="ob-skip" onClick={() => onDone({ onboarded: true })}>Skip</button>
          <button className="ob-start" onClick={finish}>{draft.name.trim() ? "Start planning →" : "Get started →"}</button>
        </div>
      </div>
    </div>
  );
}
