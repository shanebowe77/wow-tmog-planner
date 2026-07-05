-- Pin search_path (Supabase security lint 0011); health() references no
-- objects, but keep the advisor baseline at zero warnings.
alter function public.health() set search_path = '';
