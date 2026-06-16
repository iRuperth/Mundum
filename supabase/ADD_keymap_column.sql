-- Run this in the Supabase SQL editor to add the `keymap` column the code uses.
-- Stores each character's rebound game-action keys (movement, jump, camera, etc.)
-- as { actionId: "KeyboardEvent.code" }, e.g. { "jump": "KeyJ", "forward": "KeyW" }.
-- The game degrades gracefully without it (local save still keeps the keymap, and
-- the cloud save strips the unknown column and retries), but adding it makes each
-- character's key bindings persist to the account across devices. Idempotent.
alter table public.characters
  add column if not exists keymap jsonb default '{}'::jsonb;
