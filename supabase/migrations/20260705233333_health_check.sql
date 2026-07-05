-- Trivial RPC so the app can prove it reaches the database through the
-- anon-key client (used by /api/health).
create or replace function public.health()
returns text
language sql
stable
as $$
  select 'ok'::text;
$$;

comment on function public.health() is 'Trivial health check called by the app''s /api/health route.';

grant execute on function public.health() to anon, authenticated;
