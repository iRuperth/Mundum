// Mundum MOUNTS — PURE DATA. No Three.js, no DOM.
// Ten rideable mounts. Each maps onto a creature family/design built by
// buildCreatureModel(), so the art style matches the bestiary exactly and the
// quad/dragon/bug animators trot/flap them for free.
//
// Every mount gives the same buff: +30% movement speed and +30% jump height
// (MOUNT_SPEED_MUL / MOUNT_JUMP_MUL, read by player.js). The flavor difference
// is purely cosmetic + how you earn it.
//
// Mount shape:
//   { id, name:{es,en}, family, color, scale, seatFrac, riderScale,
//     source:'shop'|'quest', cost?, levelReq?, questId?, desc:{es,en} }
//   family       creature family/design key passed to buildCreatureModel
//   color/scale  override the design's defaults so the mount reads bigger/tamer
//   seatFrac     where the rider sits = this fraction of the mount's measured
//                bbox height (auto-adapts to scale). Quadrupeds ~0.55-0.62;
//                spiders/scorpions sit on the abdomen ~0.78; dragons ~0.6.
//   riderScale   rider model scale (default 0.92, matching the player)
//   source       'shop'  → sold by the stable master (2 of them)
//                'quest' → granted by a level-gated quest reward
//   cost         gold price (shop mounts)
//   levelReq     level the quest unlocks at (quest mounts) — used to sort/show
//   questId      the quest whose reward grants this mount (quest mounts)

// Per-mount buffs. Each mount carries its OWN bonus block:
//   bonus: { speed, jump, shielding?, hpRegen?, manaRegen? }
//     speed      additive movement bonus (0.2 = +20% speed)
//     jump       additive jump-height bonus (0.1 = +10% jump)
//     shielding  flat shielding/defense added WHILE mounted (bear)
//     hpRegen    { amount, every } → +amount HP every `every` seconds (scorpion)
//     manaRegen  { amount, every } → +amount mana every `every` seconds (stag)
// player.js / main.js read these via mountSystem when the player mounts.
// (MOUNT_SPEED_MUL / MOUNT_JUMP_MUL kept as a safe fallback for any mount that
//  somehow lacks a bonus block.)
export const MOUNT_SPEED_MUL = 1.2;
export const MOUNT_JUMP_MUL = 1.1;

