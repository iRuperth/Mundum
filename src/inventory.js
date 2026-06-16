import { getWeapon, getArmor, getContainer, getPotion, instanceFromPotion, instanceFromCoin, rollWeaponInstance, RARITY, COINS, getCoin, getLight, instanceFromLight } from './data/items.js';
import { getTrophy, instanceFromTrophy } from './data/trophies.js';

export const EQUIP_SLOTS = ['amulet', 'helmet', 'weapon', 'armor', 'shield', 'legs', 'boots', 'bag', 'extra'];
const BASE_CAPACITY = 400;
const CAP_PER_LEVEL = 12;

function norm(id) {
  return String(id || '').toLowerCase().replace(/-/g, '_');
}

// Items that merge into a single stack (by baseId) instead of taking a cell each.
// Coins and consumables (potions/fruit) stack; gear stays one-per-cell.
function isStackable(item) {
  return !!item && (item.kind === 'coin' || item.kind === 'potion');
}

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
  const id = norm(itemId);
  if (id === 'gold') return null;
  if (getWeapon(id)) return rollWeaponInstance(id, rng || (() => 0.5));
  const armor = getArmor(id);
  if (armor) return instanceFromArmor(armor);
  const cont = getContainer(id);
  if (cont) return instanceFromContainer(cont);
  const potion = getPotion(id);
  if (potion) return instanceFromPotion(potion, lang || 'es');
  const light = getLight(id);
  if (light) return instanceFromLight(light, lang || 'es');
  const coin = getCoin(id);
  if (coin) return instanceFromCoin(coin, 1, lang || 'es');
  const trophy = getTrophy(id);
  if (trophy) return instanceFromTrophy(trophy, lang || 'es');
  return null;
}

export function instanceFromArmor(a) {
  return {
    baseId: a.id, name: a.name, type: 'armor', slot: a.slot,
    defense: a.defense || 0, weight: a.weight, levelReq: a.levelReq || 1,
    color: a.color, speedBonus: a.speedBonus || 0, rarity: RARITY.NORMAL,
    // Carried so EquipVisuals can pick the right worn-mesh (a closed great helm
    // vs an open cap, plate pauldrons vs a plain tunic) instead of guessing.
    coverage: a.coverage || null,
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

function slotForItem(item) {
  if (!item) return null;
  if (item.type === 'armor') return item.slot;
  if (item.type === 'container') return 'bag';
  if (item.type === 'weapon' || ['sword', 'axe', 'mace', 'lance', 'bow', 'wand'].includes(item.type)) return 'weapon';
  if (item.type === 'shield') return 'shield';
  if (item.kind === 'light') return 'extra'; // torches/lanterns go in the extra slot
  return null;
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
      const n = Math.floor(v / c.value);
      if (n > 0) { this.backpack.push(instanceFromCoin(c, n)); v -= n * c.value; }
    }
  }

  // Add `count` coins of a tier (merges into the existing stack).
  addCoins(id, count) {
    const s = this._coinStack(id, true);
    if (s) s.count += Math.max(0, Math.floor(count));
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

  // Convert 100 coins of a tier into 1 of the next tier up. Returns true/false.
  convertCoin(id) {
    const idx = COINS.findIndex((c) => c.id === id);
    if (idx < 0 || idx >= COINS.length - 1) return false; // diamond can't go up
    const from = this._coinStack(id, false);
    if (!from || from.count < 100) return false;
    from.count -= 100;
    if (from.count <= 0) this._removeCoinStack(from);
    const up = this._coinStack(COINS[idx + 1].id, true);
    up.count += 1;
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

  capacity(level) {
    return BASE_CAPACITY + (level - 1) * CAP_PER_LEVEL;
  }

  canCarry(item, level) {
    // Use the item's FULL weight (stack count + any bag contents), so picking up
    // a loaded backpack needs room for everything inside it, not just the shell.
    return this.carriedWeight() + itemWeight(item) <= this.capacity(level);
  }

  // Dry-run addToBackpack: 'ok' | 'full' | 'heavy' without mutating anything, so
  // a ground pickup can be left untouched when it wouldn't fit.
  wouldAccept(item, level) {
    if (!this.canCarry(item, level)) return 'heavy';
    if (isStackable(item) && this.backpack.some((it) => it.kind === item.kind && it.baseId === item.baseId)) return 'ok';
    if (this.backpack.length >= this.bagCapacity) return 'full';
    return 'ok';
  }

  // Add to backpack. Returns 'ok' | 'full' | 'heavy'. Stackable items (coins)
  // merge into an existing stack of the same baseId instead of taking a new cell.
  addToBackpack(item, level) {
    if (!this.canCarry(item, level)) return 'heavy';
    if (isStackable(item)) {
      const stack = this.backpack.find((it) => it.kind === item.kind && it.baseId === item.baseId);
      if (stack) { stack.count = (stack.count || 1) + (item.count || 1); return 'ok'; }
    }
    if (this.backpack.length >= this.bagCapacity) return 'full';
    this.backpack.unshift(item); // newest item shows up first in the backpack
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
      if (fromEquip) return { ok: false, reason: 'noslot' }; // slot→slot unsupported
      if (slotForItem(item) !== slot) return { ok: false, reason: 'noslot' };
      const r = this.equipFromBackpack(from.i, level); // only valid from main backpack
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

    // Merge into a same-tier stack already sitting on the target cell.
    if (target && isStackable(item) && isStackable(target) && target.baseId === item.baseId && target !== item) {
      target.count = (target.count || 1) + (moving != null ? moving : (item.count || 1));
      if (moving != null) item.count -= moving;
      else srcArr.splice(from.i, 1);
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

  // Equip an item from the backpack index. Returns { ok, reason }.
  equipFromBackpack(index, level) {
    const item = this.backpack[index];
    if (!item) return { ok: false, reason: 'none' };
    const slot = slotForItem(item);
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
    for (const s of ['helmet', 'armor', 'shield', 'legs', 'boots', 'amulet']) {
      if (this.equip[s]) d += this.equip[s].defense || 0;
    }
    return d;
  }

  speedBonus() {
    return this.equip.boots ? (this.equip.boots.speedBonus || 0) : 0;
  }

  weapon() { return this.equip.weapon; }

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
