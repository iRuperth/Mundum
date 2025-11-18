// Mundum profession (vocation) database — PURE DATA. No Three.js, no DOM.
// Four Tibia-style vocations. Each defines which weapon TYPES it may equip,
// per-level hp/mana growth, attack range, and a MapleStory-style SKILL TREE.
//
// Skill tree model: every skill has its own level (1..maxLevel). Its strength
// (power) and mana cost scale by the SKILL LEVEL, not the character level.
// The character level only GATES unlocking via reqLevel.
//
// Weapon types match src/data/items.js: 'sword' | 'axe' | 'bow' | 'wand' | 'shield'.
// Summon families match keys in src/data/creatures.js (imp, bat, wolf, ...).
//
// Engine-rendered skill kinds (the only valid ones): 'area' | 'melee' |
// 'ranged' | 'heal' | 'summon'.
//
// Skill schema:
// { id, name:{es,en}, desc:{es,en}, reqLevel, maxLevel, kind,
//   manaBase, manaPerLevel, cooldown, powerBase, powerPerLevel, radius,
//   summonFamily, summonCount }
// Legacy aliases (minLevel, manaCost, power) are mirrored for older engine code.

export const PROFESSIONS = [
  {
    id: 'mage',
    name: { es: 'Hechicero', en: 'Sorcerer' },
    desc: {
      es: 'Maestro del daño mágico a distancia. Único que usa varitas ofensivas. Mucho maná, poca defensa.',
      en: 'Master of ranged magic damage. The only one who wields offensive wands. High mana, low defense.',
    },
    color: 0x9b30ff,
    spellColor: 0x9b30ff, // sorcerer magic is purple
    damageMul: 1.2,       // hits 20% harder than the druid
    allowedWeapons: ['wand'],
    baseHp: 100,
    baseMana: 20,
    hpPerLevel: 5,
    manaPerLevel: 25,
    attackRange: 14,
    // Regen: +3 mana every 2s, +1 hp every 5s.
    regen: { hp: { amount: 1, every: 5 }, mana: { amount: 3, every: 2 } },
    skills: [
      {
        id: 'energy_bolt',
        name: { es: 'Descarga de Energía', en: 'Energy Bolt' },
        desc: { es: 'Una descarga básica de energía a un enemigo.', en: 'A basic burst of energy at one foe.' },
        reqLevel: 1, maxLevel: 20, kind: 'area',
        manaBase: 6, manaPerLevel: 1, cooldown: 1.2,
        powerBase: 12, powerPerLevel: 9, radius: 1.5,
      },
      {
        id: 'magic_claw',
        name: { es: 'Garra Mágica', en: 'Magic Claw' },
        desc: { es: 'Dos zarpazos de energía contra un enemigo.', en: 'Two energy claws strike a single foe.' },
        reqLevel: 4, maxLevel: 20, kind: 'area',
        manaBase: 10, manaPerLevel: 1.4, cooldown: 1.4,
        powerBase: 20, powerPerLevel: 12, radius: 1.5,
      },
      {
        id: 'fire_arrow',
        name: { es: 'Flecha de Fuego', en: 'Fire Arrow' },
        desc: { es: 'Una saeta ardiente que perfora a un enemigo.', en: 'A burning bolt that pierces a single foe.' },
        reqLevel: 12, maxLevel: 20, kind: 'area',
        manaBase: 18, manaPerLevel: 2, cooldown: 1.8,
        powerBase: 40, powerPerLevel: 16, radius: 1.6,
      },
      {
        id: 'thunder_spear',
        name: { es: 'Lanza de Trueno', en: 'Thunder Spear' },
        desc: { es: 'Una lanza de rayo que electrocuta a un enemigo.', en: 'A lance of lightning that shocks one foe.' },
        reqLevel: 20, maxLevel: 20, kind: 'area',
        manaBase: 28, manaPerLevel: 2.5, cooldown: 2.2,
        powerBase: 70, powerPerLevel: 18, radius: 1.7,
      },
      {
        id: 'poison_mist',
        name: { es: 'Niebla Venenosa', en: 'Poison Mist' },
        desc: { es: 'Una nube tóxica que corroe a los enemigos cercanos.', en: 'A toxic cloud that corrodes nearby foes.' },
        reqLevel: 26, maxLevel: 15, kind: 'area',
        manaBase: 40, manaPerLevel: 3, cooldown: 4,
        powerBase: 90, powerPerLevel: 14, radius: 4,
      },
      {
        id: 'explosion',
        name: { es: 'Explosión', en: 'Explosion' },
        desc: { es: 'Una detonación arcana que sacude una zona.', en: 'An arcane detonation that rocks an area.' },
        reqLevel: 30, maxLevel: 20, kind: 'area',
        manaBase: 55, manaPerLevel: 3.5, cooldown: 4.5,
        powerBase: 130, powerPerLevel: 16, radius: 4.5,
      },
      {
        id: 'ice_strike',
        name: { es: 'Golpe de Hielo', en: 'Ice Strike' },
        desc: { es: 'Picos de hielo brotan a tu alrededor.', en: 'Ice spikes erupt all around you.' },
        reqLevel: 40, maxLevel: 20, kind: 'area',
        manaBase: 75, manaPerLevel: 4, cooldown: 5,
        powerBase: 190, powerPerLevel: 18, radius: 5,
      },
      {
        id: 'meteor',
        name: { es: 'Meteoro', en: 'Meteor' },
        desc: { es: 'Llama una lluvia de meteoros sobre una gran zona.', en: 'Calls a meteor shower over a large area.' },
        reqLevel: 60, maxLevel: 20, kind: 'area',
        manaBase: 140, manaPerLevel: 6, cooldown: 10,
        powerBase: 340, powerPerLevel: 24, radius: 7,
      },
      {
        id: 'genesis',
        name: { es: 'Génesis', en: 'Genesis' },
        desc: { es: 'Una luz devastadora cae sobre un área enorme.', en: 'A devastating light falls over a huge area.' },
        reqLevel: 90, maxLevel: 20, kind: 'area',
        manaBase: 220, manaPerLevel: 8, cooldown: 18,
        powerBase: 620, powerPerLevel: 34, radius: 9,
      },
    ],
  },
  {
    id: 'knight',
    name: { es: 'Caballero', en: 'Knight' },
    desc: {
      es: 'Tanque cuerpo a cuerpo. Usa espadas, hachas y escudos. Mucha vida y defensa.',
      en: 'Melee tank. Wields swords, axes and shields. High hp and defense.',
    },
    color: 0xb04a2f,
    allowedWeapons: ['sword', 'axe', 'shield'],
    baseHp: 100,
    baseMana: 20,
    hpPerLevel: 25,
    manaPerLevel: 5,
    attackRange: 3,
    // Regen: +3 hp every 2s, +1 mana every 5s.
    regen: { hp: { amount: 3, every: 2 }, mana: { amount: 1, every: 5 } },
    skills: [
      {
        id: 'slash_blast',
        name: { es: 'Tajo Expansivo', en: 'Slash Blast' },
        desc: { es: 'Un tajo que golpea a los enemigos cercanos.', en: 'A sweeping slash that hits nearby foes.' },
        reqLevel: 1, maxLevel: 20, kind: 'area',
        manaBase: 6, manaPerLevel: 0.8, cooldown: 1.4,
        powerBase: 14, powerPerLevel: 9, radius: 3,
      },
      {
        id: 'power_strike',
        name: { es: 'Golpe Poderoso', en: 'Power Strike' },
        desc: { es: 'Un mandoble brutal contra un solo enemigo.', en: 'A brutal blow against a single foe.' },
        reqLevel: 5, maxLevel: 20, kind: 'melee',
        manaBase: 10, manaPerLevel: 1, cooldown: 2,
        powerBase: 32, powerPerLevel: 13, radius: 2.4,
      },
      {
        id: 'rage_bleed',
        name: { es: 'Furia Sangrante', en: 'Rage' },
        desc: { es: 'Un golpe furioso que hace sangrar al enemigo.', en: 'A raging blow that makes the foe bleed.' },
        reqLevel: 12, maxLevel: 20, kind: 'melee',
        manaBase: 18, manaPerLevel: 1.4, cooldown: 3,
        powerBase: 60, powerPerLevel: 15, radius: 2.4,
      },
      {
        id: 'brandish',
        name: { es: 'Doble Tajo', en: 'Brandish' },
        desc: { es: 'Dos cortes veloces contra un enemigo.', en: 'Two swift cuts against a single foe.' },
        reqLevel: 20, maxLevel: 20, kind: 'melee',
        manaBase: 28, manaPerLevel: 2, cooldown: 3.2,
        powerBase: 95, powerPerLevel: 18, radius: 2.5,
      },
      {
        id: 'ground_smash',
        name: { es: 'Golpe Sísmico', en: 'Ground Smash' },
        desc: { es: 'Golpeas el suelo dañando a todo a tu alrededor.', en: 'Slam the ground, damaging everything around you.' },
        reqLevel: 28, maxLevel: 20, kind: 'area',
        manaBase: 40, manaPerLevel: 2.6, cooldown: 4.5,
        powerBase: 120, powerPerLevel: 15, radius: 4,
      },
      {
        id: 'second_wind',
        name: { es: 'Segundo Aliento', en: 'Second Wind' },
        desc: { es: 'Recuperas el aliento y restauras algo de vida.', en: 'Catch your breath and recover some health.' },
        reqLevel: 35, maxLevel: 15, kind: 'heal',
        manaBase: 30, manaPerLevel: 2, cooldown: 12,
        powerBase: 90, powerPerLevel: 14, radius: 0,
      },
      {
        id: 'coma',
        name: { es: 'Conmoción', en: 'Coma' },
        desc: { es: 'Un golpe demoledor que aturde a un enemigo.', en: 'A crushing strike that stuns one foe.' },
        reqLevel: 45, maxLevel: 20, kind: 'melee',
        manaBase: 55, manaPerLevel: 3, cooldown: 5,
        powerBase: 200, powerPerLevel: 20, radius: 2.6,
      },
      {
        id: 'axe_booster',
        name: { es: 'Tajo Reforzado', en: 'Heavy Cleave' },
        desc: { es: 'Un corte reforzado de gran potencia.', en: 'A boosted cleave of great force.' },
        reqLevel: 60, maxLevel: 20, kind: 'melee',
        manaBase: 80, manaPerLevel: 3.5, cooldown: 6,
        powerBase: 300, powerPerLevel: 22, radius: 2.6,
      },
      {
        id: 'crusher',
        name: { es: 'Triturador', en: 'Crusher' },
        desc: { es: 'Descargas un golpe demoledor sobre un enemigo.', en: 'Deliver a devastating finishing blow to one foe.' },
        reqLevel: 90, maxLevel: 20, kind: 'melee',
        manaBase: 130, manaPerLevel: 5, cooldown: 14,
        powerBase: 560, powerPerLevel: 30, radius: 2.6,
      },
    ],
  },
  {
    id: 'paladin',
    name: { es: 'Paladín', en: 'Paladin' },
    desc: {
      es: 'Tirador equilibrado. Único que usa arcos y flechas, con el mayor alcance de todos.',
      en: 'Balanced ranged fighter. The only one who wields bows and arrows, with the longest reach of all.',
    },
    color: 0x2f8fb0,
    allowedWeapons: ['bow'],
    baseHp: 100,
    baseMana: 20,
    hpPerLevel: 15,
    manaPerLevel: 15,
    attackRange: 20,
    // Regen: +2 mana and +2 hp every 4s.
    regen: { hp: { amount: 2, every: 4 }, mana: { amount: 2, every: 4 } },
    skills: [
      {
        id: 'arrow_blow',
        name: { es: 'Flechazo', en: 'Arrow Blow' },
        desc: { es: 'Una flecha veloz a un solo objetivo.', en: 'A swift arrow at a single target.' },
        reqLevel: 1, maxLevel: 20, kind: 'ranged',
        manaBase: 6, manaPerLevel: 0.8, cooldown: 1.2,
        powerBase: 12, powerPerLevel: 9, radius: 1.2,
      },
      {
        id: 'double_shot',
        name: { es: 'Disparo Doble', en: 'Double Shot' },
        desc: { es: 'Dos flechas seguidas contra un objetivo.', en: 'Two arrows in quick succession at a target.' },
        reqLevel: 5, maxLevel: 20, kind: 'ranged',
        manaBase: 10, manaPerLevel: 1, cooldown: 1.6,
        powerBase: 30, powerPerLevel: 13, radius: 1.4,
      },
      {
        id: 'power_knockback',
        name: { es: 'Disparo de Empuje', en: 'Power Knock-back' },
        desc: { es: 'Una flecha potente que repele al objetivo.', en: 'A forceful arrow that repels the target.' },
        reqLevel: 12, maxLevel: 20, kind: 'ranged',
        manaBase: 18, manaPerLevel: 1.4, cooldown: 2.2,
        powerBase: 60, powerPerLevel: 15, radius: 1.5,
      },
      {
        id: 'arrow_bomb',
        name: { es: 'Flecha Bomba', en: 'Arrow Bomb' },
        desc: { es: 'Una flecha que estalla al impactar.', en: 'An arrow that bursts on impact.' },
        reqLevel: 20, maxLevel: 20, kind: 'ranged',
        manaBase: 30, manaPerLevel: 2.2, cooldown: 3.2,
        powerBase: 95, powerPerLevel: 16, radius: 3,
      },
      {
        id: 'strafe',
        name: { es: 'Ráfaga', en: 'Strafe' },
        desc: { es: 'Cuatro flechas certeras sobre un objetivo.', en: 'Four precise arrows at a single target.' },
        reqLevel: 28, maxLevel: 20, kind: 'ranged',
        manaBase: 42, manaPerLevel: 2.8, cooldown: 3.5,
        powerBase: 130, powerPerLevel: 18, radius: 1.6,
      },
      {
        id: 'hurricane',
        name: { es: 'Huracán', en: 'Hurricane' },
        desc: { es: 'Una andanada continua de flechas veloces.', en: 'A continuous barrage of rapid arrows.' },
        reqLevel: 36, maxLevel: 20, kind: 'ranged',
        manaBase: 60, manaPerLevel: 3.2, cooldown: 5,
        powerBase: 180, powerPerLevel: 18, radius: 1.8,
      },
      {
        id: 'inferno_arrow',
        name: { es: 'Flecha Infernal', en: 'Inferno Arrow' },
        desc: { es: 'Una flecha ardiente que incendia una zona.', en: 'A blazing arrow that sets an area on fire.' },
        reqLevel: 45, maxLevel: 20, kind: 'area',
        manaBase: 75, manaPerLevel: 3.8, cooldown: 6,
        powerBase: 220, powerPerLevel: 20, radius: 4.5,
      },
      {
        id: 'sharp_eyes',
        name: { es: 'Disparo Certero', en: 'Sharp Snipe' },
        desc: { es: 'Un disparo preciso de largo alcance a un objetivo.', en: 'A precise long-range shot at one target.' },
        reqLevel: 60, maxLevel: 20, kind: 'ranged',
        manaBase: 90, manaPerLevel: 4, cooldown: 6.5,
        powerBase: 320, powerPerLevel: 24, radius: 1.5,
      },
      {
        id: 'sky_volley',
        name: { es: 'Andanada Celeste', en: 'Sky Volley' },
        desc: { es: 'Una andanada masiva cae sobre una zona enorme.', en: 'A massive volley rains over a huge area.' },
        reqLevel: 90, maxLevel: 20, kind: 'ranged',
        manaBase: 200, manaPerLevel: 7, cooldown: 16,
        powerBase: 560, powerPerLevel: 30, radius: 8,
      },
    ],
  },
  {
    id: 'druid',
    name: { es: 'Druida', en: 'Druid' },
    desc: {
      es: 'Apoyo y sanación. Cura a sí mismo y a aliados, invoca criaturas y usa varitas curativas.',
      en: 'Support and healing. Heals self and allies, summons creatures, and wields healing wands.',
    },
    color: 0x2ecc71,
    spellColor: 0x2ecc71, // druid magic is green
    damageMul: 1.0,
    allowedWeapons: ['wand'],
    baseHp: 100,
    baseMana: 20,
    hpPerLevel: 5,
    manaPerLevel: 25,
    attackRange: 17,       // 20% more reach than the sorcerer
    // Same caster rhythm as the mage: +3 mana every 2s, +1 hp every 5s.
    regen: { hp: { amount: 1, every: 5 }, mana: { amount: 3, every: 2 } },
    skills: [
      {
        id: 'heal',
        name: { es: 'Curación', en: 'Heal' },
        desc: { es: 'Restaura tu propia vida con magia natural.', en: 'Restore your own health with nature magic.' },
        reqLevel: 1, maxLevel: 20, kind: 'heal',
        manaBase: 8, manaPerLevel: 1.5, cooldown: 2,
        powerBase: 24, powerPerLevel: 12, radius: 0,
      },
      {
        id: 'holy_arrow',
        name: { es: 'Flecha Sagrada', en: 'Holy Arrow' },
        desc: { es: 'Un dardo de energía natural a un enemigo.', en: 'A bolt of nature energy at one foe.' },
        reqLevel: 6, maxLevel: 20, kind: 'area',
        manaBase: 12, manaPerLevel: 1.2, cooldown: 1.6,
        powerBase: 26, powerPerLevel: 12, radius: 1.6,
      },
      {
        id: 'bless',
        name: { es: 'Bendición', en: 'Bless' },
        desc: { es: 'Una bendición que restaura algo de vida.', en: 'A blessing that restores some health.' },
        reqLevel: 12, maxLevel: 20, kind: 'heal',
        manaBase: 20, manaPerLevel: 2, cooldown: 3,
        powerBase: 60, powerPerLevel: 14, radius: 0,
      },
      {
        id: 'summon_imp',
        name: { es: 'Invocar Diablillo', en: 'Summon Imp' },
        desc: { es: 'Invoca diablillos que luchan a tu lado.', en: 'Summon imps that fight at your side.' },
        reqLevel: 20, maxLevel: 15, kind: 'summon',
        manaBase: 90, manaPerLevel: 4, cooldown: 12,
        powerBase: 0, powerPerLevel: 0, radius: 0,
        summonFamily: 'imp', summonCount: 2,
      },
      {
        id: 'entangle',
        name: { es: 'Enredadera', en: 'Entangle' },
        desc: { es: 'Espinas brotan dañando a los enemigos cercanos.', en: 'Thorns erupt, damaging nearby foes.' },
        reqLevel: 28, maxLevel: 20, kind: 'area',
        manaBase: 45, manaPerLevel: 3, cooldown: 4.5,
        powerBase: 100, powerPerLevel: 15, radius: 4,
      },
      {
        id: 'mass_heal',
        name: { es: 'Curación en Masa', en: 'Mass Heal' },
        desc: { es: 'Cura a todos los aliados a tu alrededor.', en: 'Heal every ally around you.' },
        reqLevel: 36, maxLevel: 20, kind: 'heal',
        manaBase: 80, manaPerLevel: 4, cooldown: 6,
        powerBase: 150, powerPerLevel: 18, radius: 6,
      },
      {
        id: 'summon_wolf',
        name: { es: 'Invocar Lobo', en: 'Summon Wolf' },
        desc: { es: 'Invoca un lobo feroz que combate por ti.', en: 'Summon a fierce wolf to fight for you.' },
        reqLevel: 50, maxLevel: 15, kind: 'summon',
        manaBase: 140, manaPerLevel: 5, cooldown: 16,
        powerBase: 0, powerPerLevel: 0, radius: 0,
        summonFamily: 'wolf', summonCount: 1,
      },
      {
        id: 'holy_symbol',
        name: { es: 'Símbolo Sagrado', en: 'Holy Symbol' },
        desc: { es: 'Una gran ola de vida sana a los aliados cercanos.', en: 'A great wave of life heals nearby allies.' },
        reqLevel: 60, maxLevel: 20, kind: 'heal',
        manaBase: 120, manaPerLevel: 5, cooldown: 8,
        powerBase: 280, powerPerLevel: 22, radius: 7,
      },
      {
        id: 'sanctuary',
        name: { es: 'Santuario', en: 'Sanctuary' },
        desc: { es: 'Una ola de vida restaura a todos los aliados cercanos.', en: 'A wave of life restores all nearby allies.' },
        reqLevel: 80, maxLevel: 20, kind: 'heal',
        manaBase: 200, manaPerLevel: 7, cooldown: 18,
        powerBase: 520, powerPerLevel: 28, radius: 9,
      },
    ],
  },
];

