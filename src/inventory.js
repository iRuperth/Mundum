import { getWeapon, getArmor, getContainer, getQuiver, getPotion, instanceFromPotion, instanceFromCoin, rollWeaponInstance, RARITY, COINS, getCoin, getLight, instanceFromLight } from './data/items.js';
import { getTrophy, instanceFromTrophy } from './data/trophies.js';
import { getMaterial, instanceFromMaterial, genericMaterial } from './data/materials.js';

export const EQUIP_SLOTS = ['amulet', 'helmet', 'weapon', 'armor', 'shield', 'legs', 'boots', 'bag', 'extra', 'ring', 'quiver'];
const BASE_CAPACITY = 400;
const CAP_PER_LEVEL = 12;

function norm(id) {
  return String(id || '').toLowerCase().replace(/-/g, '_');
}

// Items that merge into a single stack (by baseId) instead of taking a cell each.
// Coins, consumables (potions/fruit), trophies and crafting materials stack so a
// grind doesn't flood the bag with 30 separate silk cells; gear stays one-per-cell.
function isStackable(item) {
  return !!item && (item.kind === 'coin' || item.kind === 'potion'
    || item.kind === 'trophy' || item.kind === 'material');
}

// Tibia-style hard cap: no single slot ever holds more than 100 of a stackable.
// Past 100 the overflow spills into a new slot (100 + 100 + …). Coins also obey
// this, with 100 of a tier being exactly one "convert up" to the next coin.
export const MAX_STACK = 100;

// Effective weight of an item: a stack weighs per-unit × count, and a container
// weighs its own shell PLUS everything inside it. So a 18-weight backpack holding
// 200 of loot reads as 218 — you must have the capacity to carry the whole thing,
// and whoever picks a dropped bag up needs room for its full contents too.
export function itemWeight(item) {
  if (!item) return 0;
  let w = (item.weight || 0) * (item.count || 1);
  if (item.contents) for (const inner of item.contents) w += itemWeight(inner);
  return w;
}

// Resolve a loot itemId leniently against weapons, armors, containers, potions.
export function resolveItem(itemId, rng, level, lang) {
  // `norm` turns dashes into underscores, so a loot id authored as 'iron-sword'
  // resolves to the real 'iron_sword' gear (those used to silently never drop).
  const id = norm(itemId);
  if (id === 'gold') return null;
  if (getWeapon(id)) return rollWeaponInstance(id, rng || (() => 0.5));
  const armor = getArmor(id);
  if (armor) return instanceFromArmor(armor);
  const cont = getContainer(id);
  if (cont) return instanceFromContainer(cont);
  const quiver = getQuiver(id);
  if (quiver) return instanceFromQuiver(quiver);
  const potion = getPotion(id);
  if (potion) return instanceFromPotion(potion, lang || 'es');
  const light = getLight(id);
  if (light) return instanceFromLight(light, lang || 'es');
  const coin = getCoin(id);
  if (coin) return instanceFromCoin(coin, 1, lang || 'es');
  const trophy = getTrophy(id);
  if (trophy) return instanceFromTrophy(trophy, lang || 'es');
  // Crafting/sellable materials (silk, hides, scales, essences…). Looked up by
  // the original id (with dashes) so 'spider-leg' etc. now actually drop.
  const material = getMaterial(itemId) || getMaterial(id);
  if (material) return instanceFromMaterial(material, lang || 'es');
  // Last resort: any other authored loot id (e.g. unfinished gear names) drops as
  // a generic sellable material instead of vanishing, so the loot is never lost.
  return genericMaterial(itemId, level || 1, lang || 'es');
}

export function instanceFromArmor(a) {
  return {
    baseId: a.id, name: a.name, type: 'armor', slot: a.slot,
    defense: a.defense || 0, weight: a.weight, levelReq: a.levelReq || 1,
    color: a.color, speedBonus: a.speedBonus || 0, rarity: RARITY.NORMAL,
    // Carried so EquipVisuals can pick the right worn-mesh (a closed great helm
    // vs an open cap, plate pauldrons vs a plain tunic) instead of guessing.
    coverage: a.coverage || null,
    // Ring/amulet bonus fields (so combat & regen can read them): skillBonus
    // { sword|axe|club|distance|magic: N }, magicLevelBonus, hp/manaRegenPerSec.
    skillBonus: a.skillBonus || null,
    magicLevelBonus: a.magicLevelBonus || 0,
    hpRegenPerSec: a.hpRegenPerSec || 0,
    manaRegenPerSec: a.manaRegenPerSec || 0,
    vocation: a.vocation || null,
  };
}

