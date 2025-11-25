-- Mundum backend — migration v3: character-name rules + the Game Master.
--
-- ⚠️ ORDER MATTERS. Run the migrations in this order in Supabase -> SQL Editor:
--      1. schema.sql      (base tables + trade RPC)
--      2. schema_v2.sql   (multi-character table — REQUIRED, it recreates
--                          `characters` with a `user_id` column)
--      3. schema_v3.sql   (THIS FILE — name rules + GM)
--   If you only ran schema.sql you'll get "relation public.characters does not
--   exist" or a column error here, because v3 expects the v2 table shape
--   (columns: id, user_id, slot, name, …). Run schema_v2.sql first.
--
-- WHAT THIS DOES (idempotent, safe to re-run):
--   1. Enforces character-name rules on the SERVER (not just the browser):
--        • lowercase letters and digits only  (^[a-z0-9]{2,16}$)
--        • no spaces, dashes, dots or any symbol
--        • the reserved name "gm" can ONLY belong to the Game Master account
--   2. Keeps names unique (case-insensitive).
--   3. Lets you appoint exactly ONE Game Master by auth user id (see the bottom).
--
-- The browser already blocks bad names for a friendly message, but these rules
-- are what GUARANTEE nobody can create "gm" or a symbol name — the client can be
-- bypassed, the database cannot.


-- Safety guard: make sure the v2 `characters` table exists with a `user_id`
-- column before we attach the trigger. If this raises, run schema_v2.sql first.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'characters' and column_name = 'user_id'
  ) then
    raise exception 'characters.user_id is missing — run schema_v2.sql BEFORE schema_v3.sql';
  end if;
end $$;


-- A tiny single-row config table holding the GM's auth user id. RLS-locked so
-- players may read it (the client can check "am I the GM?") but never write it.
create table if not exists public.game_config (
  k text primary key,
  v text
);
alter table public.game_config enable row level security;

drop policy if exists "game_config_select_all_auth" on public.game_config;
create policy "game_config_select_all_auth"
  on public.game_config for select
  to authenticated
  using (true);
-- No insert/update/delete policy => only the service role / SQL editor can write
-- it. Players cannot make themselves the GM.


-- Case-insensitive unique name index (no two players share a name). v2 already
-- creates this; the IF NOT EXISTS makes re-running harmless.
create unique index if not exists characters_name_lower_uniq
  on public.characters (lower(name));


-- The validation trigger: runs before every insert/update of a character name.
-- Rejects bad names and reserves "gm" for the configured GM auth user.
-- NOTE: in the v2 schema the OWNER column is `user_id` (the row's own `id` is a
-- surrogate), so the GM check compares new.user_id to the configured GM id.
create or replace function public.validate_character_name()
returns trigger
language plpgsql
as $$
declare
  v_gm_id text;
  v_name  text := lower(coalesce(new.name, ''));
begin
  -- Allow an empty/unset name through (partial upserts); the client always sends
  -- a real name, which then has to obey the rules below.
  if v_name = '' then
    return new;
  end if;

  -- Format: lowercase letters + digits only, length 2..16.
  if v_name !~ '^[a-z0-9]{2,16}$' then
    raise exception 'invalid name: use 2-16 lowercase letters or digits, no spaces or symbols';
  end if;

  -- Reserve "gm": only the configured Game Master account may carry it.
  if v_name = 'gm' then
    select v into v_gm_id from public.game_config where k = 'gm_user_id';
    if v_gm_id is null or new.user_id::text <> v_gm_id then
      raise exception 'the name "gm" is reserved';
    end if;
  end if;

  -- Store the name normalized to lowercase so it always matches the rules.
  new.name := v_name;
  return new;
end;
$$;

drop trigger if exists trg_validate_character_name on public.characters;
create trigger trg_validate_character_name
  before insert or update of name on public.characters
  for each row execute function public.validate_character_name();


-- =====================================================================
-- APPOINT THE GAME MASTER  (do this ONCE, with YOUR own account)
-- =====================================================================
-- Steps:
--   1. Sign into the game normally with the account you want to be the GM and
--      create any character (any allowed name). This makes your auth user exist.
--   2. Find your user id:  Supabase -> Authentication -> Users -> copy the UUID.
--   3. Run the two statements below, pasting your UUID in BOTH places.
--
-- (Leave them commented out until you have your UUID; then uncomment and run.)
--
-- insert into public.game_config (k, v)
--   values ('gm_user_id', 'PASTE-YOUR-AUTH-UUID-HERE')
--   on conflict (k) do update set v = excluded.v;
--
-- update public.characters set name = 'gm'
--   where user_id = 'PASTE-YOUR-AUTH-UUID-HERE'
--     and slot = 0;   -- rename your first character to "gm"
--
-- After that, log into the game with that account: the hero named "gm" gets the
-- Game Master panel, 5x speed and the teleport tools. No one else can take the
-- name "gm" — the trigger above rejects it for every other account.
--
-- End of migration v3.
