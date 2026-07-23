"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { TWEAK_DEFAULTS, type Tweaks } from "@/lib/theme";

function normalize(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    name: (row.name as string) || "",
    avatar: (row.avatar as Profile["avatar"]) ?? null,
    accent: (row.accent as number | null) ?? null,
    tweaks: { ...TWEAK_DEFAULTS, ...(row.tweaks as Record<string, unknown> | null) },
    preset_id: (row.preset_id as string | null) ?? null,
    bills_layout: (row.bills_layout as string) || "List",
    onboarded: !!row.onboarded,
  };
}

export function useProfile() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data ? normalize(data) : null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { reload(); }, [reload]);

  async function updateProfile(patch: Partial<Profile>) {
    if (!profile) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    const dbPatch: Record<string, unknown> = { ...patch };
    await supabase.from("profiles").update(dbPatch).eq("id", profile.id);
  }

  async function updateTweaks(patch: Partial<Tweaks>) {
    if (!profile) return;
    const tweaks = { ...profile.tweaks, ...patch };
    setProfile({ ...profile, tweaks });
    await supabase.from("profiles").update({ tweaks }).eq("id", profile.id);
  }

  return { profile, loading, reload, updateProfile, updateTweaks };
}
