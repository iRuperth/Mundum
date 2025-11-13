// Mundum creature database — PURE DATA. No Three.js, no DOM.
// ~300 entries built from ~50 procedural family models, each with variants.
// Stats scale with level + role so the game gets progressively harder.
// Everything is expanded deterministically at module load (no Math.random).

import { getWeapon, getArmor, getContainer, WEAPONS, ARMORS } from './items.js';
import { trophyForFamily } from './trophies.js';

// Family model keys. The renderer builds one procedural mesh per key; every
// creature variant reuses its family's model with a different scale/tint.
export const FAMILIES = [
  'worm', 'rat', 'bat', 'snake', 'spider', 'scorpion', 'slime', 'frog',
  'crab', 'beetle', 'wasp', 'boar', 'wolf', 'bear', 'deer', 'chicken',
  'sheep', 'goblin', 'orc', 'troll', 'ogre', 'kobold', 'skeleton', 'zombie',
  'ghost', 'wraith', 'vampire', 'imp', 'demon', 'dragon', 'wyvern', 'hydra',
  'golem', 'gargoyle', 'elemental', 'treant', 'mushroom', 'mandrake', 'harpy',
  'minotaur', 'cyclops', 'lizardman', 'serpent', 'shark', 'jellyfish',
  'turtle', 'cultist', 'knight', 'mage', 'dwarf', 'elf', 'fairy', 'mimic',
];

// Role-based stat scaling. Given a level and a role, produce baseline stats;
// variants then tune with multipliers. Tuned so a level-1 worm minion is
// trivial (~12 hp, ~3 exp) and a level-120+ demon boss is brutal (~9000 hp).
const ROLE_MODS = {
  // [hpMul, atkMul, defMul, expMul]
  minion: [0.55, 0.7, 0.6, 0.7],
  normal: [1.0, 1.0, 1.0, 1.0],
  tank: [1.9, 0.75, 1.8, 1.25],
  caster: [0.7, 1.5, 0.6, 1.2],
  boss: [3.0, 1.7, 1.6, 3.2],
};

function round(n) { return Math.max(1, Math.round(n)); }

// Baseline curve. Quadratic-ish growth keeps low levels gentle and endgame
// punishing without exploding into absurd numbers.
function baseStats(level, role) {
  const m = ROLE_MODS[role] || ROLE_MODS.normal;
  const lv = Math.max(1, level);
  const hp = 8 + lv * 5 + lv * lv * 0.22;           // ~13 at lv1, ~4000 at lv125
  const attack = 2 + lv * 1.0 + lv * lv * 0.008;    // grows steadily
  const defense = 0 + lv * 0.75 + lv * lv * 0.004;
  const exp = 2 + lv * 1.6 + lv * lv * 0.28;         // ~4 at lv1, ~4600 at lv125
  return {
    hp: round(hp * m[0]),
    attack: round(attack * m[1]),
    defense: round(defense * m[2]),
    exp: round(exp * m[3]),
  };
}

// Loot helpers. 'gold' always present with a per-creature amount range.
function gold(min, max) { return { itemId: 'gold', min, max, chance: 1 }; }
function drop(itemId, chance) { return { itemId, chance }; }
// A potion drop is flagged so the combat roller can cap it at one per creature.
function potionDrop(itemId, chance) { return { itemId, chance, potion: true }; }

// Level-banded potion tables: a creature of `level` drops a level-appropriate
// health and mana potion at 5%, plus a rare percentage/elixir at 10% for strong
// foes. Picked deterministically by level so it scales with the difficulty curve.
const POTION_TIERS_HP = [
  [1, 'apple'], [4, 'grapes'], [8, 'pear'], [12, 'melon'], [16, 'minor_health'],
  [22, 'health_potion'], [30, 'strong_health'], [38, 'great_health'],
  [48, 'mega_health'], [58, 'super_health'], [72, 'ultra_health'],
  [88, 'supreme_health'], [105, 'divine_health'],
];
const POTION_TIERS_MANA = [
  [1, 'berry'], [4, 'blueberries'], [8, 'mango'], [12, 'minor_mana'], [16, 'mana_potion'],
  [22, 'strong_mana'], [30, 'great_mana'], [38, 'mega_mana'],
  [48, 'super_mana'], [58, 'ultra_mana'], [72, 'supreme_mana'],
  [88, 'divine_mana'], [105, 'cosmic_mana'],
];
const POTION_SPECIALS = [
  [25, 'half_life'], [25, 'half_mana'], [35, 'half_both'],
  [45, 'elixir_life'], [45, 'elixir_mana'], [55, 'full_restore'],
];

function tierFor(table, level) {
  let pick = table[0][1];
  for (const [minLv, id] of table) { if (level >= minLv) pick = id; else break; }
  return pick;
}

// The potion drop entries appended to a creature at the given level/role.
function potionDropsForLevel(level, role) {
  const out = [
    potionDrop(tierFor(POTION_TIERS_HP, level), 0.05),
    potionDrop(tierFor(POTION_TIERS_MANA, level), 0.05),
  ];
  // Strong foes (tanks/bosses, or anything deep) may yield a % restore / elixir.
  if (role === 'boss' || role === 'tank' || level >= 25) {
    // highest special the level qualifies for
    let special = null;
    for (const [minLv, id] of POTION_SPECIALS) { if (level >= minLv) special = id; }
    if (special) out.push(potionDrop(special, 0.10));
  }
  return out;
}

