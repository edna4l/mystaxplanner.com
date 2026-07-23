"use client";

import { BUILTIN_CARD_TYPES } from "@/lib/cardTypes";

export type AppView = "today" | "board" | "calendar" | "bills" | "section";

// Types with their own dedicated tab (Bills) are excluded from the
// section-chip row — clicking them would just duplicate the Bills tab.
const SECTION_TYPES = Object.values(BUILTIN_CARD_TYPES).filter((t) => t.key !== "bill");

export function Topbar({
  greeting,
  dateStr,
  view,
  sectionType,
  onView,
  onSection,
  onAdd,
}: {
  greeting: string;
  dateStr: string;
  view: AppView;
  sectionType: string | null;
  onView: (v: AppView) => void;
  onSection: (type: string) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="logo"><span className="logo-sq" /><span className="logo-sq" /></span>
          <span className="brand-name">Stax</span>
        </div>
        <div className="head-center">
          <h1 className="greet">{greeting}</h1>
          <span className="date mono">{dateStr}</span>
        </div>
        <div className="head-right">
          <button className="add-btn" onClick={onAdd}>+ New card</button>
          <form action="/auth/signout" method="post">
            <button className="icon-toggle" type="submit" title="Sign out">⏻</button>
          </form>
        </div>
      </header>
      <div className="filters">
        <div className="view-toggle">
          <button className={"vt" + (view === "today" ? " on" : "")} onClick={() => onView("today")}>Today</button>
          <button className={"vt" + (view === "board" ? " on" : "")} onClick={() => onView("board")}>Board</button>
          <button className={"vt" + (view === "calendar" ? " on" : "")} onClick={() => onView("calendar")}>Calendar</button>
          <button className={"vt" + (view === "bills" ? " on" : "")} onClick={() => onView("bills")}>Bills</button>
        </div>
        <span className="vt-divider" />
        {SECTION_TYPES.map((t) => (
          <button
            key={t.key}
            className={"filter-chip chip-section" + (view === "section" && sectionType === t.key ? " active" : "")}
            style={{ "--hue": t.hue } as React.CSSProperties}
            onClick={() => onSection(t.key)}
          >
            <span className="swatch" />{t.label}<span className="chip-arrow">›</span>
          </button>
        ))}
      </div>
    </>
  );
}
