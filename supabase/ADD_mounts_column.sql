-- Run this in the Supabase SQL editor to add the `mounts` column the code uses.
-- Stores each character's owned/active mounts: { "owned": [...ids], "active": id }.
-- The game degrades gracefully without it (local save still keeps mounts, and the
-- cloud save strips the unknown column and retries), but adding it makes mounts
-- persist to the account across devices. Idempotent, safe to re-run.
alter table public.characters
  add column if not exists mounts jsonb default '{"owned":[],"active":null}'::jsonb;
