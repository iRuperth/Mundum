// Mundum themed zones — PURE DATA + cheap point lookups. No Three.js, no DOM.
//
// The world is divided into geographic ZONES laid out radially around the
// capital (Greenhollow at 0,0). Difficulty is GEOGRAPHIC, not tied to the
// player's level: a rat valley near the capital always holds level 1-6 rats, so
// a level-30 player must travel out to tougher zones to gain XP — exactly the
// Tibia feel the user asked for. Other cities sit inside mid/high zones so the
// creatures around them are stronger.
//
// Each zone is a disc (center + radius) with a FIXED creature pool (by family
// and/or explicit creature id), clamped to a level band, plus the supreme boss
// (only spawns near its lair), member caves, and camp anchors.
//
// Spawning samples zoneAt(x,z) at the creature's spawn point (combat.spawnNear),
// so the zone is evaluated where the creature actually appears.

import { CREATURES } from './data/creatures.js';

// Zones, ordered roughly by distance from the capital. Coordinates reuse the
// existing dungeon/city anchors (see dungeons.js, cities.js).
export const ZONES = [
  {
    id: 'rat-valley', name: { es: 'Valle de Ratas', en: 'Rat Valley' },
    center: { x: 90, z: 120 }, radius: 170, levelMin: 1, levelMax: 6,
    families: ['rat', 'worm'], ids: [],
    boss: 'rat-rat-king', bossNear: { x: 90, z: 120 }, bossRadius: 16,
    caveIds: ['ratcave'], camps: [], decor: 'none',
  },
  {
    id: 'spider-nest', name: { es: 'Nido de Arañas', en: 'Spider Nest' },
    center: { x: -260, z: -180 }, radius: 200, levelMin: 1, levelMax: 12,
    families: ['spider', 'bat'], ids: [],
    boss: 'spider-giant-spider', bossNear: { x: -260, z: -180 }, bossRadius: 18,
    caveIds: ['spidernest'], camps: [], decor: 'web',
  },
  {
    id: 'elf-forest', name: { es: 'Bosque Élfico', en: 'Elven Forest' },
    center: { x: -160, z: 360 }, radius: 200, levelMin: 6, levelMax: 22,
    families: ['elf', 'fairy'], ids: [],
    boss: 'elf-elf-arcanist', bossNear: { x: -160, z: 360 }, bossRadius: 16,
    caveIds: [], camps: [], decor: 'none',
  },
  {
    id: 'troll-territory', name: { es: 'Territorio Trol', en: 'Troll Territory' },
    center: { x: -540, z: 460 }, radius: 260, levelMin: 4, levelMax: 14,
    families: ['troll'], ids: ['spider-tarantula'],
    boss: 'troll-troll-champion', bossNear: { x: -540, z: 460 }, bossRadius: 18,
    // The user wants ~6 troll caves in this mega-zone (added in dungeons.js).
    caveIds: ['trollcave', 'trollcave2', 'trollcave3', 'trollcave4', 'trollcave5', 'trollcave6'],
    camps: [{ x: -480, z: 420 }, { x: -600, z: 500 }, { x: -560, z: 380 }], decor: 'camp',
  },
  {
    id: 'orc-territory', name: { es: 'Tierras Orco', en: 'Orc Territory' },
    // Adjacent to the trolls (rivals) but a separate disc.
    center: { x: 540, z: -260 }, radius: 240, levelMin: 8, levelMax: 40,
    families: ['orc', 'goblin'], ids: [],
    boss: 'orc-orc-warlord', bossNear: { x: 540, z: -260 }, bossRadius: 18,
    caveIds: ['orcfort'], camps: [{ x: 500, z: -300 }, { x: 580, z: -220 }], decor: 'camp',
  },
  {
    id: 'dwarf-mines', name: { es: 'Minas Enanas', en: 'Dwarf Mines' },
    center: { x: 300, z: -520 }, radius: 200, levelMin: 5, levelMax: 24,
    families: ['dwarf', 'kobold'], ids: [],
    boss: 'dwarf-dwarf-geomancer', bossNear: { x: 300, z: -520 }, bossRadius: 16,
    caveIds: [], camps: [], decor: 'none',
  },
  {
    id: 'minotaur-labyrinth', name: { es: 'Laberinto Minotauro', en: 'Minotaur Labyrinth' },
    center: { x: -420, z: -720 }, radius: 210, levelMin: 6, levelMax: 22,
    families: ['minotaur'], ids: [],
    boss: 'minotaur-minotaur-mage', bossNear: { x: -420, z: -720 }, bossRadius: 16,
    caveIds: [], camps: [{ x: -380, z: -680 }], decor: 'camp',
  },
  {
    id: 'cyclops-camp', name: { es: 'Campamento Cíclope', en: 'Cyclops Camp' },
    center: { x: 720, z: 160 }, radius: 180, levelMin: 18, levelMax: 50,
    families: ['cyclops', 'ogre'], ids: [],
    boss: null, bossNear: null, bossRadius: 0,
    caveIds: [], camps: [{ x: 700, z: 130 }], decor: 'camp',
  },
  {
    id: 'sunken-desert', name: { es: 'Desierto de Khelmun', en: 'Khelmun Desert' },
    // The desert is out EAST now (near Dragonreach at 1180,260). NOT named
    // Ankrahmun. Pyramids, not houses.
    center: { x: 1100, z: 260 }, radius: 300, levelMin: 6, levelMax: 34,
    families: ['scorpion'],
    ids: ['worm-larva', 'beetle-scarab', 'beetle-ancient-scarab', 'zombie-mummy', 'zombie-ancient-mummy'],
    boss: 'beetle-ancient-scarab', bossNear: { x: 1180, z: 260 }, bossRadius: 18,
    caveIds: [], camps: [{ x: 1040, z: 220 }, { x: 1160, z: 320 }], decor: 'pyramid',
  },
  {
    id: 'undead-crypt', name: { es: 'Cripta de los Muertos', en: 'Undead Crypt' },
    center: { x: 420, z: 620 }, radius: 220, levelMin: 5, levelMax: 36,
    families: ['skeleton', 'zombie', 'ghost', 'wraith'], ids: [],
    boss: 'skeleton-necromancer', bossNear: { x: 420, z: 620 }, bossRadius: 18,
    caveIds: ['undeadcrypt'], camps: [], decor: 'bones',
  },
  {
    id: 'dragon-mountains', name: { es: 'Montañas de Dragones', en: 'Dragon Mountains' },
    center: { x: 200, z: -760 }, radius: 300, levelMin: 16, levelMax: 72,
    families: ['dragon', 'wyvern'], ids: ['lizardman'],
    boss: 'dragon-dragon-lord', bossNear: { x: 200, z: -760 }, bossRadius: 22,
    caveIds: ['dragonlair'], camps: [], decor: 'scorched',
  },
  {
    id: 'hydra-swamp', name: { es: 'Pantano de Hidras', en: 'Hydra Swamp' },
    center: { x: -300, z: 900 }, radius: 200, levelMin: 24, levelMax: 76,
    families: ['hydra'], ids: ['serpent-sea-serpent'],
    boss: 'hydra-ancient-hydra', bossNear: { x: -300, z: 900 }, bossRadius: 20,
    caveIds: [], camps: [], decor: 'none',
  },
  {
    id: 'demon-abyss', name: { es: 'Abismo Demoníaco', en: 'Demon Abyss' },
    center: { x: -780, z: -680 }, radius: 260, levelMin: 18, levelMax: 110,
    families: ['demon', 'imp', 'cultist'], ids: [],
    boss: 'demon-demon-lord', bossNear: { x: -780, z: -680 }, bossRadius: 22,
    caveIds: ['demonabyss'], camps: [], decor: 'scorched',
  },
];

