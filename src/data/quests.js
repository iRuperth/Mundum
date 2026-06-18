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
    rewards: { gold: 10, exp: 20, items: ['leather_helmet', 'amber_stone'] },
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
    rewards: { gold: 700, exp: 2400, items: ['steel_sword', 'steel_helmet', 'topaz'] },
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
    rewards: { gold: 2000, exp: 8000, items: ['knight_sword', 'emerald'] },
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
    rewards: { gold: 9000, exp: 40000, items: ['dragon_sword', 'fire_sword', 'onyx'] },
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
    rewards: { gold: 15000, exp: 80000, items: ['demon_sword', 'dragon_shield', 'solar_garnet'] },
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

  // ===========================================================================
  // GEAR QUESTS — the level-22+ equipment the shops no longer sell is earned
  // here instead. These are deliberately LONG (big kill counts / multi-step
  // chains, the user's "10 misiones de nivel 30 -> un arma de nivel 30"): a
  // grind, but a guaranteed reward at the end, unlike the tiny drop odds.
  // ===========================================================================

  // Westharbor (forest river-port): a long fishing-coast + forest grind that
  // ends in a solid mid-tier weapon set.
  {
    id: 'westharbor_coast_watch',
    title: { es: 'La Guardia Costera', en: 'The Coast Watch' },
    desc: {
      es: 'Westharbor necesita manos firmes. Limpia la costa de alimañas para ganarte su confianza.',
      en: 'Westharbor needs steady hands. Clear the coast of vermin to earn their trust.',
    },
    giverNpc: null, city: 'westharbor', minLevel: 18,
    objectives: [
      { type: 'kill', target: 'crab', count: 20, desc: { es: 'Mata 20 cangrejos', en: 'Kill 20 crabs' } },
      { type: 'kill', target: 'snake', count: 20, desc: { es: 'Mata 20 serpientes', en: 'Kill 20 snakes' } },
    ],
    rewards: { gold: 600, exp: 1800, items: ['plate_armor'] },
    next: 'westharbor_deep_woods', repeatable: false, dungeon: null,
  },
  {
    id: 'westharbor_deep_woods',
    title: { es: 'El Bosque Profundo', en: 'The Deep Woods' },
    desc: {
      es: 'Los elfos del bosque profundo no aceptan intrusos. Demuestra tu valor en una larga cacería.',
      en: 'The deep-wood elves suffer no intruders. Prove yourself in a long hunt.',
    },
    giverNpc: null, city: 'westharbor', minLevel: 22,
    objectives: [
      { type: 'kill', target: 'elf', count: 25, desc: { es: 'Mata 25 elfos', en: 'Kill 25 elves' } },
      { type: 'kill', target: 'treant', count: 10, desc: { es: 'Mata 10 treants', en: 'Kill 10 treants' } },
    ],
    rewards: { gold: 1600, exp: 5200, items: ['crystal_sword', 'plate_legs', 'verdant_opal'] },
    next: null, repeatable: false, dungeon: null,
  },

  // Frostpeak (frozen mining outpost): an ice-creature grind for cold-weather
  // gear that no shop carries.
  {
    id: 'frostpeak_white_hunt',
    title: { es: 'La Cacería Blanca', en: 'The White Hunt' },
    desc: {
      es: 'El frío trae lobos y osos hambrientos. Adelgaza las manadas alrededor de Frostpeak.',
      en: 'The cold brings hungry wolves and bears. Thin the packs around Frostpeak.',
    },
    giverNpc: null, city: 'frostpeak', minLevel: 20,
    objectives: [
      { type: 'kill', target: 'wolf', count: 25, desc: { es: 'Mata 25 lobos', en: 'Kill 25 wolves' } },
      { type: 'kill', target: 'bear', count: 12, desc: { es: 'Mata 12 osos', en: 'Kill 12 bears' } },
    ],
    rewards: { gold: 900, exp: 2600, items: ['warrior_helmet', 'sapphire'] },
    next: 'frostpeak_frozen_depths', repeatable: false, dungeon: null,
  },
  {
    id: 'frostpeak_frozen_depths',
    title: { es: 'Las Profundidades Heladas', en: 'The Frozen Depths' },
    desc: {
      es: 'Algo antiguo se mueve bajo el hielo: troles de escarcha y arañas de cristal. Bájalos.',
      en: 'Something ancient stirs under the ice: frost trolls and crystal spiders. Put them down.',
    },
    giverNpc: null, city: 'frostpeak', minLevel: 28,
    objectives: [
      { type: 'kill', target: 'troll', count: 20, desc: { es: 'Mata 20 troles', en: 'Kill 20 trolls' } },
      { type: 'kill', target: 'spider', count: 15, desc: { es: 'Mata 15 arañas', en: 'Kill 15 spiders' } },
    ],
    rewards: { gold: 2200, exp: 7000, items: ['knight_armor', 'crusader_helmet', 'rose_crystal'] },
    next: null, repeatable: false, dungeon: null,
  },

  // Sandport (oasis): a desert grind for the golden set the shops won't sell.
  {
    id: 'sandport_scarab_swarm',
    title: { es: 'El Enjambre de Escarabajos', en: 'The Scarab Swarm' },
    desc: {
      es: 'Los escarabajos y escorpiones del desierto asfixian Sandport. Aplástalos en masa.',
      en: 'Desert scarabs and scorpions choke Sandport. Crush them en masse.',
    },
    giverNpc: null, city: 'sandport', minLevel: 22,
    objectives: [
      { type: 'kill', target: 'beetle', count: 25, desc: { es: 'Mata 25 escarabajos', en: 'Kill 25 beetles' } },
      { type: 'kill', target: 'scorpion', count: 20, desc: { es: 'Mata 20 escorpiones', en: 'Kill 20 scorpions' } },
    ],
    rewards: { gold: 1200, exp: 3800, items: ['scale_armor'] },
    next: 'sandport_tomb_kings', repeatable: false, dungeon: null,
  },
  {
    id: 'sandport_tomb_kings',
    title: { es: 'Los Reyes de las Tumbas', en: 'The Tomb Kings' },
    desc: {
      es: 'Las momias antiguas guardan oro maldito. Reúne el valor para reclamarlo.',
      en: 'Ancient mummies guard cursed gold. Find the courage to claim it.',
    },
    giverNpc: null, city: 'sandport', minLevel: 30,
    objectives: [
      { type: 'kill', target: 'zombie', count: 20, desc: { es: 'Mata 20 muertos', en: 'Kill 20 undead' } },
      { type: 'reach', target: 'sunktemple', count: 1, desc: { es: 'Llega al templo derruido', en: 'Reach the fallen temple' } },
    ],
    rewards: { gold: 4000, exp: 12000, items: ['golden_armor', 'golden_legs', 'aquamarine'] },
    next: null, repeatable: false, dungeon: null,
  },

  // The ghost-town ruin chain: a long undead grind that rewards a real shield.
  {
    id: 'hollowmoor_haunting',
    title: { es: 'El Pueblo Encantado', en: 'The Haunted Town' },
    desc: {
      es: 'Hollowmoor cayó hace siglos y sus muertos no descansan. Recorre sus ruinas y libéralo.',
      en: 'Hollowmoor fell centuries ago and its dead won\'t rest. Walk its ruins and free it.',
    },
    giverNpc: null, city: 'oakvale', minLevel: 24,
    objectives: [
      { type: 'reach', target: 'hollowmoor', count: 1, desc: { es: 'Llega al pueblo fantasma', en: 'Reach the ghost town' } },
      { type: 'kill', target: 'ghost', count: 18, desc: { es: 'Mata 18 fantasmas', en: 'Kill 18 ghosts' } },
      { type: 'kill', target: 'skeleton', count: 18, desc: { es: 'Mata 18 esqueletos', en: 'Kill 18 skeletons' } },
    ],
    rewards: { gold: 3000, exp: 9000, items: ['guardian_shield', 'royal_helmet', 'amethyst'] },
    next: null, repeatable: false, dungeon: null,
  },

  // High-end capstone: a long demon-tier grind that GUARANTEES a demon shield —
  // the alternative to the brutal drop odds, for players who'd rather grind a
  // chain than gamble. minLevel high so it's truly endgame.
  {
    id: 'abyss_warlords',
    title: { es: 'Señores del Abismo', en: 'Warlords of the Abyss' },
    desc: {
      es: 'Diez cacerías en el Abismo Demoníaco prueban que mereces portar acero infernal.',
      en: 'Ten hunts in the Demon Abyss prove you are worthy to bear infernal steel.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 55,
    objectives: [
      { type: 'kill', target: 'demon', count: 20, desc: { es: 'Mata 20 demonios', en: 'Kill 20 demons' } },
      { type: 'kill', target: 'imp', count: 30, desc: { es: 'Mata 30 diablillos', en: 'Kill 30 imps' } },
      { type: 'kill', target: 'cultist', count: 20, desc: { es: 'Mata 20 cultistas', en: 'Kill 20 cultists' } },
    ],
    rewards: { gold: 30000, exp: 150000, items: ['demon_shield', 'demon_helmet', 'star_sapphire', 'diamond_gem'] },
    next: null, repeatable: false, dungeon: 'demonabyss',
  },

  // "Wipe out the invading orcs" — a guard-captain job; the renegade orc Grakûl
  // later gives a wordless follow-up (his lines are orc gibberish; the objective
  // text in the log is what guides the player).
  {
    id: 'stonehaven_orc_invasion',
    title: { es: 'La Invasión Orca', en: 'The Orc Invasion' },
    desc: {
      es: 'Los orcos asaltan los caminos de Stonehaven. Rompe su avanzada.',
      en: 'Orcs are raiding the Stonehaven roads. Break their advance.',
    },
    giverNpc: 'stonehaven_guard', city: 'stonehaven', minLevel: 12,
    objectives: [
      { type: 'kill', target: 'orc', count: 20, desc: { es: 'Mata 20 orcos', en: 'Kill 20 orcs' } },
      { type: 'collect', target: 'trophy_orc', count: 10, desc: { es: 'Reúne 10 dientes de orco', en: 'Collect 10 orc teeth' } },
    ],
    rewards: { gold: 400, exp: 1500, items: ['plate_armor'] },
    next: 'renegade_orc_truce', repeatable: false, dungeon: null,
  },
  {
    id: 'renegade_orc_truce',
    title: { es: 'El Orco Renegado', en: 'The Renegade Orc' },
    desc: {
      es: 'Un orco solitario, Grakûl, no ataca. No entiendes su lengua, pero señala al jefe de guerra.',
      en: 'A lone orc, Grakûl, does not attack. You cannot understand his tongue, but he points to the warlord.',
    },
    giverNpc: 'renegade_orc', city: null, minLevel: 14,
    objectives: [
      { type: 'kill', target: 'orc', count: 1, desc: { es: 'Derrota al Señor de la Guerra Orco', en: 'Defeat the Orc Warlord' } },
      { type: 'talk', target: 'renegade_orc', count: 1, desc: { es: 'Vuelve con Grakûl', en: 'Return to Grakûl' } },
    ],
    rewards: { gold: 800, exp: 3000, items: ['battle_axe'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ###########################################################################
  // THE GEAR-QUEST WEB — ~60 quests spanning every level band and difficulty.
  // ~30% of all epic/legendary gear is EARNED here instead of farmed. Each quest
  // DESCRIPTION gives a RUMOR/HINT of where to look (a direction from a city, a
  // creature type to fight first) — never coordinates. Many are multi-step chains
  // or key-gated; some are day/night-only. minLevel auto-aligns to the reward's
  // levelReq (see the pass at the bottom).
  //
  // Geography cheat-sheet for the hints (from cities.js / zones.js):
  //   Greenhollow = capital (centre). Oakvale = SW forest. Stonehaven = far S,
  //   snowy mountains. Dragonreach = far E desert. Westharbor = far W river-port.
  //   Frostpeak = far N, frozen. Sandport = far SE oasis.
  //   Zones: Elf Forest (N of Oakvale), Troll Territory (W of Oakvale), Orc
  //   Territory (E-S of capital), Dwarf Mines (SE of capital), Minotaur Labyrinth
  //   (SW deep), Cyclops Camp (E of capital), Khelmun Desert (by Dragonreach),
  //   Undead Crypt (SE), Dragon Mountains (S), Hydra Swamp (far SW), Demon Abyss
  //   (SW deep), Desert Tombs (far SE near Sandport).
  // ###########################################################################

  // ---- EARLY EPICS (lv30-48): single jobs, simple "go there / clear that" ----
  {
    id: 'gear_ice_rapier',
    title: { es: 'El Estoque de Hielo', en: 'The Ice Rapier' },
    desc: {
      es: 'Cuentan en Frostpeak que un duelista congelado guarda un estoque que nunca se derrite, en las cuevas heladas al norte. Trae esquirlas de los troles de escarcha y será tuyo.',
      en: 'In Frostpeak they say a frozen duelist keeps a rapier that never melts, in the icy caves to the north. Bring frost shards from the frost trolls and it is yours.',
    },
    giverNpc: 'frostpeak_explorer', city: 'frostpeak', minLevel: 30,
    objectives: [
      { type: 'kill', target: 'troll', count: 15, desc: { es: 'Mata 15 troles (busca los de escarcha al norte)', en: 'Kill 15 trolls (seek the frost ones up north)' } },
      { type: 'collect', target: 'frost-shard', count: 8, desc: { es: 'Reúne 8 esquirlas heladas', en: 'Collect 8 frost shards' } },
    ],
    rewards: { gold: 1200, exp: 3500, items: ['ice_rapier'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_war_hammer',
    title: { es: 'El Martillo de Guerra', en: 'The War Hammer' },
    desc: {
      es: 'El herrero de Stonehaven dice que los cíclopes al este del capital forjan martillos enormes. Quítale uno al más grande que encuentres.',
      en: 'Stonehaven\'s smith says the cyclopes east of the capital forge massive hammers. Take one off the biggest you can find.',
    },
    giverNpc: 'stonehaven_smith', city: 'stonehaven', minLevel: 35,
    objectives: [
      { type: 'kill', target: 'cyclops', count: 8, desc: { es: 'Mata 8 cíclopes (al este del capital)', en: 'Kill 8 cyclopes (east of the capital)' } },
    ],
    rewards: { gold: 1500, exp: 4200, items: ['war_hammer'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_serpent_sword',
    title: { es: 'La Hoja Serpiente', en: 'The Serpent Blade' },
    desc: {
      es: 'En el pantano lejano al suroeste anidan hidras y serpientes marinas. Dicen los rumores que una de ellas tragó una espada con forma de serpiente. Ábrele paso.',
      en: 'In the far south-west swamp nest hydras and sea serpents. Rumor says one swallowed a serpent-shaped sword. Cut your way to it.',
    },
    giverNpc: 'westharbor_harbormaster', city: 'westharbor', minLevel: 45,
    objectives: [
      { type: 'kill', target: 'hydra', count: 4, desc: { es: 'Mata 4 hidras (pantano al suroeste)', en: 'Kill 4 hydras (swamp to the south-west)' } },
      { type: 'kill', target: 'snake', count: 20, desc: { es: 'Mata 20 serpientes', en: 'Kill 20 snakes' } },
    ],
    rewards: { gold: 2200, exp: 6500, items: ['serpent_sword'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_giant_sword',
    title: { es: 'La Espada del Gigante', en: 'The Giant Sword' },
    desc: {
      es: 'Una espada tan grande que solo un gigante la blandiría. El capataz de Frostpeak jura que los osos y troles del norte la enterraron en su guarida.',
      en: 'A sword so huge only a giant could swing it. Frostpeak\'s foreman swears the bears and trolls of the north buried it in their den.',
    },
    giverNpc: 'frostpeak_foreman', city: 'frostpeak', minLevel: 45,
    objectives: [
      { type: 'kill', target: 'bear', count: 14, desc: { es: 'Mata 14 osos', en: 'Kill 14 bears' } },
      { type: 'kill', target: 'troll', count: 14, desc: { es: 'Mata 14 troles', en: 'Kill 14 trolls' } },
    ],
    rewards: { gold: 2400, exp: 7000, items: ['giant_sword'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_arbalest',
    title: { es: 'La Ballesta Maestra', en: 'The Master Arbalest' },
    desc: {
      es: 'La cazadora de Oakvale oyó que los elfos del bosque al norte fabrican ballestas perfectas. No te las darán: tendrás que ganártelas.',
      en: 'Oakvale\'s hunter heard the elves of the forest to the north craft perfect crossbows. They won\'t hand them over — you\'ll have to earn it.',
    },
    giverNpc: 'oakvale_hunter', city: 'oakvale', minLevel: 40,
    objectives: [
      { type: 'kill', target: 'elf', count: 25, desc: { es: 'Mata 25 elfos (bosque al norte de Oakvale)', en: 'Kill 25 elves (forest north of Oakvale)' } },
    ],
    rewards: { gold: 1800, exp: 5200, items: ['arbalest'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_swift_boots',
    title: { es: 'Las Botas Veloces', en: 'The Swift Boots' },
    desc: {
      es: 'Los goblins exploradores del fuerte orco al este corren como el viento gracias a unas botas robadas. Recupéralas.',
      en: 'The goblin scouts of the orc fort to the east run like the wind thanks to stolen boots. Get them back.',
    },
    giverNpc: 'stonehaven_captain', city: 'stonehaven', minLevel: 45,
    objectives: [
      { type: 'reach', target: 'orcfort', count: 1, desc: { es: 'Entra al fuerte orco (al este)', en: 'Enter the orc fort (to the east)' } },
      { type: 'kill', target: 'goblin', count: 20, desc: { es: 'Mata 20 goblins', en: 'Kill 20 goblins' } },
    ],
    rewards: { gold: 3500, exp: 6000, items: ['swift_boots'] },
    next: null, repeatable: false, dungeon: 'orcfort',
  },
  {
    id: 'gear_guardian_boots',
    title: { es: 'Las Botas del Guardián', en: 'The Guardian Boots' },
    desc: {
      es: 'En el laberinto de minotauros al suroeste, el guardia minotauro pisa con botas de placas. Derríbalo.',
      en: 'In the minotaur labyrinth to the south-west, the minotaur guard treads in plated boots. Bring him down.',
    },
    giverNpc: 'stonehaven_captain', city: 'stonehaven', minLevel: 38,
    objectives: [
      { type: 'kill', target: 'minotaur', count: 18, desc: { es: 'Mata 18 minotauros (laberinto al suroeste)', en: 'Kill 18 minotaurs (labyrinth to the south-west)' } },
    ],
    rewards: { gold: 2000, exp: 5500, items: ['guardian_boots'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_mage_robe',
    title: { es: 'La Túnica del Archimago', en: "The Archmage's Robe" },
    desc: {
      es: 'El sabio de Dragonreach busca la túnica de un archimago caído entre los cultistas del Abismo, lejos al suroeste. Tráele tomos oscuros como prueba.',
      en: 'Dragonreach\'s sage seeks a fallen archmage\'s robe among the cultists of the Abyss, far to the south-west. Bring dark tomes as proof.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 40,
    objectives: [
      { type: 'kill', target: 'cultist', count: 18, desc: { es: 'Mata 18 cultistas (Abismo al suroeste)', en: 'Kill 18 cultists (Abyss to the south-west)' } },
      { type: 'collect', target: 'dark-tome', count: 5, desc: { es: 'Reúne 5 tomos oscuros', en: 'Collect 5 dark tomes' } },
    ],
    rewards: { gold: 2000, exp: 5800, items: ['mage_robe', 'mage_legs'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ---- MID EPICS (lv50-65): short chains, barters, day/night ----
  {
    id: 'gear_dragon_hammer',
    title: { es: 'El Martillo Dragón', en: 'The Dragon Hammer' },
    desc: {
      es: 'Solo de día, cuando los dragones del sur duermen, un herrero osado roba sus escamas para forjar martillos. Tráele 6 escamas de dragón.',
      en: 'Only by day, when the dragons of the south sleep, a daring smith steals their scales to forge hammers. Bring him 6 dragon scales.',
    },
    giverNpc: 'dragonreach_smith', city: 'dragonreach', minLevel: 50,
    dayOnly: true,
    objectives: [
      { type: 'collect', target: 'dragon-scale', count: 6, desc: { es: 'Reúne 6 escamas de dragón (montañas al sur)', en: 'Collect 6 dragon scales (mountains to the south)' } },
      { type: 'kill', target: 'dragon', count: 3, desc: { es: 'Mata 3 dragones', en: 'Kill 3 dragons' } },
    ],
    rewards: { gold: 4000, exp: 9000, items: ['dragon_hammer'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_frost_blade',
    title: { es: 'Frostmourne', en: 'Frostmourne' },
    desc: {
      es: 'La hoja maldita de hielo duerme en la Guarida Glacial, en el extremo norte helado. Pero su filo solo despierta de noche. Ve preparado.',
      en: 'The cursed ice blade sleeps in the Glacial Lair, in the frozen far north. Its edge only wakes at night. Go prepared.',
    },
    giverNpc: 'frostpeak_explorer', city: 'frostpeak', minLevel: 52,
    nightOnly: true,
    objectives: [
      { type: 'kill', target: 'troll', count: 18, desc: { es: 'Mata 18 troles de escarcha', en: 'Kill 18 frost trolls' } },
      { type: 'kill', target: 'golem', count: 6, desc: { es: 'Mata 6 gólems de hielo', en: 'Kill 6 ice golems' } },
    ],
    rewards: { gold: 5000, exp: 12000, items: ['frost_blade'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_frost_bow',
    title: { es: 'El Arco de Escarcha', en: 'The Frost Bow' },
    desc: {
      es: 'Wolf-tamer Skadi sabe de un arco que congela la flecha en pleno vuelo. Lo guardan los lobos de invierno y las arañas de cristal del norte.',
      en: 'Wolf-tamer Skadi knows of a bow that freezes the arrow in flight. The winter wolves and crystal spiders of the north keep it.',
    },
    giverNpc: 'frostpeak_tamer', city: 'frostpeak', minLevel: 45,
    objectives: [
      { type: 'kill', target: 'wolf', count: 20, desc: { es: 'Mata 20 lobos (de invierno, al norte)', en: 'Kill 20 wolves (winter, to the north)' } },
      { type: 'kill', target: 'spider', count: 12, desc: { es: 'Mata 12 arañas de cristal', en: 'Kill 12 crystal spiders' } },
    ],
    rewards: { gold: 2600, exp: 7400, items: ['frost_bow'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_royal_armor',
    title: { es: 'La Placa Real', en: 'The Royal Plate' },
    desc: {
      es: 'El rey de Stonehaven recompensa a quien rompa el asedio orco al este. Mata a sus líderes y a sus berserkers, y vestirás como la realeza.',
      en: 'Stonehaven\'s king rewards whoever breaks the orc siege to the east. Slay their leaders and berserkers, and you\'ll dress like royalty.',
    },
    giverNpc: 'stonehaven_king', city: 'stonehaven', minLevel: 52,
    objectives: [
      { type: 'kill', target: 'orc', count: 30, desc: { es: 'Mata 30 orcos (territorio orco al este)', en: 'Kill 30 orcs (orc territory to the east)' } },
      { type: 'collect', target: 'orc-dust', count: 40, desc: { es: 'Reúne 40 polvo de orco', en: 'Collect 40 orc dust' } },
    ],
    rewards: { gold: 4500, exp: 11000, items: ['royal_armor', 'golden_legs2'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_winged_boots',
    title: { es: 'Las Botas Aladas', en: 'The Winged Boots' },
    desc: {
      es: 'Las arpías de las montañas al sur llevan plumas que dan ligereza al pie. La cazadora las quiere para unas botas aladas.',
      en: 'The harpies of the southern mountains carry feathers that lighten the step. The hunter wants them for winged boots.',
    },
    giverNpc: 'oakvale_hunter', city: 'oakvale', minLevel: 55,
    objectives: [
      { type: 'kill', target: 'harpy', count: 16, desc: { es: 'Mata 16 arpías (montañas al sur)', en: 'Kill 16 harpies (southern mountains)' } },
      { type: 'collect', target: 'feather', count: 20, desc: { es: 'Reúne 20 plumas', en: 'Collect 20 feathers' } },
    ],
    rewards: { gold: 5000, exp: 12000, items: ['winged_boots'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_amulet_haste',
    title: { es: 'El Amuleto de Premura', en: 'The Amulet of Haste' },
    desc: {
      es: 'Caravaneer Rashid perdió un amuleto de premura cuando los escorpiones del desierto al sureste asaltaron su caravana. Recupéralo del enjambre.',
      en: 'Caravaneer Rashid lost an amulet of haste when the desert scorpions to the south-east raided his caravan. Recover it from the swarm.',
    },
    giverNpc: 'sandport_caravan', city: 'sandport', minLevel: 55,
    objectives: [
      { type: 'kill', target: 'scorpion', count: 25, desc: { es: 'Mata 25 escorpiones (desierto al sureste)', en: 'Kill 25 scorpions (desert to the south-east)' } },
      { type: 'kill', target: 'beetle', count: 15, desc: { es: 'Mata 15 escarabajos', en: 'Kill 15 beetles' } },
    ],
    rewards: { gold: 5000, exp: 11000, items: ['amulet_of_haste'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_glacial_axe',
    title: { es: 'El Hacha Glacial', en: 'The Glacial Axe' },
    desc: {
      es: 'En lo más profundo de la Guarida Glacial al norte, un dragón de hielo custodia un hacha que jamás se entibia. Solo héroes templados lo intentan.',
      en: 'Deep in the Glacial Lair to the north, an ice dragon guards an axe that never warms. Only tempered heroes attempt it.',
    },
    giverNpc: 'frostpeak_foreman', city: 'frostpeak', minLevel: 56,
    objectives: [
      { type: 'kill', target: 'golem', count: 14, desc: { es: 'Mata 14 gólems de hielo', en: 'Kill 14 ice golems' } },
      { type: 'collect', target: 'frost-shard', count: 15, desc: { es: 'Reúne 15 esquirlas heladas', en: 'Collect 15 frost shards' } },
    ],
    rewards: { gold: 6000, exp: 14000, items: ['glacial_axe'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_frozen_shield',
    title: { es: 'El Escudo Congelado', en: 'The Frozen Shield' },
    desc: {
      es: 'Dicen que el corazón de un gólem de cristal puede forjarse en un escudo que repele el fuego. Búscalos en las profundidades heladas del norte.',
      en: 'They say a crystal golem\'s heart can be forged into a shield that repels fire. Seek them in the frozen depths of the north.',
    },
    giverNpc: 'frostpeak_explorer', city: 'frostpeak', minLevel: 68,
    objectives: [
      { type: 'kill', target: 'golem', count: 18, desc: { es: 'Mata 18 gólems (cristal/hielo, al norte)', en: 'Kill 18 golems (crystal/ice, to the north)' } },
      { type: 'collect', target: 'crystal', count: 10, desc: { es: 'Reúne 10 cristales', en: 'Collect 10 crystals' } },
    ],
    rewards: { gold: 7000, exp: 16000, items: ['frozen_shield'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ---- THE DRAGON SET CHAIN (lv60-65): a full saga, hint-led ----
  {
    id: 'dragonset_1_scales',
    title: { es: 'Forja Dracónica I: Escamas', en: 'Draconic Forge I: Scales' },
    desc: {
      es: 'El herrero de Dragonreach puede forjar la armadura dracónica entera, pero necesita material. Empieza por las escamas: las montañas de dragones están al sur. Trae polvo y escamas.',
      en: 'Dragonreach\'s smith can forge the whole draconic set, but needs material. Start with scales: the dragon mountains lie to the south. Bring dust and scales.',
    },
    giverNpc: 'dragonreach_smith', city: 'dragonreach', minLevel: 60,
    objectives: [
      { type: 'collect', target: 'dragon-dust', count: 60, desc: { es: 'Reúne 60 polvo de dragón (montañas al sur)', en: 'Collect 60 dragon dust (mountains to the south)' } },
      { type: 'collect', target: 'dragon-scale', count: 20, desc: { es: 'Reúne 20 escamas de dragón', en: 'Collect 20 dragon scales' } },
    ],
    rewards: { gold: 4000, exp: 10000, items: ['dragon_helmet'] },
    next: 'dragonset_2_plate', repeatable: false, dungeon: null,
  },
  {
    id: 'dragonset_2_plate',
    title: { es: 'Forja Dracónica II: Coraza', en: 'Draconic Forge II: Plate' },
    desc: {
      es: 'El casco está listo. Ahora la coraza pide el calor de un Señor Dragón. Lo hallarás en lo más profundo de la guarida, al sur. No vayas solo.',
      en: 'The helmet is ready. Now the breastplate demands a Dragon Lord\'s heat. You\'ll find him deepest in the lair, to the south. Don\'t go alone.',
    },
    giverNpc: 'dragonreach_smith', city: 'dragonreach', minLevel: 65,
    objectives: [
      { type: 'reach', target: 'dragonlair', count: 1, desc: { es: 'Entra a la guarida del dragón (al sur)', en: 'Enter the dragon lair (to the south)' } },
      { type: 'kill', target: 'dragon', count: 8, desc: { es: 'Mata 8 dragones', en: 'Kill 8 dragons' } },
    ],
    rewards: { gold: 6000, exp: 16000, items: ['dragon_armor'] },
    next: 'dragonset_3_limbs', repeatable: false, dungeon: 'dragonlair',
  },
  {
    id: 'dragonset_3_limbs',
    title: { es: 'Forja Dracónica III: Grebas y Botas', en: 'Draconic Forge III: Legs & Boots' },
    desc: {
      es: 'Falta poco para el conjunto completo. Las grebas y botas dracónicas piden colmillos de wyvern: los wyverns vuelan sobre los picos del sur.',
      en: 'The full set is close. Draconic legs and boots demand wyvern fangs: wyverns wheel over the southern peaks.',
    },
    giverNpc: 'dragonreach_smith', city: 'dragonreach', minLevel: 65,
    objectives: [
      { type: 'kill', target: 'wyvern', count: 12, desc: { es: 'Mata 12 wyverns (picos al sur)', en: 'Kill 12 wyverns (southern peaks)' } },
      { type: 'collect', target: 'wyvern-fang', count: 8, desc: { es: 'Reúne 8 colmillos de wyvern', en: 'Collect 8 wyvern fangs' } },
    ],
    rewards: { gold: 7000, exp: 18000, items: ['dragon_legs', 'dragon_boots'] },
    next: 'dragonset_4_crest', repeatable: false, dungeon: null,
  },
  {
    id: 'dragonset_4_crest',
    title: { es: 'Forja Dracónica IV: Amuleto', en: 'Draconic Forge IV: Amulet' },
    desc: {
      es: 'Para coronar el conjunto, el herrero engarza un amuleto con el corazón ardiente de un dragón. Una última cacería al sur y serás un señor dracónico.',
      en: 'To crown the set, the smith sets an amulet with a dragon\'s burning heart. One last hunt to the south and you\'ll be a draconic lord.',
    },
    giverNpc: 'dragonreach_smith', city: 'dragonreach', minLevel: 60,
    objectives: [
      { type: 'collect', target: 'dragon-tooth', count: 10, desc: { es: 'Reúne 10 dientes de dragón', en: 'Collect 10 dragon teeth' } },
      { type: 'kill', target: 'dragon', count: 6, desc: { es: 'Mata 6 dragones', en: 'Kill 6 dragons' } },
    ],
    rewards: { gold: 8000, exp: 20000, items: ['dragon_amulet', 'dragon_backpack'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ---- THE WARDEN (nature) SET CHAIN (lv76-84): key-gated, day-only ----
  {
    id: 'wardenset_acorn',
    title: { es: 'El Susurro del Bosque', en: 'The Forest\'s Whisper' },
    desc: {
      es: 'El druida de Oakvale dice que el Treant Anciano del bosque profundo al norte solo confía en quien le trae corteza viva y esencia de planta. Gánate su Bellota del Guardián.',
      en: 'Oakvale\'s druid says the Ancient Treant of the deep north forest trusts only those who bring living bark and plant essence. Earn its Warden\'s Acorn.',
    },
    giverNpc: 'oakvale_druid', city: 'oakvale', minLevel: 70,
    objectives: [
      { type: 'collect', target: 'living-bark', count: 30, desc: { es: 'Reúne 30 corteza viva (bosque al norte)', en: 'Collect 30 living bark (forest to the north)' } },
      { type: 'collect', target: 'plant-essence', count: 30, desc: { es: 'Reúne 30 esencia de planta', en: 'Collect 30 plant essence' } },
      { type: 'kill', target: 'treant', count: 12, desc: { es: 'Mata 12 treants', en: 'Kill 12 treants' } },
    ],
    rewards: { gold: 6000, exp: 16000, items: ['warden-acorn'] },
    next: 'wardenset_grove', repeatable: false, dungeon: null,
  },
  {
    id: 'wardenset_grove',
    title: { es: 'La Arboleda del Guardián', en: "The Warden's Grove" },
    desc: {
      es: 'Con la Bellota del Guardián, la arboleda secreta se abre solo a la luz del día. Protégela de los que la corrompen y vístete con su corteza.',
      en: 'With the Warden\'s Acorn, the secret grove opens only by daylight. Defend it from those who corrupt it, and wear its bark.',
    },
    giverNpc: 'oakvale_druid', city: 'oakvale', minLevel: 84,
    dayOnly: true,
    requiresItems: [{ itemId: 'warden-acorn', count: 1 }],
    objectives: [
      { type: 'kill', target: 'treant', count: 18, desc: { es: 'Mata 18 treants corruptos', en: 'Kill 18 corrupt treants' } },
      { type: 'kill', target: 'mushroom', count: 20, desc: { es: 'Mata 20 hongos', en: 'Kill 20 mushrooms' } },
    ],
    rewards: { gold: 14000, exp: 50000, items: ['warden_helmet', 'warden_armor', 'warden_legs'] },
    next: 'wardenset_shield', repeatable: false, dungeon: null,
  },
  {
    id: 'wardenset_shield',
    title: { es: 'El Escudo del Guardián', en: "The Warden's Shield" },
    desc: {
      es: 'Para sellar el conjunto, el druida talla un escudo de madera viva con el corazón mismo del bosque. Tráeselo.',
      en: 'To seal the set, the druid carves a living-wood shield from the forest\'s very heart. Bring it to him.',
    },
    giverNpc: 'oakvale_druid', city: 'oakvale', minLevel: 76,
    requiresItems: [{ itemId: 'warden-acorn', count: 1 }],
    objectives: [
      { type: 'collect', target: 'heart-of-the-forest', count: 2, desc: { es: 'Reúne 2 corazones del bosque', en: 'Collect 2 hearts of the forest' } },
      { type: 'kill', target: 'treant', count: 10, desc: { es: 'Mata 10 treants', en: 'Kill 10 treants' } },
    ],
    rewards: { gold: 9000, exp: 24000, items: ['vine_shield'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ---- THE FROST (glacial) SET CHAIN (lv70-76): Frost Heart key, far north ----
  {
    id: 'frostset_heart',
    title: { es: 'El Corazón de Escarcha', en: 'The Frost Heart' },
    desc: {
      es: 'La Guarida Glacial del extremo norte está sellada por hielo eterno. Reúne polvo helado y esquirlas para que el capataz funda un Corazón de Escarcha que rompa el sello.',
      en: 'The Glacial Lair of the far north is sealed by eternal ice. Gather frost dust and shards so the foreman can cast a Frost Heart that breaks the seal.',
    },
    giverNpc: 'frostpeak_foreman', city: 'frostpeak', minLevel: 70,
    objectives: [
      { type: 'collect', target: 'frost-dust', count: 80, desc: { es: 'Reúne 80 polvo helado (extremo norte)', en: 'Collect 80 frost dust (far north)' } },
      { type: 'collect', target: 'frost-shard', count: 20, desc: { es: 'Reúne 20 esquirlas heladas', en: 'Collect 20 frost shards' } },
    ],
    rewards: { gold: 6000, exp: 16000, items: ['frost-heart'] },
    next: 'frostset_lair', repeatable: false, dungeon: null,
  },
  {
    id: 'frostset_lair',
    title: { es: 'La Guarida Glacial', en: 'The Glacial Lair' },
    desc: {
      es: 'Con el Corazón de Escarcha, el hielo cede. Dentro aguardan dragones de hielo y su tesoro: la armadura glacial completa. El frío muerde más de noche.',
      en: 'With the Frost Heart, the ice yields. Within wait ice dragons and their hoard: the full glacial set. The cold bites harder at night.',
    },
    giverNpc: 'frostpeak_foreman', city: 'frostpeak', minLevel: 76,
    nightOnly: true,
    requiresItems: [{ itemId: 'frost-heart', count: 1 }],
    objectives: [
      { type: 'kill', target: 'dragon', count: 6, desc: { es: 'Mata 6 dragones de hielo', en: 'Kill 6 ice dragons' } },
      { type: 'kill', target: 'golem', count: 15, desc: { es: 'Mata 15 gólems de hielo', en: 'Kill 15 ice golems' } },
    ],
    rewards: { gold: 16000, exp: 55000, items: ['frost_armor', 'frost_helmet', 'frost_legs', 'frost_boots'] },
    next: 'frostset_relics', repeatable: false, dungeon: null,
  },
  {
    id: 'frostset_relics',
    title: { es: 'Reliquias Glaciales', en: 'Glacial Relics' },
    desc: {
      es: 'Quedan dos reliquias en el fondo de la guarida: un amuleto y un bastón tallados en hielo eterno. Vuelve por ellos.',
      en: 'Two relics remain at the bottom of the lair: an amulet and a staff carved from eternal ice. Go back for them.',
    },
    giverNpc: 'frostpeak_explorer', city: 'frostpeak', minLevel: 70,
    requiresItems: [{ itemId: 'frost-heart', count: 1 }],
    objectives: [
      { type: 'collect', target: 'crystal', count: 12, desc: { es: 'Reúne 12 cristales', en: 'Collect 12 crystals' } },
      { type: 'kill', target: 'dragon', count: 4, desc: { es: 'Mata 4 dragones de hielo', en: 'Kill 4 ice dragons' } },
    ],
    rewards: { gold: 10000, exp: 30000, items: ['frost_amulet', 'glacial_staff'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ---- THE ORC QUEEN'S PENDANT (the user's exact example) lv60 ----
  {
    id: 'orcqueen_rumor',
    title: { es: 'El Pendiente Robado', en: 'The Stolen Pendant' },
    desc: {
      es: 'Corre el rumor de que los troles del oeste de Oakvale robaron un pendiente valiosísimo a la reina de los orcos, y por eso ambos están en guerra. Asalta el campamento troll y arrebátaselo.',
      en: 'Rumor has it the trolls west of Oakvale stole a priceless pendant from the orc queen — and that\'s why the two are at war. Raid the troll camp and take it.',
    },
    giverNpc: 'oakvale_forager', city: 'oakvale', minLevel: 32,
    objectives: [
      { type: 'reach', target: 'trollcave', count: 1, desc: { es: 'Llega al campamento troll (oeste de Oakvale)', en: 'Reach the troll camp (west of Oakvale)' } },
      { type: 'kill', target: 'troll', count: 20, desc: { es: 'Mata 20 troles', en: 'Kill 20 trolls' } },
    ],
    rewards: { gold: 1800, exp: 5000, items: ['orc-queen-token'] },
    next: 'orcqueen_return', repeatable: false, dungeon: 'trollcave',
  },
  {
    id: 'orcqueen_return',
    title: { es: 'La Tregua de la Reina', en: "The Queen's Truce" },
    desc: {
      es: 'Llevas el Pendiente de la Reina Orca. Si se lo devuelves a la horda en su territorio al este, quizá ganes su favor… y su armadura de placas. Pero primero debes probar tu fuerza ante ellos.',
      en: 'You carry the Orc Queen\'s Pendant. Return it to the horde in their territory to the east and you may earn their favor — and their plate. But first prove your strength to them.',
    },
    giverNpc: 'oakvale_forager', city: 'oakvale', minLevel: 20,
    requiresItems: [{ itemId: 'orc-queen-token', count: 1 }],
    objectives: [
      { type: 'kill', target: 'orc', count: 25, desc: { es: 'Demuestra tu fuerza: mata 25 orcos (al este)', en: 'Prove your strength: kill 25 orcs (to the east)' } },
    ],
    rewards: { gold: 2500, exp: 7000, items: ['plate_armor', 'plate_legs'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ---- HIGH-END WEAPONS (lv60-90): key-gated / chains, hint-led ----
  {
    id: 'gear_stonecutter_axe',
    title: { es: 'El Hacha Tajapiedras', en: 'The Stonecutter Axe' },
    desc: {
      es: 'En las minas de los enanos al sureste, el Geomante enano blande un hacha que parte la roca. Pocos vuelven de allí; menos aún con el hacha.',
      en: 'In the dwarf mines to the south-east, the dwarf Geomancer wields an axe that splits stone. Few return from there; fewer still with the axe.',
    },
    giverNpc: 'stonehaven_miner', city: 'stonehaven', minLevel: 60,
    objectives: [
      { type: 'kill', target: 'dwarf', count: 25, desc: { es: 'Mata 25 enanos (minas al sureste)', en: 'Kill 25 dwarves (mines to the south-east)' } },
      { type: 'collect', target: 'iron-ore', count: 30, desc: { es: 'Reúne 30 mineral de hierro', en: 'Collect 30 iron ore' } },
    ],
    rewards: { gold: 7000, exp: 18000, items: ['stonecutter_axe'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_warlord_sword',
    title: { es: 'La Espada del Señor de la Guerra', en: 'The Warlord Sword' },
    desc: {
      es: 'El Señor de la Guerra orco, el más fiero del territorio al este, porta una espada legendaria a dos manos. Solo cae ante un verdadero campeón. Reúne polvo de orco para forzar su guarida.',
      en: 'The orc Warlord, fiercest of the eastern territory, bears a legendary two-handed sword. He falls only to a true champion. Gather orc dust to force his lair.',
    },
    giverNpc: 'stonehaven_king', city: 'stonehaven', minLevel: 70,
    objectives: [
      { type: 'collect', target: 'orc-dust', count: 100, desc: { es: 'Reúne 100 polvo de orco (territorio al este)', en: 'Collect 100 orc dust (territory to the east)' } },
      { type: 'kill', target: 'orc', count: 40, desc: { es: 'Mata 40 orcos', en: 'Kill 40 orcs' } },
    ],
    rewards: { gold: 12000, exp: 35000, items: ['warlord_sword'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_ravagers_axe',
    title: { es: 'El Hacha del Devastador', en: "The Ravager's Axe" },
    desc: {
      es: 'Una reliquia bárbara enterrada con un campeón cíclope al este. El sabio cree que despertará si le ofrendas suficientes ojos de cíclope.',
      en: 'A barbaric relic buried with a cyclops champion to the east. The sage believes it will wake if you offer enough cyclops eyes.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 70,
    objectives: [
      { type: 'kill', target: 'cyclops', count: 18, desc: { es: 'Mata 18 cíclopes (al este del capital)', en: 'Kill 18 cyclopes (east of the capital)' } },
      { type: 'collect', target: 'cyclops-eye', count: 10, desc: { es: 'Reúne 10 ojos de cíclope', en: 'Collect 10 cyclops eyes' } },
    ],
    rewards: { gold: 12000, exp: 35000, items: ['ravagers_axe'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_hammer_of_wrath',
    title: { es: 'El Martillo de la Ira', en: 'The Hammer of Wrath' },
    desc: {
      es: 'El rey de Stonehaven custodia el secreto de un martillo divino. Solo lo forjará para quien limpie por completo el fuerte orco al este de toda alimaña.',
      en: 'Stonehaven\'s king guards the secret of a divine hammer. He\'ll forge it only for one who fully cleanses the orc fort to the east of all vermin.',
    },
    giverNpc: 'stonehaven_king', city: 'stonehaven', minLevel: 75,
    objectives: [
      { type: 'reach', target: 'orcfort', count: 1, desc: { es: 'Entra al fuerte orco (al este)', en: 'Enter the orc fort (to the east)' } },
      { type: 'kill', target: 'orc', count: 30, desc: { es: 'Mata 30 orcos', en: 'Kill 30 orcs' } },
      { type: 'kill', target: 'goblin', count: 30, desc: { es: 'Mata 30 goblins', en: 'Kill 30 goblins' } },
    ],
    rewards: { gold: 14000, exp: 42000, items: ['hammer_of_wrath'] },
    next: null, repeatable: false, dungeon: 'orcfort',
  },
  {
    id: 'gear_dragon_bow',
    title: { es: 'El Arco del Dragón', en: 'The Dragon Bow' },
    desc: {
      es: 'Keeper Maren, en el faro de Westharbor al oeste, oyó de un arco tensado con tendón de dragón. Cázalos en las montañas del sur y tráele sus dientes.',
      en: 'Keeper Maren, at Westharbor\'s lighthouse to the west, heard of a bow strung with dragon sinew. Hunt them in the southern mountains and bring their teeth.',
    },
    giverNpc: 'westharbor_lighthouse', city: 'westharbor', minLevel: 80,
    objectives: [
      { type: 'kill', target: 'dragon', count: 10, desc: { es: 'Mata 10 dragones (montañas al sur)', en: 'Kill 10 dragons (southern mountains)' } },
      { type: 'collect', target: 'dragon-tooth', count: 12, desc: { es: 'Reúne 12 dientes de dragón', en: 'Collect 12 dragon teeth' } },
    ],
    rewards: { gold: 16000, exp: 48000, items: ['dragon_bow'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_void_wand',
    title: { es: 'La Varita del Vacío', en: 'The Void Wand' },
    desc: {
      es: 'El lorekeeper de Stonehaven persigue una varita que canaliza la nada. Su esencia se esconde entre los espectros y wraiths de la cripta al sureste. Reúne ectoplasma y gemas de alma.',
      en: 'Stonehaven\'s lorekeeper chases a wand that channels the void. Its essence hides among the wraiths of the crypt to the south-east. Gather ectoplasm and soul gems.',
    },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 95,
    objectives: [
      { type: 'kill', target: 'wraith', count: 20, desc: { es: 'Mata 20 wraiths (cripta al sureste)', en: 'Kill 20 wraiths (crypt to the south-east)' } },
      { type: 'collect', target: 'soul-gem', count: 4, desc: { es: 'Reúne 4 gemas de alma', en: 'Collect 4 soul gems' } },
    ],
    rewards: { gold: 18000, exp: 60000, items: ['void_wand'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_soul_reaver',
    title: { es: 'El Segador de Almas', en: 'The Soul Reaver' },
    desc: {
      es: 'Una espada que bebe almas, sellada en la cripta más profunda al sureste. El lorekeeper traza una Linterna de Tumba para guiarte entre los muertos.',
      en: 'A soul-drinking sword, sealed in the deepest crypt to the south-east. The lorekeeper traces a Grave Lantern to guide you among the dead.',
    },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 90,
    objectives: [
      { type: 'collect', target: 'undead-dust', count: 80, desc: { es: 'Reúne 80 polvo de los muertos', en: 'Collect 80 undead dust' } },
      { type: 'collect', target: 'ectoplasm', count: 20, desc: { es: 'Reúne 20 ectoplasma', en: 'Collect 20 ectoplasm' } },
    ],
    rewards: { gold: 9000, exp: 26000, items: ['grave-lantern'] },
    next: 'gear_soul_reaver_2', repeatable: false, dungeon: null,
  },
  {
    id: 'gear_soul_reaver_2',
    title: { es: 'El Segador Despierta', en: 'The Reaver Wakes' },
    desc: {
      es: 'Con la Linterna de Tumba en alto, los muertos te dejan pasar al sepulcro sellado. Solo de noche se abre. Reclama la hoja que bebe almas.',
      en: 'With the Grave Lantern raised, the dead let you into the sealed sepulchre. It opens only at night. Claim the soul-drinking blade.',
    },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 105,
    nightOnly: true,
    requiresItems: [{ itemId: 'grave-lantern', count: 1 }],
    objectives: [
      { type: 'reach', target: 'undeadcrypt', count: 1, desc: { es: 'Entra al sepulcro sellado (cripta al sureste)', en: 'Enter the sealed sepulchre (crypt to the south-east)' } },
      { type: 'kill', target: 'wraith', count: 18, desc: { es: 'Mata 18 wraiths', en: 'Kill 18 wraiths' } },
    ],
    rewards: { gold: 24000, exp: 90000, items: ['soul_reaver'] },
    next: null, repeatable: false, dungeon: 'undeadcrypt',
  },

  // ---- THE PHOENIX RELICS (lv95-105): Phoenix Feather key, fire-themed ----
  {
    id: 'phoenix_feather_quest',
    title: { es: 'La Pluma de Fénix', en: 'The Phoenix Feather' },
    desc: {
      es: 'Flamekeeper Ren susurra que un fénix renace entre los demonios del Abismo al suroeste. Reúne esquirlas infernales y núcleos de magma para atraerlo y arrancarle una pluma.',
      en: 'Flamekeeper Ren whispers that a phoenix is reborn among the demons of the Abyss to the south-west. Gather hellfire shards and magma cores to lure it and pluck a feather.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 90,
    objectives: [
      { type: 'collect', target: 'hellfire-shard', count: 30, desc: { es: 'Reúne 30 esquirlas infernales (Abismo al suroeste)', en: 'Collect 30 hellfire shards (Abyss to the south-west)' } },
      { type: 'collect', target: 'magma-core', count: 15, desc: { es: 'Reúne 15 núcleos de magma', en: 'Collect 15 magma cores' } },
    ],
    rewards: { gold: 10000, exp: 30000, items: ['phoenix-feather'] },
    next: 'phoenix_relics', repeatable: false, dungeon: null,
  },
  {
    id: 'phoenix_relics',
    title: { es: 'Las Reliquias del Fénix', en: 'The Phoenix Relics' },
    desc: {
      es: 'La Pluma de Fénix arde en tu mano. Su luz revela el altar oculto entre las llamas del Abismo. Reclama el arco, el escudo y el amuleto del fénix.',
      en: 'The Phoenix Feather burns in your hand. Its light reveals the hidden altar amid the flames of the Abyss. Claim the phoenix bow, shield and amulet.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 105,
    requiresItems: [{ itemId: 'phoenix-feather', count: 1 }],
    objectives: [
      { type: 'kill', target: 'demon', count: 15, desc: { es: 'Mata 15 demonios', en: 'Kill 15 demons' } },
      { type: 'kill', target: 'imp', count: 25, desc: { es: 'Mata 25 diablillos', en: 'Kill 25 imps' } },
    ],
    rewards: { gold: 26000, exp: 95000, items: ['phoenix_bow', 'phoenix_shield', 'phoenix_amulet'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ---- THE ABYSSAL (demon-tier) WEAPONS (lv100-115): hardest non-secret ----
  {
    id: 'gear_demon_axe',
    title: { es: 'El Hacha Demoníaca', en: 'The Demon Axe' },
    desc: {
      es: 'Solo de noche, cuando el Abismo al suroeste hierve, los Señores Demonio empuñan hachas de fuego infernal. Soborna al sabueso con un Hueso de Demonio y arráncasela.',
      en: 'Only at night, when the Abyss to the south-west boils, the Demon Lords wield axes of hellfire. Bribe the hound with a Demon Bone and tear one free.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 100,
    nightOnly: true,
    requiresItems: [{ itemId: 'demon-bone', count: 1 }],
    objectives: [
      { type: 'kill', target: 'demon', count: 20, desc: { es: 'Mata 20 demonios', en: 'Kill 20 demons' } },
    ],
    rewards: { gold: 22000, exp: 90000, items: ['demon_axe'] },
    next: null, repeatable: false, dungeon: 'demonabyss',
  },
  {
    id: 'gear_abyssal_plate',
    title: { es: 'La Placa Abisal', en: 'The Abyssal Plate' },
    desc: {
      es: 'Más profundo que el trono del Señor Demonio yace una forja abisal. El lorekeeper traza un Sigilo Abisal; sin él, el calor te consume antes de llegar.',
      en: 'Deeper than the Demon Lord\'s throne lies an abyssal forge. The lorekeeper traces an Abyssal Sigil; without it the heat consumes you before you arrive.',
    },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 115,
    requiresItems: [{ itemId: 'abyssal-sigil', count: 1 }],
    objectives: [
      { type: 'reach', target: 'demonabyss', count: 1, desc: { es: 'Desciende a la forja abisal (Abismo al suroeste)', en: 'Descend to the abyssal forge (Abyss to the south-west)' } },
      { type: 'kill', target: 'demon', count: 30, desc: { es: 'Mata 30 demonios', en: 'Kill 30 demons' } },
    ],
    rewards: { gold: 35000, exp: 150000, items: ['abyssal_armor', 'abyssal_legs'] },
    next: null, repeatable: false, dungeon: 'demonabyss',
  },
  {
    id: 'gear_abyssal_helm',
    title: { es: 'El Yelmo Abisal', en: 'The Abyssal Helmet' },
    desc: {
      es: 'El yelmo abisal corona el conjunto más oscuro. Lo guarda un demonio que solo se manifiesta de noche en lo más hondo del Abismo. Lleva el Sigilo.',
      en: 'The abyssal helmet crowns the darkest set. A demon that manifests only at night in the deepest Abyss keeps it. Carry the Sigil.',
    },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 110,
    nightOnly: true,
    requiresItems: [{ itemId: 'abyssal-sigil', count: 1 }],
    objectives: [
      { type: 'kill', target: 'demon', count: 25, desc: { es: 'Mata 25 demonios', en: 'Kill 25 demons' } },
      { type: 'kill', target: 'imp', count: 30, desc: { es: 'Mata 30 diablillos', en: 'Kill 30 imps' } },
    ],
    rewards: { gold: 30000, exp: 130000, items: ['demon_helmet2'] },
    next: null, repeatable: false, dungeon: 'demonabyss',
  },
  {
    id: 'gear_staff_of_chaos',
    title: { es: 'El Bastón del Caos', en: 'The Staff of Chaos' },
    desc: {
      es: 'El sabio teme nombrar este bastón. Su poder mana de los elementales más salvajes y de un dragón de tres cabezas que vaga por las montañas del sur. Reúne esencias.',
      en: 'The sage dreads naming this staff. Its power flows from the wildest elementals and a three-headed dragon that roams the southern mountains. Gather essences.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 110,
    objectives: [
      { type: 'collect', target: 'storm-essence', count: 15, desc: { es: 'Reúne 15 esencia de tormenta', en: 'Collect 15 storm essence' } },
      { type: 'collect', target: 'fire-essence', count: 15, desc: { es: 'Reúne 15 esencia de fuego', en: 'Collect 15 fire essence' } },
      { type: 'kill', target: 'dragon', count: 8, desc: { es: 'Mata 8 dragones (incluido el de 3 cabezas)', en: 'Kill 8 dragons (incl. the three-headed one)' } },
    ],
    rewards: { gold: 28000, exp: 120000, items: ['staff_of_chaos'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_aegis_shield',
    title: { es: 'La Égida', en: 'The Aegis' },
    desc: {
      es: 'Un escudo invencible forjado por gigantes. El rey de Stonehaven dice que su molde se perdió con los cíclopes herreros al este. Reconstrúyelo con hierro y acero arrancado a sus manos.',
      en: 'An invincible shield forged by giants. Stonehaven\'s king says its mold was lost with the cyclops smiths to the east. Rebuild it from iron and steel torn from their hands.',
    },
    giverNpc: 'stonehaven_king', city: 'stonehaven', minLevel: 112,
    objectives: [
      { type: 'kill', target: 'cyclops', count: 25, desc: { es: 'Mata 25 cíclopes (al este)', en: 'Kill 25 cyclopes (to the east)' } },
      { type: 'collect', target: 'iron-ore', count: 40, desc: { es: 'Reúne 40 mineral de hierro', en: 'Collect 40 iron ore' } },
    ],
    rewards: { gold: 30000, exp: 130000, items: ['aegis_shield'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_apocalypse_axe',
    title: { es: 'El Hacha del Apocalipsis', en: 'The Apocalypse Axe' },
    desc: {
      es: 'La leyenda dice que esta hacha cayó del cielo en llamas sobre el Abismo. Solo quien porte el Sigilo Abisal puede recuperarla del corazón del fuego.',
      en: 'Legend says this axe fell from the burning sky onto the Abyss. Only one bearing the Abyssal Sigil can recover it from the heart of the fire.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 118,
    requiresItems: [{ itemId: 'abyssal-sigil', count: 1 }],
    objectives: [
      { type: 'kill', target: 'demon', count: 30, desc: { es: 'Mata 30 demonios (Abismo al suroeste)', en: 'Kill 30 demons (Abyss to the south-west)' } },
      { type: 'collect', target: 'hellfire-shard', count: 40, desc: { es: 'Reúne 40 esquirlas infernales', en: 'Collect 40 hellfire shards' } },
    ],
    rewards: { gold: 40000, exp: 170000, items: ['apocalypse_axe'] },
    next: null, repeatable: false, dungeon: 'demonabyss',
  },
  {
    id: 'gear_eternal_bow',
    title: { es: 'El Arco Eterno', en: 'The Eternal Bow' },
    desc: {
      es: 'Scout Nima rastreó un arco que nunca se rompe hasta el dragón de cristal de la Guarida Glacial, en el extremo norte. Necesitarás una escama cristalina para tensarlo.',
      en: 'Scout Nima tracked a bow that never breaks to the crystal dragon of the Glacial Lair, in the far north. You\'ll need a crystal scale to string it.',
    },
    giverNpc: 'dragonreach_scout', city: 'dragonreach', minLevel: 118,
    objectives: [
      { type: 'kill', target: 'crystal_dragon', count: 4, desc: { es: 'Mata 4 dragones de cristal (Guarida Glacial, norte)', en: 'Kill 4 crystal dragons (Glacial Lair, north)' } },
      { type: 'collect', target: 'crystal-scale', count: 2, desc: { es: 'Reúne 2 escamas cristalinas', en: 'Collect 2 crystal scales' } },
    ],
    rewards: { gold: 42000, exp: 175000, items: ['eternal_bow'] },
    next: null, repeatable: false, dungeon: 'glaciallair',
  },
  {
    id: 'gear_cosmic_staff',
    title: { es: 'El Bastón Cósmico', en: 'The Cosmic Staff' },
    desc: {
      es: 'El bastón más poderoso que un mortal puede empuñar. El sabio dice que solo aparece cuando todas las amenazas del mundo han probado tu valía: dragones, demonios y el hielo eterno.',
      en: 'The mightiest staff a mortal may wield. The sage says it appears only once every threat in the world has tested you: dragons, demons and the eternal ice.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 130,
    requiresItems: [{ itemId: 'abyssal-sigil', count: 1 }, { itemId: 'frost-heart', count: 1 }],
    objectives: [
      { type: 'kill', target: 'demon', count: 25, desc: { es: 'Mata 25 demonios', en: 'Kill 25 demons' } },
      { type: 'kill', target: 'dragon', count: 15, desc: { es: 'Mata 15 dragones', en: 'Kill 15 dragons' } },
      { type: 'kill', target: 'crystal_dragon', count: 3, desc: { es: 'Mata 3 dragones de cristal', en: 'Kill 3 crystal dragons' } },
    ],
    rewards: { gold: 60000, exp: 300000, items: ['cosmic_staff'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_hermes_boots',
    title: { es: 'Las Botas de Hermes', en: 'The Boots of Hermes' },
    desc: {
      es: 'Botas que rozan el viento. Caravaneer Rashid jura que un genio Efreet del desierto al este las esconde. Solo de día, bajo el sol abrasador, se le puede arrebatar.',
      en: 'Boots that skim the wind. Caravaneer Rashid swears an Efreet genie of the eastern desert hides them. Only by day, under the scorching sun, can they be taken.',
    },
    giverNpc: 'sandport_caravan', city: 'sandport', minLevel: 105,
    dayOnly: true,
    objectives: [
      { type: 'kill', target: 'mage', count: 18, desc: { es: 'Mata 18 genios/magos (desierto al este)', en: 'Kill 18 genies/mages (desert to the east)' } },
      { type: 'collect', target: 'fire-essence', count: 20, desc: { es: 'Reúne 20 esencia de fuego', en: 'Collect 20 fire essence' } },
    ],
    rewards: { gold: 26000, exp: 95000, items: ['hermes_boots'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ---- ROYAL QUIVER (archer) lv90 ----
  {
    id: 'gear_royal_quiver',
    title: { es: 'El Carcaj Real', en: 'The Royal Quiver' },
    desc: {
      es: 'Harbormaster Quill de Westharbor, al oeste, sabe de un carcaj real perdido en el bosque élfico al norte de Oakvale. Los elfos arcanistas lo custodian.',
      en: 'Harbormaster Quill of Westharbor, to the west, knows of a royal quiver lost in the elven forest north of Oakvale. The elf arcanists guard it.',
    },
    giverNpc: 'westharbor_harbormaster', city: 'westharbor', minLevel: 90,
    objectives: [
      { type: 'kill', target: 'elf', count: 30, desc: { es: 'Mata 30 elfos (bosque al norte de Oakvale)', en: 'Kill 30 elves (forest north of Oakvale)' } },
    ],
    rewards: { gold: 18000, exp: 55000, items: ['quiver_royal'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ---- MASTER RINGS (lv50): one short job per ring line, various cities ----
  {
    id: 'gear_ring_sword',
    title: { es: 'Anillo de la Espada Maestra', en: 'Master Sword Ring' },
    desc: {
      es: 'La Runesmith de Stonehaven graba anillos de maestría. Por el de espada, prueba tu acero contra los caballeros caídos de las montañas al sur.',
      en: 'Stonehaven\'s runesmith etches mastery rings. For the sword ring, prove your steel against the fallen knights of the southern mountains.',
    },
    giverNpc: 'stonehaven_smith', city: 'stonehaven', minLevel: 50,
    objectives: [
      { type: 'kill', target: 'knight', count: 14, desc: { es: 'Mata 14 caballeros caídos (montañas al sur)', en: 'Kill 14 fallen knights (southern mountains)' } },
    ],
    rewards: { gold: 6000, exp: 14000, items: ['sword_ring3'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_ring_axe',
    title: { es: 'Anillo del Hacha Maestra', en: 'Master Axe Ring' },
    desc: {
      es: 'Por el anillo del hacha, demuestra tu fuerza bruta contra los ogros y cíclopes al este del capital.',
      en: 'For the axe ring, show your brute strength against the ogres and cyclopes east of the capital.',
    },
    giverNpc: 'stonehaven_smith', city: 'stonehaven', minLevel: 50,
    objectives: [
      { type: 'kill', target: 'ogre', count: 14, desc: { es: 'Mata 14 ogros (al este)', en: 'Kill 14 ogres (to the east)' } },
      { type: 'kill', target: 'cyclops', count: 6, desc: { es: 'Mata 6 cíclopes', en: 'Kill 6 cyclopes' } },
    ],
    rewards: { gold: 6000, exp: 14000, items: ['axe_ring3'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_ring_distance',
    title: { es: 'Anillo del Francotirador', en: 'Sharpshooter Ring' },
    desc: {
      es: 'La cazadora de Oakvale forja el anillo del arquero para quien abata wyverns en vuelo sobre las montañas del sur.',
      en: 'Oakvale\'s hunter forges the archer\'s ring for one who downs wyverns in flight over the southern mountains.',
    },
    giverNpc: 'oakvale_hunter', city: 'oakvale', minLevel: 50,
    objectives: [
      { type: 'kill', target: 'wyvern', count: 14, desc: { es: 'Abate 14 wyverns (montañas al sur)', en: 'Down 14 wyverns (southern mountains)' } },
    ],
    rewards: { gold: 6000, exp: 14000, items: ['distance_ring3'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_ring_mage',
    title: { es: 'Anillo del Archimago', en: 'Archmage Ring' },
    desc: {
      es: 'El sabio de Dragonreach engarza el anillo arcano para quien derrote a los archimagos y cultistas del Abismo al suroeste.',
      en: 'Dragonreach\'s sage sets the arcane ring for one who defeats the archmages and cultists of the Abyss to the south-west.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 50,
    objectives: [
      { type: 'kill', target: 'mage', count: 14, desc: { es: 'Mata 14 magos/archimagos', en: 'Kill 14 mages/archmages' } },
      { type: 'kill', target: 'cultist', count: 10, desc: { es: 'Mata 10 cultistas (Abismo al suroeste)', en: 'Kill 10 cultists (Abyss to the south-west)' } },
    ],
    rewards: { gold: 6000, exp: 14000, items: ['mage_ring3'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_ring_vigor',
    title: { es: 'Anillo del Vigor y la Sabiduría', en: 'Rings of Vigor & Sage' },
    desc: {
      es: 'El sacerdote de Dragonreach bendice anillos de vida y maná para quien purgue a los no-muertos de la cripta al sureste. Trae polvo de necrópolis.',
      en: 'Dragonreach\'s priest blesses rings of life and mana for one who purges the undead of the crypt to the south-east. Bring necropolis dust.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 50,
    objectives: [
      { type: 'kill', target: 'skeleton', count: 20, desc: { es: 'Mata 20 esqueletos (cripta al sureste)', en: 'Kill 20 skeletons (crypt to the south-east)' } },
      { type: 'collect', target: 'undead-dust', count: 30, desc: { es: 'Reúne 30 polvo de los muertos', en: 'Collect 30 undead dust' } },
    ],
    rewards: { gold: 6000, exp: 14000, items: ['life_ring3', 'mana_ring3'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ---- LATE EPIC ROUNDOUTS (lv66-84): essences & themed hunts ----
  {
    id: 'gear_staff_blight',
    title: { es: 'El Bastón de la Plaga', en: 'The Staff of Blight' },
    desc: {
      es: 'Un bastón que pudre lo que toca, brotado del pantano de hidras al suroeste. Tráele al sabio glándulas de veneno de las criaturas del cieno.',
      en: 'A staff that rots what it touches, grown from the hydra swamp to the south-west. Bring the sage venom glands from the creatures of the mire.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 66,
    objectives: [
      { type: 'kill', target: 'hydra', count: 6, desc: { es: 'Mata 6 hidras (pantano al suroeste)', en: 'Kill 6 hydras (swamp to the south-west)' } },
      { type: 'collect', target: 'venom-gland', count: 12, desc: { es: 'Reúne 12 glándulas de veneno', en: 'Collect 12 venom glands' } },
    ],
    rewards: { gold: 7000, exp: 17000, items: ['staff_of_blight', 'venom_bow'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_storm_bow',
    title: { es: 'El Arco de Tormenta', en: 'The Storm Bow' },
    desc: {
      es: 'Las arpías de tormenta y los elementales de tormenta del este guardan el secreto de un arco que dispara rayos. Reúne sus esencias y forja un Tótem de Tormenta.',
      en: 'The storm harpies and storm elementals of the east keep the secret of a bow that fires lightning. Gather their essences and forge a Storm Totem.',
    },
    giverNpc: 'sandport_waterkeeper', city: 'sandport', minLevel: 62,
    objectives: [
      { type: 'kill', target: 'harpy', count: 14, desc: { es: 'Mata 14 arpías de tormenta', en: 'Kill 14 storm harpies' } },
      { type: 'collect', target: 'storm-essence', count: 12, desc: { es: 'Reúne 12 esencia de tormenta', en: 'Collect 12 storm essence' } },
    ],
    rewards: { gold: 7000, exp: 17000, items: ['storm_bow'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_reaper_scythe',
    title: { es: 'La Guadaña del Segador', en: 'The Reaper Scythe' },
    desc: {
      es: 'Una guadaña de planta que siega vidas, oculta entre los treants ancianos al norte del bosque. Solo de noche el segador la suelta.',
      en: 'A plant scythe that reaps lives, hidden among the ancient treants of the north forest. Only at night does the reaper let it go.',
    },
    giverNpc: 'oakvale_druid', city: 'oakvale', minLevel: 68,
    nightOnly: true,
    objectives: [
      { type: 'kill', target: 'treant', count: 16, desc: { es: 'Mata 16 treants (bosque al norte)', en: 'Kill 16 treants (forest to the north)' } },
      { type: 'collect', target: 'living-bark', count: 15, desc: { es: 'Reúne 15 corteza viva', en: 'Collect 15 living bark' } },
    ],
    rewards: { gold: 8000, exp: 20000, items: ['reaper_scythe', 'beast_cleaver'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_magma_axe',
    title: { es: 'El Hacha de Magma', en: 'The Magma Axe' },
    desc: {
      es: 'Forjada en magma vivo. Los elementales de magma y gólems de lava arden en las cuevas profundas al sureste. Tráele sus núcleos al herrero.',
      en: 'Forged in living magma. Magma elementals and lava golems burn in the deep caves to the south-east. Bring their cores to the smith.',
    },
    giverNpc: 'dragonreach_smith', city: 'dragonreach', minLevel: 65,
    objectives: [
      { type: 'kill', target: 'elemental', count: 14, desc: { es: 'Mata 14 elementales de magma', en: 'Kill 14 magma elementals' } },
      { type: 'collect', target: 'magma-core', count: 10, desc: { es: 'Reúne 10 núcleos de magma', en: 'Collect 10 magma cores' } },
    ],
    rewards: { gold: 7500, exp: 18000, items: ['magma_axe', 'staff_of_flames'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_titan_axe',
    title: { es: 'El Hacha del Titán', en: 'The Titan Axe' },
    desc: {
      es: 'Un hacha digna de titanes, enterrada en el campamento de cíclopes al este. El rey paga bien por ella; arráncasela al más grande.',
      en: 'An axe worthy of titans, buried in the cyclops camp to the east. The king pays well for it; pry it from the biggest one.',
    },
    giverNpc: 'stonehaven_king', city: 'stonehaven', minLevel: 75,
    objectives: [
      { type: 'kill', target: 'cyclops', count: 20, desc: { es: 'Mata 20 cíclopes (al este)', en: 'Kill 20 cyclopes (to the east)' } },
      { type: 'collect', target: 'cyclops-eye', count: 12, desc: { es: 'Reúne 12 ojos de cíclope', en: 'Collect 12 cyclops eyes' } },
    ],
    rewards: { gold: 9000, exp: 22000, items: ['titan_axe', 'mastermind_shield'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_hellforged',
    title: { es: 'La Hoja Forjada en el Infierno', en: 'The Hellforged Blade' },
    desc: {
      es: 'Una hoja templada en fuego demoníaco. Flamekeeper Ren la forjará si le traes cuernos de demonio y esquirlas infernales del Abismo al suroeste.',
      en: 'A blade tempered in demon fire. Flamekeeper Ren will forge it if you bring demon horns and hellfire shards from the Abyss to the south-west.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 72,
    objectives: [
      { type: 'collect', target: 'demon-horn', count: 10, desc: { es: 'Reúne 10 cuernos de demonio', en: 'Collect 10 demon horns' } },
      { type: 'collect', target: 'hellfire-shard', count: 15, desc: { es: 'Reúne 15 esquirlas infernales', en: 'Collect 15 hellfire shards' } },
    ],
    rewards: { gold: 9000, exp: 22000, items: ['hellforged_blade'] },
    next: null, repeatable: false, dungeon: null,
  },
  {
    id: 'gear_glacial_staff',
    title: { es: 'El Bastón Glacial', en: 'The Glacial Staff' },
    desc: {
      es: 'Un bastón de hielo puro. El explorador de Frostpeak sabe que late en el corazón de las arañas de cristal y los troles de escarcha del norte.',
      en: 'A staff of pure ice. Frostpeak\'s explorer knows it beats in the heart of the crystal spiders and frost trolls of the north.',
    },
    giverNpc: 'frostpeak_explorer', city: 'frostpeak', minLevel: 58,
    objectives: [
      { type: 'kill', target: 'spider', count: 18, desc: { es: 'Mata 18 arañas de cristal (norte)', en: 'Kill 18 crystal spiders (north)' } },
      { type: 'collect', target: 'frost-shard', count: 12, desc: { es: 'Reúne 12 esquirlas heladas', en: 'Collect 12 frost shards' } },
    ],
    rewards: { gold: 6000, exp: 15000, items: ['glacial_staff'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ---- DESERT / SUN line (lv60-72): Sun Scarab key, day-only ----
  {
    id: 'sun_scarab_quest',
    title: { es: 'El Escarabajo Solar', en: 'The Sun Scarab' },
    desc: {
      es: 'Water-keeper Zila cuenta que las tumbas del desierto al sureste solo se abren bajo el sol de mediodía. Reúne polvo del desierto y forja un Escarabajo Solar para entrar.',
      en: 'Water-keeper Zila tells that the desert tombs to the south-east open only under the noon sun. Gather desert dust and forge a Sun Scarab to enter.',
    },
    giverNpc: 'sandport_waterkeeper', city: 'sandport', minLevel: 60,
    objectives: [
      { type: 'collect', target: 'desert-dust', count: 60, desc: { es: 'Reúne 60 polvo del desierto (tumbas al sureste)', en: 'Collect 60 desert dust (tombs to the south-east)' } },
      { type: 'kill', target: 'scarab', count: 20, desc: { es: 'Mata 20 escarabajos', en: 'Kill 20 scarabs' } },
    ],
    rewards: { gold: 6000, exp: 16000, items: ['sun-scarab'] },
    next: 'sun_tomb', repeatable: false, dungeon: null,
  },
  {
    id: 'sun_tomb',
    title: { es: 'La Tumba del Sol', en: 'The Tomb of the Sun' },
    desc: {
      es: 'Con el Escarabajo Solar y la luz del día, la tumba se abre. Dentro, las momias guardan oro maldito y reliquias doradas. Sobrevive al calor.',
      en: 'With the Sun Scarab and daylight, the tomb opens. Within, mummies guard cursed gold and golden relics. Survive the heat.',
    },
    giverNpc: 'sandport_waterkeeper', city: 'sandport', minLevel: 60,
    dayOnly: true,
    requiresItems: [{ itemId: 'sun-scarab', count: 1 }],
    objectives: [
      { type: 'kill', target: 'zombie', count: 25, desc: { es: 'Mata 25 momias (tumbas al sureste)', en: 'Kill 25 mummies (tombs to the south-east)' } },
    ],
    rewards: { gold: 10000, exp: 28000, items: ['golden_backpack', 'sun-scarab'] },
    next: null, repeatable: false, dungeon: null,
  },

  // ###########################################################################
  // LONG PREREQUISITE CHAINS — new intermediate steps that turn the standalone
  // gear quests into deep, thematically-connected sagas. Depth scales with level:
  // lv40→~3 steps, lv60→~4-5, lv80→~6, lv100+→~7-8 before the payoff. Each step
  // belongs to one saga (descent into the Abyss, the dragon peaks, the frozen
  // north, the orc war, the cyclops forges, the fire of the Abyss…) and is wired
  // via `next` (auto-accepts the follow-up) + `requiresItems` key gates. The
  // payoff (gear) quests already exist; here we add the rungs that lead to them
  // and re-point the existing `next` links (see the re-link pass below).
  // ###########################################################################

  // ===== THE DESCENT INTO THE ABYSS (Demon + Abyssal endgame, 16-step spine) ==
  {
    id: 'abyss_chain_oath',
    title: { es: 'El Juramento del Abismo', en: 'The Oath of the Abyss' },
    desc: {
      es: 'El Guardallamas Ren dice que el Abismo hierve al suroeste, bajo Dragonreach. Antes de descender, jura ante la llama eterna y asómate a su boca.',
      en: 'Flamekeeper Ren says the Abyss boils to the south-west, beneath Dragonreach. Before descending, swear by the eternal flame and look upon its mouth.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 80,
    objectives: [
      { type: 'talk', target: 'dragonreach_keeper', count: 1, desc: { es: 'Escucha el juramento del Guardallamas', en: 'Hear the Flamekeeper\'s oath' } },
      { type: 'reach', target: 'demonabyss', count: 1, desc: { es: 'Asómate a la boca del Abismo (al suroeste)', en: 'Look upon the mouth of the Abyss (to the south-west)' } },
    ],
    rewards: { gold: 4000, exp: 25000, items: [] },
    next: 'abyss_chain_imp_cull', repeatable: false, dungeon: 'demonabyss',
  },
  {
    id: 'abyss_chain_imp_cull',
    title: { es: 'El Enjambre de Diablillos', en: 'The Imp Swarm' },
    desc: {
      es: 'Los diablillos brotan de las grietas del Abismo como chispas. Adelgaza el enjambre y trae sus cuernos como prueba.',
      en: 'Imps spill from the cracks of the Abyss like sparks. Thin the swarm and bring their horns as proof.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 82,
    objectives: [
      { type: 'kill', target: 'imp', count: 30, desc: { es: 'Mata 30 diablillos', en: 'Kill 30 imps' } },
      { type: 'collect', target: 'imp-horn', count: 12, desc: { es: 'Reúne 12 cuernos de diablillo', en: 'Collect 12 imp horns' } },
    ],
    rewards: { gold: 5000, exp: 30000, items: [] },
    next: 'abyss_chain_cultist_rite', repeatable: false, dungeon: null,
  },
  {
    id: 'abyss_chain_cultist_rite',
    title: { es: 'El Rito Profano', en: 'The Profane Rite' },
    desc: {
      es: 'Cultistas encapuchados alimentan la puerta infernal con cánticos. Siléncialos y quítales sus tomos prohibidos antes de cruzar.',
      en: 'Hooded cultists feed the infernal gate with chants. Silence them and take their forbidden tomes before you cross.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 85,
    objectives: [
      { type: 'kill', target: 'cultist', count: 25, desc: { es: 'Mata 25 cultistas', en: 'Kill 25 cultists' } },
      { type: 'collect', target: 'dark-tome', count: 8, desc: { es: 'Arrebata 8 tomos oscuros', en: 'Seize 8 dark tomes' } },
    ],
    rewards: { gold: 6000, exp: 35000, items: [] },
    next: 'dragonreach_demon_gate', repeatable: false, dungeon: null,
  },
  {
    id: 'abyss_chain_lesser_lords',
    title: { es: 'Los Demonios Menores', en: 'The Lesser Demons' },
    desc: {
      es: 'Más hondo que los diablillos aguardan demonios de pleno derecho. Demuestra que su fuego no te detiene y arráncales los cuernos.',
      en: 'Deeper than the imps wait full-fledged demons. Prove their fire doesn\'t stop you and tear off their horns.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 92,
    objectives: [
      { type: 'kill', target: 'demon', count: 15, desc: { es: 'Mata 15 demonios', en: 'Kill 15 demons' } },
      { type: 'collect', target: 'demon-horn', count: 10, desc: { es: 'Reúne 10 cuernos de demonio', en: 'Collect 10 demon horns' } },
      { type: 'collect', target: 'hellfire-shard', count: 15, desc: { es: 'Reúne 15 esquirlas infernales', en: 'Collect 15 hellfire shards' } },
    ],
    rewards: { gold: 9000, exp: 50000, items: [] },
    next: 'abyss_warlords', repeatable: false, dungeon: null,
  },
  {
    id: 'abyss_chain_descent_floors',
    title: { es: 'El Descenso a los Fosos', en: 'Descent into the Deep Floors' },
    desc: {
      es: 'El Hueso de Demonio aún calma al sabueso. Vuelve a bajar, pero esta vez hasta los fosos donde el aire mismo arde.',
      en: 'The Demon Bone still calms the hound. Go down again — but this time to the floors where the very air burns.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 98,
    requiresItems: [{ itemId: 'demon-bone', count: 1 }],
    objectives: [
      { type: 'reach', target: 'demonabyss', count: 1, desc: { es: 'Desciende a los fosos más hondos', en: 'Descend to the deepest floors' } },
      { type: 'kill', target: 'demon', count: 20, desc: { es: 'Mata 20 demonios', en: 'Kill 20 demons' } },
      { type: 'kill', target: 'imp', count: 20, desc: { es: 'Mata 20 diablillos', en: 'Kill 20 imps' } },
    ],
    rewards: { gold: 14000, exp: 70000, items: [] },
    next: 'gear_demon_axe', repeatable: false, dungeon: 'demonabyss',
  },
  {
    id: 'abyss_chain_abyssal_brand',
    title: { es: 'La Marca Abisal', en: 'The Abyssal Brand' },
    desc: {
      es: 'El Lorekeeper Havel, en Stonehaven al sur, ha leído el sello del trono. Más abajo que el trono hay una forja sellada con magia infernal; para abrirla necesitarás un Sigilo.',
      en: 'Lorekeeper Havel, in Stonehaven to the south, has read the throne\'s seal. Below the throne lies a forge sealed with infernal magic; to open it you\'ll need a Sigil.',
    },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 100,
    objectives: [
      { type: 'talk', target: 'stonehaven_lorekeeper', count: 1, desc: { es: 'Habla con el Lorekeeper Havel', en: 'Speak with Lorekeeper Havel' } },
      { type: 'collect', target: 'soul-gem', count: 3, desc: { es: 'Reúne 3 gemas de alma', en: 'Collect 3 soul gems' } },
      { type: 'kill', target: 'demon', count: 15, desc: { es: 'Mata 15 demonios', en: 'Kill 15 demons' } },
    ],
    rewards: { gold: 16000, exp: 80000, items: [] },
    next: 'abyssalsigil_forge', repeatable: false, dungeon: null,
  },

  // ===== THE DRAGON PEAKS (dragon line, pre-steps + weapon forks) ============
  {
    id: 'dragon_chain_peaks',
    title: { es: 'Vigía de los Picos', en: 'Watch of the Peaks' },
    desc: {
      es: 'Scout Nima vigila las montañas de dragones al sur. Antes de cazar wyverns, cruza el Paso de los Trolls que guarda la entrada.',
      en: 'Scout Nima watches the dragon mountains to the south. Before hunting wyverns, cross the Troll Pass that guards the way in.',
    },
    giverNpc: 'dragonreach_scout', city: 'dragonreach', minLevel: 40,
    objectives: [
      { type: 'reach', target: 'trollcave', count: 1, desc: { es: 'Cruza el Paso de los Trolls (al sur)', en: 'Cross the Troll Pass (to the south)' } },
      { type: 'kill', target: 'troll', count: 15, desc: { es: 'Mata 15 troles', en: 'Kill 15 trolls' } },
    ],
    rewards: { gold: 2500, exp: 8000, items: [] },
    next: 'dragon_chain_wyvern_hunt', repeatable: false, dungeon: 'trollcave',
  },
  {
    id: 'dragon_chain_wyvern_hunt',
    title: { es: 'Cazadores de Wyvern', en: 'Wyvern Hunters' },
    desc: {
      es: 'Los wyverns vuelan sobre los picos del sur, casi dragones. Abátelos y trae sus colmillos: el herrero los necesita para empezar.',
      en: 'Wyverns wheel over the southern peaks, almost dragons. Down them and bring their fangs: the smith needs them to begin.',
    },
    giverNpc: 'dragonreach_scout', city: 'dragonreach', minLevel: 44,
    objectives: [
      { type: 'kill', target: 'wyvern', count: 14, desc: { es: 'Abate 14 wyverns', en: 'Down 14 wyverns' } },
      { type: 'collect', target: 'wyvern-fang', count: 6, desc: { es: 'Reúne 6 colmillos de wyvern', en: 'Collect 6 wyvern fangs' } },
    ],
    rewards: { gold: 3500, exp: 11000, items: [] },
    next: 'gear_dragon_hammer', repeatable: false, dungeon: null,
  },
  {
    id: 'dragon_chain_seal_intro',
    title: { es: 'El Marcado por el Dragón', en: 'Marked by the Dragon' },
    desc: {
      es: 'El sabio puede marcarte con el sello del dragón, pero solo de día, cuando los dragones del sur duermen, podrás reunir su polvo sin que te calcinen.',
      en: 'The sage can mark you with the dragon\'s seal, but only by day, when the southern dragons sleep, can you gather their dust without being burned.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 55,
    dayOnly: true,
    objectives: [
      { type: 'collect', target: 'dragon-dust', count: 50, desc: { es: 'Reúne 50 polvo de dragón (montañas al sur)', en: 'Collect 50 dragon dust (mountains to the south)' } },
      { type: 'kill', target: 'dragon', count: 4, desc: { es: 'Mata 4 dragones', en: 'Kill 4 dragons' } },
    ],
    rewards: { gold: 4500, exp: 14000, items: [] },
    next: 'dragonseal_forge', repeatable: false, dungeon: null,
  },
  {
    id: 'dragon_chain_lord',
    title: { es: 'El Señor Dragón', en: 'The Dragon Lord' },
    desc: {
      es: 'Con el Sello del Dragón puedes entrar en lo más profundo de la guarida al sur, donde reina el Señor Dragón. Derróta a sus súbditos y arráncale los dientes.',
      en: 'With the Dragon Seal you may enter the deepest lair to the south, where the Dragon Lord reigns. Defeat his minions and tear out his teeth.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 78,
    requiresItems: [{ itemId: 'dragon-seal', count: 1 }],
    objectives: [
      { type: 'reach', target: 'dragonlair', count: 1, desc: { es: 'Entra a lo más profundo de la guarida (al sur)', en: 'Enter the deepest lair (to the south)' } },
      { type: 'kill', target: 'dragon', count: 10, desc: { es: 'Mata 10 dragones', en: 'Kill 10 dragons' } },
      { type: 'collect', target: 'dragon-tooth', count: 8, desc: { es: 'Reúne 8 dientes de dragón', en: 'Collect 8 dragon teeth' } },
    ],
    rewards: { gold: 12000, exp: 50000, items: [] },
    next: 'gear_dragon_bow', repeatable: false, dungeon: 'dragonlair',
  },
  {
    id: 'dragon_chain_chaos_hunt',
    title: { es: 'La Bestia de Tres Cabezas', en: 'The Three-Headed Beast' },
    desc: {
      es: 'Un dragón de tres cabezas vaga por las montañas del sur, fuente de un poder caótico. Reúne las esencias que deja a su paso para el bastón.',
      en: 'A three-headed dragon roams the southern mountains, the source of a chaotic power. Gather the essences it leaves in its wake for the staff.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 105,
    objectives: [
      { type: 'kill', target: 'dragon', count: 12, desc: { es: 'Mata 12 dragones (incl. el de 3 cabezas)', en: 'Kill 12 dragons (incl. the three-headed one)' } },
      { type: 'collect', target: 'storm-essence', count: 10, desc: { es: 'Reúne 10 esencia de tormenta', en: 'Collect 10 storm essence' } },
      { type: 'collect', target: 'fire-essence', count: 10, desc: { es: 'Reúne 10 esencia de fuego', en: 'Collect 10 fire essence' } },
    ],
    rewards: { gold: 18000, exp: 70000, items: [] },
    next: 'gear_staff_of_chaos', repeatable: false, dungeon: null,
  },

  // ===== THE FROZEN NORTH (frost line, pre-steps + weapon forks) =============
  {
    id: 'frost_chain_survive',
    title: { es: 'Sobrevivir al Frío', en: 'Surviving the Cold' },
    desc: {
      es: 'El explorador de Frostpeak no te dará nada hasta que sobrevivas al invierno. Las manadas hambrientas rondan el extremo norte.',
      en: 'Frostpeak\'s explorer gives you nothing until you survive the winter. Hungry packs roam the far north.',
    },
    giverNpc: 'frostpeak_explorer', city: 'frostpeak', minLevel: 24,
    objectives: [
      { type: 'kill', target: 'wolf', count: 12, desc: { es: 'Mata 12 lobos (al norte)', en: 'Kill 12 wolves (to the north)' } },
      { type: 'kill', target: 'bear', count: 6, desc: { es: 'Mata 6 osos', en: 'Kill 6 bears' } },
    ],
    rewards: { gold: 700, exp: 2200, items: [] },
    next: 'frost_chain_frost_dust', repeatable: false, dungeon: null,
  },
  {
    id: 'frost_chain_frost_dust',
    title: { es: 'Polvo de Escarcha', en: 'Frost Dust' },
    desc: {
      es: 'Para tocar las reliquias heladas sin congelarte, reúne polvo de escarcha de los troles de las cuevas heladas al norte.',
      en: 'To touch the frozen relics without freezing, gather frost dust from the trolls of the icy caves to the north.',
    },
    giverNpc: 'frostpeak_explorer', city: 'frostpeak', minLevel: 27,
    objectives: [
      { type: 'kill', target: 'troll', count: 12, desc: { es: 'Mata 12 troles de escarcha', en: 'Kill 12 frost trolls' } },
      { type: 'collect', target: 'frost-dust', count: 30, desc: { es: 'Reúne 30 polvo de escarcha', en: 'Collect 30 frost dust' } },
    ],
    rewards: { gold: 900, exp: 2800, items: [] },
    next: 'gear_ice_rapier', repeatable: false, dungeon: null,
  },
  {
    id: 'frost_chain_frozen_seal',
    title: { es: 'El Corazón del Gólem de Cristal', en: "The Crystal Golem's Heart" },
    desc: {
      es: 'Con el Corazón de Escarcha rota el sello de la guarida, busca el corazón de un gólem de cristal en las profundidades heladas del norte: se forja en un escudo que repele el fuego.',
      en: 'With the Frost Heart breaking the lair\'s seal, seek a crystal golem\'s heart in the frozen depths of the north: it forges into a shield that repels fire.',
    },
    giverNpc: 'frostpeak_explorer', city: 'frostpeak', minLevel: 64,
    requiresItems: [{ itemId: 'frost-heart', count: 1 }],
    objectives: [
      { type: 'kill', target: 'golem', count: 14, desc: { es: 'Mata 14 gólems de cristal', en: 'Kill 14 crystal golems' } },
      { type: 'collect', target: 'crystal', count: 8, desc: { es: 'Reúne 8 cristales', en: 'Collect 8 crystals' } },
    ],
    rewards: { gold: 5000, exp: 13000, items: [] },
    next: 'gear_frozen_shield', repeatable: false, dungeon: null,
  },

  // ===== THE ORC WAR (Stonehaven, royal armor → warlord → hammer) ============
  {
    id: 'orc_chain_warbanner',
    title: { es: 'El Estandarte de Guerra', en: 'The War Banner' },
    desc: {
      es: 'Portas el Pendiente de la Reina Orca: la horda del este te respeta a medias. El rey de Stonehaven quiere que rompas su estandarte de guerra para ganarte su placa real.',
      en: 'You carry the Orc Queen\'s Pendant: the eastern horde half-respects you. Stonehaven\'s king wants their war banner broken to earn his royal plate.',
    },
    giverNpc: 'stonehaven_king', city: 'stonehaven', minLevel: 50,
    requiresItems: [{ itemId: 'orc-queen-token', count: 1 }],
    objectives: [
      { type: 'kill', target: 'orc', count: 20, desc: { es: 'Mata 20 orcos (territorio al este)', en: 'Kill 20 orcs (territory to the east)' } },
      { type: 'collect', target: 'orc-dust', count: 40, desc: { es: 'Reúne 40 polvo de orco', en: 'Collect 40 orc dust' } },
    ],
    rewards: { gold: 4000, exp: 9000, items: [] },
    next: 'gear_royal_armor', repeatable: false, dungeon: null,
  },
  {
    id: 'orc_chain_eastern_front',
    title: { es: 'El Frente del Este', en: 'The Eastern Front' },
    desc: {
      es: 'La horda masa berserkers y brutos en el frente del este. Rómpelos antes de que marchen, y el rey te confiará la espada del Señor de la Guerra.',
      en: 'The horde masses berserkers and brutes on the eastern front. Break them before they march, and the king will entrust you with the Warlord\'s sword.',
    },
    giverNpc: 'stonehaven_king', city: 'stonehaven', minLevel: 68,
    objectives: [
      { type: 'kill', target: 'orc', count: 30, desc: { es: 'Mata 30 orcos (al este)', en: 'Kill 30 orcs (to the east)' } },
      { type: 'kill', target: 'ogre', count: 12, desc: { es: 'Mata 12 ogros', en: 'Kill 12 ogres' } },
      { type: 'collect', target: 'orc-dust', count: 60, desc: { es: 'Reúne 60 polvo de orco', en: 'Collect 60 orc dust' } },
    ],
    rewards: { gold: 6000, exp: 15000, items: [] },
    next: 'gear_warlord_sword', repeatable: false, dungeon: null,
  },
  {
    id: 'orc_chain_break_the_fort',
    title: { es: 'Romper el Fuerte', en: 'Break the Fort' },
    desc: {
      es: 'El rey forjará un martillo divino solo para quien limpie el fuerte orco al este de toda alimaña. Es la prueba final de la guerra.',
      en: 'The king forges a divine hammer only for one who cleanses the eastern orc fort of all vermin. It is the war\'s final trial.',
    },
    giverNpc: 'stonehaven_king', city: 'stonehaven', minLevel: 75,
    objectives: [
      { type: 'reach', target: 'orcfort', count: 1, desc: { es: 'Entra al fuerte orco (al este)', en: 'Enter the orc fort (to the east)' } },
      { type: 'kill', target: 'orc', count: 30, desc: { es: 'Mata 30 orcos', en: 'Kill 30 orcs' } },
      { type: 'kill', target: 'goblin', count: 30, desc: { es: 'Mata 30 goblins', en: 'Kill 30 goblins' } },
    ],
    rewards: { gold: 8000, exp: 20000, items: [] },
    next: 'gear_hammer_of_wrath', repeatable: false, dungeon: 'orcfort',
  },

  // ===== THE CYCLOPS FORGES (giant saga, ravager → titan → aegis) ===========
  {
    id: 'giant_chain_cyclops_smiths',
    title: { es: 'Los Herreros Cíclopes', en: 'The Cyclops Smiths' },
    desc: {
      es: 'Tras quebrar a los orcos, el rey te envía contra los cíclopes herreros del campamento al este. Sus reliquias bárbaras valen una fortuna.',
      en: 'Having broken the orcs, the king sends you against the cyclops smiths of the camp to the east. Their barbaric relics are worth a fortune.',
    },
    giverNpc: 'stonehaven_king', city: 'stonehaven', minLevel: 70,
    objectives: [
      { type: 'kill', target: 'cyclops', count: 18, desc: { es: 'Mata 18 cíclopes (al este)', en: 'Kill 18 cyclopes (to the east)' } },
      { type: 'collect', target: 'cyclops-eye', count: 10, desc: { es: 'Reúne 10 ojos de cíclope', en: 'Collect 10 cyclops eyes' } },
    ],
    rewards: { gold: 7000, exp: 17000, items: [] },
    next: 'gear_ravagers_axe', repeatable: false, dungeon: null,
  },
  {
    id: 'giant_chain_titan_trial',
    title: { es: 'La Prueba del Titán', en: "The Titan's Trial" },
    desc: {
      es: 'Para merecer un hacha digna de titanes, abate a los cíclopes más grandes del campamento al este y a sus brutos ogros.',
      en: 'To deserve an axe worthy of titans, fell the largest cyclopes of the eastern camp and their ogre brutes.',
    },
    giverNpc: 'stonehaven_king', city: 'stonehaven', minLevel: 82,
    objectives: [
      { type: 'kill', target: 'cyclops', count: 20, desc: { es: 'Mata 20 cíclopes', en: 'Kill 20 cyclopes' } },
      { type: 'kill', target: 'ogre', count: 6, desc: { es: 'Mata 6 ogros', en: 'Kill 6 ogres' } },
      { type: 'collect', target: 'cyclops-eye', count: 12, desc: { es: 'Reúne 12 ojos de cíclope', en: 'Collect 12 cyclops eyes' } },
    ],
    rewards: { gold: 9000, exp: 22000, items: [] },
    next: 'gear_titan_axe', repeatable: false, dungeon: null,
  },
  {
    id: 'giant_chain_giant_relic',
    title: { es: 'La Reliquia del Gigante', en: "The Giant's Relic" },
    desc: {
      es: 'El Lorekeeper Havel sabe que el molde de la Égida, un escudo invencible, se perdió con los cíclopes herreros. Recupera su sello de fundición del campamento al este.',
      en: 'Lorekeeper Havel knows the mold of the Aegis, an invincible shield, was lost with the cyclops smiths. Recover its casting-seal from the camp to the east.',
    },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 110,
    objectives: [
      { type: 'kill', target: 'cyclops', count: 25, desc: { es: 'Mata 25 cíclopes (al este)', en: 'Kill 25 cyclopes (to the east)' } },
      { type: 'collect', target: 'cyclops-eye', count: 12, desc: { es: 'Reúne 12 ojos de cíclope', en: 'Collect 12 cyclops eyes' } },
      { type: 'collect', target: 'iron-ore', count: 40, desc: { es: 'Reúne 40 mineral de hierro', en: 'Collect 40 iron ore' } },
    ],
    rewards: { gold: 12000, exp: 40000, items: ['giant-relic'] },
    next: 'giant_chain_aegis_forge', repeatable: false, dungeon: null,
  },
  {
    id: 'giant_chain_aegis_forge',
    title: { es: 'Reforjar la Égida', en: 'Reforge the Aegis' },
    desc: {
      es: 'Con la Reliquia del Gigante, el rey puede reforjar la Égida. Reúne el acero arrancado a los cíclopes y el hierro de las minas.',
      en: 'With the Giant\'s Relic, the king can reforge the Aegis. Gather the steel torn from cyclopes and the iron of the mines.',
    },
    giverNpc: 'stonehaven_king', city: 'stonehaven', minLevel: 112,
    requiresItems: [{ itemId: 'giant-relic', count: 1 }],
    objectives: [
      { type: 'kill', target: 'cyclops', count: 15, desc: { es: 'Mata 15 cíclopes', en: 'Kill 15 cyclopes' } },
      { type: 'collect', target: 'iron-ore', count: 40, desc: { es: 'Reúne 40 mineral de hierro', en: 'Collect 40 iron ore' } },
    ],
    rewards: { gold: 8000, exp: 30000, items: [] },
    next: 'gear_aegis_shield', repeatable: false, dungeon: null,
  },

  // ===== THE FIRE OF THE ABYSS (phoenix/fire saga, hellforged → hermes) =====
  {
    id: 'fire_chain_first_embers',
    title: { es: 'Las Primeras Brasas', en: 'First Embers' },
    desc: {
      es: 'Flamekeeper Ren tiempla las hojas en fuego demoníaco. Primero, prueba que el calor del Abismo al suroeste no te detiene: reúne esquirlas infernales.',
      en: 'Flamekeeper Ren tempers blades in demon fire. First, prove the heat of the Abyss to the south-west doesn\'t stop you: gather hellfire shards.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 72,
    objectives: [
      { type: 'collect', target: 'hellfire-shard', count: 30, desc: { es: 'Reúne 30 esquirlas infernales', en: 'Collect 30 hellfire shards' } },
      { type: 'kill', target: 'demon', count: 10, desc: { es: 'Mata 10 demonios (Abismo al suroeste)', en: 'Kill 10 demons (Abyss to the south-west)' } },
    ],
    rewards: { gold: 6000, exp: 16000, items: [] },
    next: 'gear_hellforged', repeatable: false, dungeon: null,
  },
  {
    id: 'fire_chain_living_magma',
    title: { es: 'Magma Viviente', en: 'Living Magma' },
    desc: {
      es: 'El herrero busca magma vivo para el hacha de magma. Los elementales y gólems de lava arden en las cuevas profundas al sureste.',
      en: 'The smith seeks living magma for the magma axe. Lava elementals and golems burn in the deep caves to the south-east.',
    },
    giverNpc: 'dragonreach_smith', city: 'dragonreach', minLevel: 78,
    objectives: [
      { type: 'kill', target: 'elemental', count: 14, desc: { es: 'Mata 14 elementales de magma', en: 'Kill 14 magma elementals' } },
      { type: 'kill', target: 'golem', count: 6, desc: { es: 'Mata 6 gólems de lava', en: 'Kill 6 lava golems' } },
      { type: 'collect', target: 'magma-core', count: 10, desc: { es: 'Reúne 10 núcleos de magma', en: 'Collect 10 magma cores' } },
    ],
    rewards: { gold: 7000, exp: 18000, items: [] },
    next: 'gear_magma_axe', repeatable: false, dungeon: null,
  },
  {
    id: 'fire_chain_phoenix_pyre',
    title: { es: 'La Pira del Fénix', en: 'The Phoenix Pyre' },
    desc: {
      es: 'La pira del fénix solo se enciende en la oscuridad. De noche, alimenta las llamas del Abismo con esquirlas infernales y la sangre de sus moradores.',
      en: 'The phoenix pyre kindles only in the dark. At night, feed the flames of the Abyss with hellfire shards and the blood of its dwellers.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 88,
    nightOnly: true,
    objectives: [
      { type: 'collect', target: 'hellfire-shard', count: 30, desc: { es: 'Reúne 30 esquirlas infernales', en: 'Collect 30 hellfire shards' } },
      { type: 'kill', target: 'imp', count: 15, desc: { es: 'Mata 15 diablillos', en: 'Kill 15 imps' } },
      { type: 'kill', target: 'demon', count: 10, desc: { es: 'Mata 10 demonios', en: 'Kill 10 demons' } },
    ],
    rewards: { gold: 9000, exp: 26000, items: [] },
    next: 'phoenix_feather_quest', repeatable: false, dungeon: null,
  },
  {
    id: 'fire_chain_efreet_winds',
    title: { es: 'Los Vientos del Efrit', en: 'Winds of the Efreet' },
    desc: {
      es: 'Solo quien domó el fuego del Abismo puede resistir el de un genio Efreet. De día, con la Pluma de Fénix en alto, arrebátale sus vientos en el desierto al este.',
      en: 'Only one who tamed the Abyss\'s fire can withstand an Efreet genie\'s. By day, with the Phoenix Feather raised, wrest its winds in the desert to the east.',
    },
    giverNpc: 'sandport_caravan', city: 'sandport', minLevel: 105,
    dayOnly: true,
    requiresItems: [{ itemId: 'phoenix-feather', count: 1 }],
    objectives: [
      { type: 'kill', target: 'mage', count: 12, desc: { es: 'Mata 12 genios (desierto al este)', en: 'Kill 12 genies (desert to the east)' } },
      { type: 'collect', target: 'fire-essence', count: 20, desc: { es: 'Reúne 20 esencia de fuego', en: 'Collect 20 fire essence' } },
    ],
    rewards: { gold: 8000, exp: 28000, items: [] },
    next: 'gear_hermes_boots', repeatable: false, dungeon: null,
  },

  // ===== MID-TIER MINI-CHAINS (lv45-68, 3-4 steps each) =====================
  {
    id: 'mid_chain_serpent_brood',
    title: { es: 'La Cría de la Serpiente', en: 'The Serpent Brood' },
    desc: {
      es: 'El capitán de puerto de Westharbor oyó de una hoja serpiente tragada por una hidra del pantano lejano al suroeste. Empieza limpiando las serpientes que infestan la orilla.',
      en: 'Westharbor\'s harbormaster heard of a serpent blade swallowed by a hydra of the far swamp to the south-west. Start by clearing the snakes infesting the shore.',
    },
    giverNpc: 'westharbor_harbormaster', city: 'westharbor', minLevel: 45,
    objectives: [
      { type: 'kill', target: 'snake', count: 20, desc: { es: 'Mata 20 serpientes (pantano al suroeste)', en: 'Kill 20 snakes (swamp to the south-west)' } },
    ],
    rewards: { gold: 1200, exp: 3500, items: [] },
    next: 'mid_chain_hydra_nest', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_hydra_nest',
    title: { es: 'El Nido de la Hidra', en: 'The Hydra Nest' },
    desc: {
      es: 'La hidra que tragó la hoja anida en lo profundo del cieno. Adéntrate y arráncale las escamas para hallar cuál la guarda.',
      en: 'The hydra that swallowed the blade nests deep in the mire. Venture in and tear off its scales to find which one holds it.',
    },
    giverNpc: 'westharbor_harbormaster', city: 'westharbor', minLevel: 45,
    objectives: [
      { type: 'kill', target: 'hydra', count: 4, desc: { es: 'Mata 4 hidras', en: 'Kill 4 hydras' } },
      { type: 'collect', target: 'hydra-scale', count: 8, desc: { es: 'Reúne 8 escamas de hidra', en: 'Collect 8 hydra scales' } },
    ],
    rewards: { gold: 1600, exp: 4200, items: [] },
    next: 'mid_chain_serpent_relic', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_serpent_relic',
    title: { es: 'La Reliquia Serpentina', en: 'The Serpent Relic' },
    desc: {
      es: 'Casi la tienes. Reúne colmillos de serpiente para que el herrero del puerto reengarce la hoja en su empuñadura original.',
      en: 'Almost yours. Gather serpent fangs so the port smith can reset the blade in its original hilt.',
    },
    giverNpc: 'westharbor_harbormaster', city: 'westharbor', minLevel: 45,
    objectives: [
      { type: 'collect', target: 'serpent-fang', count: 6, desc: { es: 'Reúne 6 colmillos de serpiente', en: 'Collect 6 serpent fangs' } },
    ],
    rewards: { gold: 1500, exp: 4000, items: [] },
    next: 'gear_serpent_sword', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_frozen_trail',
    title: { es: 'El Rastro Helado', en: 'The Frozen Trail' },
    desc: {
      es: 'Un bastón de hielo puro late en el corazón de las criaturas heladas. Sigue el rastro de las arañas de cristal al norte.',
      en: 'A staff of pure ice beats in the heart of frozen creatures. Follow the trail of the crystal spiders to the north.',
    },
    giverNpc: 'frostpeak_explorer', city: 'frostpeak', minLevel: 58,
    objectives: [
      { type: 'kill', target: 'spider', count: 18, desc: { es: 'Mata 18 arañas de cristal (al norte)', en: 'Kill 18 crystal spiders (to the north)' } },
      { type: 'collect', target: 'frost-shard', count: 12, desc: { es: 'Reúne 12 esquirlas heladas', en: 'Collect 12 frost shards' } },
    ],
    rewards: { gold: 3000, exp: 8000, items: [] },
    next: 'mid_chain_frost_troll_king', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_frost_troll_king',
    title: { es: 'El Rey de los Troles de Escarcha', en: 'The Frost Troll King' },
    desc: {
      es: 'El rey de los troles de escarcha guarda un colmillo helado clave para el bastón. Acaba con su corte en las cuevas heladas.',
      en: 'The frost troll king guards a frozen fang key to the staff. End his court in the icy caves.',
    },
    giverNpc: 'frostpeak_explorer', city: 'frostpeak', minLevel: 58,
    objectives: [
      { type: 'kill', target: 'troll', count: 18, desc: { es: 'Mata 18 troles de escarcha', en: 'Kill 18 frost trolls' } },
      { type: 'collect', target: 'frost-fang', count: 6, desc: { es: 'Reúne 6 colmillos helados', en: 'Collect 6 frost fangs' } },
    ],
    rewards: { gold: 3500, exp: 9000, items: [] },
    next: 'mid_chain_glacial_core', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_glacial_core',
    title: { es: 'El Núcleo Glacial', en: 'The Glacial Core' },
    desc: {
      es: 'El último ingrediente: el núcleo cristalino de un gólem de hielo. Pocos resisten su frío en las profundidades del norte.',
      en: 'The last ingredient: the crystalline core of an ice golem. Few withstand its cold in the depths of the north.',
    },
    giverNpc: 'frostpeak_explorer', city: 'frostpeak', minLevel: 58,
    objectives: [
      { type: 'kill', target: 'golem', count: 6, desc: { es: 'Mata 6 gólems de hielo', en: 'Kill 6 ice golems' } },
      { type: 'collect', target: 'crystal', count: 10, desc: { es: 'Reúne 10 cristales', en: 'Collect 10 crystals' } },
    ],
    rewards: { gold: 4000, exp: 10000, items: [] },
    next: 'gear_glacial_staff', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_gathering_storm',
    title: { es: 'La Tormenta que Llega', en: 'The Gathering Storm' },
    desc: {
      es: 'Un arco que dispara rayos espera a quien dome la tormenta. Empieza con las arpías de tormenta del este.',
      en: 'A bow that fires lightning awaits one who tames the storm. Start with the storm harpies of the east.',
    },
    giverNpc: 'sandport_waterkeeper', city: 'sandport', minLevel: 62,
    objectives: [
      { type: 'kill', target: 'harpy', count: 14, desc: { es: 'Mata 14 arpías de tormenta', en: 'Kill 14 storm harpies' } },
      { type: 'collect', target: 'storm-essence', count: 12, desc: { es: 'Reúne 12 esencia de tormenta', en: 'Collect 12 storm essence' } },
    ],
    rewards: { gold: 4000, exp: 10000, items: [] },
    next: 'mid_chain_storm_elementals', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_storm_elementals',
    title: { es: 'Los Elementales de Tormenta', en: 'The Storm Elementals' },
    desc: {
      es: 'Los elementales de tormenta encierran el rayo puro. Abátelos y reúne más esencia para el tótem.',
      en: 'The storm elementals hold pure lightning. Fell them and gather more essence for the totem.',
    },
    giverNpc: 'sandport_waterkeeper', city: 'sandport', minLevel: 62,
    objectives: [
      { type: 'kill', target: 'elemental', count: 12, desc: { es: 'Mata 12 elementales de tormenta', en: 'Kill 12 storm elementals' } },
      { type: 'collect', target: 'storm-essence', count: 8, desc: { es: 'Reúne 8 esencia de tormenta', en: 'Collect 8 storm essence' } },
    ],
    rewards: { gold: 4500, exp: 11000, items: [] },
    next: 'mid_chain_storm_totem', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_storm_totem',
    title: { es: 'El Tótem de Tormenta', en: 'The Storm Totem' },
    desc: {
      es: 'Con un Tótem de Tormenta en mano, el arco de rayos es tuyo. Forja el tótem abatiendo a las criaturas más cargadas de energía.',
      en: 'With a Storm Totem in hand, the lightning bow is yours. Forge the totem by felling the most energy-charged creatures.',
    },
    giverNpc: 'sandport_waterkeeper', city: 'sandport', minLevel: 62,
    objectives: [
      { type: 'kill', target: 'harpy', count: 8, desc: { es: 'Mata 8 arpías de tormenta', en: 'Kill 8 storm harpies' } },
      { type: 'kill', target: 'elemental', count: 4, desc: { es: 'Mata 4 elementales de tormenta', en: 'Kill 4 storm elementals' } },
    ],
    rewards: { gold: 4000, exp: 10000, items: ['storm-totem'] },
    next: 'gear_storm_bow', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_tainted_mire',
    title: { es: 'El Cieno Corrupto', en: 'The Tainted Mire' },
    desc: {
      es: 'Un bastón que pudre lo que toca brota del pantano de hidras al suroeste. Reúne glándulas de veneno de las criaturas del cieno.',
      en: 'A staff that rots what it touches grows from the hydra swamp to the south-west. Gather venom glands from the creatures of the mire.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 66,
    objectives: [
      { type: 'kill', target: 'hydra', count: 6, desc: { es: 'Mata 6 hidras (pantano al suroeste)', en: 'Kill 6 hydras (swamp to the south-west)' } },
      { type: 'collect', target: 'venom-gland', count: 12, desc: { es: 'Reúne 12 glándulas de veneno', en: 'Collect 12 venom glands' } },
    ],
    rewards: { gold: 5000, exp: 12000, items: [] },
    next: 'mid_chain_blight_spreads', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_blight_spreads',
    title: { es: 'La Plaga se Extiende', en: 'The Blight Spreads' },
    desc: {
      es: 'La plaga del pantano se filtra a los pastos. Detén a las serpientes venenosas que la propagan y reúne sus viales.',
      en: 'The swamp blight seeps into the pastures. Stop the venomous snakes spreading it and gather their vials.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 66,
    objectives: [
      { type: 'kill', target: 'snake', count: 12, desc: { es: 'Mata 12 serpientes venenosas', en: 'Kill 12 venomous snakes' } },
      { type: 'collect', target: 'poison-vial', count: 8, desc: { es: 'Reúne 8 viales de veneno', en: 'Collect 8 poison vials' } },
    ],
    rewards: { gold: 5000, exp: 12000, items: [] },
    next: 'mid_chain_blight_brew', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_blight_brew',
    title: { es: 'El Brebaje de la Plaga', en: 'The Blight Brew' },
    desc: {
      es: 'El sabio destila la esencia de la plaga, pero el brebaje solo cuaja de noche. Tráele las últimas glándulas de veneno.',
      en: 'The sage distills the blight\'s essence, but the brew sets only at night. Bring him the last venom glands.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 66,
    nightOnly: true,
    objectives: [
      { type: 'collect', target: 'venom-gland', count: 12, desc: { es: 'Reúne 12 glándulas de veneno', en: 'Collect 12 venom glands' } },
    ],
    rewards: { gold: 6000, exp: 14000, items: [] },
    next: 'gear_staff_blight', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_wilting_grove',
    title: { es: 'La Arboleda Marchita', en: 'The Wilting Grove' },
    desc: {
      es: 'Una guadaña de planta que siega vidas se oculta entre los treants del bosque al norte. Empieza por limpiar la arboleda marchita.',
      en: 'A plant scythe that reaps lives hides among the treants of the north forest. Start by clearing the wilting grove.',
    },
    giverNpc: 'oakvale_druid', city: 'oakvale', minLevel: 68,
    objectives: [
      { type: 'kill', target: 'treant', count: 16, desc: { es: 'Mata 16 treants (bosque al norte)', en: 'Kill 16 treants (forest to the north)' } },
      { type: 'collect', target: 'living-bark', count: 15, desc: { es: 'Reúne 15 corteza viva', en: 'Collect 15 living bark' } },
    ],
    rewards: { gold: 5000, exp: 12000, items: [] },
    next: 'mid_chain_night_bloom', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_night_bloom',
    title: { es: 'El Brote Nocturno', en: 'The Night Bloom' },
    desc: {
      es: 'De noche, hongos venenosos florecen alrededor del segador. Quémalos y reúne su polvo de esporas.',
      en: 'At night, poison mushrooms bloom around the reaper. Burn them and gather their spore dust.',
    },
    giverNpc: 'oakvale_druid', city: 'oakvale', minLevel: 68,
    nightOnly: true,
    objectives: [
      { type: 'kill', target: 'mushroom', count: 20, desc: { es: 'Mata 20 hongos', en: 'Kill 20 mushrooms' } },
      { type: 'collect', target: 'spore-dust', count: 10, desc: { es: 'Reúne 10 polvo de esporas', en: 'Collect 10 spore dust' } },
    ],
    rewards: { gold: 5500, exp: 13000, items: [] },
    next: 'mid_chain_reaper_calls', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_reaper_calls',
    title: { es: 'El Segador Llama', en: 'The Reaper Calls' },
    desc: {
      es: 'El segador despierta entre los treants ancianos. Solo de noche se deja coger su guadaña. Reúne la última corteza viva y enfréntalo.',
      en: 'The reaper wakes among the ancient treants. Only at night does its scythe yield. Gather the last living bark and face it.',
    },
    giverNpc: 'oakvale_druid', city: 'oakvale', minLevel: 68,
    nightOnly: true,
    objectives: [
      { type: 'kill', target: 'treant', count: 16, desc: { es: 'Mata 16 treants ancianos', en: 'Kill 16 ancient treants' } },
      { type: 'collect', target: 'living-bark', count: 15, desc: { es: 'Reúne 15 corteza viva', en: 'Collect 15 living bark' } },
    ],
    rewards: { gold: 7000, exp: 16000, items: [] },
    next: 'gear_reaper_scythe', repeatable: false, dungeon: null,
  },
  {
    id: 'mid_chain_ringsmith_trials',
    title: { es: 'Las Pruebas del Anillero', en: "The Ringsmith's Trials" },
    desc: {
      es: 'La Runesmith de Stonehaven forja un anillo de maestría por cada disciplina que demuestres. Tráele el hierro en bruto y empezarán las pruebas.',
      en: 'Stonehaven\'s runesmith forges one mastery ring per discipline you prove. Bring her the raw iron and the trials begin.',
    },
    giverNpc: 'stonehaven_smith', city: 'stonehaven', minLevel: 50,
    objectives: [
      { type: 'talk', target: 'stonehaven_smith', count: 1, desc: { es: 'Habla con la Runesmith', en: 'Speak with the runesmith' } },
      { type: 'collect', target: 'iron-ore', count: 20, desc: { es: 'Reúne 20 mineral de hierro', en: 'Collect 20 iron ore' } },
    ],
    rewards: { gold: 2000, exp: 6000, items: [] },
    next: 'gear_ring_sword', repeatable: false, dungeon: null,
  },

  // ===== REMAINING STANDALONE GEAR — short prereq chains (cobertura total) ====
  // Each of these standalone gear quests gets a themed lead-up so NO lv40+ gear
  // is a one-shot. Depth scales with level (lv40-55 ≈ 3, lv60 ≈ 4, lv90+ ≈ 6).

  // -- gear_arbalest (lv40, Oakvale elves) — 3 steps --
  {
    id: 'arb_chain_scouts',
    title: { es: 'Los Exploradores Élficos', en: 'The Elven Scouts' },
    desc: { es: 'La cazadora de Oakvale quiere una ballesta élfica perfecta. Primero, despeja a los exploradores élficos del bosque al norte.', en: 'Oakvale\'s hunter wants a perfect elven crossbow. First, clear the elven scouts of the forest to the north.' },
    giverNpc: 'oakvale_hunter', city: 'oakvale', minLevel: 40,
    objectives: [{ type: 'kill', target: 'elf', count: 18, desc: { es: 'Mata 18 elfos (bosque al norte)', en: 'Kill 18 elves (forest to the north)' } }],
    rewards: { gold: 1200, exp: 4000, items: [] }, next: 'arb_chain_fletcher', repeatable: false, dungeon: null,
  },
  {
    id: 'arb_chain_fletcher',
    title: { es: 'El Maestro Flechero', en: 'The Master Fletcher' },
    desc: { es: 'El flechero élfico no comparte sus secretos. Arrebátale sus arcos y plumas a los elfos arcanistas.', en: 'The elven fletcher shares no secrets. Wrest bows and feathers from the elf arcanists.' },
    giverNpc: 'oakvale_hunter', city: 'oakvale', minLevel: 40,
    objectives: [{ type: 'kill', target: 'elf', count: 14, desc: { es: 'Mata 14 elfos arcanistas', en: 'Kill 14 elf arcanists' } }, { type: 'collect', target: 'feather', count: 15, desc: { es: 'Reúne 15 plumas', en: 'Collect 15 feathers' } }],
    rewards: { gold: 1400, exp: 4500, items: [] }, next: 'arb_chain_ironwood', repeatable: false, dungeon: null,
  },
  {
    id: 'arb_chain_ironwood',
    title: { es: 'Madera de Hierro', en: 'Ironwood' },
    desc: { es: 'La ballesta necesita madera de hierro de los treants más viejos del bosque. Tráela y será tuya.', en: 'The crossbow needs ironwood from the forest\'s oldest treants. Bring it and it\'s yours.' },
    giverNpc: 'oakvale_hunter', city: 'oakvale', minLevel: 40,
    objectives: [{ type: 'kill', target: 'treant', count: 10, desc: { es: 'Mata 10 treants', en: 'Kill 10 treants' } }, { type: 'collect', target: 'living-bark', count: 12, desc: { es: 'Reúne 12 corteza viva', en: 'Collect 12 living bark' } }],
    rewards: { gold: 1500, exp: 5000, items: [] }, next: 'gear_arbalest', repeatable: false, dungeon: null,
  },

  // -- gear_mage_robe (lv40, Dragonreach cultists) — 3 steps --
  {
    id: 'robe_chain_heretics',
    title: { es: 'Los Herejes del Abismo', en: 'The Abyss Heretics' },
    desc: { es: 'El sabio rastrea la túnica de un archimago caído entre los cultistas del Abismo al suroeste. Empieza silenciando a sus acólitos.', en: 'The sage tracks a fallen archmage\'s robe among the Abyss cultists to the south-west. Start by silencing their acolytes.' },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 40,
    objectives: [{ type: 'kill', target: 'cultist', count: 18, desc: { es: 'Mata 18 cultistas (Abismo al suroeste)', en: 'Kill 18 cultists (Abyss to the south-west)' } }],
    rewards: { gold: 1300, exp: 4200, items: [] }, next: 'robe_chain_tomes', repeatable: false, dungeon: null,
  },
  {
    id: 'robe_chain_tomes',
    title: { es: 'Los Tomos Prohibidos', en: 'The Forbidden Tomes' },
    desc: { es: 'Los sacerdotes cultistas guardan los tomos que describen la túnica. Quítaselos.', en: 'The cult priests hold the tomes that describe the robe. Take them.' },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 40,
    objectives: [{ type: 'kill', target: 'cultist', count: 14, desc: { es: 'Mata 14 sacerdotes cultistas', en: 'Kill 14 cult priests' } }, { type: 'collect', target: 'dark-tome', count: 6, desc: { es: 'Reúne 6 tomos oscuros', en: 'Collect 6 dark tomes' } }],
    rewards: { gold: 1500, exp: 4800, items: [] }, next: 'robe_chain_imbue', repeatable: false, dungeon: null,
  },
  {
    id: 'robe_chain_imbue',
    title: { es: 'Imbuir la Túnica', en: 'Imbue the Robe' },
    desc: { es: 'El sabio imbuye la túnica con esencia arcana. Tráele esencias de los imps del Abismo y será tuya, con sus grebas a juego.', en: 'The sage imbues the robe with arcane essence. Bring him imp essences from the Abyss and it\'s yours, with matching legs.' },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 40,
    objectives: [{ type: 'kill', target: 'imp', count: 16, desc: { es: 'Mata 16 diablillos', en: 'Kill 16 imps' } }, { type: 'collect', target: 'imp-horn', count: 8, desc: { es: 'Reúne 8 cuernos de diablillo', en: 'Collect 8 imp horns' } }],
    rewards: { gold: 1600, exp: 5200, items: [] }, next: 'gear_mage_robe', repeatable: false, dungeon: null,
  },

  // -- gear_giant_sword (lv45, Frostpeak) — 3 steps --
  {
    id: 'gsword_chain_den',
    title: { es: 'La Guarida de los Gigantes', en: "The Giants' Den" },
    desc: { es: 'Una espada de gigante yace en la guarida de osos y troles del norte. Despeja a los osos que la custodian.', en: 'A giant\'s sword lies in the den of the northern bears and trolls. Clear the bears that guard it.' },
    giverNpc: 'frostpeak_foreman', city: 'frostpeak', minLevel: 45,
    objectives: [{ type: 'kill', target: 'bear', count: 14, desc: { es: 'Mata 14 osos (al norte)', en: 'Kill 14 bears (to the north)' } }],
    rewards: { gold: 1300, exp: 4200, items: [] }, next: 'gsword_chain_trolls', repeatable: false, dungeon: null,
  },
  {
    id: 'gsword_chain_trolls',
    title: { es: 'Los Guardianes Troles', en: 'The Troll Guardians' },
    desc: { es: 'Los troles que protegen la guarida son tercos. Adelgaza sus filas para llegar a la espada.', en: 'The trolls protecting the den are stubborn. Thin their ranks to reach the sword.' },
    giverNpc: 'frostpeak_foreman', city: 'frostpeak', minLevel: 45,
    objectives: [{ type: 'kill', target: 'troll', count: 14, desc: { es: 'Mata 14 troles', en: 'Kill 14 trolls' } }, { type: 'collect', target: 'troll-hide', count: 8, desc: { es: 'Reúne 8 pieles de troll', en: 'Collect 8 troll hides' } }],
    rewards: { gold: 1500, exp: 4800, items: [] }, next: 'gsword_chain_unearth', repeatable: false, dungeon: null,
  },
  {
    id: 'gsword_chain_unearth',
    title: { es: 'Desenterrar la Hoja', en: 'Unearth the Blade' },
    desc: { es: 'La espada está enterrada bajo el hielo. Rompe a los gólems que la sellan y reclámala.', en: 'The sword is buried under the ice. Break the golems that seal it and claim it.' },
    giverNpc: 'frostpeak_foreman', city: 'frostpeak', minLevel: 45,
    objectives: [{ type: 'kill', target: 'golem', count: 8, desc: { es: 'Mata 8 gólems de hielo', en: 'Kill 8 ice golems' } }],
    rewards: { gold: 1600, exp: 5200, items: [] }, next: 'gear_giant_sword', repeatable: false, dungeon: null,
  },

  // -- gear_swift_boots (lv45, Stonehaven goblins/orcfort) — 3 steps --
  {
    id: 'swift_chain_track',
    title: { es: 'El Rastro del Ladrón', en: "The Thief's Trail" },
    desc: { es: 'Los goblins exploradores robaron unas botas veloces y huyeron al fuerte orco al este. Sigue su rastro entre los kobolds.', en: 'Goblin scouts stole swift boots and fled to the orc fort to the east. Follow their trail among the kobolds.' },
    giverNpc: 'stonehaven_captain', city: 'stonehaven', minLevel: 45,
    objectives: [{ type: 'kill', target: 'kobold', count: 15, desc: { es: 'Mata 15 kobolds (camino al fuerte)', en: 'Kill 15 kobolds (road to the fort)' } }],
    rewards: { gold: 1300, exp: 4200, items: [] }, next: 'swift_chain_scouts', repeatable: false, dungeon: null,
  },
  {
    id: 'swift_chain_scouts',
    title: { es: 'Los Goblins Veloces', en: 'The Swift Goblins' },
    desc: { es: 'Los goblins exploradores corren como el viento con las botas. Acórralos en el fuerte al este.', en: 'The goblin scouts run like the wind in the boots. Corner them in the fort to the east.' },
    giverNpc: 'stonehaven_captain', city: 'stonehaven', minLevel: 45,
    objectives: [{ type: 'reach', target: 'orcfort', count: 1, desc: { es: 'Entra al fuerte orco (al este)', en: 'Enter the orc fort (to the east)' } }, { type: 'kill', target: 'goblin', count: 20, desc: { es: 'Mata 20 goblins', en: 'Kill 20 goblins' } }],
    rewards: { gold: 1600, exp: 5000, items: [] }, next: 'gear_swift_boots', repeatable: false, dungeon: 'orcfort',
  },

  // -- gear_winged_boots (lv55, Oakvale harpies) — 3 steps --
  {
    id: 'winged_chain_aerie',
    title: { es: 'El Aquelarre de Arpías', en: 'The Harpy Aerie' },
    desc: { es: 'Las arpías de las montañas al sur llevan plumas que dan ligereza. Sube a su aquelarre y empieza a cazarlas.', en: 'The harpies of the southern mountains carry feathers that lighten the step. Climb to their aerie and start hunting.' },
    giverNpc: 'oakvale_hunter', city: 'oakvale', minLevel: 55,
    objectives: [{ type: 'kill', target: 'harpy', count: 16, desc: { es: 'Mata 16 arpías (montañas al sur)', en: 'Kill 16 harpies (southern mountains)' } }],
    rewards: { gold: 2000, exp: 6000, items: [] }, next: 'winged_chain_storm', repeatable: false, dungeon: null,
  },
  {
    id: 'winged_chain_storm',
    title: { es: 'Las Arpías de Tormenta', en: 'The Storm Harpies' },
    desc: { es: 'Las plumas más ligeras son de las arpías de tormenta. Caza a las que cabalgan el viento.', en: 'The lightest feathers belong to the storm harpies. Hunt those that ride the wind.' },
    giverNpc: 'oakvale_hunter', city: 'oakvale', minLevel: 55,
    objectives: [{ type: 'kill', target: 'harpy', count: 14, desc: { es: 'Mata 14 arpías de tormenta', en: 'Kill 14 storm harpies' } }, { type: 'collect', target: 'feather', count: 20, desc: { es: 'Reúne 20 plumas', en: 'Collect 20 feathers' } }],
    rewards: { gold: 2500, exp: 7000, items: [] }, next: 'gear_winged_boots', repeatable: false, dungeon: null,
  },

  // -- gear_amulet_haste (lv55, Sandport desert) — 3 steps --
  {
    id: 'haste_chain_raid',
    title: { es: 'La Caravana Asaltada', en: 'The Raided Caravan' },
    desc: { es: 'Caravaneer Rashid perdió un amuleto de premura cuando los escorpiones del desierto al sureste asaltaron su caravana. Empieza a abrirte paso.', en: 'Caravaneer Rashid lost an amulet of haste when the desert scorpions to the south-east raided his caravan. Start cutting through.' },
    giverNpc: 'sandport_caravan', city: 'sandport', minLevel: 55,
    objectives: [{ type: 'kill', target: 'scorpion', count: 20, desc: { es: 'Mata 20 escorpiones (desierto al sureste)', en: 'Kill 20 scorpions (desert to the south-east)' } }],
    rewards: { gold: 2000, exp: 6000, items: [] }, next: 'haste_chain_swarm', repeatable: false, dungeon: null,
  },
  {
    id: 'haste_chain_swarm',
    title: { es: 'El Enjambre del Desierto', en: 'The Desert Swarm' },
    desc: { es: 'El amuleto se lo tragó un escarabajo entre el enjambre. Aplástalos hasta encontrarlo.', en: 'A beetle in the swarm swallowed the amulet. Crush them until you find it.' },
    giverNpc: 'sandport_caravan', city: 'sandport', minLevel: 55,
    objectives: [{ type: 'kill', target: 'beetle', count: 18, desc: { es: 'Mata 18 escarabajos', en: 'Kill 18 beetles' } }, { type: 'collect', target: 'desert-dust', count: 30, desc: { es: 'Reúne 30 polvo del desierto', en: 'Collect 30 desert dust' } }],
    rewards: { gold: 2500, exp: 7000, items: [] }, next: 'gear_amulet_haste', repeatable: false, dungeon: null,
  },

  // -- gear_stonecutter_axe (lv60, Stonehaven dwarves) — 4 steps --
  {
    id: 'stonecut_chain_mines',
    title: { es: 'Las Minas Tomadas', en: 'The Taken Mines' },
    desc: { es: 'El Geomante enano de las minas al sureste blande un hacha que parte la roca. Adéntrate y enfréntate a los mineros enanos.', en: 'The dwarf Geomancer of the mines to the south-east wields a stone-splitting axe. Venture in and face the dwarf miners.' },
    giverNpc: 'stonehaven_miner', city: 'stonehaven', minLevel: 60,
    objectives: [{ type: 'kill', target: 'dwarf', count: 18, desc: { es: 'Mata 18 enanos (minas al sureste)', en: 'Kill 18 dwarves (mines to the south-east)' } }],
    rewards: { gold: 3000, exp: 8000, items: [] }, next: 'stonecut_chain_soldiers', repeatable: false, dungeon: null,
  },
  {
    id: 'stonecut_chain_soldiers',
    title: { es: 'Los Soldados Enanos', en: 'The Dwarf Soldiers' },
    desc: { es: 'Los soldados enanos guardan al Geomante. Rompe su línea con hierro de las minas.', en: 'The dwarf soldiers guard the Geomancer. Break their line with iron from the mines.' },
    giverNpc: 'stonehaven_miner', city: 'stonehaven', minLevel: 60,
    objectives: [{ type: 'kill', target: 'dwarf', count: 16, desc: { es: 'Mata 16 soldados enanos', en: 'Kill 16 dwarf soldiers' } }, { type: 'collect', target: 'iron-ore', count: 25, desc: { es: 'Reúne 25 mineral de hierro', en: 'Collect 25 iron ore' } }],
    rewards: { gold: 3500, exp: 9000, items: [] }, next: 'stonecut_chain_guards', repeatable: false, dungeon: null,
  },
  {
    id: 'stonecut_chain_guards',
    title: { es: 'La Guardia del Geomante', en: "The Geomancer's Guard" },
    desc: { es: 'Solo queda la guardia más dura del Geomante. Derríbala y el hacha estará a tu alcance.', en: 'Only the Geomancer\'s toughest guard remains. Bring it down and the axe is within reach.' },
    giverNpc: 'stonehaven_miner', city: 'stonehaven', minLevel: 60,
    objectives: [{ type: 'kill', target: 'dwarf', count: 14, desc: { es: 'Mata 14 guardias enanos', en: 'Kill 14 dwarf guards' } }, { type: 'kill', target: 'golem', count: 4, desc: { es: 'Mata 4 gólems de piedra', en: 'Kill 4 stone golems' } }],
    rewards: { gold: 4000, exp: 10000, items: [] }, next: 'gear_stonecutter_axe', repeatable: false, dungeon: null,
  },

  // -- gear_royal_quiver (lv90, Westharbor elves) — 6 steps --
  {
    id: 'rquiver_chain_rumor',
    title: { es: 'El Rumor del Carcaj', en: 'Rumor of the Quiver' },
    desc: { es: 'Harbormaster Quill oyó de un carcaj real perdido en el bosque élfico al norte de Oakvale. Empieza ganándote el paso entre los elfos.', en: 'Harbormaster Quill heard of a royal quiver lost in the elven forest north of Oakvale. Start by earning passage among the elves.' },
    giverNpc: 'westharbor_harbormaster', city: 'westharbor', minLevel: 90,
    objectives: [{ type: 'kill', target: 'elf', count: 18, desc: { es: 'Mata 18 elfos (bosque al norte de Oakvale)', en: 'Kill 18 elves (forest north of Oakvale)' } }],
    rewards: { gold: 6000, exp: 18000, items: [] }, next: 'rquiver_chain_scouts', repeatable: false, dungeon: null,
  },
  {
    id: 'rquiver_chain_scouts',
    title: { es: 'Los Centinelas del Bosque', en: 'The Forest Sentinels' },
    desc: { es: 'Los exploradores élficos vigilan el carcaj. Despéjalos y reúne sus arcos.', en: 'The elf scouts watch over the quiver. Clear them and gather their bows.' },
    giverNpc: 'westharbor_harbormaster', city: 'westharbor', minLevel: 90,
    objectives: [{ type: 'kill', target: 'elf', count: 20, desc: { es: 'Mata 20 elfos exploradores', en: 'Kill 20 elf scouts' } }, { type: 'collect', target: 'feather', count: 20, desc: { es: 'Reúne 20 plumas', en: 'Collect 20 feathers' } }],
    rewards: { gold: 7000, exp: 20000, items: [] }, next: 'rquiver_chain_arcanists', repeatable: false, dungeon: null,
  },
  {
    id: 'rquiver_chain_arcanists',
    title: { es: 'Los Arcanistas Élficos', en: 'The Elf Arcanists' },
    desc: { es: 'Los arcanistas élficos tejen la magia que esconde el carcaj. Disipa sus encantamientos.', en: 'The elf arcanists weave the magic that hides the quiver. Dispel their enchantments.' },
    giverNpc: 'westharbor_harbormaster', city: 'westharbor', minLevel: 90,
    objectives: [{ type: 'kill', target: 'elf', count: 18, desc: { es: 'Mata 18 elfos arcanistas', en: 'Kill 18 elf arcanists' } }, { type: 'collect', target: 'fairy-dust', count: 12, desc: { es: 'Reúne 12 polvo de hada', en: 'Collect 12 fairy dust' } }],
    rewards: { gold: 8000, exp: 22000, items: [] }, next: 'rquiver_chain_treants', repeatable: false, dungeon: null,
  },
  {
    id: 'rquiver_chain_treants',
    title: { es: 'Los Guardianes del Claro', en: 'The Grove Guardians' },
    desc: { es: 'Los treants ancianos rodean el claro donde duerme el carcaj. Ábrete paso entre ellos.', en: 'Ancient treants ring the grove where the quiver sleeps. Force your way through them.' },
    giverNpc: 'westharbor_harbormaster', city: 'westharbor', minLevel: 90,
    objectives: [{ type: 'kill', target: 'treant', count: 12, desc: { es: 'Mata 12 treants ancianos', en: 'Kill 12 ancient treants' } }],
    rewards: { gold: 9000, exp: 24000, items: [] }, next: 'rquiver_chain_claim', repeatable: false, dungeon: null,
  },
  {
    id: 'rquiver_chain_claim',
    title: { es: 'El Claro Sagrado', en: 'The Sacred Grove' },
    desc: { es: 'El carcaj real descansa en el claro sagrado, custodiado por las hadas. Demuestra tu valía una última vez.', en: 'The royal quiver rests in the sacred grove, guarded by the fairies. Prove yourself one last time.' },
    giverNpc: 'westharbor_harbormaster', city: 'westharbor', minLevel: 90,
    objectives: [{ type: 'kill', target: 'fairy', count: 14, desc: { es: 'Mata 14 hadas', en: 'Kill 14 fairies' } }, { type: 'kill', target: 'elf', count: 12, desc: { es: 'Mata 12 elfos', en: 'Kill 12 elves' } }],
    rewards: { gold: 10000, exp: 28000, items: [] }, next: 'gear_royal_quiver', repeatable: false, dungeon: null,
  },

  // -- gear_void_wand (lv95, Stonehaven crypt) — 6 steps --
  {
    id: 'void_chain_whispers',
    title: { es: 'Susurros del Vacío', en: 'Whispers of the Void' },
    desc: { es: 'El lorekeeper persigue una varita que canaliza la nada. Su rastro empieza entre los esqueletos de la cripta al sureste.', en: 'The lorekeeper chases a wand that channels the void. Its trail begins among the skeletons of the crypt to the south-east.' },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 95,
    objectives: [{ type: 'reach', target: 'undeadcrypt', count: 1, desc: { es: 'Entra a la cripta (al sureste)', en: 'Enter the crypt (to the south-east)' } }, { type: 'kill', target: 'skeleton', count: 20, desc: { es: 'Mata 20 esqueletos', en: 'Kill 20 skeletons' } }],
    rewards: { gold: 7000, exp: 20000, items: [] }, next: 'void_chain_ghosts', repeatable: false, dungeon: 'undeadcrypt',
  },
  {
    id: 'void_chain_ghosts',
    title: { es: 'Los Fantasmas de la Cripta', en: 'The Crypt Ghosts' },
    desc: { es: 'Los fantasmas guardan los ecos del vacío. Disípalos y reúne su ectoplasma.', en: 'The ghosts hold the echoes of the void. Dispel them and gather their ectoplasm.' },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 95,
    objectives: [{ type: 'kill', target: 'ghost', count: 18, desc: { es: 'Mata 18 fantasmas', en: 'Kill 18 ghosts' } }, { type: 'collect', target: 'ectoplasm', count: 12, desc: { es: 'Reúne 12 ectoplasma', en: 'Collect 12 ectoplasm' } }],
    rewards: { gold: 8000, exp: 22000, items: [] }, next: 'void_chain_wraiths', repeatable: false, dungeon: null,
  },
  {
    id: 'void_chain_wraiths',
    title: { es: 'Los Espectros del Vacío', en: 'The Void Wraiths' },
    desc: { es: 'Los wraiths de sombra encarnan el vacío mismo. Solo de noche se manifiestan del todo. Acaba con ellos.', en: 'Shadow wraiths embody the void itself. Only at night do they fully manifest. End them.' },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 95,
    nightOnly: true,
    objectives: [{ type: 'kill', target: 'wraith', count: 18, desc: { es: 'Mata 18 wraiths', en: 'Kill 18 wraiths' } }],
    rewards: { gold: 9000, exp: 24000, items: [] }, next: 'void_chain_souls', repeatable: false, dungeon: null,
  },
  {
    id: 'void_chain_souls',
    title: { es: 'Gemas del Alma', en: 'Soul Gems' },
    desc: { es: 'La varita del vacío se alimenta de almas. Arranca gemas de alma a los muertos más poderosos.', en: 'The void wand feeds on souls. Tear soul gems from the mightiest dead.' },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 95,
    objectives: [{ type: 'kill', target: 'wraith', count: 12, desc: { es: 'Mata 12 wraiths', en: 'Kill 12 wraiths' } }, { type: 'collect', target: 'soul-gem', count: 4, desc: { es: 'Reúne 4 gemas de alma', en: 'Collect 4 soul gems' } }],
    rewards: { gold: 10000, exp: 26000, items: [] }, next: 'void_chain_necromancer', repeatable: false, dungeon: null,
  },
  {
    id: 'void_chain_necromancer',
    title: { es: 'El Necromante de la Cripta', en: 'The Crypt Necromancer' },
    desc: { es: 'El necromante que esconde la varita gobierna la cripta. Disuelve su forma para reclamarla.', en: 'The necromancer hiding the wand rules the crypt. Dispel its form to claim it.' },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 95,
    objectives: [{ type: 'kill', target: 'skeleton', count: 15, desc: { es: 'Mata 15 esqueletos (necromante incl.)', en: 'Kill 15 skeletons (incl. necromancer)' } }, { type: 'kill', target: 'wraith', count: 8, desc: { es: 'Mata 8 wraiths', en: 'Kill 8 wraiths' } }],
    rewards: { gold: 12000, exp: 30000, items: [] }, next: 'gear_void_wand', repeatable: false, dungeon: null,
  },

  // -- hollowmoor_haunting (lv48, ghost town) — 2 lead-in steps --
  {
    id: 'hollow_chain_warning',
    title: { es: 'La Advertencia del Pueblo', en: "The Town's Warning" },
    desc: { es: 'Hollowmoor cayó hace siglos y sus muertos no descansan. Antes de entrar, el anciano de Oakvale te pide despejar los esqueletos que vagan por sus lindes.', en: 'Hollowmoor fell centuries ago and its dead won\'t rest. Before entering, Oakvale\'s elder asks you to clear the skeletons roaming its edges.' },
    giverNpc: 'oakvale_forager', city: 'oakvale', minLevel: 48,
    objectives: [{ type: 'kill', target: 'skeleton', count: 16, desc: { es: 'Mata 16 esqueletos', en: 'Kill 16 skeletons' } }],
    rewards: { gold: 1400, exp: 5000, items: [] }, next: 'hollow_chain_spirits', repeatable: false, dungeon: null,
  },
  {
    id: 'hollow_chain_spirits',
    title: { es: 'Los Espíritus Inquietos', en: 'The Restless Spirits' },
    desc: { es: 'Los espíritus del pueblo fantasma se agitan de noche. Cálmalos disipando a los fantasmas que los guían.', en: 'The ghost town\'s spirits stir at night. Calm them by dispelling the ghosts that lead them.' },
    giverNpc: 'oakvale_forager', city: 'oakvale', minLevel: 48,
    nightOnly: true,
    objectives: [{ type: 'kill', target: 'ghost', count: 14, desc: { es: 'Mata 14 fantasmas', en: 'Kill 14 ghosts' } }],
    rewards: { gold: 1800, exp: 6000, items: [] }, next: 'hollowmoor_haunting', repeatable: false, dungeon: null,
  },

  // ===================== MOUNT QUEST CHAIN =====================
  // The Stable Master's chain. Each grants a mount (see data/mounts.js
  // mountForQuest), gated by climbing level: tiger@15 → ice dragon@100.
  // `rewards.mount` is the mount id; main.completeQuest unlocks it.
  {
    id: 'mount_tiger_quest',
    title: { es: 'Domar al Tigre', en: 'Taming the Tiger' },
    desc: {
      es: 'El Maestro de Establos quiere un tigre para montar. Demuéstrale tu valía cazando tigres y trayendo sus pieles.',
      en: 'The Stable Master wants a tiger to ride. Prove yourself by hunting tigers and bringing their pelts.',
    },
    giverNpc: 'rivertown_stablemaster', city: 'rivertown', minLevel: 15,
    objectives: [
      { type: 'kill', target: 'tiger', count: 6, desc: { es: 'Caza 6 tigres', en: 'Hunt 6 tigers' } },
      { type: 'collect', target: 'tiger-pelt', count: 3, desc: { es: 'Reúne 3 pieles de tigre', en: 'Collect 3 tiger pelts' } },
    ],
    rewards: { gold: 300, exp: 1200, mount: 'tiger_mount' },
    next: 'mount_boar_quest', repeatable: false, dungeon: 'tigerhollow',
  },
  {
    id: 'mount_boar_quest',
    title: { es: 'El Jabalí de Guerra', en: 'The War Boar' },
    desc: {
      es: 'Solo un jabalí acorazado y feroz sirve de montura. Caza a los más grandes.',
      en: 'Only a fierce, armored boar will do as a mount. Hunt the largest ones.',
    },
    giverNpc: 'rivertown_stablemaster', city: 'rivertown', minLevel: 20,
    objectives: [
      { type: 'kill', target: 'boar', count: 10, desc: { es: 'Caza 10 jabalíes', en: 'Hunt 10 boars' } },
    ],
    rewards: { gold: 500, exp: 2000, mount: 'boar_mount' },
    next: 'mount_bear_quest', repeatable: false, dungeon: null,
  },
  {
    id: 'mount_bear_quest',
    title: { es: 'El Oso de Montaña', en: 'The Mountain Bear' },
    desc: {
      es: 'Un oso colosal te llevará lejos. Derrota osos y trae sus garras.',
      en: 'A colossal bear will carry you far. Defeat bears and bring their claws.',
    },
    giverNpc: 'rivertown_stablemaster', city: 'rivertown', minLevel: 30,
    objectives: [
      { type: 'kill', target: 'bear', count: 8, desc: { es: 'Derrota 8 osos', en: 'Defeat 8 bears' } },
      { type: 'collect', target: 'claw', count: 4, desc: { es: 'Reúne 4 garras', en: 'Collect 4 claws' } },
    ],
    rewards: { gold: 800, exp: 3500, mount: 'bear_mount' },
    next: 'mount_stag_quest', repeatable: false, dungeon: null,
  },
  {
    id: 'mount_stag_quest',
    title: { es: 'El Ciervo Real', en: 'The Royal Stag' },
    desc: {
      es: 'El gran ciervo del bosque profundo solo se entrega a quien lo merece.',
      en: 'The great stag of the deep forest yields only to the worthy.',
    },
    giverNpc: 'rivertown_stablemaster', city: 'rivertown', minLevel: 40,
    objectives: [
      { type: 'kill', target: 'deer', count: 12, desc: { es: 'Caza 12 ciervos', en: 'Hunt 12 deer' } },
      { type: 'collect', target: 'great-antler', count: 2, desc: { es: 'Reúne 2 grandes astas', en: 'Collect 2 great antlers' } },
    ],
    rewards: { gold: 1200, exp: 5000, mount: 'stag_mount' },
    next: 'mount_spider_quest', repeatable: false, dungeon: null,
  },
  {
    id: 'mount_spider_quest',
    title: { es: 'La Araña Gigante', en: 'The Giant Spider' },
    desc: {
      es: 'Doma a la araña colosal del nido. Pocos se atreven a montarla.',
      en: 'Tame the colossal spider of the nest. Few dare ride one.',
    },
    giverNpc: 'rivertown_stablemaster', city: 'rivertown', minLevel: 55,
    objectives: [
      { type: 'kill', target: 'spider', count: 15, desc: { es: 'Caza 15 arañas', en: 'Hunt 15 spiders' } },
      { type: 'collect', target: 'venom-gland', count: 3, desc: { es: 'Reúne 3 glándulas de veneno', en: 'Collect 3 venom glands' } },
    ],
    rewards: { gold: 2000, exp: 8000, mount: 'spider_mount' },
    next: 'mount_scorpion_quest', repeatable: false, dungeon: 'spidernest',
  },
  {
    id: 'mount_scorpion_quest',
    title: { es: 'El Escorpión del Desierto', en: 'The Desert Scorpion' },
    desc: {
      es: 'Un escorpión acorazado de las dunas será tu montura. Cázalos en el desierto.',
      en: 'An armored dune scorpion will be your mount. Hunt them in the desert.',
    },
    giverNpc: 'rivertown_stablemaster', city: 'rivertown', minLevel: 70,
    objectives: [
      { type: 'kill', target: 'scorpion', count: 18, desc: { es: 'Caza 18 escorpiones', en: 'Hunt 18 scorpions' } },
    ],
    rewards: { gold: 3500, exp: 14000, mount: 'scorpion_mount' },
    next: 'mount_wyvern_quest', repeatable: false, dungeon: null,
  },
  {
    id: 'mount_wyvern_quest',
    title: { es: 'El Wyvern Alado', en: 'The Winged Wyvern' },
    desc: {
      es: 'Casi un dragón. Abate wyverns en sus picos para domar uno.',
      en: 'Almost a dragon. Down wyverns on their peaks to tame one.',
    },
    giverNpc: 'rivertown_stablemaster', city: 'rivertown', minLevel: 85,
    objectives: [
      { type: 'kill', target: 'wyvern', count: 15, desc: { es: 'Abate 15 wyverns', en: 'Down 15 wyverns' } },
      { type: 'collect', target: 'wyvern-fang', count: 4, desc: { es: 'Reúne 4 colmillos de wyvern', en: 'Collect 4 wyvern fangs' } },
    ],
    rewards: { gold: 6000, exp: 25000, mount: 'wyvern_mount' },
    next: 'mount_dragon_quest', repeatable: false, dungeon: 'dragonlair',
  },
  // ===========================================================================
  // IMAGINATIVE LEGENDARY QUESTS — the ~30% of high-end gear you EARN instead of
  // farm. Each is a two-step puzzle: a KEYMASTER quest grants a themed key/barter
  // (demon bone, blood signet, dragon seal, abyssal sigil) by spending dusts the
  // monsters drop; the SECOND quest is gated on holding that key (requiresItems)
  // and/or on nightfall (nightOnly), and pays out a legendary. Keys are kept (you
  // brandish them); the dusts/materials you bring are spent on turn-in.
  // minLevel is auto-raised to each reward item's levelReq (see the pass below).
  // ===========================================================================

  // --- DEMON BONE → the Hound's Bargain (Demon Boots) ---
  {
    id: 'demonbone_forge',
    title: { es: 'El Hueso del Demonio', en: 'The Demon Bone' },
    desc: {
      es: 'El Guardallamas Ren puede tallar un Hueso de Demonio capaz de calmar a la bestia que guarda el foso… si le traes el polvo de suficientes demonios y diablillos.',
      en: 'Flamekeeper Ren can carve a Demon Bone that calms the beast guarding the pit — if you bring enough demon and imp dust.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 80,
    objectives: [
      { type: 'collect', target: 'demon-dust', count: 100, desc: { es: 'Reúne 100 polvo de demonio', en: 'Collect 100 demon dust' } },
      { type: 'collect', target: 'vampire-dust', count: 50, desc: { es: 'Reúne 50 polvo de vampiro', en: 'Collect 50 vampire dust' } },
      { type: 'collect', target: 'silk', count: 100, desc: { es: 'Reúne 100 telas de araña', en: 'Collect 100 spider silk' } },
    ],
    rewards: { gold: 6000, exp: 30000, items: ['demon-bone'] },
    next: 'demonbone_hounds_bargain', repeatable: false, dungeon: null,
  },
  {
    id: 'demonbone_hounds_bargain',
    title: { es: 'El Trato del Sabueso', en: "The Hound's Bargain" },
    desc: {
      es: 'En la boca del Abismo monta guardia un sabueso infernal de tres cabezas. Ofrécele el Hueso de Demonio para que te deje pasar, y reclama lo que arde más abajo.',
      en: 'A three-headed hellhound guards the mouth of the Abyss. Offer it the Demon Bone to be let past, and claim what burns below.',
    },
    giverNpc: 'dragonreach_keeper', city: 'dragonreach', minLevel: 95,
    requiresItems: [{ itemId: 'demon-bone', count: 1 }],
    objectives: [
      { type: 'reach', target: 'demonabyss', count: 1, desc: { es: 'Soborna al sabueso y entra', en: 'Bribe the hound and enter' } },
      { type: 'kill', target: 'demon', count: 15, desc: { es: 'Mata 15 demonios', en: 'Kill 15 demons' } },
    ],
    rewards: { gold: 20000, exp: 120000, items: ['demon_boots'] },
    next: null, repeatable: false, dungeon: 'demonabyss',
  },

  // --- BLOOD SIGNET → the Crimson Vigil (NIGHT-ONLY, Demon Necklace) ---
  {
    id: 'bloodsignet_forge',
    title: { es: 'El Sello de Sangre', en: 'The Blood Signet' },
    desc: {
      es: 'La condesa vampira solo recibe a quien porta un Sello de Sangre. El Sabio lo forja con polvo de vampiro y colmillos… pero hay que reunir mucho.',
      en: 'The vampire countess receives only those bearing a Blood Signet. The Sage forges one from vampire dust and fangs — but you must gather plenty.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 70,
    objectives: [
      { type: 'collect', target: 'vampire-dust', count: 80, desc: { es: 'Reúne 80 polvo de vampiro', en: 'Collect 80 vampire dust' } },
      { type: 'collect', target: 'vampire-fang', count: 10, desc: { es: 'Reúne 10 colmillos de vampiro', en: 'Collect 10 vampire fangs' } },
      { type: 'collect', target: 'blood-vial', count: 20, desc: { es: 'Reúne 20 viales de sangre', en: 'Collect 20 blood vials' } },
    ],
    rewards: { gold: 5000, exp: 22000, items: ['blood-signet'] },
    next: 'bloodsignet_crimson_vigil', repeatable: false, dungeon: null,
  },
  {
    id: 'bloodsignet_crimson_vigil',
    title: { es: 'La Vigilia Carmesí', en: 'The Crimson Vigil' },
    desc: {
      es: 'La corte vampira solo despierta cuando cae la noche. Muestra el Sello de Sangre, sobrevive a la vigilia y la condesa te recompensará.',
      en: 'The vampire court only wakes after dark. Show the Blood Signet, survive the vigil, and the countess will reward you.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 78,
    nightOnly: true,
    requiresItems: [{ itemId: 'blood-signet', count: 1 }],
    objectives: [
      { type: 'kill', target: 'vampire', count: 12, desc: { es: 'Mata 12 vampiros', en: 'Kill 12 vampires' } },
      { type: 'kill', target: 'bat', count: 20, desc: { es: 'Mata 20 murciélagos', en: 'Kill 20 bats' } },
    ],
    rewards: { gold: 12000, exp: 60000, items: ['demon_amulet'] },
    next: null, repeatable: false, dungeon: null,
  },

  // --- DRAGON SEAL → the Sky Vault (Dragon Backpack + a legendary blade) ---
  {
    id: 'dragonseal_forge',
    title: { es: 'El Sello del Dragón', en: 'The Dragon Seal' },
    desc: {
      es: 'La puerta de la Bóveda Celeste reconoce solo a los marcados por el dragón. Reúne polvo y escamas de dragón para que el Sabio talle el Sello.',
      en: 'The door to the Sky Vault knows only those marked by the dragon. Gather dragon dust and scales for the Sage to carve the Seal.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 70,
    objectives: [
      { type: 'collect', target: 'dragon-dust', count: 80, desc: { es: 'Reúne 80 polvo de dragón', en: 'Collect 80 dragon dust' } },
      { type: 'collect', target: 'dragon-scale', count: 15, desc: { es: 'Reúne 15 escamas de dragón', en: 'Collect 15 dragon scales' } },
    ],
    rewards: { gold: 5000, exp: 22000, items: ['dragon-seal'] },
    next: 'dragonseal_sky_vault', repeatable: false, dungeon: null,
  },
  {
    id: 'dragonseal_sky_vault',
    title: { es: 'La Bóveda Celeste', en: 'The Sky Vault' },
    desc: {
      es: 'Con el Sello del Dragón, la Bóveda se abre en el pico más alto. Despeja el nido de wyverns y reclama el tesoro dracónico.',
      en: 'With the Dragon Seal, the Vault opens on the highest peak. Clear the wyvern nest and claim the draconic hoard.',
    },
    giverNpc: 'dragonreach_sage', city: 'dragonreach', minLevel: 80,
    requiresItems: [{ itemId: 'dragon-seal', count: 1 }],
    objectives: [
      { type: 'reach', target: 'dragonlair', count: 1, desc: { es: 'Abre la Bóveda con el Sello', en: 'Open the Vault with the Seal' } },
      { type: 'kill', target: 'wyvern', count: 15, desc: { es: 'Despeja 15 wyverns', en: 'Clear 15 wyverns' } },
      { type: 'kill', target: 'dragon', count: 6, desc: { es: 'Mata 6 dragones', en: 'Kill 6 dragons' } },
    ],
    rewards: { gold: 18000, exp: 90000, items: ['magic_sword', 'dragon_backpack'] },
    next: null, repeatable: false, dungeon: 'dragonlair',
  },

  // --- ABYSSAL SIGIL → the demon-set capstone (Demon Armor + Helmet) ---
  {
    id: 'abyssalsigil_forge',
    title: { es: 'El Sigilo Abisal', en: 'The Abyssal Sigil' },
    desc: {
      es: 'La cámara más profunda del Abismo está sellada con magia infernal. El Lorekeeper traza el Sigilo Abisal con polvo de los muertos, polvo de demonio y una gema de alma.',
      en: 'The deepest chamber of the Abyss is sealed with infernal magic. The Lorekeeper traces the Abyssal Sigil from undead dust, demon dust and a soul gem.',
    },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 95,
    objectives: [
      { type: 'collect', target: 'demon-dust', count: 150, desc: { es: 'Reúne 150 polvo de demonio', en: 'Collect 150 demon dust' } },
      { type: 'collect', target: 'undead-dust', count: 100, desc: { es: 'Reúne 100 polvo de los muertos', en: 'Collect 100 undead dust' } },
      { type: 'collect', target: 'soul-gem', count: 3, desc: { es: 'Reúne 3 gemas de alma', en: 'Collect 3 soul gems' } },
    ],
    rewards: { gold: 12000, exp: 60000, items: ['abyssal-sigil'] },
    next: 'abyssalsigil_throne', repeatable: false, dungeon: null,
  },
  {
    id: 'abyssalsigil_throne',
    title: { es: 'El Trono del Señor Demonio', en: 'The Demon Lord\'s Throne' },
    desc: {
      es: 'Con el Sigilo Abisal rompes el sello del trono. Solo de noche el Señor Demonio se sienta en él. Derrótalo y vístete con su acero.',
      en: 'The Abyssal Sigil shatters the throne\'s seal. Only at night does the Demon Lord sit upon it. Defeat him and wear his steel.',
    },
    giverNpc: 'stonehaven_lorekeeper', city: 'stonehaven', minLevel: 100,
    nightOnly: true,
    requiresItems: [{ itemId: 'abyssal-sigil', count: 1 }],
    objectives: [
      { type: 'reach', target: 'demonabyss', count: 1, desc: { es: 'Rompe el sello del trono', en: 'Break the throne seal' } },
      { type: 'kill', target: 'demon', count: 25, desc: { es: 'Mata 25 demonios', en: 'Kill 25 demons' } },
    ],
    rewards: { gold: 40000, exp: 220000, items: ['demon_armor', 'demon_helmet'] },
    next: null, repeatable: false, dungeon: 'demonabyss',
  },

  {
    id: 'mount_dragon_quest',
    title: { es: 'El Dragón de Hielo Cristalino', en: 'The Crystalline Ice Dragon' },
    desc: {
      es: 'La montura suprema. Adéntrate en la Guarida Glacial, derrota al Dragón Cristalino y trae su escama. Solo héroes de nivel 100.',
      en: 'The supreme mount. Enter the Glacial Lair, defeat the Crystal Dragon and bring its scale. Heroes of level 100 only.',
    },
    giverNpc: 'rivertown_stablemaster', city: 'rivertown', minLevel: 100,
    objectives: [
      { type: 'kill', target: 'crystal_dragon', count: 3, desc: { es: 'Derrota 3 dragones de cristal', en: 'Defeat 3 crystal dragons' } },
      { type: 'collect', target: 'crystal-scale', count: 1, desc: { es: 'Consigue 1 escama cristalina', en: 'Obtain 1 crystal scale' } },
    ],
    rewards: { gold: 20000, exp: 100000, mount: 'crystal_dragon' },
    next: null, repeatable: false, dungeon: 'glaciallair',
  },
];

// --- Chain re-linking pass ---------------------------------------------------
// The new intermediate steps (abyss_chain_*, dragon_chain_*, frost_chain_*,
// orc_chain_*, giant_chain_*, fire_chain_*, mid_chain_*) lead INTO the existing
// gear quests. Here we re-point the existing quests' `next` links so each gear
// payoff continues its saga (and the standalone capstones chain onward), and add
// the cross-region key gates. Done as a by-id pass so the edits live in one place
// and can't drift from the quest bodies above.
const _byId = new Map(QUESTS.map((q) => [q.id, q]));
function _link(id, next) { const q = _byId.get(id); if (q) q.next = next; }
function _gate(id, items) {
  const q = _byId.get(id); if (!q) return;
  q.requiresItems = [...(q.requiresItems || []), ...items];
}
function _setRewards(id, items) { const q = _byId.get(id); if (q) q.rewards = { ...q.rewards, items }; }

// THE DESCENT INTO THE ABYSS — splice the existing demon/abyssal quests into the
// 16-step spine. The early standalone demon quests now sit behind real prereqs.
_link('dragonreach_demon_gate', 'abyss_chain_lesser_lords');   // demon_sword (step 4, 3 prereqs)
_link('abyss_warlords', 'demonbone_forge');                    // demon_shield+helmet (step 6, 5 prereqs)
_link('demonbone_hounds_bargain', 'abyss_chain_descent_floors');// demon_boots → deeper
_link('gear_demon_axe', 'abyss_chain_abyssal_brand');          // demon_axe → sigil tier
_link('abyssalsigil_throne', 'gear_abyssal_helm');             // demon_armor → abyssal helm
_link('gear_abyssal_helm', 'gear_abyssal_plate');              // abyssal helm → plate
_link('gear_abyssal_plate', 'gear_apocalypse_axe');            // abyssal plate → apocalypse axe (finale)

// THE DRAGON PEAKS — weave the dragon weapons into the seal/lair saga.
_link('gear_dragon_hammer', 'dragon_chain_seal_intro');
_link('dragonseal_sky_vault', 'dragon_chain_lord');            // magic_sword → Dragon Lord
_link('gear_dragon_bow', 'dragon_chain_chaos_hunt');           // dragon_bow → three-headed beast
// gear_staff_of_chaos stays a fork terminus (next:null already).
// eternal_bow: the dragon & frost lines MEET — it needs BOTH keys (like cosmic_staff).
_gate('gear_eternal_bow', [{ itemId: 'dragon-seal', count: 1 }, { itemId: 'frost-heart', count: 1 }]);

// THE FROZEN NORTH — thread the frost weapons into the Frost Heart saga.
_link('gear_ice_rapier', 'gear_frost_bow');
_link('gear_frost_bow', 'gear_frost_blade');
_link('gear_frost_blade', 'gear_glacial_axe');
_link('gear_glacial_axe', 'gear_glacial_staff');
_link('gear_glacial_staff', 'frostset_heart');
_link('frostset_lair', 'frost_chain_frozen_seal');             // armor set → crystal golem heart
_link('gear_frozen_shield', 'frostset_relics');
// De-dupe: frostset_relics rewarded glacial_staff, now earned at gear_glacial_staff.
_setRewards('frostset_relics', ['frost_amulet']);

// THE ORC WAR — orc-queen line → royal armor → warlord → hammer → (into giants).
_link('orcqueen_return', 'orc_chain_warbanner');
_link('gear_royal_armor', 'orc_chain_eastern_front');
_link('gear_warlord_sword', 'orc_chain_break_the_fort');
_link('gear_hammer_of_wrath', 'giant_chain_cyclops_smiths');   // orc war graduates into the giant war

// THE CYCLOPS FORGES — ravager → titan → giant relic → aegis (cross-region key).
_link('gear_ravagers_axe', 'giant_chain_titan_trial');
_link('gear_titan_axe', 'giant_chain_giant_relic');
_gate('gear_aegis_shield', [{ itemId: 'giant-relic', count: 1 }]);

// THE FIRE OF THE ABYSS — hellforged → magma → phoenix pyre → relics → hermes.
_link('gear_hellforged', 'fire_chain_living_magma');
_link('gear_magma_axe', 'fire_chain_phoenix_pyre');
_link('phoenix_relics', 'fire_chain_efreet_winds');            // phoenix set → efreet winds → hermes

// THE STORM BOW — its mini-chain forges a Storm Totem the bow now requires.
_gate('gear_storm_bow', [{ itemId: 'storm-totem', count: 1 }]);

// THE RINGSMITH'S TRIALS — thread the five master-ring quests into one trial.
_link('gear_ring_sword', 'gear_ring_axe');
_link('gear_ring_axe', 'gear_ring_distance');
_link('gear_ring_distance', 'gear_ring_mage');
_link('gear_ring_mage', 'gear_ring_vigor');

// --- Reward-level alignment --------------------------------------------------
// The user's rule: a quest that REWARDS an item must require at least that item's
// own level, so you can always equip what you earn (the "demon helmet from a lv55
// quest but the helmet is lv95" nonsense). We raise each quest's minLevel to the
// highest levelReq among its reward items. Done as a pass (not by hand on 22
// quests) so the invariant holds automatically as items/quests change.
import { getWeapon, getArmor, getQuiver, getContainer } from './items.js';
function rewardLevelReq(itemId) {
  const d = getWeapon(itemId) || getArmor(itemId) || getQuiver(itemId) || getContainer(itemId);
  return d ? (d.levelReq || 1) : 0;
}
for (const q of QUESTS) {
  const items = (q.rewards && q.rewards.items) || [];
  let need = q.minLevel || 1;
  for (const id of items) need = Math.max(need, rewardLevelReq(id));
  q.minLevel = need;
}

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
