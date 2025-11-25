-- ============================================================================
-- Mundum — COMPLETE backend schema (one file, run once).
-- ============================================================================
-- This single file builds EVERYTHING from scratch, in the right order, so you
-- don't have to run schema.sql / schema_v2.sql / schema_v3.sql separately.
--
-- HOW TO USE
--   1. Supabase -> Authentication -> Sign In / Providers:
--        • ENABLE "Email" (email + password).
--        • In the Email provider, DISABLE "Confirm email" (so players sign up
--          and play immediately).
--        • (Optional) "Anonymous sign-ins" can stay on or off; the game uses
--          email/password.
--   2. Supabase -> SQL Editor -> New query -> paste THIS ENTIRE FILE -> Run.
--      It is idempotent: safe to re-run any time.
--   3. Copy your project URL + the publishable (anon) key into src/config.js.
--   4. To appoint yourself Game Master, see the very bottom of this file.
--
-- ⚠️ This recreates the `characters` table from scratch (DROP ... CASCADE), so
-- running it WIPES existing characters. Fine for development.


-- ============================================================================
-- 1) characters — up to 3 durable rows per player, one per slot.
-- ============================================================================
drop table if exists public.characters cascade;

create table public.characters (
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
  stats      jsonb        default '{}'::jsonb,
  quests     jsonb        default '{}'::jsonb,
  updated_at timestamptz  default now(),
  unique (user_id, slot)
);

create index if not exists characters_user_slot_idx
  on public.characters (user_id, slot);

-- Names are globally unique, case-insensitive.
create unique index if not exists characters_name_lower_uniq
  on public.characters (lower(name));


-- ============================================================================
-- 2) friends — "user_id has befriended friend_name".
-- ============================================================================
create table if not exists public.friends (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  friend_name text        not null,
  created_at  timestamptz default now(),
  primary key (user_id, friend_name)
);


-- ============================================================================
-- 3) bans — one row per banned player. Written by the GM, read by everyone on
--    connect so a banned player is bounced. Single trusted GM, kid game.
-- ============================================================================
create table if not exists public.bans (
  id         uuid        primary key references auth.users (id) on delete cascade,
  name       text,
  reason     text,
  banned_by  text,
  created_at timestamptz default now()
);


-- ============================================================================
-- 4) game_config — one tiny row holding the GM's auth user id. Players may
--    READ it ("am I the GM?") but never write it.
-- ============================================================================
create table if not exists public.game_config (
  k text primary key,
  v text
);


-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.characters enable row level security;
alter table public.friends    enable row level security;
alter table public.bans       enable row level security;
alter table public.game_config enable row level security;

-- characters: anyone authenticated may READ (names/levels visible); writes are
-- restricted to the owner (user_id = auth.uid()).
drop policy if exists "characters_select_all_auth" on public.characters;
create policy "characters_select_all_auth"
  on public.characters for select to authenticated using (true);

drop policy if exists "characters_insert_own" on public.characters;
create policy "characters_insert_own"
  on public.characters for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "characters_update_own" on public.characters;
create policy "characters_update_own"
  on public.characters for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "characters_delete_own" on public.characters;
create policy "characters_delete_own"
  on public.characters for delete to authenticated using (auth.uid() = user_id);

-- friends: a player only sees/manages their own rows.
drop policy if exists "friends_select_own" on public.friends;
create policy "friends_select_own"
  on public.friends for select to authenticated using (auth.uid() = user_id);
drop policy if exists "friends_insert_own" on public.friends;
create policy "friends_insert_own"
  on public.friends for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "friends_update_own" on public.friends;
create policy "friends_update_own"
  on public.friends for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "friends_delete_own" on public.friends;
create policy "friends_delete_own"
  on public.friends for delete to authenticated using (auth.uid() = user_id);

-- bans: everyone authenticated may READ (to bounce a banned player) and INSERT
-- (only the GM ever sees the button) and DELETE (to unban).
drop policy if exists "bans_select_all_auth" on public.bans;
create policy "bans_select_all_auth"
  on public.bans for select to authenticated using (true);
drop policy if exists "bans_insert_auth" on public.bans;
create policy "bans_insert_auth"
  on public.bans for insert to authenticated with check (true);
drop policy if exists "bans_delete_auth" on public.bans;
create policy "bans_delete_auth"
  on public.bans for delete to authenticated using (true);

-- game_config: read-only for players (only the SQL editor / service role writes).
drop policy if exists "game_config_select_all_auth" on public.game_config;
create policy "game_config_select_all_auth"
  on public.game_config for select to authenticated using (true);


-- ============================================================================
-- 5) Character-name validation trigger (server-side guarantee).
--    • lowercase letters + digits only, length 2..16, no spaces/symbols
--    • the reserved name "gm" only for the configured Game Master account
-- ============================================================================
create or replace function public.validate_character_name()
returns trigger
language plpgsql
as $$
declare
  v_gm_id text;
  v_name  text := lower(coalesce(new.name, ''));
begin
  if v_name = '' then
    return new;  -- partial upsert with no name; client always sends a real one
  end if;

  if v_name !~ '^[a-z0-9]{2,16}$' then
    raise exception 'invalid name: use 2-16 lowercase letters or digits, no spaces or symbols';
  end if;

  if v_name = 'gm' then
    select v into v_gm_id from public.game_config where k = 'gm_user_id';
    if v_gm_id is null or new.user_id::text <> v_gm_id then
      raise exception 'the name "gm" is reserved';
    end if;
  end if;

  new.name := v_name;  -- store normalized to lowercase
  return new;
