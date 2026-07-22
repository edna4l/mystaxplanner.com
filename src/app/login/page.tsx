import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="ob-overlay auth-overlay">
      <div className="ob-card">
        <div className="ob-logo">
          <span className="logo-sq"></span>
          <span className="logo-sq"></span>
        </div>
        <h1 className="ob-title">Welcome back</h1>
        <p className="ob-sub">Log in to pick up your board, bills, and habits.</p>
        <AuthForm mode="login" />
        <p className="auth-switch">
          New to Stax? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
