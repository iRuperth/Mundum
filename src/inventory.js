import { getWeapon, getArmor, getContainer, getPotion, instanceFromPotion, rollWeaponInstance, RARITY, COINS, getCoin } from './data/items.js';

export const EQUIP_SLOTS = ['amulet', 'helmet', 'weapon', 'armor', 'shield', 'legs', 'boots', 'bag'];
const BASE_CAPACITY = 400;
const CAP_PER_LEVEL = 12;

function norm(id) {
  return String(id || '').toLowerCase().replace(/-/g, '_');
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
  return null;
}

export function instanceFromArmor(a) {
  return {
    baseId: a.id, name: a.name, type: 'armor', slot: a.slot,
    defense: a.defense || 0, weight: a.weight, levelReq: a.levelReq || 1,
    color: a.color, speedBonus: a.speedBonus || 0, rarity: RARITY.NORMAL,
  };
}

export function instanceFromContainer(c) {
  return {
    baseId: c.id, name: c.name, type: 'container', slot: 'bag',
    capacity: c.capacity, weight: c.weight, color: c.color, rarity: RARITY.NORMAL,
    // A container carried in the backpack can hold items of its own (one nesting
    // level). The equipped bag uses the top-level `backpack` array instead.
    contents: [],
  };
}

function slotForItem(item) {
  if (!item) return null;
  if (item.type === 'armor') return item.slot;
  if (item.type === 'container') return 'bag';
  if (item.type === 'weapon' || ['sword', 'axe', 'bow', 'wand'].includes(item.type)) return 'weapon';
  if (item.type === 'shield') return 'shield';
  return null;
}

export class Inventory {
  constructor() {
    this.equip = {};
    for (const s of EQUIP_SLOTS) this.equip[s] = null;
    this.backpack = [];
    // Coins held per tier (Tibia-style). `gold` is a derived total in bronze
    // value so shops/quests keep working with a single number.
    this.coins = {};
    for (const c of COINS) this.coins[c.id] = 0;
  }

  // Total wealth in bronze units (sum of every coin times its value).
  get gold() {
    let v = 0;
    for (const c of COINS) v += (this.coins[c.id] || 0) * c.value;
    return v;
  }
  set gold(total) { this._setGoldTotal(total); }

  // Replace all coins with the minimal set that equals `total` bronze.
  _setGoldTotal(total) {
    for (const c of COINS) this.coins[c.id] = 0;
    let v = Math.max(0, Math.floor(total));
    for (let i = COINS.length - 1; i >= 0; i--) {
      const c = COINS[i];
      const n = Math.floor(v / c.value);
      this.coins[c.id] = n; v -= n * c.value;
    }
  }

  // Add coins of a tier from loot (does not auto-convert; the player converts).
  addCoins(id, count) {
    if (this.coins[id] == null) return;
    this.coins[id] += count;
  }

  // Add a flat bronze amount as bronze coins (loot drops a bronze value).
  addGold(amount) { this.coins.bronze_coin += Math.max(0, Math.floor(amount)); }

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
    if ((this.coins[id] || 0) < 100) return false;
    this.coins[id] -= 100;
    this.coins[COINS[idx + 1].id] += 1;
    return true;
  }

  // Coin stacks the player holds, for the inventory UI (only non-empty tiers).
  coinStacks() {
    return COINS.filter((c) => (this.coins[c.id] || 0) > 0)
      .map((c) => ({ ...c, count: this.coins[c.id] }));
  }

  get bagCapacity() {
    return this.equip.bag ? this.equip.bag.capacity : 0;
  }

  carriedWeight() {
    let w = 0;
    for (const s of EQUIP_SLOTS) if (this.equip[s]) w += this.equip[s].weight || 0;
    for (const it of this.backpack) {
      w += it.weight || 0;
      if (it.contents) for (const inner of it.contents) w += inner.weight || 0;
    }
    return w;
  }

  capacity(level) {
    return BASE_CAPACITY + (level - 1) * CAP_PER_LEVEL;
  }

  canCarry(item, level) {
    return this.carriedWeight() + (item.weight || 0) <= this.capacity(level);
  }

  // Add to backpack. Returns 'ok' | 'full' | 'heavy'.
  addToBackpack(item, level) {
    if (!this.canCarry(item, level)) return 'heavy';
    if (this.backpack.length >= this.bagCapacity) return 'full';
    this.backpack.push(item);
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
    bag.contents.push(item);
    return true;
  }

  // Take an item OUT of a nested bag back into the main backpack.
  takeFromBag(bagIndex, innerIndex) {
    const bag = this.backpack[bagIndex];
    if (!bag || bag.type !== 'container') return false;
    if (this.backpack.length >= this.bagCapacity) return false;
    const item = bag.contents.splice(innerIndex, 1)[0];
    if (!item) return false;
    this.backpack.push(item);
    return true;
  }

  // Equip an item from the backpack index. Returns { ok, reason }.
  equipFromBackpack(index, level) {
    const item = this.backpack[index];
    if (!item) return { ok: false, reason: 'none' };
    const slot = slotForItem(item);
    if (!slot) return { ok: false, reason: 'noslot' };
    if ((item.levelReq || 1) > level) return { ok: false, reason: 'level', need: item.levelReq };

    if ((item.twoHanded) && slot === 'weapon' && this.equip.shield) {
      if (this.backpack.length >= this.bagCapacity) return { ok: false, reason: 'full' };
    }

    this.backpack.splice(index, 1);
    const prev = this.equip[slot];
    this.equip[slot] = item;
    if (prev) this.backpack.push(prev);

    if (item.twoHanded && this.equip.shield) {
      this.backpack.push(this.equip.shield);
      this.equip.shield = null;
    }
    if (slot === 'shield' && this.equip.weapon && this.equip.weapon.twoHanded) {
      this.backpack.push(this.equip.weapon);
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
    this.backpack.push(item);
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
    // Save the exact coin pile (so a player's manual conversions persist), plus
    // the derived gold total for backward compatibility.
    return { equip: this.equip, backpack: this.backpack, coins: { ...this.coins }, gold: this.gold };
  }

  load(data) {
    if (!data) return;
    if (data.equip) for (const s of EQUIP_SLOTS) this.equip[s] = data.equip[s] || null;
    if (Array.isArray(data.backpack)) this.backpack = data.backpack;
    if (data.coins && typeof data.coins === 'object') {
      for (const c of COINS) this.coins[c.id] = data.coins[c.id] || 0;
    } else if (typeof data.gold === 'number') {
      this.gold = data.gold; // old saves only had a number
    }
  }
}

// Per-city depot storage. Items in one city's depot are not in another's.
export class DepotStore {
  constructor() { this.cities = {}; }
  for(city) {
    if (!this.cities[city]) this.cities[city] = [];
    return this.cities[city];
  }
  deposit(city, item) { this.for(city).push(item); }
  withdraw(city, index) { return this.for(city).splice(index, 1)[0] || null; }
  serialize() { return this.cities; }
  load(data) { if (data && typeof data === 'object') this.cities = data; }
}
