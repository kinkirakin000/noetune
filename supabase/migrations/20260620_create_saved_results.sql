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
