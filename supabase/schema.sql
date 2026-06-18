-- ############################################################################
-- DEPRECATED — DO NOT DEPLOY THIS FILE.
-- This is the legacy v1 schema. It lacks game_config / market / mounts / houses
-- and its `bans` policies are world-writable (any player can ban/unban anyone).
-- Deploy supabase/schema_all.sql instead (it has the corrected GM-only bans RLS
-- and every newer table). Kept only for historical reference.
-- ############################################################################
--
-- Mundum backend schema (Supabase / Postgres)
--
-- SETUP, step by step:
--   1. Open your Supabase project -> SQL Editor -> New query.
--   2. Paste this entire file and click "Run". It is idempotent, so you can
--      re-run it any time without errors.
--   3. Go to Authentication -> Sign In / Providers and ENABLE
--      "Anonymous sign-ins". The game signs players in anonymously.
--   4. Done. Copy your project URL and the "publishable" (anon) key into
--      src/config.js. Real security lives in the Row Level Security policies
--      below, so the anon key is safe to ship to the browser.
--
-- NOTE on realtime: presence, position and chat use Supabase Realtime
-- BROADCAST + PRESENCE, which are ephemeral and require NO tables and NO
-- publication changes. Only durable data (the character row, the atomic trade)
-- ever touches these tables.


-- characters: one durable row per player, keyed to the auth user.
create table if not exists public.characters (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  sex        text,
  hair       text,
  colors     jsonb        default '{}'::jsonb,
  level      int          default 1,
  exp        bigint       default 0,
  gold       bigint       default 0,
  equipment  jsonb        default '{}'::jsonb,
  backpack   jsonb        default '[]'::jsonb,
  depot      jsonb        default '[]'::jsonb,
  pos        jsonb        default '{}'::jsonb,
  -- Character progression: use-skill levels/tries (sword/axe/distance/magic…),
  -- spent skill points (spByTier) and skill-tree levels. From charStats.serialize().
  stats      jsonb        default '{}'::jsonb,
  updated_at timestamptz  default now()
);

-- Add `stats` to characters tables created before this column existed (safe to
-- re-run; no-op when it already exists).
alter table public.characters add column if not exists stats jsonb default '{}'::jsonb;

-- friends: each row is "user_id has befriended friend_name".
create table if not exists public.friends (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  friend_name text        not null,
  created_at  timestamptz default now(),
  primary key (user_id, friend_name)
);

-- bans: one row per banned player. Written by the Game Master ("GM Maple") and
-- read by everyone on connect so a banned player is bounced out. This is a
-- kid-friendly game with a single trusted GM, so any authenticated player may
-- insert a ban; the client only ever exposes the ban button to GM Maple.
create table if not exists public.bans (
  id         uuid        primary key references auth.users (id) on delete cascade,
  name       text,
  reason     text,
  banned_by  text,
  created_at timestamptz default now()
);


-- Row Level Security
alter table public.characters enable row level security;
alter table public.friends    enable row level security;
alter table public.bans       enable row level security;

-- characters
-- Any authenticated player may READ characters (so others' names/levels show
-- up). Writes are restricted to the player's own row.
drop policy if exists "characters_select_all_auth" on public.characters;
create policy "characters_select_all_auth"
  on public.characters for select
  to authenticated
  using (true);

drop policy if exists "characters_insert_own" on public.characters;
create policy "characters_insert_own"
  on public.characters for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "characters_update_own" on public.characters;
create policy "characters_update_own"
  on public.characters for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- friends
-- A player may only see and manage their own friend rows.
drop policy if exists "friends_select_own" on public.friends;
create policy "friends_select_own"
  on public.friends for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "friends_insert_own" on public.friends;
create policy "friends_insert_own"
  on public.friends for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "friends_update_own" on public.friends;
create policy "friends_update_own"
  on public.friends for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "friends_delete_own" on public.friends;
create policy "friends_delete_own"
  on public.friends for delete
  to authenticated
  using (auth.uid() = user_id);

-- bans
-- Everyone authenticated may READ the ban list (so the game can bounce a banned
-- player on connect). Any authenticated player may INSERT a ban — only GM Maple
-- ever sees the ban button in the client. A player may DELETE their own ban row
-- (used by the GM to lift a ban via the unban action, which targets that id).
drop policy if exists "bans_select_all_auth" on public.bans;
create policy "bans_select_all_auth"
  on public.bans for select
  to authenticated
  using (true);

drop policy if exists "bans_insert_auth" on public.bans;
create policy "bans_insert_auth"
  on public.bans for insert
  to authenticated
  with check (true);

drop policy if exists "bans_delete_auth" on public.bans;
create policy "bans_delete_auth"
  on public.bans for delete
  to authenticated
  using (true);


