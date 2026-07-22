-- Stax Planner — Supabase schema
-- Mirrors the localStorage data model documented in the prototype's README:
--   board: Slot[] where Slot = { id, name, cards: Card[] }
-- Rather than one giant JSON blob per user, cards and slots are normalized
-- into rows so multiple devices can sync/merge without last-write-wins
-- clobbering the whole board.

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
-- One row per authenticated user; mirrors personal.jsx's profile + tweaks + presets.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  avatar jsonb,               -- { kind: 'image', val: dataURL|storageURL } | null
  accent numeric,             -- hue, matches ACCENTS in personal.jsx
  tweaks jsonb not null default '{}'::jsonb,  -- TWEAK_DEFAULTS shape from app.jsx
  preset_id text,
  bills_layout text not null default 'List',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- custom card types ----------
create table if not exists public.card_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,          -- the ctype_* id used as Card.type
  label text not null,
  hue numeric not null,
  blurb text not null default 'Custom',
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

-- ---------- slots ----------
-- A slot is a board position; slots with >1 card are a "stack".
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  sort_order numeric,          -- board display order (nullable = newest-first fallback)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- cards ----------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_id uuid not null references public.slots(id) on delete cascade,
  type text not null,          -- 'task' | 'project' | 'habit' | 'bill' | 'note' | custom key
  title text not null default 'Untitled',
  date date,                   -- scheduled date, drives calendar placement
  origin uuid references public.cards(id) on delete set null, -- recurring-series root
  cover jsonb,                 -- { kind:'emoji', val } | { kind:'image', val }
  card_order numeric,          -- explicit rank within a stack/day
  position_in_slot int not null default 0, -- ordering within its slot's cards[] array

  -- type-specific fields (kept nullable / sparse; app only reads what its type uses)
  checklist jsonb,             -- [{ text, done }]
  notes text,
  due text,
  cadence text,
  streak int,
  days boolean[],
  amount numeric,
  balance numeric,
  paid boolean,
  recur text,
  category text,
  body text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_user_idx on public.cards(user_id);
create index if not exists cards_slot_idx on public.cards(slot_id);
create index if not exists cards_date_idx on public.cards(user_id, date);
create index if not exists cards_type_idx on public.cards(user_id, type);
create index if not exists cards_origin_idx on public.cards(origin);
create index if not exists slots_user_idx on public.slots(user_id);

-- ---------- updated_at triggers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_slots_updated on public.slots;
create trigger trg_slots_updated before update on public.slots
  for each row execute function public.set_updated_at();

drop trigger if exists trg_cards_updated on public.cards;
create trigger trg_cards_updated before update on public.cards
  for each row execute function public.set_updated_at();

-- ---------- auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security: every table is strictly per-user ----------
alter table public.profiles enable row level security;
alter table public.card_types enable row level security;
alter table public.slots enable row level security;
alter table public.cards enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create policy "card_types_all_own" on public.card_types for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "slots_all_own" on public.slots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cards_all_own" on public.cards for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