export function instanceFromContainer(c) {
  // A pouch (small bag, ≤8 slots) reads as a drawstring sack; a backpack uses
  // the framed-pack glyph. Lets the UI tell the two apart at a glance.
  const isPouch = (c.capacity || 0) <= 8 || /(^|_)bag$/.test(c.id || '');
  return {
    baseId: c.id, name: c.name, type: 'container', slot: 'bag',
    capacity: c.capacity, weight: c.weight, color: c.color, rarity: RARITY.NORMAL,
    bagIcon: isPouch ? '👝' : '🎒',
    // A container carried in the backpack can hold items of its own (one nesting
    // level). The equipped bag uses the top-level `backpack` array instead.
    contents: [],
  };
}

// Archer quiver instance: occupies the 'quiver' slot, gives no defense, carries
// a flat `arrowAtk` bonus the combat formula adds to the bow's attack.
export function instanceFromQuiver(q) {
  return {
    baseId: q.id, name: q.name, type: 'quiver', slot: 'quiver',
    arrowAtk: q.arrowAtk || 0, defense: 0, weight: q.weight, levelReq: q.levelReq || 1,
    color: q.color, vocation: q.vocation || 'archer', rarity: RARITY.NORMAL,
  };
}

const WEAPON_TYPES = ['sword', 'axe', 'mace', 'lance', 'bow', 'wand'];
function isWeapon(item) {
  return !!item && (item.type === 'weapon' || WEAPON_TYPES.includes(item.type));
}

function slotForItem(item) {
  if (!item) return null;
  if (item.type === 'armor') return item.slot;
  if (item.type === 'container') return 'bag';
  if (item.type === 'quiver') return 'quiver';
  if (isWeapon(item)) return 'weapon';
  if (item.type === 'shield') return 'shield';
  if (item.kind === 'light') return 'extra'; // torches/lanterns go in the extra slot
  return null;
}

// Whether `item` may be placed in the given paperdoll `slot`. The two HAND slots
// (weapon = right hand, shield = left/off hand) are interchangeable for one-handed
// gear, so the player can pick which hand holds what: a one-handed weapon may go
// in either hand, and a shield may go in either hand too. Two-handed weapons stay
// in the main weapon slot only.
function canGoInSlot(item, slot) {
  if (slotForItem(item) === slot) return true;
  const handSlot = slot === 'weapon' || slot === 'shield';
  if (handSlot && isWeapon(item) && !item.twoHanded) return true;   // weapon in either hand
  if (handSlot && item.type === 'shield') return true;              // shield in either hand
  return false;
}

// Whether a vocation may equip an item. Items carry `vocation`: 'knight' |
// 'archer' | 'mage' | 'druid' | 'any' (missing = 'any'). 'archer' maps to the
// internal profession id 'paladin'. Mage and druid can both use wands (mage
// gear). Neutral gear ('any') is usable by everyone — so a mage can loot a
// knight's sword but not equip it.
export function canVocationUse(item, profession) {
  const v = item && item.vocation;
  if (!v || v === 'any') return true;
  const prof = profession === 'paladin' ? 'archer' : profession;
  if (v === prof) return true;
  // Mage gear (wands) is shared with druids; druid rods are druid-only.
  if (v === 'mage' && profession === 'druid') return true;
  return false;
}

export class Inventory {
  constructor() {
    this.equip = {};
    for (const s of EQUIP_SLOTS) this.equip[s] = null;
    this.backpack = [];
    this.profession = 'knight';   // set by main.js so equip can gate by vocation
  }

  setProfession(id) { this.profession = id || 'knight'; }

  // --- Money (Tibia-style coins-as-items) -------------------------------
  // Coins are stackable items in the backpack. `gold` is the derived total in
  // bronze value so shops/quests keep working with a single number.

  // All coin stacks the player holds, top of backpack + inside any nested bag.
  _coinStacksRaw() {
    const out = [];
    for (const it of this.backpack) {
      if (it.kind === 'coin') out.push(it);
      else if (it.contents) for (const inner of it.contents) if (inner.kind === 'coin') out.push(inner);
    }
    return out;
  }

  // Find (or lazily create, top-level) the stack for a coin tier id.
  _coinStack(id, create) {
    let s = this._coinStacksRaw().find((it) => it.baseId === id);
    if (!s && create) {
      const def = getCoin(id);
      if (def) { s = instanceFromCoin(def, 0); this.backpack.push(s); }
    }
    return s || null;
  }

  // Total wealth in bronze units (sum of every coin stack times its value).
  get gold() {
    let v = 0;
    for (const s of this._coinStacksRaw()) v += (s.count || 0) * (s.value || 0);
    return v;
  }
  set gold(total) { this._setGoldTotal(total); }

