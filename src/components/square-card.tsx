"use client";

// Ported from card.jsx's SquareCard + Preview. Cover upload, the full
// ExpandedBody editor, and custom-type styling are not ported yet — see
// the project README's "Not yet ported" list.
import type { Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { shortISO, money, soonestDate, todayISO } from "@/lib/date";

function pct(checklist: Card["checklist"]) {
  if (!checklist || !checklist.length) return 0;
  return Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
}

function Preview({ card }: { card: Card }) {
  if (card.type === "project") {
    const p = pct(card.checklist);
    return (
      <div className="prev">
        <div className="prev-row">
          <div className="bar"><div className="bar-fill" style={{ width: p + "%" }} /></div>
          <span className="mono tiny">{p}%</span>
        </div>
        <span className="prev-sub">{(card.checklist || []).length} steps</span>
      </div>
    );
  }
  if (card.type === "habit") {
    const recent = (card.days || []).slice(-7);
    const doneThisWeek = recent.filter(Boolean).length;
    return (
      <div className="prev">
        <div className="dots">
          {recent.map((on, i) => (
            <span key={i} className={"dot" + (on ? " dot-on" : "")} />
          ))}
        </div>
        <span className="prev-sub">{doneThisWeek} of {recent.length} days this week</span>
        <span className="prev-sub">Current streak: <b className="mono">{card.streak || 0}</b> days</span>
      </div>
    );
  }
  if (card.type === "bill") {
    return (
      <div className="prev">
        <span className="amount mono">{money(card.amount)}</span>
        <div className="prev-row between">
          <span className="prev-sub">{card.due || "—"}</span>
          <span className={"pill " + (card.paid ? "pill-on" : "")}>{card.paid ? "Paid" : "Due"}</span>
        </div>
      </div>
    );
  }
  if (card.type === "note") {
    return <div className="prev"><p className="prev-note">{card.body || "Empty note"}</p></div>;
  }
  const p = pct(card.checklist);
  return (
    <div className="prev">
      {card.checklist && card.checklist.length ? (
        <div className="prev-row">
          <div className="bar"><div className="bar-fill" style={{ width: p + "%" }} /></div>
          <span className="mono tiny">{card.checklist.filter((x) => x.done).length}/{card.checklist.length}</span>
        </div>
      ) : card.notes ? (
        <p className="prev-note">{card.notes}</p>
      ) : null}
      {card.due ? <span className="chip">{card.due}</span> : card.date ? <span className="chip">{shortISO(card.date)}</span> : null}
    </div>
  );
}

export function SquareCard({
  card,
  showType = true,
  dim,
  onOpen,
  dragProps,
}: {
  card: Card;
  showType?: boolean;
  dim?: boolean;
  onOpen: (e: React.MouseEvent<HTMLDivElement>) => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const T = typeMeta(card.type);
  const cover = card.cover;
  const hasPhoto = cover?.kind === "image";
  const hasEmoji = cover?.kind === "emoji";
  return (
    <div
      className={"card" + (dim ? " card-dim" : "") + (hasPhoto ? " has-photo" : "")}
      style={{ "--hue": T.hue } as React.CSSProperties}
      onClick={onOpen}
      {...dragProps}
    >
      {hasPhoto ? <div className="card-photo" style={{ backgroundImage: `url(${cover.val})` }} /> : null}
      <div className="card-top">
        {showType ? (
          <span className="type-tag">
            <span className="swatch" />
            {T.label}
          </span>
        ) : (
          <span className="swatch swatch-lone" />
        )}
        {hasEmoji ? <span className="card-emoji">{cover.val}</span> : null}
      </div>
      <h3 className="card-title">{card.title}</h3>
      <Preview card={card} />
    </div>
  );
}

// Shared layered-offset-cards visual — the "physical stack" look. Any
// tile representing a group (a manual multi-card slot, the Bills
// aggregate, a custom-type group) renders through this so they all
// share one visual language instead of three divergent implementations.
// `hues[0]` is the front card's hue; `hues[1..]` (up to 2 more) paint
// the layers behind it.
export function StackLayers({
  hues,
  dim,
  settle,
  hasPhoto,
  onOpen,
  dragProps,
  className,
  children,
}: {
  hues: number[];
  dim?: boolean;
  settle?: boolean;
  hasPhoto?: boolean;
  onOpen: () => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  className?: string;
  children: React.ReactNode;
}) {
  const layers = Math.min(hues.length, 3);
  return (
    <div className={"stack-tile" + (dim ? " card-dim" : "") + (settle ? " settling" : "") + (className ? " " + className : "")} {...dragProps}>
      {Array.from({ length: layers - 1 }).map((_, i) => (
        <div
          key={i}
          className="stack-layer"
          style={{ "--hue": hues[i + 1], "--i": layers - 1 - i } as React.CSSProperties}
        />
      ))}
      <div
        className={"card stack-front" + (hasPhoto ? " has-photo" : "")}
        style={{ "--hue": hues[0] } as React.CSSProperties}
        onClick={onOpen}
      >
        {children}
      </div>
    </div>
  );
}

export function StackTile({
  cards,
  slotName,
  showType = true,
  dim,
  settle,
  onOpen,
  dragProps,
}: {
  cards: Card[];
  slotName?: string;
  showType?: boolean;
  dim?: boolean;
  settle?: boolean;
  onOpen: () => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const top = cards[0];
  const cover = top.cover;
  const soonest = soonestDate(cards.map((c) => c.date));
  const soonestLabel = soonest ? (soonest >= todayISO() ? "Next: " : "Last: ") + shortISO(soonest) : null;
  const hues = cards.slice(0, 3).map((c) => typeMeta(c.type).hue);
  return (
    <StackLayers hues={hues} dim={dim} settle={settle} hasPhoto={cover?.kind === "image"} onOpen={onOpen} dragProps={dragProps}>
      {cover?.kind === "image" ? <div className="card-photo" style={{ backgroundImage: `url(${cover.val})` }} /> : null}
      <div className="card-top">
        <span className="stack-badge mono">{cards.length}</span>
        {cover?.kind === "emoji" ? <span className="card-emoji">{cover.val}</span> : null}
      </div>
      <h3 className="card-title">{slotName || top.title}</h3>
      <div className="stack-meta">
        {soonestLabel ? <span className="prev-sub">{soonestLabel}</span> : null}
        <div className="stack-chips">
          {cards.slice(0, 5).map((c, i) => (
            <span key={i} className="mini-swatch" style={{ "--hue": typeMeta(c.type).hue } as React.CSSProperties} />
          ))}
        </div>
        <span className="prev-sub">Tap to open</span>
      </div>
    </StackLayers>
  );
}
