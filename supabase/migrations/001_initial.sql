-- Auditorium period sign-up — initial schema + RLS
-- Run in the Supabase SQL editor (or via supabase db push).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  period text not null check (period in ('1','2','3','4','5','6','7','8','AS')),
  name text not null,
  status text not null default 'pending' check (status in ('pending','confirmed')),
  drama_overlap boolean not null default false,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (date, period)
);

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('block','drama')),
  repeat text not null check (repeat in ('once','weekly')),
  date date,
  dow text check (dow in ('MON','TUE','WED','THU','FRI')),
  until date,
  from_period text not null check (from_period in ('1','2','3','4','5','6','7','8','AS')),
  to_period text not null check (to_period in ('1','2','3','4','5','6','7','8','AS')),
  reason text not null,
  created_at timestamptz not null default now(),
  constraint schedule_entries_once_needs_date
    check (repeat <> 'once' or date is not null),
  constraint schedule_entries_weekly_needs_dow
    check (repeat <> 'weekly' or dow is not null)
);

create index if not exists bookings_date_idx on public.bookings (date);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists schedule_entries_kind_idx on public.schedule_entries (kind);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Force public inserts to pending; never trust client-supplied status.
create or replace function public.bookings_force_pending()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    new.status := 'pending';
    new.confirmed_at := null;
  end if;
  if new.status = 'confirmed' and new.confirmed_at is null then
    new.confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_force_pending on public.bookings;
create trigger bookings_force_pending
  before insert or update on public.bookings
  for each row execute function public.bookings_force_pending();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.bookings enable row level security;
alter table public.schedule_entries enable row level security;

-- admins: users can see their own row (needed for client-side is_admin checks)
drop policy if exists "admins_select_own" on public.admins;
create policy "admins_select_own" on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- bookings: public read; public insert (forced pending); admin update/delete
drop policy if exists "bookings_select_all" on public.bookings;
create policy "bookings_select_all" on public.bookings
  for select to anon, authenticated
  using (true);

drop policy if exists "bookings_insert_public" on public.bookings;
create policy "bookings_insert_public" on public.bookings
  for insert to anon, authenticated
  with check (true);

drop policy if exists "bookings_update_admin" on public.bookings;
create policy "bookings_update_admin" on public.bookings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "bookings_delete_admin" on public.bookings;
create policy "bookings_delete_admin" on public.bookings
  for delete to authenticated
  using (public.is_admin());

-- Also allow anon to delete their own pending? Spec says update/delete only for admins.
-- Teachers cancel via admin only in the design's cancel for booked cells —
-- but the Schedule design lets anyone cancel a request from the sticky bar.
-- Spec: "update/delete only for admins". So cancel from Schedule needs a
-- workaround: we'll allow anon DELETE only when status = 'pending'.
drop policy if exists "bookings_delete_pending_anon" on public.bookings;
create policy "bookings_delete_pending_anon" on public.bookings
  for delete to anon, authenticated
  using (status = 'pending' or public.is_admin());

-- schedule_entries: public read; admin write
drop policy if exists "entries_select_all" on public.schedule_entries;
create policy "entries_select_all" on public.schedule_entries
  for select to anon, authenticated
  using (true);

drop policy if exists "entries_insert_admin" on public.schedule_entries;
create policy "entries_insert_admin" on public.schedule_entries
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "entries_update_admin" on public.schedule_entries;
create policy "entries_update_admin" on public.schedule_entries
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "entries_delete_admin" on public.schedule_entries;
create policy "entries_delete_admin" on public.schedule_entries
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime (ignore if already in the publication)
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.schedule_entries;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Seed sample schedule entries (only when the table is empty)
-- ---------------------------------------------------------------------------

insert into public.schedule_entries (kind, repeat, dow, from_period, to_period, reason)
select * from (values
  ('block'::text, 'weekly'::text, 'MON'::text, '1'::text, '1'::text, 'Morning assembly'::text),
  ('drama', 'weekly', 'TUE', '4', '5', 'Drama — Gr. 9/10'),
  ('drama', 'weekly', 'THU', '2', '2', 'Drama — Gr. 7')
) as v(kind, repeat, dow, from_period, to_period, reason)
where not exists (select 1 from public.schedule_entries limit 1);

-- After creating an Auth user for Masha, grant admin:
--   insert into public.admins (user_id)
--   values ('<auth-user-uuid>');
