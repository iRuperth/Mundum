// Mundum creature database — PURE DATA. No Three.js, no DOM.
// ~300 entries built from ~50 procedural family models, each with variants.
// Stats scale with level + role so the game gets progressively harder.
// Everything is expanded deterministically at module load (no Math.random).

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
      ['', 1.0, 0x000000, 0, 'minion', 1.6, []], // single, as the user specified
    ],
  },
  {
    key: 'rat', name: 'Rat', biome: 'grass', element: 'none',
    aggressive: false, aggroRange: 6, speed: 2.2, baseLevel: 2, color: 0x8a7a6a,
    gold: [0, 4], loot: [drop('cheese', 0.2)],
    variants: [
      ['', 1.0, 0x000000, 0, 'minion', 1.0, []],
      ['Big Rat', 1.4, 0x6a5a4a, 3, 'normal', 1.1, [drop('rat-tail', 0.3)]],
      ['Cave Rat', 1.2, 0x555555, 6, 'normal', 1.15, []],
      ['Sewer Rat', 1.1, 0x4a4a3a, 8, 'normal', 1.1, []],
      ['Plague Rat', 1.3, 0x6a7a5a, 10, 'normal', 1.25, [drop('antidote', 0.15)]],
      ['Rat King', 1.8, 0x7a6a5a, 18, 'boss', 1.4, [drop('rat-crown', 0.1), drop('leather-armor', 0.06)]],
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
      ['', 1.0, 0x000000, 0, 'minion', 1.0, []],
      ['Fire Beetle', 1.1, 0xaa4422, 7, 'normal', 1.1, [drop('fire-essence', 0.1)]],
      ['Iron Beetle', 1.3, 0x667788, 14, 'tank', 1.25, [drop('iron-ore', 0.3)]],
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
    aggressive: true, aggroRange: 8, speed: 3.0, baseLevel: 7, color: 0x333333,
    gold: [1, 12], loot: [drop('silk', 0.35), drop('spider-leg', 0.2)], tiers: 2,
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Wood Spider', 1.1, 0x665544, 4, 'minion', 0.9, []],
      ['Poison Spider', 1.2, 0x884488, 13, 'caster', 1.2, [drop('poison-vial', 0.3)]],
      ['Tarantula', 1.5, 0x554433, 20, 'normal', 1.25, [drop('silk', 0.6)]],
      ['Giant Spider', 2.0, 0x222233, 32, 'boss', 1.4, [drop('spider-silk-armor', 0.06), drop('venom-gland', 0.4)]],
    ],
  },
  {
    key: 'scorpion', name: 'Scorpion', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 8, speed: 2.6, baseLevel: 9, color: 0x886622,
    gold: [2, 14], loot: [drop('scorpion-tail', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Sand Scorpion', 1.2, 0xccaa66, 14, 'normal', 1.15, []],
      ['Black Scorpion', 1.5, 0x222222, 24, 'tank', 1.3, [drop('venom-gland', 0.35)]],
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
    key: 'wolf', name: 'Wolf', biome: 'forest', element: 'none',
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
    key: 'bear', name: 'Bear', biome: 'forest', element: 'none',
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
    aggressive: true, aggroRange: 10, speed: 3.4, baseLevel: 15, color: 0x6a8a4a,
    gold: [5, 30], loot: [drop('iron-sword', 0.1), drop('iron-helmet', 0.07)], tiers: 2,
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Orc Archer', 1.0, 0x7a9a5a, 18, 'caster', 1.15, [drop('long-bow', 0.1)]],
      ['Orc Mage', 1.1, 0x5a7a6a, 22, 'caster', 1.3, [drop('fire-wand', 0.08), drop('mana-potion', 0.3)]],
      ['Orc Wise', 1.1, 0x8a9a6a, 26, 'caster', 1.25, [drop('staff', 0.1)]],
      ['Orc Leader', 1.6, 0x4a6a3a, 30, 'tank', 1.35, [drop('steel-sword', 0.1), drop('iron-armor', 0.1)]],
      ['Orc Warlord', 2.0, 0x3a5a2a, 40, 'boss', 1.5, [drop('battle-axe', 0.12), drop('steel-armor', 0.1)]],
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
    aggressive: true, aggroRange: 10, speed: 3.0, baseLevel: 26, color: 0x6a7a5a,
    gold: [10, 50], loot: [drop('club', 0.12), drop('troll-hide', 0.3)], tiers: 2,
    variants: [
      ['', 1.0, 0x000000, 0, 'tank', 1.0, []],
      ['Cave Troll', 1.3, 0x556655, 32, 'tank', 1.2, [drop('iron-armor', 0.1)]],
      ['Frost Troll', 1.4, 0xaaccdd, 38, 'caster', 1.3, [drop('frost-shard', 0.2)]],
      ['War Troll', 1.7, 0x4a5a3a, 44, 'boss', 1.45, [drop('steel-armor', 0.12), drop('great-axe', 0.1)]],
    ],
    elementByName: { 'Frost Troll': 'water' },
  },
  {
    key: 'minotaur', name: 'Minotaur', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 10, speed: 3.6, baseLevel: 30, color: 0x7a4a2a,
    gold: [12, 55], loot: [drop('battle-axe', 0.12), drop('horn', 0.3)],
    variants: [
      ['', 1.0, 0x000000, 0, 'tank', 1.0, []],
      ['Minotaur Guard', 1.3, 0x6a3a1a, 36, 'tank', 1.25, [drop('steel-shield', 0.1)]],
      ['Minotaur Mage', 1.2, 0x8a5a3a, 40, 'caster', 1.3, [drop('staff', 0.1)]],
      ['Minotaur King', 1.9, 0x5a2a0a, 50, 'boss', 1.55, [drop('minotaur-axe', 0.15), drop('steel-armor', 0.12)]],
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
    aggressive: true, aggroRange: 9, speed: 3.0, baseLevel: 12, color: 0xddddcc,
    gold: [3, 20], loot: [drop('bone', 0.4), drop('rusty-sword', 0.1)], tiers: 2,
    variants: [
      ['', 1.0, 0x000000, 0, 'normal', 1.0, []],
      ['Skeleton Warrior', 1.1, 0xccccbb, 18, 'tank', 1.2, [drop('iron-sword', 0.08)]],
      ['Skeleton Archer', 1.0, 0xc8c8b8, 16, 'caster', 1.15, [drop('long-bow', 0.1)]],
      ['Skeleton Mage', 1.1, 0xbbbbee, 24, 'caster', 1.3, [drop('staff', 0.1), drop('mana-potion', 0.25)]],
      ['Bone Knight', 1.5, 0xaaaa99, 32, 'tank', 1.35, [drop('steel-armor', 0.1)]],
      ['Lich', 1.6, 0x99bbcc, 48, 'boss', 1.6, [drop('lich-staff', 0.12), drop('soul-gem', 0.2)]],
    ],
  },
  {
    key: 'zombie', name: 'Zombie', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 8, speed: 1.8, baseLevel: 10, color: 0x6a8a5a,
    gold: [2, 16], loot: [drop('rotten-flesh', 0.5)],
    variants: [
      ['', 1.0, 0x000000, 0, 'tank', 0.9, []],
      ['Rotting Zombie', 1.2, 0x5a7a4a, 16, 'tank', 1.1, [drop('antidote', 0.15)]],
      ['Plague Zombie', 1.3, 0x7a9a4a, 24, 'tank', 1.25, [drop('poison-vial', 0.2)]],
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
      ['Crystal Golem', 1.5, 0x88ccee, 50, 'boss', 1.5, [drop('crystal', 0.3), drop('steel-armor', 0.1)]],
    ],
    elementByName: { 'Lava Golem': 'fire' },
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
      ['Archmage', 1.4, 0x3344cc, 24, 'boss', 1.55, [drop('archmage-staff', 0.12), drop('soul-gem', 0.25)]],
    ],
    elementByName: { 'Frost Mage': 'water', 'Apprentice Mage': 'none' },
  },
  {
    key: 'dwarf', name: 'Dwarf', biome: 'cave', element: 'none',
    aggressive: true, aggroRange: 8, speed: 3.0, baseLevel: 18, color: 0xaa7755,
    gold: [6, 32], loot: [drop('pickaxe', 0.15), drop('iron-ore', 0.3)],
    variants: [
      ['Mad Dwarf', 1.0, 0x996644, 0, 'normal', 1.0, []],
      ['Dwarf Guard', 1.2, 0x885533, 26, 'tank', 1.25, [drop('iron-armor', 0.1)]],
      ['Dwarf Berserker', 1.3, 0xaa5533, 32, 'boss', 1.4, [drop('battle-axe', 0.12)]],
    ],
  },
  {
    key: 'elf', name: 'Elf', biome: 'forest', element: 'none',
    aggressive: true, aggroRange: 12, speed: 4.0, baseLevel: 20, color: 0xccddaa,
    gold: [6, 34], loot: [drop('long-bow', 0.12), drop('elven-cloak', 0.1)],
    variants: [
      ['Wild Elf', 1.0, 0xbbcc99, 0, 'caster', 1.0, []],
      ['Elf Ranger', 1.0, 0xaacc88, 28, 'caster', 1.25, [drop('elven-bow', 0.12)]],
      ['Elf Warden', 1.3, 0x99bb77, 36, 'boss', 1.4, [drop('nature-staff', 0.1), drop('elven-armor', 0.1)]],
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
      ['', 1.0, 0x000000, 0, 'boss', 0.8, []],
      ['Swamp Hydra', 1.3, 0x557744, 60, 'boss', 1.1, [drop('poison-vial', 0.4)]],
      ['Ancient Hydra', 1.8, 0x336655, 72, 'boss', 1.5, [drop('hydra-armor', 0.12), drop('dragon-axe', 0.08)]],
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
    aggressive: true, aggroRange: 14, speed: 4.0, baseLevel: 70, color: 0xcc3322,
    gold: [80, 350], loot: [drop('dragon-scale', 0.5), drop('dragon-tooth', 0.3)],
    variants: [
      ['Young Dragon', 0.9, 0xdd4433, -10, 'boss', 0.7, [drop('dragon-scale', 0.4)]],
      ['Red Dragon', 1.2, 0xcc2211, 0, 'boss', 1.0, [drop('fire-sword', 0.12), drop('dragon-axe', 0.08)]],
      ['Green Dragon', 1.2, 0x338822, 6, 'boss', 1.05, [drop('plant-essence', 0.4), drop('dragon-axe', 0.08)]],
      ['Blue Dragon', 1.2, 0x2244cc, 10, 'boss', 1.1, [drop('water-essence', 0.4), drop('frost-blade', 0.1)]],
      ['Black Dragon', 1.4, 0x222222, 18, 'boss', 1.25, [drop('dragon-axe', 0.12), drop('dragon-armor', 0.1)]],
      ['Golden Dragon', 1.5, 0xddbb33, 26, 'boss', 1.4, [drop('dragon-armor', 0.15), drop('dragon-slayer', 0.1)]],
      ['Elder Dragon', 1.8, 0x991111, 38, 'boss', 1.7, [drop('dragon-slayer', 0.15), drop('dragon-shield', 0.12), drop('soul-gem', 0.4)]],
    ],
    elementByName: {
      'Green Dragon': 'plant', 'Blue Dragon': 'water',
      'Black Dragon': 'none', 'Golden Dragon': 'fire',
    },
  },

  // THE HARDEST: Demon endgame
  {
    key: 'demon', name: 'Demon', biome: 'cave', element: 'fire',
    aggressive: true, aggroRange: 14, speed: 4.2, baseLevel: 90, color: 0xaa1111,
    gold: [150, 600], loot: [drop('demon-horn', 0.5), drop('hellfire-shard', 0.3)],
    variants: [
      ['Lesser Demon', 1.0, 0xbb2211, -15, 'boss', 0.75, [drop('demon-shield', 0.1)]],
      ['Demon', 1.4, 0xaa1111, 0, 'boss', 1.0, [drop('demon-shield', 0.12), drop('hellfire-blade', 0.1)]],
      ['Greater Demon', 1.7, 0x991100, 14, 'boss', 1.25, [drop('hellfire-blade', 0.15), drop('demon-armor', 0.12)]],
      ['Arch Demon', 2.0, 0x770000, 24, 'boss', 1.5, [drop('demon-armor', 0.15), drop('soul-reaper', 0.12), drop('soul-gem', 0.5)]],
      ['Demon Lord', 2.4, 0x550000, 35, 'boss', 1.9, [drop('demon-crown', 0.2), drop('soul-reaper', 0.2), drop('demon-armor', 0.2), drop('soul-gem', 0.8)]],
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

// Tier prefixes used to expand families flagged with `tiers`. Each tier is a
// tougher recolored/rescaled copy of a base variant, deterministically derived.
// [prefix, scaleAdd, colorTint, levelDelta, statMul, lootBonus]
const TIERS = [
  ['Elite', 0.15, 0x886699, 6, 1.35, drop('gold-coins', 0.2)],
  ['Champion', 0.3, 0xaa7733, 12, 1.7, drop('rare-charm', 0.15)],
  ['Ancient', 0.45, 0x445566, 20, 2.2, drop('soul-gem', 0.2)],
];

function pushCreature(out, seenIds, fam, name, scaleMul, color, level, role, statMul, loot, idxRef) {
  const element = (fam.elementByName && fam.elementByName[name] != null)
    ? fam.elementByName[name]
    : fam.element;
  let id = `${fam.key}-${slug(name)}`;
  while (seenIds.has(id)) id = `${id}-${idxRef.i}`;
  seenIds.add(id);
  const base = baseStats(level, role);
  out.push({
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
    aggressive: fam.aggressive,
    aggroRange: fam.aggressive ? fam.aggroRange : 0,
    speed: fam.speed,
    spawnBiome: fam.biome,
    loot,
  });
  idxRef.i++;
}

function buildCreatures() {
  const out = [];
  const seenIds = new Set();
  for (const fam of FAMILY_DEFS) {
    const idxRef = { i: 0 };
    for (const [suffix, scaleMul, colorTint, lvDelta, role, statMul, lootAdds] of fam.variants) {
      const name = suffix === '' ? fam.name : suffix;
      const level = Math.max(1, fam.baseLevel + lvDelta);
      const color = tintColor(fam.color, colorTint);
      const baseLoot = [gold(fam.gold[0], fam.gold[1]), ...fam.loot, ...(lootAdds || [])];

      // keep the bare family key as the canonical id for its base variant
      const wasEmpty = suffix === '';
      const startCount = out.length;
      pushCreature(out, seenIds, fam, name, scaleMul, color, level, role, statMul, baseLoot, idxRef);
      if (wasEmpty) {
        // re-key the just-pushed base entry to the bare family key when free
        const justPushed = out[startCount];
        if (!seenIds.has(fam.key) || justPushed.id === fam.key) {
          seenIds.delete(justPushed.id);
          justPushed.id = fam.key;
          seenIds.add(fam.key);
        }
      }

      // optional tougher tiers expand entry count for richer families
      if (fam.tiers) {
        for (const [prefix, scaleAdd, tColor, tLvl, tMul, tLoot] of TIERS.slice(0, fam.tiers)) {
          // skip on tiny minions to avoid silly "Ancient Worm" noise
          if (role === 'minion' && prefix === 'Ancient') continue;
          const tName = `${prefix} ${name}`;
          pushCreature(
            out, seenIds, fam, tName,
            scaleMul + scaleAdd, tColor, level + tLvl, role,
            statMul * tMul, [...baseLoot, tLoot], idxRef,
          );
        }
      }
    }
  }
  return out;
}

export const CREATURES = buildCreatures();

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
