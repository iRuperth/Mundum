// Creature TROPHIES / remains — a unique drop per family that a "remains buyer"
// NPC in every city buys for small money. Players farm them for a steady income
// loop. Value scales with the family's difficulty: a rat tail is worth coppers,
// a demon horn a small fortune. PURE DATA — no Three.js, no DOM.
//
// Each trophy: { id, name {es,en}, family, value (gold the buyer pays), color,
//   icon }. Resolved by inventory.resolveItem and stackable like other junk.

// Per-family trophy: [familyKey, esName, enName, value, colorHex, icon].
// Value bands roughly track where the family sits on the level curve so trophies
// stay a gentle, always-available income — never a shortcut to real gear money.
const T = [
  // vermin & critters (coppers)
  ['worm',     'Resto de Gusano',     'Worm Guts',        2,  0xcc8888, '🪱'],
  ['rat',      'Cola de Rata',        'Rat Tail',         3,  0x8a7a6a, '🐀'],
  ['bat',      'Ala de Murciélago',   'Bat Wing',         5,  0x443344, '🦇'],
  ['snake',    'Piel de Serpiente',   'Snake Skin',       6,  0x6aaa4a, '🐍'],
  ['spider',   'Pata de Araña',       'Spider Leg',       6,  0x333333, '🕷️'],
  ['scorpion', 'Aguijón de Escorpión','Scorpion Sting',   9,  0x886622, '🦂'],
  ['slime',    'Gelatina',            'Slime Jelly',      4,  0x55cc99, '🟢'],
  ['frog',     'Pata de Rana',        'Frog Leg',         4,  0x6abe6a, '🐸'],
  ['crab',     'Pinza de Cangrejo',   'Crab Claw',        7,  0xcc6644, '🦀'],
  ['beetle',   'Caparazón',           'Chitin Shell',     8,  0x445544, '🪲'],
  ['wasp',     'Aguijón de Avispa',   'Wasp Sting',       6,  0xddaa22, '🐝'],
  // beasts
  ['boar',     'Colmillo de Jabalí',  'Boar Tusk',        12, 0x6a5040, '🐗'],
  ['wolf',     'Colmillo de Lobo',    'Wolf Fang',        14, 0x888888, '🐺'],
  ['bear',     'Garra de Oso',        'Bear Claw',        20, 0x7a5a3a, '🐻'],
  ['tiger',    'Colmillo de Tigre',   'Tiger Fang',       28, 0xd98a2b, '🐯'],
  ['deer',     'Asta de Ciervo',      'Deer Antler',      10, 0xb07a4a, '🦌'],
  ['chicken',  'Pluma',               'Feather',          1,  0xeeddcc, '🪶'],
  ['sheep',    'Lana',                'Wool',             3,  0xf0f0e8, '🐑'],
  // humanoids
  ['goblin',   'Oreja de Goblin',     'Goblin Ear',       10, 0x6aaa55, '👂'],
  ['orc',      'Diente de Orco',      'Orc Tooth',        16, 0x6a8a4a, '🦷'],
  ['troll',    'Pelo de Troll',       'Troll Hair',       14, 0x6a7a5a, '🧶'],
  ['ogre',     'Maza de Ogro',        'Ogre Club Splinter',28,0x9a8a6a, '🪵'],
  ['kobold',   'Garra de Kobold',     'Kobold Claw',      12, 0x99794a, '🐾'],
  ['dwarf',    'Barba de Enano',      'Dwarf Beard Braid',22, 0xaa7755, '🧔'],
  ['elf',      'Mechón Élfico',       'Elven Lock',       24, 0xccddaa, '🧝'],
  ['lizardman','Escama de Lagarto',   'Lizard Scale',     26, 0x559966, '🦎'],
  ['minotaur', 'Cuerno de Minotauro', 'Minotaur Horn',    32, 0x7a4a2a, '🐃'],
  ['cyclops',  'Ojo de Cíclope',      'Cyclops Eye',      45, 0x9a7a5a, '👁️'],
  // undead
  ['skeleton', 'Hueso',               'Bone',             10, 0xddddcc, '🦴'],
  ['zombie',   'Carne Podrida',       'Rotten Flesh',     12, 0x6a8a5a, '🧟'],
  ['ghost',    'Ectoplasma',          'Ectoplasm',        28, 0xccddee, '👻'],
  ['wraith',   'Jirón Espectral',     'Spectral Shroud',  40, 0x445566, '🌫️'],
  ['vampire',  'Colmillo de Vampiro', 'Vampire Fang',     55, 0x661122, '🧛'],
  ['mimic',    'Cerradura de Mímico', 'Mimic Lock',       40, 0x8a5a2a, '🔒'],
  // demonic / constructs / elementals
  ['imp',      'Cuerno de Diablillo', 'Imp Horn',         30, 0xcc4433, '😈'],
  ['demon',    'Cuerno de Demonio',   'Demon Horn',       120,0xaa1111, '😈'],
  ['gargoyle', 'Ala de Gárgola',      'Gargoyle Wing',    48, 0x556655, '🗿'],
  ['golem',    'Fragmento de Núcleo', 'Core Fragment',    50, 0x888888, '🪨'],
  ['elemental','Esencia Elemental',   'Elemental Essence', 46, 0xdd5522, '🔥'],
  ['treant',   'Corteza Viva',        'Living Bark',      44, 0x5a7a3a, '🌳'],
  ['mushroom', 'Espora',              'Spore Cap',        12, 0xcc5566, '🍄'],
  ['mandrake', 'Raíz de Mandrágora',  'Mandrake Root',    20, 0x99aa55, '🌱'],
  ['fairy',    'Polvo de Hada',       'Fairy Dust',       26, 0xaaffcc, '✨'],
  // dragons & big beasts
  ['dragon',   'Garra de Dragón',     'Dragon Claw',      90, 0xcc3322, '🐉'],
  ['crystal_dragon','Escama Cristalina','Crystal Dragon Scale',200,0xbfe8ff,'💎'],
  ['wyvern',   'Colmillo de Wyvern',  'Wyvern Fang',      80, 0x556644, '🦅'],
  ['hydra',    'Escama de Hidra',     'Hydra Scale',      100,0x447766, '🐲'],
  ['serpent',  'Escama de Leviatán',  'Leviathan Scale',  110,0x335577, '🌊'],
  ['harpy',    'Pluma de Arpía',      'Harpy Feather',    34, 0xbb9966, '🪽'],
  ['shark',    'Diente de Tiburón',   'Shark Tooth',      40, 0x556677, '🦈'],
  ['jellyfish','Tentáculo',           'Jelly Tentacle',   14, 0xcc88dd, '🪼'],
  ['turtle',   'Caparazón de Tortuga','Turtle Shell',     18, 0x447755, '🐢'],
  // human enemies
  ['cultist',  'Tomo Oscuro',         'Dark Tome Page',   30, 0x553366, '📜'],
  ['knight',   'Insignia Caída',      'Fallen Crest',     50, 0x99aabb, '🛡️'],
  ['mage',     'Cristal de Maná',     'Mana Crystal',     44, 0x4455aa, '🔮'],
];

export const TROPHIES = T.map(([family, es, en, value, color, icon]) => ({
  id: `trophy_${family}`,
  name: { es, en },
  family,
  value,
  color,
  icon,
  kind: 'trophy',
  weight: 1,
  stackable: true,
}));

const BY_FAMILY = new Map(TROPHIES.map((t) => [t.family, t]));
const BY_ID = new Map(TROPHIES.map((t) => [t.id, t]));

export function trophyForFamily(family) { return BY_FAMILY.get(family) || null; }
export function getTrophy(id) { return BY_ID.get(id) || null; }
export function isTrophyId(id) { return BY_ID.has(id); }

// A stackable inventory instance for a dropped/looted trophy.
export function instanceFromTrophy(t, lang = 'es') {
  return {
    baseId: t.id, name: (t.name && t.name[lang]) || t.name.es || t.id,
    type: 'trophy', kind: 'trophy', family: t.family,
    value: t.value, weight: t.weight || 1, color: t.color, icon: t.icon,
    stackable: true, count: 1, rarity: 'normal',
  };
}
