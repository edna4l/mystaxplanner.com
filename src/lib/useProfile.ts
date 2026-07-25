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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setProfile(null); setLoading(false); return; }
    setUserId(user.id);
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data ? normalize(data) : null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { reload(); }, [reload]);

  // Same cross-device sync as useBoard.ts — a theme/settings change made
  // on another device shows up here without a manual refresh. profiles
  // already needs to be in the supabase_realtime publication for this
  // (see supabase/migrations_0005_enable_realtime.sql).
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function scheduleReload() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { reload(); }, 700);
    }
    const channel = supabase
      .channel(`profile-sync-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, scheduleReload)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, reload]);

  async function updateProfile(patch: Partial<Profile>) {
    if (!profile) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    const dbPatch: Record<string, unknown> = { ...patch };
    const { error } = await supabase.from("profiles").update(dbPatch).eq("id", profile.id);
    if (error) { setErrorMsg("Couldn't save that change. Check your connection and try again."); reload(); }
  }

  async function updateTweaks(patch: Partial<Tweaks>) {
    if (!profile) return;
    const tweaks = { ...profile.tweaks, ...patch };
    setProfile({ ...profile, tweaks });
    const { error } = await supabase.from("profiles").update({ tweaks }).eq("id", profile.id);
    if (error) { setErrorMsg("Couldn't save that change. Check your connection and try again."); reload(); }
  }

  return { profile, loading, reload, updateProfile, updateTweaks, errorMsg, clearError: () => setErrorMsg(null) };
}
