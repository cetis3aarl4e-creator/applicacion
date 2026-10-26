-- ============================================================
--  Habit Tracker · Esquema para Supabase
--  Ejecuta este archivo en: Supabase > SQL Editor > New query
-- ============================================================

create table if not exists public.habits (
  id text primary key,
  name text not null,
  color text,
  icon text,
  frequency text default 'daily',
  archived boolean default false,
  sort_order integer default 0,
  created_at text,
  updated_at text,
  deleted boolean default false
);

create table if not exists public.habit_logs (
  id text primary key,
  habit_id text not null,
  log_date text not null,      -- formato YYYY-MM-DD
  done boolean not null default false,
  updated_at text,
  deleted boolean default false
);

create index if not exists habit_logs_habit_idx on public.habit_logs (habit_id);
create index if not exists habit_logs_date_idx on public.habit_logs (log_date);

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  notes text,
  due_date text,               -- formato YYYY-MM-DD o null
  done boolean default false,
  sort_order integer default 0,
  created_at text,
  updated_at text,
  deleted boolean default false
);

-- ============================================================
--  Acceso con la "anon key" (uso personal de un solo usuario)
--  AVISO: con estas políticas cualquiera que conozca tu URL
--  y tu anon key podría leer/escribir. Para privacidad real,
--  usa Supabase Auth (login) y sustituye `true` por `auth.uid()`.
-- ============================================================
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "anon full access habits" on public.habits;
drop policy if exists "anon full access habit_logs" on public.habit_logs;
drop policy if exists "anon full access tasks" on public.tasks;

create policy "anon full access habits"
  on public.habits for all using (true) with check (true);

create policy "anon full access habit_logs"
  on public.habit_logs for all using (true) with check (true);

create policy "anon full access tasks"
  on public.tasks for all using (true) with check (true);