  // Rebuild the player's coins to the minimal set equal to `total` bronze. Drops
  // existing coin stacks and lays down fresh ones (highest tier first).
  _setGoldTotal(total) {
    // Remove every existing coin stack (top-level and nested).
    this.backpack = this.backpack.filter((it) => it.kind !== 'coin');
    for (const it of this.backpack) if (it.contents) it.contents = it.contents.filter((x) => x.kind !== 'coin');
    let v = Math.max(0, Math.floor(total));
    for (let i = COINS.length - 1; i >= 0; i--) {
      const c = COINS[i];
      let n = Math.floor(v / c.value);
      v -= n * c.value;
      // Lay the tier down in stacks of at most MAX_STACK (no slot holds 101).
      while (n > 0) {
        const chunk = Math.min(MAX_STACK, n);
        this.backpack.push(instanceFromCoin(c, chunk));
        n -= chunk;
      }
    }
  }

  // Add `count` coins of a tier, capped at MAX_STACK per slot (overflow to new
  // slots), so a coin stack is never above 100 — convert 100→next tier manually.
  addCoins(id, count) {
    const c = getCoin(id);
    if (!c) return;
    this._addStackable(instanceFromCoin(c, Math.max(0, Math.floor(count))));
  }

  // Add a flat bronze amount as bronze coins (loot/quests drop a bronze value).
  addGold(amount) { this.addCoins('bronze_coin', amount); }

  // Spend a bronze total: rebuild the coin pile from the remaining value.
  spendGold(amount) {
    const cur = this.gold;
    if (amount > cur) return false;
    this._setGoldTotal(cur - amount);
    return true;
  }

  // Total count of a coin tier across ALL its (possibly split, ≤100) stacks.
  _coinTierTotal(id) {
    let n = 0;
    for (const s of this._coinStacksRaw()) if (s.baseId === id) n += (s.count || 0);
    return n;
  }

  // Remove `n` coins of a tier across its stacks (emptied stacks are dropped).
  _takeCoins(id, n) {
    let left = n;
    for (const s of this._coinStacksRaw()) {
      if (left <= 0) break;
      if (s.baseId !== id) continue;
      const take = Math.min(s.count || 0, left);
      s.count -= take; left -= take;
    }
    for (const s of this._coinStacksRaw().slice()) if (s.count <= 0) this._removeCoinStack(s);
  }

  // Convert 100 coins of a tier into 1 of the next tier up. Works across split
  // ≤100 stacks (sums the tier). Returns true/false.
  convertCoin(id) {
    const idx = COINS.findIndex((c) => c.id === id);
    if (idx < 0 || idx >= COINS.length - 1) return false; // diamond can't go up
    if (this._coinTierTotal(id) < 100) return false;
    this._takeCoins(id, 100);
    this.addCoins(COINS[idx + 1].id, 1);   // capped + overflow aware
    return true;
  }

  // Break ONE coin of `id` back DOWN into 100 of the tier below (the inverse of
  // convertCoin). Bronze (tier 0) can't go lower.
  convertCoinDown(id) {
    const idx = COINS.findIndex((c) => c.id === id);
    if (idx <= 0) return false;                 // bronze (lowest tier) can't split down
    if (this._coinTierTotal(id) < 1) return false;
    this._takeCoins(id, 1);
    this.addCoins(COINS[idx - 1].id, 100);  // capped + overflow aware (→ a 100 stack)
    return true;
  }

  // Remove an emptied coin stack from wherever it lives (top-level or nested).
  _removeCoinStack(stack) {
    let i = this.backpack.indexOf(stack);
    if (i >= 0) { this.backpack.splice(i, 1); return; }
    for (const it of this.backpack) {
      if (!it.contents) continue;
      i = it.contents.indexOf(stack);
      if (i >= 0) { it.contents.splice(i, 1); return; }
    }
  }

  // Coin stacks the player holds, for the inventory UI (only non-empty tiers).
  coinStacks() {
    return this._coinStacksRaw().filter((s) => s.count > 0)
      .map((s) => { const def = getCoin(s.baseId) || {}; return { ...def, count: s.count }; });
  }

  get bagCapacity() {
    return this.equip.bag ? this.equip.bag.capacity : 0;
  }

  carriedWeight() {
    let w = 0;
    for (const s of EQUIP_SLOTS) if (this.equip[s]) w += itemWeight(this.equip[s]);
    for (const it of this.backpack) w += itemWeight(it);
    return w;
  }

  // Every cell the player holds, top-level + inside nested bags. Used by the
  // quest gates to count keys/dusts and by the item-spend on quest turn-in.
  _allCells() {
    const out = [];
    for (const it of this.backpack) {
      if (!it) continue;
      out.push(it);
      if (Array.isArray(it.contents)) for (const c of it.contents) if (c) out.push(c);
    }
    return out;
  }

  // How many of an item (by baseId) the player carries, summing stack counts.
  // Accepts dash/underscore variants so 'demon-bone' and 'demon_bone' both match.
  countById(baseId) {
    const want = String(baseId || '').toLowerCase();
    const alt = want.replace(/-/g, '_');
    const alt2 = want.replace(/_/g, '-');
    let n = 0;
    for (const it of this._allCells()) {
      const id = String(it.baseId || '').toLowerCase();
      if (id === want || id === alt || id === alt2) n += (it.count || 1);
    }
    return n;
  }

