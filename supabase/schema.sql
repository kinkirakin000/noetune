-- Noetune Supabase schema — Commit 1 draft
-- Apply via Supabase SQL editor or CLI migration.
-- Not yet applied to production.

-- ── profiles ──────────────────────────────────────────────────────────────────
-- One row per authenticated user.
-- Auto-populated via trigger on auth.users insert.
-- All writes from the browser go through /api/* (service role), not direct RLS.

create table if not exists public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  email               text,
  stripe_customer_id  text        unique,
  plan_status         text        not null default 'free',
  -- plan_status values: free | plus | past_due | canceled
  plan_name           text        not null default 'free',
  trial_used_count    integer     not null default 0,
  trial_limit         integer     not null default 5,
  subscription_id     text,
  current_period_end  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Users can read their own profile (needed for Supabase JS client on the browser).
create policy "users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- No direct insert/update policy for the authenticated role.
-- All writes go through /api/* serverless functions using the service role key,
-- which bypasses RLS by default.

-- ── Auto-create profile on signup ────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Auto-update updated_at ────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
