// Ported from app.jsx's TWEAK_DEFAULTS/applyTheme + personal.jsx's presets/
// accents/applyBrand. The original tweaks-panel.jsx shell is a design-tool
// scaffold (its visibility is gated on postMessage from a parent iframe
// that doesn't exist in production), so instead of porting that shell we
// apply these same tweaks through a plain settings modal backed by the
// profiles.tweaks/accent columns.
import { BUILTIN_CARD_TYPES, CARD_TYPES, registerCardType } from "@/lib/cardTypes";
export interface Tweaks {
  appearance: "Light" | "Dark";
  palette: "Soft" | "Default" | "Vivid" | "Max" | "Mono";
  cardStyle: "Paper" | "Flat" | "Outline";
  // Applies throughout the app (Board, Today, Calendar, Bills, the card
  // editor, search, Focus Deck/Daily Reset) — a soft per-hue gradient +
  // glow on a few specific states (drag targets, hovered stacks) instead
  // of a flat tint. Derived purely from the existing --hue/--chroma/
  // --tint-L tokens, so it automatically respects whatever accent/
  // type-color customization (including the color wheel) is already
  // set, rather than being a separate hardcoded palette. Still fully
  // togglable per-user in Settings — this is just the default new
  // accounts start with (see TWEAK_DEFAULTS); anyone's already-saved
  // preference is unaffected by changing this default.
  cardVariant: "Flat" | "Gradient";
  // How much darker/more saturated the gradient's far stop gets — Subtle
  // is the default so dozens of cards/panels on screen at once don't
  // read as visually heavy; Bold restores the original, more intense
  // look for anyone who wants it turned up.
  gradientIntensity: "Subtle" | "Balanced" | "Bold";
  bgTone: "Warm" | "Cool" | "Neutral";
  radius: number;
  density: "Compact" | "Regular" | "Comfy";
  showType: boolean;
  expandStyle: "Grow" | "Pop" | "Slide";
  fontPair: "Friendly" | "Modern" | "Classic";
  // Per-built-in-type hue overrides (custom types already have their own
  // hue, set/edited via the type registry — see cardTypes.ts). Keyed by
  // BuiltinType; absent key means "use the default for that type."
  typeHues: Partial<Record<string, number>>;
  // Board layout mode — see board-view.tsx. Persisted like any other
  // display preference rather than reset every session.
  boardView: "Stacks" | "Cards" | "Timeline" | "Now/Next/Later";
  // Smart Stack suggestion keys the user has dismissed (see
  // src/lib/smartSuggestions.ts) — so a declined suggestion doesn't
  // keep reappearing every visit.
  dismissedSuggestions: string[];
  // "Remind me tomorrow" from Focus Deck/Daily Reset (see
  // src/components/focus-deck.tsx, daily-reset.tsx) — keyed by card id,
  // valued by the date it should reappear in those two flows. Unlike
  // Reschedule, this never touches the card's own due date, so an
  // overdue bill stays honestly overdue everywhere else in the app;
  // it's just excluded from today's review queue until that date.
  snoozedBills: Record<string, string>;
}

export const TWEAK_DEFAULTS: Tweaks = {
  appearance: "Light",
  palette: "Default",
  cardStyle: "Paper",
  cardVariant: "Gradient",
  gradientIntensity: "Subtle",
  bgTone: "Warm",
  radius: 18,
  density: "Regular",
  showType: true,
  expandStyle: "Grow",
  fontPair: "Friendly",
  typeHues: {},
  boardView: "Stacks",
  dismissedSuggestions: [],
  snoozedBills: {},
};

