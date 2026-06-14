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

// Chance a dropped weapon rolls the "Legendary" rarity prefix (an elemental
// bonus + max attack). Kept very rare — a day of farming yields ~one or none —
// per the user's "legendarios 0.01" target.
export const LEGENDARY_CHANCE = 0.0001;

// shopTier values: 'shop' (buyable), 'epic', 'legendary-tier' (creature drops only).
// `vocation` gates EQUIPPING (not looting): 'knight' | 'archer' | 'mage' | 'druid'
// | 'any'. 'archer' maps to the internal profession id 'paladin'. Mage and druid
// can both use any 'mage'-tagged wand; rods tagged 'druid' are druid-only. See
// canVocationUse() below for the exact rule.
export const WEAPONS = [
  // --- Swords (1-handed) — 23 tiers, Tibia/MapleStory flavored — KNIGHT ---
  { id: 'training_sword', name: 'Training Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 1, atkMax: 3, weight: 28, levelReq: 1, shopTier: 'shop', value: 5, color: 0x8a7a5a, defense: 0, vocation: 'any' },
  { id: 'wooden_sword', name: 'Wooden Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 1, atkMax: 5, weight: 30, levelReq: 1, shopTier: 'shop', value: 10, color: 0x9b6a3b, defense: 0, vocation: 'any' },
  { id: 'short_sword', name: 'Short Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 2, atkMax: 7, weight: 31, levelReq: 2, shopTier: 'shop', value: 30, color: 0xb0a090, defense: 0, vocation: 'knight' },
  { id: 'copper_sword', name: 'Copper Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 4, atkMax: 9, weight: 33, levelReq: 3, shopTier: 'shop', value: 60, color: 0xb87333, defense: 0, vocation: 'knight' },
  { id: 'dagger', name: 'Dagger', type: 'sword', twoHanded: false, element: 'none', atkMin: 5, atkMax: 11, weight: 18, levelReq: 5, shopTier: 'shop', value: 110, color: 0xc8ccd2, defense: 0, vocation: 'knight' },
  { id: 'rapier', name: 'Rapier', type: 'sword', twoHanded: false, element: 'none', atkMin: 6, atkMax: 13, weight: 28, levelReq: 6, shopTier: 'shop', value: 160, color: 0xd8dde4, defense: 0, vocation: 'knight' },
  { id: 'iron_sword', name: 'Iron Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 8, atkMax: 15, weight: 35, levelReq: 8, shopTier: 'shop', value: 240, color: 0xb0b4ba, defense: 0, vocation: 'knight' },
  { id: 'sabre', name: 'Sabre', type: 'sword', twoHanded: false, element: 'none', atkMin: 11, atkMax: 19, weight: 36, levelReq: 11, shopTier: 'shop', value: 420, color: 0xc0c4ca, defense: 0, vocation: 'knight' },
  { id: 'carlin_sword', name: 'Carlin Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 16, atkMax: 27, weight: 39, levelReq: 19, shopTier: 'shop', value: 1080, color: 0xd6dbe2, defense: 0, vocation: 'knight' },
  { id: 'steel_sword', name: 'Steel Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 14, atkMax: 24, weight: 38, levelReq: 15, shopTier: 'shop', value: 720, color: 0xd0d6dd, defense: 0, vocation: 'knight' },
  { id: 'broadsword', name: 'Broadsword', type: 'sword', twoHanded: false, element: 'none', atkMin: 18, atkMax: 30, weight: 39, levelReq: 20, shopTier: 'shop', value: 1200, color: 0xdadfe6, defense: 0, vocation: 'knight' },
  { id: 'knight_sword', name: 'Knight Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 22, atkMax: 36, weight: 40, levelReq: 25, shopTier: 'shop', value: 1800, color: 0xe6eef5, defense: 0, vocation: 'knight' },
  { id: 'crystal_sword', name: 'Crystal Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 26, atkMax: 42, weight: 41, levelReq: 30, shopTier: 'shop', value: 3000, color: 0xaef0ff, defense: 0, vocation: 'knight' },
  { id: 'ice_rapier', name: 'Ice Rapier', type: 'sword', twoHanded: false, element: 'water', atkMin: 36, atkMax: 52, weight: 22, levelReq: 30, shopTier: 'epic', value: 0, color: 0xbfe9ff, defense: 0, vocation: 'knight' },
  { id: 'fire_sword', name: 'Fire Sword', type: 'sword', twoHanded: false, element: 'fire', atkMin: 30, atkMax: 48, weight: 42, levelReq: 35, shopTier: 'epic', value: 0, color: 0xff5522, defense: 0, vocation: 'knight' },
  { id: 'water_sword', name: 'Water Sword', type: 'sword', twoHanded: false, element: 'water', atkMin: 30, atkMax: 48, weight: 42, levelReq: 35, shopTier: 'epic', value: 0, color: 0x2299ff, defense: 0, vocation: 'knight' },
  { id: 'plant_sword', name: 'Plant Sword', type: 'sword', twoHanded: false, element: 'plant', atkMin: 30, atkMax: 48, weight: 42, levelReq: 35, shopTier: 'epic', value: 0, color: 0x33cc55, defense: 0, vocation: 'knight' },
  { id: 'serpent_sword', name: 'Serpent Sword', type: 'sword', twoHanded: false, element: 'plant', atkMin: 38, atkMax: 58, weight: 44, levelReq: 45, shopTier: 'epic', value: 0, color: 0x6ab04c, defense: 0, vocation: 'knight' },
  { id: 'giant_sword', name: 'Giant Sword', type: 'sword', twoHanded: true, element: 'none', atkMin: 46, atkMax: 70, weight: 95, levelReq: 45, shopTier: 'epic', value: 0, color: 0xdadfe6, defense: 0, vocation: 'knight' },
  { id: 'frost_blade', name: 'Frostmourne', type: 'sword', twoHanded: false, element: 'water', atkMin: 44, atkMax: 66, weight: 45, levelReq: 52, shopTier: 'epic', value: 0, color: 0x9fe8ff, defense: 0, vocation: 'knight' },
  { id: 'dragon_sword', name: 'Dragon Sword', type: 'sword', twoHanded: false, element: 'fire', atkMin: 52, atkMax: 78, weight: 46, levelReq: 60, shopTier: 'epic', value: 0, color: 0xcc2200, defense: 0, vocation: 'knight' },
  { id: 'warlord_sword', name: 'Warlord Sword', type: 'sword', twoHanded: true, element: 'none', atkMin: 74, atkMax: 112, weight: 98, levelReq: 70, shopTier: 'legendary-tier', value: 0, color: 0xffe066, defense: 0, vocation: 'knight' },
  { id: 'hellforged_blade', name: 'Hellforged Blade', type: 'sword', twoHanded: false, element: 'fire', atkMin: 64, atkMax: 96, weight: 48, levelReq: 72, shopTier: 'epic', value: 0, color: 0xff3a1a, defense: 0, vocation: 'knight' },
  { id: 'magic_sword', name: 'Magic Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 84, atkMax: 124, weight: 50, levelReq: 80, shopTier: 'legendary-tier', value: 0, color: 0xb84cff, defense: 0, vocation: 'knight' },
  { id: 'demon_sword', name: 'Demon Sword', type: 'sword', twoHanded: false, element: 'fire', atkMin: 80, atkMax: 120, weight: 50, levelReq: 90, shopTier: 'legendary-tier', value: 0, color: 0x880022, defense: 0, vocation: 'knight' },
  { id: 'soul_reaver', name: 'Soul Reaver', type: 'sword', twoHanded: false, element: 'none', atkMin: 96, atkMax: 142, weight: 52, levelReq: 105, shopTier: 'legendary-tier', value: 0, color: 0x9b59ff, defense: 0, vocation: 'knight' },
  { id: 'celestial_sword', name: 'Celestial Sword', type: 'sword', twoHanded: false, element: 'none', atkMin: 120, atkMax: 170, weight: 54, levelReq: 120, shopTier: 'legendary-tier', value: 0, color: 0xfff0a0, defense: 0, vocation: 'knight' },
  { id: 'excalibur', name: 'Excalibur', type: 'sword', twoHanded: false, element: 'none', atkMin: 150, atkMax: 210, weight: 56, levelReq: 140, shopTier: 'legendary-tier', value: 0, color: 0xffe066, defense: 0, vocation: 'knight' },

  // --- Axes (mix of 1H and 2H) — 22 tiers — KNIGHT ---
  { id: 'hand_axe', name: 'Hand Axe', type: 'axe', twoHanded: false, element: 'none', atkMin: 2, atkMax: 6, weight: 35, levelReq: 1, shopTier: 'shop', value: 18, color: 0x9a8f86, defense: 0, vocation: 'any' },
  { id: 'hatchet', name: 'Hatchet', type: 'axe', twoHanded: false, element: 'none', atkMin: 3, atkMax: 8, weight: 38, levelReq: 2, shopTier: 'shop', value: 40, color: 0x8a8f96, defense: 0, vocation: 'knight' },
  { id: 'copper_axe', name: 'Copper Axe', type: 'axe', twoHanded: false, element: 'none', atkMin: 5, atkMax: 11, weight: 42, levelReq: 4, shopTier: 'shop', value: 90, color: 0xb87333, defense: 0, vocation: 'knight' },
  { id: 'tomahawk', name: 'Tomahawk', type: 'axe', twoHanded: false, element: 'none', atkMin: 7, atkMax: 14, weight: 40, levelReq: 6, shopTier: 'shop', value: 170, color: 0xa0a4aa, defense: 0, vocation: 'knight' },
  { id: 'iron_axe', name: 'Iron Axe', type: 'axe', twoHanded: false, element: 'none', atkMin: 10, atkMax: 18, weight: 45, levelReq: 10, shopTier: 'shop', value: 320, color: 0xb0b4ba, defense: 0, vocation: 'knight' },
  { id: 'double_axe', name: 'Double Axe', type: 'axe', twoHanded: false, element: 'none', atkMin: 14, atkMax: 24, weight: 55, levelReq: 14, shopTier: 'shop', value: 620, color: 0xc0c4ca, defense: 0, vocation: 'knight' },
  { id: 'halberd', name: 'Halberd', type: 'axe', twoHanded: true, element: 'none', atkMin: 17, atkMax: 31, weight: 70, levelReq: 18, shopTier: 'shop', value: 1000, color: 0xc8ccd2, defense: 0, vocation: 'knight' },
  { id: 'battle_axe', name: 'Battle Axe', type: 'axe', twoHanded: true, element: 'none', atkMin: 20, atkMax: 38, weight: 75, levelReq: 22, shopTier: 'shop', value: 1500, color: 0xc8ccd2, defense: 0, vocation: 'knight' },
  { id: 'great_axe', name: 'Great Axe', type: 'axe', twoHanded: true, element: 'none', atkMin: 26, atkMax: 46, weight: 80, levelReq: 28, shopTier: 'shop', value: 2600, color: 0xd4d8de, defense: 0, vocation: 'knight' },
  { id: 'knight_axe', name: 'Knight Axe', type: 'axe', twoHanded: false, element: 'none', atkMin: 28, atkMax: 47, weight: 56, levelReq: 28, shopTier: 'shop', value: 2800, color: 0xe6eef5, defense: 0, vocation: 'knight' },
  { id: 'guardian_axe', name: 'Guardian Halberd', type: 'axe', twoHanded: true, element: 'none', atkMin: 31, atkMax: 53, weight: 82, levelReq: 34, shopTier: 'shop', value: 4200, color: 0xe0e4ea, defense: 0, vocation: 'knight' },
  { id: 'war_axe', name: 'War Axe', type: 'axe', twoHanded: true, element: 'none', atkMin: 36, atkMax: 60, weight: 85, levelReq: 40, shopTier: 'epic', value: 0, color: 0xdfe4ea, defense: 0, vocation: 'knight' },
  { id: 'beast_cleaver', name: 'Beast Cleaver', type: 'axe', twoHanded: true, element: 'plant', atkMin: 42, atkMax: 70, weight: 88, levelReq: 48, shopTier: 'epic', value: 0, color: 0x7cae3c, defense: 0, vocation: 'knight' },
  { id: 'glacial_axe', name: 'Glacial Axe', type: 'axe', twoHanded: true, element: 'water', atkMin: 50, atkMax: 80, weight: 90, levelReq: 56, shopTier: 'epic', value: 0, color: 0x7fd4ff, defense: 0, vocation: 'knight' },
  { id: 'stonecutter_axe', name: 'Stonecutter Axe', type: 'axe', twoHanded: false, element: 'none', atkMin: 56, atkMax: 84, weight: 62, levelReq: 60, shopTier: 'legendary-tier', value: 0, color: 0xc8ccd2, defense: 0, vocation: 'knight' },
  { id: 'magma_axe', name: 'Magma Axe', type: 'axe', twoHanded: true, element: 'fire', atkMin: 58, atkMax: 92, weight: 92, levelReq: 65, shopTier: 'epic', value: 0, color: 0xff6a1a, defense: 0, vocation: 'knight' },
  { id: 'ravagers_axe', name: "Ravager's Axe", type: 'axe', twoHanded: true, element: 'none', atkMin: 76, atkMax: 116, weight: 96, levelReq: 70, shopTier: 'legendary-tier', value: 0, color: 0xb01030, defense: 0, vocation: 'knight' },
  { id: 'titan_axe', name: 'Titan Axe', type: 'axe', twoHanded: true, element: 'none', atkMin: 68, atkMax: 106, weight: 95, levelReq: 75, shopTier: 'epic', value: 0, color: 0xe8edf2, defense: 0, vocation: 'knight' },
  { id: 'demon_axe', name: 'Demon Axe', type: 'axe', twoHanded: true, element: 'fire', atkMin: 90, atkMax: 140, weight: 100, levelReq: 100, shopTier: 'legendary-tier', value: 0, color: 0x7a0022, defense: 0, vocation: 'knight' },
  { id: 'apocalypse_axe', name: 'Apocalypse Axe', type: 'axe', twoHanded: true, element: 'fire', atkMin: 110, atkMax: 168, weight: 104, levelReq: 118, shopTier: 'legendary-tier', value: 0, color: 0xb01030, defense: 0, vocation: 'knight' },
  { id: 'worldsplitter', name: 'Worldsplitter', type: 'axe', twoHanded: true, element: 'none', atkMin: 140, atkMax: 205, weight: 108, levelReq: 138, shopTier: 'legendary-tier', value: 0, color: 0xffd27a, defense: 0, vocation: 'knight' },
  { id: 'rusty_axe', name: 'Rusty Axe', type: 'axe', twoHanded: false, element: 'none', atkMin: 3, atkMax: 7, weight: 40, levelReq: 3, shopTier: 'shop', value: 55, color: 0x9a7a5a, defense: 0, vocation: 'knight' },
  { id: 'mining_pick', name: 'Mining Pick', type: 'axe', twoHanded: false, element: 'none', atkMin: 8, atkMax: 16, weight: 48, levelReq: 9, shopTier: 'shop', value: 250, color: 0x8a8f96, defense: 0, vocation: 'any' },
  { id: 'reaper_scythe', name: 'Reaper Scythe', type: 'axe', twoHanded: true, element: 'plant', atkMin: 60, atkMax: 96, weight: 90, levelReq: 68, shopTier: 'epic', value: 0, color: 0x6ab04c, defense: 0, vocation: 'knight' },

  // --- Maces (1H, KNIGHT) — Tibia blunt-weapon ladder ---
  { id: 'club', name: 'Club', type: 'mace', twoHanded: false, element: 'none', atkMin: 1, atkMax: 4, weight: 38, levelReq: 1, shopTier: 'shop', value: 8, color: 0x9b6a3b, defense: 0, vocation: 'any' },
  { id: 'studded_club', name: 'Studded Club', type: 'mace', twoHanded: false, element: 'none', atkMin: 4, atkMax: 10, weight: 42, levelReq: 5, shopTier: 'shop', value: 120, color: 0x8a7a55, defense: 0, vocation: 'knight' },
  { id: 'mace', name: 'Mace', type: 'mace', twoHanded: false, element: 'none', atkMin: 7, atkMax: 14, weight: 48, levelReq: 8, shopTier: 'shop', value: 260, color: 0xb0b4ba, defense: 0, vocation: 'knight' },
  { id: 'morning_star', name: 'Morning Star', type: 'mace', twoHanded: false, element: 'none', atkMin: 11, atkMax: 20, weight: 52, levelReq: 12, shopTier: 'shop', value: 480, color: 0xc0c4ca, defense: 0, vocation: 'knight' },
  { id: 'battle_hammer', name: 'Battle Hammer', type: 'mace', twoHanded: false, element: 'none', atkMin: 16, atkMax: 27, weight: 56, levelReq: 18, shopTier: 'shop', value: 960, color: 0xc8ccd2, defense: 0, vocation: 'knight' },
  { id: 'clerical_mace', name: 'Clerical Mace', type: 'mace', twoHanded: false, element: 'none', atkMin: 22, atkMax: 36, weight: 58, levelReq: 25, shopTier: 'shop', value: 1900, color: 0xf0d878, defense: 0, vocation: 'knight' },
  { id: 'war_hammer', name: 'War Hammer', type: 'mace', twoHanded: false, element: 'none', atkMin: 30, atkMax: 48, weight: 64, levelReq: 35, shopTier: 'epic', value: 0, color: 0xd0d6dd, defense: 0, vocation: 'knight' },
  { id: 'dragon_hammer', name: 'Dragon Hammer', type: 'mace', twoHanded: false, element: 'fire', atkMin: 46, atkMax: 72, weight: 70, levelReq: 50, shopTier: 'epic', value: 0, color: 0xcc2200, defense: 0, vocation: 'knight' },
  { id: 'hammer_of_wrath', name: 'Hammer of Wrath', type: 'mace', twoHanded: false, element: 'none', atkMin: 78, atkMax: 118, weight: 80, levelReq: 75, shopTier: 'legendary-tier', value: 0, color: 0xffe066, defense: 0, vocation: 'knight' },
  { id: 'thunder_hammer', name: 'Thunder Hammer', type: 'mace', twoHanded: false, element: 'fire', atkMin: 96, atkMax: 144, weight: 86, levelReq: 90, shopTier: 'legendary-tier', value: 0, color: 0xbfe9ff, defense: 0, vocation: 'knight' },

  // --- Lances (2H, KNIGHT) — long reach polearms ---
  { id: 'training_lance', name: 'Training Lance', type: 'lance', twoHanded: true, element: 'none', atkMin: 2, atkMax: 6, weight: 50, levelReq: 1, shopTier: 'shop', value: 14, color: 0x9b6a3b, defense: 0, vocation: 'any' },
  { id: 'iron_lance', name: 'Iron Lance', type: 'lance', twoHanded: true, element: 'none', atkMin: 16, atkMax: 28, weight: 68, levelReq: 12, shopTier: 'shop', value: 640, color: 0xb0b4ba, defense: 0, vocation: 'knight' },
  { id: 'dragon_lance', name: 'Dragon Lance', type: 'lance', twoHanded: true, element: 'fire', atkMin: 40, atkMax: 64, weight: 82, levelReq: 40, shopTier: 'epic', value: 0, color: 0xcc2200, defense: 0, vocation: 'knight' },
  { id: 'royal_lance', name: 'Royal Lance', type: 'lance', twoHanded: true, element: 'none', atkMin: 64, atkMax: 98, weight: 88, levelReq: 60, shopTier: 'epic', value: 0, color: 0xeaf0f6, defense: 0, vocation: 'knight' },
  { id: 'jarvan_lance', name: 'Ceremonial War Lance', type: 'lance', twoHanded: true, element: 'fire', atkMin: 108, atkMax: 160, weight: 98, levelReq: 90, shopTier: 'legendary-tier', value: 0, color: 0xffe066, defense: 0, vocation: 'knight' },

  // --- Bows (two-handed, infinite arrows) — 20 tiers — ARCHER ---
  { id: 'training_bow', name: 'Training Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 1, atkMax: 5, weight: 20, levelReq: 1, shopTier: 'shop', value: 12, color: 0x8a7a5a, defense: 0, vocation: 'any' },
  { id: 'wooden_bow', name: 'Wooden Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 2, atkMax: 7, weight: 22, levelReq: 1, shopTier: 'shop', value: 30, color: 0x9b6a3b, defense: 0, vocation: 'any' },
  { id: 'short_bow', name: 'Short Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 4, atkMax: 10, weight: 22, levelReq: 4, shopTier: 'shop', value: 95, color: 0xa07a40, defense: 0, vocation: 'archer' },
  { id: 'long_bow', name: 'Long Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 6, atkMax: 13, weight: 24, levelReq: 7, shopTier: 'shop', value: 210, color: 0x8a5e30, defense: 0, vocation: 'archer' },
  { id: 'hunter_bow', name: 'Hunter Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 9, atkMax: 17, weight: 25, levelReq: 12, shopTier: 'shop', value: 400, color: 0x7a5230, defense: 0, vocation: 'archer' },
  { id: 'hunting_spear', name: 'Hunting Spear', type: 'bow', twoHanded: true, element: 'none', atkMin: 10, atkMax: 19, weight: 40, levelReq: 12, shopTier: 'shop', value: 450, color: 0x8a6a45, defense: 0, vocation: 'archer' },
  { id: 'recurve_bow', name: 'Recurve Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 13, atkMax: 23, weight: 26, levelReq: 17, shopTier: 'shop', value: 800, color: 0x6e4a2c, defense: 0, vocation: 'archer' },
  { id: 'crossbow', name: 'Crossbow', type: 'bow', twoHanded: true, element: 'none', atkMin: 16, atkMax: 28, weight: 32, levelReq: 22, shopTier: 'shop', value: 1200, color: 0x8a8f96, defense: 0, vocation: 'archer' },
  { id: 'royal_spear', name: 'Royal Spear', type: 'bow', twoHanded: true, element: 'none', atkMin: 19, atkMax: 32, weight: 42, levelReq: 25, shopTier: 'shop', value: 1500, color: 0xeaf0f6, defense: 0, vocation: 'archer' },
  { id: 'composite_bow', name: 'Composite Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 20, atkMax: 34, weight: 28, levelReq: 28, shopTier: 'shop', value: 1700, color: 0x5c3d22, defense: 0, vocation: 'archer' },
  { id: 'elven_bow', name: 'Elven Bow', type: 'bow', twoHanded: true, element: 'plant', atkMin: 25, atkMax: 41, weight: 26, levelReq: 34, shopTier: 'shop', value: 3200, color: 0x8fdc7a, defense: 0, vocation: 'archer' },
  { id: 'arbalest', name: 'Arbalest', type: 'bow', twoHanded: true, element: 'none', atkMin: 30, atkMax: 48, weight: 34, levelReq: 40, shopTier: 'epic', value: 0, color: 0xb0b4ba, defense: 0, vocation: 'archer' },
  { id: 'frost_bow', name: 'Frost Bow', type: 'bow', twoHanded: true, element: 'water', atkMin: 34, atkMax: 54, weight: 30, levelReq: 45, shopTier: 'epic', value: 0, color: 0x66ccff, defense: 0, vocation: 'archer' },
  { id: 'flame_bow', name: 'Flamestrike Bow', type: 'bow', twoHanded: true, element: 'fire', atkMin: 42, atkMax: 64, weight: 31, levelReq: 52, shopTier: 'epic', value: 0, color: 0xff7a3a, defense: 0, vocation: 'archer' },
  { id: 'storm_bow', name: 'Storm Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 52, atkMax: 80, weight: 32, levelReq: 62, shopTier: 'epic', value: 0, color: 0xc0e0ff, defense: 0, vocation: 'archer' },
  { id: 'dragon_bow', name: 'Dragon Bow', type: 'bow', twoHanded: true, element: 'fire', atkMin: 70, atkMax: 108, weight: 34, levelReq: 80, shopTier: 'legendary-tier', value: 0, color: 0xcc2200, defense: 0, vocation: 'archer' },
  { id: 'phoenix_bow', name: 'Phoenix Bow', type: 'bow', twoHanded: true, element: 'fire', atkMin: 88, atkMax: 132, weight: 35, levelReq: 98, shopTier: 'legendary-tier', value: 0, color: 0xff9933, defense: 0, vocation: 'archer' },
  { id: 'hardened_bow', name: 'Hardened Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 11, atkMax: 20, weight: 25, levelReq: 14, shopTier: 'shop', value: 600, color: 0x7a5230, defense: 0, vocation: 'archer' },
  { id: 'recon_bow', name: 'Scout Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 8, atkMax: 15, weight: 23, levelReq: 9, shopTier: 'shop', value: 290, color: 0x8a5e30, defense: 0, vocation: 'archer' },
  { id: 'venom_bow', name: 'Venom Bow', type: 'bow', twoHanded: true, element: 'plant', atkMin: 38, atkMax: 58, weight: 30, levelReq: 48, shopTier: 'epic', value: 0, color: 0x7cae3c, defense: 0, vocation: 'archer' },
  { id: 'eternal_bow', name: 'Eternal Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 112, atkMax: 162, weight: 36, levelReq: 118, shopTier: 'legendary-tier', value: 0, color: 0xfff0a0, defense: 0, vocation: 'archer' },
  { id: 'genesis_bow', name: 'Genesis Bow', type: 'bow', twoHanded: true, element: 'none', atkMin: 140, atkMax: 200, weight: 38, levelReq: 138, shopTier: 'legendary-tier', value: 0, color: 0xffe066, defense: 0, vocation: 'archer' },

  // --- Wands & rods (magic; color shifts by level) — MAGE (rods tagged DRUID) ---
  { id: 'twig_wand', name: 'Wand of Vortex', type: 'wand', twoHanded: false, element: 'none', atkMin: 1, atkMax: 5, weight: 10, levelReq: 1, shopTier: 'shop', value: 25, color: wandHue(1), defense: 0 },
  { id: 'apprentice_wand', name: 'Apprentice Wand', type: 'wand', twoHanded: false, element: 'none', atkMin: 3, atkMax: 9, weight: 12, levelReq: 4, shopTier: 'shop', value: 90, color: wandHue(4), defense: 0 },
  { id: 'snakebite_rod', name: 'Snakebite Rod', type: 'wand', twoHanded: false, element: 'plant', atkMin: 6, atkMax: 13, weight: 13, levelReq: 8, shopTier: 'shop', value: 260, color: 0x5fae4c, defense: 0 },
  { id: 'moonlight_rod', name: 'Moonlight Rod', type: 'wand', twoHanded: false, element: 'water', atkMin: 9, atkMax: 17, weight: 13, levelReq: 12, shopTier: 'shop', value: 480, color: 0x6fa8ff, defense: 0 },
  { id: 'fire_wand', name: 'Fire Wand', type: 'wand', twoHanded: false, element: 'fire', atkMin: 12, atkMax: 22, weight: 14, levelReq: 18, shopTier: 'shop', value: 850, color: 0xff5522, defense: 0 },
  { id: 'water_wand', name: 'Water Wand', type: 'wand', twoHanded: false, element: 'water', atkMin: 12, atkMax: 22, weight: 14, levelReq: 18, shopTier: 'shop', value: 850, color: 0x2299ff, defense: 0 },
  { id: 'plant_wand', name: 'Plant Wand', type: 'wand', twoHanded: false, element: 'plant', atkMin: 12, atkMax: 22, weight: 14, levelReq: 18, shopTier: 'shop', value: 850, color: 0x33cc55, defense: 0 },
  { id: 'wand_of_decay', name: 'Wand of Decay', type: 'wand', twoHanded: false, element: 'plant', atkMin: 16, atkMax: 28, weight: 15, levelReq: 24, shopTier: 'shop', value: 1500, color: 0x7fae2c, defense: 0 },
  { id: 'wand_of_inferno', name: 'Wand of Inferno', type: 'wand', twoHanded: false, element: 'fire', atkMin: 21, atkMax: 35, weight: 15, levelReq: 30, shopTier: 'shop', value: 2600, color: 0xff6a1a, defense: 0 },
  { id: 'mystic_staff', name: 'Mystic Staff', type: 'wand', twoHanded: false, element: 'none', atkMin: 25, atkMax: 42, weight: 16, levelReq: 38, shopTier: 'shop', value: 4400, color: wandHue(38), defense: 0 },
  { id: 'arcane_wand', name: 'Arcane Wand', type: 'wand', twoHanded: false, element: 'none', atkMin: 30, atkMax: 50, weight: 16, levelReq: 50, shopTier: 'epic', value: 0, color: wandHue(50), defense: 0 },
  { id: 'glacial_staff', name: 'Glacial Staff', type: 'wand', twoHanded: false, element: 'water', atkMin: 38, atkMax: 60, weight: 17, levelReq: 58, shopTier: 'epic', value: 0, color: 0x8fe0ff, defense: 0 },
  { id: 'staff_of_blight', name: 'Staff of Blight', type: 'wand', twoHanded: false, element: 'plant', atkMin: 46, atkMax: 72, weight: 17, levelReq: 66, shopTier: 'epic', value: 0, color: 0x88c43c, defense: 0 },
  { id: 'staff_of_flames', name: 'Staff of Flames', type: 'wand', twoHanded: false, element: 'fire', atkMin: 55, atkMax: 86, weight: 18, levelReq: 78, shopTier: 'epic', value: 0, color: 0xff5a22, defense: 0 },
  { id: 'void_wand', name: 'Void Wand', type: 'wand', twoHanded: false, element: 'none', atkMin: 65, atkMax: 100, weight: 18, levelReq: 95, shopTier: 'legendary-tier', value: 0, color: wandHue(95), defense: 0 },
  { id: 'staff_of_chaos', name: 'Staff of Chaos', type: 'wand', twoHanded: false, element: 'none', atkMin: 82, atkMax: 124, weight: 19, levelReq: 110, shopTier: 'legendary-tier', value: 0, color: 0xb84cff, defense: 0 },
  { id: 'cosmic_staff', name: 'Cosmic Staff', type: 'wand', twoHanded: false, element: 'none', atkMin: 105, atkMax: 156, weight: 20, levelReq: 130, shopTier: 'legendary-tier', value: 0, color: wandHue(130), defense: 0 },
  { id: 'aqua_wand', name: 'Aqua Wand', type: 'wand', twoHanded: false, element: 'water', atkMin: 16, atkMax: 28, weight: 15, levelReq: 24, shopTier: 'shop', value: 1500, color: 0x2299ff, defense: 0 },
  { id: 'spellbinder_rod', name: 'Spellbinder Rod', type: 'wand', twoHanded: false, element: 'none', atkMin: 34, atkMax: 56, weight: 17, levelReq: 44, shopTier: 'epic', value: 0, color: wandHue(44), defense: 0 },
  { id: 'genesis_staff', name: 'Genesis Staff', type: 'wand', twoHanded: false, element: 'none', atkMin: 130, atkMax: 190, weight: 21, levelReq: 145, shopTier: 'legendary-tier', value: 0, color: wandHue(145), defense: 0 },

  // --- Shields (off-hand only; carry defense, atk acts as block strength) — 20 tiers ---
  { id: 'buckler', name: 'Buckler', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 1, weight: 30, levelReq: 1, shopTier: 'shop', value: 8, color: 0x8a6a3b, defense: 3 },
  { id: 'wooden_shield', name: 'Wooden Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 2, weight: 40, levelReq: 1, shopTier: 'shop', value: 20, color: 0x9b6a3b, defense: 6 },
  { id: 'studded_shield', name: 'Studded Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 2, weight: 44, levelReq: 4, shopTier: 'shop', value: 80, color: 0x8a7a55, defense: 9 },
  { id: 'brass_shield', name: 'Brass Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 3, weight: 48, levelReq: 6, shopTier: 'shop', value: 150, color: 0xc8a24a, defense: 11 },
  { id: 'iron_shield', name: 'Iron Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 3, weight: 50, levelReq: 8, shopTier: 'shop', value: 260, color: 0xb0b4ba, defense: 14 },
  { id: 'copper_shield', name: 'Copper Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 3, weight: 52, levelReq: 12, shopTier: 'shop', value: 480, color: 0xb87333, defense: 19 },
  { id: 'steel_shield', name: 'Steel Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 4, weight: 55, levelReq: 16, shopTier: 'shop', value: 780, color: 0xd0d6dd, defense: 24 },
  { id: 'battle_shield', name: 'Battle Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 4, weight: 60, levelReq: 22, shopTier: 'shop', value: 1400, color: 0xc0c4ca, defense: 31 },
  { id: 'tower_shield', name: 'Tower Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 5, weight: 70, levelReq: 30, shopTier: 'shop', value: 2200, color: 0xe6eef5, defense: 38 },
  { id: 'crown_shield', name: 'Crown Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 6, weight: 68, levelReq: 38, shopTier: 'shop', value: 4000, color: 0xf0d878, defense: 46 },
  { id: 'guardian_shield', name: 'Guardian Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 7, weight: 72, levelReq: 46, shopTier: 'epic', value: 0, color: 0xeaf0f6, defense: 54 },
  { id: 'dragon_shield', name: 'Dragon Shield', type: 'shield', twoHanded: false, element: 'fire', atkMin: 0, atkMax: 8, weight: 65, levelReq: 60, shopTier: 'epic', value: 0, color: 0xcc2200, defense: 60 },
  { id: 'frozen_shield', name: 'Frozen Shield', type: 'shield', twoHanded: false, element: 'water', atkMin: 0, atkMax: 8, weight: 64, levelReq: 68, shopTier: 'epic', value: 0, color: 0x9fe8ff, defense: 70 },
  { id: 'vine_shield', name: 'Warden Shield', type: 'shield', twoHanded: false, element: 'plant', atkMin: 0, atkMax: 9, weight: 62, levelReq: 76, shopTier: 'epic', value: 0, color: 0x6ab04c, defense: 80 },
  { id: 'demon_shield', name: 'Demon Shield', type: 'shield', twoHanded: false, element: 'fire', atkMin: 0, atkMax: 12, weight: 68, levelReq: 95, shopTier: 'legendary-tier', value: 0, color: 0x7a0022, defense: 90 },
  { id: 'aegis_shield', name: 'Aegis', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 14, weight: 70, levelReq: 112, shopTier: 'legendary-tier', value: 0, color: 0xffe066, defense: 112 },
  { id: 'celestial_shield', name: 'Celestial Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 16, weight: 72, levelReq: 132, shopTier: 'legendary-tier', value: 0, color: 0xfff0a0, defense: 140 },
  { id: 'plate_shield', name: 'Plate Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 4, weight: 58, levelReq: 26, shopTier: 'shop', value: 1800, color: 0xc8ccd2, defense: 34 },
  { id: 'mastermind_shield', name: 'Mastermind Shield', type: 'shield', twoHanded: false, element: 'none', atkMin: 0, atkMax: 10, weight: 66, levelReq: 84, shopTier: 'epic', value: 0, color: 0xb84cff, defense: 86 },
  { id: 'phoenix_shield', name: 'Phoenix Shield', type: 'shield', twoHanded: false, element: 'fire', atkMin: 0, atkMax: 13, weight: 66, levelReq: 105, shopTier: 'legendary-tier', value: 0, color: 0xff9933, defense: 102 },
];

// Equipment slots: amulet, helmet, armor, legs, boots.
export const ARMORS = [
  // --- Amulets (20 tiers; some give a touch of run speed) ---
  { id: 'string_necklace', name: 'String Necklace', slot: 'amulet', defense: 1, weight: 3, levelReq: 1, shopTier: 'shop', value: 12, color: 0x9b8a6a, speedBonus: 0 },
  { id: 'copper_amulet', name: 'Copper Amulet', slot: 'amulet', defense: 2, weight: 5, levelReq: 1, shopTier: 'shop', value: 50, color: 0xb87333, speedBonus: 0 },
  { id: 'bronze_amulet', name: 'Bronze Amulet', slot: 'amulet', defense: 3, weight: 5, levelReq: 5, shopTier: 'shop', value: 140, color: 0xcd7f32, speedBonus: 0 },
  { id: 'jade_amulet', name: 'Jade Amulet', slot: 'amulet', defense: 4, weight: 5, levelReq: 9, shopTier: 'shop', value: 320, color: 0x44b070, speedBonus: 0 },
  { id: 'silver_amulet', name: 'Silver Amulet', slot: 'amulet', defense: 6, weight: 5, levelReq: 15, shopTier: 'shop', value: 600, color: 0xc8ccd2, speedBonus: 0 },
  { id: 'sapphire_amulet', name: 'Sapphire Amulet', slot: 'amulet', defense: 8, weight: 5, levelReq: 20, shopTier: 'shop', value: 1100, color: 0x4d7dff, speedBonus: 0 },
  { id: 'ruby_amulet', name: 'Ruby Amulet', slot: 'amulet', defense: 10, weight: 6, levelReq: 26, shopTier: 'shop', value: 2000, color: 0xff5a55, speedBonus: 0 },
  { id: 'gold_amulet', name: 'Gold Amulet', slot: 'amulet', defense: 12, weight: 6, levelReq: 32, shopTier: 'shop', value: 3600, color: 0xf1c40f, speedBonus: 0 },
  { id: 'amulet_of_loss', name: 'Amulet of Loss', slot: 'amulet', defense: 9, weight: 6, levelReq: 38, shopTier: 'shop', value: 9000, color: 0x9b59ff, speedBonus: 0 },
  { id: 'platinum_amulet', name: 'Platinum Amulet', slot: 'amulet', defense: 15, weight: 6, levelReq: 44, shopTier: 'shop', value: 7000, color: 0xe5e4e2, speedBonus: 0 },
  { id: 'silver_amulet_speed', name: 'Charm of Swiftness', slot: 'amulet', defense: 5, weight: 4, levelReq: 30, shopTier: 'shop', value: 8000, color: 0x66ddaa, speedBonus: 0.15 },
  { id: 'dragon_amulet', name: 'Dragon Amulet', slot: 'amulet', defense: 16, weight: 6, levelReq: 60, shopTier: 'epic', value: 0, color: 0xcc2200, speedBonus: 0 },
  { id: 'demon_amulet', name: 'Demon Necklace', slot: 'amulet', defense: 22, weight: 6, levelReq: 78, shopTier: 'epic', value: 0, color: 0x7a0022, speedBonus: 0 },
  { id: 'phoenix_amulet', name: 'Phoenix Amulet', slot: 'amulet', defense: 28, weight: 6, levelReq: 95, shopTier: 'legendary-tier', value: 0, color: 0xff9933, speedBonus: 0 },
  { id: 'celestial_amulet', name: 'Celestial Amulet', slot: 'amulet', defense: 36, weight: 6, levelReq: 120, shopTier: 'legendary-tier', value: 0, color: 0xfff0a0, speedBonus: 0 },
  { id: 'wooden_amulet', name: 'Wooden Amulet', slot: 'amulet', defense: 1, weight: 3, levelReq: 3, shopTier: 'shop', value: 25, color: 0x9b6a3b, speedBonus: 0 },
  { id: 'emerald_amulet', name: 'Emerald Amulet', slot: 'amulet', defense: 7, weight: 5, levelReq: 18, shopTier: 'shop', value: 850, color: 0x5ade7a, speedBonus: 0 },
  { id: 'garnet_amulet', name: 'Garnet Amulet', slot: 'amulet', defense: 11, weight: 6, levelReq: 29, shopTier: 'shop', value: 2800, color: 0xb03050, speedBonus: 0 },
  { id: 'frost_amulet', name: 'Glacial Amulet', slot: 'amulet', defense: 18, weight: 6, levelReq: 70, shopTier: 'epic', value: 0, color: 0x9fe8ff, speedBonus: 0 },
  { id: 'amulet_of_haste', name: 'Amulet of Haste', slot: 'amulet', defense: 8, weight: 4, levelReq: 55, shopTier: 'epic', value: 0, color: 0xffd24d, speedBonus: 0.25 },

  // --- Helmets (20 tiers) ---
  { id: 'cloth_hood', name: 'Cloth Hood', slot: 'helmet', defense: 1, weight: 8, levelReq: 1, shopTier: 'shop', value: 12, color: 0x8a7a5a, speedBonus: 0, coverage: 'open' },
  { id: 'leather_helmet', name: 'Leather Helmet', slot: 'helmet', defense: 3, weight: 18, levelReq: 1, shopTier: 'shop', value: 40, color: 0x7a5230, speedBonus: 0, coverage: 'open' },
  { id: 'studded_helmet', name: 'Studded Helmet', slot: 'helmet', defense: 5, weight: 22, levelReq: 5, shopTier: 'shop', value: 120, color: 0x8a6a45, speedBonus: 0, coverage: 'open' },
  { id: 'chain_helmet', name: 'Chain Helmet', slot: 'helmet', defense: 6, weight: 26, levelReq: 8, shopTier: 'shop', value: 200, color: 0xa0a4aa, speedBonus: 0, coverage: 'open' },
  { id: 'iron_helmet', name: 'Iron Helmet', slot: 'helmet', defense: 8, weight: 30, levelReq: 10, shopTier: 'shop', value: 300, color: 0xb0b4ba, speedBonus: 0, coverage: 'closed' },
  { id: 'brass_helmet', name: 'Brass Helmet', slot: 'helmet', defense: 10, weight: 32, levelReq: 14, shopTier: 'shop', value: 520, color: 0xc8a24a, speedBonus: 0, coverage: 'closed' },
  { id: 'steel_helmet', name: 'Steel Helmet', slot: 'helmet', defense: 14, weight: 34, levelReq: 20, shopTier: 'shop', value: 950, color: 0xd0d6dd, speedBonus: 0, coverage: 'closed' },
  { id: 'warrior_helmet', name: 'Warrior Helmet', slot: 'helmet', defense: 17, weight: 35, levelReq: 26, shopTier: 'shop', value: 1700, color: 0xc0c4ca, speedBonus: 0, coverage: 'closed' },
  { id: 'crusader_helmet', name: 'Crusader Helmet', slot: 'helmet', defense: 21, weight: 36, levelReq: 33, shopTier: 'shop', value: 3200, color: 0xe6eef5, speedBonus: 0, coverage: 'closed' },
  { id: 'crown_helmet', name: 'Crown Helmet', slot: 'helmet', defense: 24, weight: 36, levelReq: 40, shopTier: 'shop', value: 6000, color: 0xf0d878, speedBonus: 0, coverage: 'closed' },
  { id: 'royal_helmet', name: 'Royal Helmet', slot: 'helmet', defense: 26, weight: 37, levelReq: 48, shopTier: 'epic', value: 0, color: 0xeaf0f6, speedBonus: 0, coverage: 'closed' },
  { id: 'dragon_helmet', name: 'Dragon Helmet', slot: 'helmet', defense: 28, weight: 36, levelReq: 60, shopTier: 'epic', value: 0, color: 0xcc2200, speedBonus: 0, coverage: 'closed' },
  { id: 'frost_helmet', name: 'Glacial Helmet', slot: 'helmet', defense: 34, weight: 36, levelReq: 70, shopTier: 'epic', value: 0, color: 0x9fe8ff, speedBonus: 0, coverage: 'closed' },
  { id: 'demon_helmet', name: 'Demon Helmet', slot: 'helmet', defense: 44, weight: 38, levelReq: 95, shopTier: 'legendary-tier', value: 0, color: 0x7a0022, speedBonus: 0, coverage: 'closed' },
  { id: 'celestial_helmet', name: 'Celestial Helmet', slot: 'helmet', defense: 58, weight: 38, levelReq: 120, shopTier: 'legendary-tier', value: 0, color: 0xfff0a0, speedBonus: 0, coverage: 'closed' },
  { id: 'straw_hat', name: 'Straw Hat', slot: 'helmet', defense: 1, weight: 6, levelReq: 2, shopTier: 'shop', value: 18, color: 0xd8c878, speedBonus: 0, coverage: 'open' },
  { id: 'wizard_hat', name: 'Wizard Hat', slot: 'helmet', defense: 4, weight: 10, levelReq: 12, shopTier: 'shop', value: 700, color: 0x9b30ff, speedBonus: 0, coverage: 'open' },
  { id: 'horned_helmet', name: 'Horned Helmet', slot: 'helmet', defense: 19, weight: 35, levelReq: 24, shopTier: 'shop', value: 2400, color: 0xc8a24a, speedBonus: 0, coverage: 'closed' },
  { id: 'demon_helmet2', name: 'Abyssal Helmet', slot: 'helmet', defense: 50, weight: 38, levelReq: 110, shopTier: 'legendary-tier', value: 0, color: 0x4a0030, speedBonus: 0, coverage: 'closed' },
  { id: 'warden_helmet', name: 'Warden Helmet', slot: 'helmet', defense: 38, weight: 36, levelReq: 84, shopTier: 'epic', value: 0, color: 0x6ab04c, speedBonus: 0, coverage: 'closed' },

  // --- Armor (chest) — 22 tiers ---
  { id: 'cloth_shirt', name: 'Cloth Shirt', slot: 'armor', defense: 2, weight: 30, levelReq: 1, shopTier: 'shop', value: 18, color: 0x9b8a6a, speedBonus: 0 },
  { id: 'leather_armor', name: 'Leather Armor', slot: 'armor', defense: 6, weight: 70, levelReq: 1, shopTier: 'shop', value: 80, color: 0x7a5230, speedBonus: 0 },
  { id: 'studded_armor', name: 'Studded Armor', slot: 'armor', defense: 9, weight: 85, levelReq: 5, shopTier: 'shop', value: 220, color: 0x8a6a45, speedBonus: 0 },
  { id: 'brass_armor', name: 'Brass Armor', slot: 'armor', defense: 12, weight: 100, levelReq: 8, shopTier: 'shop', value: 420, color: 0xc8a24a, speedBonus: 0 },
  { id: 'chain_armor', name: 'Chain Armor', slot: 'armor', defense: 14, weight: 110, levelReq: 10, shopTier: 'shop', value: 560, color: 0xa0a4aa, speedBonus: 0 },
  { id: 'iron_armor', name: 'Iron Armor', slot: 'armor', defense: 16, weight: 120, levelReq: 12, shopTier: 'shop', value: 700, color: 0xb0b4ba, speedBonus: 0 },
  { id: 'scale_armor', name: 'Scale Armor', slot: 'armor', defense: 21, weight: 125, levelReq: 17, shopTier: 'shop', value: 1300, color: 0xbcc0c6, speedBonus: 0 },
  { id: 'plate_armor', name: 'Plate Armor', slot: 'armor', defense: 25, weight: 128, levelReq: 20, shopTier: 'shop', value: 1900, color: 0xc8ccd2, speedBonus: 0 },
  { id: 'steel_armor', name: 'Steel Armor', slot: 'armor', defense: 28, weight: 130, levelReq: 22, shopTier: 'shop', value: 2200, color: 0xd0d6dd, speedBonus: 0 },
  { id: 'crusader_armor', name: 'Crusader Armor', slot: 'armor', defense: 34, weight: 135, levelReq: 28, shopTier: 'shop', value: 3800, color: 0xdadfe6, speedBonus: 0 },
  { id: 'knight_armor', name: 'Knight Armor', slot: 'armor', defense: 42, weight: 140, levelReq: 35, shopTier: 'shop', value: 6000, color: 0xe6eef5, speedBonus: 0 },
  { id: 'golden_armor', name: 'Golden Armor', slot: 'armor', defense: 50, weight: 142, levelReq: 44, shopTier: 'shop', value: 12000, color: 0xf0d878, speedBonus: 0 },
  { id: 'mage_robe', name: 'Archmage Robe', slot: 'armor', defense: 30, weight: 60, levelReq: 40, shopTier: 'epic', value: 0, color: 0x9b30ff, speedBonus: 0.05 },
  { id: 'royal_armor', name: 'Royal Plate', slot: 'armor', defense: 58, weight: 144, levelReq: 52, shopTier: 'epic', value: 0, color: 0xeaf0f6, speedBonus: 0 },
  { id: 'dragon_armor', name: 'Dragon Armor', slot: 'armor', defense: 70, weight: 135, levelReq: 65, shopTier: 'epic', value: 0, color: 0xcc2200, speedBonus: 0 },
  { id: 'frost_armor', name: 'Glacial Armor', slot: 'armor', defense: 84, weight: 138, levelReq: 75, shopTier: 'epic', value: 0, color: 0x9fe8ff, speedBonus: 0 },
  { id: 'warden_armor', name: 'Warden Armor', slot: 'armor', defense: 92, weight: 134, levelReq: 84, shopTier: 'epic', value: 0, color: 0x6ab04c, speedBonus: 0 },
  { id: 'demon_armor', name: 'Demon Armor', slot: 'armor', defense: 110, weight: 150, levelReq: 100, shopTier: 'legendary-tier', value: 0, color: 0x7a0022, speedBonus: 0 },
  { id: 'abyssal_armor', name: 'Abyssal Plate', slot: 'armor', defense: 135, weight: 152, levelReq: 115, shopTier: 'legendary-tier', value: 0, color: 0x4a0030, speedBonus: 0 },
  { id: 'celestial_armor', name: 'Celestial Armor', slot: 'armor', defense: 165, weight: 148, levelReq: 130, shopTier: 'legendary-tier', value: 0, color: 0xfff0a0, speedBonus: 0 },

  // --- Legs — 20 tiers ---
  { id: 'cloth_legs', name: 'Cloth Legs', slot: 'legs', defense: 1, weight: 18, levelReq: 1, shopTier: 'shop', value: 12, color: 0x9b8a6a, speedBonus: 0 },
  { id: 'leather_legs', name: 'Leather Legs', slot: 'legs', defense: 4, weight: 40, levelReq: 1, shopTier: 'shop', value: 50, color: 0x7a5230, speedBonus: 0 },
  { id: 'studded_legs', name: 'Studded Legs', slot: 'legs', defense: 6, weight: 50, levelReq: 5, shopTier: 'shop', value: 150, color: 0x8a6a45, speedBonus: 0 },
  { id: 'brass_legs', name: 'Brass Legs', slot: 'legs', defense: 8, weight: 60, levelReq: 8, shopTier: 'shop', value: 300, color: 0xc8a24a, speedBonus: 0 },
  { id: 'iron_legs', name: 'Iron Legs', slot: 'legs', defense: 10, weight: 70, levelReq: 12, shopTier: 'shop', value: 450, color: 0xb0b4ba, speedBonus: 0 },
  { id: 'plate_legs', name: 'Plate Legs', slot: 'legs', defense: 14, weight: 75, levelReq: 17, shopTier: 'shop', value: 900, color: 0xc8ccd2, speedBonus: 0 },
  { id: 'steel_legs', name: 'Steel Legs', slot: 'legs', defense: 18, weight: 78, levelReq: 22, shopTier: 'shop', value: 1400, color: 0xd0d6dd, speedBonus: 0 },
  { id: 'crusader_legs', name: 'Crusader Legs', slot: 'legs', defense: 24, weight: 80, levelReq: 30, shopTier: 'shop', value: 2800, color: 0xdadfe6, speedBonus: 0 },
  { id: 'knight_legs', name: 'Knight Legs', slot: 'legs', defense: 30, weight: 82, levelReq: 38, shopTier: 'shop', value: 5200, color: 0xe6eef5, speedBonus: 0 },
  { id: 'golden_legs', name: 'Golden Legs', slot: 'legs', defense: 34, weight: 84, levelReq: 46, shopTier: 'epic', value: 0, color: 0xf0d878, speedBonus: 0 },
  { id: 'dragon_legs', name: 'Dragon Legs', slot: 'legs', defense: 40, weight: 80, levelReq: 65, shopTier: 'epic', value: 0, color: 0xcc2200, speedBonus: 0 },
  { id: 'frost_legs', name: 'Glacial Legs', slot: 'legs', defense: 50, weight: 82, levelReq: 76, shopTier: 'epic', value: 0, color: 0x9fe8ff, speedBonus: 0 },
  { id: 'demon_legs', name: 'Demon Legs', slot: 'legs', defense: 66, weight: 86, levelReq: 100, shopTier: 'legendary-tier', value: 0, color: 0x7a0022, speedBonus: 0 },
  { id: 'celestial_legs', name: 'Celestial Legs', slot: 'legs', defense: 90, weight: 84, levelReq: 128, shopTier: 'legendary-tier', value: 0, color: 0xfff0a0, speedBonus: 0 },
  { id: 'chain_legs', name: 'Chain Legs', slot: 'legs', defense: 8, weight: 64, levelReq: 10, shopTier: 'shop', value: 360, color: 0xa0a4aa, speedBonus: 0 },
  { id: 'scale_legs', name: 'Scale Legs', slot: 'legs', defense: 16, weight: 76, levelReq: 19, shopTier: 'shop', value: 1100, color: 0xbcc0c6, speedBonus: 0 },
  { id: 'golden_legs2', name: 'Royal Legs', slot: 'legs', defense: 38, weight: 84, levelReq: 52, shopTier: 'epic', value: 0, color: 0xeaf0f6, speedBonus: 0 },
  { id: 'warden_legs', name: 'Warden Legs', slot: 'legs', defense: 58, weight: 84, levelReq: 84, shopTier: 'epic', value: 0, color: 0x6ab04c, speedBonus: 0 },
  { id: 'abyssal_legs', name: 'Abyssal Legs', slot: 'legs', defense: 78, weight: 88, levelReq: 115, shopTier: 'legendary-tier', value: 0, color: 0x4a0030, speedBonus: 0 },
  { id: 'mage_legs', name: 'Archmage Legs', slot: 'legs', defense: 22, weight: 36, levelReq: 40, shopTier: 'epic', value: 0, color: 0x9b30ff, speedBonus: 0.05 },

  // --- Boots (many speed/haste variants, as requested) — 22 tiers ---
  { id: 'sandals', name: 'Sandals', slot: 'boots', defense: 1, weight: 8, levelReq: 1, shopTier: 'shop', value: 10, color: 0x9b8a6a, speedBonus: 0 },
  { id: 'leather_boots', name: 'Leather Boots', slot: 'boots', defense: 2, weight: 14, levelReq: 1, shopTier: 'shop', value: 30, color: 0x7a5230, speedBonus: 0 },
  { id: 'walking_boots', name: 'Walking Boots', slot: 'boots', defense: 2, weight: 13, levelReq: 4, shopTier: 'shop', value: 120, color: 0x8a6a45, speedBonus: 0.08 },
  { id: 'studded_boots', name: 'Studded Boots', slot: 'boots', defense: 4, weight: 18, levelReq: 6, shopTier: 'shop', value: 160, color: 0x8a6a45, speedBonus: 0 },
  { id: 'chain_boots', name: 'Chain Boots', slot: 'boots', defense: 5, weight: 22, levelReq: 9, shopTier: 'shop', value: 220, color: 0xa0a4aa, speedBonus: 0 },
  { id: 'iron_boots', name: 'Iron Boots', slot: 'boots', defense: 6, weight: 26, levelReq: 12, shopTier: 'shop', value: 280, color: 0xb0b4ba, speedBonus: 0 },
  { id: 'traveller_boots', name: "Traveller's Boots", slot: 'boots', defense: 4, weight: 16, levelReq: 14, shopTier: 'shop', value: 900, color: 0x9bbf3b, speedBonus: 0.15 },
  { id: 'steel_boots', name: 'Steel Boots', slot: 'boots', defense: 8, weight: 28, levelReq: 18, shopTier: 'shop', value: 700, color: 0xd0d6dd, speedBonus: 0 },
  { id: 'fast_boots', name: 'Boots of Haste', slot: 'boots', defense: 3, weight: 16, levelReq: 20, shopTier: 'shop', value: 3500, color: 0xffd24d, speedBonus: 0.3 },
  { id: 'plate_boots', name: 'Plate Boots', slot: 'boots', defense: 10, weight: 30, levelReq: 24, shopTier: 'shop', value: 1200, color: 0xc8ccd2, speedBonus: 0 },
  { id: 'knight_boots', name: 'Knight Boots', slot: 'boots', defense: 12, weight: 30, levelReq: 28, shopTier: 'shop', value: 1800, color: 0xe6eef5, speedBonus: 0 },
  { id: 'soft_boots', name: 'Soft Boots', slot: 'boots', defense: 4, weight: 12, levelReq: 30, shopTier: 'shop', value: 9000, color: 0x66ddaa, speedBonus: 0.3 },
  { id: 'guardian_boots', name: 'Guardian Boots', slot: 'boots', defense: 16, weight: 32, levelReq: 38, shopTier: 'epic', value: 0, color: 0xeaf0f6, speedBonus: 0 },
  { id: 'swift_boots', name: 'Swift Boots', slot: 'boots', defense: 8, weight: 18, levelReq: 45, shopTier: 'epic', value: 0, color: 0x66ddaa, speedBonus: 0.32 },
  { id: 'winged_boots', name: 'Winged Boots', slot: 'boots', defense: 10, weight: 16, levelReq: 55, shopTier: 'epic', value: 0, color: 0xdff2ff, speedBonus: 0.35 },
  { id: 'dragon_boots', name: 'Dragon Boots', slot: 'boots', defense: 20, weight: 28, levelReq: 65, shopTier: 'epic', value: 0, color: 0xcc2200, speedBonus: 0.2 },
  { id: 'frost_boots', name: 'Glacial Boots', slot: 'boots', defense: 24, weight: 28, levelReq: 76, shopTier: 'epic', value: 0, color: 0x9fe8ff, speedBonus: 0 },
  { id: 'demon_boots', name: 'Demon Boots', slot: 'boots', defense: 30, weight: 30, levelReq: 95, shopTier: 'legendary-tier', value: 0, color: 0x7a0022, speedBonus: 0.35 },
  { id: 'hermes_boots', name: 'Boots of Hermes', slot: 'boots', defense: 14, weight: 10, levelReq: 105, shopTier: 'legendary-tier', value: 0, color: 0xffe066, speedBonus: 0.35 },
  { id: 'celestial_boots', name: 'Celestial Boots', slot: 'boots', defense: 40, weight: 26, levelReq: 125, shopTier: 'legendary-tier', value: 0, color: 0xfff0a0, speedBonus: 0.35 },
];

// Color table for collectible/buyable bags and backpacks (Tibia-style).
const CONTAINER_COLORS = [
  { key: 'red', name: 'Red', color: 0xc0392b },
  { key: 'blue', name: 'Blue', color: 0x2980b9 },
  { key: 'green', name: 'Green', color: 0x27ae60 },
  { key: 'yellow', name: 'Yellow', color: 0xf1c40f },
  { key: 'purple', name: 'Purple', color: 0x8e44ad },
  { key: 'orange', name: 'Orange', color: 0xe67e22 },
  { key: 'pink', name: 'Pink', color: 0xff6fa5 },
  { key: 'grey', name: 'Grey', color: 0xecf0f1 },
];

// Build colored variants: a small bag (cap 8) and a backpack (cap 20) per color.
const COLORED_CONTAINERS = CONTAINER_COLORS.flatMap((c) => [
  { id: `${c.key}_bag`, name: `${c.name} Bag`, slot: 'bag', capacity: 8, weight: 18, value: 60, color: c.color, shopTier: 'shop' },
  { id: `${c.key}_backpack`, name: `${c.name} Backpack`, slot: 'bag', capacity: 20, weight: 30, value: 300, color: c.color, shopTier: 'shop' },
]);

export const CONTAINERS = [
  { id: 'bag', name: 'Bag', slot: 'bag', capacity: 8, weight: 18, value: 50, color: 0x8a6a3b },
  { id: 'backpack', name: 'Backpack', slot: 'bag', capacity: 20, weight: 30, value: 250, color: 0x6a4a2b },
  ...COLORED_CONTAINERS,
  // Themed special bags (kid bling — looted, big capacity). The demon backpack
  // gets a demon face in the icon (see itemIcons paintContainer).
  { id: 'fur_bag', name: 'Fur Bag', slot: 'bag', capacity: 12, weight: 16, value: 800, color: 0x8a6a3a, shopTier: 'epic' },
  { id: 'golden_backpack', name: 'Golden Backpack', slot: 'bag', capacity: 24, weight: 30, value: 12000, color: 0xddbb33, shopTier: 'legendary-tier' },
  { id: 'dragon_backpack', name: 'Dragon Backpack', slot: 'bag', capacity: 22, weight: 30, value: 9000, color: 0xcc3322, shopTier: 'legendary-tier' },
  { id: 'demon_backpack', name: 'Demon Backpack', slot: 'bag', capacity: 24, weight: 30, value: 15000, color: 0x7a0022, shopTier: 'legendary-tier' },
];

// --- Potions & consumables -------------------------------------------------
// Two parallel rank ladders (health and mana) plus special % restores. Each:
//   id, name {es,en}, kind:'potion', restoreType:'hp'|'mana'|'both',
//   restore (flat amount) OR restorePct (0..1), levelReq, value (shop price),
//   weight, tier (drop bucket), color (mesh/icon tint), icon (emoji).
// tier buckets drive creature drops: 'fruit' (weak foes), 'low'/'mid'/'high'
// (progressively stronger foes), 'elite' (% restores & elixirs, strong foes).
export const POTIONS = [
  // Health ladder
  { id: 'apple',          name: { es: 'Manzana', en: 'Apple' },               kind: 'potion', restoreType: 'hp', restore: 30,   levelReq: 1,  value: 8,    weight: 2, tier: 'fruit', color: 0xe23b3b, icon: '🍎' },
  { id: 'grapes',         name: { es: 'Uvas', en: 'Grapes' },                 kind: 'potion', restoreType: 'hp', restore: 50,   levelReq: 3,  value: 18,   weight: 2, tier: 'fruit', color: 0x8e44ad, icon: '🍇' },
  { id: 'pear',           name: { es: 'Pera', en: 'Pear' },                   kind: 'potion', restoreType: 'hp', restore: 80,   levelReq: 6,  value: 35,   weight: 2, tier: 'fruit', color: 0x9bbf3b, icon: '🍐' },
  { id: 'melon',          name: { es: 'Sandía', en: 'Melon' },                kind: 'potion', restoreType: 'hp', restore: 120,  levelReq: 10, value: 70,   weight: 3, tier: 'low',   color: 0x4caf50, icon: '🍉' },
  { id: 'minor_health',   name: { es: 'Poción Menor de Vida', en: 'Minor Health Potion' },   kind: 'potion', restoreType: 'hp', restore: 150,  levelReq: 14, value: 120,  weight: 3, tier: 'low',   color: 0xff6b6b, icon: '🧪' },
  { id: 'health_potion',  name: { es: 'Poción de Vida', en: 'Health Potion' },               kind: 'potion', restoreType: 'hp', restore: 200,  levelReq: 20, value: 200,  weight: 3, tier: 'mid',   color: 0xff4d4d, icon: '🧪' },
  { id: 'strong_health',  name: { es: 'Poción Fuerte de Vida', en: 'Strong Health Potion' },  kind: 'potion', restoreType: 'hp', restore: 300,  levelReq: 28, value: 350,  weight: 4, tier: 'mid',   color: 0xe63333, icon: '🧪' },
  { id: 'great_health',   name: { es: 'Gran Poción de Vida', en: 'Great Health Potion' },     kind: 'potion', restoreType: 'hp', restore: 500,  levelReq: 36, value: 600,  weight: 4, tier: 'high',  color: 0xcc2222, icon: '🧪' },
  { id: 'mega_health',    name: { es: 'Mega Poción de Vida', en: 'Mega Health Potion' },      kind: 'potion', restoreType: 'hp', restore: 800,  levelReq: 45, value: 1000, weight: 5, tier: 'high',  color: 0xb31a1a, icon: '🧪' },
  { id: 'super_health',   name: { es: 'Súper Poción de Vida', en: 'Super Health Potion' },    kind: 'potion', restoreType: 'hp', restore: 1000, levelReq: 55, value: 1600, weight: 5, tier: 'high',  color: 0x991111, icon: '🧪' },
  { id: 'ultra_health',   name: { es: 'Ultra Poción de Vida', en: 'Ultra Health Potion' },    kind: 'potion', restoreType: 'hp', restore: 1500, levelReq: 70, value: 2600, weight: 6, tier: 'elite', color: 0x800808, icon: '🧪' },
  { id: 'supreme_health', name: { es: 'Poción Suprema de Vida', en: 'Supreme Health Potion' }, kind: 'potion', restoreType: 'hp', restore: 2000, levelReq: 85, value: 4000, weight: 6, tier: 'elite', color: 0x660000, icon: '🧪' },
  { id: 'divine_health',  name: { es: 'Poción Divina de Vida', en: 'Divine Health Potion' },  kind: 'potion', restoreType: 'hp', restore: 3000, levelReq: 100, value: 6500, weight: 7, tier: 'elite', color: 0xff9a9a, icon: '🧪' },

  // Mana ladder
  { id: 'berry',          name: { es: 'Baya', en: 'Berry' },                  kind: 'potion', restoreType: 'mana', restore: 30,   levelReq: 1,  value: 8,    weight: 2, tier: 'fruit', color: 0x3b6be2, icon: '🫐' },
  { id: 'blueberries',    name: { es: 'Arándanos', en: 'Blueberries' },       kind: 'potion', restoreType: 'mana', restore: 50,   levelReq: 3,  value: 18,   weight: 2, tier: 'fruit', color: 0x4a78d8, icon: '🫐' },
  { id: 'mango',          name: { es: 'Mango', en: 'Mango' },                 kind: 'potion', restoreType: 'mana', restore: 80,   levelReq: 6,  value: 35,   weight: 2, tier: 'fruit', color: 0xf0a030, icon: '🥭' },
  { id: 'minor_mana',     name: { es: 'Poción Menor de Maná', en: 'Minor Mana Potion' },      kind: 'potion', restoreType: 'mana', restore: 120,  levelReq: 10, value: 70,   weight: 3, tier: 'low',   color: 0x5b8bff, icon: '🧫' },
  { id: 'mana_potion',    name: { es: 'Poción de Maná', en: 'Mana Potion' },                  kind: 'potion', restoreType: 'mana', restore: 150,  levelReq: 14, value: 120,  weight: 3, tier: 'low',   color: 0x4d7dff, icon: '🧫' },
  { id: 'strong_mana',    name: { es: 'Poción Fuerte de Maná', en: 'Strong Mana Potion' },    kind: 'potion', restoreType: 'mana', restore: 200,  levelReq: 20, value: 200,  weight: 3, tier: 'mid',   color: 0x3366ff, icon: '🧫' },
  { id: 'great_mana',     name: { es: 'Gran Poción de Maná', en: 'Great Mana Potion' },       kind: 'potion', restoreType: 'mana', restore: 300,  levelReq: 28, value: 350,  weight: 4, tier: 'mid',   color: 0x2a55e6, icon: '🧫' },
  { id: 'mega_mana',      name: { es: 'Mega Poción de Maná', en: 'Mega Mana Potion' },        kind: 'potion', restoreType: 'mana', restore: 500,  levelReq: 36, value: 600,  weight: 4, tier: 'high',  color: 0x1a44cc, icon: '🧫' },
  { id: 'super_mana',     name: { es: 'Súper Poción de Maná', en: 'Super Mana Potion' },      kind: 'potion', restoreType: 'mana', restore: 800,  levelReq: 45, value: 1000, weight: 5, tier: 'high',  color: 0x1133b3, icon: '🧫' },
  { id: 'ultra_mana',     name: { es: 'Ultra Poción de Maná', en: 'Ultra Mana Potion' },      kind: 'potion', restoreType: 'mana', restore: 1000, levelReq: 55, value: 1600, weight: 5, tier: 'high',  color: 0x0d2899, icon: '🧫' },
  { id: 'supreme_mana',   name: { es: 'Poción Suprema de Maná', en: 'Supreme Mana Potion' },  kind: 'potion', restoreType: 'mana', restore: 1500, levelReq: 70, value: 2600, weight: 6, tier: 'elite', color: 0x081d80, icon: '🧫' },
  { id: 'divine_mana',    name: { es: 'Poción Divina de Maná', en: 'Divine Mana Potion' },    kind: 'potion', restoreType: 'mana', restore: 2000, levelReq: 85, value: 4000, weight: 6, tier: 'elite', color: 0x9ab2ff, icon: '🧫' },
  { id: 'cosmic_mana',    name: { es: 'Poción Cósmica de Maná', en: 'Cosmic Mana Potion' },   kind: 'potion', restoreType: 'mana', restore: 3000, levelReq: 100, value: 6500, weight: 7, tier: 'elite', color: 0xc0d0ff, icon: '🧫' },

  // Specials — percentage / full restores. Drop rarely from strong foes.
  { id: 'half_life',    name: { es: 'Vial de Vida (50%)', en: 'Life Vial (50%)' },        kind: 'potion', restoreType: 'hp',   restorePct: 0.5, levelReq: 25, value: 800,  weight: 4, tier: 'elite', color: 0xff5577, icon: '❤️' },
  { id: 'half_mana',    name: { es: 'Vial de Maná (50%)', en: 'Mana Vial (50%)' },        kind: 'potion', restoreType: 'mana', restorePct: 0.5, levelReq: 25, value: 800,  weight: 4, tier: 'elite', color: 0x5577ff, icon: '💙' },
  { id: 'half_both',    name: { es: 'Vial Mixto (50%)', en: 'Mixed Vial (50%)' },         kind: 'potion', restoreType: 'both', restorePct: 0.5, levelReq: 30, value: 1400, weight: 5, tier: 'elite', color: 0xb15bff, icon: '💜' },
  { id: 'elixir_life',  name: { es: 'Elixir de Vida', en: 'Elixir of Life' },             kind: 'potion', restoreType: 'hp',   restorePct: 1,   levelReq: 40, value: 3000, weight: 5, tier: 'elite', color: 0xff2244, icon: '🩸' },
  { id: 'elixir_mana',  name: { es: 'Elixir de Maná', en: 'Elixir of Mana' },             kind: 'potion', restoreType: 'mana', restorePct: 1,   levelReq: 40, value: 3000, weight: 5, tier: 'elite', color: 0x2244ff, icon: '🔵' },
  { id: 'full_restore', name: { es: 'Restauración Total', en: 'Full Restore' },           kind: 'potion', restoreType: 'both', restorePct: 1,   levelReq: 50, value: 5500, weight: 6, tier: 'elite', color: 0xffffff, icon: '✨' },
];

const POTION_MAP = new Map(POTIONS.map((p) => [p.id, p]));
export function getPotion(id) { return POTION_MAP.get(String(id || '').toLowerCase().replace(/-/g, '_')); }

// Light sources: torches you toggle with right click, and gems/stones that give
// a passive aura (always on while carried) so you see better at night and in
// caves. `glowColor` / `glowRange` describe the light; `toggle` torches start off.
//   radius — how far the light reaches (meters)
//   intensity — point-light intensity
//   passive — true = always on while in the backpack; false = right-click toggle
export const LIGHTS = [
  // Starter torch: handed out on a new character, toggled with right click.
  { id: 'torch',        name: { es: 'Antorcha', en: 'Torch' },               kind: 'light', passive: false, glowColor: 0xffb24d, radius: 9,  intensity: 7,  levelReq: 1,  value: 15,   weight: 8, color: 0x8a5a2b, icon: '🔥' },
  { id: 'bright_torch', name: { es: 'Antorcha Brillante', en: 'Bright Torch' }, kind: 'light', passive: false, glowColor: 0xffd27a, radius: 13, intensity: 10, levelReq: 8,  value: 120,  weight: 9, color: 0xb8742f, icon: '🔥' },
  // Gem stones: passive auras. Each colour tints the aura; rubies are the first
  // the player finds. Higher tiers reach farther.
  { id: 'glow_pebble',  name: { es: 'Guijarro Luminoso', en: 'Glowing Pebble' }, kind: 'light', passive: true, glowColor: 0xfff0c0, radius: 7,  intensity: 4,  levelReq: 1,  value: 60,   weight: 1, color: 0xfff0c0, icon: '🪨' },
  { id: 'ruby',         name: { es: 'Rubí', en: 'Ruby' },                    kind: 'light', passive: true, glowColor: 0xff5a55, radius: 9,  intensity: 6,  levelReq: 1,  value: 400,  weight: 1, color: 0xff5a55, icon: '🔴' },
  { id: 'emerald',      name: { es: 'Esmeralda', en: 'Emerald' },            kind: 'light', passive: true, glowColor: 0x5ade7a, radius: 10, intensity: 6,  levelReq: 10, value: 700,  weight: 1, color: 0x5ade7a, icon: '🟢' },
  { id: 'sapphire',     name: { es: 'Zafiro', en: 'Sapphire' },              kind: 'light', passive: true, glowColor: 0x5aa6ff, radius: 11, intensity: 7,  levelReq: 18, value: 1100, weight: 1, color: 0x5aa6ff, icon: '🔵' },
  { id: 'amethyst',     name: { es: 'Amatista', en: 'Amethyst' },            kind: 'light', passive: true, glowColor: 0xb06bff, radius: 12, intensity: 7,  levelReq: 26, value: 1600, weight: 1, color: 0xb06bff, icon: '🟣' },
  { id: 'diamond_gem',  name: { es: 'Diamante', en: 'Diamond' },             kind: 'light', passive: true, glowColor: 0xdff2ff, radius: 15, intensity: 9,  levelReq: 40, value: 4000, weight: 1, color: 0xdff2ff, icon: '💎' },
];

const LIGHT_MAP = new Map(LIGHTS.map((l) => [l.id, l]));
export function getLight(id) { return LIGHT_MAP.get(String(id || '').toLowerCase().replace(/-/g, '_')); }

// Build a backpack instance for a light source.
export function instanceFromLight(l, lang = 'es') {
  return {
    baseId: l.id, kind: 'light', type: 'light',
    name: (l.name && (l.name[lang] || l.name.es)) || l.id,
    passive: !!l.passive, glowColor: l.glowColor, radius: l.radius || 8, intensity: l.intensity || 5,
    levelReq: l.levelReq || 1, value: l.value || 0, weight: l.weight || 1,
    color: l.color, icon: l.icon || '🔥', rarity: RARITY.NORMAL,
  };
}

// Build a backpack instance for a potion in the given language.
export function instanceFromPotion(p, lang = 'es') {
  return {
    baseId: p.id, kind: 'potion', type: 'potion',
    name: (p.name && (p.name[lang] || p.name.es)) || p.id,
    restoreType: p.restoreType, restore: p.restore || 0, restorePct: p.restorePct || 0,
    levelReq: p.levelReq || 1, value: p.value || 0, weight: p.weight || 1,
    // Potions stack like coins: same baseId merges into one cell with a count.
    count: 1,
    // Keep the drop tier on the instance so fruit-buying vendors can match it.
    tier: p.tier, color: p.color, icon: p.icon || '🧪', rarity: RARITY.NORMAL,
  };
}

// How much a potion restores for a player, by stat. Returns { hp, mana }.
export function potionRestore(potion, player) {
  const out = { hp: 0, mana: 0 };
  const wantHp = potion.restoreType === 'hp' || potion.restoreType === 'both';
  const wantMana = potion.restoreType === 'mana' || potion.restoreType === 'both';
  if (wantHp) out.hp = potion.restorePct ? Math.round(player.maxHp * potion.restorePct) : potion.restore;
  if (wantMana) out.mana = potion.restorePct ? Math.round((player.maxMana || 0) * potion.restorePct) : potion.restore;
  return out;
}

// Currency tiers, Tibia-style. Each is worth 100 of the previous; the player
// holds coins as stackable inventory items and can convert 100 up to the next.
export const COINS = [
  { id: 'bronze_coin', name: { es: 'Moneda de Bronce', en: 'Bronze Coin' }, value: 1, color: 0xcd7f32, icon: '\uD83D\uDFE0', tier: 0 },
  { id: 'silver_coin', name: { es: 'Moneda de Plata', en: 'Silver Coin' }, value: 100, color: 0xc0c0c0, icon: '\u26AA', tier: 1 },
  { id: 'gold_coin', name: { es: 'Moneda de Oro', en: 'Gold Coin' }, value: 10000, color: 0xf1c40f, icon: '\uD83D\uDFE1', tier: 2 },
  { id: 'platinum_coin', name: { es: 'Moneda de Platino', en: 'Platinum Coin' }, value: 1000000, color: 0xe5e4e2, icon: '\u26AA', tier: 3 },
  { id: 'diamond_coin', name: { es: 'Moneda de Diamante', en: 'Diamond Coin' }, value: 100000000, color: 0x7ec9ff, icon: '\uD83D\uDC8E', tier: 4 },
];
const COIN_BY_ID = new Map(COINS.map((c) => [c.id, c]));
export function getCoin(id) { return COIN_BY_ID.get(id) || null; }

// Build a stackable coin item that lives in the backpack (Tibia-style). `count`
// is how many coins of this tier the stack holds. Weight is 0 so money never
// eats carry capacity; one stack still occupies one cell.
export function instanceFromCoin(coinDef, count, lang = 'es') {
  return {
    baseId: coinDef.id, type: 'coin', kind: 'coin',
    name: (coinDef.name && (coinDef.name[lang] || coinDef.name.es)) || coinDef.id,
    count: Math.max(0, Math.floor(count)),
    value: coinDef.value, tier: coinDef.tier,
    color: coinDef.color, icon: coinDef.icon, weight: 0, rarity: RARITY.NORMAL,
  };
}

// Break a total bronze value into the fewest coins of each tier (high to low).
export function coinsFromValue(total) {
  let v = Math.max(0, Math.floor(total));
  const out = [];
  for (let i = COINS.length - 1; i >= 0; i--) {
    const c = COINS[i];
    const n = Math.floor(v / c.value);
    if (n > 0) { out.push({ id: c.id, count: n }); v -= n * c.value; }
  }
  return out;
}

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
