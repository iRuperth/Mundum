// Mundum profession (vocation) database — PURE DATA. No Three.js, no DOM.
// Four vocations, each with a MapleStory-style JOB ADVANCEMENT chain at levels
// 1 / 30 / 70 / 120. Advancing renames the job and unlocks a fresh batch of
// skills; skill points earned at a given tier can ONLY be spent on skills of
// that tier (you cannot hoard early points for a later tier, and vice versa).
//
// Skill tree model: every skill has its own level (1..maxLevel). Its strength
// (power) and mana cost scale by the SKILL LEVEL, not the character level. The
// character level GATES unlocking via reqLevel; the job TIER gates which skill-
// point pool pays for it.
//
// Weapon types match src/data/items.js: 'sword' | 'axe' | 'bow' | 'wand' | 'shield'.
// Summon families match keys in src/data/creatures.js (imp, bat, wolf, ...).
//
// Skill `kind` (gameplay role): 'area' | 'melee' | 'ranged' | 'heal' | 'summon'
//   | 'buff' | 'passive'. The `fx` field names the VISUAL animation the skill
// system plays (see src/skills.js FX_REGISTRY) — every active skill has one so
// each looks different, not one shared ball.
//
// Skill schema:
// { id, name:{es,en}, desc:{es,en}, reqLevel, tier, maxLevel, kind, fx, fxColor,
//   manaBase, manaPerLevel, cooldown, powerBase, powerPerLevel, radius,
//   summonFamily, summonCount, buff }
// Legacy aliases (minLevel, manaCost, power) are mirrored at the bottom.

// Job-advancement levels. Tier 1 from level 1, tier 2 at 30, tier 3 at 70,
// tier 4 at 120 — the chain the user asked for.
export const JOB_TIER_LEVELS = [1, 30, 70, 120];

// Which job tier a character level belongs to (1..4).
export function tierForLevel(level) {
  let tier = 1;
  for (let i = 0; i < JOB_TIER_LEVELS.length; i++) {
    if (level >= JOB_TIER_LEVELS[i]) tier = i + 1;
  }
  return tier;
}

