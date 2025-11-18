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
        // Cheap single-target starter bolt (small radius = single hit feel).
        id: 'spark_bolt',
        name: { es: 'Chispa', en: 'Spark Bolt' },
        desc: { es: 'Una chispa de energía que golpea a un enemigo.', en: 'A spark of energy that strikes one foe.' },
        minLevel: 1, manaCost: 8, cooldown: 1.5,
        kind: 'area', power: 14, powerPerLevel: 1.8, radius: 1.5,
      },
      {
        id: 'fireball',
        name: { es: 'Bola de Fuego', en: 'Fireball' },
        desc: { es: 'Estalla en una zona quemando a los enemigos cercanos.', en: 'Bursts in an area, burning nearby foes.' },
        minLevel: 8, manaCost: 20, cooldown: 2,
        kind: 'area', power: 45, powerPerLevel: 3.2, radius: 3.5,
      },
      {
        // Focused energy lance (single-target, harder than fireball).
        id: 'energy_beam',
        name: { es: 'Rayo de Energía', en: 'Energy Beam' },
        desc: { es: 'Un haz de energía que perfora a un solo enemigo.', en: 'An energy beam that pierces a single foe.' },
        minLevel: 14, manaCost: 38, cooldown: 2.5,
        kind: 'area', power: 90, powerPerLevel: 4.5, radius: 1.8,
      },
      {
        id: 'ice_nova',
        name: { es: 'Nova de Hielo', en: 'Ice Nova' },
        desc: { es: 'Onda gélida que daña todo a tu alrededor.', en: 'A freezing wave that damages everything around you.' },
        minLevel: 20, manaCost: 55, cooldown: 4,
        kind: 'area', power: 120, powerPerLevel: 5.5, radius: 5,
      },
      {
        id: 'chain_lightning',
        name: { es: 'Cadena de Rayos', en: 'Chain Lightning' },
        desc: { es: 'Un relámpago salta entre los enemigos cercanos.', en: 'A bolt leaps between nearby foes.' },
        minLevel: 34, manaCost: 90, cooldown: 6,
        kind: 'area', power: 210, powerPerLevel: 7, radius: 5.5,
      },
      {
        id: 'meteor',
        name: { es: 'Meteoro', en: 'Meteor' },
        desc: { es: 'Llama una lluvia de meteoros en una gran zona.', en: 'Calls a meteor shower over a large area.' },
        minLevel: 50, manaCost: 140, cooldown: 8,
        kind: 'area', power: 360, powerPerLevel: 9, radius: 7,
      },
      {
        // Ultimate: catastrophic elemental storm.
        id: 'rage_of_storms',
        name: { es: 'Furia de Tormentas', en: 'Rage of Storms' },
        desc: { es: 'Desata una tormenta devastadora sobre un área enorme.', en: 'Unleashes a devastating storm over a huge area.' },
        minLevel: 85, manaCost: 220, cooldown: 18,
        kind: 'area', power: 700, powerPerLevel: 13, radius: 9,
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
        // Cheap opening strike against one foe.
        id: 'slash',
        name: { es: 'Tajo', en: 'Slash' },
        desc: { es: 'Un tajo rápido contra un enemigo.', en: 'A quick slash against one foe.' },
        minLevel: 1, manaCost: 8, cooldown: 1.5,
        kind: 'melee', power: 18, powerPerLevel: 2.2, radius: 2.2,
      },
      {
        id: 'power_strike',
        name: { es: 'Golpe Poderoso', en: 'Power Strike' },
        desc: { es: 'Un mandoble brutal contra un solo enemigo.', en: 'A brutal blow against a single foe.' },
        minLevel: 5, manaCost: 12, cooldown: 2.5,
        kind: 'melee', power: 40, powerPerLevel: 4.5, radius: 2.4,
      },
      {
        // Heavy bleeding blow, single target.
        id: 'rend',
        name: { es: 'Desgarro', en: 'Rend' },
        desc: { es: 'Un golpe pesado que hace sangrar al enemigo.', en: 'A heavy blow that makes the foe bleed.' },
        minLevel: 12, manaCost: 22, cooldown: 4,
        kind: 'melee', power: 85, powerPerLevel: 5, radius: 2.4,
      },
      {
        id: 'whirlwind',
        name: { es: 'Torbellino', en: 'Whirlwind' },
        desc: { es: 'Giras tu arma golpeando a todos los enemigos cercanos.', en: 'Spin your weapon, hitting every nearby foe.' },
        minLevel: 18, manaCost: 35, cooldown: 5,
        kind: 'area', power: 70, powerPerLevel: 4, radius: 3.5,
      },
      {
        // Minor self-heal: a second wind to keep tanking.
        id: 'war_cry',
        name: { es: 'Grito de Guerra', en: 'War Cry' },
        desc: { es: 'Recuperas el aliento y restauras algo de vida.', en: 'Catch your breath and recover some health.' },
        minLevel: 28, manaCost: 40, cooldown: 12,
        kind: 'heal', power: 80, powerPerLevel: 5, radius: 0,
      },
      {
        // Ground-shaking stomp, close AoE.
        id: 'earth_stomp',
        name: { es: 'Pisotón Sísmico', en: 'Earth Stomp' },
        desc: { es: 'Golpeas el suelo dañando a todo a tu alrededor.', en: 'Slam the ground, damaging everything around you.' },
        minLevel: 45, manaCost: 75, cooldown: 7,
        kind: 'area', power: 200, powerPerLevel: 6.5, radius: 4.5,
      },
      {
        // Ultimate finisher, single devastating blow.
        id: 'executioner',
        name: { es: 'Verdugo', en: 'Executioner' },
        desc: { es: 'Descargas un golpe demoledor sobre un enemigo.', en: 'Deliver a devastating finishing blow to one foe.' },
        minLevel: 90, manaCost: 130, cooldown: 14,
        kind: 'melee', power: 650, powerPerLevel: 12, radius: 2.6,
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
        // Cheap starter shot, single target.
        id: 'quick_shot',
        name: { es: 'Disparo Rápido', en: 'Quick Shot' },
        desc: { es: 'Una flecha veloz a un solo objetivo.', en: 'A swift arrow at a single target.' },
        minLevel: 1, manaCost: 8, cooldown: 1.5,
        kind: 'ranged', power: 14, powerPerLevel: 1.8, radius: 1.2,
      },
      {
        id: 'piercing_shot',
        name: { es: 'Disparo Perforante', en: 'Piercing Shot' },
        desc: { es: 'Una flecha veloz que atraviesa al objetivo.', en: 'A swift arrow that pierces the target.' },
        minLevel: 6, manaCost: 15, cooldown: 2,
        kind: 'ranged', power: 38, powerPerLevel: 3.8, radius: 1.5,
      },
      {
        // Explosive arrow: small blast on impact.
        id: 'explosive_arrow',
        name: { es: 'Flecha Explosiva', en: 'Explosive Arrow' },
        desc: { es: 'Una flecha que estalla al impactar.', en: 'An arrow that bursts on impact.' },
        minLevel: 14, manaCost: 30, cooldown: 3,
        kind: 'ranged', power: 80, powerPerLevel: 4.2, radius: 2.5,
      },
      {
        // Volley of arrows across a tight spread.
        id: 'multi_shot',
        name: { es: 'Disparo Múltiple', en: 'Multi Shot' },
        desc: { es: 'Lanzas varias flechas en abanico.', en: 'Loose several arrows in a fan.' },
        minLevel: 18, manaCost: 42, cooldown: 4,
        kind: 'ranged', power: 110, powerPerLevel: 4.5, radius: 3.5,
      },
      {
        id: 'arrow_rain',
        name: { es: 'Lluvia de Flechas', en: 'Arrow Rain' },
        desc: { es: 'Cae una lluvia de flechas sobre una zona lejana.', en: 'A rain of arrows falls over a distant area.' },
        minLevel: 22, manaCost: 55, cooldown: 5,
        kind: 'ranged', power: 140, powerPerLevel: 5, radius: 4.5,
      },
      {
        // Long-range single hit for huge damage.
        id: 'snipe',
        name: { es: 'Disparo Certero', en: 'Snipe' },
        desc: { es: 'Un disparo preciso de largo alcance a un objetivo.', en: 'A precise long-range shot at one target.' },
        minLevel: 40, manaCost: 70, cooldown: 6,
        kind: 'ranged', power: 230, powerPerLevel: 7, radius: 1.5,
      },
      {
        // Ultimate volley over a vast area.
        id: 'sky_volley',
        name: { es: 'Andanada Celeste', en: 'Sky Volley' },
        desc: { es: 'Una andanada masiva cae sobre una zona enorme.', en: 'A massive volley rains over a huge area.' },
        minLevel: 90, manaCost: 200, cooldown: 16,
        kind: 'ranged', power: 620, powerPerLevel: 12, radius: 8,
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
        // Cheap nature attack, single-target feel.
        id: 'nature_bolt',
        name: { es: 'Dardo Natural', en: 'Nature Bolt' },
        desc: { es: 'Lanzas un dardo de energía natural a un enemigo.', en: 'Hurl a bolt of nature energy at one foe.' },
        minLevel: 8, manaCost: 14, cooldown: 1.8,
        kind: 'area', power: 32, powerPerLevel: 3, radius: 1.6,
      },
      {
        // Thorns AoE that ensnares nearby foes.
        id: 'entangle',
        name: { es: 'Enredadera', en: 'Entangle' },
        desc: { es: 'Espinas brotan dañando a los enemigos cercanos.', en: 'Thorns erupt, damaging nearby foes.' },
        minLevel: 16, manaCost: 45, cooldown: 4,
        kind: 'area', power: 95, powerPerLevel: 4, radius: 4,
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
      {
        // Beefier pet at high level.
        id: 'summon_bear',
        name: { es: 'Invocar Oso', en: 'Summon Bear' },
        desc: { es: 'Invoca un oso feroz que combate por ti.', en: 'Summon a fierce bear to fight for you.' },
        minLevel: 55, manaCost: 160, cooldown: 16,
        kind: 'summon', power: 0, powerPerLevel: 0, radius: 0,
        summonFamily: 'bear', summonCount: 1,
      },
      {
        // Ultimate group heal over a wide area.
        id: 'sanctuary',
        name: { es: 'Santuario', en: 'Sanctuary' },
        desc: { es: 'Una ola de vida restaura a todos los aliados cercanos.', en: 'A wave of life restores all nearby allies.' },
        minLevel: 80, manaCost: 200, cooldown: 18,
        kind: 'heal', power: 520, powerPerLevel: 11, radius: 9,
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
