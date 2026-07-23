"use client";

import { useMemo, useState } from "react";
import { useBoard } from "@/lib/useBoard";
import { BUILTIN_CARD_TYPES } from "@/lib/cardTypes";
import type { BoardSlot, Card } from "@/lib/types";
import { Topbar, type AppView } from "@/components/topbar";
import { BoardView } from "@/components/board-view";
import { TodayView } from "@/components/today-view";
import { CalendarView } from "@/components/calendar-view";
import { BillsView } from "@/components/bills-view";
import { SectionView } from "@/components/section-view";
import { AddMenu } from "@/components/add-menu";
import { ExpandedCard } from "@/components/expanded-card";
import { StackFan } from "@/components/stack-fan";
import { DayFan } from "@/components/day-fan";

type Open =
  | { kind: "card"; cardId: string }
  | { kind: "fan"; slotId: string }
  | { kind: "dayfan"; label: string; cardIds: string[] }
  | null;

export default function HomeClient() {
  const {
    board, loading, addCard, updateCard, deleteCard, merge, unstack, ungroup,
    stampCard, extendBills, bulkDeleteBills, bulkMarkBills, applyCardOrder,
  } = useBoard();
  const [view, setView] = useState<AppView>("today");
  const [sectionType, setSectionType] = useState<string | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  const openCard = useMemo<Card | null>(() => {
    if (!open || open.kind !== "card") return null;
    for (const s of board) {
      const c = s.cards.find((x) => x.id === open.cardId);
      if (c) return c;
    }
    return null;
  }, [open, board]);

  const openSlot = useMemo<BoardSlot | null>(() => {
    if (!open || open.kind !== "fan") return null;
    return board.find((s) => s.id === open.slotId) ?? null;
  }, [open, board]);

  const dayFan = useMemo(() => {
    if (!open || open.kind !== "dayfan") return null;
    const cards: Card[] = [];
    board.forEach((s) => s.cards.forEach((c) => { if (open.cardIds.includes(c.id)) cards.push(c); }));
    if (!cards.length) return null;
    cards.sort((a, b) => (a.card_order == null ? 9999 : a.card_order) - (b.card_order == null ? 9999 : b.card_order));
    return { label: open.label, cards };
  }, [open, board]);

  const sectionCards = useMemo(() => {
    if (view !== "section" || !sectionType) return [];
    const out: Card[] = [];
    board.forEach((s) => s.cards.forEach((c) => { if (c.type === sectionType) out.push(c); }));
    return out;
  }, [view, sectionType, board]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  async function handleAdd(type: string) {
    const card = await addCard(type, BUILTIN_CARD_TYPES, pendingDate ?? undefined);
    setAddOpen(false);
    setPendingDate(null);
    if (card) setOpen({ kind: "card", cardId: card.id });
  }

  if (loading) {
    return <div className="app"><div className="today-empty" style={{ padding: 40, textAlign: "center" }}>Loading your board…</div></div>;
  }

  return (
    <div className="app">
      <Topbar
        greeting={greeting}
        dateStr={dateStr}
        view={view}
        sectionType={sectionType}
        onView={(v) => { setView(v); setSectionType(null); }}
        onSection={(type) => { setView("section"); setSectionType(type); }}
        onAdd={() => { setPendingDate(null); setAddOpen(true); }}
      />

      {view === "today" ? (
        <TodayView
          board={board}
          onOpenCard={(c) => setOpen({ kind: "card", cardId: c.id })}
          onUpdate={updateCard}
          onGo={() => setView("board")}
        />
      ) : view === "board" ? (
        <BoardView
          board={board}
          onOpenCard={(c) => setOpen({ kind: "card", cardId: c.id })}
          onOpenStack={(s) => setOpen({ kind: "fan", slotId: s.id })}
          onMerge={merge}
        />
      ) : view === "calendar" ? (
        <CalendarView
          board={board}
          onOpenCard={(c) => setOpen({ kind: "card", cardId: c.id })}
          onOpenDay={(label, cards) => setOpen({ kind: "dayfan", label, cardIds: cards.map((c) => c.id) })}
          onSetDate={(cardId, date) => updateCard(cardId, { date })}
          onStamp={stampCard}
          onAddOnDate={(date) => { setPendingDate(date); setAddOpen(true); }}
          onAddReusable={() => { setPendingDate(null); setAddOpen(true); }}
        />
      ) : view === "bills" ? (
        <BillsView
          board={board}
          onUpdate={updateCard}
          onOpen={(c) => setOpen({ kind: "card", cardId: c.id })}
          onAddBill={() => handleAdd("bill")}
          onExtend={extendBills}
          onBulkDelete={bulkDeleteBills}
          onBulkMark={bulkMarkBills}
        />
      ) : sectionType ? (
        <SectionView
          cards={sectionCards}
          type={sectionType}
          onUpdate={updateCard}
          onOpen={(c) => setOpen({ kind: "card", cardId: c.id })}
          onAdd={handleAdd}
          onReorder={applyCardOrder}
        />
      ) : null}

      {openCard ? (
        <ExpandedCard
          card={openCard}
          onClose={() => setOpen(null)}
          onUpdate={(patch) => updateCard(openCard.id, patch)}
          onDelete={() => { deleteCard(openCard.id); setOpen(null); }}
        />
      ) : null}

      {openSlot ? (
        <StackFan
          slot={openSlot}
          onClose={() => setOpen(null)}
          onOpenCard={(c) => setOpen({ kind: "card", cardId: c.id })}
          onUnstack={(cardId) => unstack(openSlot.id, cardId)}
          onUngroup={() => { ungroup(openSlot.id); setOpen(null); }}
        />
      ) : null}

      {dayFan ? (
        <DayFan
          title={dayFan.label}
          cards={dayFan.cards}
          onClose={() => setOpen(null)}
          onOpenCard={(c) => setOpen({ kind: "card", cardId: c.id })}
        />
      ) : null}

      {addOpen ? <AddMenu onPick={handleAdd} onClose={() => { setAddOpen(false); setPendingDate(null); }} /> : null}
    </div>
  );
}
