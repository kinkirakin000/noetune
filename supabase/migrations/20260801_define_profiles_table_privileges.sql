-- Least-privilege table grants for the server-authoritative profiles boundary.
revoke all on table public.profiles from anon, authenticated, service_role;

grant select
on table public.profiles
to authenticated;

grant select, insert, update, delete
on table public.profiles
to service_role;