-- execute_trade: ATOMIC, server-authoritative item swap.
--
-- The trade negotiation (who offers what) happens client-to-client over
-- Realtime broadcast. The COMMIT must never be a client-side row edit, or
-- items could be duplicated. This SECURITY DEFINER function performs the swap
-- inside a single transaction, locking BOTH character rows and re-validating
-- that each side still owns what it is giving away.
--
-- Item model is simplified: backpack is a JSONB array of item entries, each
-- an object like {"item":"sword","qty":1}. p_give / p_receive are JSONB arrays
-- in the same shape. p_give leaves the caller and joins the partner; p_receive
-- leaves the partner and joins the caller. Quantities are honoured.
--
-- Ownership is enforced regardless of what the client claims because the
-- function runs as the table owner but pins the actor to auth.uid().

-- Helper: does `bag` contain every item/qty in `need`?  (idempotent)
create or replace function public._bag_contains(bag jsonb, need jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  rec     jsonb;
  it      text;
  q       numeric;
  have    numeric;
begin
  if need is null or jsonb_typeof(need) <> 'array' then
    return true; -- nothing required
  end if;
  for rec in select * from jsonb_array_elements(coalesce(need, '[]'::jsonb))
  loop
    it := rec->>'item';
    q  := coalesce((rec->>'qty')::numeric, 1);
    if it is null then continue; end if;
    select coalesce(sum(coalesce((e->>'qty')::numeric, 1)), 0)
      into have
      from jsonb_array_elements(coalesce(bag, '[]'::jsonb)) e
     where e->>'item' = it;
    if have < q then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- Helper: remove `take` (item/qty) from `bag`, return the new bag. (idempotent)
create or replace function public._bag_remove(bag jsonb, take jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  rec     jsonb;
  it      text;
  q       numeric;
  out_bag jsonb := coalesce(bag, '[]'::jsonb);
  e       jsonb;
  remaining numeric;
  ev      numeric;
  new_bag jsonb;
begin
  if take is null or jsonb_typeof(take) <> 'array' then
    return out_bag;
  end if;
  for rec in select * from jsonb_array_elements(take)
  loop
    it := rec->>'item';
    q  := coalesce((rec->>'qty')::numeric, 1);
    if it is null then continue; end if;
    remaining := q;
    new_bag := '[]'::jsonb;
    for e in select * from jsonb_array_elements(out_bag)
    loop
      if e->>'item' = it and remaining > 0 then
        ev := coalesce((e->>'qty')::numeric, 1);
        if ev <= remaining then
          remaining := remaining - ev; -- consume the whole stack
        else
          new_bag := new_bag || jsonb_build_array(
            jsonb_set(e, '{qty}', to_jsonb(ev - remaining)));
          remaining := 0;
        end if;
      else
        new_bag := new_bag || jsonb_build_array(e);
      end if;
    end loop;
    out_bag := new_bag;
  end loop;
  return out_bag;
end;
$$;

-- Helper: add `give` (item/qty) into `bag`, return the new bag. (idempotent)
create or replace function public._bag_add(bag jsonb, give jsonb)
returns jsonb
language plpgsql
immutable
as $$
begin
  if give is null or jsonb_typeof(give) <> 'array' then
    return coalesce(bag, '[]'::jsonb);
  end if;
  -- Simple append; the client can re-stack on load. Keeps the swap unambiguous.
  return coalesce(bag, '[]'::jsonb) || give;
end;
$$;

drop function if exists public.execute_trade(uuid, jsonb, jsonb);
create or replace function public.execute_trade(
  p_partner uuid,
  p_give    jsonb,
  p_receive jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me       uuid := auth.uid();
  v_my_bag   jsonb;
  v_their_bag jsonb;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  if p_partner is null or p_partner = v_me then
    raise exception 'invalid trade partner';
  end if;

  -- Lock both rows in a stable order to avoid deadlocks.
  if v_me < p_partner then
    select backpack into v_my_bag    from public.characters where id = v_me      for update;
    select backpack into v_their_bag from public.characters where id = p_partner for update;
  else
    select backpack into v_their_bag from public.characters where id = p_partner for update;
    select backpack into v_my_bag    from public.characters where id = v_me      for update;
  end if;

  if v_my_bag is null then
    raise exception 'your character not found';
  end if;
  if v_their_bag is null then
    raise exception 'partner character not found';
  end if;

  -- Re-validate ownership for BOTH sides at commit time.
  if not public._bag_contains(v_my_bag, p_give) then
    raise exception 'you no longer own the offered items';
  end if;
  if not public._bag_contains(v_their_bag, p_receive) then
    raise exception 'partner no longer owns the offered items';
  end if;

  -- Atomic swap: give leaves me -> partner, receive leaves partner -> me.
  v_my_bag    := public._bag_add(public._bag_remove(v_my_bag,    p_give),    p_receive);
  v_their_bag := public._bag_add(public._bag_remove(v_their_bag, p_receive), p_give);

  update public.characters
     set backpack = v_my_bag, updated_at = now()
   where id = v_me;
  update public.characters
     set backpack = v_their_bag, updated_at = now()
   where id = p_partner;

  return jsonb_build_object('ok', true);
end;
$$;

-- Let authenticated users call the trade RPC (it self-validates the actor).
grant execute on function public.execute_trade(uuid, jsonb, jsonb) to authenticated;

-- End of schema.
