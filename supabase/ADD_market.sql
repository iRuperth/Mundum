-- ============================================================================
-- Mundum — Free Market (open-air stalls). ADD-ON migration, run once.
-- ============================================================================
-- A MapleStory-style free market: players claim a stall in a city's market
-- area, put items up for sale, and other players buy them. The seller may be
-- OFFLINE when a sale happens, so the gold + a "sold" message are queued in a
-- payouts table and credited the next time the seller logs in.
--
-- HOW TO USE
--   Supabase -> SQL Editor -> New query -> paste THIS FILE -> Run.
--   It is idempotent and additive: safe to re-run, and it does NOT touch the
--   `characters` table definition (no data loss). The game self-disables the
--   market until these objects exist, so installing late is harmless.
--
-- This is also embedded in schema_all.sql (section 8) for fresh installs.


-- ----------------------------------------------------------------------------
-- market_listings — one row per item currently on sale. Readable by everyone
-- (so any player can browse any stall); only the seller manages their own rows.
-- A stall is "occupied" iff any row shares its (city, stall_id); the stall's
-- owner is that row's seller_id. No separate stall table is needed.
-- ----------------------------------------------------------------------------
create table if not exists public.market_listings (
  id          uuid        primary key default gen_random_uuid(),
  seller_id   uuid        not null references auth.users (id) on delete cascade,
  seller_name text        not null,
  city        text        not null,
  stall_id    int         not null,
  slot        int         not null default 0,
  item        jsonb       not null,            -- a full item-instance object
  price       bigint      not null check (price >= 0),
  created_at  timestamptz default now()
);
create index if not exists market_listings_stall_idx
  on public.market_listings (city, stall_id);
create index if not exists market_listings_seller_idx
  on public.market_listings (seller_id);


-- ----------------------------------------------------------------------------
-- market_payouts — one row per completed sale owed to a seller (who may be
-- offline). Claimed on next login: gold credited to the character, a toast
-- shown ("X bought your item"), the row marked claimed.
-- ----------------------------------------------------------------------------
create table if not exists public.market_payouts (
  id         uuid        primary key default gen_random_uuid(),
  seller_id  uuid        not null references auth.users (id) on delete cascade,
  buyer_name text        not null,
  item_name  text        not null,
  gold       bigint      not null check (gold >= 0),
  claimed    boolean     not null default false,
  created_at timestamptz default now()
);
create index if not exists market_payouts_seller_idx
  on public.market_payouts (seller_id, claimed);


-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.market_listings enable row level security;
alter table public.market_payouts  enable row level security;

-- listings: anyone authenticated may READ (browse). Insert/update/delete own.
drop policy if exists "market_listings_select_all" on public.market_listings;
create policy "market_listings_select_all"
  on public.market_listings for select to authenticated using (true);
drop policy if exists "market_listings_insert_own" on public.market_listings;
create policy "market_listings_insert_own"
  on public.market_listings for insert to authenticated with check (auth.uid() = seller_id);
drop policy if exists "market_listings_update_own" on public.market_listings;
create policy "market_listings_update_own"
  on public.market_listings for update to authenticated
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
drop policy if exists "market_listings_delete_own" on public.market_listings;
create policy "market_listings_delete_own"
  on public.market_listings for delete to authenticated using (auth.uid() = seller_id);
-- NOTE: market_buy (SECURITY DEFINER) deletes a sold listing on the buyer's
-- behalf, bypassing this owner-only delete policy. That is intentional.

-- payouts: a seller only ever sees / updates their OWN rows. Inserts come ONLY
-- from market_buy (SECURITY DEFINER); no direct client insert policy is granted.
drop policy if exists "market_payouts_select_own" on public.market_payouts;
create policy "market_payouts_select_own"
  on public.market_payouts for select to authenticated using (auth.uid() = seller_id);
drop policy if exists "market_payouts_update_own" on public.market_payouts;
create policy "market_payouts_update_own"
  on public.market_payouts for update to authenticated
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);


-- ----------------------------------------------------------------------------
-- market_buy — atomic, server-authoritative purchase. Locks the listing row and
-- the buyer's active character row, validates price + gold server-side (never
-- trusting the client), moves the gold and the item, deletes the listing, and
-- queues a payout for the (possibly offline) seller. Returns
-- { ok, item, price } or { ok:false, reason }.
-- ----------------------------------------------------------------------------
create or replace function public.market_buy(p_listing uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me        uuid := auth.uid();
  v_seller    uuid;
  v_price     bigint;
  v_item      jsonb;
  v_item_name text;
  v_my_id     uuid;
  v_my_gold   bigint;
  v_my_name   text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;

  -- Lock the listing FIRST. If another buyer already took it the row is gone, so
  -- FOR UPDATE finds nothing — the double-buy guard.
  select seller_id, price, item, coalesce(item->>'name', 'item')
    into v_seller, v_price, v_item, v_item_name
    from public.market_listings where id = p_listing for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  if v_seller = v_me then return jsonb_build_object('ok', false, 'reason', 'self'); end if;

  -- Lock the buyer's active character row (lowest slot) and read authoritative gold.
  select id, gold, coalesce(name, 'someone')
    into v_my_id, v_my_gold, v_my_name
    from public.characters where user_id = v_me order by slot limit 1 for update;
  if v_my_id is null then return jsonb_build_object('ok', false, 'reason', 'nochar'); end if;
  if v_my_gold < v_price then return jsonb_build_object('ok', false, 'reason', 'gold'); end if;

  -- Move the money + item on the buyer side (append the full instance object).
  update public.characters
     set gold = gold - v_price,
         backpack = coalesce(backpack, '[]'::jsonb) || jsonb_build_array(v_item),
         updated_at = now()
   where id = v_my_id;

  -- Remove the listing and queue the seller's payout (gold + the message line).
  delete from public.market_listings where id = p_listing;
  insert into public.market_payouts (seller_id, buyer_name, item_name, gold)
    values (v_seller, v_my_name, v_item_name, v_price);

  return jsonb_build_object('ok', true, 'item', v_item, 'price', v_price);
end; $$;

grant execute on function public.market_buy(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- claim_payouts — credit every unclaimed payout to the caller's character gold
-- in one locked transaction, mark them claimed, and return the claimed list so
-- the client can show toasts. Returns [] when nothing is owed.
-- ----------------------------------------------------------------------------
create or replace function public.claim_payouts()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me    uuid := auth.uid();
  v_my_id uuid;
  v_total bigint;
  v_rows  jsonb;
begin
  if v_me is null then return '[]'::jsonb; end if;

  select id into v_my_id
    from public.characters where user_id = v_me order by slot limit 1 for update;
  if v_my_id is null then return '[]'::jsonb; end if;

  -- Snapshot (and lock) the unclaimed rows BEFORE flipping the flag.
  select coalesce(sum(gold), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'buyer_name', buyer_name, 'item_name', item_name, 'gold', gold)), '[]'::jsonb)
    into v_total, v_rows
    from public.market_payouts
   where seller_id = v_me and claimed = false
   for update;

  if v_total > 0 then
    update public.characters set gold = gold + v_total, updated_at = now() where id = v_my_id;
  end if;
  update public.market_payouts set claimed = true where seller_id = v_me and claimed = false;

  return v_rows;
end; $$;

grant execute on function public.claim_payouts() to authenticated;

-- End of Free Market migration.