const PALETTE = {
  Soft: { c: 0.05, tl: 0.945, al: 0.55 },
  Default: { c: 0.085, tl: 0.93, al: 0.56 },
  Vivid: { c: 0.135, tl: 0.91, al: 0.585 },
  // For anyone who wants Stax to look like a stack of colorful paper,
  // not just a hint of tint — noticeably more saturated tint AND a
  // deeper tint-L than Vivid, so cards read as genuinely colorful at a
  // glance instead of a pastel suggestion of color.
  Max: { c: 0.185, tl: 0.87, al: 0.6 },
  Mono: { c: 0.012, tl: 0.95, al: 0.45 },
};
const BG = {
  Warm: { bg: "oklch(0.966 0.011 83)", ink: "oklch(0.26 0.014 62)", panel: "oklch(0.995 0.006 85)", line: "oklch(0.9 0.012 80)" },
  Cool: { bg: "oklch(0.966 0.009 248)", ink: "oklch(0.26 0.016 258)", panel: "oklch(0.995 0.004 250)", line: "oklch(0.9 0.012 248)" },
  Neutral: { bg: "oklch(0.972 0.001 0)", ink: "oklch(0.25 0.004 0)", panel: "oklch(0.998 0 0)", line: "oklch(0.9 0.002 0)" },
};
const DARK_BG = {
  Warm: { bg: "oklch(0.205 0.011 70)", ink: "oklch(0.93 0.009 80)", panel: "oklch(0.255 0.013 70)", line: "oklch(0.34 0.013 70)" },
  Cool: { bg: "oklch(0.205 0.014 260)", ink: "oklch(0.93 0.009 250)", panel: "oklch(0.255 0.016 260)", line: "oklch(0.34 0.016 260)" },
  Neutral: { bg: "oklch(0.2 0.002 0)", ink: "oklch(0.94 0.002 0)", panel: "oklch(0.25 0.003 0)", line: "oklch(0.34 0.004 0)" },
};
const DENSITY = { Compact: { s: 142, g: 12 }, Regular: { s: 168, g: 16 }, Comfy: { s: 196, g: 20 } };
const GRADIENT_INTENSITY = {
  Subtle: { mul: 1.05, drop: 0.1 },
  Balanced: { mul: 1.35, drop: 0.13 },
  Bold: { mul: 1.7, drop: 0.16 },
};
const FONTS = {
  Friendly: { disp: "'Bricolage Grotesque'", ui: "'Hanken Grotesk'" },
  Modern: { disp: "'Space Grotesk'", ui: "'Hanken Grotesk'" },
  Classic: { disp: "'Newsreader'", ui: "'Hanken Grotesk'" },
};

export function applyTheme(t: Tweaks) {
  const r = document.documentElement;
  const p = PALETTE[t.palette] || PALETTE.Default;
  r.style.setProperty("--chroma", String(p.c));
  r.style.setProperty("--tint-L", String(p.tl));
  r.style.setProperty("--accent-L", String(p.al));
  const bg = BG[t.bgTone] || BG.Warm;
  r.style.setProperty("--bg", bg.bg);
  r.style.setProperty("--ink", bg.ink);
  r.style.setProperty("--panel", bg.panel);
  r.style.setProperty("--line", bg.line);
  const d = DENSITY[t.density] || DENSITY.Regular;
  r.style.setProperty("--card-size", d.s + "px");
  r.style.setProperty("--gap", d.g + "px");
  r.style.setProperty("--radius", t.radius + "px");
  const f = FONTS[t.fontPair] || FONTS.Friendly;
  r.style.setProperty("--font-display", f.disp);
  r.style.setProperty("--font-ui", f.ui);
  r.setAttribute("data-cardstyle", (t.cardStyle || "Paper").toLowerCase());
  r.setAttribute("data-cardvariant", (t.cardVariant || "Flat").toLowerCase());
  const gi = GRADIENT_INTENSITY[t.gradientIntensity] || GRADIENT_INTENSITY.Subtle;
  r.style.setProperty("--tint-deep-mul", String(gi.mul));
  r.style.setProperty("--tint-deep-drop", String(gi.drop));
  const dark = t.appearance === "Dark";
  r.setAttribute("data-appearance", dark ? "dark" : "light");
  if (dark) {
    const dbg = DARK_BG[t.bgTone] || DARK_BG.Warm;
    r.style.setProperty("--bg", dbg.bg);
    r.style.setProperty("--ink", dbg.ink);
    r.style.setProperty("--panel", dbg.panel);
    r.style.setProperty("--line", dbg.line);
    r.style.setProperty("--tint-L", "0.345");
    r.style.setProperty("--accent-L", String(Math.max(0.62, p.al + 0.06)));
    r.style.setProperty("--accent-ink-L", "0.8");
  } else {
    r.style.setProperty("--accent-ink-L", "0.43");
  }

  // Caches just enough to repaint the right background instantly on the
  // next load, before this function even runs again — see the
  // beforeInteractive script in app/layout.tsx that reads this. Without
  // it, every full page load briefly shows the light-mode background
  // (globals.css's :root default) even for a Dark-mode user, until this
  // function runs — a bright flash that's a real problem for anyone
  // light-sensitive, not just an aesthetic nitpick.
  try {
    localStorage.setItem("stax-theme-cache", JSON.stringify({
      bg: r.style.getPropertyValue("--bg"),
      ink: r.style.getPropertyValue("--ink"),
      panel: r.style.getPropertyValue("--panel"),
      line: r.style.getPropertyValue("--line"),
      dark,
    }));
  } catch {
    // Private-browsing / storage-disabled — the flash just isn't
    // prevented for this user, nothing else depends on this cache.
  }
}