// Mirror new fields onto the legacy field names the older engine still reads
// (minLevel, manaCost, power). Skill power/mana scale by SKILL LEVEL at runtime
// through skillPower()/skillMana(); these aliases just hold the level-1 values.
for (const p of PROFESSIONS) {
  for (const s of p.skills) {
    s.minLevel = s.reqLevel;
    s.manaCost = s.manaBase;
    s.power = s.powerBase;
  }
}

const BY_ID = new Map(PROFESSIONS.map((p) => [p.id, p]));

// Look up a profession by id, or undefined if unknown.
export function getProfession(id) {
  return BY_ID.get(id);
}

// True if the profession may equip the given weapon type.
export function canUseWeaponType(professionId, weaponType) {
  const p = BY_ID.get(professionId);
  return !!p && p.allowedWeapons.includes(weaponType);
}

// Skills unlockable at the given character level (reqLevel <= charLevel).
export function skillsForLevel(professionId, charLevel) {
  const p = BY_ID.get(professionId);
  if (!p) return [];
  return p.skills.filter((s) => charLevel >= s.reqLevel);
}

// Every skill of a profession (the full tree, for the skills panel).
export function skillsOf(professionId) {
  const p = BY_ID.get(professionId);
  return p ? p.skills : [];
}

// Look up a skill by id across all professions.
const SKILL_BY_ID = new Map();
for (const p of PROFESSIONS) for (const sk of p.skills) SKILL_BY_ID.set(sk.id, sk);
export function getSkill(id) { return SKILL_BY_ID.get(id) || null; }