  // True if the player holds at least `count` of `baseId`.
  hasItems(baseId, count = 1) { return this.countById(baseId) >= count; }

  // Spend (remove) `count` of `baseId` across stacks/cells; emptied cells drop.
  // Returns how many were actually removed (clamped to what was held).
  removeById(baseId, count = 1) {
    const want = String(baseId || '').toLowerCase();
    const alt = want.replace(/-/g, '_');
    const alt2 = want.replace(/_/g, '-');
    const match = (it) => { const id = String(it.baseId || '').toLowerCase(); return id === want || id === alt || id === alt2; };
    let left = count, removed = 0;
    const sweep = (arr) => {
      for (let i = arr.length - 1; i >= 0 && left > 0; i--) {
        const it = arr[i];
        if (!it || !match(it)) continue;
        const take = Math.min(it.count || 1, left);
        it.count = (it.count || 1) - take;
        left -= take; removed += take;
        if ((it.count || 0) <= 0) arr.splice(i, 1);
      }
    };
    sweep(this.backpack);
    for (const bag of this._nestedBags()) sweep(bag.contents);
    return removed;
  }

  capacity(level) {
    return BASE_CAPACITY + (level - 1) * CAP_PER_LEVEL;
  }

  canCarry(item, level) {
    // Use the item's FULL weight (stack count + any bag contents), so picking up
    // a loaded backpack needs room for everything inside it, not just the shell.
    return this.carriedWeight() + itemWeight(item) <= this.capacity(level);
  }

  // The nested containers carried in the main backpack (bags inside the bag),
  // newest first — used to overflow loot into them when the top level is full.
  _nestedBags() {
    return this.backpack.filter((it) => it && it.type === 'container' && Array.isArray(it.contents));
  }

  // Is there ANY free cell for `item` — top level OR inside a nested bag? Lets a
  // stackable merge anywhere, or a fresh cell anywhere. (Capacity-only; weight is
  // checked separately by canCarry.)
  _hasSlotAnywhere(item) {
    if (isStackable(item)) {
      // Room exists if a matching stack is below the cap (can top up)…
      const hasRoom = (it) => it.kind === item.kind && it.baseId === item.baseId && (it.count || 1) < MAX_STACK;
      if (this.backpack.some(hasRoom)) return true;
      for (const bag of this._nestedBags()) {
        if (bag.contents.some(hasRoom)) return true;
      }
    }
    if (this.backpack.length < this.bagCapacity) return true;
    // A nested bag can't itself hold another bag, so only non-containers overflow.
    if (item.type !== 'container') {
      for (const bag of this._nestedBags()) if (bag.contents.length < (bag.capacity || 0)) return true;
    }
    return false;
  }

  // Dry-run addToBackpack: 'ok' | 'full' | 'heavy' without mutating anything, so
  // a ground pickup can be left untouched when it wouldn't fit. Considers nested
  // bags too, so "the backpack is full" only when every carried bag is also full.
  wouldAccept(item, level) {
    if (!this.canCarry(item, level)) return 'heavy';
    return this._hasSlotAnywhere(item) ? 'ok' : 'full';
  }

  // Add to backpack. Returns 'ok' | 'full' | 'heavy'. Stackable items merge into
  // an existing stack of the same baseId. When the TOP level is full, the item
  // overflows into the first nested bag that has room — so carrying a backpack
  // inside a backpack inside a backpack really does give you that much space.
  addToBackpack(item, level) {
    if (!this.canCarry(item, level)) return 'heavy';
    // Stackables fill existing stacks UP TO MAX_STACK, then spill into new cells
    // (100 + 100 + …). A single put of >100 may need several slots.
    if (isStackable(item)) return this._addStackable(item);
    // Non-stackable: a free cell at the top level, else overflow into a nested bag.
    if (this.backpack.length < this.bagCapacity) {
      this.backpack.unshift(item); // newest item shows up first in the backpack
      return 'ok';
    }
    if (item.type !== 'container') {
      for (const bag of this._nestedBags()) {
        if (bag.contents.length < (bag.capacity || 0)) { bag.contents.unshift(item); return 'ok'; }
      }
    }
    return 'full';
  }

