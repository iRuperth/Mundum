-- Mundum schema migration v2: multiple characters per user (up to 3).
--
-- WHAT THIS DOES
--   The original schema (schema.sql) had ONE character row per user, keyed by
--   id = auth.users(id). This migration moves the `characters` table to a
--   surrogate primary key so a single user can own up to 3 characters, each in
--   its own slot (0..2).
--
-- SETUP, step by step:
--   1. In Supabase: Authentication -> Sign In / Providers -> ENABLE the "Email"
--      provider (email + password).
--   2. In that same Email provider's settings, DISABLE "Confirm email" so new
--      accounts are signed in immediately (the client signs up and plays right
--      away; no confirmation round-trip).
--   3. Open SQL Editor -> New query, paste THIS ENTIRE FILE, and click "Run".
--      It is idempotent and safe to re-run.
--   4. Anonymous sign-in from schema.sql can stay enabled or be turned off; the
--      Auth module (src/auth.js) uses email/password.
--
-- IMPORTANT: the original `characters` table used id = auth.users(id) as the
-- primary key, which cannot hold multiple rows per user. The cleanest path for
-- this dev project is to recreate the table with a surrogate id. THE DROP BELOW
-- WIPES ALL EXISTING CHARACTERS. That is acceptable here (early development).
-- If you ever need to preserve data, migrate rows out before running this.


-- characters: now up to 3 durable rows per player, one per slot.
-- We drop-and-recreate because the primary key changes from auth.users(id) to a
-- surrogate uuid; this is the simplest correct path. WARNING: wipes characters.
drop table if exists public.characters cascade;

create table if not exists public.characters (
  id         uuid         primary key default gen_random_uuid(),
  user_id    uuid         not null references auth.users (id) on delete cascade,
  slot       int          not null default 0,
  name       text,
  sex        text,
  hair       text,
  colors     jsonb        default '{}'::jsonb,
  profession text,
  level      int          default 1,
  exp        bigint       default 0,
  gold       bigint       default 0,
  equipment  jsonb        default '{}'::jsonb,
  backpack   jsonb        default '[]'::jsonb,
  depot      jsonb        default '[]'::jsonb,
  pos        jsonb        default '{}'::jsonb,
  updated_at timestamptz  default now(),
  unique (user_id, slot)
);

-- Idempotent column guards. The create-table above already defines these, but
-- these statements make the migration safe to run against a table that was
-- partially upgraded by hand. (No-ops when the columns already exist.)
alter table public.characters add column if not exists id         uuid    default gen_random_uuid();
alter table public.characters add column if not exists user_id    uuid;
alter table public.characters add column if not exists slot       int     default 0;
alter table public.characters add column if not exists profession text;

-- Helps the per-user roster query (where user_id = ... order by slot).
create index if not exists characters_user_slot_idx
  on public.characters (user_id, slot);


-- Row Level Security
alter table public.characters enable row level security;

-- Any authenticated player may READ all characters (so other players' names and
-- levels can be shown). Keep it simple: full read access for authenticated.
drop policy if exists "characters_select_all_auth" on public.characters;
create policy "characters_select_all_auth"
  on public.characters for select
  to authenticated
  using (true);

-- Writes are restricted to the owner: user_id must equal auth.uid().
drop policy if exists "characters_insert_own" on public.characters;
create policy "characters_insert_own"
  on public.characters for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "characters_update_own" on public.characters;
create policy "characters_update_own"
  on public.characters for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "characters_delete_own" on public.characters;
create policy "characters_delete_own"
  on public.characters for delete
  to authenticated
  using (auth.uid() = user_id);


-- Optional: cap 3 characters per user at the database level. The unique
-- (user_id, slot) constraint plus slots 0..2 already bounds this to 3 when the
-- client picks slots correctly, and src/auth.js ALSO enforces the cap before
-- inserting. The trigger below is belt-and-suspenders; uncomment to enable.
--
-- create or replace function public.enforce_character_cap()
-- returns trigger
-- language plpgsql
-- as $$
-- begin
--   if (select count(*) from public.characters where user_id = new.user_id) >= 3 then
--     raise exception 'character limit reached (max 3 per user)';
--   end if;
--   return new;
-- end;
-- $$;
--
-- drop trigger if exists characters_cap on public.characters;
-- create trigger characters_cap
--   before insert on public.characters
--   for each row execute function public.enforce_character_cap();

-- End of migration v2.
