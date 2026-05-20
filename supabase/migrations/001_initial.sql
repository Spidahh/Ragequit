-- RAGEQUIT — Supabase initial schema
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/evhjelcistkxaphxiczy/sql

-- ============================================================
-- PLAYERS
-- ============================================================
create table if not exists public.players (
  id          uuid        default gen_random_uuid() primary key,
  user_id     text        unique not null,
  username    text        not null default 'Player',
  elo_rating  integer     not null default 1000,
  wins        integer     not null default 0,
  losses      integer     not null default 0,
  created_at  timestamptz default now()
);

-- ============================================================
-- LOADOUTS
-- ============================================================
create table if not exists public.loadouts (
  id               uuid        default gen_random_uuid() primary key,
  user_id          text        unique not null,
  loadout_data     jsonb       not null default '[]',
  instant_cast_data jsonb      not null default '{}',
  updated_at       timestamptz default now()
);

-- Auto-update updated_at on save
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists loadouts_updated_at on public.loadouts;
create trigger loadouts_updated_at
  before update on public.loadouts
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.players  enable row level security;
alter table public.loadouts enable row level security;

-- Players: each user can read/write only their own row
create policy "players_select_own" on public.players
  for select using (auth.uid()::text = user_id);
create policy "players_insert_own" on public.players
  for insert with check (auth.uid()::text = user_id);
create policy "players_update_own" on public.players
  for update using (auth.uid()::text = user_id);

-- Loadouts: full access to own row
create policy "loadouts_all_own" on public.loadouts
  for all using (auth.uid()::text = user_id);

-- ============================================================
-- ELO / STATS RPC  (called server-side with service_role)
-- ============================================================
create or replace function public.increment_player_stats(
  p_user_id   text,
  p_elo_delta integer,
  p_win_delta integer,
  p_loss_delta integer
) returns void language plpgsql security definer as $$
begin
  update public.players
  set
    elo_rating = greatest(0, elo_rating + p_elo_delta),
    wins       = wins   + p_win_delta,
    losses     = losses + p_loss_delta
  where user_id = p_user_id;
end;
$$;