// Build the per-zone concrete creature list once (deterministic, at load).
// Each zone gets: { ...zone, pool: [creature], bossDef }. The pool is every
// creature whose family is listed OR whose id is listed, clamped to the band;
// the supreme boss is held out of the open pool (it only spawns near its lair).
const BY_ID = new Map(CREATURES.map((c) => [c.id, c]));

function buildZonePools() {
  for (const z of ZONES) {
    const famSet = new Set(z.families || []);
    const idSet = new Set(z.ids || []);
    z.pool = CREATURES.filter((c) => {
      if (c.id === z.boss) return false;            // boss handled separately
      const inZone = famSet.has(c.family) || idSet.has(c.id);
      if (!inZone) return false;
      return c.level >= z.levelMin && c.level <= z.levelMax;
    });
    z.bossDef = z.boss ? (BY_ID.get(z.boss) || null) : null;
  }
}
buildZonePools();

// The zone a world point falls in. When discs overlap, the nearest center whose
// radius contains the point wins (inner zones beat outer near their core).
export function zoneAt(x, z) {
  let best = null, bestD = Infinity;
  for (const zone of ZONES) {
    const dx = x - zone.center.x, dz = z - zone.center.z;
    const d = Math.hypot(dx, dz);
    if (d <= zone.radius && d < bestD) { best = zone; bestD = d; }
  }
  return best;
}

// The creatures eligible to spawn at a point: the zone's clamped pool, plus its
// supreme boss only when the point is within bossRadius of the boss lair.
// Returns null when the point is in no zone (caller uses a wilderness fallback).
export function zonePoolAt(x, z) {
  const zone = zoneAt(x, z);
  if (!zone) return null;
  let list = zone.pool;
  if (zone.bossDef && zone.bossNear) {
    const d = Math.hypot(x - zone.bossNear.x, z - zone.bossNear.z);
    if (d <= zone.bossRadius) list = [...list, zone.bossDef];
  }
  return list.length ? list : null;
}

// Gentle difficulty for the open wilderness (points in no zone): scales with
// distance from the capital, NOT the player's level.
export function wildernessLevelAt(x, z) {
  return Math.max(1, Math.round(2 + Math.hypot(x, z) / 120));
}
