-- Restrict the trial counter RPC to the server-side service-role API.
-- The exact signature avoids changing privileges for unrelated functions.
revoke execute on function public.consume_trial(uuid) from public;
revoke execute on function public.consume_trial(uuid) from anon;
revoke execute on function public.consume_trial(uuid) from authenticated;
grant execute on function public.consume_trial(uuid) to service_role;