  // Add a stackable, respecting the MAX_STACK per-slot cap. Tops up existing
  // matching stacks first (top level, then nested bags), then opens new cells for
  // the remainder. Returns 'ok' if it all fit, else 'full' (with whatever fit
  // already merged — matching the old best-effort behaviour, just capped).
  _addStackable(item) {
    let remaining = item.count || 1;
    const match = (it) => it.kind === item.kind && it.baseId === item.baseId;
    // 1) Top up every existing stack of this kind, top level then nested bags.
    const topUp = (arr) => {
      for (const it of arr) {
        if (remaining <= 0) break;
        if (!match(it)) continue;
        const room = MAX_STACK - (it.count || 1);
        if (room <= 0) continue;
        const add = Math.min(room, remaining);
        it.count = (it.count || 1) + add;
        remaining -= add;
      }
    };
    topUp(this.backpack);
    for (const bag of this._nestedBags()) topUp(bag.contents);
    // 2) Open new cells (capped at MAX_STACK each) for the rest.
    while (remaining > 0) {
      const chunk = Math.min(MAX_STACK, remaining);
      const cell = { ...item, count: chunk };
      if (this.backpack.length < this.bagCapacity) {
        this.backpack.unshift(cell);
      } else {
        let placed = false;
        for (const bag of this._nestedBags()) {
          if (bag.contents.length < (bag.capacity || 0)) { bag.contents.unshift(cell); placed = true; break; }
        }
        if (!placed) return 'full';   // out of cells; the rest didn't fit
      }
      remaining -= chunk;
    }
    return 'ok';
  }

  removeFromBackpack(index) {
    return this.backpack.splice(index, 1)[0] || null;
  }

  // Nested bags: move an item from the main backpack INTO a container that is
  // itself in the backpack (one nesting level; you can't put a bag in a bag).
  moveIntoBag(fromIndex, bagIndex) {
    const bag = this.backpack[bagIndex];
    const item = this.backpack[fromIndex];
    if (!bag || bag.type !== 'container' || !item || fromIndex === bagIndex) return false;
    if (item.type === 'container') return false; // no bag-in-bag
    if (bag.contents.length >= bag.capacity) return false;
    this.backpack.splice(fromIndex, 1);
    bag.contents.unshift(item); // newest item shows up first inside the bag
    return true;
  }

  // Take an item OUT of a nested bag back into the main backpack.
  takeFromBag(bagIndex, innerIndex) {
    const bag = this.backpack[bagIndex];
    if (!bag || bag.type !== 'container') return false;
    if (this.backpack.length >= this.bagCapacity) return false;
    const item = bag.contents.splice(innerIndex, 1)[0];
    if (!item) return false;
    this.backpack.unshift(item); // newest item shows up first in the backpack
    return true;
  }

  // --- Unified drag-and-drop moves (Tibia-style) ------------------------
  // A location is { c, i }: container `c` is 'main' (the equipped bag = the
  // top-level backpack), an 'equip:<slot>' paperdoll slot, or a numeric index
  // into the backpack for a nested bag. `i` is the cell index inside that
  // container (ignored for equip slots, which hold one item).

  _arrFor(c) {
    if (c === 'main') return this.backpack;
    const bag = this.backpack[c];
    return bag && bag.type === 'container' ? bag.contents : null;
  }

  _capFor(c) {
    if (c === 'main') return this.bagCapacity;
    const bag = this.backpack[c];
    return bag && bag.type === 'container' ? bag.capacity : 0;
  }

  // The item at a location, or null. equip:<slot> reads the paperdoll.
  itemAt(loc) {
    if (typeof loc.c === 'string' && loc.c.startsWith('equip:')) return this.equip[loc.c.slice(6)] || null;
    const arr = this._arrFor(loc.c);
    return arr ? (arr[loc.i] || null) : null;
  }

