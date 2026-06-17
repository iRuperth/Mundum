// Creature MATERIALS / crafting drops — the "extra" loot the variants were
// authored with (silk, rat tails, hides, scales, essences, fangs…). These used
// to be phantom ids: they appeared in loot tables but had no item, so they never
// dropped. Now each is a real, stackable, sellable item, so killing a spider for
// its silk actually puts silk in your bag and the buyer pays for it.
//
// To avoid hand-writing 100+ entries, materials are GENERATED from a compact
// table: an id maps to {es,en} names, an icon, and a value tier. A creature's
// loot entry keeps its authored id and drop chance; resolveItem() turns it into
// the matching material instance. PURE DATA — no Three.js, no DOM.

// [id, es, en, value, icon] — value is the gold a vendor pays (sellMult applies).
// Roughly: vermin scraps = coppers, beast parts = small, dragon/demon parts =
// a tidy sum. Kept modest so materials are a steady grind income, not a jackpot.
const M = [
  // vermin & critter bits
  ['silk',          'Seda',                 'Silk',                 6,   0xeeeae0, '🧵'],
  ['spider-leg',    'Quelícero de Araña',   'Spider Fang',          5,   0x333333, '🕷️'],
  ['rat-tail',      'Cola de Rata',         'Rat Tail',             3,   0x8a7a6a, '🐀'],
  ['rat-crown',     'Corona de Rata',       'Rat Crown',            60,  0xd9b34a, '👑'],
  ['bat-wing',      'Ala de Murciélago',    'Bat Wing',            5,   0x443344, '🦇'],
  ['snake-skin',    'Piel de Serpiente',    'Snake Skin',           7,   0x6aaa4a, '🐍'],
  ['scorpion-tail', 'Aguijón de Escorpión', 'Scorpion Tail',        10,  0x886622, '🦂'],
  ['wasp-sting',    'Aguijón de Avispa',    'Wasp Sting',           7,   0xddaa22, '🐝'],
  ['crab-claw',     'Pinza de Cangrejo',    'Crab Claw',            8,   0xcc6644, '🦀'],
  ['chitin',        'Quitina',              'Chitin',               9,   0x445544, '🪲'],
  ['shell',         'Caparazón',            'Shell',                10,  0x778866, '🐚'],
  ['fin',           'Aleta',                'Fin',                  9,   0x4488aa, '🐟'],
  ['jelly',         'Gelatina',             'Jelly',                5,   0x55cc99, '🟢'],
  ['slime-jelly',   'Gelatina Viscosa',     'Slime Jelly',          6,   0x55cc99, '🟩'],
  ['slime-crown',   'Corona de Limo',       'Slime Crown',          55,  0x33aa77, '👑'],
  ['egg',           'Huevo',                'Egg',                  3,   0xf0e8d0, '🥚'],
  ['feather',       'Pluma',                'Feather',              2,   0xeeddcc, '🪶'],
  ['wool',          'Lana',                 'Wool',                 4,   0xf0f0e8, '🐑'],
  ['cheese',        'Queso',                'Cheese',               3,   0xe8c860, '🧀'],
  ['honey',         'Miel',                 'Honey',                8,   0xeaa92a, '🍯'],
  ['royal-jelly',   'Jalea Real',           'Royal Jelly',          40,  0xf0c040, '🍯'],
  // beast parts
  ['hide',          'Cuero',                'Hide',                 8,   0x9a6a3a, '🟫'],
  ['wolf-pelt',     'Piel de Lobo',         'Wolf Pelt',            16,  0x888888, '🐺'],
  ['bear-pelt',     'Piel de Oso',          'Bear Pelt',            24,  0x7a5a3a, '🐻'],
  ['alpha-pelt',    'Piel Alfa',            'Alpha Pelt',           60,  0x5a4a3a, '🐺'],
  ['antler',        'Asta',                 'Antler',               12,  0xb07a4a, '🦌'],
  ['great-antler',  'Gran Asta',            'Great Antler',         34,  0xa06a3a, '🦌'],
  ['tusk',          'Colmillo',             'Tusk',                 14,  0xe8e0c0, '🦷'],
  ['great-tusk',    'Gran Colmillo',        'Great Tusk',           40,  0xe8e0c0, '🦷'],
  ['fang',          'Colmillo',             'Fang',                 12,  0xddddcc, '🦷'],
  ['claw',          'Garra',                'Claw',                 14,  0x9a8a7a, '🐾'],
  ['great-claw',    'Gran Garra',           'Great Claw',           40,  0x8a7a6a, '🐾'],
  ['talon',         'Garra Afilada',        'Talon',                22,  0x8a7a5a, '🦅'],
  ['horn',          'Cuerno',               'Horn',                 16,  0x9a8a6a, '📯'],
  // humanoid bits
  ['ogre-tooth',    'Diente de Ogro',       'Ogre Tooth',           28,  0x9a8a6a, '🦷'],
  ['troll-hide',    'Piel de Troll',        'Troll Hide',           16,  0x6a7a5a, '🟫'],
  ['cyclops-eye',   'Ojo de Cíclope',       'Cyclops Eye',          46,  0x9a7a5a, '👁️'],
  ['goblin-crown',  'Corona Goblin',        'Goblin Crown',         70,  0xd9b34a, '👑'],
  // undead / spectral
  ['bone',          'Hueso',                'Bone',                 10,  0xddddcc, '🦴'],
  ['rotten-flesh',  'Carne Podrida',        'Rotten Flesh',         12,  0x6a8a5a, '🧟'],
  ['ectoplasm',     'Ectoplasma',           'Ectoplasm',            28,  0xccddee, '👻'],
  ['vampire-fang',  'Colmillo de Vampiro',  'Vampire Fang',         55,  0x661122, '🧛'],
  ['wailing-shroud','Sudario Lamentoso',    'Wailing Shroud',       60,  0x445566, '🌫️'],
  // demonic / elemental / construct
  ['imp-horn',      'Cuerno de Diablillo',  'Imp Horn',             30,  0xcc4433, '😈'],
  ['demon-horn',    'Cuerno de Demonio',    'Demon Horn',           120, 0xaa1111, '😈'],
  ['gargoyle-wing', 'Ala de Gárgola',       'Gargoyle Wing',        48,  0x556655, '🗿'],
  ['core-fragment', 'Fragmento de Núcleo',  'Core Fragment',        50,  0x888888, '🪨'],
  ['fairy-dust',    'Polvo de Hada',        'Fairy Dust',           26,  0xaaffcc, '✨'],
  ['hellfire-shard','Esquirla Infernal',    'Hellfire Shard',       90,  0xff4422, '🔥'],
  ['magma-core',    'Núcleo de Magma',      'Magma Core',           80,  0xff6622, '🌋'],
  // elemental essences
  ['essence',       'Esencia',              'Essence',              20,  0xcfa0ff, '✨'],
  ['fire-essence',  'Esencia de Fuego',     'Fire Essence',         24,  0xff5522, '🔥'],
  ['water-essence', 'Esencia de Agua',      'Water Essence',        24,  0x3399ff, '💧'],
  ['earth-essence', 'Esencia de Tierra',    'Earth Essence',        24,  0x9a7a3a, '🪨'],
  ['plant-essence', 'Esencia de Planta',    'Plant Essence',        24,  0x66cc44, '🌿'],
  ['storm-essence', 'Esencia de Tormenta',  'Storm Essence',        30,  0x88ccff, '⚡'],
  // nature
  ['living-bark',   'Corteza Viva',         'Living Bark',          44,  0x5a7a3a, '🌳'],
  ['mandrake-root', 'Raíz de Mandrágora',   'Mandrake Root',        20,  0x99aa55, '🌱'],
  ['mushroom-cap',  'Sombrero de Hongo',    'Mushroom Cap',         12,  0xcc5566, '🍄'],
  ['spore-dust',    'Polvo de Esporas',     'Spore Dust',           14,  0xcc99dd, '🍄'],
  ['heart-of-the-forest', 'Corazón del Bosque', 'Heart of the Forest', 150, 0x4caf50, '💚'],
  // dragon & big-beast parts
  ['dragon-scale',  'Escama de Dragón',     'Dragon Scale',         90,  0xcc3322, '🐉'],
  ['dragon-tooth',  'Diente de Dragón',     'Dragon Tooth',         85,  0xdd4433, '🦷'],
  ['wyvern-fang',   'Colmillo de Wyvern',   'Wyvern Fang',          80,  0x556644, '🦅'],
  ['wyvern-scale',  'Escama de Wyvern',     'Wyvern Scale',         75,  0x5a6a44, '🐲'],
  ['hydra-scale',   'Escama de Hidra',      'Hydra Scale',          100, 0x447766, '🐲'],
  ['hydra-fang',    'Colmillo de Hidra',    'Hydra Fang',           95,  0x336655, '🦷'],
  ['serpent-fang',  'Colmillo de Serpiente','Serpent Fang',         70,  0x335577, '🐍'],
  ['leviathan-scale','Escama de Leviatán',  'Leviathan Scale',      110, 0x335577, '🌊'],
  ['shark-tooth',   'Diente de Tiburón',    'Shark Tooth',          40,  0x556677, '🦈'],
  ['frost-fang',    'Colmillo Helado',      'Frost Fang',           60,  0xbfe8ff, '❄️'],
  ['frost-shard',   'Esquirla Helada',      'Frost Shard',          50,  0xbfe8ff, '❄️'],
  // big-cat parts (tiger)
  ['tiger-pelt',    'Piel de Tigre',        'Tiger Pelt',           36,  0xd98a2b, '🐯'],
  ['tiger-fang',    'Colmillo de Tigre',    'Tiger Fang',           30,  0xfffaf0, '🦷'],
  // the supreme ice-dragon's crystalline scale (level-100 mount quest material)
  ['crystal-scale', 'Escama Cristalina',    'Crystal Scale',        180, 0xbfe8ff, '💎'],
  // alchemy / vials
  ['poison-vial',   'Vial de Veneno',       'Poison Vial',          12,  0x88cc44, '🧪'],
  ['blood-vial',    'Vial de Sangre',       'Blood Vial',           16,  0xaa1122, '🧪'],
  ['venom-gland',   'Glándula de Veneno',   'Venom Gland',          30,  0x66aa33, '🧪'],
  ['antidote',      'Antídoto',             'Antidote',             18,  0x66cc88, '🧪'],
  // crystals / gems / ore (raw, not the equippable gems)
  ['crystal',       'Cristal',              'Crystal',              26,  0xbfe8ff, '🔷'],
  ['iron-ore',      'Mineral de Hierro',    'Iron Ore',             10,  0x778088, '🪨'],
  ['stone',         'Piedra',               'Stone',                2,   0x888880, '🪨'],
  ['wood',          'Madera',               'Wood',                 3,   0x8a5a2a, '🪵'],
  ['soul-gem',      'Gema de Alma',         'Soul Gem',             200, 0x9a6cff, '💠'],
  ['treasure-key',  'Llave del Tesoro',     'Treasure Key',         50,  0xd9b34a, '🗝️'],
  // scraps & tomes
  ['rags',          'Harapos',              'Rags',                 2,   0x9a8a7a, '🧷'],
  ['dark-tome',     'Tomo Oscuro',          'Dark Tome',            34,  0x553366, '📕'],

  // --- QUEST DUSTS: ground from slain foes, demanded by keymaster NPCs. These
  // drop from their themed family (seeded in creatures.js) and are spent to earn
  // a quest KEY. Worth a little gold so they're never pure dead weight.
  ['demon-dust',    'Polvo de Demonio',     'Demon Dust',           18,  0xaa1111, '🌋'],
  ['vampire-dust',  'Polvo de Vampiro',     'Vampire Dust',         16,  0x661122, '🩸'],
  ['dragon-dust',   'Polvo de Dragón',      'Dragon Dust',          20,  0xcc3322, '✨'],
  ['undead-dust',   'Polvo de los Muertos', 'Undead Dust',          12,  0xccddee, '💀'],
  ['frost-dust',    'Polvo Helado',         'Frost Dust',           14,  0xbfe8ff, '❄️'],

  // more dusts for the wider quest web (mid-tier families)
  ['orc-dust',      'Polvo de Orco',        'Orc Dust',             10,  0x6a8a4a, '🟢'],
  ['troll-dust',    'Polvo de Troll',       'Troll Dust',           9,   0x6a7a5a, '🟫'],
  ['desert-dust',   'Polvo del Desierto',   'Desert Dust',          11,  0xe8c87a, '🏜️'],
  ['ele-dust',      'Polvo Elemental',      'Elemental Dust',       16,  0xddddff, '🌀'],
  ['beast-dust',    'Polvo de Bestia',      'Beast Dust',           10,  0x9a6a3a, '🐾'],
  ['ghoul-dust',    'Polvo de Necrópolis',  'Necropolis Dust',      14,  0xb8a878, '⚱️'],

  // --- QUEST KEYS: distinctive, imaginative entry tokens. NOT a generic key —
  // each is a themed object you barter or brandish to pass a guardian/gate. The
  // quest that grants the key is the "puzzle"; the legendary quest needs it held.
  ['demon-bone',       'Hueso de Demonio',      'Demon Bone',         0, 0xe8e0d0, '🦴'],
  ['blood-signet',     'Sello de Sangre',       'Blood Signet',       0, 0x661122, '💍'],
  ['dragon-seal',      'Sello del Dragón',      'Dragon Seal',        0, 0xcc3322, '🐉'],
  ['grave-lantern',    'Linterna de Tumba',     'Grave Lantern',      0, 0x88ffaa, '🏮'],
  ['abyssal-sigil',    'Sigilo Abisal',         'Abyssal Sigil',      0, 0x4a0030, '🔯'],
  ['frost-heart',      'Corazón de Escarcha',   'Frost Heart',        0, 0xbfe8ff, '💠'],
  ['warden-acorn',     'Bellota del Guardián',  "Warden's Acorn",     0, 0x6ab04c, '🌰'],
  ['orc-queen-token',  'Pendiente de la Reina Orca', "Orc Queen's Pendant", 0, 0xd9b34a, '📿'],
  ['phoenix-feather',  'Pluma de Fénix',        'Phoenix Feather',    0, 0xff9933, '🪶'],
  ['tide-pearl',       'Perla de la Marea',     'Tide Pearl',         0, 0x4fe6e0, '🫧'],
  ['storm-totem',      'Tótem de Tormenta',     'Storm Totem',        0, 0x88ccff, '🗿'],
  ['sun-scarab',       'Escarabajo Solar',      'Sun Scarab',         0, 0xffd24a, '🪲'],
  ['cursed-coin',      'Moneda Maldita',        'Cursed Coin',        0, 0x9a6cff, '🪙'],
  ['ancient-cog',      'Engranaje Ancestral',   'Ancient Cog',        0, 0x888888, '⚙️'],
  ['giant-relic',      'Reliquia del Gigante',  "Giant's Relic",      0, 0x8a7a5a, '🗿'],
];

