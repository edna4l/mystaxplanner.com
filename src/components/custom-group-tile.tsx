"use client";

// Board tile for a title-matched group of custom-type cards (e.g. all
// "CBT Counseling" cards) — see src/lib/customStack.ts. Uses the same
// StackLayers visual as the Bills aggregate and manual stacks.
import type { CustomGroup } from "@/lib/customStack";
import { typeMeta } from "@/lib/cardTypes";
import { shortISO, todayISO } from "@/lib/date";
import { StackLayers } from "@/components/square-card";

export function CustomGroupStackTile({
  group,
  onOpen,
}: {
  group: CustomGroup;
  onOpen: () => void;
}) {
  const T = typeMeta(group.type);
  const hues = Array(Math.min(group.cards.length, 3)).fill(T.hue);
  const upcoming = group.cards.filter((c) => c.date && c.date >= todayISO()).length;
  const nextLabel = group.nextDate
    ? (group.nextDate >= todayISO() ? "Next: " : "Last: ") + shortISO(group.nextDate)
    : null;

  return (
    <StackLayers hues={hues} onOpen={onOpen}>
      <div className="card-top">
        <span className="type-tag"><span className="swatch" />{T.label}</span>
        <span className="stack-badge mono">{group.cards.length}</span>
      </div>
      <h3 className="card-title">{group.title}</h3>
      <div className="prev">
        {nextLabel ? <span className="prev-sub">{nextLabel}</span> : null}
        {upcoming ? <span className="prev-sub">{upcoming} upcoming</span> : null}
        <span className="link-btn cg-review">View schedule →</span>
      </div>
    </StackLayers>
  );
}
