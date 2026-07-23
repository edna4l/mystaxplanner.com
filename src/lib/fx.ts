"use client";

// Ported from delight.js — tiny celebration effects (confetti burst, coin
// flip, streak-milestone banner). Pure DOM manipulation appended to
// document.body, same as the original; safe to import anywhere since
// nothing runs until one of these functions is actually called.
const COLORS = ["#e0894f", "#3f7fd6", "#7b5bd1", "#2f9e63", "#d6b53f", "#d65f8a"];

function reduced() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
function layer() {
  let l = document.getElementById("fx-layer");
  if (!l) { l = document.createElement("div"); l.id = "fx-layer"; document.body.appendChild(l); }
  return l;
}
function center(el?: Element | null) {
  if (el?.getBoundingClientRect) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export function burst(el?: Element | null, opts: { count?: number; colors?: string[]; emoji?: string } = {}) {
  if (reduced()) return;
  const L = layer();
  const c = center(el);
  const n = opts.count || 18;
  const colors = opts.colors || COLORS;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    p.className = "fx-particle";
    if (opts.emoji && Math.random() < 0.45) {
      p.textContent = opts.emoji;
      p.style.fontSize = 13 + Math.random() * 11 + "px";
    } else {
      p.style.background = colors[i % colors.length];
      const sz = 6 + Math.random() * 6;
      p.style.width = sz + "px";
      p.style.height = sz + "px";
      if (Math.random() < 0.5) p.style.borderRadius = "50%";
    }
    p.style.left = c.x + "px";
    p.style.top = c.y + "px";
    L.appendChild(p);
    const ang = Math.random() * Math.PI * 2;
    const dist = 45 + Math.random() * 85;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - 28;
    const rot = Math.random() * 720 - 360;
    p.animate(
      [
        { transform: "translate(-50%,-50%) translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(-50%,-50%) translate(${dx}px,${dy + 72}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 720 + Math.random() * 420, easing: "cubic-bezier(.2,.7,.3,1)" },
    ).onfinish = () => p.remove();
  }
}

export function coin(el?: Element | null) {
  if (reduced()) { burst(el, { count: 8 }); return; }
  const L = layer();
  const c = center(el);
  const d = document.createElement("div");
  d.className = "fx-coin";
  d.textContent = "$";
  d.style.left = c.x + "px";
  d.style.top = c.y + "px";
  L.appendChild(d);
  d.animate(
    [
      { transform: "translate(-50%,-50%) rotateY(0deg) scale(.6)", opacity: 0 },
      { transform: "translate(-50%,-150%) rotateY(540deg) scale(1.15)", opacity: 1, offset: 0.55 },
      { transform: "translate(-50%,-250%) rotateY(900deg) scale(.85)", opacity: 0 },
    ],
    { duration: 950, easing: "cubic-bezier(.2,.7,.3,1)" },
  ).onfinish = () => d.remove();
  burst(el, { count: 12, colors: ["#3f9e63", "#d6b53f", "#8fd0a8"] });
}

export function streak(n: number) {
  const L = layer();
  const b = document.createElement("div");
  b.className = "fx-streak";
  b.innerHTML = `<span class="fx-streak-flame">🔥</span><span class="fx-streak-num">${n}</span><span class="fx-streak-cap">day streak!</span>`;
  L.appendChild(b);
  if (!reduced()) {
    b.animate(
      [
        { transform: "translate(-50%,-50%) scale(.7)", opacity: 0 },
        { transform: "translate(-50%,-50%) scale(1.04)", opacity: 1, offset: 0.18 },
        { transform: "translate(-50%,-50%) scale(1)", opacity: 1, offset: 0.82 },
        { transform: "translate(-50%,-50%) scale(.96)", opacity: 0 },
      ],
      { duration: 2000, easing: "ease" },
    ).onfinish = () => b.remove();
    burst(null, { count: 46, emoji: "🔥" });
    setTimeout(() => burst(null, { count: 34 }), 180);
  } else {
    setTimeout(() => b.remove(), 1600);
  }
}
