# Stax Planner

Next.js + Supabase rebuild of the Stax prototype (personal planner /
board / bills tracker). This replaces the original client-only,
localStorage-backed HTML/Babel prototype with real accounts and a real
per-user database.

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project's
   Settings → API page.
3. Run `supabase/schema.sql` against your Supabase project (SQL Editor
   in the dashboard, or `supabase db push` if you use the CLI). It
   creates `profiles`, `card_types`, `slots`, `cards`, and locks every
   table down with Row Level Security so a user can only ever read/write
   their own rows.
4. In Supabase Auth settings, add your deployed URL (and
   `http://localhost:3000` for local dev) to **Redirect URLs**, since
   `/auth/callback` needs it for email confirmation links to work.
5. `npm run dev`

## Deploying

- **Vercel**: import this repo, Framework Preset = Next.js, and set the
  two `NEXT_PUBLIC_SUPABASE_*` env vars from step 2 in the project's
  Environment Variables settings (Production + Preview + Development).
- **Domain**: point `mystaxplanner.com` at the Vercel project via
  Vercel's Domains tab (it'll give you the DNS records to add wherever
  the domain is registered).

## What's ported so far

- Auth: email/password sign up + log in, session refresh via
  middleware, per-route protection (everything except `/login`,
  `/signup`, `/auth/*` requires a session).
- Data layer: `slots`/`cards` tables replace the single localStorage
  blob; `src/lib/useBoard.ts` is a drop-in-shaped replacement for the
  prototype's `loadBoard()` — same `BoardSlot[]` shape, but every
  mutation writes through to Postgres.
- Views: **Today** (due today/overdue, bills this week, streaks at
  risk) and **Board** (drag-to-stack, stack fan overlay, card editor
  for task/project/habit/bill/note).
- All design tokens + component CSS ported verbatim from the
  prototype's `<style>` block into `globals.css` (OKLCH palette,
  density, radius, etc. — see the original README's "Design Tokens").

## Not yet ported

These exist in the original prototype (`bills.jsx`, `calendar.jsx`,
`sections.jsx`, `home.jsx`, `import.jsx`, `search.jsx`,
`tweaks-panel.jsx`, `personal.jsx`, `covers.jsx`) but aren't wired up
here yet:

- **Bills view** (all four layouts, sort/trend chart, bulk actions,
  extend-forward/back) and **Calendar view** (month grid, drag-to-date).
- **Section views** (single-type filtered board pages).
- **Custom card types** — the `card_types` table exists and is
  RLS-protected, but nothing reads/writes it yet.
- **Cover picker** (emoji/photo upload) — `cover` column exists on
  `cards` but there's no UI for it.
- **Schedule/auto-fill** (recurring dated copies via `origin`).
- **Global search** (Cmd/Ctrl+K), **Quick Add** (`/` parser), **Import**
  (.ics/.csv).
- **Onboarding, Appearance presets, Tweaks panel, profile/accent
  color** — the `profiles` table has columns for all of this
  (`tweaks`, `preset_id`, `accent`, `avatar`, `onboarded`) but the app
  currently applies none of it; every user gets the default light theme.
- **Undo toast** for destructive actions.
- Delightful animations (`delight.js`'s confetti/coin/streak effects).

None of this is hard — it's the same porting pattern as what's already
here (read the prototype file, adapt state to `useBoard()`'s Supabase
calls, keep the CSS classes as-is since they're already ported).

## Known warnings

- Next.js 16 warns that `middleware.ts` is deprecated in favor of a
  `proxy.ts` convention. Left as `middleware.ts` for now since it still
  works and the docs for the rename were still settling at the time
  this was written — worth revisiting.
