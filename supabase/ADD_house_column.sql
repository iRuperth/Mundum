-- Run this in the Supabase SQL editor to add the `house` column the code uses.
-- Stores the character's single owned house: which lot, the showcase walls (items
-- + per-slot for-sale flags & prices), exterior/interior colours, light
-- temperature and the visitor ban list.
--   { "owned": { "lotId": "oakvale:h3", "city": "oakvale", "boughtAt": 0 },
--     "walls": { "0": [ {"item":{...},"forSale":false,"price":0}, null, ... ] },
--     "colors": { "wall": 13481106, "roof": 7311162, ... },
--     "light": "warm", "bans": ["someone"], "closed": false }
-- The game degrades gracefully without it (local save still keeps the house, and
-- the cloud save strips the unknown column and retries), but adding it makes the
-- house persist to the account across devices. Idempotent, safe to re-run.
alter table public.characters
  add column if not exists house jsonb default '{"owned":null}'::jsonb;
