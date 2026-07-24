// Heuristic detector for financial/security secrets typed into free-text
// fields (bill notes, note bodies, task/project notes). Warns, never
// blocks — a false positive that stops someone from saving a legitimate
// note is worse than an occasional missed warning. Patterns are written
// to be reasonably precise (Luhn check for card numbers, keyword-anchored
// for routing/CVV/PIN/password) rather than flagging every stray digit run.

function luhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0 && digits.length >= 13;
}

export function detectSensitivePatterns(text: string | null | undefined): string[] {
  if (!text) return [];
  const warnings: string[] = [];

  // Card-like digit runs (13-19 digits, allowing spaces/dashes), Luhn-checked.
  const digitRuns = text.match(/\b(?:\d[ -]?){13,19}\b/g) || [];
  if (digitRuns.some((run) => luhnValid(run.replace(/[ -]/g, "")))) {
    warnings.push("This looks like it might contain a full payment card number.");
  }

  if (/\brouting\b[^0-9]{0,15}\d{9}\b/i.test(text)) {
    warnings.push("This looks like it might contain a bank routing number.");
  }
  if (/\baccount\b[^0-9]{0,15}\d{8,17}\b/i.test(text)) {
    warnings.push("This looks like it might contain a bank account number.");
  }
  if (/\b(cvv2?|cvc|security code)\b[^0-9]{0,10}\d{3,4}\b/i.test(text)) {
    warnings.push("This looks like it might contain a card security code (CVV).");
  }
  if (/\bpin\b[^0-9]{0,10}\d{3,6}\b/i.test(text)) {
    warnings.push("This looks like it might contain a PIN.");
  }
  if (/\bpassword\b\s*[:=]?\s*\S{4,}/i.test(text)) {
    warnings.push("This looks like it might contain a password.");
  }

  return warnings;
}
