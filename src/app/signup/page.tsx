import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <div className="ob-overlay auth-overlay">
      <div className="ob-card">
        <div className="ob-logo">
          <span className="logo-sq"></span>
          <span className="logo-sq"></span>
        </div>
        <h1 className="ob-title">Make it yours</h1>
        <p className="ob-sub">A planner that feels like you. Free to start.</p>
        <AuthForm mode="signup" />
        <p className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