// Loot ids that some variants list but that map to gear/handled items elsewhere.
// They are intentionally NOT materials; resolveItem normalizes their dashes to
// resolve them to the real equipment instead, so we just skip them here.
const SKIP = new Set([
  'gold-coins', 'scale', // 'scale' alone is ambiguous; the scale_* gear covers it
]);

export const MATERIALS = M
  .filter(([id]) => !SKIP.has(id))
  .map(([id, es, en, value, color, icon]) => ({
    id, name: { es, en }, value, color, icon, kind: 'material', weight: 1, stackable: true,
  }));

// Look up by the AUTHORED id (with dashes) AND by a dash→underscore normalized
// form, so a loot table can write either 'rat-tail' or 'rat_tail'.
const BY_ID = new Map();
for (const m of MATERIALS) {
  BY_ID.set(m.id, m);
  BY_ID.set(m.id.replace(/-/g, '_'), m);
}
export function getMaterial(id) {
  if (!id) return null;
  return BY_ID.get(id) || BY_ID.get(String(id).replace(/_/g, '-')) || null;
}
export function isMaterialId(id) { return !!getMaterial(id); }

// A stackable inventory instance for a dropped/looted material.
export function instanceFromMaterial(m, lang = 'es') {
  return {
    baseId: m.id, name: (m.name && (m.name[lang] || m.name.es)) || m.id,
    type: 'material', kind: 'material',
    value: m.value, weight: m.weight || 1, color: m.color, icon: m.icon,
    stackable: true, count: 1, rarity: 'normal',
  };
}

// Title-case a loot id ('death-scythe' -> 'Death Scythe') for a fallback name.
function titleize(id) {
  return String(id).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Last-resort material for any loot id we don't have a real item OR a curated
// material for (e.g. unfinished legendary gear names like 'death-scythe'). Rather
// than vanish, it drops as a generic sellable "material" so every authored loot
// entry yields SOMETHING to grab and sell. `value` scales with the dropping
// creature's level so deep-foe scraps are worth more.
export function genericMaterial(id, level = 1, lang = 'es') {
  const name = titleize(id);
  const value = Math.max(5, Math.round(8 + (level || 1) * 2.5));
  return {
    baseId: id, name, type: 'material', kind: 'material',
    value, weight: 1, color: 0x9a8a6a, icon: '📦',
    stackable: true, count: 1, rarity: 'normal',
  };
}
