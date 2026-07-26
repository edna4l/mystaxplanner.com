"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Layers3,
  Loader2,
  LockKeyhole,
  Mail,
  Sparkles,
} from "lucide-react";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  // Moves keyboard focus to the error banner as soon as one appears, so a
  // keyboard/screen-reader user lands directly on the failure reason
  // instead of having to hunt for it after a failed login.
  useEffect(() => {
    if (errorMessage) {
      errorRef.current?.focus();
    }
  }, [errorMessage]);

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Belt-and-suspenders against a double-click/double-Enter racing the
    // `disabled` re-render — the button is disabled while loading, but
    // this guard makes the intent explicit regardless of render timing.
    if (loading) return;

    setLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      // Stax is a single-page app — "/" is the whole authenticated
      // dashboard (Board/Today/Planner are client-side view state, not
      // separate routes), so this is the correct landing spot.
      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not log you in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setErrorMessage("");
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleMagicLink() {
    setErrorMessage("");
    setMessage("");

    if (!email.trim()) {
      setErrorMessage("Enter your email address first.");
      return;
    }

    setMagicLinkLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      setMessage("Check your email for your Stax sign-in link.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not send the sign-in link."
      );
    } finally {
      setMagicLinkLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambientGlowOne} />
      <div className={styles.ambientGlowTwo} />

      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandGlow} />
          <div className={styles.sparkOne} />
          <div className={styles.sparkTwo} />
          <div className={styles.sparkThree} />

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

          <div className={styles.benefits}>
            <div className={styles.benefit}>
              <span className={`${styles.benefitIcon} ${styles.purpleIcon}`}>
                <Sparkles size={22} />
              </span>
              <span>
                <strong>See what needs attention today</strong>
                <small>A clear overview of your day at a glance.</small>
              </span>
            </div>

            <div className={styles.benefit}>
              <span className={`${styles.benefitIcon} ${styles.blueIcon}`}>
                <Layers3 size={22} />
              </span>
              <span>
                <strong>Turn repeat items into clean stacks</strong>
                <small>Group, stack, and stay effortlessly organized.</small>
              </span>
            </div>

            <div className={styles.benefit}>
              <span className={`${styles.benefitIcon} ${styles.greenIcon}`}>
                <CheckCircle2 size={22} />
              </span>
              <span>
                <strong>Plan your day without juggling five apps</strong>
                <small>Everything you need, beautifully connected.</small>
              </span>
            </div>
          </div>

          <div className={styles.previewStage}>
            <article className={`${styles.previewCard} ${styles.billCard}`}>
              <header>
                <strong>Bills</strong>
              </header>

              <div className={styles.billRow}>
                <span>
                  <b>Rent</b>
                  <small>Due in 3 days</small>
                </span>
                <strong>$1,500</strong>
              </div>

              <div className={styles.billRow}>
                <span>
                  <b>Electricity</b>
                  <small>Due in 6 days</small>
                </span>
                <strong>$68.45</strong>
              </div>

              <div className={styles.billRow}>
                <span>
                  <b>Internet</b>
                  <small>Due in 10 days</small>
                </span>
                <strong>$59.99</strong>
              </div>

              <button type="button">+ Add bill</button>
            </article>

            <article className={`${styles.previewCard} ${styles.summaryCard}`}>
              <header>
                <span>
                  <strong>Daily summary</strong>
                  <small>Today, July 25</small>
                </span>
                <span className={styles.moreDots}>•••</span>
              </header>

              <div className={styles.summaryContent}>
                <div className={styles.progressRing}>
                  <span>78%</span>
                </div>

                <div>
                  <strong>Nice progress!</strong>
                  <small>You’re on track for a productive day.</small>
                </div>
              </div>

              <div className={styles.summaryStats}>
                <span>
                  <strong>8</strong>
                  <small>Tasks left</small>
                </span>
                <span>
                  <strong>3</strong>
                  <small>Events</small>
                </span>
                <span>
                  <strong>2</strong>
                  <small>Bills due</small>
                </span>
              </div>
            </article>

            <article className={`${styles.previewCard} ${styles.habitCard}`}>
              <header>
                <strong>Habits</strong>
              </header>

              <div className={styles.habitRow}>
                <span>
                  <b>Meditate</b>
                  <small>12-day streak</small>
                </span>
                <CheckCircle2 size={20} />
              </div>

              <div className={styles.habitRow}>
                <span>
                  <b>Drink water</b>
                  <small>8-day streak</small>
                </span>
                <CheckCircle2 size={20} />
              </div>

              <div className={styles.habitRow}>
                <span>
                  <b>Workout</b>
                  <small>5-day streak</small>
                </span>
                <span className={styles.openCircle} />
              </div>

              <button type="button">+ Add habit</button>
            </article>

            <article className={`${styles.previewCard} ${styles.scheduleCard}`}>
              <div className={styles.scheduleTime}>
                <span>9 AM</span>
                <span>10 AM</span>
                <span>11 AM</span>
                <span>12 PM</span>
              </div>

              <div className={styles.scheduleEvents}>
                <div className={styles.timeMarker} />

                <div className={`${styles.eventBlock} ${styles.eventPurple}`}>
                  <strong>Team stand-up</strong>
                  <small>9:00–9:30 AM</small>
                </div>

                <div className={`${styles.eventBlock} ${styles.eventBlue}`}>
                  <strong>Design review</strong>
                  <small>10:00–11:00 AM</small>
                </div>

                <div className={`${styles.eventBlock} ${styles.eventPink}`}>
                  <strong>Lunch with Sarah</strong>
                  <small>12:00–1:00 PM</small>
                </div>
              </div>
            </article>
          </div>
        </aside>

        <section className={styles.authPanel}>
          <div className={styles.authCard}>
            <div className={styles.authHeading}>
              <h2>Welcome back</h2>
              <p>Your plans are right where you left them.</p>
            </div>

            <form onSubmit={handlePasswordLogin} className={styles.form}>
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
                  />
                </div>
              </label>

              <label className={styles.field}>
                <span>Password</span>

                <div className={styles.inputWrap}>
                  <LockKeyhole size={20} />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>

              <div className={styles.formOptions}>
                <label className={styles.remember}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <Link href="/forgot-password">Forgot password?</Link>
              </div>

              {errorMessage && (
                <div
                  className={styles.errorMessage}
                  role="alert"
                  tabIndex={-1}
                  ref={errorRef}
                >
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
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className={styles.spinner} />
                    Logging you in…
                  </>
                ) : (
                  "Log in to Stax"
                )}
              </button>
            </form>

            <div className={styles.divider}>
              <span />
              <small>or</small>
              <span />
            </div>

            <button
              type="button"
              className={styles.googleButton}
              onClick={handleGoogleLogin}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <button
              type="button"
              className={styles.magicLinkButton}
              onClick={handleMagicLink}
              disabled={magicLinkLoading}
            >
              {magicLinkLoading
                ? "Sending sign-in link…"
                : "Email me a sign-in link"}
            </button>

            <p className={styles.createAccount}>
              New to Stax?{" "}
              <Link href="/signup">Create free account</Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="21"
      height="21"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.55l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}
