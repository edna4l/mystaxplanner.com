"use client";

// Ported from toast.jsx — bottom-center toast with an optional Undo action.
import { useEffect } from "react";

export function Toast({
  msg, actionLabel, onAction, onDismiss, variant = "default",
}: { msg: string; actionLabel?: string; onAction?: () => void; onDismiss: () => void; variant?: "default" | "error" }) {
  useEffect(() => {
    // Errors stay until dismissed — missing why a save failed is worse
    // than a toast that lingers a bit too long.
    if (variant === "error") return;
    const id = setTimeout(onDismiss, 6000);
    return () => clearTimeout(id);
  }, [msg, onDismiss, variant]);
  return (
    <div className={"toast" + (variant === "error" ? " toast-error" : "")}>
      <span className="toast-msg">{msg}</span>
      {actionLabel && onAction ? (
        <button className="toast-action" onClick={() => { onAction(); onDismiss(); }}>{actionLabel}</button>
      ) : null}
      <button className="toast-x" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}
