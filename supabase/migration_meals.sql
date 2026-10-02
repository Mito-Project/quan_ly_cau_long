-- =====================================================
-- THÊM TÍNH NĂNG BUỔI ĂN
-- Chạy file này trong Supabase > SQL Editor > New query > Run
-- (DB đã có sẵn từ trước, chỉ cần chạy file này 1 lần)
-- =====================================================
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