// Family definitions. Each family lists:
//   key, biome, element, aggressive default, aggroRange, speed, baseLevel,
//   baseColor, and a list of variant tuples:
//     [nameSuffix, scaleMul, colorTint, levelDelta, role, statMul, lootAdds]
//   nameSuffix '' means use the family's base name verbatim.
//   statMul scales the role baseline (per-variant flavor knob).
//   lootAdds is an array of drop() entries appended to the family loot.
const FAMILY_DEFS = [
  // EARLY GAME: grass / beach trash mobs
  {
    key: 'worm', name: 'Worm', biome: 'grass', element: 'none',
    aggressive: false, aggroRange: 0, speed: 0.6, baseLevel: 1, color: 0xd98a8a,
    gold: [0, 2], loot: [],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 1.6, [], { levelAbs: 1, attackKind: 'melee' }],
      // Desert larva (referenced by id from the desert zone).
      ['Larva', 1.2, 0xe8c87a, 0, 'minion', 1.4, [], { levelAbs: 6, attackKind: 'melee' }],
    ],
  },
  {
    key: 'rat', name: 'Rat', biome: 'grass', element: 'none',
    aggressive: false, aggroRange: 6, speed: 2.2, baseLevel: 1, color: 0x8a7a6a,
    gold: [0, 4], loot: [drop('cheese', 0.2)],
    variants: [
      // The user asked for exactly: rat, big rat, mutant rat — plus the Rat King
      // as the rat cave's overlord. Tibia-low levels.
      ['', 1.0, 0x000000, 0, 'minion', 1.0, [], { levelAbs: 1, attackKind: 'melee' }],
      ['Big Rat', 1.4, 0x6a5a4a, 0, 'normal', 1.1, [drop('rat-tail', 0.3)], { levelAbs: 2, attackKind: 'melee' }],
      ['Mutant Rat', 1.3, 0x6a7a5a, 0, 'normal', 1.25, [drop('antidote', 0.12)], { levelAbs: 3, attackKind: 'melee' }],
      ['Rat King', 1.8, 0x7a6a5a, 0, 'boss', 1.4, [drop('rat-crown', 0.1), drop('leather_armor', 0.06)],
        { levelAbs: 8, supreme: true, attackKind: 'melee' }],
    ],
  },
  {
    key: 'frog', name: 'Frog', biome: 'beach', element: 'water',
    aggressive: false, aggroRange: 6, speed: 2.6, baseLevel: 2, color: 0x6abe6a,
    gold: [0, 3], loot: [],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 0.9, []],
      ['Poison Frog', 1.0, 0x9ad24a, 5, 'normal', 1.1, [drop('poison-vial', 0.2)]],
      ['Giant Toad', 1.7, 0x7a8a4a, 12, 'tank', 1.2, [drop('leather-armor', 0.05)]],
    ],
  },
  {
    key: 'chicken', name: 'Chicken', biome: 'grass', element: 'none',
    aggressive: false, aggroRange: 0, speed: 2.0, baseLevel: 1, color: 0xeeddcc,
    gold: [0, 2], loot: [drop('feather', 0.5), drop('egg', 0.4)],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 0.7, []],
      ['Rooster', 1.2, 0xcc6644, 4, 'normal', 1.0, []],
    ],
  },
  {
    key: 'sheep', name: 'Sheep', biome: 'grass', element: 'none',
    aggressive: false, aggroRange: 0, speed: 1.6, baseLevel: 2, color: 0xf0f0e8,
    gold: [0, 3], loot: [drop('wool', 0.6)],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 0.8, []],
      ['Black Sheep', 1.0, 0x444444, 5, 'normal', 1.0, []],
    ],
  },
  {
    key: 'deer', name: 'Deer', biome: 'forest', element: 'none',
    aggressive: false, aggroRange: 8, speed: 4.2, baseLevel: 4, color: 0xb07a4a,
    gold: [0, 5], loot: [drop('hide', 0.5), drop('antler', 0.2)],
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 0.9, []],
      ['Stag', 1.4, 0x8a5a2a, 8, 'normal', 1.2, [drop('great-antler', 0.15)]],
    ],
  },
  {
    key: 'beetle', name: 'Beetle', biome: 'forest', element: 'none',
    aggressive: false, aggroRange: 5, speed: 1.4, baseLevel: 3, color: 0x445544,
    gold: [0, 4], loot: [drop('chitin', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 1.0, [], { levelAbs: 3, attackKind: 'melee' }],
      ['Fire Beetle', 1.1, 0xaa4422, 0, 'normal', 1.1, [drop('fire-essence', 0.1)], { levelAbs: 7, attackKind: 'melee' }],
      ['Iron Beetle', 1.3, 0x667788, 0, 'tank', 1.25, [drop('iron-ore', 0.3)], { levelAbs: 14, attackKind: 'melee' }],
      // Desert scarabs (referenced by id from the desert zone). The Ancient Scarab
      // is the desert overlord: poison clouds + paralyze flavor.
      ['Scarab', 1.1, 0x4a4a2a, 0, 'normal', 1.2, [drop('chitin', 0.4)],
        { levelAbs: 12, attackKind: 'melee', areaAttack: { kind: 'poison', radius: 3, damageMul: 1.15, chance: 0.3 } }],
      ['Ancient Scarab', 1.7, 0x2a2a1a, 0, 'boss', 1.45, [drop('golden_legs', 0.05), drop('chitin', 0.6)],
        { levelAbs: 34, supreme: true, attackKind: 'melee', areaAttack: { kind: 'poison', radius: 6, damageMul: 1.5, chance: 0.45 } }],
    ],
  },
  {
    key: 'crab', name: 'Crab', biome: 'beach', element: 'water',
    aggressive: false, aggroRange: 6, speed: 1.5, baseLevel: 3, color: 0xcc6644,
    gold: [0, 5], loot: [drop('crab-claw', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Giant Crab', 1.8, 0xaa5533, 11, 'tank', 1.3, [drop('steel-shield', 0.04)]],
      ['Hermit Crab', 1.2, 0x9988aa, 7, 'tank', 1.1, [drop('shell', 0.4)]],
    ],
  },
  {
    key: 'boar', name: 'Boar', biome: 'forest', element: 'none',
    aggressive: true, aggroRange: 8, speed: 3.4, baseLevel: 5, color: 0x6a5040,
    gold: [1, 8], loot: [drop('hide', 0.4), drop('tusk', 0.25)],
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Wild Boar', 1.3, 0x5a4030, 9, 'normal', 1.2, []],
      ['War Boar', 1.6, 0x4a3020, 16, 'tank', 1.3, [drop('great-tusk', 0.2)]],
    ],
  },

  // MID GAME: snakes, spiders, wolves, goblins
  {
    key: 'snake', name: 'Snake', biome: 'grass', element: 'none',
    aggressive: true, aggroRange: 7, speed: 2.8, baseLevel: 6, color: 0x6aaa4a,
    gold: [1, 10], loot: [drop('snake-skin', 0.3)], tiers: 2,
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Cobra', 1.2, 0xccaa44, 12, 'caster', 1.2, [drop('venom-gland', 0.25)]],
      ['Water Snake', 1.1, 0x4488cc, 9, 'normal', 1.1, []], // element override below
      ['Python', 1.7, 0x7a8a4a, 18, 'tank', 1.3, [drop('snake-skin', 0.6)]],
      ['Giant Serpent', 2.2, 0x55aa66, 28, 'boss', 1.4, [drop('serpent-fang', 0.3), drop('steel-sword', 0.05)]],
    ],
    // per-variant element tweaks
    elementByName: { 'Water Snake': 'water', 'Giant Serpent': 'water' },
  },
  {
    key: 'spider', name: 'Spider', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 8, speed: 3.0, baseLevel: 1, color: 0x333333,
    gold: [1, 12], loot: [drop('silk', 0.35), drop('spider-leg', 0.2)],
    variants: [
      // Tibia vermin ladder: spider→poison spider→tarantula, with the Giant
      // Spider (poison fields) as the nest overlord.
      ['', 1.0, 0x000000, 0, 'minion', 1.0, [], { levelAbs: 1, attackKind: 'melee' }],
      ['Poison Spider', 1.2, 0x884488, 0, 'normal', 1.1, [drop('poison-vial', 0.2)], { levelAbs: 3, attackKind: 'melee' }],
      ['Tarantula', 1.5, 0x554433, 0, 'normal', 1.25, [drop('silk', 0.5)], { levelAbs: 12, attackKind: 'melee' }],
      // Crystal Spider (Tibia 7.4): an icy spider that spits frost.
      ['Crystal Spider', 1.6, 0xbfe8ff, 0, 'tank', 1.3, [drop('frost-shard', 0.2), drop('silk', 0.5)],
        { levelAbs: 30, attackKind: 'caster', element: 'water',
          areaAttack: { kind: 'water', radius: 3, damageMul: 1.2, chance: 0.3 } }],
      ['Giant Spider', 2.0, 0x222233, 0, 'boss', 1.4, [drop('spider-silk-armor', 0.05), drop('venom-gland', 0.4)],
        { levelAbs: 35, supreme: true, attackKind: 'melee',
          areaAttack: { kind: 'poison', radius: 5, damageMul: 1.4, chance: 0.4 } }],
    ],
  },
  {
    key: 'scorpion', name: 'Scorpion', biome: 'desert', element: 'none',
    aggressive: true, aggroRange: 8, speed: 2.6, baseLevel: 6, color: 0x886622,
    gold: [2, 14], loot: [drop('scorpion-tail', 0.3)],
    variants: [
      // Ankrahmun desert vermin: melee with a poison sting.
      ['', 1.0, 0x000000, 0, 'normal', 1.0, [], { levelAbs: 6, attackKind: 'melee' }],
      ['Sand Scorpion', 1.2, 0xccaa66, 0, 'normal', 1.15, [], { levelAbs: 10, attackKind: 'melee' }],
      ['Black Scorpion', 1.5, 0x222222, 0, 'tank', 1.3, [drop('venom-gland', 0.3)], { levelAbs: 18, attackKind: 'melee' }],
    ],
  },
  {
    key: 'wasp', name: 'Wasp', biome: 'forest', element: 'none',
    aggressive: true, aggroRange: 9, speed: 4.4, baseLevel: 8, color: 0xddaa22,
    gold: [1, 10], loot: [drop('wasp-sting', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 0.9, []],
      ['Hornet', 1.3, 0xcc8822, 15, 'normal', 1.2, [drop('honey', 0.2)]],
      ['Queen Wasp', 1.8, 0xeecc33, 26, 'boss', 1.3, [drop('royal-jelly', 0.25)]],
    ],
  },
  {
    key: 'bat', name: 'Bat', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 8, speed: 4.0, baseLevel: 5, color: 0x443344,
    gold: [0, 8], loot: [drop('bat-wing', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 0.9, []],
      ['Vampire Bat', 1.2, 0x661122, 12, 'normal', 1.2, [drop('blood-vial', 0.2)]],
      ['Giant Bat', 1.7, 0x332244, 22, 'tank', 1.25, []],
    ],
  },
  {
    key: 'slime', name: 'Slime', biome: 'cave', element: 'none',
    aggressive: false, aggroRange: 6, speed: 1.2, baseLevel: 4, color: 0x55cc99,
    gold: [0, 6], loot: [drop('slime-jelly', 0.5)],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 0.8, []],
      ['Green Slime', 1.2, 0x66cc55, 6, 'minion', 1.0, []],
      ['Fire Slime', 1.2, 0xdd5533, 14, 'normal', 1.2, [drop('fire-essence', 0.15)]],
      ['Water Slime', 1.2, 0x4499dd, 12, 'normal', 1.1, [drop('water-essence', 0.15)]],
      ['Plant Slime', 1.3, 0x88cc44, 16, 'tank', 1.2, [drop('plant-essence', 0.15)]],
      ['King Slime', 2.3, 0x33aa77, 30, 'boss', 1.5, [drop('slime-crown', 0.1), drop('iron-armor', 0.05)]],
    ],
    elementByName: { 'Fire Slime': 'fire', 'Water Slime': 'water', 'Plant Slime': 'plant' },
  },
  {
    key: 'mushroom', name: 'Mushroom', biome: 'forest', element: 'plant',
    aggressive: false, aggroRange: 6, speed: 1.0, baseLevel: 6, color: 0xcc5566,
    gold: [0, 7], loot: [drop('mushroom-cap', 0.5)],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 0.9, []],
      ['Spore Mushroom', 1.3, 0x8866cc, 13, 'caster', 1.1, [drop('spore-dust', 0.3)]],
      ['Myconid', 1.6, 0xaa7755, 22, 'normal', 1.25, [drop('plant-essence', 0.2)]],
    ],
  },
  {
    key: 'mandrake', name: 'Mandrake', biome: 'forest', element: 'plant',
    aggressive: false, aggroRange: 5, speed: 1.3, baseLevel: 10, color: 0x99aa55,
    gold: [2, 14], loot: [drop('mandrake-root', 0.4)],
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Screaming Mandrake', 1.3, 0xbbcc66, 18, 'caster', 1.2, [drop('mana-potion', 0.2)]],
    ],
  },
  {
    key: 'wolf', name: 'Wolf', biome: 'snow', element: 'none',
    aggressive: true, aggroRange: 11, speed: 4.0, baseLevel: 8, color: 0x888888,
    gold: [2, 16], loot: [drop('wolf-pelt', 0.4), drop('fang', 0.25)], tiers: 2,
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Gray Wolf', 1.1, 0x777777, 11, 'normal', 1.1, []],
      ['Dire Wolf', 1.6, 0x555555, 20, 'tank', 1.3, [drop('fast-boots', 0.06)]],
      ['Winter Wolf', 1.4, 0xccddee, 26, 'caster', 1.25, [drop('frost-fang', 0.2)]],
      ['Alpha Wolf', 1.8, 0x444444, 34, 'boss', 1.4, [drop('alpha-pelt', 0.2), drop('steel-sword', 0.06)]],
    ],
  },
  {
    key: 'bear', name: 'Bear', biome: 'snow', element: 'none',
    aggressive: true, aggroRange: 9, speed: 3.2, baseLevel: 12, color: 0x7a5a3a,
    gold: [4, 22], loot: [drop('bear-pelt', 0.4), drop('claw', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'tank', 1.0, []],
      ['Black Bear', 1.2, 0x332211, 18, 'tank', 1.2, []],
      ['Cave Bear', 1.7, 0x5a4030, 28, 'boss', 1.35, [drop('great-claw', 0.2), drop('iron-armor', 0.05)]],
    ],
  },

  // HUMANOIDS: goblins, orcs, trolls, etc.
  {
    key: 'kobold', name: 'Kobold', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 8, speed: 3.4, baseLevel: 6, color: 0x99794a,
    gold: [2, 14], loot: [drop('wooden-sword', 0.08), drop('rags', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 0.95, []],
      ['Kobold Miner', 1.1, 0x888866, 10, 'normal', 1.1, [drop('iron-ore', 0.25)]],
      ['Kobold Trapper', 1.1, 0x778855, 14, 'caster', 1.15, []],
    ],
  },
  {
    key: 'goblin', name: 'Goblin', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 9, speed: 3.6, baseLevel: 7, color: 0x6aaa55,
    gold: [3, 20], loot: [drop('wooden-sword', 0.1), drop('leather-armor', 0.06)], tiers: 2,
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Goblin Scout', 1.0, 0x88bb66, 10, 'normal', 1.1, [drop('fast-boots', 0.04)]],
      ['Goblin Archer', 1.0, 0x77aa55, 13, 'caster', 1.15, [drop('short-bow', 0.1)]],
      ['Goblin Shaman', 1.1, 0x559944, 17, 'caster', 1.25, [drop('mana-potion', 0.2)]],
      ['Goblin Brute', 1.5, 0x558844, 22, 'tank', 1.3, [drop('iron-sword', 0.08)]],
      ['Goblin King', 2.0, 0x66bb44, 33, 'boss', 1.5, [drop('goblin-crown', 0.15), drop('steel-sword', 0.08)]],
    ],
  },
  {
    key: 'lizardman', name: 'Lizardman', biome: 'beach', element: 'none',
    aggressive: true, aggroRange: 9, speed: 3.4, baseLevel: 14, color: 0x559966,
    gold: [4, 24], loot: [drop('scale', 0.3), drop('spear', 0.1)],
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Lizardman Soldier', 1.2, 0x448855, 20, 'tank', 1.2, [drop('iron-shield', 0.08)]],
      ['Lizardman Shaman', 1.1, 0x66aa77, 24, 'caster', 1.25, [drop('mana-potion', 0.25)]],
      ['Lizardman Warlord', 1.7, 0x337744, 34, 'boss', 1.45, [drop('steel-sword', 0.1), drop('scale-armor', 0.1)]],
    ],
  },
  {
    key: 'orc', name: 'Orc', biome: 'mountain', element: 'none',
    aggressive: true, aggroRange: 10, speed: 3.4, baseLevel: 8, color: 0x6a8a4a,
    gold: [5, 30], loot: [drop('iron_sword', 0.08), drop('iron_helmet', 0.06)],
    variants: [
      // Tibia 7.4 orc squad: melee grunts + spear-thrower + bow + shaman caster +
      // a tanky leader and the Warlord as the zone overlord.
      ['', 1.0, 0x000000, 0, 'normal', 1.0, [], { levelAbs: 8, attackKind: 'melee' }],
      ['Orc Warrior', 1.15, 0x5a7a3a, 0, 'normal', 1.2, [drop('iron_sword', 0.06)], { levelAbs: 12, attackKind: 'melee' }],
      ['Orc Spearman', 1.0, 0x7a9a5a, 0, 'normal', 1.1, [drop('spear', 0.15)], { levelAbs: 10, attackKind: 'ranged' }],
      ['Orc Berserker', 1.4, 0x4a6a2a, 0, 'tank', 1.3, [drop('battle_axe', 0.06)], { levelAbs: 18, attackKind: 'melee' }],
      ['Orc Shaman', 1.1, 0x5a7a6a, 0, 'caster', 1.2, [drop('fire_wand', 0.06), drop('mana_potion', 0.2)],
        { levelAbs: 14, attackKind: 'caster',
          areaAttack: { kind: 'fire', radius: 3.5, damageMul: 1.2, chance: 0.3 },
          selfHeal: { amount: 0.05, chance: 0.4 } }],
      ['Orc Leader', 1.6, 0x4a6a3a, 0, 'tank', 1.4, [drop('steel_sword', 0.08), drop('iron_armor', 0.08)], { levelAbs: 28, attackKind: 'melee' }],
      ['Orc Warlord', 2.0, 0x3a5a2a, 0, 'boss', 1.6, [drop('battle_axe', 0.1), drop('steel_armor', 0.08), drop('knight_sword', 0.04)],
        { levelAbs: 40, supreme: true, attackKind: 'melee' }],
    ],
  },
  {
    key: 'ogre', name: 'Ogre', biome: 'mountain', element: 'none',
    aggressive: true, aggroRange: 9, speed: 2.8, baseLevel: 22, color: 0x9a8a6a,
    gold: [8, 40], loot: [drop('club', 0.15), drop('ogre-tooth', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'tank', 1.0, []],
      ['Ogre Brute', 1.3, 0x8a7a5a, 28, 'tank', 1.2, [drop('great-club', 0.12)]],
      ['Ogre Chief', 1.8, 0x7a6a4a, 38, 'boss', 1.4, [drop('steel-armor', 0.1), drop('battle-axe', 0.1)]],
    ],
  },
  {
    key: 'troll', name: 'Troll', biome: 'mountain', element: 'none',
    aggressive: true, aggroRange: 9, speed: 3.0, baseLevel: 4, color: 0x6a7a5a,
    gold: [2, 18], loot: [drop('club', 0.1), drop('troll-hide', 0.3)],
    variants: [
      // Tibia trolls are weak early-game brutes; the island troll lobs a stone.
      ['', 1.0, 0x000000, 0, 'normal', 1.0, [], { levelAbs: 4, attackKind: 'melee' }],
      ['Swamp Troll', 1.1, 0x5a6a4a, 0, 'normal', 1.05, [drop('troll-hide', 0.4)], { levelAbs: 5, attackKind: 'melee' }],
      ['Island Troll', 1.0, 0x7a8a5a, 0, 'normal', 1.1, [drop('spear', 0.08)], { levelAbs: 4, attackKind: 'ranged' }],
      ['Cave Troll', 1.4, 0x556655, 0, 'tank', 1.2, [drop('iron_armor', 0.05)], { levelAbs: 8, attackKind: 'melee' }],
      ['Frost Troll', 1.3, 0xaaccdd, 0, 'caster', 1.2, [drop('frost-shard', 0.15)],
        { levelAbs: 9, attackKind: 'caster', areaAttack: { kind: 'water', radius: 3, damageMul: 1.1, chance: 0.25 } }],
      ['Troll Champion', 1.6, 0x4a5a3a, 0, 'boss', 1.5, [drop('battle_axe', 0.08), drop('iron_armor', 0.08)],
        { levelAbs: 12, supreme: true, attackKind: 'melee' }],
    ],
    elementByName: { 'Frost Troll': 'water' },
  },
  {
    key: 'minotaur', name: 'Minotaur', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 10, speed: 3.6, baseLevel: 6, color: 0x7a4a2a,
    gold: [4, 30], loot: [drop('battle_axe', 0.06), drop('horn', 0.3)],
    variants: [
      // Mintwallin formation: melee, a tanky guard, a bow archer (ranged), and
      // the Minotaur Mage who throws energy fields (area) as the zone overlord.
      ['', 1.0, 0x000000, 0, 'normal', 1.0, [], { levelAbs: 6, attackKind: 'melee' }],
      ['Minotaur Guard', 1.3, 0x6a3a1a, 0, 'tank', 1.2, [drop('steel_shield', 0.05)], { levelAbs: 16, attackKind: 'melee' }],
      ['Minotaur Archer', 1.1, 0x8a5a3a, 0, 'normal', 1.15, [drop('long_bow', 0.08)], { levelAbs: 13, attackKind: 'ranged' }],
      ['Minotaur Mage', 1.2, 0x9a6a4a, 0, 'caster', 1.35, [drop('mystic_staff', 0.06), drop('mana_potion', 0.2)],
        { levelAbs: 17, supreme: true, attackKind: 'caster',
          areaAttack: { kind: 'energy', radius: 4, damageMul: 1.4, chance: 0.4 } }],
    ],
  },
  {
    key: 'cyclops', name: 'Cyclops', biome: 'mountain', element: 'none',
    aggressive: true, aggroRange: 11, speed: 3.0, baseLevel: 34, color: 0x9a7a5a,
    gold: [15, 60], loot: [drop('great-club', 0.12), drop('cyclops-eye', 0.25)],
    variants: [
      ['', 1.0, 0x000000, 0, 'boss', 0.7, []],
      ['Cyclops Smith', 1.3, 0x8a6a4a, 42, 'tank', 1.5, [drop('steel-armor', 0.1)]],
      ['Cyclops Drone', 1.6, 0x7a5a3a, 50, 'boss', 1.0, [drop('giant-hammer', 0.12)]],
    ],
  },

  // UNDEAD
  {
    key: 'skeleton', name: 'Skeleton', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 9, speed: 3.0, baseLevel: 5, color: 0xddddcc,
    gold: [3, 20], loot: [drop('bone', 0.4), drop('rusty-sword', 0.08)],
    variants: [
      // Crypt undead: melee skeletons, a bow archer, a demon skeleton tank, and
      // the Necromancer (death area + summons) as the crypt overlord.
      ['', 1.0, 0x000000, 0, 'normal', 1.0, [], { levelAbs: 5, attackKind: 'melee' }],
      ['Skeleton Archer', 1.0, 0xc8c8b8, 0, 'normal', 1.15, [drop('long_bow', 0.06)], { levelAbs: 11, attackKind: 'ranged' }],
      ['Demon Skeleton', 1.3, 0xaaaa99, 0, 'tank', 1.3, [drop('iron_armor', 0.06)], { levelAbs: 20, attackKind: 'melee' }],
      ['Necromancer', 1.4, 0x99bbcc, 0, 'caster', 1.45, [drop('mystic_staff', 0.06), drop('soul-gem', 0.15)],
        { levelAbs: 36, supreme: true, attackKind: 'caster',
          areaAttack: { kind: 'energy', radius: 4.5, damageMul: 1.4, chance: 0.4 },
          selfHeal: { amount: 0.05, chance: 0.35 } }],
    ],
  },
  {
    key: 'zombie', name: 'Zombie', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 8, speed: 1.8, baseLevel: 10, color: 0x6a8a5a,
    gold: [2, 16], loot: [drop('rotten-flesh', 0.5)],
    variants: [
      ['', 1.0, 0x000000, 0, 'tank', 0.9, [], { levelAbs: 10, attackKind: 'melee' }],
      ['Rotting Zombie', 1.2, 0x5a7a4a, 0, 'tank', 1.1, [drop('antidote', 0.15)], { levelAbs: 16, attackKind: 'melee' }],
      // Desert mummies (referenced by id from the desert zone): wrapped, slow,
      // life-drain melee.
      ['Mummy', 1.1, 0xcabd96, 0, 'tank', 1.2, [drop('antidote', 0.12), drop('chitin', 0.2)], { levelAbs: 16, attackKind: 'melee' }],
      ['Ancient Mummy', 1.4, 0xb8a878, 0, 'boss', 1.35, [drop('golden_armor', 0.04), drop('soul-gem', 0.1)], { levelAbs: 30, attackKind: 'melee' }],
    ],
  },
  {
    key: 'ghost', name: 'Ghost', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 10, speed: 3.4, baseLevel: 16, color: 0xccddee,
    gold: [4, 22], loot: [drop('ectoplasm', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'caster', 1.0, []],
      ['Poltergeist', 1.2, 0xbbccdd, 22, 'caster', 1.2, [drop('soul-gem', 0.1)]],
      ['Banshee', 1.4, 0xaaccff, 30, 'boss', 1.35, [drop('wailing-shroud', 0.15)]],
    ],
  },
  {
    key: 'wraith', name: 'Wraith', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 11, speed: 3.6, baseLevel: 24, color: 0x445566,
    gold: [8, 36], loot: [drop('ectoplasm', 0.4), drop('soul-gem', 0.15)],
    variants: [
      ['', 1.0, 0x000000, 0, 'caster', 1.0, []],
      ['Shadow Wraith', 1.3, 0x223344, 32, 'caster', 1.25, [drop('shadow-cloak', 0.12)]],
      ['Death Wraith', 1.6, 0x112233, 44, 'boss', 1.5, [drop('death-scythe', 0.12), drop('soul-gem', 0.3)]],
    ],
  },
  {
    key: 'vampire', name: 'Vampire', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 12, speed: 4.0, baseLevel: 36, color: 0x661122,
    gold: [15, 70], loot: [drop('blood-vial', 0.4), drop('vampire-fang', 0.25)],
    variants: [
      ['', 1.0, 0x000000, 0, 'caster', 1.0, []],
      ['Vampire Lord', 1.4, 0x440011, 46, 'boss', 1.4, [drop('blood-armor', 0.12)]],
      ['Vampire Count', 1.7, 0x550022, 56, 'boss', 1.7, [drop('cursed-blade', 0.12), drop('soul-gem', 0.3)]],
    ],
  },

  // CONSTRUCTS / ELEMENTALS
  {
    key: 'golem', name: 'Golem', biome: 'mountain', element: 'none',
    aggressive: true, aggroRange: 8, speed: 2.0, baseLevel: 28, color: 0x888888,
    gold: [10, 45], loot: [drop('stone', 0.4), drop('core-fragment', 0.2)], tiers: 2,
    variants: [
      ['Stone Golem', 1.0, 0x888888, 0, 'tank', 1.0, []],
      ['Iron Golem', 1.3, 0x778899, 36, 'tank', 1.3, [drop('iron-ore', 0.5)]],
      ['Lava Golem', 1.4, 0xcc4422, 44, 'tank', 1.35, [drop('fire-essence', 0.3)]],
      // Ice Golem (Tibia 7.4): a frozen construct from the far north.
      ['Ice Golem', 1.4, 0xbfe0ef, 40, 'tank', 1.3, [drop('frost-shard', 0.3), drop('water-essence', 0.3)]],
      ['Crystal Golem', 1.5, 0x88ccee, 50, 'boss', 1.5, [drop('crystal', 0.3), drop('steel-armor', 0.1)]],
    ],
    elementByName: { 'Lava Golem': 'fire', 'Ice Golem': 'water' },
  },
  {
    key: 'gargoyle', name: 'Gargoyle', biome: 'mountain', element: 'none',
    aggressive: true, aggroRange: 10, speed: 3.8, baseLevel: 30, color: 0x556655,
    gold: [10, 48], loot: [drop('stone', 0.3), drop('gargoyle-wing', 0.2)],
    variants: [
      ['', 1.0, 0x000000, 0, 'tank', 1.0, []],
      ['Stone Gargoyle', 1.3, 0x445544, 38, 'tank', 1.25, []],
      ['Demon Gargoyle', 1.6, 0x663333, 48, 'boss', 1.45, [drop('demon-shield', 0.08)]],
    ],
  },
  {
    key: 'elemental', name: 'Elemental', biome: 'anywhere', element: 'fire',
    aggressive: true, aggroRange: 11, speed: 3.4, baseLevel: 32, color: 0xdd5522,
    gold: [12, 52], loot: [drop('essence', 0.4)], tiers: 2,
    variants: [
      ['Fire Elemental', 1.0, 0xdd5522, 0, 'caster', 1.1, [drop('fire-essence', 0.4), drop('fire-sword', 0.06)]],
      ['Water Elemental', 1.0, 0x3377cc, 4, 'caster', 1.1, [drop('water-essence', 0.4)]],
      ['Earth Elemental', 1.3, 0x886644, 8, 'tank', 1.2, [drop('earth-essence', 0.4)]],
      ['Storm Elemental', 1.1, 0xddddff, 14, 'caster', 1.3, [drop('storm-essence', 0.3)]],
      ['Magma Elemental', 1.5, 0xff6622, 22, 'boss', 1.5, [drop('fire-sword', 0.1), drop('magma-core', 0.2)]],
    ],
    elementByName: {
      'Water Elemental': 'water', 'Earth Elemental': 'plant',
      'Storm Elemental': 'water', 'Magma Elemental': 'fire',
    },
  },
  {
    key: 'treant', name: 'Treant', biome: 'forest', element: 'plant',
    aggressive: false, aggroRange: 8, speed: 1.6, baseLevel: 20, color: 0x5a7a3a,
    gold: [6, 34], loot: [drop('wood', 0.5), drop('living-bark', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'tank', 1.0, []],
      ['Elder Treant', 1.5, 0x4a6a2a, 30, 'tank', 1.3, [drop('plant-essence', 0.3)]],
      ['Ancient Treant', 2.0, 0x3a5a1a, 42, 'boss', 1.5, [drop('heart-of-the-forest', 0.15), drop('nature-staff', 0.1)]],
    ],
  },

  // WATER / BEACH
  {
    key: 'jellyfish', name: 'Jellyfish', biome: 'beach', element: 'water',
    aggressive: false, aggroRange: 6, speed: 1.4, baseLevel: 8, color: 0xcc88dd,
    gold: [1, 10], loot: [drop('jelly', 0.4)],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 0.9, []],
      ['Stinging Jellyfish', 1.3, 0xdd66cc, 16, 'caster', 1.2, [drop('poison-vial', 0.2)]],
    ],
  },
  {
    key: 'turtle', name: 'Turtle', biome: 'beach', element: 'water',
    aggressive: false, aggroRange: 6, speed: 1.0, baseLevel: 10, color: 0x447755,
    gold: [2, 14], loot: [drop('shell', 0.4)],
    variants: [
      ['', 1.0, 0x000000, 0, 'tank', 1.0, []],
      ['Giant Turtle', 1.8, 0x336644, 24, 'tank', 1.4, [drop('turtle-shield', 0.1)]],
    ],
  },
  {
    key: 'shark', name: 'Shark', biome: 'beach', element: 'water',
    aggressive: true, aggroRange: 12, speed: 4.4, baseLevel: 24, color: 0x556677,
    gold: [8, 40], loot: [drop('shark-tooth', 0.4), drop('fin', 0.2)],
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Great White', 1.6, 0x445566, 34, 'boss', 1.4, [drop('shark-tooth', 0.6), drop('steel-sword', 0.06)]],
    ],
  },

  // FLYING / FEY
  {
    key: 'harpy', name: 'Harpy', biome: 'mountain', element: 'none',
    aggressive: true, aggroRange: 11, speed: 4.2, baseLevel: 26, color: 0xbb9966,
    gold: [8, 38], loot: [drop('feather', 0.4), drop('talon', 0.25)],
    variants: [
      ['', 1.0, 0x000000, 0, 'caster', 1.0, []],
      ['Storm Harpy', 1.3, 0xddddff, 34, 'caster', 1.25, [drop('storm-essence', 0.2)]],
      ['Harpy Queen', 1.7, 0xaa7755, 44, 'boss', 1.45, [drop('harpy-cloak', 0.12)]],
    ],
  },
  {
    key: 'fairy', name: 'Fairy', biome: 'forest', element: 'plant',
    aggressive: false, aggroRange: 7, speed: 4.0, baseLevel: 12, color: 0xaaffcc,
    gold: [2, 16], loot: [drop('fairy-dust', 0.4)],
    variants: [
      ['', 1.0, 0x000000, 0, 'caster', 0.9, []],
      ['Pixie', 0.8, 0xffccee, 8, 'minion', 0.8, []],
      ['Dryad', 1.4, 0x88dd99, 22, 'caster', 1.3, [drop('nature-staff', 0.08), drop('mana-potion', 0.3)]],
    ],
  },

  // HUMAN ENEMIES
  {
    key: 'cultist', name: 'Cultist', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 10, speed: 3.4, baseLevel: 20, color: 0x553366,
    gold: [6, 34], loot: [drop('robe', 0.2), drop('dark-tome', 0.1)], tiers: 2,
    variants: [
      ['', 1.0, 0x000000, 0, 'caster', 1.0, []],
      ['Cult Acolyte', 1.0, 0x442255, 26, 'caster', 1.15, [drop('mana-potion', 0.2)]],
      ['Cult Priest', 1.2, 0x663377, 34, 'caster', 1.3, [drop('dark-tome', 0.2), drop('soul-gem', 0.1)]],
      ['Cult Leader', 1.6, 0x771188, 44, 'boss', 1.5, [drop('cursed-blade', 0.1), drop('dark-robe', 0.12)]],
    ],
  },
  {
    key: 'knight', name: 'Knight', biome: 'mountain', element: 'none',
    aggressive: true, aggroRange: 10, speed: 3.2, baseLevel: 30, color: 0x99aabb,
    gold: [12, 55], loot: [drop('steel-sword', 0.1), drop('steel-shield', 0.08)], tiers: 2,
    variants: [
      ['Fallen Knight', 1.0, 0x778899, 0, 'tank', 1.0, []],
      ['Dark Knight', 1.2, 0x445566, 40, 'tank', 1.3, [drop('steel-armor', 0.12)]],
      ['Death Knight', 1.6, 0x223344, 54, 'boss', 1.6, [drop('cursed-blade', 0.12), drop('black-armor', 0.12)]],
    ],
  },
  {
    key: 'mage', name: 'Mage', biome: 'mountain', element: 'fire',
    aggressive: true, aggroRange: 12, speed: 3.2, baseLevel: 28, color: 0x4455aa,
    gold: [10, 50], loot: [drop('staff', 0.12), drop('mana-potion', 0.3)],
    variants: [
      ['Apprentice Mage', 0.9, 0x5566bb, -4, 'caster', 0.9, []],
      ['Fire Mage', 1.0, 0xcc4433, 6, 'caster', 1.2, [drop('fire-wand', 0.1), drop('fire-sword', 0.05)]],
      ['Frost Mage', 1.0, 0x66aadd, 10, 'caster', 1.2, [drop('frost-wand', 0.1)]],
      // Djinn (Tibia 7.4): the Efreet (fire) and Marid (water) genies — powerful
      // casters that hurl elemental blasts.
      ['Efreet', 1.3, 0xff7a33, 18, 'caster', 1.4, [drop('fire-essence', 0.3), drop('mystic_staff', 0.04)],
        { areaAttack: { kind: 'fire', radius: 4, damageMul: 1.4, chance: 0.4 } }],
      ['Marid', 1.3, 0x33a0ff, 18, 'caster', 1.4, [drop('water-essence', 0.3), drop('mystic_staff', 0.04)],
        { areaAttack: { kind: 'water', radius: 4, damageMul: 1.4, chance: 0.4 } }],
      ['Archmage', 1.4, 0x3344cc, 24, 'boss', 1.55, [drop('archmage-staff', 0.12), drop('soul-gem', 0.25)]],
    ],
    elementByName: { 'Frost Mage': 'water', 'Apprentice Mage': 'none', 'Efreet': 'fire', 'Marid': 'water' },
  },
  {
    key: 'dwarf', name: 'Dwarf', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 8, speed: 3.0, baseLevel: 5, color: 0xaa7755,
    gold: [3, 28], loot: [drop('pickaxe', 0.12), drop('iron-ore', 0.3)],
    variants: [
      // Tibia dwarves: melee, a crossbow soldier (ranged), a tank guard, and the
      // Dwarf Geomancer (molten-rock area caster) as the deep overlord.
      ['', 1.0, 0x000000, 0, 'normal', 1.0, [], { levelAbs: 5, attackKind: 'melee' }],
      ['Dwarf Soldier', 1.1, 0x885533, 0, 'normal', 1.15, [drop('crossbow', 0.06)], { levelAbs: 14, attackKind: 'ranged' }],
      ['Dwarf Guard', 1.3, 0x996644, 0, 'tank', 1.25, [drop('iron_armor', 0.06)], { levelAbs: 24, attackKind: 'melee' }],
      ['Dwarf Geomancer', 1.2, 0xaa5533, 0, 'caster', 1.35, [drop('mystic_staff', 0.06), drop('mana_potion', 0.2)],
        { levelAbs: 22, supreme: true, attackKind: 'caster',
          areaAttack: { kind: 'fire', radius: 4, damageMul: 1.3, chance: 0.4 },
          selfHeal: { amount: 0.05, chance: 0.35 } }],
    ],
  },
  {
    key: 'elf', name: 'Elf', biome: 'forest', element: 'none',
    aggressive: true, aggroRange: 12, speed: 4.0, baseLevel: 8, color: 0xccddaa,
    gold: [6, 34], loot: [drop('long_bow', 0.08), drop('elven-cloak', 0.1)],
    variants: [
      // Deep-forest elves: bow archers (ranged); the Arcanist also casts a small
      // area and heals.
      ['', 1.0, 0xbbcc99, 0, 'normal', 1.0, [], { levelAbs: 8, attackKind: 'ranged' }],
      ['Elf Scout', 1.0, 0xaacc88, 0, 'normal', 1.2, [drop('elven_bow', 0.08)], { levelAbs: 13, attackKind: 'ranged' }],
      ['Elf Arcanist', 1.3, 0x99bb77, 0, 'caster', 1.35, [drop('nature-staff', 0.06), drop('elven-armor', 0.06)],
        { levelAbs: 20, supreme: true, attackKind: 'caster',
          areaAttack: { kind: 'energy', radius: 3.5, damageMul: 1.3, chance: 0.35 },
          selfHeal: { amount: 0.05, chance: 0.4 } }],
    ],
  },

  // TRAP / SPECIAL
  {
    key: 'mimic', name: 'Mimic', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 4, speed: 2.4, baseLevel: 22, color: 0x8a5a2a,
    gold: [20, 80], loot: [drop('gold-coins', 0.6), drop('treasure-key', 0.2)],
    variants: [
      ['', 1.0, 0x000000, 0, 'tank', 1.1, []],
      ['Chest Mimic', 1.2, 0x7a4a1a, 30, 'tank', 1.3, [drop('iron-armor', 0.1)]],
      ['Royal Mimic', 1.5, 0xaa8833, 42, 'boss', 1.5, [drop('treasure-key', 0.4), drop('steel-sword', 0.1)]],
    ],
  },
  {
    key: 'imp', name: 'Imp', biome: 'cave', element: 'fire',
    aggressive: true, aggroRange: 10, speed: 4.0, baseLevel: 18, color: 0xcc4433,
    gold: [4, 28], loot: [drop('imp-horn', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'caster', 1.0, []],
      ['Fire Imp', 1.1, 0xee5533, 26, 'caster', 1.2, [drop('fire-essence', 0.2)]],
      ['Shadow Imp', 1.1, 0x442244, 30, 'caster', 1.25, [drop('shadow-cloak', 0.08)]],
    ],
    elementByName: { 'Shadow Imp': 'none' },
  },

  // ENDGAME: dragons, wyverns, hydras, demons
  {
    key: 'wyvern', name: 'Wyvern', biome: 'mountain', element: 'none',
    aggressive: true, aggroRange: 13, speed: 4.4, baseLevel: 40, color: 0x556644,
    gold: [25, 100], loot: [drop('wyvern-scale', 0.4), drop('wyvern-fang', 0.2)],
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.1, []],
      ['Poison Wyvern', 1.2, 0x66aa44, 48, 'caster', 1.3, [drop('venom-gland', 0.3)]],
      ['Storm Wyvern', 1.4, 0x8899dd, 56, 'boss', 1.5, [drop('storm-essence', 0.3), drop('steel-armor', 0.1)]],
    ],
    elementByName: { 'Storm Wyvern': 'water' },
  },
  {
    key: 'hydra', name: 'Hydra', biome: 'beach', element: 'water',
    aggressive: true, aggroRange: 13, speed: 3.0, baseLevel: 50, color: 0x447766,
    gold: [40, 150], loot: [drop('hydra-scale', 0.4), drop('hydra-fang', 0.25)],
    variants: [
      // The Hydra: heavy melee (3 heads lunge) + a triangular poison area burst,
      // and it self-heals like its Tibia counterpart.
      ['', 1.0, 0x000000, 0, 'boss', 0.8, [],
        { levelAbs: 68, attackKind: 'melee',
          areaAttack: { kind: 'poison', radius: 5, damageMul: 1.3, chance: 0.4 },
          selfHeal: { amount: 0.06, chance: 0.5 } }],
      ['Swamp Hydra', 1.3, 0x557744, 0, 'boss', 1.1, [drop('poison-vial', 0.4), drop('dragon_armor', 0.05)],
        { levelAbs: 70, attackKind: 'melee',
          areaAttack: { kind: 'poison', radius: 6, damageMul: 1.4, chance: 0.45 },
          selfHeal: { amount: 0.07, chance: 0.5 } }],
      ['Ancient Hydra', 1.8, 0x336655, 0, 'boss', 1.5, [drop('hydra-armor', 0.12), drop('demon_shield', 0.05), drop('golden_armor', 0.04)],
        { levelAbs: 76, supreme: true, attackKind: 'melee',
          areaAttack: { kind: 'poison', radius: 7, damageMul: 1.6, chance: 0.5 },
          selfHeal: { amount: 0.08, chance: 0.55 } }],
    ],
    elementByName: { 'Swamp Hydra': 'plant' },
  },
  {
    key: 'serpent', name: 'Leviathan', biome: 'beach', element: 'water',
    aggressive: true, aggroRange: 14, speed: 3.6, baseLevel: 60, color: 0x335577,
    gold: [50, 200], loot: [drop('leviathan-scale', 0.4)],
    variants: [
      ['Sea Serpent', 1.0, 0x336688, 0, 'boss', 0.9, [drop('water-essence', 0.4)]],
      ['Leviathan', 2.0, 0x224466, 18, 'boss', 1.6, [drop('leviathan-armor', 0.12), drop('trident', 0.1)]],
    ],
  },
  {
    key: 'dragon', name: 'Dragon', biome: 'mountain', element: 'fire',
    aggressive: true, aggroRange: 14, speed: 4.0, baseLevel: 38, color: 0xcc3322,
    gold: [80, 350], loot: [drop('dragon-scale', 0.4), drop('dragon-tooth', 0.25)],
    variants: [
      // Dragons: melee bite + a fire-breath / fireball area, and they self-heal.
      // The Dragon Lord (Tibia ~lv72) is the mountain overlord with a great fire bomb.
      ['', 1.1, 0xcc2211, 0, 'boss', 1.0, [drop('fire_sword', 0.06), drop('dragon_shield', 0.04)],
        { levelAbs: 38, attackKind: 'melee',
          areaAttack: { kind: 'fire', radius: 5, damageMul: 1.4, chance: 0.4 },
          selfHeal: { amount: 0.05, chance: 0.4 } }],
      ['Green Dragon', 1.2, 0x338822, 0, 'boss', 1.05, [drop('dragon_armor', 0.05), drop('plant-essence', 0.4)],
        { levelAbs: 42, attackKind: 'melee',
          areaAttack: { kind: 'poison', radius: 5, damageMul: 1.4, chance: 0.4 },
          selfHeal: { amount: 0.05, chance: 0.4 } }],
      ['Black Dragon', 1.4, 0x222222, 0, 'boss', 1.25, [drop('dragon_armor', 0.06), drop('dragon_helmet', 0.05)],
        { levelAbs: 55, attackKind: 'melee',
          areaAttack: { kind: 'fire', radius: 6, damageMul: 1.5, chance: 0.45 },
          selfHeal: { amount: 0.06, chance: 0.45 } }],
      // Frost Dragon (Tibia 7.4): an icy dragon with a freezing breath.
      ['Frost Dragon', 1.5, 0x9fd6ff, 0, 'boss', 1.3, [drop('frost_armor', 0.05), drop('frost-shard', 0.4), drop('dragon_shield', 0.04)],
        { levelAbs: 58, attackKind: 'melee',
          areaAttack: { kind: 'water', radius: 6, damageMul: 1.5, chance: 0.45 },
          selfHeal: { amount: 0.06, chance: 0.45 } }],
      ['Dragon Lord', 1.9, 0x991111, 0, 'boss', 1.7, [drop('dragon_shield', 0.08), drop('demon_armor', 0.04), drop('golden_legs', 0.04), drop('soul-gem', 0.3)],
        { levelAbs: 72, supreme: true, attackKind: 'melee',
          areaAttack: { kind: 'fire', radius: 8, damageMul: 1.8, chance: 0.5 },
          selfHeal: { amount: 0.07, chance: 0.5 } }],
    ],
    elementByName: { 'Green Dragon': 'plant', 'Black Dragon': 'none', 'Frost Dragon': 'water' },
  },

  // THE HARDEST: Demon endgame
  {
    key: 'demon', name: 'Demon', biome: 'cave', element: 'fire',
    aggressive: true, aggroRange: 14, speed: 4.2, baseLevel: 75, color: 0xaa1111,
    gold: [150, 600], loot: [drop('demon-horn', 0.4), drop('hellfire-shard', 0.25)],
    variants: [
      // The Demon (Tibia ~lv88): the apex. Melee + life-drain energy + huge
      // fireball area + heals. The Demon Lord is the abyss overlord.
      ['Lesser Demon', 1.1, 0xbb2211, 0, 'boss', 0.8, [drop('demon_shield', 0.05)],
        { levelAbs: 75, attackKind: 'caster',
          areaAttack: { kind: 'fire', radius: 5, damageMul: 1.5, chance: 0.4 },
          selfHeal: { amount: 0.05, chance: 0.4 } }],
      ['Demon', 1.5, 0xaa1111, 0, 'boss', 1.1, [drop('demon_shield', 0.06), drop('demon_armor', 0.04)],
        { levelAbs: 88, attackKind: 'caster',
          areaAttack: { kind: 'fire', radius: 6, damageMul: 1.7, chance: 0.45 },
          selfHeal: { amount: 0.06, chance: 0.45 } }],
      ['Demon Lord', 2.4, 0x550000, 0, 'boss', 1.9, [drop('demon_armor', 0.1), drop('demon_helmet', 0.06), drop('demon_amulet', 0.06), drop('soul-gem', 0.6)],
        { levelAbs: 110, supreme: true, attackKind: 'caster',
          areaAttack: { kind: 'fire', radius: 9, damageMul: 2.0, chance: 0.5 },
          selfHeal: { amount: 0.08, chance: 0.5 } }],
    ],
  },
];