export const MOUNTS = [
  // ===== SHOP MOUNTS (the stable master sells exactly these two) =====
  {
    id: 'horse',
    name: { es: 'Caballo', en: 'Horse' },
    family: 'mount_horse',
    color: 0x9a6b3f, scale: 1.0, seatFrac: 0.6, riderScale: 0.82,
    source: 'shop', cost: 450,
    bonus: { speed: 0.2, jump: 0.1 },
    desc: {
      es: 'Tu primera montura. Un caballo robusto y fiel, perfecto para cubrir el mundo.',
      en: 'Your first mount. A sturdy, faithful horse, perfect for covering ground.',
    },
  },
  {
    id: 'wolf_mount',
    name: { es: 'Lobo de Monta', en: 'Riding Wolf' },
    family: 'mount_wolf',
    color: 0x6f7480, scale: 1.05, seatFrac: 0.62, riderScale: 0.8,
    source: 'shop', cost: 1200,
    bonus: { speed: 0.2, jump: 0.2 },
    desc: {
      es: 'Un gran lobo gris domesticado. Ágil y silencioso por los bosques.',
      en: 'A great tamed grey wolf. Nimble and silent through the woods.',
    },
  },

  // ===== QUEST MOUNTS (earned, gated by level — 8 of them, climbing) =====
  {
    id: 'tiger_mount',
    name: { es: 'Tigre', en: 'Tiger' },
    family: 'mount_tiger',
    color: 0xd98a2b, scale: 1.1, seatFrac: 0.6, riderScale: 0.82,
    source: 'quest', levelReq: 15, questId: 'mount_tiger_quest',
    bonus: { speed: 0.2, jump: 0.2 },
    desc: {
      es: 'Un tigre de franjas ardientes. Rápido y feroz, recompensa del Domador.',
      en: 'A blazing-striped tiger. Fast and fierce — the Tamer\'s reward.',
    },
  },
  {
    id: 'boar_mount',
    name: { es: 'Jabalí de Guerra', en: 'War Boar' },
    family: 'mount_boar',
    color: 0x5a4030, scale: 1.15, seatFrac: 0.62, riderScale: 0.82,
    source: 'quest', levelReq: 20, questId: 'mount_boar_quest',
    bonus: { speed: 0.2, jump: 0.1 },
    desc: {
      es: 'Un jabalí acorazado de colmillos enormes. Embiste sin miedo.',
      en: 'An armored boar with huge tusks. It charges without fear.',
    },
  },
  {
    id: 'bear_mount',
    name: { es: 'Oso de Montaña', en: 'Mountain Bear' },
    family: 'mount_bear',
    color: 0x5a4030, scale: 1.25, seatFrac: 0.6, riderScale: 0.85,
    source: 'quest', levelReq: 30, questId: 'mount_bear_quest',
    bonus: { speed: 0.2, jump: 0, shielding: 5 },
    desc: {
      es: 'Un oso pardo colosal. Lento de aspecto, imparable de verdad. Otorga +5 de escudo mientras lo montas.',
      en: 'A colossal brown bear. Slow-looking, truly unstoppable. Grants +5 shielding while ridden.',
    },
  },
  {
    id: 'stag_mount',
    name: { es: 'Ciervo Real', en: 'Royal Stag' },
    family: 'mount_stag',
    color: 0x8a5a2a, scale: 1.15, seatFrac: 0.55, riderScale: 0.82,
    source: 'quest', levelReq: 40, questId: 'mount_stag_quest',
    bonus: { speed: 0.2, jump: 0, manaRegen: { amount: 2, every: 4 } },
    desc: {
      es: 'Un ciervo de astas enormes y porte noble del bosque profundo. Restaura +2 de maná cada 4 segundos mientras lo montas.',
      en: 'A great-antlered stag with the noble bearing of the deep forest. Restores +2 mana every 4 seconds while ridden.',
    },
  },
  {
    id: 'spider_mount',
    name: { es: 'Araña Gigante', en: 'Giant Spider' },
    family: 'mount_spider',
    // Let the design's own dark tint + 1.5 scale win; seat the rider on the
    // cephalothorax saddle (absolute riderY, since the huge abdomen would throw
    // off a bbox-fraction seat).
    scale: 1.5, riderY: 0.5, riderScale: 0.78,
    source: 'quest', levelReq: 55, questId: 'mount_spider_quest',
    bonus: { speed: 0.25, jump: 0.25 },
    desc: {
      es: 'Una araña colosal domada. Trepa donde nadie más se atreve.',
      en: 'A tamed colossal spider. It climbs where none else dare.',
    },
  },
  {
    id: 'scorpion_mount',
    name: { es: 'Escorpión del Desierto', en: 'Desert Scorpion' },
    family: 'mount_scorpion',
    color: 0xc8a44a, scale: 1.3, seatFrac: 0.82, riderScale: 0.8,
    source: 'quest', levelReq: 70, questId: 'mount_scorpion_quest',
    bonus: { speed: 0.2, jump: 0.1, hpRegen: { amount: 2, every: 4 } },
    desc: {
      es: 'Un escorpión acorazado de las dunas, con un aguijón curvo y reluciente. Restaura +2 de vida cada 4 segundos mientras lo montas.',
      en: 'An armored dune scorpion with a gleaming, curved sting. Restores +2 HP every 4 seconds while ridden.',
    },
  },
  {
    id: 'wyvern_mount',
    name: { es: 'Wyvern', en: 'Wyvern' },
    family: 'mount_wyvern',
    color: 0x4a8a5a, scale: 1.25, seatFrac: 0.62, riderScale: 0.82,
    source: 'quest', levelReq: 85, questId: 'mount_wyvern_quest',
    bonus: { speed: 0.25, jump: 0.2 },
    desc: {
      es: 'Un wyvern alado de escamas verdes. La penúltima montura, casi un dragón.',
      en: 'A winged green-scaled wyvern. The penultimate mount, almost a dragon.',
    },
  },
  {
    id: 'crystal_dragon',
    name: { es: 'Dragón de Hielo Cristalino', en: 'Crystalline Ice Dragon' },
    family: 'mount_crystal_dragon',
    color: 0xbfe8ff, scale: 1.5, seatFrac: 0.6, riderScale: 0.85,
    source: 'quest', levelReq: 100, questId: 'mount_dragon_quest',
    bonus: { speed: 0.2, jump: 0.3 },
    desc: {
      es: 'La montura suprema: un dragón volador de cristal de hielo casi transparente, ' +
        'con escamas heladas, púas de escarcha y un aliento gélido. Solo para los héroes de nivel 100.',
      en: 'The supreme mount: a flying dragon of near-transparent ice crystal, with frozen ' +
        'scales, frost spikes and a chilling breath. Only for heroes of level 100.',
    },
  },
];

const BY_ID = Object.fromEntries(MOUNTS.map((m) => [m.id, m]));

export function getMount(id) { return BY_ID[id] || null; }
export function shopMounts() { return MOUNTS.filter((m) => m.source === 'shop'); }
export function questMounts() { return MOUNTS.filter((m) => m.source === 'quest'); }

// Map a quest id → the mount it grants (so completeQuest can unlock it).
const BY_QUEST = Object.fromEntries(
  MOUNTS.filter((m) => m.questId).map((m) => [m.questId, m.id]),
);
export function mountForQuest(questId) { return BY_QUEST[questId] || null; }
