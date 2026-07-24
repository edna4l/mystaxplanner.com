"use client";

import { useMemo } from "react";
import { detectSensitivePatterns } from "@/lib/sensitiveData";

export function SensitiveWarning({ text }: { text: string | null | undefined }) {
  const warnings = useMemo(() => detectSensitivePatterns(text), [text]);
  if (!warnings.length) return null;
  return (
    <div className="sensitive-warning">
      {warnings.map((w) => (
        <p key={w}>⚠ {w} For your security, don&apos;t store full payment card, banking, PIN, password, or security-code details in Stax.</p>
      ))}
    </div>
  );
}
