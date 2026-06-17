-- Run this in the Supabase SQL editor to add the `friends` column the code uses.
-- Your DB has the v2 `characters` table but never ran schema_v3.sql, so this one
-- column was missing — which made the WHOLE cloud save fail (gold/exp/items were
-- never persisted across sessions). The game now degrades gracefully without it,
-- but adding it restores friends-list persistence too. Idempotent, safe to re-run.
alter table public.characters
  add column if not exists friends jsonb default '[]'::jsonb;