// Builder: expand FAMILY_DEFS into a flat CREATURES array. Deterministic.
function tintColor(base, tint) {
  // tint === 0 means "keep base color"
  return tint === 0 ? base : tint;
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}


function pushCreature(out, seenIds, fam, name, scaleMul, color, level, role, statMul, loot, idxRef, opts) {
  const o = opts || {};
  const element = (o.element != null)
    ? o.element
    : (fam.elementByName && fam.elementByName[name] != null)
      ? fam.elementByName[name]
      : fam.element;
  let id = `${fam.key}-${slug(name)}`;
  while (seenIds.has(id)) id = `${id}-${idxRef.i}`;
  seenIds.add(id);
  const base = baseStats(level, role);
  // High-level foes shouldn't drop fruit/berries; the boss role and deep
  // creatures lean on real loot instead. potionDropsForLevel already escalates
  // the tier by level, so this only trims the low fruit tail.
  const lootWithPotions = [...loot, ...potionDropsForLevel(level, role)];
  // Whether this creature is aggressive: a per-variant override wins, else the
  // family default. Passive creatures still get provoked when attacked (combat).
  const aggressive = (o.aggressive != null) ? o.aggressive : fam.aggressive;
  const entry = {
    id,
    name,
    family: fam.key,
    variantScale: Math.round(Math.min(2.4, Math.max(0.6, scaleMul)) * 100) / 100,
    color,
    level,
    hp: round(base.hp * statMul),
    attack: round(base.attack * statMul),
    defense: round(base.defense * statMul),
    exp: round(base.exp * statMul),
    element,
    aggressive,
    aggroRange: aggressive ? (o.aggroRange != null ? o.aggroRange : fam.aggroRange) : 0,
    speed: fam.speed,
    spawnBiome: fam.biome,
    loot: lootWithPotions,
    // Combat behaviour (read by combat.js). attackKind drives how it fights;
    // areaAttack/selfHeal are optional occasional abilities; boss/supreme flag
    // tougher encounters and the one zone overlord.
    attackKind: o.attackKind || 'melee',
  };
  if (o.areaAttack) entry.areaAttack = o.areaAttack;
  if (o.selfHeal) entry.selfHeal = o.selfHeal;
  if (o.boss || role === 'boss') entry.boss = true;
  if (o.supreme) entry.supreme = true;
  out.push(entry);
  idxRef.i++;
}

