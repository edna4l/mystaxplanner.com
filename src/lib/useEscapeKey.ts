import { useEffect } from "react";

// Lets every full-screen overlay close on Escape, not just the ones
// that happened to get a keydown listener — a plain convenience for
// keyboard users, and for anyone with a hardware keyboard on a tablet.
export function useEscapeKey(onClose: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
}
