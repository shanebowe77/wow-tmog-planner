-- Initial migration. Intentionally empty: it exists to prove the migration
-- path works end to end (local file -> `supabase db push` / MCP -> remote
-- schema_migrations) before any real schema lands in Phase 2.
select 1;