function buildCreatures() {
  const out = [];
  const seenIds = new Set();
  for (const fam of FAMILY_DEFS) {
    const idxRef = { i: 0 };
    for (const [suffix, scaleMul, colorTint, lvDelta, role, statMul, lootAdds, opts] of fam.variants) {
      const name = suffix === '' ? fam.name : suffix;
      // `opts.levelAbs` pins an absolute level (Tibia-accurate authoring); else
      // the level is the family base plus this variant's delta.
      const level = (opts && opts.levelAbs != null)
        ? Math.max(1, opts.levelAbs)
        : Math.max(1, fam.baseLevel + lvDelta);
      const color = tintColor(fam.color, colorTint);
      const baseLoot = [gold(fam.gold[0], fam.gold[1]), ...fam.loot, ...(lootAdds || [])];

      // keep the bare family key as the canonical id for its base variant
      const wasEmpty = suffix === '';
      const startCount = out.length;
      pushCreature(out, seenIds, fam, name, scaleMul, color, level, role, statMul, baseLoot, idxRef, opts);
      if (wasEmpty) {
        // re-key the just-pushed base entry to the bare family key when free
        const justPushed = out[startCount];
        if (!seenIds.has(fam.key) || justPushed.id === fam.key) {
          seenIds.delete(justPushed.id);
          justPushed.id = fam.key;
          seenIds.add(fam.key);
        }
      }
    }
  }
  return out;
}