end;
$$;

drop trigger if exists trg_validate_character_name on public.characters;
create trigger trg_validate_character_name
  before insert or update of name on public.characters
  for each row execute function public.validate_character_name();


-- ============================================================================
-- 6) execute_trade — ATOMIC, server-authoritative item swap (v2-aware: finds
--    each player's bag by user_id). backpack is a JSONB array of
--    {"item":"sword","qty":1}; p_give leaves the caller, p_receive joins them.
-- ============================================================================
create or replace function public._bag_contains(bag jsonb, need jsonb)
returns boolean language plpgsql immutable as $$
declare rec jsonb; it text; q numeric; have numeric;
begin
  if need is null or jsonb_typeof(need) <> 'array' then return true; end if;
  for rec in select * from jsonb_array_elements(coalesce(need, '[]'::jsonb)) loop
    it := rec->>'item'; q := coalesce((rec->>'qty')::numeric, 1);
    if it is null then continue; end if;
    select coalesce(sum(coalesce((e->>'qty')::numeric, 1)), 0) into have
      from jsonb_array_elements(coalesce(bag, '[]'::jsonb)) e where e->>'item' = it;
    if have < q then return false; end if;
  end loop;
  return true;
end; $$;

create or replace function public._bag_remove(bag jsonb, take jsonb)
returns jsonb language plpgsql immutable as $$
declare rec jsonb; it text; q numeric; out_bag jsonb := coalesce(bag, '[]'::jsonb);
        e jsonb; remaining numeric; ev numeric; new_bag jsonb;
begin
  if take is null or jsonb_typeof(take) <> 'array' then return out_bag; end if;
  for rec in select * from jsonb_array_elements(take) loop
    it := rec->>'item'; q := coalesce((rec->>'qty')::numeric, 1);
    if it is null then continue; end if;
    remaining := q; new_bag := '[]'::jsonb;
    for e in select * from jsonb_array_elements(out_bag) loop
      if e->>'item' = it and remaining > 0 then
        ev := coalesce((e->>'qty')::numeric, 1);
        if ev <= remaining then remaining := remaining - ev;
        else new_bag := new_bag || jsonb_build_array(jsonb_set(e, '{qty}', to_jsonb(ev - remaining))); remaining := 0;
        end if;
      else new_bag := new_bag || jsonb_build_array(e);
      end if;
    end loop;
    out_bag := new_bag;
  end loop;
  return out_bag;
end; $$;

create or replace function public._bag_add(bag jsonb, give jsonb)
returns jsonb language plpgsql immutable as $$
begin
  if give is null or jsonb_typeof(give) <> 'array' then return coalesce(bag, '[]'::jsonb); end if;
  return coalesce(bag, '[]'::jsonb) || give;
end; $$;

drop function if exists public.execute_trade(uuid, jsonb, jsonb);
create or replace function public.execute_trade(p_partner uuid, p_give jsonb, p_receive jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_my_id uuid; v_their_id uuid;
  v_my_bag jsonb; v_their_bag jsonb;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if p_partner is null or p_partner = v_me then raise exception 'invalid trade partner'; end if;

  -- Lock both players' ACTIVE character rows (slot 0) in a stable order. In the
  -- v2 schema a player is identified by user_id, so look the bag up by user_id.
  if v_me < p_partner then
    select id, backpack into v_my_id,    v_my_bag    from public.characters where user_id = v_me      order by slot limit 1 for update;
    select id, backpack into v_their_id, v_their_bag from public.characters where user_id = p_partner order by slot limit 1 for update;
  else
    select id, backpack into v_their_id, v_their_bag from public.characters where user_id = p_partner order by slot limit 1 for update;
    select id, backpack into v_my_id,    v_my_bag    from public.characters where user_id = v_me      order by slot limit 1 for update;
  end if;

  if v_my_id is null then raise exception 'your character not found'; end if;
  if v_their_id is null then raise exception 'partner character not found'; end if;

  if not public._bag_contains(v_my_bag, p_give) then raise exception 'you no longer own the offered items'; end if;
  if not public._bag_contains(v_their_bag, p_receive) then raise exception 'partner no longer owns the offered items'; end if;

  v_my_bag    := public._bag_add(public._bag_remove(v_my_bag,    p_give),    p_receive);
  v_their_bag := public._bag_add(public._bag_remove(v_their_bag, p_receive), p_give);

  update public.characters set backpack = v_my_bag,    updated_at = now() where id = v_my_id;
  update public.characters set backpack = v_their_bag, updated_at = now() where id = v_their_id;
  return jsonb_build_object('ok', true);
end; $$;

grant execute on function public.execute_trade(uuid, jsonb, jsonb) to authenticated;


-- ============================================================================
-- 7) APPOINT THE GAME MASTER  (do this ONCE, after first sign-in)
-- ============================================================================
--   1. Sign into the game and create any character (any allowed name).
--   2. Supabase -> Authentication -> Users -> copy your account's UUID.
--   3. Uncomment the two statements below, paste your UUID in BOTH, and Run:
--
-- insert into public.game_config (k, v)
--   values ('gm_user_id', 'PASTE-YOUR-AUTH-UUID-HERE')
--   on conflict (k) do update set v = excluded.v;
--
-- update public.characters set name = 'gm'
--   where user_id = 'PASTE-YOUR-AUTH-UUID-HERE' and slot = 0;
--
-- Then log in with that account: the hero "gm" gets the GM panel, 5x speed and
-- the teleport tools. Nobody else can ever take the name "gm".
--
-- End of complete schema.
