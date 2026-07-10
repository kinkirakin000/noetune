-- Noetune Bookmark MVP
-- One row per bookmarked theme per user.
-- Writes are intended to flow through the service-role API.

create table if not exists public.bookmarks (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  stable_theme_key    text        not null,
  theme_snapshot      jsonb       not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint bookmarks_stable_theme_key_not_empty
    check (char_length(trim(stable_theme_key)) > 0),
  constraint bookmarks_stable_theme_key_max_length
    check (char_length(stable_theme_key) <= 512),
  constraint bookmarks_user_theme_unique
    unique (user_id, stable_theme_key)
);

create index if not exists bookmarks_user_updated_at_idx
  on public.bookmarks (user_id, updated_at desc);

alter table public.bookmarks enable row level security;

drop policy if exists "users can read own bookmarks" on public.bookmarks;
create policy "users can read own bookmarks"
  on public.bookmarks
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can delete own bookmarks" on public.bookmarks;
create policy "users can delete own bookmarks"
  on public.bookmarks
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_bookmarks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookmarks_updated_at on public.bookmarks;
create trigger bookmarks_updated_at
  before update on public.bookmarks
  for each row execute procedure public.set_bookmarks_updated_at();