// Overrides a built-in type's hue by re-registering it in the same
// CARD_TYPES registry custom types already live in (see cardTypes.ts) —
// typeMeta() reads from that registry, so every card/tile picks up the
// override automatically with no separate rendering path needed.
export function applyTypeHues(overrides: Partial<Record<string, number>> | undefined) {
  if (!overrides) return;
  Object.entries(overrides).forEach(([key, hue]) => {
    if (hue == null) return;
    const base = CARD_TYPES[key] ?? BUILTIN_CARD_TYPES[key];
    if (base) registerCardType({ ...base, hue });
  });
}

export interface AppearancePreset {
  id: string;
  label: string;
  appearance: "Light" | "Dark";
  palette: Tweaks["palette"];
  bgTone: Tweaks["bgTone"];
  bg: string;
  card: string;
  ink: string;
}

export const APPEARANCE_PRESETS: AppearancePreset[] = [
  { id: "warm-light", label: "Warm Light", appearance: "Light", palette: "Default", bgTone: "Warm", bg: "#f5efe3", card: "#e9c9a8", ink: "#3a3026" },
  { id: "cool-light", label: "Cool Light", appearance: "Light", palette: "Default", bgTone: "Cool", bg: "#eef1f6", card: "#bcd0ec", ink: "#2a3140" },
  { id: "mono-light", label: "Minimal", appearance: "Light", palette: "Mono", bgTone: "Neutral", bg: "#f6f6f6", card: "#dcdcdc", ink: "#242424" },
  { id: "vivid-light", label: "Vivid", appearance: "Light", palette: "Vivid", bgTone: "Warm", bg: "#f5efe3", card: "#f0b88a", ink: "#3a3026" },
  { id: "warm-dark", label: "Warm Dark", appearance: "Dark", palette: "Default", bgTone: "Warm", bg: "#2a2520", card: "#5a4a3a", ink: "#ece4d8" },
  { id: "cool-dark", label: "Midnight", appearance: "Dark", palette: "Vivid", bgTone: "Cool", bg: "#1f2530", card: "#3a4a66", ink: "#e6ecf5" },
];

export const ACCENTS = [
  { id: "indigo", label: "Indigo", hue: 262 },
  { id: "ocean", label: "Ocean", hue: 225 },
  { id: "teal", label: "Teal", hue: 192 },
  { id: "green", label: "Green", hue: 150 },
  { id: "amber", label: "Amber", hue: 70 },
  { id: "coral", label: "Coral", hue: 32 },
  { id: "rose", label: "Rose", hue: 8 },
  { id: "violet", label: "Violet", hue: 320 },
];

export function applyBrand(hue: number | null | undefined, dark: boolean) {
  const r = document.documentElement;
  if (hue == null) {
    r.style.removeProperty("--brand");
    r.style.removeProperty("--brand-soft");
    r.style.removeProperty("--brand-ink");
    return;
  }
  const L = dark ? 0.66 : 0.56;
  r.style.setProperty("--brand", `oklch(${L} 0.15 ${hue})`);
  r.style.setProperty("--brand-soft", `oklch(${L + 0.07} 0.13 ${hue})`);
  r.style.setProperty("--brand-ink", "#fff");
}