  // Move (part of) the item at `from` to `to`. `count` splits a stack when it is
  // a positive number below the stack size; otherwise the whole item moves.
  // Returns { ok, reason }. Handles: container↔container, reorder within a
  // container, stack merge/split, and equip↔bag via slotForItem rules.
  moveItem(from, to, count, level) {
    const fromEquip = typeof from.c === 'string' && from.c.startsWith('equip:');
    const toEquip = typeof to.c === 'string' && to.c.startsWith('equip:');
    const item = this.itemAt(from);
    if (!item) return { ok: false, reason: 'none' };

    // --- Dragging onto / off the paperdoll ------------------------------
    if (toEquip) {
      const slot = to.c.slice(6);
      if (fromEquip) {
        // SLOT → SLOT: allow swapping gear between the two HAND slots so the
        // player can move a weapon (or shield) from one hand to the other right
        // on the paperdoll. Both ends must be hand slots and each item must be
        // allowed in its new hand; if the target hand is occupied, they swap.
        const fromSlot = from.c.slice(6);
        const handSlots = new Set(['weapon', 'shield']);
        if (!handSlots.has(fromSlot) || !handSlots.has(slot) || fromSlot === slot) {
          return { ok: false, reason: 'noslot' };
        }
        const target = this.equip[slot] || null;
        if (!canGoInSlot(item, slot)) return { ok: false, reason: 'noslot' };
        if (target && !canGoInSlot(target, fromSlot)) return { ok: false, reason: 'noslot' };
        this.equip[slot] = item;
        this.equip[fromSlot] = target;   // swap (or clear if the target hand was empty)
        return { ok: true };
      }
      // The EXTRA slot is a universal utility pocket: it takes ANYTHING (a torch
      // to light, but also coins, a spare bag/backpack, a potion…), not just its
      // natural slot type — so the player can stash whatever they want there.
      if (slot === 'extra') {
        if (from.c !== 'main') return { ok: false, reason: 'noslot' }; // only from main bag
        const r = this.equipToExtra(from.i);
        return r.ok ? { ok: true } : { ok: false, reason: r.reason };
      }
      if (!canGoInSlot(item, slot)) return { ok: false, reason: 'noslot' };
      const r = this.equipFromBackpack(from.i, level, slot); // only valid from main backpack
      return r.ok ? { ok: true } : { ok: false, reason: r.reason, need: r.need };
    }
    if (fromEquip) {
      const slot = from.c.slice(6);
      if (slot === 'bag') return { ok: false, reason: 'noslot' };
      if (to.c !== 'main') return { ok: false, reason: 'noslot' }; // unequip goes to main bag
      if (this.backpack.length >= this.bagCapacity) return { ok: false, reason: 'full' };
      this.equip[slot] = null;
      this.backpack.unshift(item); // just-unequipped item shows up first
      return { ok: true };
    }

    // --- Bag ↔ bag (incl. reorder within one bag) -----------------------
    const srcArr = this._arrFor(from.c);
    const dstArr = this._arrFor(to.c);
    if (!srcArr || !dstArr) return { ok: false, reason: 'none' };
    // No bag-inside-a-bag (containers may only live in the main backpack).
    if (item.type === 'container' && to.c !== 'main') return { ok: false, reason: 'nobag' };
    // Can't drop a bag into itself.
    if (item.type === 'container' && to.c === from.i) return { ok: false, reason: 'nobag' };

    const moving = (isStackable(item) && count > 0 && count < (item.count || 1)) ? count : null;
    const target = dstArr[to.i];
    const sameContainer = from.c === to.c;

    // Merge into a same-tier stack already sitting on the target cell, capped at
    // MAX_STACK — the overflow stays on the source stack (a 100-cap split).
    if (target && isStackable(item) && isStackable(target) && target.baseId === item.baseId && target !== item) {
      const want = (moving != null ? moving : (item.count || 1));
      const room = MAX_STACK - (target.count || 1);
      if (room <= 0) return { ok: false, reason: 'full' };   // target stack is maxed
      const add = Math.min(room, want);
      target.count = (target.count || 1) + add;
      item.count = (item.count || 1) - add;
      if (item.count <= 0) srcArr.splice(from.i, 1);
      return { ok: true };
    }

    // Capacity check when the move would add a cell to a different container —
    // either a whole item crossing over, or a split that lands as a new stack.
    // (Total carry weight is unchanged by moving between bags you already hold.)
    if (!sameContainer && (dstArr.length >= this._capFor(to.c))) return { ok: false, reason: 'full' };

    // Pull the source out (or peel off a split count as a new stack).
    let piece;
    if (moving != null) {
      item.count -= moving;
      piece = { ...item, count: moving };
    } else {
      piece = srcArr.splice(from.i, 1)[0];
    }

    // Place into the destination. An explicit in-range slot inserts there
    // (swap if occupied within the same bag); otherwise the item lands at the
    // FRONT so the thing you just dropped in shows up first (Tibia-style).
    if (target && sameContainer && moving == null) {
      // Reorder/swap inside the same container.
      const adjusted = to.i > from.i ? to.i - 1 : to.i; // src already removed
      dstArr.splice(adjusted, 0, piece);
    } else if (to.i != null && to.i < dstArr.length) {
      dstArr.splice(to.i, 0, piece);
    } else {
      dstArr.unshift(piece);
    }
    return { ok: true };
  }

  // Equip an item from the backpack index. `targetSlot` optionally forces which
  // paperdoll slot to use (e.g. a one-handed weapon into the off-hand 'shield'
  // slot); when omitted it goes to the item's natural slot. Returns { ok, reason }.
  equipFromBackpack(index, level, targetSlot) {
    const item = this.backpack[index];
    if (!item) return { ok: false, reason: 'none' };
    const slot = (targetSlot && canGoInSlot(item, targetSlot)) ? targetSlot : slotForItem(item);
    if (!slot) return { ok: false, reason: 'noslot' };
    if ((item.levelReq || 1) > level) return { ok: false, reason: 'level', need: item.levelReq };
    // Vocation gate: you can carry/trade any item but only equip your class's.
    if (!canVocationUse(item, this.profession)) return { ok: false, reason: 'vocation', need: item.vocation };

    if ((item.twoHanded) && slot === 'weapon' && this.equip.shield) {
      if (this.backpack.length >= this.bagCapacity) return { ok: false, reason: 'full' };
    }

    this.backpack.splice(index, 1);
    const prev = this.equip[slot];
    this.equip[slot] = item;
    // Anything swapped back off the paperdoll lands at the front of the backpack.
    if (prev) this.backpack.unshift(prev);

    if (item.twoHanded && this.equip.shield) {
      this.backpack.unshift(this.equip.shield);
      this.equip.shield = null;
    }
    if (slot === 'shield' && this.equip.weapon && this.equip.weapon.twoHanded) {
      this.backpack.unshift(this.equip.weapon);
      this.equip.weapon = null;
    }
    return { ok: true, slot };
  }