// Derived stats for a profession at a given level.
export function professionStats(professionId, level) {
  const p = BY_ID.get(professionId);
  if (!p) return { maxHp: 0, maxMana: 0, attackRange: 0 };
  const lv = Math.max(1, level);
  return {
    maxHp: Math.round(p.baseHp + p.hpPerLevel * (lv - 1)),
    maxMana: Math.round(p.baseMana + p.manaPerLevel * (lv - 1)),
    attackRange: p.attackRange,
    damageMul: p.damageMul || 1,
    spellColor: p.spellColor || p.color,
  };
}

// Regen rhythm for a profession: { hp:{amount,every}, mana:{amount,every} } in
// seconds. Falls back to a gentle balanced default for unknown ids.
export function professionRegen(professionId) {
  const p = BY_ID.get(professionId);
  return (p && p.regen) || { hp: { amount: 2, every: 4 }, mana: { amount: 2, every: 4 } };
}

// HP/mana gained on level-up for a profession (one level), derived from the
// per-level growth fields so it stays in sync with professionStats().
export function professionLevelGain(professionId) {
  const p = BY_ID.get(professionId);
  if (!p) return { hp: 10, mana: 10 };
  return { hp: p.hpPerLevel, mana: p.manaPerLevel };
}

// Effective power (damage or heal) of a skill at a given SKILL LEVEL.
export function skillPower(skill, skillLevel) {
  if (!skill) return 0;
  const lv = Math.max(1, skillLevel || 1);
  return Math.round(skill.powerBase + skill.powerPerLevel * (lv - 1));
}

// Mana cost of a skill at a given SKILL LEVEL.
export function skillMana(skill, skillLevel) {
  if (!skill) return 0;
  const lv = Math.max(1, skillLevel || 1);
  return Math.round((skill.manaBase || 0) + (skill.manaPerLevel || 0) * (lv - 1));
}
