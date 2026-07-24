"use client";

import { useEffect, useMemo, useState } from "react";
import { useBoard } from "@/lib/useBoard";
import { useProfile } from "@/lib/useProfile";
import type { BoardSlot, Card, Profile } from "@/lib/types";
import type { ParsedQuickAdd } from "@/lib/quickAdd";
import { isVirtualId, parseVirtualId } from "@/lib/recurrence";
import { applyTheme, applyBrand } from "@/lib/theme";
import { Topbar, type AppView } from "@/components/topbar";
import { BoardView } from "@/components/board-view";
import { TodayView } from "@/components/today-view";
import { CalendarView } from "@/components/calendar-view";
import { BillsView } from "@/components/bills-view";
import { SectionView } from "@/components/section-view";
import { AddMenu, EditTypeModal } from "@/components/add-menu";
import { ExpandedCard } from "@/components/expanded-card";
import { StackFan } from "@/components/stack-fan";
import { DayFan } from "@/components/day-fan";
import { QuickAdd } from "@/components/quick-add";
import { SearchModal } from "@/components/search-modal";
import { Onboarding } from "@/components/onboarding";
import { SettingsModal } from "@/components/settings-modal";
import { Toast } from "@/components/toast";

type Open =
  | { kind: "card"; cardId: string; virtualCard?: Card }
  | { kind: "fan"; slotId: string }
  | { kind: "dayfan"; label: string; cards: Card[] }
  | null;

