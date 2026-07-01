-- ============================================================
-- NeoChess Supabase Schema
-- Run this in the Supabase SQL editor before enabling multiplayer.
-- ============================================================

create table games (
  id                      uuid        primary key default gen_random_uuid(),
  room_code               text        unique not null,
  host_color              text        not null,
  white_username          text,
  black_username          text,
  time_control_minutes    integer     not null,
  time_control_increment  integer     not null default 0,
  status                  text        not null default 'waiting', -- waiting | active | finished
  winner                  text,                                    -- 'white' | 'black' | 'draw' | null
  created_at              timestamptz default now(),
  started_at              timestamptz,
  ended_at                timestamptz
);

create table moves (
  id           uuid        primary key default gen_random_uuid(),
  game_id      uuid        references games(id) on delete cascade,
  move_number  integer     not null,
  san          text        not null,  -- Standard Algebraic Notation; '--' for a pass
  fen_after    text        not null,  -- Board state after the move
  flags        text,                  -- Comma-separated: 'self_capture', 'pass', 'retaliation'
  created_at   timestamptz default now()
);

-- Row-Level Security
alter table games enable row level security;
alter table moves enable row level security;

-- Intentionally permissive for early testing (no auth system yet).
create policy "Allow public read access to games"  on games for select using (true);
create policy "Allow public insert to games"       on games for insert with check (true);
create policy "Allow public update to games"       on games for update using (true);
create policy "Allow public read access to moves"  on moves for select using (true);
create policy "Allow public insert to moves"       on moves for insert with check (true);

-- Enable realtime for both tables
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table moves;