// --- Drop-rate rebalance + high-end item distribution ----------------------
// The user wants tight, Tibia-style drop odds, NOT the loose 5-40% the variants
// were authored with:
//   • common gear (shopTier 'shop')        -> 2-5%
//   • epic gear   (shopTier 'epic')         -> 1-3%
//   • legendary   (shopTier 'legendary-tier')-> 0.01% (a day of farming = ~one or none)
// Junk/material/flavor drops (hides, scales, gems — ids that aren't real
// equipment) keep their authored chances; they're meant to be common.
//
// Then the marquee high-end items (demon shield, demon armor, etc.) are seeded
// onto SEVERAL strong, high-level creatures at a tiny chance, so they're not the
// exclusive reserve of one boss but still brutally rare to farm.

// Resolve a loot itemId to its equipment def (or null for junk/materials).
function equipDefFor(itemId) {
  return getWeapon(itemId) || getArmor(itemId) || getContainer(itemId) || null;
}

// The capped chance for an equipment drop, by its shop tier and a stable hash so
// items don't all land on the exact same number. Returns null = leave as-is.
function cappedChance(def, seed) {
  const j = ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1;   // deterministic 0..1
  const tier = def.shopTier;
  if (tier === 'legendary-tier') return 0.0001 + j * 0.0001;   // ~0.01% (0.01-0.02%)
  if (tier === 'epic') return 0.01 + j * 0.02;                  // 1-3%
  // everything buyable ('shop') or untagged equipment -> common band
  return 0.02 + j * 0.03;                                       // 2-5%
}

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

