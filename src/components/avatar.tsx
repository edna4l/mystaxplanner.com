"use client";

// Ported from personal.jsx's Avatar + AvatarEdit.
import { useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import { downscaleImage } from "@/lib/image";

function initials(name: string | undefined) {
  const n = (name || "").trim();
  if (!n) return "";
  const parts = n.split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

export function Avatar({ profile, size, onClick }: { profile: Pick<Profile, "name" | "avatar"> | null; size?: number; onClick?: () => void }) {
  const s = size || 38;
  const av = profile?.avatar;
  const style = { width: s, height: s, fontSize: Math.round(s * 0.4) };
  if (av?.kind === "image") {
    return <button className="avatar avatar-img" style={{ ...style, backgroundImage: `url(${av.val})` }} onClick={onClick} title={profile?.name || "Profile"} />;
  }
  const ini = initials(profile?.name);
  return <button className="avatar" style={style} onClick={onClick} title={profile?.name || "Profile"}>{ini || "☺"}</button>;
}

export function AvatarEdit({ profile, onChange }: { profile: Pick<Profile, "name" | "avatar">; onChange: (patch: Partial<Profile>) => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  async function onFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const url = await downscaleImage(f, 240);
      onChange({ avatar: { kind: "image", val: url } });
    } catch {}
    setBusy(false);
    ev.target.value = "";
  }
  return (
    <div className="av-edit">
      <Avatar profile={profile} size={64} onClick={() => fileRef.current?.click()} />
      <div className="av-edit-actions">
        <button className="av-btn" onClick={() => fileRef.current?.click()}>{busy ? "Adding…" : (profile.avatar ? "Change photo" : "Add photo")}</button>
        {profile.avatar ? <button className="av-btn ghost" onClick={() => onChange({ avatar: null })}>Use initials</button> : null}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
    </div>
  );
}
