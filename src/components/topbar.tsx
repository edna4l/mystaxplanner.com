"use client";

import { useState } from "react";
import { BUILTIN_CARD_TYPES } from "@/lib/cardTypes";
import type { CardTypeDef, Profile } from "@/lib/types";
import { Avatar } from "@/components/avatar";

export type AppView = "today" | "board" | "calendar" | "bills" | "section";

export function Topbar({
  greeting,
  dateStr,
  view,
  sectionType,
  customTypes,
  profile,
  dark,
  onView,
  onSection,
  onAdd,
  onQuickAdd,
  onSearch,
  onToggleDark,
  onOpenSettings,
  onSyncNow,
  syncing,
}: {
  greeting: string;
  dateStr: string;
  view: AppView;
  sectionType: string | null;
  customTypes: CardTypeDef[];
  profile: Profile | null;
  dark: boolean;
  onView: (v: AppView) => void;
  onSection: (type: string) => void;
  onAdd: () => void;
  onQuickAdd: () => void;
  onSearch: () => void;
  onToggleDark: () => void;
  onOpenSettings: () => void;
  onSyncNow: () => void;
  syncing: boolean;
}) {
  // Types with their own dedicated tab (Bills) are excluded from the
  // section-chip row — clicking them would just duplicate the Bills tab.
  const sectionTypes = [...Object.values(BUILTIN_CARD_TYPES).filter((t) => t.key !== "bill"), ...customTypes];
  const [menuOpen, setMenuOpen] = useState(false);
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
          <button className="icon-toggle" title="Search (Ctrl/Cmd+K)" onClick={onSearch}>⌕</button>
          <button className="quick-add-btn" onClick={onQuickAdd} title="Quick add (press /)">
            <span className="qa-plus">+</span><span className="qa-label">Quick add</span><span className="qa-key mono">/</span>
          </button>
          <button
            className={"icon-toggle" + (syncing ? " icon-toggle-spin" : "")}
            title="Sync now — pull the latest changes from your other devices"
            onClick={onSyncNow}
            disabled={syncing}
          >
            ⟳
          </button>
          <button className="icon-toggle" title={dark ? "Switch to light" : "Switch to dark"} onClick={onToggleDark}>
            {dark ? "☀" : "☾"}
          </button>
          <Avatar profile={profile} size={38} onClick={onOpenSettings} />
          <button className="add-btn" onClick={onAdd}>+ New card</button>
          <form action="/auth/signout" method="post">
            <button className="icon-toggle" type="submit" title="Sign out">⏻</button>
          </form>
          <button className="hamburger" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
          {menuOpen ? (
            <>
              <div className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="mobile-menu">
                <button className="mobile-menu-row" onClick={() => { setMenuOpen(false); onSearch(); }}>
                  <span className="mobile-menu-icon">⌕</span>Search
                </button>
                <button className="mobile-menu-row" onClick={() => { setMenuOpen(false); onQuickAdd(); }}>
                  <span className="mobile-menu-icon">+</span>Quick add
                </button>
                <button className="mobile-menu-row" onClick={() => { setMenuOpen(false); onAdd(); }}>
                  <span className="mobile-menu-icon">+</span>New card
                </button>
                <button className="mobile-menu-row" onClick={() => { setMenuOpen(false); onSyncNow(); }} disabled={syncing}>
                  <span className="mobile-menu-icon">⟳</span>Sync now
                </button>
                <button className="mobile-menu-row" onClick={() => { setMenuOpen(false); onToggleDark(); }}>
                  <span className="mobile-menu-icon">{dark ? "☀" : "☾"}</span>{dark ? "Light mode" : "Dark mode"}
                </button>
                <button className="mobile-menu-row" onClick={() => { setMenuOpen(false); onOpenSettings(); }}>
                  <span className="mobile-menu-icon">⚙</span>Settings
                </button>
                <form action="/auth/signout" method="post" className="mobile-menu-row-form">
                  <button className="mobile-menu-row" type="submit">
                    <span className="mobile-menu-icon">⏻</span>Sign out
                  </button>
                </form>
              </div>
            </>
          ) : null}
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
        {sectionTypes.map((t) => (
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
