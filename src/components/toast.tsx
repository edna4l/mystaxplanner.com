"use client";

// Ported from toast.jsx — bottom-center toast with an optional Undo action.
import { useEffect } from "react";

export function Toast({
  msg, actionLabel, onAction, onDismiss,
}: { msg: string; actionLabel?: string; onAction?: () => void; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 6000);
    return () => clearTimeout(id);
  }, [msg, onDismiss]);
  return (
    <div className="toast">
      <span className="toast-msg">{msg}</span>
      {actionLabel && onAction ? (
        <button className="toast-action" onClick={() => { onAction(); onDismiss(); }}>{actionLabel}</button>
      ) : null}
      <button className="toast-x" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}