// The high-end items that should come from MANY strong foes, each id paired with
// the minimum creature level that may drop it. Distributed below at tiny odds.
const HIGH_END_DROPS = [
  { id: 'demon_shield',  minLevel: 55 },
  { id: 'demon_armor',   minLevel: 75 },
  { id: 'demon_helmet',  minLevel: 85 },
  { id: 'demon_legs',    minLevel: 85 },
  { id: 'golden_armor',  minLevel: 40 },
  { id: 'golden_legs',   minLevel: 40 },
  { id: 'dragon_shield', minLevel: 45 },
  { id: 'dragon_armor',  minLevel: 55 },
  { id: 'mastermind_shield', minLevel: 70 },
  { id: 'magic_sword',   minLevel: 80 },
  { id: 'demon_sword',   minLevel: 85 },
  { id: 'soul-gem',      minLevel: 50 },
];

function rebalanceLoot(creatures) {
  for (const c of creatures) {
    for (const entry of c.loot) {
      if (entry.itemId === 'gold' || entry.potion) continue;   // gold + potions handled elsewhere
      const def = equipDefFor(entry.itemId);
      if (!def) continue;                                      // junk/material — leave common
      const capped = cappedChance(def, hashStr(c.id + entry.itemId));
      // Only ever LOWER an authored chance (never raise a deliberately-rare one).
      if (capped != null && entry.chance > capped) entry.chance = capped;
    }
  }

  // Seed the marquee items onto every sufficiently strong creature that doesn't
  // already drop them, at a tiny chance — so a Warlock, Banshee, Vampire Count,
  // Dragon Lord etc. can all drop a demon shield, but only with a day's luck.
  for (const c of creatures) {
    for (const hd of HIGH_END_DROPS) {
      if ((c.level || 1) < hd.minLevel) continue;
      if (c.loot.some((l) => l.itemId === hd.id)) continue;    // already drops it
      const def = equipDefFor(hd.id);
      // Scale the floor odds a touch with how far the creature out-levels the
      // requirement (a level-110 demon is likelier than a level-55 warlock), but
      // keep it minuscule. Soul-gem (a quest material) gets a slightly higher rate.
      const over = Math.min(1, ((c.level || 1) - hd.minLevel) / 60);
      const base = hd.id === 'soul-gem' ? 0.003 : (def && def.shopTier === 'legendary-tier' ? 0.0002 : 0.0008);
      c.loot.push({ itemId: hd.id, chance: +(base * (1 + over)).toFixed(5) });
    }
  }
}