  // Put ANY backpack item into the universal EXTRA slot (the torch pocket, but it
  // accepts coins, bags, potions, anything). No level/vocation gate — it's just a
  // stash slot. Whatever was there swaps back into the backpack.
  equipToExtra(index) {
    const item = this.backpack[index];
    if (!item) return { ok: false, reason: 'none' };
    this.backpack.splice(index, 1);
    const prev = this.equip.extra;
    this.equip.extra = item;
    if (prev) this.backpack.unshift(prev);
    return { ok: true, slot: 'extra' };
  }

  unequip(slot) {
    const item = this.equip[slot];
    if (!item) return false;
    // The bag holds the backpack contents and stays equipped; removing it would
    // lose its capacity and orphan the carried items.
    if (slot === 'bag') return false;
    if (this.backpack.length >= this.bagCapacity) return false;
    this.equip[slot] = null;
    this.backpack.unshift(item); // just-unequipped item shows up first
    return true;
  }

  totalDefense() {
    let d = 0;
    for (const s of ['helmet', 'armor', 'shield', 'legs', 'boots', 'amulet', 'ring']) {
      if (this.equip[s]) d += this.equip[s].defense || 0;
    }
    return d;
  }

  speedBonus() {
    // Boots and the ring can both grant speed (e.g. a ring of haste).
    return (this.equip.boots ? (this.equip.boots.speedBonus || 0) : 0)
         + (this.equip.ring ? (this.equip.ring.speedBonus || 0) : 0);
  }

  // Total of a given bonus field across every equipped item (used for ring/amulet
  // skill & regen bonuses: skillBonus.<skill>, magicLevelBonus, hpRegenPerSec…).
  equipBonus(field) {
    let v = 0;
    for (const s of EQUIP_SLOTS) { const it = this.equip[s]; if (it && it[field]) v += it[field]; }
    return v;
  }

  // Combined weapon-skill bonus for a given skill key ('sword'|'axe'|'club'|
  // 'distance'|'magic'), summed from equipped rings/amulets that carry a
  // skillBonus map like { sword: 2 }.
  skillBonus(skill) {
    let v = 0;
    for (const s of EQUIP_SLOTS) { const it = this.equip[s]; if (it && it.skillBonus && it.skillBonus[skill]) v += it.skillBonus[skill]; }
    return v;
  }

  // The weapon the player actually FIGHTS with. Either hand may hold the weapon
  // now (the other can hold a shield), so prefer the main hand but fall back to a
  // weapon parked in the off-hand — a shield in a slot is never a weapon.
  weapon() {
    const main = this.equip.weapon;
    if (main && main.type !== 'shield') return main;
    const off = this.equip.shield;
    if (off && off.type !== 'shield') return off;
    return null;
  }

  serialize() {
    // Coins now live in the backpack as items, so they serialize with it. We
    // still write the derived gold total as a hint for old loaders.
    return { equip: this.equip, backpack: this.backpack, gold: this.gold };
  }

