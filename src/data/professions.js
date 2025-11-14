// Mundum profession (vocation) database — PURE DATA. No Three.js, no DOM.
// Four Tibia-style vocations. Each defines which weapon TYPES it may equip,
// per-level hp/mana growth, attack range, and a list of active skills that
// unlock by level and scale with the character's level.
//
// Weapon types match src/data/items.js: 'sword' | 'axe' | 'bow' | 'wand' | 'shield'.
// Summon families match keys in src/data/creatures.js (imp, bat, wolf, ...).

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
        id: 'fireball',
        name: { es: 'Bola de Fuego', en: 'Fireball' },
        desc: { es: 'Estalla en una zona quemando a los enemigos cercanos.', en: 'Bursts in an area, burning nearby foes.' },
        minLevel: 8, manaCost: 20, cooldown: 2,
        kind: 'area', power: 45, powerPerLevel: 3.2, radius: 3.5,
      },
      {
        id: 'ice_nova',
        name: { es: 'Nova de Hielo', en: 'Ice Nova' },
        desc: { es: 'Onda gélida que daña todo a tu alrededor.', en: 'A freezing wave that damages everything around you.' },
        minLevel: 20, manaCost: 55, cooldown: 4,
        kind: 'area', power: 120, powerPerLevel: 5.5, radius: 5,
      },
      {
        id: 'meteor',
        name: { es: 'Meteoro', en: 'Meteor' },
        desc: { es: 'Llama una lluvia de meteoros en una gran zona.', en: 'Calls a meteor shower over a large area.' },
        minLevel: 50, manaCost: 140, cooldown: 8,
        kind: 'area', power: 360, powerPerLevel: 9, radius: 7,
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
        id: 'power_strike',
        name: { es: 'Golpe Poderoso', en: 'Power Strike' },
        desc: { es: 'Un mandoble brutal contra un solo enemigo.', en: 'A brutal blow against a single foe.' },
        minLevel: 5, manaCost: 12, cooldown: 2.5,
        kind: 'melee', power: 40, powerPerLevel: 4.5, radius: 2.4,
      },
      {
        id: 'whirlwind',
        name: { es: 'Torbellino', en: 'Whirlwind' },
        desc: { es: 'Giras tu arma golpeando a todos los enemigos cercanos.', en: 'Spin your weapon, hitting every nearby foe.' },
        minLevel: 18, manaCost: 35, cooldown: 5,
        kind: 'area', power: 70, powerPerLevel: 4, radius: 3.5,
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
        id: 'piercing_shot',
        name: { es: 'Disparo Perforante', en: 'Piercing Shot' },
        desc: { es: 'Una flecha veloz que atraviesa al objetivo.', en: 'A swift arrow that pierces the target.' },
        minLevel: 6, manaCost: 15, cooldown: 2,
        kind: 'ranged', power: 38, powerPerLevel: 3.8, radius: 1.5,
      },
      {
        id: 'arrow_rain',
        name: { es: 'Lluvia de Flechas', en: 'Arrow Rain' },
        desc: { es: 'Cae una lluvia de flechas sobre una zona lejana.', en: 'A rain of arrows falls over a distant area.' },
        minLevel: 22, manaCost: 50, cooldown: 5,
        kind: 'ranged', power: 95, powerPerLevel: 4.5, radius: 4.5,
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
        id: 'heal_self',
        name: { es: 'Curación', en: 'Heal' },
        desc: { es: 'Restaura tu propia vida con magia natural.', en: 'Restore your own health with nature magic.' },
        minLevel: 4, manaCost: 25, cooldown: 3,
        kind: 'heal', power: 60, powerPerLevel: 6, radius: 0,
      },
      {
        id: 'mass_heal',
        name: { es: 'Curación en Masa', en: 'Mass Heal' },
        desc: { es: 'Cura a todos los aliados a tu alrededor.', en: 'Heal every ally around you.' },
        minLevel: 24, manaCost: 80, cooldown: 6,
        kind: 'heal', power: 150, powerPerLevel: 8, radius: 6,
      },
      {
        id: 'summon_imp',
        name: { es: 'Invocar Diablillo', en: 'Summon Imp' },
        desc: { es: 'Invoca diablillos que luchan a tu lado.', en: 'Summon imps that fight at your side.' },
        minLevel: 30, manaCost: 110, cooldown: 12,
        kind: 'summon', power: 0, powerPerLevel: 0, radius: 0,
        summonFamily: 'imp', summonCount: 2,
      },
    ],
  },
];

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

// Skills the profession can actually use at the given character level.
export function skillsForLevel(professionId, level) {
  const p = BY_ID.get(professionId);
  if (!p) return [];
  return p.skills.filter((s) => level >= s.minLevel);
}

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

// Effective power (damage or heal) of a skill for a character of `level`.
// Returns the skill's base power plus per-level scaling above its minLevel.
export function skillPower(skill, level) {
  if (!skill) return 0;
  const over = Math.max(0, level - skill.minLevel);
  return Math.round(skill.power + skill.powerPerLevel * over);
}
