-- Profiles and server-only trial RPC foundation.
-- This migration intentionally excludes saved_* tables, bookmarks, and the
-- later Stripe subscription contract columns.

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

alter table public.profiles
  drop constraint if exists profiles_plan_status_check;
alter table public.profiles
  add constraint profiles_plan_status_check
    check (plan_status in ('free', 'plus', 'past_due', 'canceled'));

alter table public.profiles enable row level security;

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

create or replace function public.consume_trial(p_user_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v profiles%rowtype;
  v_new_count integer;
begin
  select * into v from public.profiles where id = p_user_id for update;

  if not found then
    return jsonb_build_object('allowed', true, 'unlimited', false, 'locked', false, 'loggedIn', true);
  end if;

  if v.plan_status = 'plus' then
    return jsonb_build_object('allowed', true, 'unlimited', true, 'locked', false, 'loggedIn', true);
  end if;

  if v.plan_status in ('past_due', 'canceled') then
    return jsonb_build_object(
      'allowed', false, 'unlimited', false, 'locked', true, 'loggedIn', true,
      'trialUsedCount', v.trial_used_count, 'trialLimit', v.trial_limit, 'remaining', 0
    );
  end if;

  if v.trial_used_count >= v.trial_limit then
    return jsonb_build_object(
      'allowed', false, 'unlimited', false, 'locked', true, 'loggedIn', true,
      'trialUsedCount', v.trial_used_count, 'trialLimit', v.trial_limit, 'remaining', 0
    );
  end if;

  v_new_count := v.trial_used_count + 1;
  update public.profiles set trial_used_count = v_new_count where id = p_user_id;

  return jsonb_build_object(
    'allowed', true, 'unlimited', false, 'locked', false, 'loggedIn', true,
    'trialUsedCount', v_new_count, 'trialLimit', v.trial_limit,
    'remaining', v.trial_limit - v_new_count
  );
end;
$$;

revoke execute on function public.consume_trial(uuid) from public;
revoke execute on function public.consume_trial(uuid) from anon;
revoke execute on function public.consume_trial(uuid) from authenticated;
grant execute on function public.consume_trial(uuid) to service_role;
