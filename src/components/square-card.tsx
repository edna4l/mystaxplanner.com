"use client";

// Ported from card.jsx's SquareCard + Preview. Cover upload, the full
// ExpandedBody editor, and custom-type styling are not ported yet — see
// the project README's "Not yet ported" list.
import type { Card } from "@/lib/types";
import { typeMeta } from "@/lib/cardTypes";
import { shortISO, money } from "@/lib/date";

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
    return (
      <div className="prev">
        <div className="dots">
          {recent.map((on, i) => (
            <span key={i} className={"dot" + (on ? " dot-on" : "")} />
          ))}
        </div>
        <span className="prev-sub"><b className="mono">{card.streak || 0}</b> day streak</span>
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
  const T = typeMeta(top.type);
  const layers = Math.min(cards.length, 3);
  const cover = top.cover;
  return (
    <div className={"stack-tile" + (dim ? " card-dim" : "") + (settle ? " settling" : "")} {...dragProps}>
      {Array.from({ length: layers - 1 }).map((_, i) => (
        <div
          key={i}
          className="stack-layer"
          style={{ "--hue": typeMeta(cards[i + 1].type).hue, "--i": layers - 1 - i } as React.CSSProperties}
        />
      ))}
      <div
        className={"card stack-front" + (cover?.kind === "image" ? " has-photo" : "")}
        style={{ "--hue": T.hue } as React.CSSProperties}
        onClick={onOpen}
      >
        {cover?.kind === "image" ? <div className="card-photo" style={{ backgroundImage: `url(${cover.val})` }} /> : null}
        <div className="card-top">
          <span className="stack-badge mono">{cards.length}</span>
          {cover?.kind === "emoji" ? <span className="card-emoji">{cover.val}</span> : null}
        </div>
        <h3 className="card-title">{slotName || top.title}</h3>
        <div className="stack-meta">
          <div className="stack-chips">
            {cards.slice(0, 5).map((c, i) => (
              <span key={i} className="mini-swatch" style={{ "--hue": typeMeta(c.type).hue } as React.CSSProperties} />
            ))}
          </div>
          <span className="prev-sub">Tap to open</span>
        </div>
      </div>
    </div>
  );
}
