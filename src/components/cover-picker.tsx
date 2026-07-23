"use client";

// Ported from covers.jsx — emoji grid (multi-select) + custom emoji entry
// + photo upload (downscaled client-side before storing as a data URL).
import { useRef, useState } from "react";
import type { Card, Cover } from "@/lib/types";
import { downscaleImage } from "@/lib/image";

const EMOJI_BY_TYPE: Record<string, string[]> = {
  task: ["✅", "📋", "✏️", "📌", "🧾", "🧹", "🧰", "⏰"],
  project: ["🚀", "🗺️", "🎯", "🏗️", "✈️", "🎨", "📐", "🛠"],
  habit: ["🔥", "🏃", "🧘", "🧗", "🌱", "💧", "📸", "🚶"],
  bill: ["🏡", "🏠", "📱", "💳", "💳", "🏦", "💬", "🔌"],
  note: ["📝", "💡", "📚", "❤️", "🌙", "🌴", "🧠", "📎"],
};
const EMOJI_DEFAULT = ["⭐", "✅", "🔥", "📌", "🎯", "📅", "💡", "❤️", "📷", "🎉", "📎", "🔔"];

export function CoverPicker({ card, onUpdate }: { card: Card; onUpdate: (patch: Partial<Card>) => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [emoji, setEmoji] = useState("");
  const [busy, setBusy] = useState(false);
  const suggestions = EMOJI_BY_TYPE[card.type] || EMOJI_DEFAULT;
  const cover = card.cover;

  const emojiList = cover?.kind === "emoji" ? (cover.list ?? (cover.val ? [cover.val] : [])) : [];

  function commitEmoji(list: string[]) {
    if (!list.length) { onUpdate({ cover: null }); return; }
    onUpdate({ cover: { kind: "emoji", val: list.join(""), list } });
  }
  function toggleEmoji(e: string) {
    const i = emojiList.indexOf(e);
    if (i >= 0) commitEmoji(emojiList.filter((x) => x !== e));
    else commitEmoji([...emojiList, e]);
  }
  function addCustom() {
    const v = emoji.trim();
    if (!v) return;
    if (!emojiList.includes(v)) commitEmoji([...emojiList, v]);
    setEmoji("");
  }
  async function onFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const url = await downscaleImage(f, 360);
      onUpdate({ cover: { kind: "image", val: url } as Cover });
    } catch {}
    setBusy(false);
    ev.target.value = "";
  }

  return (
    <div className="cover-pick">
      <div className="cover-pick-head">
        <span className="field-label">Cover</span>
        {cover ? <button className="cover-remove" onClick={() => onUpdate({ cover: null })}>Remove</button> : null}
      </div>
      {cover?.kind === "image" ? (
        <div className="cover-prev-img" style={{ backgroundImage: `url(${cover.val})` }} />
      ) : null}
      {emojiList.length ? (
        <div className="cover-selected">
          <span className="cover-selected-preview">{emojiList.join(" ")}</span>
          <span className="cover-selected-hint">{emojiList.length} selected · tap to remove</span>
        </div>
      ) : null}
      <div className="cover-emoji-row">
        {suggestions.map((e) => (
          <button key={e} className={"cover-emoji" + (emojiList.includes(e) ? " on" : "")} onClick={() => toggleEmoji(e)}>{e}</button>
        ))}
      </div>
      <div className="cover-actions">
        <input
          className="cover-emoji-input" maxLength={8} placeholder="Any emoji…" value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
        />
        <button className="cover-add-btn" onClick={addCustom} disabled={!emoji.trim()}>Add</button>
        <button className="cover-photo-btn" onClick={() => fileRef.current?.click()}>{busy ? "Adding…" : "Add photo"}</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
      </div>
    </div>
  );
}
