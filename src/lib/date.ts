const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function isoOf(d: Date) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

export function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return isoOf(d);
}

export function shortISO(iso: string | null | undefined) {
  if (!iso) return "";
  const p = iso.split("-").map(Number);
  if (p.length !== 3) return iso;
  return MON3[(p[1] - 1) % 12] + " " + p[2];
}

export function money(n: number | null | undefined) {
  const v = Number(n || 0);
  return "$" + v.toLocaleString(undefined, { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function parseISO(iso: string | null | undefined) {
  if (!iso || typeof iso !== "string") return null;
  const p = iso.split("-").map(Number);
  if (p.length !== 3 || p.some(isNaN)) return null;
  return { y: p[0], m: p[1] - 1, d: p[2] };
}

export function toISODate(y: number, m: number, d: number) {
  return y + "-" + pad2(m + 1) + "-" + pad2(d);
}