// NON-THEMATIC gear drops. The user's rule: loot is NOT class-themed — a cyclops
// can drop an axe, boots, or a bow purely by chance. Every creature gets a small
// pool of LEVEL-APPROPRIATE equipment (any type/slot) seeded into its loot, with
// chances that scale to the creature's level. Deterministic (hash-seeded), so the
// same creature always offers the same pool.
const GEAR_POOL = [
  ...WEAPONS.filter((w) => w.shopTier !== 'legendary-tier'),
  ...ARMORS.filter((a) => a.shopTier !== 'legendary-tier'),
];

function seededShuffle(arr, seed) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const r = ((Math.sin(seed + i) * 43758.5453) % 1 + 1) % 1;
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function addNonThematicGear(creatures) {
  for (const c of creatures) {
    const lv = c.level || 1;
    // gear within a band around the creature's level (can't drop gear far above it)
    const lo = Math.max(1, Math.floor(lv * 0.5));
    const hi = lv + 6;
    const pool = GEAR_POOL.filter((g) => (g.levelReq || 1) >= lo && (g.levelReq || 1) <= hi);
    if (!pool.length) continue;
    // how many distinct gear rolls this creature offers: tougher foes drop more
    const slots = (c.boss || c.supreme) ? 5 : lv >= 40 ? 3 : lv >= 15 ? 2 : 1;
    const picks = seededShuffle(pool, hashStr(c.id) >>> 0).slice(0, slots);
    for (const g of picks) {
      if (c.loot.some((l) => l.itemId === g.id)) continue;
      // base chance by tier, lifted a touch for bosses; capped low so gear stays
      // a treat, not a flood. Epic gear rarer than common.
      const tierBase = g.shopTier === 'epic' ? 0.012 : 0.035;
      const chance = +(tierBase * ((c.boss || c.supreme) ? 1.8 : 1)).toFixed(4);
      c.loot.push({ itemId: g.id, chance });
    }
  }
}

