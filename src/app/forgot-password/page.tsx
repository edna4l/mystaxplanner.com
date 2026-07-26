"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Mail } from "lucide-react";
import styles from "../login/login.module.css";

export default function ForgotPasswordPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        }
      );

      if (error) {
        throw error;
      }

      setMessage("Check your email for a link to reset your password.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not send the reset link."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambientGlowOne} />
      <div className={styles.ambientGlowTwo} />

      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandGlow} />

          <div className={styles.logo}>
            <span className={styles.logoStack}>
              <span />
              <span />
            </span>
            <span>stax</span>
          </div>

          <div className={styles.heroCopy}>
            <h1>
              Your life,
              <br />
              organized in
              <br />
              <span>visual Stax.</span>
            </h1>

            <p>
              Plan your tasks, bills, habits, appointments, projects, and
              ideas—all in one place.
            </p>
          </div>
        </aside>

        <section className={styles.authPanel}>
          <div className={styles.authCard}>
            <div className={styles.authHeading}>
              <h2>Reset your password</h2>
              <p>We&rsquo;ll email you a link to choose a new one.</p>
            </div>

            <form onSubmit={submit} className={styles.form}>
              <label className={styles.field}>
                <span>Email</span>

                <div className={styles.inputWrap}>
                  <Mail size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </div>
              </label>

              {errorMessage && (
                <div className={styles.errorMessage} role="alert">
                  {errorMessage}
                </div>
              )}

              {message && (
                <div className={styles.successMessage} role="status">
                  {message}
                </div>
              )}

              <button
                className={styles.primaryButton}
                type="submit"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className={styles.createAccount}>
              <Link href="/login">Back to login</Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
