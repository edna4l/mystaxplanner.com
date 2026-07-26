// Branded marketing panel for the login/signup screens — fixed dark
// purple/blue treatment regardless of the visitor's app theme (they
// have no session yet, so no theme preference to read). Purely
// decorative/presentational: no data, no props, safe to drop into
// either auth page.
export function AuthVisualPanel() {
  return (
    <div className="auth-visual">
      <div className="auth-visual-glow" aria-hidden="true" />
      <div className="auth-visual-inner">
        <div className="auth-visual-logo">
          <span className="logo-sq"></span>
          <span className="logo-sq"></span>
          <span className="auth-visual-word">stax</span>
        </div>

        <h1 className="auth-visual-headline">
          Your life, organized in <span className="auth-visual-grad">visual Stax.</span>
        </h1>
        <p className="auth-visual-desc">
          Plan your tasks, bills, habits, appointments, projects, and ideas — all in one place.
        </p>

        <ul className="auth-visual-points">
          <li><span className="auth-visual-dot" />See what needs attention today</li>
          <li><span className="auth-visual-dot" />Turn repeat items into clean stacks</li>
          <li><span className="auth-visual-dot" />Plan your day without juggling five apps</li>
        </ul>

        <div className="auth-visual-cards" aria-hidden="true">
          <div className="avc avc-bills">
            <span className="avc-title">Bills</span>
            <div className="avc-row"><span>Rent</span><span className="mono">$1,450 · 3d</span></div>
            <div className="avc-row"><span>Electricity</span><span className="mono">$86 · 6d</span></div>
            <div className="avc-row"><span>Internet</span><span className="mono">$60 · 9d</span></div>
          </div>
          <div className="avc avc-summary">
            <div className="avc-ring" style={{ "--pct": 78 } as React.CSSProperties}>
              <span>78%</span>
            </div>
            <div className="avc-summary-copy">
              <span className="avc-title">Daily summary</span>
              <span className="avc-sub">7 of 9 done</span>
            </div>
          </div>
          <div className="avc avc-habits">
            <span className="avc-title">Habits</span>
            <div className="avc-row"><span>Meditate</span><span className="mono">5🔥</span></div>
            <div className="avc-row"><span>Drink water</span><span className="mono">12🔥</span></div>
            <div className="avc-row"><span>Workout</span><span className="mono">3🔥</span></div>
          </div>
          <div className="avc avc-schedule">
            <div className="avc-row"><span className="mono tiny">9:00</span><span>Team stand-up</span></div>
            <div className="avc-row"><span className="mono tiny">11:00</span><span>Design review</span></div>
            <div className="avc-row"><span className="mono tiny">1:00</span><span>Lunch with Sarah</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
