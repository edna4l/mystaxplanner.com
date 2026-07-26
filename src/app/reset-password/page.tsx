"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="ob-overlay auth-overlay">
      <div className="ob-card">
        <div className="ob-logo">
          <span className="logo-sq"></span>
          <span className="logo-sq"></span>
        </div>
        <h1 className="ob-title">Set a new password</h1>
        <p className="ob-sub">Choose a new password for your Stax account.</p>
        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field">
            <span>New password</span>
            <div className="auth-password-row">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M9.3 5.3A10.9 10.9 0 0112 5c5.5 0 9.5 4 11 7-.6 1.2-1.7 2.8-3.3 4.2M6.2 6.6C4.4 7.9 3 9.7 1 12c1.7 3.4 6 7 11 7 1.4 0 2.7-.3 4-.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </label>
          <label className="auth-field">
            <span>Confirm new password</span>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "One sec…" : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