export const CREATURES = buildCreatures();
rebalanceLoot(CREATURES);

// Every creature drops its family TROPHY (rat tail, demon horn, dragon claw…) at
// a high chance — the always-available remains a "remains buyer" NPC pays small
// money for, so players have a steady grind-and-sell income loop. Bosses drop it
// for sure. (See data/trophies.js for the per-family item + value.)
for (const c of CREATURES) {
  const tr = trophyForFamily(c.family);
  if (!tr) continue;
  if (c.loot.some((l) => l.itemId === tr.id)) continue;
  c.loot.push({ itemId: tr.id, chance: (c.boss || c.supreme) ? 1 : 0.6, trophy: true });
}

// Spread level-appropriate, non-class gear across every creature.
addNonThematicGear(CREATURES);

// Behaviour flags read by combat.js: which families FLEE at low HP, which FLY,
// and which inflict a status. Applied per family so the AI/status systems light
// up without hand-editing every variant.
const FLYING_FAMILIES = new Set(['bat', 'wasp', 'fairy', 'harpy', 'ghost', 'wraith', 'wyvern', 'dragon', 'gargoyle', 'bird', 'pigeon', 'seagull']);
const BURN_FAMILIES = new Set(['dragon', 'demon', 'imp', 'elemental', 'fire_elemental', 'fire_devil', 'hellhound']);
const SLOW_FAMILIES = new Set([]);   // ice variants flagged by element below
for (const c of CREATURES) {
  // Flee: small/passive critters (level ≤5) flee at 20%; many others flee 8–30%.
  if (!c.aggressive || c.level <= 5) {
    c.fleeBelowHpPct = 0.2;
  } else if (/rat|cave_rat|goblin|orc$|orc-|troll|scarab|spider|wolf|bear|deer/.test(c.id) && !c.boss) {
    c.fleeBelowHpPct = c.level <= 20 ? 0.15 : 0.1;
  }
  // Dragons/wyverns kite away when low so knights struggle and archers thrive.
  if ((c.family === 'dragon' || c.family === 'wyvern') && !c.supreme) c.fleeBelowHpPct = 0.3;
  // Fly: airborne families ignore terrain and swoop to attack.
  if (FLYING_FAMILIES.has(c.family)) { c.flying = true; c.flyHeight = c.family === 'dragon' ? 4 : 3; }
  // Status: burn for fiery foes, poison/ice already carried via element; flag burn.
  if (BURN_FAMILIES.has(c.family) && c.element === 'fire') c.burns = true;
  if (c.element === 'water' && /frost|ice|winter|glacial/.test(c.id)) c.slows = true;
}

// Fast id lookup.
const BY_ID = new Map(CREATURES.map((c) => [c.id, c]));

// Public helpers.
export function getCreature(id) {
  return BY_ID.get(id) || null;
}

// Creatures roughly appropriate for a player at `level`. Band widens slightly
// at higher levels so spawn pools never run dry.
export function creaturesForLevel(level) {
  const lo = Math.max(1, level - 4);
  const hi = level + Math.max(5, Math.round(level * 0.25));
  return CREATURES.filter((c) => c.level >= lo && c.level <= hi);
}

// Filter by spawn biome; 'anywhere' creatures always included.
export function creaturesForBiome(biome) {
  return CREATURES.filter((c) => c.spawnBiome === biome || c.spawnBiome === 'anywhere');
}