export default function HomeClient() {
  const {
    board, loading, customTypes, addCard, updateCard, deleteCard, merge, unstack, ungroup,
    stampCard, bulkDeleteBills, bulkMarkBills, applyCardOrder, restoreCards,
    materializeOccurrence, skipOccurrence, stopRecurrence, splitSeriesFrom,
    createCustomType, updateCustomType, deleteCustomType,
  } = useBoard();
  const { profile, loading: profileLoading, updateProfile, updateTweaks } = useProfile();
  const [view, setView] = useState<AppView>("today");
  const [sectionType, setSectionType] = useState<string | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [editTypeKey, setEditTypeKey] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; cards: Card[] } | null>(null);

  useEffect(() => {
    if (profile) applyTheme(profile.tweaks);
  }, [profile]);

  useEffect(() => {
    if (profile) applyBrand(profile.accent, profile.tweaks.appearance === "Dark");
  }, [profile]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && !quickOpen) {
        const el = document.activeElement as HTMLElement | null;
        const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
        if (!typing) { e.preventDefault(); setQuickOpen(true); }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickOpen]);

  const openCard = useMemo<Card | null>(() => {
    if (!open || open.kind !== "card") return null;
    if (open.virtualCard) return open.virtualCard;
    for (const s of board) {
      const c = s.cards.find((x) => x.id === open.cardId);
      if (c) return c;
    }
    return null;
  }, [open, board]);

  // Whether the open card belongs to a recurring bill series — the root
  // itself (carries recur_freq directly) or a materialized/virtual
  // occurrence of one (recur_freq lives on its root, looked up here since
  // occurrence rows never carry it — see materializeOccurrence).
  const openCardSeries = useMemo(() => {
    if (!openCard || openCard.type !== "bill") return null;
    if (openCard.recur_freq) return { isRoot: true as const };
    if (!openCard.origin) return null;
    let root: Card | null = null;
    board.forEach((s) => s.cards.forEach((c) => { if (c.id === openCard.origin) root = c; }));
    return root && (root as Card).recur_freq ? { isRoot: false as const } : null;
  }, [openCard, board]);

  const openSlot = useMemo<BoardSlot | null>(() => {
    if (!open || open.kind !== "fan") return null;
    return board.find((s) => s.id === open.slotId) ?? null;
  }, [open, board]);

  const dayFan = useMemo(() => {
    if (!open || open.kind !== "dayfan") return null;
    const cards = [...open.cards].sort((a, b) => (a.card_order == null ? 9999 : a.card_order) - (b.card_order == null ? 9999 : b.card_order));
    return { label: open.label, cards };
  }, [open]);

  const sectionCards = useMemo(() => {
    if (view !== "section" || !sectionType) return [];
    const out: Card[] = [];
    board.forEach((s) => s.cards.forEach((c) => { if (c.type === sectionType) out.push(c); }));
    return out;
  }, [view, sectionType, board]);

  const editingType = useMemo(
    () => (editTypeKey ? customTypes.find((t) => t.key === editTypeKey) ?? null : null),
    [editTypeKey, customTypes],
  );

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  function openCardHandler(c: Card) {
    setOpen(isVirtualId(c.id) ? { kind: "card", cardId: c.id, virtualCard: c } : { kind: "card", cardId: c.id });
  }

  async function handleUpdateCard(id: string, patch: Partial<Card>) {
    if (isVirtualId(id)) {
      const card = await materializeOccurrence(id, patch);
      if (card && open?.kind === "card" && open.cardId === id) setOpen({ kind: "card", cardId: card.id });
      return;
    }
    await updateCard(id, patch);
  }

  async function handleAdd(type: string) {
    const card = await addCard(type, pendingDate ?? undefined);
    setAddOpen(false);
    setPendingDate(null);
    if (card) setOpen({ kind: "card", cardId: card.id });
  }

  async function handleCreateType(name: string, hue: number) {
    const key = await createCustomType(name, hue);
    if (key) await handleAdd(key);
  }

  async function handleCreateFromQuick(parsed: ParsedQuickAdd) {
    setQuickOpen(false);
    const type = parsed.typeKey;
    const card = await addCard(type, parsed.date || undefined);
    if (!card) return;
    const patch: Partial<Card> = { title: parsed.title };
    if (type === "bill") {
      if (parsed.amount != null) patch.amount = parsed.amount;
      if (parsed.dueLabel) patch.due = parsed.dueLabel;
    } else if (parsed.dueLabel && (type === "task" || type === "project")) {
      patch.due = parsed.dueLabel;
    }
    if (parsed.cadence) patch.cadence = parsed.cadence;
    await updateCard(card.id, patch);
  }

  async function handleDeleteType(key: string) {
    const def = customTypes.find((t) => t.key === key);
    const n = board.reduce((a, s) => a + s.cards.filter((c) => c.type === key).length, 0);
    const msg = `Delete the "${def?.label ?? ""}" type${n ? ` and its ${n} card${n === 1 ? "" : "s"}` : ""}? This can't be undone.`;
    if (typeof window !== "undefined" && !window.confirm(msg)) return;
    await deleteCustomType(key);
    setView("board");
    setSectionType(null);
  }

  function handleDeleteCard() {
    if (!openCard) return;
    if (openCardSeries && !openCardSeries.isRoot) {
      skipOccurrence(openCard.id);
      setOpen(null);
      setToast({ msg: "Occurrence skipped", cards: [] });
      return;
    }
    const snapshot = openCard;
    deleteCard(openCard.id);
    setOpen(null);
    setToast({ msg: "Card deleted", cards: [snapshot] });
  }

  async function handleSplitSeries() {
    if (!openCard) return;
    const newRoot = await splitSeriesFrom(openCard.id);
    if (newRoot) setOpen({ kind: "card", cardId: newRoot.id });
  }

  function handleStopRecurrence() {
    if (!openCard) return;
    stopRecurrence(openCard.id);
  }

  // A recurring occurrence (virtual, or a materialized child of a root
  // that still has recur_freq) can't just be hard-deleted — the generator
  // would immediately regenerate an equivalent virtual occurrence for that
  // date, so the row appears to never actually go away. Those route
  // through skipOccurrence instead; everything else (standalone bills,
  // series roots) gets a real delete.
  function seriesRootOf(id: string): Card | null {
    let rootId: string | null = null;
    if (isVirtualId(id)) {
      rootId = parseVirtualId(id)?.rootId ?? null;
    } else {
      let card: Card | null = null;
      board.forEach((s) => s.cards.forEach((c) => { if (c.id === id) card = c; }));
      rootId = card ? (card as Card).origin : null;
    }
    if (!rootId) return null;
    let root: Card | null = null;
    board.forEach((s) => s.cards.forEach((c) => { if (c.id === rootId) root = c; }));
    return root;
  }

  function handleBulkDeleteBills(ids: string[]) {
    if (!ids.length) return;
    const skipIds = ids.filter((id) => !!seriesRootOf(id)?.recur_freq);
    const hardIds = ids.filter((id) => !skipIds.includes(id));
    skipIds.forEach((id) => skipOccurrence(id));
    const snapshots: Card[] = [];
    if (hardIds.length) {
      board.forEach((s) => s.cards.forEach((c) => { if (hardIds.includes(c.id)) snapshots.push(c); }));
      bulkDeleteBills(hardIds);
    }
    setToast({ msg: `${ids.length} bill${ids.length === 1 ? "" : "s"} deleted`, cards: snapshots });
  }

  function handleBulkMarkBills(ids: string[], paid: boolean) {
    if (!ids.length) return;
    const virtualIds = ids.filter(isVirtualId);
    const realIds = ids.filter((id) => !isVirtualId(id));
    virtualIds.forEach((id) => materializeOccurrence(id, { paid }));
    if (realIds.length) bulkMarkBills(realIds, paid);
  }

  function undoToast() {
    if (toast?.cards.length) restoreCards(toast.cards);
    setToast(null);
  }

  if (loading || profileLoading) {
    return <div className="app"><div className="today-empty" style={{ padding: 40, textAlign: "center" }}>Loading your board…</div></div>;
  }

  const dark = profile ? profile.tweaks.appearance === "Dark" : false;

  return (
    <div className="app">
      <Topbar
        greeting={greeting}
        dateStr={dateStr}
        view={view}
        sectionType={sectionType}
        customTypes={customTypes}
        profile={profile}
        dark={dark}
        onView={(v) => { setView(v); setSectionType(null); }}
        onSection={(type) => { setView("section"); setSectionType(type); }}
        onAdd={() => { setPendingDate(null); setAddOpen(true); }}
        onQuickAdd={() => setQuickOpen(true)}
        onSearch={() => setSearchOpen(true)}
        onToggleDark={() => updateTweaks({ appearance: dark ? "Light" : "Dark" })}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {view === "today" ? (
        <TodayView
          board={board}
          onOpenCard={openCardHandler}
          onUpdate={handleUpdateCard}
          onGo={() => setView("board")}
        />
      ) : view === "board" ? (
        <BoardView
          board={board}
          onOpenCard={openCardHandler}
          onOpenStack={(s) => setOpen({ kind: "fan", slotId: s.id })}
          onMerge={merge}
        />
      ) : view === "calendar" ? (
        <CalendarView
          board={board}
          onOpenCard={openCardHandler}
          onOpenDay={(label, cards) => setOpen({ kind: "dayfan", label, cards })}
          onSetDate={(cardId, date) => handleUpdateCard(cardId, { date })}
          onStamp={stampCard}
          onAddOnDate={(date) => { setPendingDate(date); setAddOpen(true); }}
          onAddReusable={() => { setPendingDate(null); setAddOpen(true); }}
        />
      ) : view === "bills" ? (
        <BillsView
          board={board}
          onUpdate={handleUpdateCard}
          onOpen={openCardHandler}
          onAddBill={() => handleAdd("bill")}
          onBulkDelete={handleBulkDeleteBills}
          onBulkMark={handleBulkMarkBills}
        />
      ) : sectionType ? (
        <SectionView
          cards={sectionCards}
          type={sectionType}
          onUpdate={handleUpdateCard}
          onOpen={openCardHandler}
          onAdd={handleAdd}
          onReorder={applyCardOrder}
          onDeleteType={() => handleDeleteType(sectionType)}
          onEditType={() => setEditTypeKey(sectionType)}
        />
      ) : null}

      {openCard ? (
        <ExpandedCard
          card={openCard}
          onClose={() => setOpen(null)}
          onUpdate={(patch) => handleUpdateCard(openCard.id, patch)}
          onDelete={handleDeleteCard}
          series={openCardSeries}
          onSplitSeries={handleSplitSeries}
          onStopRecurrence={handleStopRecurrence}
        />
      ) : null}

      {openSlot ? (
        <StackFan
          slot={openSlot}
          onClose={() => setOpen(null)}
          onOpenCard={openCardHandler}
          onUnstack={(cardId) => unstack(openSlot.id, cardId)}
          onUngroup={() => { ungroup(openSlot.id); setOpen(null); }}
        />
      ) : null}

      {dayFan ? (
        <DayFan
          title={dayFan.label}
          cards={dayFan.cards}
          onClose={() => setOpen(null)}
          onOpenCard={openCardHandler}
        />
      ) : null}

      {addOpen ? (
        <AddMenu
          customTypes={customTypes}
          onPick={handleAdd}
          onClose={() => { setAddOpen(false); setPendingDate(null); }}
          onCreateType={handleCreateType}
        />
      ) : null}

      {editingType ? (
        <EditTypeModal
          typeDef={editingType}
          onClose={() => setEditTypeKey(null)}
          onSave={(key, name, hue) => { updateCustomType(key, name, hue); setEditTypeKey(null); }}
        />
      ) : null}

      {quickOpen ? <QuickAdd onClose={() => setQuickOpen(false)} onSubmit={handleCreateFromQuick} /> : null}
      {searchOpen ? (
        <SearchModal board={board} onOpen={(c) => setOpen({ kind: "card", cardId: c.id })} onClose={() => setSearchOpen(false)} />
      ) : null}

      {profile && !profile.onboarded ? (
        <Onboarding profile={profile} onSaveTweaks={updateTweaks} onDone={(patch: Partial<Profile>) => updateProfile(patch)} />
      ) : null}

      {settingsOpen && profile ? (
        <SettingsModal
          profile={profile}
          onClose={() => setSettingsOpen(false)}
          onSaveProfile={updateProfile}
          onSaveTweaks={updateTweaks}
        />
      ) : null}

      {toast ? (
        <Toast
          msg={toast.msg}
          actionLabel={toast.cards.length ? "Undo" : undefined}
          onAction={toast.cards.length ? undoToast : undefined}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
