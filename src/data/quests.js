// Mundum quest database — PURE DATA. No Three.js, no DOM.
// Tibia-style "clear the cave" jobs plus MapleStory-style report-back chains.
// Quests reference real creature families, item ids, city ids and npc ids.
// Difficulty climbs with minLevel so chains pull a player through the world.

// Quest shape:
// { id, title:{es,en}, desc:{es,en}, giverNpc, city, minLevel,
//   objectives:[{ type, target, count, desc:{es,en} }],
//   rewards:{ gold, exp, items:[itemId] }, next, repeatable, dungeon }
// objective.type: 'kill' (target=creature family) | 'collect' (target=item id)
//                 | 'reach' (target=city or dungeon id) | 'talk' (target=npc id)

export const QUESTS = [
  // Rivertown starter chain (MapleStory style: rats, then bigger rats).
  {
    id: 'rivertown_rats_1',
    title: { es: 'Plaga de Ratas', en: 'Rat Problem' },
    desc: {
      es: 'El granero de Rivertown esta lleno de ratas. Acaba con unas cuantas.',
      en: 'The Rivertown barn is overrun with rats. Thin them out.',
    },
    giverNpc: 'rivertown_merchant',
    city: 'rivertown',
    minLevel: 1,
    objectives: [
      { type: 'kill', target: 'rat', count: 8, desc: { es: 'Mata 8 ratas', en: 'Kill 8 rats' } },
    ],
    rewards: { gold: 20, exp: 40, items: ['leather_boots'] },
    next: 'rivertown_rats_2',
    repeatable: false,
    dungeon: null,
  },
  {
    id: 'rivertown_rats_2',
    title: { es: 'Ratas Mayores', en: 'Bigger Rats' },
    desc: {
      es: 'Volviste? Las ratas grandes salen del sotano. Limpialo.',
      en: 'Back again? The big rats come from the cellar. Clear it.',
    },
    giverNpc: 'rivertown_merchant',
    city: 'rivertown',
    minLevel: 3,
    objectives: [
      { type: 'reach', target: 'ratcave', count: 1, desc: { es: 'Entra al sotano', en: 'Enter the cellar' } },
      { type: 'kill', target: 'rat', count: 12, desc: { es: 'Mata 12 ratas', en: 'Kill 12 rats' } },
      { type: 'talk', target: 'rivertown_merchant', count: 1, desc: { es: 'Informa al granjero', en: 'Report to the farmer' } },
    ],
    rewards: { gold: 60, exp: 120, items: ['copper_sword'] },
    next: 'rivertown_worms',
    repeatable: false,
    dungeon: 'ratcave',
  },
  {
    id: 'rivertown_worms',
    title: { es: 'Gusanos en el Trigo', en: 'Worms in the Wheat' },
    desc: {
      es: 'Los gusanos arruinan la cosecha. Aplastalos.',
      en: 'Worms are ruining the harvest. Squash them.',
    },
    giverNpc: 'rivertown_merchant',
    city: 'rivertown',
    minLevel: 2,
    objectives: [
      { type: 'kill', target: 'worm', count: 10, desc: { es: 'Mata 10 gusanos', en: 'Kill 10 worms' } },
    ],
    rewards: { gold: 30, exp: 60, items: [] },
    next: null,
    repeatable: true,
    dungeon: null,
  },

  // Rivertown elder chain: tutorial talk -> chickens -> bandit goblins.
  {
    id: 'rivertown_welcome',
    title: { es: 'Bienvenido a Rivertown', en: 'Welcome to Rivertown' },
    desc: {
      es: 'Habla con el anciano para conocer la ciudad.',
      en: 'Speak with the elder to learn about the town.',
    },
    giverNpc: 'rivertown_elder',
    city: 'rivertown',
    minLevel: 1,
    objectives: [
      { type: 'talk', target: 'rivertown_elder', count: 1, desc: { es: 'Habla con el anciano', en: 'Talk to the elder' } },
    ],
    rewards: { gold: 10, exp: 20, items: ['leather_helmet'] },
    next: 'rivertown_chickens',
    repeatable: false,
    dungeon: null,
  },
  {
    id: 'rivertown_chickens',
    title: { es: 'Gallinas Perdidas', en: 'Loose Chickens' },
    desc: {
      es: 'Las gallinas escaparon al campo. Reune plumas para probar que las cazaste.',
      en: 'Chickens fled to the fields. Bring feathers as proof you caught them.',
    },
    giverNpc: 'rivertown_elder',
    city: 'rivertown',
    minLevel: 2,
    objectives: [
      { type: 'kill', target: 'chicken', count: 6, desc: { es: 'Caza 6 gallinas', en: 'Catch 6 chickens' } },
    ],
    rewards: { gold: 25, exp: 50, items: ['copper_amulet'] },
    next: 'rivertown_goblins',
    repeatable: false,
    dungeon: null,
  },
  {
    id: 'rivertown_goblins',
    title: { es: 'Bandidos Goblin', en: 'Goblin Bandits' },
    desc: {
      es: 'Goblins asaltan los caminos. Despejalos antes de que lleguen al pueblo.',
      en: 'Goblins raid the roads. Drive them off before they reach town.',
    },
    giverNpc: 'rivertown_elder',
    city: 'rivertown',
    minLevel: 5,
    objectives: [
      { type: 'kill', target: 'goblin', count: 10, desc: { es: 'Mata 10 goblins', en: 'Kill 10 goblins' } },
    ],
    rewards: { gold: 90, exp: 200, items: ['wooden_shield'] },
    next: null,
    repeatable: false,
    dungeon: null,
  },

  // Oakvale hunter chain: forest culling, classic Tibia cave clear.
  {
    id: 'oakvale_boars',
    title: { es: 'Jabalies Salvajes', en: 'Wild Boars' },
    desc: {
      es: 'Los jabalies pisotean los huertos de Oakvale.',
      en: 'Boars trample the Oakvale orchards.',
    },
    giverNpc: 'oakvale_hunter',
    city: 'oakvale',
    minLevel: 4,
    objectives: [
      { type: 'kill', target: 'boar', count: 8, desc: { es: 'Mata 8 jabalies', en: 'Kill 8 boars' } },
    ],
    rewards: { gold: 70, exp: 160, items: ['hunter_bow'] },
    next: 'oakvale_wolves',
    repeatable: false,
    dungeon: null,
  },
  {
    id: 'oakvale_wolves',
    title: { es: 'La Manada', en: 'The Pack' },
    desc: {
      es: 'Los lobos siguen a los jabalies. Adelgaza la manada.',
      en: 'Wolves trail the boars. Thin the pack.',
    },
    giverNpc: 'oakvale_hunter',
    city: 'oakvale',
    minLevel: 7,
    objectives: [
      { type: 'kill', target: 'wolf', count: 12, desc: { es: 'Mata 12 lobos', en: 'Kill 12 wolves' } },
      { type: 'talk', target: 'oakvale_hunter', count: 1, desc: { es: 'Informa al cazador', en: 'Report to the hunter' } },
    ],
    rewards: { gold: 130, exp: 320, items: ['leather_armor'] },
    next: 'oakvale_spider_cave',
    repeatable: false,
    dungeon: null,
  },
  {
    id: 'oakvale_spider_cave',
    title: { es: 'La Cueva de Arañas', en: 'The Spider Cave' },
    desc: {
      es: 'Una cueva infestada bloquea la senda del bosque. Despejala.',
      en: 'An infested cave blocks the forest trail. Clear it out.',
    },
    giverNpc: 'oakvale_hunter',
    city: 'oakvale',
    minLevel: 9,
    objectives: [
      { type: 'reach', target: 'spidernest', count: 1, desc: { es: 'Entra a la cueva', en: 'Enter the cave' } },
      { type: 'kill', target: 'spider', count: 15, desc: { es: 'Mata 15 arañas', en: 'Kill 15 spiders' } },
    ],
    rewards: { gold: 220, exp: 600, items: ['iron_sword'] },
    next: null,
    repeatable: false,
    dungeon: 'spidernest',
  },

  // Oakvale standalone board jobs.
  {
    id: 'oakvale_deer_hunt',
    title: { es: 'Carne para el Invierno', en: 'Meat for Winter' },
    desc: {
      es: 'El tablon pide cazadores de ciervos para abastecer la despensa.',
      en: 'The board asks for deer hunters to stock the larder.',
    },
    giverNpc: null,
    city: 'oakvale',
    minLevel: 5,
    objectives: [
      { type: 'kill', target: 'deer', count: 10, desc: { es: 'Caza 10 ciervos', en: 'Hunt 10 deer' } },
    ],
    rewards: { gold: 80, exp: 180, items: [] },
    next: null,
    repeatable: true,
    dungeon: null,
  },
  {
    id: 'oakvale_treant_grove',
    title: { es: 'El Bosque Furioso', en: 'The Angry Grove' },
    desc: {
      es: 'Los treants despertaron. Calmalos a la fuerza.',
      en: 'The treants have woken. Calm them by force.',
    },
    giverNpc: 'oakvale_forager',
    city: 'oakvale',
    minLevel: 14,
    objectives: [
      { type: 'kill', target: 'treant', count: 6, desc: { es: 'Mata 6 treants', en: 'Kill 6 treants' } },
      { type: 'kill', target: 'mandrake', count: 8, desc: { es: 'Mata 8 mandragoras', en: 'Kill 8 mandrakes' } },
    ],
    rewards: { gold: 300, exp: 850, items: ['plant_sword', 'leather_legs'] },
    next: null,
    repeatable: false,
    dungeon: null,
  },

  // Stonehaven mining chain: cave kobolds -> goblins -> minotaur boss.
  {
    id: 'stonehaven_mine_kobolds',
    title: { es: 'La Mina Tomada', en: 'The Taken Mine' },
    desc: {
      es: 'Los kobolds ocupan la mina de Stonehaven. Sacalos.',
      en: 'Kobolds have seized the Stonehaven mine. Drive them out.',
    },
    giverNpc: 'stonehaven_captain',
    city: 'stonehaven',
    minLevel: 11,
    objectives: [
      { type: 'reach', target: 'orcfort', count: 1, desc: { es: 'Entra a la mina', en: 'Enter the mine' } },
      { type: 'kill', target: 'kobold', count: 14, desc: { es: 'Mata 14 kobolds', en: 'Kill 14 kobolds' } },
    ],
    rewards: { gold: 260, exp: 700, items: ['iron_helmet'] },
    next: 'stonehaven_mine_goblins',
    repeatable: false,
    dungeon: 'orcfort',
  },
  {
    id: 'stonehaven_mine_goblins',
    title: { es: 'Mas Profundo', en: 'Deeper Down' },
    desc: {
      es: 'Los goblins anidan bajo los kobolds. Sigue cavando hacia abajo.',
      en: 'Goblins nest below the kobolds. Keep pushing down.',
    },
    giverNpc: 'stonehaven_captain',
    city: 'stonehaven',
    minLevel: 13,
    objectives: [
      { type: 'kill', target: 'goblin', count: 16, desc: { es: 'Mata 16 goblins', en: 'Kill 16 goblins' } },
      { type: 'kill', target: 'orc', count: 6, desc: { es: 'Mata 6 orcos', en: 'Kill 6 orcs' } },
    ],
    rewards: { gold: 380, exp: 1100, items: ['iron_armor'] },
    next: 'stonehaven_minotaur',
    repeatable: false,
    dungeon: 'orcfort',
  },
  {
    id: 'stonehaven_minotaur',
    title: { es: 'El Señor del Laberinto', en: 'Lord of the Maze' },
    desc: {
      es: 'En el fondo aguarda un minotauro. Acaba con el y reclama la mina.',
      en: 'A minotaur waits at the bottom. Slay it and reclaim the mine.',
    },
    giverNpc: 'stonehaven_captain',
    city: 'stonehaven',
    minLevel: 16,
    objectives: [
      { type: 'kill', target: 'minotaur', count: 4, desc: { es: 'Mata 4 minotauros', en: 'Kill 4 minotaurs' } },
      { type: 'talk', target: 'stonehaven_captain', count: 1, desc: { es: 'Informa al capataz', en: 'Report to the foreman' } },
    ],
    rewards: { gold: 700, exp: 2400, items: ['steel_sword', 'steel_helmet'] },
    next: null,
    repeatable: false,
    dungeon: 'orcfort',
  },

  // Stonehaven standalone jobs.
  {
    id: 'stonehaven_beach_crabs',
    title: { es: 'Cangrejos en el Puerto', en: 'Crabs at the Docks' },
    desc: {
      es: 'Los cangrejos cortan las redes en el muelle de Stonehaven.',
      en: 'Crabs cut the nets at the Stonehaven docks.',
    },
    giverNpc: 'stonehaven_smith',
    city: 'stonehaven',
    minLevel: 6,
    objectives: [
      { type: 'kill', target: 'crab', count: 12, desc: { es: 'Mata 12 cangrejos', en: 'Kill 12 crabs' } },
    ],
    rewards: { gold: 95, exp: 220, items: ['iron_shield'] },
    next: null,
    repeatable: true,
    dungeon: null,
  },
  {
    id: 'stonehaven_scorpion_pit',
    title: { es: 'El Pozo de Escorpiones', en: 'The Scorpion Pit' },
    desc: {
      es: 'Un pozo lleno de escorpiones se abrio cerca de la cantera.',
      en: 'A pit full of scorpions opened near the quarry.',
    },
    giverNpc: null,
    city: 'stonehaven',
    minLevel: 12,
    objectives: [
      { type: 'reach', target: 'orcfort', count: 1, desc: { es: 'Baja al pozo', en: 'Descend into the pit' } },
      { type: 'kill', target: 'scorpion', count: 18, desc: { es: 'Mata 18 escorpiones', en: 'Kill 18 scorpions' } },
    ],
    rewards: { gold: 320, exp: 900, items: ['iron_legs'] },
    next: null,
    repeatable: false,
    dungeon: 'orcfort',
  },

  // Undead chain spanning Stonehaven into the highlands.
  {
    id: 'crypt_skeletons',
    title: { es: 'La Cripta Olvidada', en: 'The Forgotten Crypt' },
    desc: {
      es: 'Los muertos caminan en la cripta bajo Stonehaven. Quemalos.',
      en: 'The dead walk in the crypt below Stonehaven. Put them down.',
    },
    giverNpc: 'stonehaven_priest',
    city: 'stonehaven',
    minLevel: 18,
    objectives: [
      { type: 'reach', target: 'undeadcrypt', count: 1, desc: { es: 'Entra a la cripta', en: 'Enter the crypt' } },
      { type: 'kill', target: 'skeleton', count: 20, desc: { es: 'Mata 20 esqueletos', en: 'Kill 20 skeletons' } },
      { type: 'kill', target: 'zombie', count: 10, desc: { es: 'Mata 10 zombies', en: 'Kill 10 zombies' } },
    ],
    rewards: { gold: 800, exp: 2800, items: ['steel_armor'] },
    next: 'crypt_wraith',
    repeatable: false,
    dungeon: 'undeadcrypt',
  },
  {
    id: 'crypt_wraith',
    title: { es: 'El Señor de la Cripta', en: 'The Crypt Lord' },
    desc: {
      es: 'Un espectro gobierna la cripta. Disuelve su forma.',
      en: 'A wraith rules the crypt. Dispel its form.',
    },
    giverNpc: 'stonehaven_priest',
    city: 'stonehaven',
    minLevel: 22,
    objectives: [
      { type: 'kill', target: 'wraith', count: 5, desc: { es: 'Mata 5 espectros', en: 'Kill 5 wraiths' } },
      { type: 'kill', target: 'ghost', count: 8, desc: { es: 'Mata 8 fantasmas', en: 'Kill 8 ghosts' } },
    ],
    rewards: { gold: 1400, exp: 5000, items: ['silver_amulet', 'steel_shield'] },
    next: null,
    repeatable: false,
    dungeon: 'undeadcrypt',
  },

  // Dragonreach late-game chain: orcs -> trolls -> dragon finale.
  {
    id: 'dragonreach_orc_warband',
    title: { es: 'La Horda Orca', en: 'The Orc Warband' },
    desc: {
      es: 'Una horda orca asedia las puertas de Dragonreach.',
      en: 'An orc warband besieges the gates of Dragonreach.',
    },
    giverNpc: 'dragonreach_warden',
    city: 'dragonreach',
    minLevel: 25,
    objectives: [
      { type: 'kill', target: 'orc', count: 25, desc: { es: 'Mata 25 orcos', en: 'Kill 25 orcs' } },
      { type: 'kill', target: 'ogre', count: 8, desc: { es: 'Mata 8 ogros', en: 'Kill 8 ogres' } },
    ],
    rewards: { gold: 2000, exp: 8000, items: ['knight_sword'] },
    next: 'dragonreach_troll_pass',
    repeatable: false,
    dungeon: null,
  },
  {
    id: 'dragonreach_troll_pass',
    title: { es: 'El Paso de los Trolls', en: 'The Troll Pass' },
    desc: {
      es: 'Los trolls bloquean el paso a la montaña. Abrete camino.',
      en: 'Trolls block the mountain pass. Force your way through.',
    },
    giverNpc: 'dragonreach_warden',
    city: 'dragonreach',
    minLevel: 30,
    objectives: [
      { type: 'reach', target: 'trollcave', count: 1, desc: { es: 'Llega al paso', en: 'Reach the pass' } },
      { type: 'kill', target: 'troll', count: 14, desc: { es: 'Mata 14 trolls', en: 'Kill 14 trolls' } },
      { type: 'kill', target: 'cyclops', count: 5, desc: { es: 'Mata 5 ciclopes', en: 'Kill 5 cyclopes' } },
    ],
    rewards: { gold: 3500, exp: 14000, items: ['dragon_shield', 'fast_boots'] },
    next: 'dragonreach_dragon',
    repeatable: false,
    dungeon: 'trollcave',
  },
  {
    id: 'dragonreach_dragon',
    title: { es: 'El Nido del Dragón', en: 'The Dragon Lair' },
    desc: {
      es: 'Mas alla del paso arde el nido. Mata al dragón y sera tuyo el cielo.',
      en: 'Beyond the pass burns the lair. Slay the dragon and own the sky.',
    },
    giverNpc: 'dragonreach_warden',
    city: 'dragonreach',
    minLevel: 38,
    objectives: [
      { type: 'reach', target: 'dragonlair', count: 1, desc: { es: 'Entra al nido', en: 'Enter the lair' } },
      { type: 'kill', target: 'wyvern', count: 8, desc: { es: 'Mata 8 wyverns', en: 'Kill 8 wyverns' } },
      { type: 'kill', target: 'dragon', count: 3, desc: { es: 'Mata 3 dragones', en: 'Kill 3 dragons' } },
      { type: 'talk', target: 'dragonreach_warden', count: 1, desc: { es: 'Informa al capitan', en: 'Report to the captain' } },
    ],
    rewards: { gold: 9000, exp: 40000, items: ['dragon_sword', 'fire_sword'] },
    next: null,
    repeatable: false,
    dungeon: 'dragonlair',
  },

  // Dragonreach demon finale (standalone capstone).
  {
    id: 'dragonreach_demon_gate',
    title: { es: 'La Puerta del Demonio', en: 'The Demon Gate' },
    desc: {
      es: 'Una puerta infernal se abrio bajo Dragonreach. Sellala con sangre.',
      en: 'An infernal gate opened beneath Dragonreach. Seal it in blood.',
    },
    giverNpc: 'dragonreach_sage',
    city: 'dragonreach',
    minLevel: 45,
    objectives: [
      { type: 'reach', target: 'demonabyss', count: 1, desc: { es: 'Cruza la puerta', en: 'Cross the gate' } },
      { type: 'kill', target: 'imp', count: 15, desc: { es: 'Mata 15 diablillos', en: 'Kill 15 imps' } },
      { type: 'kill', target: 'demon', count: 6, desc: { es: 'Mata 6 demonios', en: 'Kill 6 demons' } },
    ],
    rewards: { gold: 15000, exp: 80000, items: ['demon_sword', 'dragon_shield'] },
    next: null,
    repeatable: false,
    dungeon: 'demonabyss',
  },

  // Repeatable bounty board jobs for grinding.
  {
    id: 'bounty_slimes',
    title: { es: 'Recompensa: Slimes', en: 'Bounty: Slimes' },
    desc: {
      es: 'El tablon paga por cada slime eliminado en las cuevas.',
      en: 'The board pays per slime cleared from the caves.',
    },
    giverNpc: null,
    city: 'oakvale',
    minLevel: 8,
    objectives: [
      { type: 'kill', target: 'slime', count: 15, desc: { es: 'Mata 15 slimes', en: 'Kill 15 slimes' } },
    ],
    rewards: { gold: 120, exp: 280, items: [] },
    next: null,
    repeatable: true,
    dungeon: null,
  },
  {
    id: 'bounty_bats',
    title: { es: 'Recompensa: Murcielagos', en: 'Bounty: Bats' },
    desc: {
      es: 'Los murcielagos infestan las cuevas mineras. Reduce su numero.',
      en: 'Bats infest the mine caves. Cut their numbers down.',
    },
    giverNpc: null,
    city: 'stonehaven',
    minLevel: 10,
    objectives: [
      { type: 'kill', target: 'bat', count: 20, desc: { es: 'Mata 20 murcielagos', en: 'Kill 20 bats' } },
    ],
    rewards: { gold: 150, exp: 350, items: [] },
    next: null,
    repeatable: true,
    dungeon: null,
  },
  {
    id: 'bounty_snakes',
    title: { es: 'Recompensa: Serpientes', en: 'Bounty: Snakes' },
    desc: {
      es: 'Las serpientes acechan los pastos. Cobra la recompensa.',
      en: 'Snakes lurk in the pastures. Claim the bounty.',
    },
    giverNpc: null,
    city: 'rivertown',
    minLevel: 4,
    objectives: [
      { type: 'kill', target: 'snake', count: 12, desc: { es: 'Mata 12 serpientes', en: 'Kill 12 snakes' } },
    ],
    rewards: { gold: 60, exp: 140, items: [] },
    next: null,
    repeatable: true,
    dungeon: null,
  },
];

// Fast id lookup.
const BY_ID = new Map(QUESTS.map((q) => [q.id, q]));

// Public helpers.
export function getQuest(id) {
  return BY_ID.get(id) || null;
}

// Quests offered by a given npc (board quests have giverNpc null).
export function questsForNpc(npcId) {
  return QUESTS.filter((q) => q.giverNpc === npcId);
}

// Quests anchored in a given city.
export function questsForCity(cityId) {
  return QUESTS.filter((q) => q.city === cityId);
}

// Quests a player at `level` can pick up (meets minLevel). Chain follow-ups
// are still listed so callers can preview what comes next.
export function questsForLevel(level) {
  return QUESTS.filter((q) => q.minLevel <= level);
}
