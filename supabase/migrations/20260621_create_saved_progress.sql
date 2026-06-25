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
