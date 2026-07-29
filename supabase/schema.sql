-- Noetune Supabase schema — Commit 3 final
-- Apply via Supabase SQL editor or CLI.
-- Idempotent: safe to re-run against an existing database.

-- ── profiles ──────────────────────────────────────────────────────────────────
-- One row per authenticated user.
-- Auto-created via trigger on auth.users insert.
--
-- PAYMENT TRUTH
--   plan_status is the authoritative payment state for this user.
--   It is never stored in localStorage or any client-side storage.
--   Only /api/* serverless functions (service role) may write plan_status.
--   Stripe webhook (/api/stripe-webhook, Commit 6) is the sole writer of
--   plan_status after the initial signup row is created by the trigger.
--
-- TRIAL TRUTH
--   trial_used_count is the authoritative trial session counter.
--   It is incremented by /api/consume-trial only when the result screen
--   is shown (not on session start or abandonment).
--   It is never incremented from client-side JavaScript.

create table if not exists public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  email               text,
  stripe_customer_id  text        unique,
  plan_status         text        not null default 'free',
  plan_name           text        not null default 'free',
  trial_used_count    integer     not null default 0,
  trial_limit         integer     not null default 5,
  subscription_id     text,
  current_period_end  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- CHECK constraint on plan_status.
-- DROP + ADD pattern ensures idempotency across re-runs.
alter table public.profiles
  drop constraint if exists profiles_plan_status_check;
alter table public.profiles
  add constraint profiles_plan_status_check
    check (plan_status in ('free', 'plus', 'past_due', 'canceled'));

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- SELECT: users may read their own profile row.
-- The browser uses /api/me (service role) for profile data as the primary path,
-- but this policy is needed for any direct Supabase JS client reads.
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- INSERT / UPDATE / DELETE: no policy for the authenticated role.
-- All writes go through /api/* serverless functions using the service role key.
-- The service role bypasses RLS by design, so no explicit policy is needed.
--
-- Consequence: the browser CANNOT directly modify any profile field,
-- including plan_status, stripe_customer_id, subscription_id, or
-- trial_used_count. All mutations are server-authoritative.

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

-- ── saved_results ────────────────────────────────────────────────────────────
-- Personal result records. Writes use /api/save-result with the service role.
create table if not exists public.saved_results (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  client_ref          text        not null,
  selected_theme_key  text,
  wish_group_key      text,
  wish_key            text,
  wish_theme_key      text,
  theme_label         text,
  user_answers        jsonb       not null default '{}'::jsonb,
  before_score        text,
  after_score         text,
  result_summary      text,
  result_card_data    jsonb       not null default '{}'::jsonb,
  language            text        not null default 'en',
  created_at          timestamptz not null default now(),
  unique (user_id, client_ref)
);

alter table public.saved_results enable row level security;

drop policy if exists "users can read own saved results" on public.saved_results;
create policy "users can read own saved results"
  on public.saved_results
  for select
  using (auth.uid() = user_id);

-- No client INSERT/UPDATE/DELETE policy. Mutations use the service role API.

-- ── saved_progress ───────────────────────────────────────────────────────────
-- One resumable V13 flow per user. Mutations use /api/save-progress.
create table if not exists public.saved_progress (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null unique references auth.users(id) on delete cascade,
  theme_key           text,
  wish_group_key      text,
  wish_key            text,
  wish_theme_key      text,
  theme_label         text,
  current_step        text        not null default 's-v13-nonideal',
  nonideal_answers    jsonb       not null default '[]'::jsonb,
  ideal_answers       jsonb       not null default '[]'::jsonb,
  before_score        text,
  current_score       text,
  language            text        not null default 'en',
  progress_data       jsonb       not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.saved_progress enable row level security;

drop policy if exists "users can read own saved progress" on public.saved_progress;
create policy "users can read own saved progress"
  on public.saved_progress
  for select
  using (auth.uid() = user_id);

-- No client mutation policy. The service role API owns writes and deletes.

-- ── consume_trial RPC ─────────────────────────────────────────────────────────
-- Atomic check-and-increment for trial consumption.
-- Uses FOR UPDATE to lock the row, preventing TOCTOU race conditions when
-- the result screen is shown in multiple concurrent tabs/requests.
--
-- Returns a JSON object with the same shape as /api/consume-trial responses:
--   { allowed, unlimited, locked, trialUsedCount, trialLimit, remaining }
create or replace function public.consume_trial(p_user_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v profiles%rowtype;
  v_new_count integer;
begin
  -- Lock the row for this transaction to prevent concurrent increments.
  select * into v from public.profiles where id = p_user_id for update;

  if not found then
    return jsonb_build_object('allowed', true, 'unlimited', false, 'locked', false, 'loggedIn', true);
  end if;

  -- Paid user — no trial logic applies.
  if v.plan_status = 'plus' then
    return jsonb_build_object('allowed', true, 'unlimited', true, 'locked', false, 'loggedIn', true);
  end if;

  -- Non-renewing statuses — treat as locked.
  if v.plan_status in ('past_due', 'canceled') then
    return jsonb_build_object(
      'allowed', false, 'unlimited', false, 'locked', true, 'loggedIn', true,
      'trialUsedCount', v.trial_used_count, 'trialLimit', v.trial_limit, 'remaining', 0
    );
  end if;

  -- Free user: check limit before incrementing.
  if v.trial_used_count >= v.trial_limit then
    return jsonb_build_object(
      'allowed', false, 'unlimited', false, 'locked', true, 'loggedIn', true,
      'trialUsedCount', v.trial_used_count, 'trialLimit', v.trial_limit, 'remaining', 0
    );
  end if;

  -- Atomically increment.
  v_new_count := v.trial_used_count + 1;
  update public.profiles set trial_used_count = v_new_count where id = p_user_id;

  return jsonb_build_object(
    'allowed', true, 'unlimited', false, 'locked', false, 'loggedIn', true,
    'trialUsedCount', v_new_count, 'trialLimit', v.trial_limit,
    'remaining', v.trial_limit - v_new_count
  );
end;
$$;

-- The trial counter RPC is callable only by the server-side service-role API.
-- Keep this grant scoped to the exact public.consume_trial(uuid) signature.
revoke execute on function public.consume_trial(uuid) from public;
revoke execute on function public.consume_trial(uuid) from anon;
revoke execute on function public.consume_trial(uuid) from authenticated;
grant execute on function public.consume_trial(uuid) to service_role;