  load(data) {
    if (!data) return;
    if (data.equip) for (const s of EQUIP_SLOTS) this.equip[s] = data.equip[s] || null;
    if (Array.isArray(data.backpack)) this.backpack = data.backpack;
    // Backfill the pouch/backpack glyph on containers saved before bagIcon existed.
    const fixIcon = (it) => {
      if (it && it.type === 'container' && !it.bagIcon) {
        it.bagIcon = (it.capacity || 0) <= 8 || /(^|_)bag$/.test(it.baseId || '') ? '👝' : '🎒';
      }
    };
    for (const s of EQUIP_SLOTS) fixIcon(this.equip[s]);
    for (const it of this.backpack) { fixIcon(it); if (it && it.contents) it.contents.forEach(fixIcon); }
    // Migration: older saves equipped a small 8-slot "bag" as the main container
    // (it was labelled a backpack but was really a pouch). Promote it to a proper
    // 20-slot brown backpack and tuck a brown bag inside, preserving every item.
    // The equipped container's items live in `this.backpack` (top-level), so they
    // ride along untouched when we swap the shell.
    const eb = this.equip.bag;
    if (eb && eb.type === 'container' && (eb.capacity || 0) < 20
        && /(^|_)bag$/.test(eb.baseId || '') && !/backpack/.test(eb.baseId || '')) {
      this.equip.bag = instanceFromContainer(getContainer('backpack'));
      // Hand the player back a bag inside, like a fresh character gets — but only
      // if they don't already have a spare container carried, to avoid piling up.
      const hasCarriedBag = this.backpack.some((it) => it && it.type === 'container');
      if (!hasCarriedBag) this.backpack.push(instanceFromContainer(getContainer('bag')));
    }
    // Consolidate potions saved before they stacked: give each a count and merge
    // same-baseId duplicates within each container into a single stack.
    const mergePotions = (arr) => {
      const byId = new Map();
      for (let i = arr.length - 1; i >= 0; i--) {
        const it = arr[i];
        if (!it || it.kind !== 'potion') continue;
        if (it.count == null) it.count = 1;
        const head = byId.get(it.baseId);
        if (head) { head.count += it.count; arr.splice(i, 1); }
        else byId.set(it.baseId, it);
      }
    };
    mergePotions(this.backpack);
    for (const it of this.backpack) if (it && it.contents) mergePotions(it.contents);
    // Migration: a save from before coins-as-items carried a separate `coins`
    // dict (or just a `gold` number). Fold any of it into coin stacks, but only
    // if the loaded backpack doesn't already hold coins (don't double-grant).
    const alreadyHasCoins = this._coinStacksRaw().length > 0;
    if (!alreadyHasCoins) {
      let bronze = 0;
      if (data.coins && typeof data.coins === 'object') {
        for (const c of COINS) bronze += (data.coins[c.id] || 0) * c.value;
      } else if (typeof data.gold === 'number') {
        bronze = data.gold;
      }
      if (bronze > 0) this._setGoldTotal(bronze);
    }
    // Migration: the Tibia-7.4 rebalance compressed every weapon's attack and
    // every armor's defense. Saved item instances bake those numbers, so an old
    // save can hold e.g. an Excalibur instance with atk 210. Clamp each baked
    // atk/defense down to the new base item's cap (legendaries collapse cleanly
    // to the new atkMax of 50/53). Idempotent — a Math.min against the new cap.
    const clampToBase = (it) => {
      if (!it || !it.baseId) return;
      const wb = getWeapon(it.baseId);
      if (wb && typeof it.atk === 'number') {
        it.atk = Math.min(it.atk, wb.atkMax);
        if (it.defense != null && wb.defense != null) it.defense = Math.min(it.defense, wb.defense);
      }
      const ab = getArmor(it.baseId);
      if (ab && typeof it.defense === 'number') it.defense = Math.min(it.defense, ab.defense);
    };
    for (const s of EQUIP_SLOTS) clampToBase(this.equip[s]);
    for (const it of this.backpack) { clampToBase(it); if (it && it.contents) it.contents.forEach(clampToBase); }
    // Migration: enforce the MAX_STACK cap on saves written before it existed.
    // Any stack above 100 is split into extra ≤100 cells (in the same container,
    // appended; if it's somehow out of room the surplus is dropped rather than
    // kept as an illegal 101+ stack).
    const splitOverCap = (arr, cap) => {
      for (let i = 0; i < arr.length; i++) {
        const it = arr[i];
        if (!it || !isStackable(it) || (it.count || 1) <= MAX_STACK) continue;
        let overflow = it.count - MAX_STACK;
        const newCells = [];
        while (overflow > 0 && (arr.length + newCells.length) < cap) {
          const chunk = Math.min(MAX_STACK, overflow);
          newCells.push({ ...it, count: chunk });
          overflow -= chunk;
        }
        // Cap the original and append the split-off cells. If there was no room at
        // all (no spare cells), leave the surplus on the stack rather than DROP it
        // — better an over-cap stack than lost items; it re-splits once there's room.
        it.count = MAX_STACK + overflow;
        arr.push(...newCells);
      }
    };
    splitOverCap(this.backpack, this.bagCapacity);
    for (const it of this.backpack) if (it && it.contents) splitOverCap(it.contents, it.capacity || 0);
  }
}

// Per-city depot storage. Items in one city's depot are not in another's.
// Each city's depot (bank vault) holds up to DEPOT_CAPACITY items. A bigger
// vault than the backpack so it's the place to stash loot between trips.
export const DEPOT_CAPACITY = 100;

export class DepotStore {
  constructor() { this.cities = {}; }
  for(city) {
    if (!this.cities[city]) this.cities[city] = [];
    return this.cities[city];
  }
  // How full a city's vault is, and whether it can take one more item.
  count(city) { return this.for(city).length; }
  isFull(city) { return this.for(city).length >= DEPOT_CAPACITY; }
  // Deposit returns true on success, false if the vault is full (100 items).
  deposit(city, item) {
    const list = this.for(city);
    if (list.length >= DEPOT_CAPACITY) return false;
    list.push(item);
    return true;
  }
  withdraw(city, index) { return this.for(city).splice(index, 1)[0] || null; }
  serialize() { return this.cities; }
  load(data) { if (data && typeof data === 'object') this.cities = data; }
}
