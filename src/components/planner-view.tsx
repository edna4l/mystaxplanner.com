"use client";

// The Planner's own "digital binder" shell — a colored side-tab rail
// (collapsing to a horizontal scroll row on mobile) that switches
// between lenses over the exact same board data every other view
// reads, never a second store of information. All 8 tabs are built.
import { useState } from "react";
import type { BoardSlot, Card } from "@/lib/types";
import { PlannerIndex } from "@/components/planner-index";
import { PlannerPlan } from "@/components/planner-plan";
import { PlannerFocus } from "@/components/planner-focus";
import { PlannerWork } from "@/components/planner-work";
import { PlannerFinance } from "@/components/planner-finance";
import { PlannerWellness } from "@/components/planner-wellness";
import { PlannerHome } from "@/components/planner-home";
import { PlannerNotes } from "@/components/planner-notes";

export type PlannerTab = "index" | "focus" | "plan" | "work" | "finance" | "wellness" | "home" | "notes";

const TABS: { key: PlannerTab; label: string; hue: number }[] = [
  { key: "index", label: "Index", hue: 40 },
  { key: "focus", label: "Focus", hue: 230 },
  { key: "plan", label: "Plan", hue: 330 },
  { key: "work", label: "Work", hue: 280 },
  { key: "finance", label: "Finance", hue: 150 },
  { key: "wellness", label: "Wellness", hue: 175 },
  { key: "home", label: "Home", hue: 70 },
  { key: "notes", label: "Notes", hue: 20 },
];

export function PlannerView({
  board,
  onOpenCard,
  onUpdateCard,
  onGo,
  onStartFocusDeck,
  onOpenDailyReset,
  onStampCard,
}: {
  board: BoardSlot[];
  onOpenCard: (card: Card, rect: DOMRect | null) => void;
  onUpdateCard: (id: string, patch: Partial<Card>) => void;
  onGo: (dest: "bills" | "board" | "calendar") => void;
  onStartFocusDeck: () => void;
  onOpenDailyReset: () => void;
  onStampCard: (cardId: string, date: string) => void;
}) {
  const [tab, setTab] = useState<PlannerTab>("plan");

  return (
    <div className="planner">
      <nav className="planner-rail">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={"planner-rail-tab" + (tab === t.key ? " on" : "")}
            style={{ "--hue": t.hue } as React.CSSProperties}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="planner-content">
        {tab === "index" ? (
          <PlannerIndex board={board} onOpenCard={onOpenCard} onGo={onGo} onOpenTab={setTab} onStartFocusDeck={onStartFocusDeck} />
        ) : tab === "plan" ? (
          <PlannerPlan board={board} onOpenCard={onOpenCard} onUpdateCard={onUpdateCard} />
        ) : tab === "focus" ? (
          <PlannerFocus board={board} onOpenCard={onOpenCard} onStartFocusDeck={onStartFocusDeck} onOpenDailyReset={onOpenDailyReset} />
        ) : tab === "work" ? (
          <PlannerWork board={board} onOpenCard={onOpenCard} onUpdateCard={onUpdateCard} />
        ) : tab === "finance" ? (
          <PlannerFinance board={board} onGo={() => onGo("bills")} />
        ) : tab === "wellness" ? (
          <PlannerWellness board={board} onOpenCard={onOpenCard} />
        ) : tab === "home" ? (
          <PlannerHome board={board} onOpenCard={onOpenCard} onStampCard={onStampCard} />
        ) : (
          <PlannerNotes board={board} onOpenCard={onOpenCard} onUpdateCard={onUpdateCard} />
        )}
      </div>
    </div>
  );
}
