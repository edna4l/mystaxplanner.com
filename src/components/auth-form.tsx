"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type View = "password" | "magic" | "forgot";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [view, setView] = useState<View>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setBusy(false);
      if (error) return setError(error.message);
      setInfo("Check your email for a confirmation link.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/");
    router.refresh();
  }

  async function submitMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) return setError(error.message);
    setInfo("Check your email for a link to sign in — no password needed.");
  }

  async function submitForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setInfo("Check your email for a link to reset your password.");
  }

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy(false);
      setError(error.message);
    }
    // On success Supabase redirects the browser away — nothing left to do here.
  }

  function switchView(next: View) {
    setView(next);
    setError(null);
    setInfo(null);
  }

  if (view === "magic") {
    return (
      <form className="auth-form" onSubmit={submitMagicLink}>
        <label className="auth-field">
          <span>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        {info ? <p className="auth-info">{info}</p> : null}
        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? "One sec…" : "Send magic link"}
        </button>
        <button type="button" className="auth-link-btn" onClick={() => switchView("password")}>
          Back to password sign-in
        </button>
      </form>
    );
  }

  if (view === "forgot") {
    return (
      <form className="auth-form" onSubmit={submitForgotPassword}>
        <label className="auth-field">
          <span>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        {info ? <p className="auth-info">{info}</p> : null}
        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? "One sec…" : "Send reset link"}
        </button>
        <button type="button" className="auth-link-btn" onClick={() => switchView("password")}>
          Back to password sign-in
        </button>
      </form>
    );
  }

  return (
    <>
      <form className="auth-form" onSubmit={submitPassword}>
        <label className="auth-field">
          <span>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <div className="auth-password-row">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
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

        {mode === "login" ? (
          <div className="auth-row">
            <label className="auth-check">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <span>Remember me</span>
            </label>
            <button type="button" className="auth-link-btn auth-link-inline" onClick={() => switchView("forgot")}>
              Forgot password?
            </button>
          </div>
        ) : null}

        {error ? <p className="auth-error">{error}</p> : null}
        {info ? <p className="auth-info">{info}</p> : null}

        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? "One sec…" : mode === "signup" ? "Create free account" : "Log in to Stax"}
        </button>
      </form>

      <div className="auth-divider"><span>or</span></div>

      <button type="button" className="auth-google" onClick={signInWithGoogle} disabled={busy}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.9c1.7-1.57 2.68-3.87 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 009 18z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 013.68 9c0-.59.1-1.17.27-1.7V4.97H.94A9 9 0 000 9c0 1.45.35 2.83.94 4.03l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
        Continue with Google
      </button>

      {mode === "login" ? (
        <button type="button" className="auth-link-btn auth-link-center" onClick={() => switchView("magic")}>
          Sign in without a password
        </button>
      ) : null}
    </>
  );
}
