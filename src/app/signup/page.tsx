import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthVisualPanel } from "@/components/auth-visual-panel";

export default function SignupPage() {
  return (
    <div className="auth-shell">
      <AuthVisualPanel />
      <div className="auth-panel">
        <div className="auth-card">
          <div className="ob-logo">
            <span className="logo-sq"></span>
            <span className="logo-sq"></span>
          </div>
          <h1 className="ob-title">Make it yours</h1>
          <p className="ob-sub">A planner that feels like you. Free to start.</p>
          <AuthForm mode="signup" />
          <Link href="/login" className="auth-cta-btn">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
