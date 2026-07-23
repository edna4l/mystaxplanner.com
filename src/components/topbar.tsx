"use client";

export type AppView = "today" | "board" | "calendar" | "bills";

export function Topbar({
  greeting,
  dateStr,
  view,
  onView,
  onAdd,
}: {
  greeting: string;
  dateStr: string;
  view: AppView;
  onView: (v: AppView) => void;
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
      </div>
    </>
  );
}
