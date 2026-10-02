-- =====================================================
-- BADMINTON MANAGER - chạy toàn bộ file này trong
-- Supabase Dashboard > SQL Editor > New query > Run
-- =====================================================
create extension if not exists "pgcrypto";

-- 1. BẢNG ------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  default_court_price integer not null default 0,
  default_shuttle_price integer not null default 0,
  qr_path text,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  played_on date not null,
  location text,
  court_price integer not null default 0,
  shuttle_price integer not null default 0,
  shuttle_count integer not null default 0,
  note text,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.session_players (
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (session_id, player_id)
);

create index on public.players (team_id);
create index on public.sessions (team_id, played_on desc);
create index on public.session_players (player_id);

-- 2. HÀM KIỂM TRA CHỦ TEAM -----------------------------
create or replace function public.is_team_owner(tid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.teams where id = tid and owner_id = auth.uid());
$$;

-- 3. ROW LEVEL SECURITY --------------------------------
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.sessions enable row level security;
alter table public.session_players enable row level security;

create policy "teams_owner_all" on public.teams
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "players_owner_all" on public.players
  for all to authenticated
  using (public.is_team_owner(team_id)) with check (public.is_team_owner(team_id));

create policy "sessions_owner_all" on public.sessions
  for all to authenticated
  using (public.is_team_owner(team_id)) with check (public.is_team_owner(team_id));

create policy "session_players_owner_all" on public.session_players
  for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and public.is_team_owner(s.team_id)))
  with check (exists (select 1 from public.sessions s where s.id = session_id and public.is_team_owner(s.team_id)));

-- 4. STORAGE: bucket "qr" lưu ảnh QR ngân hàng ---------
insert into storage.buckets (id, name, public)
values ('qr', 'qr', true)
on conflict (id) do nothing;

-- ảnh QR đặt trong thư mục <team_id>/...
create policy "qr_public_read" on storage.objects
  for select using (bucket_id = 'qr');

create policy "qr_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'qr' and public.is_team_owner(((storage.foldername(name))[1])::uuid));

create policy "qr_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'qr' and public.is_team_owner(((storage.foldername(name))[1])::uuid));

create policy "qr_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'qr' and public.is_team_owner(((storage.foldername(name))[1])::uuid));

-- 5. BUỔI ĂN -------------------------------------------
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  eaten_on date not null,
  title text,                              -- tên quán / ghi chú ngắn
  total_amount integer not null default 0, -- tổng tiền bữa ăn
  note text,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.meal_players (
  meal_id uuid not null references public.meals(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (meal_id, player_id)
);

create index on public.meals (team_id, eaten_on desc);
create index on public.meal_players (player_id);

alter table public.meals enable row level security;
alter table public.meal_players enable row level security;

create policy "meals_owner_all" on public.meals
  for all to authenticated
  using (public.is_team_owner(team_id)) with check (public.is_team_owner(team_id));

create policy "meal_players_owner_all" on public.meal_players
  for all to authenticated
  using (exists (select 1 from public.meals m where m.id = meal_id and public.is_team_owner(m.team_id)))
  with check (exists (select 1 from public.meals m where m.id = meal_id and public.is_team_owner(m.team_id)));