export const PROFESSIONS = [
  // ===================================================================== ARCHER
  {
    id: 'paladin', // kept id 'paladin' for save compatibility; it is the Archer line
    name: { es: 'Arquero', en: 'Archer' },
    desc: {
      es: 'Tirador de precisión. Único que usa arcos. Se especializa en golpes críticos y andanadas de muchas flechas.',
      en: 'Precision marksman. The only one who wields bows. Specializes in critical hits and multi-arrow volleys.',
    },
    color: 0x2f8fb0,
    allowedWeapons: ['bow'],
    // The archer is the LONG-RANGE specialist: the widest reach of any class.
    baseHp: 100, baseMana: 20, hpPerLevel: 15, manaPerLevel: 15, attackRange: 26,
    regen: { hp: { amount: 2, every: 4 }, mana: { amount: 2, every: 4 } },
    // Named advancements. The first is the base job; the rest unlock at reqLevel.
    jobChain: [
      { tier: 1, reqLevel: 1, name: { es: 'Arquero', en: 'Archer' } },
      { tier: 2, reqLevel: 30, name: { es: 'Arquero Dorado', en: 'Golden Archer' } },
      { tier: 3, reqLevel: 70, name: { es: 'Arquero Maestro', en: 'Master Archer' } },
      { tier: 4, reqLevel: 120, name: { es: 'Arquero Real', en: 'Royal Archer' } },
    ],
    skills: [
      // ---- Tier 1 (lv 1-29): the fundamentals ----
      { id: 'arrow_blow', tier: 1, reqLevel: 1, maxLevel: 20, kind: 'ranged', fx: 'single_arrow', fxColor: 0xbfe9ff,
        name: { es: 'Flechazo', en: 'Arrow Blow' }, desc: { es: 'Una flecha veloz y certera a un solo objetivo, desde muy lejos.', en: 'A swift, true arrow at a single target, from far away.' },
        manaBase: 6, manaPerLevel: 0.8, cooldown: 1, powerBase: 16, powerPerLevel: 11, radius: 1.0, range: 26 },
      { id: 'bow_mastery', tier: 1, reqLevel: 3, maxLevel: 20, kind: 'passive',
        name: { es: 'Maestría de Arco', en: 'Bow Mastery' }, desc: { es: 'Pasiva. Cada nivel dispara 5% más rápido y +1% de alcance.', en: 'Passive. Each level fires 5% faster and +1% range.' },
        passive: { attackSpeedPerLevel: 0.05, rangePerLevel: 0.01 } },
      { id: 'double_shot', tier: 1, reqLevel: 5, maxLevel: 20, kind: 'ranged', fx: 'arrow_fan', fxColor: 0x9fe0ff,
        name: { es: 'Disparo Doble', en: 'Double Shot' }, desc: { es: 'Dos flechas seguidas contra un objetivo.', en: 'Two arrows in quick succession.' },
        manaBase: 10, manaPerLevel: 1, cooldown: 1.4, powerBase: 26, powerPerLevel: 12, radius: 1.4, projectiles: 2 },
      { id: 'eagle_eye', tier: 1, reqLevel: 8, maxLevel: 20, kind: 'passive',
        name: { es: 'Ojo de Águila', en: 'Eagle Eye' }, desc: { es: 'Pasiva. Cada nivel +2% de probabilidad de crítico.', en: 'Passive. Each level adds 2% critical chance.' },
        passive: { critPerLevel: 0.02 } },
      { id: 'power_knockback', tier: 1, reqLevel: 12, maxLevel: 20, kind: 'ranged', fx: 'heavy_arrow', fxColor: 0x8fd0ff,
        name: { es: 'Disparo de Empuje', en: 'Power Knock-back' }, desc: { es: 'Una flecha potente que castiga a un objetivo desde lejos.', en: 'A forceful arrow that punishes a single far target.' },
        manaBase: 18, manaPerLevel: 1.4, cooldown: 2.2, powerBase: 68, powerPerLevel: 16, radius: 1.3, range: 26, knockback: 4 },
      { id: 'arrow_bomb', tier: 1, reqLevel: 16, maxLevel: 20, kind: 'ranged', fx: 'explosive_arrow', fxColor: 0xff9a3a,
        name: { es: 'Flecha Bomba', en: 'Arrow Bomb' }, desc: { es: 'Una flecha que estalla al impactar.', en: 'An arrow that bursts on impact.' },
        manaBase: 30, manaPerLevel: 2.2, cooldown: 3.2, powerBase: 90, powerPerLevel: 15, radius: 3 },
      { id: 'triple_shot', tier: 1, reqLevel: 22, maxLevel: 20, kind: 'ranged', fx: 'arrow_fan', fxColor: 0xbfe9ff,
        name: { es: 'Disparo Triple', en: 'Triple Shot' }, desc: { es: 'Un abanico de tres flechas hacia el frente.', en: 'A fan of three arrows ahead.' },
        manaBase: 36, manaPerLevel: 2.4, cooldown: 2.6, powerBase: 110, powerPerLevel: 16, radius: 1.6, projectiles: 3, spread: 0.32 },

      // ---- Tier 2 — Golden Archer (lv 30+): bigger volleys ----
      { id: 'strafe', tier: 2, reqLevel: 30, maxLevel: 20, kind: 'ranged', fx: 'arrow_fan', fxColor: 0xffe08a,
        name: { es: 'Ráfaga', en: 'Strafe' }, desc: { es: 'Cuatro flechas certeras sobre un objetivo.', en: 'Four precise arrows at a target.' },
        manaBase: 42, manaPerLevel: 2.8, cooldown: 2.4, powerBase: 140, powerPerLevel: 18, radius: 1.6, projectiles: 4, spread: 0.18 },
      { id: 'golden_eye', tier: 2, reqLevel: 30, maxLevel: 20, kind: 'passive',
        name: { es: 'Ojo Dorado', en: 'Golden Eye' }, desc: { es: 'Pasiva. Cada nivel +3% de daño crítico.', en: 'Passive. Each level adds 3% critical damage.' },
        passive: { critDamagePerLevel: 0.03 } },
      { id: 'arrow_rain', tier: 2, reqLevel: 36, maxLevel: 20, kind: 'ranged', fx: 'arrow_rain', fxColor: 0xffd24d,
        name: { es: 'Lluvia de Flechas', en: 'Arrow Rain' }, desc: { es: 'Una andanada cae del cielo sobre una zona.', en: 'A volley rains from the sky over an area.' },
        manaBase: 60, manaPerLevel: 3.2, cooldown: 5, powerBase: 180, powerPerLevel: 18, radius: 4.5 },
      { id: 'inferno_arrow', tier: 2, reqLevel: 45, maxLevel: 20, kind: 'area', fx: 'fire_arrow', fxColor: 0xff5a22,
        name: { es: 'Flecha Infernal', en: 'Inferno Arrow' }, desc: { es: 'Una flecha ardiente que incendia una zona.', en: 'A blazing arrow that sets an area on fire.' },
        manaBase: 75, manaPerLevel: 3.8, cooldown: 6, powerBase: 230, powerPerLevel: 20, radius: 4.5 },
      { id: 'piercing_shot', tier: 2, reqLevel: 55, maxLevel: 20, kind: 'ranged', fx: 'pierce_beam', fxColor: 0xffe08a,
        name: { es: 'Disparo Perforante', en: 'Piercing Shot' }, desc: { es: 'Una flecha que atraviesa a todos en línea.', en: 'An arrow that pierces every foe in a line.' },
        manaBase: 90, manaPerLevel: 4, cooldown: 5, powerBase: 300, powerPerLevel: 22, radius: 1.6, pierce: true, range: 16 },

      // ---- Tier 3 — Master Archer (lv 70+): the hurricane era ----
      { id: 'hurricane', tier: 3, reqLevel: 70, maxLevel: 30, kind: 'ranged', fx: 'hurricane', fxColor: 0xbfe9ff,
        name: { es: 'Huracán', en: 'Hurricane' }, desc: { es: 'Una andanada continua de flechas veloces.', en: 'A continuous barrage of rapid arrows.' },
        manaBase: 120, manaPerLevel: 5, cooldown: 6, powerBase: 360, powerPerLevel: 22, radius: 1.8, projectiles: 8, spread: 0.12 },
      { id: 'sharp_eyes', tier: 3, reqLevel: 70, maxLevel: 20, kind: 'buff', fx: 'self_buff', fxColor: 0xfff0a0,
        name: { es: 'Vista Aguda', en: 'Sharp Eyes' }, desc: { es: 'Te concentras: más crítico y daño por un tiempo.', en: 'Focus: more crit and damage for a while.' },
        manaBase: 90, manaPerLevel: 3, cooldown: 30, buff: { critAdd: 0.2, damageMul: 1.15, duration: 30 } },
      { id: 'dragon_pulse', tier: 3, reqLevel: 80, maxLevel: 25, kind: 'ranged', fx: 'pierce_beam', fxColor: 0xff7a3a,
        name: { es: 'Pulso de Dragón', en: 'Dragon Pulse' }, desc: { es: 'Un rayo de flechas que perfora en línea recta.', en: 'A beam of arrows that pierces in a straight line.' },
        manaBase: 140, manaPerLevel: 5.5, cooldown: 6, powerBase: 460, powerPerLevel: 26, radius: 2, pierce: true, range: 20 },
      { id: 'phoenix_volley', tier: 3, reqLevel: 95, maxLevel: 25, kind: 'ranged', fx: 'arrow_rain', fxColor: 0xff9933,
        name: { es: 'Andanada Fénix', en: 'Phoenix Volley' }, desc: { es: 'Flechas de fuego llueven sobre una gran zona.', en: 'Fire arrows rain over a large area.' },
        manaBase: 180, manaPerLevel: 6.5, cooldown: 9, powerBase: 560, powerPerLevel: 28, radius: 6 },

      // ---- Tier 4 — Royal Archer (lv 120+): the finishers ----
      { id: 'sky_volley', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'ranged', fx: 'arrow_rain', fxColor: 0xfff0a0,
        name: { es: 'Andanada Celeste', en: 'Sky Volley' }, desc: { es: 'Una andanada masiva cae sobre una zona enorme.', en: 'A massive volley rains over a huge area.' },
        manaBase: 240, manaPerLevel: 7, cooldown: 14, powerBase: 720, powerPerLevel: 32, radius: 9 },
      { id: 'royal_barrage', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'ranged', fx: 'hurricane', fxColor: 0xffe066,
        name: { es: 'Descarga Real', en: 'Royal Barrage' }, desc: { es: 'Una tormenta dorada de innumerables flechas.', en: 'A golden storm of countless arrows.' },
        manaBase: 220, manaPerLevel: 7, cooldown: 8, powerBase: 640, powerPerLevel: 30, radius: 2, projectiles: 12, spread: 0.1 },
      { id: 'meteor_arrow', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'area', fx: 'meteor', fxColor: 0xff8a3a,
        name: { es: 'Flecha Meteoro', en: 'Meteor Arrow' }, desc: { es: 'Una flecha en llamas estalla como un meteoro.', en: 'A blazing arrow bursts like a meteor.' },
        manaBase: 240, manaPerLevel: 8, cooldown: 12, powerBase: 820, powerPerLevel: 34, radius: 8 },
      { id: 'piercing_gale', tier: 4, reqLevel: 124, maxLevel: 30, kind: 'ranged', fx: 'pierce_beam', fxColor: 0x9be8ff,
        name: { es: 'Vendaval Perforante', en: 'Piercing Gale' }, desc: { es: 'Un disparo que atraviesa a todos en línea.', en: 'A shot that pierces everyone in a line.' },
        manaBase: 220, manaPerLevel: 7, cooldown: 9, powerBase: 780, powerPerLevel: 32, radius: 2 },
      { id: 'crippling_rain', tier: 4, reqLevel: 128, maxLevel: 25, kind: 'ranged', fx: 'arrow_rain', fxColor: 0xc7f0a0,
        name: { es: 'Lluvia Lisiante', en: 'Crippling Rain' }, desc: { es: 'Flechas que frenan y castigan una zona.', en: 'Arrows that slow and punish an area.' },
        manaBase: 230, manaPerLevel: 7, cooldown: 11, powerBase: 760, powerPerLevel: 30, radius: 9 },
      { id: 'falcons_wrath', tier: 4, reqLevel: 132, maxLevel: 20, kind: 'buff', fx: 'self_buff', fxColor: 0xffd34d,
        name: { es: 'Ira del Halcón', en: "Falcon's Wrath" }, desc: { es: 'Furia: más crítico y daño por un tiempo.', en: 'Fury: more crit and damage for a time.' },
        manaBase: 200, manaPerLevel: 6, cooldown: 40, powerBase: 0, powerPerLevel: 0, buff: { damageMul: 1.35, critAdd: 0.35, duration: 30 } },
      { id: 'dragonfire_arrow', tier: 4, reqLevel: 140, maxLevel: 30, kind: 'area', fx: 'explosive_arrow', fxColor: 0xff5522,
        name: { es: 'Flecha de Dragón', en: 'Dragonfire Arrow' }, desc: { es: 'Una flecha de fuego dracónico que estalla.', en: 'A draconic fire arrow that detonates.' },
        manaBase: 250, manaPerLevel: 8, cooldown: 12, powerBase: 860, powerPerLevel: 34, radius: 6 },
      { id: 'storm_of_arrows', tier: 4, reqLevel: 150, maxLevel: 30, kind: 'ranged', fx: 'arrow_rain', fxColor: 0xfff0a0,
        name: { es: 'Tormenta de Saetas', en: 'Storm of Arrows' }, desc: { es: 'El cielo entero se llena de flechas.', en: 'The whole sky fills with arrows.' },
        manaBase: 260, manaPerLevel: 8, cooldown: 14, powerBase: 880, powerPerLevel: 36, radius: 10 },
      { id: 'phoenix_volley', tier: 4, reqLevel: 160, maxLevel: 30, kind: 'ranged', fx: 'hurricane', fxColor: 0xff8a3a,
        name: { es: 'Andanada Fénix', en: 'Phoenix Volley' }, desc: { es: 'Una marea ardiente de flechas sin fin.', en: 'An endless burning tide of arrows.' },
        manaBase: 240, manaPerLevel: 7, cooldown: 10, powerBase: 800, powerPerLevel: 32, radius: 2, projectiles: 16, spread: 0.12 },
    ],
  },

  // ===================================================================== KNIGHT
  {
    id: 'knight',
    name: { es: 'Caballero', en: 'Knight' },
    desc: {
      es: 'Tanque cuerpo a cuerpo. Usa espadas, hachas y escudos. Mucha vida y daño en área a su alrededor.',
      en: 'Melee tank. Wields swords, axes and shields. High hp and area damage all around.',
    },
    color: 0xb04a2f,
    allowedWeapons: ['sword', 'axe', 'mace', 'lance', 'shield'],
    baseHp: 100, baseMana: 20, hpPerLevel: 25, manaPerLevel: 5, attackRange: 3,
    regen: { hp: { amount: 3, every: 2 }, mana: { amount: 1, every: 5 } },
    jobChain: [
      { tier: 1, reqLevel: 1, name: { es: 'Caballero', en: 'Knight' } },
      { tier: 2, reqLevel: 30, name: { es: 'Cruzado', en: 'Crusader' } },
      { tier: 3, reqLevel: 70, name: { es: 'Caballero Negro', en: 'Dark Knight' } },
      { tier: 4, reqLevel: 120, name: { es: 'Caballero Real', en: 'Royal Knight' } },
    ],
    skills: [
      // Tier 1
      { id: 'slash_blast', tier: 1, reqLevel: 1, maxLevel: 20, kind: 'area', fx: 'slash_arc', fxColor: 0xffd27a,
        name: { es: 'Tajo Expansivo', en: 'Slash Blast' }, desc: { es: 'Un tajo que golpea a los enemigos cercanos.', en: 'A sweeping slash hitting nearby foes.' },
        manaBase: 6, manaPerLevel: 0.8, cooldown: 1.2, powerBase: 16, powerPerLevel: 9, radius: 3 },
      { id: 'weapon_mastery', tier: 1, reqLevel: 3, maxLevel: 20, kind: 'passive',
        name: { es: 'Maestría de Armas', en: 'Weapon Mastery' }, desc: { es: 'Pasiva. Cada nivel acelera tus ataques 5%.', en: 'Passive. Each level swings 5% faster.' },
        passive: { attackSpeedPerLevel: 0.05 } },
      { id: 'power_strike', tier: 1, reqLevel: 5, maxLevel: 20, kind: 'melee', fx: 'heavy_smash', fxColor: 0xffe0a0,
        name: { es: 'Golpe Poderoso', en: 'Power Strike' }, desc: { es: 'Un mandoble brutal contra un solo enemigo.', en: 'A brutal blow against one foe.' },
        manaBase: 10, manaPerLevel: 1, cooldown: 1.8, powerBase: 34, powerPerLevel: 13, radius: 2.4 },
      { id: 'iron_body', tier: 1, reqLevel: 8, maxLevel: 20, kind: 'passive',
        name: { es: 'Cuerpo de Hierro', en: 'Iron Body' }, desc: { es: 'Pasiva. Cada nivel +3% de vida máxima.', en: 'Passive. Each level +3% max HP.' },
        passive: { maxHpPerLevel: 0.03 } },
      // Early knight STANCES — the user wants the knight to raise its own DEFENCE
      // and PHYSICAL ATTACK from the start. defenseMul<1 = tougher; damageMul>1 =
      // harder hits (the knight's hits are physical, so this is its attack buff).
      { id: 'guard_stance', tier: 1, reqLevel: 9, maxLevel: 15, kind: 'buff', fx: 'self_buff', fxColor: 0x9fd0ff,
        name: { es: 'Postura de Guardia', en: 'Guard Stance' }, desc: { es: 'Alzas el escudo: recibes mucho menos daño un rato.', en: 'Raise your guard: take much less damage for a while.' },
        manaBase: 14, manaPerLevel: 1, cooldown: 18, powerBase: 0, powerPerLevel: 0, buff: { defenseMul: 0.7, duration: 14 } },
      { id: 'battle_focus', tier: 1, reqLevel: 14, maxLevel: 15, kind: 'buff', fx: 'self_buff', fxColor: 0xff8844,
        name: { es: 'Concentración de Batalla', en: 'Battle Focus' }, desc: { es: 'Aprietas el arma: tu ataque físico sube un rato.', en: 'Grip your weapon: your physical attack rises for a while.' },
        manaBase: 16, manaPerLevel: 1, cooldown: 20, powerBase: 0, powerPerLevel: 0, buff: { damageMul: 1.18, duration: 16 } },
      { id: 'rage_bleed', tier: 1, reqLevel: 12, maxLevel: 20, kind: 'melee', fx: 'double_slash', fxColor: 0xff6a4a,
        name: { es: 'Furia Sangrante', en: 'Rage' }, desc: { es: 'Un golpe furioso que hace sangrar al enemigo.', en: 'A raging blow that makes the foe bleed.' },
        manaBase: 18, manaPerLevel: 1.4, cooldown: 3, powerBase: 60, powerPerLevel: 15, radius: 2.4 },
      { id: 'ground_smash', tier: 1, reqLevel: 16, maxLevel: 20, kind: 'area', fx: 'shockwave', fxColor: 0xd8a060,
        name: { es: 'Golpe Sísmico', en: 'Ground Smash' }, desc: { es: 'Golpeas el suelo dañando todo a tu alrededor.', en: 'Slam the ground, hitting everything around you.' },
        manaBase: 40, manaPerLevel: 2.6, cooldown: 4, powerBase: 110, powerPerLevel: 15, radius: 4 },
      { id: 'brandish', tier: 1, reqLevel: 22, maxLevel: 20, kind: 'melee', fx: 'double_slash', fxColor: 0xffe0a0,
        name: { es: 'Doble Tajo', en: 'Brandish' }, desc: { es: 'Dos cortes veloces contra un enemigo.', en: 'Two swift cuts against one foe.' },
        manaBase: 28, manaPerLevel: 2, cooldown: 2.8, powerBase: 100, powerPerLevel: 18, radius: 2.6 },

      // Tier 2 — Crusader
      { id: 'second_wind', tier: 2, reqLevel: 30, maxLevel: 15, kind: 'heal', fx: 'self_heal', fxColor: 0x7bed6f,
        name: { es: 'Segundo Aliento', en: 'Second Wind' }, desc: { es: 'Recuperas el aliento y restauras vida.', en: 'Catch your breath and recover HP.' },
        manaBase: 30, manaPerLevel: 2, cooldown: 12, powerBase: 120, powerPerLevel: 16, radius: 0 },
      { id: 'shield_wall', tier: 2, reqLevel: 30, maxLevel: 20, kind: 'buff', fx: 'self_buff', fxColor: 0x9fd0ff,
        name: { es: 'Muro de Escudo', en: 'Shield Wall' }, desc: { es: 'Reduces el daño recibido un tiempo.', en: 'Reduce incoming damage for a while.' },
        manaBase: 40, manaPerLevel: 2, cooldown: 25, buff: { defenseMul: 0.6, duration: 15 } },
      { id: 'whirlwind', tier: 2, reqLevel: 36, maxLevel: 20, kind: 'area', fx: 'whirlwind', fxColor: 0xffd27a,
        name: { es: 'Torbellino', en: 'Whirlwind' }, desc: { es: 'Giras con el arma golpeando todo alrededor.', en: 'Spin with your weapon, hitting all around.' },
        manaBase: 55, manaPerLevel: 3, cooldown: 5, powerBase: 170, powerPerLevel: 18, radius: 4.2 },
      { id: 'coma', tier: 2, reqLevel: 45, maxLevel: 20, kind: 'melee', fx: 'heavy_smash', fxColor: 0xff5544,
        name: { es: 'Conmoción', en: 'Coma' }, desc: { es: 'Un golpe demoledor que aturde a un enemigo.', en: 'A crushing strike that stuns one foe.' },
        manaBase: 55, manaPerLevel: 3, cooldown: 5, powerBase: 230, powerPerLevel: 20, radius: 2.6, stun: 1.5 },
      { id: 'heavy_cleave', tier: 2, reqLevel: 55, maxLevel: 20, kind: 'area', fx: 'slash_arc', fxColor: 0xffaa66,
        name: { es: 'Tajo Reforzado', en: 'Heavy Cleave' }, desc: { es: 'Un corte amplio de gran potencia.', en: 'A wide cleave of great force.' },
        manaBase: 80, manaPerLevel: 3.5, cooldown: 6, powerBase: 320, powerPerLevel: 22, radius: 3.6 },

      // Tier 3 — Dark Knight
      { id: 'crusher', tier: 3, reqLevel: 70, maxLevel: 30, kind: 'melee', fx: 'heavy_smash', fxColor: 0xcc3322,
        name: { es: 'Triturador', en: 'Crusher' }, desc: { es: 'Un golpe demoledor sobre un enemigo.', en: 'A devastating blow to one foe.' },
        manaBase: 110, manaPerLevel: 5, cooldown: 5, powerBase: 460, powerPerLevel: 28, radius: 2.8 },
      { id: 'battle_roar', tier: 3, reqLevel: 70, maxLevel: 20, kind: 'buff', fx: 'roar', fxColor: 0xff8844,
        name: { es: 'Rugido de Batalla', en: 'Battle Roar' }, desc: { es: 'Un grito que aumenta tu daño un tiempo.', en: 'A roar that boosts your damage for a while.' },
        manaBase: 90, manaPerLevel: 3, cooldown: 30, buff: { damageMul: 1.25, duration: 25 } },
      { id: 'earthquake', tier: 3, reqLevel: 80, maxLevel: 25, kind: 'area', fx: 'shockwave', fxColor: 0xbb5533,
        name: { es: 'Terremoto', en: 'Earthquake' }, desc: { es: 'Sacudes la tierra dañando una gran zona.', en: 'Shake the earth, damaging a large area.' },
        manaBase: 140, manaPerLevel: 5.5, cooldown: 7, powerBase: 520, powerPerLevel: 28, radius: 6 },
      { id: 'dragon_slash', tier: 3, reqLevel: 95, maxLevel: 25, kind: 'area', fx: 'whirlwind', fxColor: 0x9b59ff,
        name: { es: 'Tajo del Dragón', en: 'Dragon Slash' }, desc: { es: 'Un torbellino devastador de tajos.', en: 'A devastating whirlwind of slashes.' },
        manaBase: 170, manaPerLevel: 6.5, cooldown: 8, powerBase: 600, powerPerLevel: 30, radius: 4.8 },

      // Tier 4 — Royal Knight
      { id: 'sanctuary_blade', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'area', fx: 'holy_nova', fxColor: 0xfff0a0,
        name: { es: 'Hoja del Santuario', en: 'Sanctuary Blade' }, desc: { es: 'Una explosión sagrada barre a tus enemigos.', en: 'A holy burst sweeps your foes away.' },
        manaBase: 240, manaPerLevel: 7, cooldown: 12, powerBase: 760, powerPerLevel: 34, radius: 7 },
      { id: 'ragnarok', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'melee', fx: 'heavy_smash', fxColor: 0xff3a1a,
        name: { es: 'Ragnarok', en: 'Ragnarok' }, desc: { es: 'El golpe final: un cataclismo sobre un enemigo.', en: 'The final blow: a cataclysm upon one foe.' },
        manaBase: 220, manaPerLevel: 7, cooldown: 9, powerBase: 820, powerPerLevel: 34, radius: 3 },
      { id: 'colossus_smash', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'melee', fx: 'heavy_smash', fxColor: 0xffcc66,
        name: { es: 'Embate Colosal', en: 'Colossus Smash' }, desc: { es: 'El golpe individual más brutal del juego.', en: 'The most brutal single hit in the game.' },
        manaBase: 230, manaPerLevel: 7, cooldown: 9, powerBase: 880, powerPerLevel: 36, radius: 3 },
      { id: 'earthshatter', tier: 4, reqLevel: 124, maxLevel: 30, kind: 'area', fx: 'shockwave', fxColor: 0xc9a06a,
        name: { es: 'Hendidura Sísmica', en: 'Earthshatter' }, desc: { es: 'Parte el suelo en un anillo devastador.', en: 'Splits the ground in a devastating ring.' },
        manaBase: 240, manaPerLevel: 8, cooldown: 11, powerBase: 800, powerPerLevel: 34, radius: 7 },
      { id: 'blade_cyclone', tier: 4, reqLevel: 128, maxLevel: 25, kind: 'area', fx: 'whirlwind', fxColor: 0xdfe6ee,
        name: { es: 'Ciclón de Acero', en: 'Blade Cyclone' }, desc: { es: 'Un torbellino de acero a tu alrededor.', en: 'A whirling storm of steel around you.' },
        manaBase: 220, manaPerLevel: 7, cooldown: 8, powerBase: 760, powerPerLevel: 30, radius: 5 },
      { id: 'iron_avatar', tier: 4, reqLevel: 132, maxLevel: 20, kind: 'buff', fx: 'self_buff', fxColor: 0x9fb6cc,
        name: { es: 'Avatar de Hierro', en: 'Iron Avatar' }, desc: { es: 'Te endureces: menos daño, más fuerza.', en: 'You harden: less damage taken, more power.' },
        manaBase: 200, manaPerLevel: 6, cooldown: 45, powerBase: 0, powerPerLevel: 0, buff: { defenseMul: 0.45, damageMul: 1.2, duration: 25 } },
      { id: 'decapitate', tier: 4, reqLevel: 136, maxLevel: 30, kind: 'melee', fx: 'double_slash', fxColor: 0xff5555,
        name: { es: 'Decapitar', en: 'Decapitate' }, desc: { es: 'Dos tajos brutales a un solo enemigo.', en: 'Two brutal cleaves on a single foe.' },
        manaBase: 220, manaPerLevel: 7, cooldown: 9, powerBase: 840, powerPerLevel: 34, radius: 3 },
      { id: 'cataclysm', tier: 4, reqLevel: 144, maxLevel: 30, kind: 'area', fx: 'shockwave', fxColor: 0xff7733,
        name: { es: 'Cataclismo', en: 'Cataclysm' }, desc: { es: 'Un terremoto que arrasa una gran zona.', en: 'An earthquake that razes a wide area.' },
        manaBase: 250, manaPerLevel: 8, cooldown: 13, powerBase: 880, powerPerLevel: 36, radius: 8 },
      { id: 'final_judgment', tier: 4, reqLevel: 160, maxLevel: 30, kind: 'area', fx: 'holy_nova', fxColor: 0xfff0c0,
        name: { es: 'Juicio Final', en: 'Final Judgment' }, desc: { es: 'Una explosión sagrada arrasa a tu alrededor.', en: 'A holy blast razes everything around you.' },
        manaBase: 260, manaPerLevel: 8, cooldown: 13, powerBase: 900, powerPerLevel: 36, radius: 7 },
    ],
  },

  // ==================================================================== SORCERER
  {
    id: 'mage',
    name: { es: 'Hechicero', en: 'Sorcerer' },
    desc: {
      es: 'Maestro del daño mágico en área. Único que usa varitas ofensivas. Mucho maná, poca defensa.',
      en: 'Master of magic area damage. The only one who wields offensive wands. High mana, low defense.',
    },
    color: 0x9b30ff, spellColor: 0x9b30ff, damageMul: 1.2,
    allowedWeapons: ['wand'],
    baseHp: 100, baseMana: 20, hpPerLevel: 5, manaPerLevel: 25, attackRange: 14,
    regen: { hp: { amount: 1, every: 5 }, mana: { amount: 3, every: 2 } },
    jobChain: [
      { tier: 1, reqLevel: 1, name: { es: 'Hechicero', en: 'Sorcerer' } },
      { tier: 2, reqLevel: 30, name: { es: 'Mago Arcano', en: 'Arcane Mage' } },
      { tier: 3, reqLevel: 70, name: { es: 'Archimago', en: 'Archmage' } },
      { tier: 4, reqLevel: 120, name: { es: 'Gran Hechicero', en: 'Grand Sorcerer' } },
    ],
    skills: [
      // Tier 1
      { id: 'energy_bolt', tier: 1, reqLevel: 1, maxLevel: 20, kind: 'ranged', fx: 'magic_bolt', fxColor: 0xb070ff,
        name: { es: 'Descarga de Energía', en: 'Energy Bolt' }, desc: { es: 'Una descarga básica de energía.', en: 'A basic burst of energy.' },
        manaBase: 6, manaPerLevel: 1, cooldown: 1, powerBase: 14, powerPerLevel: 9, radius: 1.5 },
      { id: 'wand_mastery', tier: 1, reqLevel: 3, maxLevel: 20, kind: 'passive',
        name: { es: 'Maestría de Varita', en: 'Wand Mastery' }, desc: { es: 'Pasiva. Cada nivel lanza tus descargas 5% más rápido.', en: 'Passive. Each level casts 5% faster.' },
        passive: { attackSpeedPerLevel: 0.05 } },
      { id: 'magic_claw', tier: 1, reqLevel: 5, maxLevel: 20, kind: 'ranged', fx: 'twin_bolt', fxColor: 0xc080ff,
        name: { es: 'Garra Mágica', en: 'Magic Claw' }, desc: { es: 'Dos zarpazos de energía a un enemigo.', en: 'Two energy claws strike one foe.' },
        manaBase: 10, manaPerLevel: 1.4, cooldown: 1.2, powerBase: 24, powerPerLevel: 12, radius: 1.5, projectiles: 2 },
      { id: 'mana_font', tier: 1, reqLevel: 8, maxLevel: 20, kind: 'passive',
        name: { es: 'Fuente de Maná', en: 'Mana Font' }, desc: { es: 'Pasiva. Cada nivel +3% de maná máximo.', en: 'Passive. Each level +3% max mana.' },
        passive: { maxManaPerLevel: 0.03 } },
      { id: 'fire_arrow', tier: 1, reqLevel: 12, maxLevel: 20, kind: 'ranged', fx: 'fire_arrow', fxColor: 0xff5522,
        name: { es: 'Flecha de Fuego', en: 'Fire Arrow' }, desc: { es: 'Una saeta ardiente que estalla en una pequeña zona.', en: 'A burning bolt that bursts in a small area.' },
        manaBase: 18, manaPerLevel: 2, cooldown: 1.8, powerBase: 44, powerPerLevel: 16, radius: 2.6 },
      { id: 'thunder_spear', tier: 1, reqLevel: 16, maxLevel: 20, kind: 'ranged', fx: 'lightning', fxColor: 0xbfe9ff,
        name: { es: 'Lanza de Trueno', en: 'Thunder Spear' }, desc: { es: 'Una lanza de rayo que electrocuta en una zona.', en: 'A lance of lightning that shocks an area.' },
        manaBase: 28, manaPerLevel: 2.5, cooldown: 2, powerBase: 72, powerPerLevel: 18, radius: 2.8 },
      { id: 'poison_mist', tier: 1, reqLevel: 22, maxLevel: 15, kind: 'area', fx: 'poison_cloud', fxColor: 0x88c43c,
        name: { es: 'Niebla Venenosa', en: 'Poison Mist' }, desc: { es: 'Una gran nube tóxica que corroe a los enemigos.', en: 'A large toxic cloud that corrodes foes.' },
        manaBase: 40, manaPerLevel: 3, cooldown: 4, powerBase: 95, powerPerLevel: 14, radius: 5.5 },

      // Tier 2 — Arcane Mage
      { id: 'explosion', tier: 2, reqLevel: 30, maxLevel: 20, kind: 'area', fx: 'explosion', fxColor: 0xff7a3a,
        name: { es: 'Explosión', en: 'Explosion' }, desc: { es: 'Una detonación arcana que sacude una amplia zona.', en: 'An arcane detonation that rocks a wide area.' },
        manaBase: 55, manaPerLevel: 3.5, cooldown: 4.5, powerBase: 150, powerPerLevel: 16, radius: 6 },
      { id: 'mana_shield', tier: 2, reqLevel: 30, maxLevel: 20, kind: 'buff', fx: 'self_buff', fxColor: 0x6fa8ff,
        name: { es: 'Escudo de Maná', en: 'Mana Shield' }, desc: { es: 'El maná absorbe parte del daño recibido.', en: 'Mana absorbs part of incoming damage.' },
        manaBase: 50, manaPerLevel: 2, cooldown: 25, buff: { defenseMul: 0.7, duration: 20 } },
      { id: 'ice_strike', tier: 2, reqLevel: 36, maxLevel: 20, kind: 'area', fx: 'ice_nova', fxColor: 0x9fe8ff,
        name: { es: 'Golpe de Hielo', en: 'Ice Strike' }, desc: { es: 'Picos de hielo brotan a tu alrededor.', en: 'Ice spikes erupt all around you.' },
        manaBase: 75, manaPerLevel: 4, cooldown: 5, powerBase: 200, powerPerLevel: 18, radius: 5 },
      { id: 'chain_lightning', tier: 2, reqLevel: 45, maxLevel: 20, kind: 'ranged', fx: 'lightning', fxColor: 0x9fd0ff,
        name: { es: 'Cadena de Rayos', en: 'Chain Lightning' }, desc: { es: 'Un rayo que salta entre enemigos.', en: 'Lightning that arcs between foes.' },
        manaBase: 90, manaPerLevel: 4, cooldown: 5, powerBase: 260, powerPerLevel: 22, radius: 1.8, pierce: true, range: 16 },
      { id: 'blizzard', tier: 2, reqLevel: 55, maxLevel: 20, kind: 'area', fx: 'blizzard', fxColor: 0xcfeaff,
        name: { es: 'Ventisca', en: 'Blizzard' }, desc: { es: 'Una tormenta de hielo azota una gran zona.', en: 'An ice storm batters a large area.' },
        manaBase: 120, manaPerLevel: 5, cooldown: 7, powerBase: 340, powerPerLevel: 24, radius: 6 },

      // Tier 3 — Archmage
      { id: 'meteor', tier: 3, reqLevel: 70, maxLevel: 30, kind: 'area', fx: 'meteor', fxColor: 0xff6a1a,
        name: { es: 'Meteoro', en: 'Meteor' }, desc: { es: 'Una lluvia de meteoros cae sobre una zona.', en: 'A meteor shower over an area.' },
        manaBase: 160, manaPerLevel: 6, cooldown: 9, powerBase: 440, powerPerLevel: 26, radius: 7 },
      { id: 'arcane_overload', tier: 3, reqLevel: 70, maxLevel: 20, kind: 'buff', fx: 'self_buff', fxColor: 0xb84cff,
        name: { es: 'Sobrecarga Arcana', en: 'Arcane Overload' }, desc: { es: 'Tu magia hace mucho más daño un tiempo.', en: 'Your magic deals far more damage for a while.' },
        manaBase: 120, manaPerLevel: 4, cooldown: 35, buff: { damageMul: 1.3, duration: 25 } },
      { id: 'frozen_orb', tier: 3, reqLevel: 80, maxLevel: 25, kind: 'ranged', fx: 'frozen_orb', fxColor: 0x8fe0ff,
        name: { es: 'Orbe Congelado', en: 'Frozen Orb' }, desc: { es: 'Un orbe que rueda congelando todo a su paso.', en: 'An orb that rolls, freezing all in its path.' },
        manaBase: 150, manaPerLevel: 6, cooldown: 6, powerBase: 480, powerPerLevel: 26, radius: 3, pierce: true, range: 18 },
      { id: 'inferno', tier: 3, reqLevel: 95, maxLevel: 25, kind: 'area', fx: 'explosion', fxColor: 0xff3a1a,
        name: { es: 'Infierno', en: 'Inferno' }, desc: { es: 'Un mar de llamas devora una gran zona.', en: 'A sea of flames devours a large area.' },
        manaBase: 190, manaPerLevel: 6.5, cooldown: 8, powerBase: 600, powerPerLevel: 30, radius: 6.5 },

      // Tier 4 — Grand Sorcerer
      { id: 'genesis', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'area', fx: 'holy_nova', fxColor: 0xfff0a0,
        name: { es: 'Génesis', en: 'Genesis' }, desc: { es: 'Una luz devastadora cae sobre un área enorme.', en: 'A devastating light falls over a huge area.' },
        manaBase: 260, manaPerLevel: 8, cooldown: 16, powerBase: 800, powerPerLevel: 36, radius: 9 },
      { id: 'meteor_storm', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'area', fx: 'meteor', fxColor: 0xff3a1a,
        name: { es: 'Tormenta de Meteoros', en: 'Meteor Storm' }, desc: { es: 'El cielo entero cae en fuego.', en: 'The whole sky falls in fire.' },
        manaBase: 240, manaPerLevel: 8, cooldown: 12, powerBase: 740, powerPerLevel: 34, radius: 8 },
      { id: 'armageddon', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'area', fx: 'meteor', fxColor: 0xff8a3a,
        name: { es: 'Armagedón', en: 'Armageddon' }, desc: { es: 'Una lluvia de fuego sin igual.', en: 'An unrivaled rain of fire.' },
        manaBase: 260, manaPerLevel: 8, cooldown: 13, powerBase: 860, powerPerLevel: 36, radius: 9 },
      { id: 'absolute_zero', tier: 4, reqLevel: 124, maxLevel: 30, kind: 'area', fx: 'blizzard', fxColor: 0x9be8ff,
        name: { es: 'Cero Absoluto', en: 'Absolute Zero' }, desc: { es: 'Una ventisca que congela la zona.', en: 'A blizzard that freezes the area.' },
        manaBase: 250, manaPerLevel: 8, cooldown: 12, powerBase: 800, powerPerLevel: 34, radius: 8 },
      { id: 'chain_storm', tier: 4, reqLevel: 128, maxLevel: 25, kind: 'ranged', fx: 'lightning', fxColor: 0xddddff,
        name: { es: 'Tormenta en Cadena', en: 'Chain Storm' }, desc: { es: 'Un rayo que salta entre enemigos.', en: 'Lightning that leaps between foes.' },
        manaBase: 220, manaPerLevel: 7, cooldown: 8, powerBase: 760, powerPerLevel: 30, radius: 4 },
      { id: 'arcane_singularity', tier: 4, reqLevel: 132, maxLevel: 30, kind: 'ranged', fx: 'frozen_orb', fxColor: 0xb78aff,
        name: { es: 'Singularidad Arcana', en: 'Arcane Singularity' }, desc: { es: 'Un orbe que implosiona la realidad.', en: 'An orb that implodes reality.' },
        manaBase: 240, manaPerLevel: 8, cooldown: 11, powerBase: 820, powerPerLevel: 34, radius: 5 },
      { id: 'overload', tier: 4, reqLevel: 136, maxLevel: 20, kind: 'buff', fx: 'self_buff', fxColor: 0xff66ff,
        name: { es: 'Sobrecarga', en: 'Overload' }, desc: { es: 'Tu poder arcano se desborda un tiempo.', en: 'Your arcane power overflows for a time.' },
        manaBase: 200, manaPerLevel: 6, cooldown: 45, powerBase: 0, powerPerLevel: 0, buff: { damageMul: 1.45, duration: 25 } },
      { id: 'pyroclasm', tier: 4, reqLevel: 144, maxLevel: 30, kind: 'area', fx: 'explosion', fxColor: 0xff5522,
        name: { es: 'Pyroclasmo', en: 'Pyroclasm' }, desc: { es: 'Una explosión ígnea descomunal.', en: 'A colossal fiery explosion.' },
        manaBase: 250, manaPerLevel: 8, cooldown: 12, powerBase: 880, powerPerLevel: 36, radius: 7 },
      { id: 'cosmic_rain', tier: 4, reqLevel: 160, maxLevel: 30, kind: 'area', fx: 'holy_nova', fxColor: 0xc0e0ff,
        name: { es: 'Lluvia Cósmica', en: 'Cosmic Rain' }, desc: { es: 'El cosmos descarga su furia.', en: 'The cosmos unleashes its fury.' },
        manaBase: 260, manaPerLevel: 8, cooldown: 13, powerBase: 900, powerPerLevel: 36, radius: 8 },
    ],
  },

  // ====================================================================== DRUID
  {
    id: 'druid',
    name: { es: 'Druida', en: 'Druid' },
    desc: {
      es: 'Apoyo y sanación. Cura a sí mismo y aliados, invoca criaturas y usa varitas. Sobrevive donde otros caen.',
      en: 'Support and healing. Heals self and allies, summons creatures, wields wands. Survives where others fall.',
    },
    color: 0x2ecc71, spellColor: 0x2ecc71, damageMul: 1.0,
    allowedWeapons: ['wand'],
    baseHp: 100, baseMana: 20, hpPerLevel: 5, manaPerLevel: 25, attackRange: 17,
    regen: { hp: { amount: 1, every: 5 }, mana: { amount: 3, every: 2 } },
    jobChain: [
      { tier: 1, reqLevel: 1, name: { es: 'Druida', en: 'Druid' } },
      { tier: 2, reqLevel: 30, name: { es: 'Sacerdote', en: 'Priest' } },
      { tier: 3, reqLevel: 70, name: { es: 'Sumo Druida', en: 'High Druid' } },
      { tier: 4, reqLevel: 120, name: { es: 'Druida Eterno', en: 'Eternal Druid' } },
    ],
    skills: [
      // Tier 1
      { id: 'heal', tier: 1, reqLevel: 1, maxLevel: 20, kind: 'heal', fx: 'self_heal', fxColor: 0x5ce08a,
        name: { es: 'Curación', en: 'Heal' }, desc: { es: 'Restaura tu propia vida con magia natural.', en: 'Restore your own HP with nature magic.' },
        manaBase: 8, manaPerLevel: 1.5, cooldown: 1.5, powerBase: 28, powerPerLevel: 12, radius: 0 },
      { id: 'nature_focus', tier: 1, reqLevel: 3, maxLevel: 20, kind: 'passive',
        name: { es: 'Enfoque Natural', en: 'Nature Focus' }, desc: { es: 'Pasiva. Cada nivel lanza tus descargas 5% más rápido.', en: 'Passive. Each level casts 5% faster.' },
        passive: { attackSpeedPerLevel: 0.05 } },
      { id: 'holy_arrow', tier: 1, reqLevel: 5, maxLevel: 20, kind: 'ranged', fx: 'magic_bolt', fxColor: 0x9be07a,
        name: { es: 'Flecha Sagrada', en: 'Holy Arrow' }, desc: { es: 'Un dardo de energía natural a un enemigo.', en: 'A bolt of nature energy at one foe.' },
        manaBase: 12, manaPerLevel: 1.2, cooldown: 1.4, powerBase: 28, powerPerLevel: 12, radius: 1.6 },
      { id: 'blessing', tier: 1, reqLevel: 8, maxLevel: 20, kind: 'passive',
        name: { es: 'Bendición', en: 'Blessing' }, desc: { es: 'Pasiva. Cada nivel +2% de vida y maná máximos.', en: 'Passive. Each level +2% max HP and mana.' },
        passive: { maxHpPerLevel: 0.02, maxManaPerLevel: 0.02 } },
      { id: 'entangle', tier: 1, reqLevel: 12, maxLevel: 20, kind: 'area', fx: 'vine_burst', fxColor: 0x6ab04c,
        name: { es: 'Enredadera', en: 'Entangle' }, desc: { es: 'Espinas brotan dañando a todos los enemigos en una amplia zona.', en: 'Thorns erupt, damaging every foe in a wide area.' },
        manaBase: 30, manaPerLevel: 2.4, cooldown: 3.5, powerBase: 90, powerPerLevel: 16, radius: 5.5 },
      { id: 'summon_imp', tier: 1, reqLevel: 16, maxLevel: 15, kind: 'summon', fx: 'summon_poof', fxColor: 0xb98aff,
        name: { es: 'Invocar Diablillo', en: 'Summon Imp' }, desc: { es: 'Invoca diablillos que luchan a tu lado.', en: 'Summon imps that fight at your side.' },
        manaBase: 70, manaPerLevel: 4, cooldown: 12, powerBase: 0, powerPerLevel: 0, radius: 0, summonFamily: 'imp', summonCount: 2 },
      { id: 'bless_heal', tier: 1, reqLevel: 22, maxLevel: 20, kind: 'heal', fx: 'self_heal', fxColor: 0x7bed6f,
        name: { es: 'Bendición Mayor', en: 'Greater Bless' }, desc: { es: 'Una bendición que restaura mucha vida.', en: 'A blessing that restores much HP.' },
        manaBase: 24, manaPerLevel: 2, cooldown: 3, powerBase: 80, powerPerLevel: 14, radius: 0 },

      // Tier 2 — Priest
      { id: 'mass_heal', tier: 2, reqLevel: 30, maxLevel: 20, kind: 'heal', fx: 'heal_nova', fxColor: 0x7bed6f,
        name: { es: 'Curación en Masa', en: 'Mass Heal' }, desc: { es: 'Cura a todos los aliados a tu alrededor.', en: 'Heal every ally around you.' },
        manaBase: 80, manaPerLevel: 4, cooldown: 6, powerBase: 160, powerPerLevel: 18, radius: 6 },
      { id: 'holy_shield', tier: 2, reqLevel: 30, maxLevel: 20, kind: 'buff', fx: 'self_buff', fxColor: 0xfff0a0,
        name: { es: 'Escudo Sagrado', en: 'Holy Shield' }, desc: { es: 'Una égida sagrada reduce el daño un tiempo.', en: 'A holy aegis reduces damage for a while.' },
        manaBase: 60, manaPerLevel: 2, cooldown: 25, buff: { defenseMul: 0.55, duration: 18 } },
      { id: 'shining_ray', tier: 2, reqLevel: 36, maxLevel: 20, kind: 'area', fx: 'holy_nova', fxColor: 0xfff4c0,
        name: { es: 'Rayo Brillante', en: 'Shining Ray' }, desc: { es: 'Una luz sagrada estalla dañando enemigos.', en: 'A holy light bursts, damaging foes.' },
        manaBase: 70, manaPerLevel: 3.5, cooldown: 4, powerBase: 190, powerPerLevel: 18, radius: 4.5 },
      { id: 'summon_wolf', tier: 2, reqLevel: 45, maxLevel: 15, kind: 'summon', fx: 'summon_poof', fxColor: 0x9aa0a6,
        name: { es: 'Invocar Lobo', en: 'Summon Wolf' }, desc: { es: 'Invoca un lobo feroz que combate por ti.', en: 'Summon a fierce wolf to fight for you.' },
        manaBase: 120, manaPerLevel: 5, cooldown: 16, powerBase: 0, powerPerLevel: 0, radius: 0, summonFamily: 'wolf', summonCount: 1 },
      { id: 'natures_wrath', tier: 2, reqLevel: 55, maxLevel: 20, kind: 'area', fx: 'vine_burst', fxColor: 0x4fd06a,
        name: { es: 'Ira de la Naturaleza', en: "Nature's Wrath" }, desc: { es: 'Raíces gigantes destrozan una gran zona.', en: 'Giant roots tear through a large area.' },
        manaBase: 110, manaPerLevel: 5, cooldown: 6, powerBase: 320, powerPerLevel: 22, radius: 5.5 },

      // Tier 3 — High Druid
      { id: 'holy_symbol', tier: 3, reqLevel: 70, maxLevel: 25, kind: 'heal', fx: 'heal_nova', fxColor: 0xc8ffb0,
        name: { es: 'Símbolo Sagrado', en: 'Holy Symbol' }, desc: { es: 'Una gran ola de vida sana a los aliados.', en: 'A great wave of life heals allies.' },
        manaBase: 140, manaPerLevel: 5, cooldown: 8, powerBase: 320, powerPerLevel: 22, radius: 7 },
      { id: 'rejuvenation', tier: 3, reqLevel: 70, maxLevel: 20, kind: 'buff', fx: 'self_buff', fxColor: 0x7bed6f,
        name: { es: 'Rejuvenecer', en: 'Rejuvenation' }, desc: { es: 'Regeneras vida poco a poco un buen rato.', en: 'Regenerate HP over time for a while.' },
        manaBase: 90, manaPerLevel: 3, cooldown: 20, buff: { regenPerSec: 0.02, duration: 20 } },
      { id: 'summon_bear', tier: 3, reqLevel: 80, maxLevel: 20, kind: 'summon', fx: 'summon_poof', fxColor: 0x8a6a45,
        name: { es: 'Invocar Oso', en: 'Summon Bear' }, desc: { es: 'Un poderoso oso lucha a tu lado.', en: 'A mighty bear fights at your side.' },
        manaBase: 170, manaPerLevel: 6, cooldown: 18, powerBase: 0, powerPerLevel: 0, radius: 0, summonFamily: 'bear', summonCount: 1 },
      { id: 'thorn_storm', tier: 3, reqLevel: 95, maxLevel: 25, kind: 'area', fx: 'vine_burst', fxColor: 0x39d35a,
        name: { es: 'Tormenta de Espinas', en: 'Thorn Storm' }, desc: { es: 'Un huracán de espinas asola una gran zona.', en: 'A hurricane of thorns ravages a large area.' },
        manaBase: 180, manaPerLevel: 6.5, cooldown: 8, powerBase: 560, powerPerLevel: 28, radius: 6.5 },

      // Tier 4 — Eternal Druid
      { id: 'sanctuary', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'heal', fx: 'heal_nova', fxColor: 0xc8ffb0,
        name: { es: 'Santuario', en: 'Sanctuary' }, desc: { es: 'Una ola de vida restaura a todos los aliados.', en: 'A wave of life restores all allies.' },
        manaBase: 260, manaPerLevel: 8, cooldown: 16, powerBase: 760, powerPerLevel: 32, radius: 9 },
      { id: 'worldtree', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'area', fx: 'vine_burst', fxColor: 0x2ecc71,
        name: { es: 'Árbol del Mundo', en: 'World Tree' }, desc: { es: 'El árbol del mundo despierta y arrasa el campo.', en: 'The world tree awakens and sweeps the field.' },
        manaBase: 240, manaPerLevel: 8, cooldown: 14, powerBase: 720, powerPerLevel: 32, radius: 8 },
      { id: 'lifebloom', tier: 4, reqLevel: 120, maxLevel: 30, kind: 'heal', fx: 'heal_nova', fxColor: 0xb6ffce,
        name: { es: 'Floración Vital', en: 'Lifebloom' }, desc: { es: 'Una explosión de vida que cura en gran zona.', en: 'A burst of life healing a wide area.' },
        manaBase: 240, manaPerLevel: 8, cooldown: 12, powerBase: 820, powerPerLevel: 34, radius: 9 },
      { id: 'wrath_of_nature', tier: 4, reqLevel: 124, maxLevel: 30, kind: 'area', fx: 'vine_burst', fxColor: 0x44cc66,
        name: { es: 'Cólera de la Naturaleza', en: 'Wrath of Nature' }, desc: { es: 'Espinas colosales emergen del suelo.', en: 'Colossal thorns erupt from the ground.' },
        manaBase: 250, manaPerLevel: 8, cooldown: 12, powerBase: 800, powerPerLevel: 34, radius: 8 },
      { id: 'summon_dragon', tier: 4, reqLevel: 128, maxLevel: 25, kind: 'summon', fx: 'summon_poof', fxColor: 0xcc3322,
        name: { es: 'Invocar Dragón', en: 'Summon Dragon' }, desc: { es: 'Invoca un dragón aliado un breve tiempo.', en: 'Summon an allied dragon for a short time.' },
        manaBase: 260, manaPerLevel: 8, cooldown: 30, powerBase: 0, powerPerLevel: 0, summonFamily: 'dragon', summonCount: 1 },
      { id: 'eternal_grove', tier: 4, reqLevel: 132, maxLevel: 20, kind: 'buff', fx: 'self_buff', fxColor: 0x88dd99,
        name: { es: 'Arboleda Eterna', en: 'Eternal Grove' }, desc: { es: 'La naturaleza te regenera y protege.', en: 'Nature regenerates and shields you.' },
        manaBase: 200, manaPerLevel: 6, cooldown: 45, powerBase: 0, powerPerLevel: 0, buff: { defenseMul: 0.6, regenPerSec: 0.03, duration: 25 } },
      { id: 'thorn_cataclysm', tier: 4, reqLevel: 136, maxLevel: 30, kind: 'area', fx: 'vine_burst', fxColor: 0x2ecc71,
        name: { es: 'Cataclismo de Espinas', en: 'Thorn Cataclysm' }, desc: { es: 'Un bosque de espinas estalla a tu alrededor.', en: 'A forest of thorns bursts around you.' },
        manaBase: 240, manaPerLevel: 8, cooldown: 11, powerBase: 840, powerPerLevel: 34, radius: 7 },
      { id: 'solar_storm', tier: 4, reqLevel: 144, maxLevel: 30, kind: 'area', fx: 'holy_nova', fxColor: 0xffe066,
        name: { es: 'Tormenta Solar', en: 'Solar Storm' }, desc: { es: 'La luz del sol arrasa una gran zona.', en: 'Sunlight razes a wide area.' },
        manaBase: 250, manaPerLevel: 8, cooldown: 12, powerBase: 880, powerPerLevel: 36, radius: 7 },
      { id: 'gaias_blessing', tier: 4, reqLevel: 160, maxLevel: 30, kind: 'heal', fx: 'heal_nova', fxColor: 0xc8ffb0,
        name: { es: 'Bendición de Gaia', en: "Gaia's Blessing" }, desc: { es: 'La bendición de la tierra cura por completo.', en: "Earth's blessing heals to the fullest." },
        manaBase: 260, manaPerLevel: 8, cooldown: 14, powerBase: 900, powerPerLevel: 36, radius: 10 },
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
    if (s.maxLevel == null) s.maxLevel = 20;
  }
}

// Skill-point economy (SP_PER_LEVEL = 3): the SP earned WITHIN each job-tier
// band should let you max that tier's skills as you finish it, while tier 4 is
// deliberately bigger so end-game never runs out of things to spend on.
//   tier 1 (lv 1→30) ≈ 84 SP · tier 2 (→70) ≈ 120 · tier 3 (→120) ≈ 150 · tier 4 open
// We assign EVEN, VARIED caps per skill that sum near each band's budget, so the
// numbers stay tidy (5/10/15/20…) and a focused player fully fills a tier on time.
const TIER_CAP_PATTERN = {
  1: [10, 12, 12, 14, 12, 12, 12],            // ≤7 skills → ~84
  2: [20, 30, 20, 30, 20, 20, 20, 20],        // ~120 for 5-8 skills
  3: [30, 40, 40, 40, 30, 30, 30],            // ~150 for 4 skills (first four sum 150)
  4: [30, 30, 30, 30, 25, 30, 25, 30, 25, 30],// big, varied → never fully maxed before ~lv185
};
for (const p of PROFESSIONS) {
  const byTier = { 1: [], 2: [], 3: [], 4: [] };
  for (const s of p.skills) (byTier[s.tier] || (byTier[s.tier] = [])).push(s);
  for (const tier of [1, 2, 3, 4]) {
    const pat = TIER_CAP_PATTERN[tier];
    byTier[tier].forEach((s, i) => { s.maxLevel = pat[i % pat.length]; });
  }
}

const BY_ID = new Map(PROFESSIONS.map((p) => [p.id, p]));

// Look up a profession by id, or undefined if unknown.
export function getProfession(id) {
  return BY_ID.get(id);
}

// The named job title for a profession at a character level (e.g. 'Golden
// Archer' at lv 30+). Falls back to the base profession name.
export function jobTitle(professionId, level, lang = 'es') {
  const p = BY_ID.get(professionId);
  if (!p) return '';
  const tier = tierForLevel(level);
  const chain = p.jobChain || [];
  let pick = chain[0];
  for (const j of chain) { if (j.tier <= tier && level >= j.reqLevel) pick = j; }
  const name = pick ? pick.name : p.name;
  return (name && (name[lang] || name.es)) || p.id;
}

// The job-advancement entry a character JUST reached at exactly this level, or
// null. Used to announce "You are now a Golden Archer!" on level-up.
export function jobAdvancementAt(professionId, level) {
  const p = BY_ID.get(professionId);
  if (!p || !p.jobChain) return null;
  return p.jobChain.find((j) => j.reqLevel === level && j.tier > 1) || null;
}

// True if the profession may equip the given weapon type.
export function canUseWeaponType(professionId, weaponType) {
  const p = BY_ID.get(professionId);
  return !!p && p.allowedWeapons.includes(weaponType);
}

// The job tier a skill belongs to (defaults to 1 for legacy skills).
export function skillTier(skill) {
  return (skill && skill.tier) || 1;
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

// Skills of a profession grouped by tier (1..4), for the tiered skill panel.
export function skillsByTier(professionId) {
  const p = BY_ID.get(professionId);
  const out = { 1: [], 2: [], 3: [], 4: [] };
  if (!p) return out;
  for (const s of p.skills) (out[skillTier(s)] ||= []).push(s);
  return out;
}

// Look up a skill by id across all professions.
const SKILL_BY_ID = new Map();
for (const p of PROFESSIONS) for (const sk of p.skills) SKILL_BY_ID.set(sk.id, sk);
export function getSkill(id) { return SKILL_BY_ID.get(id) || null; }

// Aggregate the passive bonuses from skills the player has put points into. A
// passive declares `passive: { attackSpeedPerLevel, rangePerLevel,
// damagePerLevel, critPerLevel, critDamagePerLevel, maxHpPerLevel,
// maxManaPerLevel }` — each a per-skill-level fraction that stacks additively
// across the player's leveled passives. Returns multipliers/adders.
// `skillLevels` is a { skillId -> level } map (CharacterStats.skillLevels).
export function passiveCombatBonuses(professionId, skillLevels) {
  const p = BY_ID.get(professionId);
  const out = {
    attackSpeedMul: 1, rangeMul: 1, damageMul: 1,
    critAdd: 0, critDamageAdd: 0, maxHpMul: 1, maxManaMul: 1,
  };
  if (!p || !skillLevels) return out;
  for (const sk of p.skills) {
    const passive = sk.passive;
    if (!passive) continue;
    const lv = skillLevels[sk.id] || 0;
    if (lv <= 0) continue;
    if (passive.attackSpeedPerLevel) out.attackSpeedMul += passive.attackSpeedPerLevel * lv;
    if (passive.rangePerLevel) out.rangeMul += passive.rangePerLevel * lv;
    if (passive.damagePerLevel) out.damageMul += passive.damagePerLevel * lv;
    if (passive.critPerLevel) out.critAdd += passive.critPerLevel * lv;
    if (passive.critDamagePerLevel) out.critDamageAdd += passive.critDamagePerLevel * lv;
    if (passive.maxHpPerLevel) out.maxHpMul += passive.maxHpPerLevel * lv;
    if (passive.maxManaPerLevel) out.maxManaMul += passive.maxManaPerLevel * lv;
  }
  return out;
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

export const WEAPON_ATTACK_SPEED = {
  sword: 0.6, axe: 0.85, bow: 0.75, wand: 0.65, fist: 0.6,
};

export function weaponAttackSpeed(weaponType) {
  if (!weaponType) return WEAPON_ATTACK_SPEED.fist;
  return WEAPON_ATTACK_SPEED[weaponType] || WEAPON_ATTACK_SPEED.sword;
}

export function professionRegen(professionId) {
  const p = BY_ID.get(professionId);
  return (p && p.regen) || { hp: { amount: 2, every: 4 }, mana: { amount: 2, every: 4 } };
}

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
