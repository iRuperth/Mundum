import { getWeapon, getArmor, getContainer, rollWeaponInstance, RARITY } from './data/items.js';

export const EQUIP_SLOTS = ['amulet', 'helmet', 'weapon', 'armor', 'shield', 'legs', 'boots', 'bag'];
const BASE_CAPACITY = 400;
const CAP_PER_LEVEL = 12;

function norm(id) {
  return String(id || '').toLowerCase().replace(/-/g, '_');
}

// Resolve a loot itemId leniently against weapons, armors and containers.
export function resolveItem(itemId, rng, level) {
  const id = norm(itemId);
  if (id === 'gold') return null;
  if (getWeapon(id)) return rollWeaponInstance(id, rng || (() => 0.5));
  const armor = getArmor(id);
  if (armor) return instanceFromArmor(armor);
  const cont = getContainer(id);
  if (cont) return instanceFromContainer(cont);
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
    this.gold = 0;
  }

  get bagCapacity() {
    return this.equip.bag ? this.equip.bag.capacity : 0;
  }

  carriedWeight() {
    let w = 0;
    for (const s of EQUIP_SLOTS) if (this.equip[s]) w += this.equip[s].weight || 0;
    for (const it of this.backpack) w += it.weight || 0;
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
    return { equip: this.equip, backpack: this.backpack, gold: this.gold };
  }

  load(data) {
    if (!data) return;
    if (data.equip) for (const s of EQUIP_SLOTS) this.equip[s] = data.equip[s] || null;
    if (Array.isArray(data.backpack)) this.backpack = data.backpack;
    if (typeof data.gold === 'number') this.gold = data.gold;
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
