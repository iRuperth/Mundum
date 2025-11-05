// Pure data module: weapons, equipment, containers and item-instance helpers.
// No Three.js, no DOM. All randomness flows through a passed rng() function.

export const ELEMENTS = ['none', 'fire', 'water', 'plant'];

// Rock-paper-scissors: fire > plant, plant > water, water > fire.
// Same element = immune (0). Versus/from 'none' = neutral (1).
const ADVANTAGE = { fire: 'plant', plant: 'water', water: 'fire' };

export function elementMultiplier(attackerElem, defenderElem) {
  if (attackerElem === 'none' || defenderElem === 'none') return 1;
  if (attackerElem === defenderElem) return 0;
  if (ADVANTAGE[attackerElem] === defenderElem) return 1.2;
  return 0.8;
}

export const RARITY = { NORMAL: 'normal', ELITE: 'elite', LEGENDARY: 'legendary' };

export const LEGENDARY_CHANCE = 0.005;

// shopTier values: 'shop' (buyable), 'epic', 'legendary-tier' (creature drops only).
export const WEAPONS = [
  // --- Swords ---
  { id: 'wooden_sword', name: 'Wooden Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 1, atkMax: 5, weight: 30, levelReq: 1, shopTier: 'shop', value: 10, color: 0x9b6a3b, defense: 0 },
  { id: 'copper_sword', name: 'Copper Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 4, atkMax: 9, weight: 33, levelReq: 3, shopTier: 'shop', value: 60, color: 0xb87333, defense: 0 },
  { id: 'iron_sword', name: 'Iron Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 8, atkMax: 15, weight: 35, levelReq: 8, shopTier: 'shop', value: 240, color: 0xb0b4ba, defense: 0 },
  { id: 'steel_sword', name: 'Steel Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 14, atkMax: 24, weight: 38, levelReq: 15, shopTier: 'shop', value: 720, color: 0xd0d6dd, defense: 0 },
  { id: 'knight_sword', name: 'Knight Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 22, atkMax: 36, weight: 40, levelReq: 25, shopTier: 'shop', value: 1800, color: 0xe6eef5, defense: 0 },
  { id: 'fire_sword', name: 'Fire Sword', type: 'sword', twoHanded: false, element: 'fire', atkMin: 30, atkMax: 48, weight: 42, levelReq: 35, shopTier: 'epic', value: 0, color: 0xff5522, defense: 0 },
  { id: 'water_sword', name: 'Water Sword', type: 'sword', twoHanded: false, element: 'water', atkMin: 30, atkMax: 48, weight: 42, levelReq: 35, shopTier: 'epic', value: 0, color: 0x2299ff, defense: 0 },
  { id: 'plant_sword', name: 'Plant Sword', type: 'sword', twoHanded: false, element: 'plant', atkMin: 30, atkMax: 48, weight: 42, levelReq: 35, shopTier: 'epic', value: 0, color: 0x33cc55, defense: 0 },
  { id: 'dragon_sword', name: 'Dragon Sword', type: 'sword', twoHanded: false, element: 'fire', atkMin: 52, atkMax: 78, weight: 46, levelReq: 60, shopTier: 'epic', value: 0, color: 0xcc2200, defense: 0 },
  { id: 'demon_sword', name: 'Demon Sword', type: 'sword', twoHanded: false, element: 'fire', atkMin: 80, atkMax: 120, weight: 50, levelReq: 90, shopTier: 'legendary-tier', value: 0, color: 0x880022, defense: 0 },
  { id: 'celestial_sword', name: 'Celestial Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 120, atkMax: 170, weight: 54, levelReq: 120, shopTier: 'legendary-tier', value: 0, color: 0xfff0a0, defense: 0 },

  // --- Axes ---
  { id: 'hatchet', name: 'Hatchet', type: 'axe', twoHanded: false, element: 'none', atkMin: 3, atkMax: 8, weight: 38, levelReq: 2, shopTier: 'shop', value: 40, color: 0x8a8f96, defense: 0 },
  { id: 'iron_axe', name: 'Iron Axe', type: 'axe', twoHanded: false, element: 'none', atkMin: 10, atkMax: 18, weight: 45, levelReq: 10, shopTier: 'shop', value: 320, color: 0xb0b4ba, defense: 0 },
  { id: 'battle_axe', name: 'Battle Axe', type: 'axe', twoHanded: true, element: 'none', atkMin: 20, atkMax: 38, weight: 75, levelReq: 22, shopTier: 'shop', value: 1500, color: 0xc8ccd2, defense: 0 },
  { id: 'war_axe', name: 'War Axe', type: 'axe', twoHanded: true, element: 'none', atkMin: 36, atkMax: 60, weight: 85, levelReq: 40, shopTier: 'epic', value: 0, color: 0xdfe4ea, defense: 0 },
  { id: 'magma_axe', name: 'Magma Axe', type: 'axe', twoHanded: true, element: 'fire', atkMin: 58, atkMax: 92, weight: 92, levelReq: 65, shopTier: 'epic', value: 0, color: 0xff6a1a, defense: 0 },
  { id: 'demon_axe', name: 'Demon Axe', type: 'axe', twoHanded: true, element: 'fire', atkMin: 90, atkMax: 140, weight: 100, levelReq: 100, shopTier: 'legendary-tier', value: 0, color: 0x7a0022, defense: 0 },

  // --- Bows (two-handed, infinite arrows) ---
  { id: 'wooden_bow', name: 'Wooden Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 2, atkMax: 7, weight: 22, levelReq: 1, shopTier: 'shop', value: 30, color: 0x9b6a3b, defense: 0 },
  { id: 'hunter_bow', name: 'Hunter Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 9, atkMax: 17, weight: 25, levelReq: 12, shopTier: 'shop', value: 400, color: 0x7a5230, defense: 0 },
  { id: 'composite_bow', name: 'Composite Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 20, atkMax: 34, weight: 28, levelReq: 28, shopTier: 'shop', value: 1700, color: 0x5c3d22, defense: 0 },
  { id: 'frost_bow', name: 'Frost Bow', type: 'bow', twoHanded: true, element: 'water', atkMin: 34, atkMax: 54, weight: 30, levelReq: 45, shopTier: 'epic', value: 0, color: 0x66ccff, defense: 0 },
  { id: 'dragon_bow', name: 'Dragon Bow', type: 'bow', twoHanded: true, element: 'fire', atkMin: 70, atkMax: 108, weight: 34, levelReq: 80, shopTier: 'legendary-tier', value: 0, color: 0xcc2200, defense: 0 },

  // --- Wands (magic; color shifts by level, see wandColorForLevel) ---
  { id: 'apprentice_wand', name: 'Apprentice Wand', type: 'wand', twoHanded: false, element: 'none', atkMin: 3, atkMax: 9, weight: 12, levelReq: 4, shopTier: 'shop', value: 90, color: wandHue(4), defense: 0 },
  { id: 'fire_wand', name: 'Fire Wand', type: 'wand', twoHanded: false, element: 'fire', atkMin: 12, atkMax: 22, weight: 14, levelReq: 18, shopTier: 'shop', value: 850, color: 0xff5522, defense: 0 },
  { id: 'water_wand', name: 'Water Wand', type: 'wand', twoHanded: false, element: 'water', atkMin: 12, atkMax: 22, weight: 14, levelReq: 18, shopTier: 'shop', value: 850, color: 0x2299ff, defense: 0 },
  { id: 'plant_wand', name: 'Plant Wand', type: 'wand', twoHanded: false, element: 'plant', atkMin: 12, atkMax: 22, weight: 14, levelReq: 18, shopTier: 'shop', value: 850, color: 0x33cc55, defense: 0 },
  { id: 'arcane_wand', name: 'Arcane Wand', type: 'wand', twoHanded: false, element: 'none', atkMin: 30, atkMax: 50, weight: 16, levelReq: 50, shopTier: 'epic', value: 0, color: wandHue(50), defense: 0 },
  { id: 'void_wand', name: 'Void Wand', type: 'wand', twoHanded: false, element: 'none', atkMin: 65, atkMax: 100, weight: 18, levelReq: 95, shopTier: 'legendary-tier', value: 0, color: wandHue(95), defense: 0 },

  // --- Shields (off-hand only; carry defense, atk acts as block strength) ---
  { id: 'wooden_shield', name: 'Wooden Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 2, weight: 40, levelReq: 1, shopTier: 'shop', value: 20, color: 0x9b6a3b, defense: 6 },
  { id: 'iron_shield', name: 'Iron Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 3, weight: 50, levelReq: 8, shopTier: 'shop', value: 260, color: 0xb0b4ba, defense: 14 },
  { id: 'steel_shield', name: 'Steel Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 4, weight: 55, levelReq: 16, shopTier: 'shop', value: 780, color: 0xd0d6dd, defense: 24 },
  { id: 'tower_shield', name: 'Tower Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 5, weight: 70, levelReq: 30, shopTier: 'shop', value: 2200, color: 0xe6eef5, defense: 38 },
  { id: 'dragon_shield', name: 'Dragon Shield', type: 'shield', twoHanded: false, element: 'fire', atkMin: 0, atkMax: 8, weight: 65, levelReq: 60, shopTier: 'epic', value: 0, color: 0xcc2200, defense: 60 },
  { id: 'demon_shield', name: 'Demon Shield', type: 'shield', twoHanded: false, element: 'fire', atkMin: 0, atkMax: 12, weight: 68, levelReq: 95, shopTier: 'legendary-tier', value: 0, color: 0x7a0022, defense: 90 },
];

// Equipment slots: amulet, helmet, armor, legs, boots.
export const ARMORS = [
  // --- Amulets ---
  { id: 'copper_amulet', name: 'Copper Amulet', slot: 'amulet', defense: 2, weight: 5, levelReq: 1, shopTier: 'shop', value: 50, color: 0xb87333, speedBonus: 0 },
  { id: 'silver_amulet', name: 'Silver Amulet', slot: 'amulet', defense: 6, weight: 5, levelReq: 15, shopTier: 'shop', value: 600, color: 0xc8ccd2, speedBonus: 0 },
  { id: 'dragon_amulet', name: 'Dragon Amulet', slot: 'amulet', defense: 16, weight: 6, levelReq: 60, shopTier: 'epic', value: 0, color: 0xcc2200, speedBonus: 0 },

  // --- Helmets ---
  { id: 'leather_helmet', name: 'Leather Helmet', slot: 'helmet', defense: 3, weight: 18, levelReq: 1, shopTier: 'shop', value: 40, color: 0x7a5230, speedBonus: 0 },
  { id: 'iron_helmet', name: 'Iron Helmet', slot: 'helmet', defense: 8, weight: 30, levelReq: 10, shopTier: 'shop', value: 300, color: 0xb0b4ba, speedBonus: 0 },
  { id: 'steel_helmet', name: 'Steel Helmet', slot: 'helmet', defense: 14, weight: 34, levelReq: 20, shopTier: 'shop', value: 950, color: 0xd0d6dd, speedBonus: 0 },
  { id: 'dragon_helmet', name: 'Dragon Helmet', slot: 'helmet', defense: 28, weight: 36, levelReq: 60, shopTier: 'epic', value: 0, color: 0xcc2200, speedBonus: 0 },

  // --- Armor (chest) ---
  { id: 'leather_armor', name: 'Leather Armor', slot: 'armor', defense: 6, weight: 70, levelReq: 1, shopTier: 'shop', value: 80, color: 0x7a5230, speedBonus: 0 },
  { id: 'iron_armor', name: 'Iron Armor', slot: 'armor', defense: 16, weight: 120, levelReq: 12, shopTier: 'shop', value: 700, color: 0xb0b4ba, speedBonus: 0 },
  { id: 'steel_armor', name: 'Steel Armor', slot: 'armor', defense: 28, weight: 130, levelReq: 22, shopTier: 'shop', value: 2200, color: 0xd0d6dd, speedBonus: 0 },
  { id: 'knight_armor', name: 'Knight Armor', slot: 'armor', defense: 42, weight: 140, levelReq: 35, shopTier: 'shop', value: 6000, color: 0xe6eef5, speedBonus: 0 },
  { id: 'dragon_armor', name: 'Dragon Armor', slot: 'armor', defense: 70, weight: 135, levelReq: 65, shopTier: 'epic', value: 0, color: 0xcc2200, speedBonus: 0 },
  { id: 'demon_armor', name: 'Demon Armor', slot: 'armor', defense: 110, weight: 150, levelReq: 100, shopTier: 'legendary-tier', value: 0, color: 0x7a0022, speedBonus: 0 },

  // --- Legs ---
  { id: 'leather_legs', name: 'Leather Legs', slot: 'legs', defense: 4, weight: 40, levelReq: 1, shopTier: 'shop', value: 50, color: 0x7a5230, speedBonus: 0 },
  { id: 'iron_legs', name: 'Iron Legs', slot: 'legs', defense: 10, weight: 70, levelReq: 12, shopTier: 'shop', value: 450, color: 0xb0b4ba, speedBonus: 0 },
  { id: 'steel_legs', name: 'Steel Legs', slot: 'legs', defense: 18, weight: 78, levelReq: 22, shopTier: 'shop', value: 1400, color: 0xd0d6dd, speedBonus: 0 },
  { id: 'dragon_legs', name: 'Dragon Legs', slot: 'legs', defense: 40, weight: 80, levelReq: 65, shopTier: 'epic', value: 0, color: 0xcc2200, speedBonus: 0 },

  // --- Boots (some grant speedBonus; 'fast' variant) ---
  { id: 'leather_boots', name: 'Leather Boots', slot: 'boots', defense: 2, weight: 14, levelReq: 1, shopTier: 'shop', value: 30, color: 0x7a5230, speedBonus: 0 },
  { id: 'iron_boots', name: 'Iron Boots', slot: 'boots', defense: 6, weight: 26, levelReq: 12, shopTier: 'shop', value: 280, color: 0xb0b4ba, speedBonus: 0 },
  { id: 'fast_boots', name: 'Boots of Haste', slot: 'boots', defense: 3, weight: 16, levelReq: 20, shopTier: 'shop', value: 3500, color: 0xffd24d, speedBonus: 0.3 },
  { id: 'swift_boots', name: 'Swift Boots', slot: 'boots', defense: 8, weight: 18, levelReq: 45, shopTier: 'epic', value: 0, color: 0x66ddaa, speedBonus: 0.5 },
];

export const CONTAINERS = [
  { id: 'bag', name: 'Bag', slot: 'bag', capacity: 8, weight: 18, value: 50, color: 0x8a6a3b },
  { id: 'backpack', name: 'Backpack', slot: 'bag', capacity: 20, weight: 30, value: 250, color: 0x6a4a2b },
];

export const LEGENDARY_ABILITIES = [
  { id: 'ember', name: 'Ember', desc: 'Adds a burst of fire damage on hit.', element: 'fire' },
  { id: 'tide', name: 'Tide', desc: 'Adds a burst of water damage on hit.', element: 'water' },
  { id: 'bloom', name: 'Bloom', desc: 'Adds a burst of nature damage on hit.', element: 'plant' },
];

// Lookup maps for O(1) access.
const WEAPON_MAP = new Map(WEAPONS.map((w) => [w.id, w]));
const ARMOR_MAP = new Map(ARMORS.map((a) => [a.id, a]));
const CONTAINER_MAP = new Map(CONTAINERS.map((c) => [c.id, c]));

export function getWeapon(id) { return WEAPON_MAP.get(id); }
export function getArmor(id) { return ARMOR_MAP.get(id); }
export function getContainer(id) { return CONTAINER_MAP.get(id); }

// Hue progression for wands: shifts from blue/purple toward warm gold as level rises.
function wandHue(level) {
  const t = Math.max(0, Math.min(1, (level - 1) / 119));
  // Hue in degrees, sweeping 270 -> 45 across the level span.
  const hue = 270 - 225 * t;
  return hslToHex(hue, 0.75, 0.55);
}

export function wandColorForLevel(level) {
  return wandHue(level);
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = l - c / 2;
  const ri = Math.round((r + m) * 255);
  const gi = Math.round((g + m) * 255);
  const bi = Math.round((b + m) * 255);
  return (ri << 16) | (gi << 8) | bi;
}

// Roll a concrete item instance from a base weapon id.
// rng() must return a float in [0, 1). All randomness is external.
export function rollWeaponInstance(baseId, rng) {
  const base = WEAPON_MAP.get(baseId);
  if (!base) return null;

  const span = base.atkMax - base.atkMin;
  let atk = base.atkMin + Math.floor(rng() * (span + 1));

  let rarity = RARITY.NORMAL;
  let ability = null;

  if (rng() < LEGENDARY_CHANCE) {
    rarity = RARITY.LEGENDARY;
    atk = base.atkMax;
    const pick = LEGENDARY_ABILITIES[Math.floor(rng() * LEGENDARY_ABILITIES.length)];
    ability = pick || null;
  } else if (atk === base.atkMax && span > 0) {
    rarity = RARITY.ELITE;
  }

  let name = base.name;
  if (rarity === RARITY.LEGENDARY) name = 'Legendary ' + base.name;
  else if (rarity === RARITY.ELITE) name = 'Elite ' + base.name;

  const element = rarity === RARITY.LEGENDARY && ability ? ability.element : base.element;

  return {
    baseId: base.id,
    name,
    type: base.type,
    twoHanded: base.twoHanded,
    element,
    atk,
    rarity,
    weight: base.weight,
    levelReq: base.levelReq,
    color: base.color,
    defense: base.defense,
    ability,
  };
}

// Convenience: a fresh starter wand instance. Falls back to a fixed roll.
export function makeStarterWand(rng) {
  return rollWeaponInstance('apprentice_wand', rng || (() => 0.5));
}
