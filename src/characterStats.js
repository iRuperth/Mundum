// Mundum character progression — Tibia-style USE skills + a MapleStory-style
// active SKILL TREE.
//
// TWO systems coexist:
//   (a) USE skills (sword/axe/club/distance/shielding/magic/fist): rise by USE
//       and drive BASIC attack damage. Each successful hit grants "tries" to the
//       weapon's skill; magic level rises by mana spent on spells. The cost to
//       advance grows geometrically (fast early, brutal late) and per-vocation
//       constants make knights raise melee fast but magic very slowly, mages the
//       opposite, archers in between — exactly like classic Tibia.
//   (b) The active SKILL TREE: each level grants SKILL POINTS (SP) spent to
//       unlock/level POWERS (spells, area attacks, buffs). SP is bucketed by job
//       tier; a tier-N point only buys tier-N skills.
//
// STR/DEX/INT/LUK are GONE. HP/MP come from level + profession only.
import { tierForLevel, skillTier } from './data/professions.js';

// SP per level for the active skill tree (the user chose 3).
const SP_PER_LEVEL = 3;

// ---- USE skills (Tibia) ----------------------------------------------------
// The weapon-type → use-skill mapping. Shields train 'shielding'; bare hands
// train 'fist'; wands feed 'magic' (mana spent). Maces/lances are club/melee.
export const USE_SKILLS = ['fist', 'sword', 'axe', 'club', 'distance', 'shielding', 'magic'];

export function weaponTypeToSkill(type) {
  switch (type) {
    case 'sword': return 'sword';
    case 'axe': return 'axe';
    case 'mace': case 'club': return 'club';
    case 'lance': return 'sword';       // polearm trains sword fighting
    case 'bow': return 'distance';
    case 'wand': return 'magic';
    default: return 'fist';
  }
}

// Per-vocation advance constants `b` (lower = faster) and base cost `A`. Cost to
// go from skill L → L+1 is A · b^(L − offset). These keep Tibia's SHAPE (each
// level harder than the last, knights slow at magic, mages fast) but are tuned
// FASTER than classic Tibia — roughly a third of the grind — so a kid sees magic
// level / weapon skills climb every session instead of over weeks. (Tibia's real
// values were magic A=1600 b=1.1, weapons A=50 b=1.1; we lower the base costs and
// soften the exponents while preserving the per-class ordering.)
const SKILL_BASE = { fist: 30, sword: 30, axe: 30, club: 30, distance: 20, shielding: 60, magic: 500 };
const SKILL_OFFSET = { magic: 0, fist: 10, sword: 10, axe: 10, club: 10, distance: 10, shielding: 10 };
const VOC_CONST = {
  knight:  { magic: 2.2, sword: 1.075, axe: 1.075, club: 1.075, distance: 1.3, shielding: 1.075, fist: 1.075 },
  paladin: { magic: 1.3, sword: 1.14, axe: 1.14, club: 1.14, distance: 1.075, shielding: 1.075, fist: 1.14 }, // Archer
  mage:    { magic: 1.085, sword: 1.7, axe: 1.7, club: 1.7, distance: 1.7, shielding: 1.35, fist: 1.7 },
  druid:   { magic: 1.085, sword: 1.55, axe: 1.55, club: 1.55, distance: 1.55, shielding: 1.35, fist: 1.55 },
};

// Starting skill level per skill. Tibia starts weapons at 10, magic at 0; we
// start everything modestly so early hits feel meaningful.
const SKILL_START = { fist: 10, sword: 10, axe: 10, club: 10, distance: 10, shielding: 10, magic: 0 };

// Tries needed to advance from skill level L → L+1 for this vocation/skill.
function triesToAdvance(profession, skill, level) {
  const b = (VOC_CONST[profession] || VOC_CONST.knight)[skill] || 1.5;
  const A = SKILL_BASE[skill] || 50;
  const off = SKILL_OFFSET[skill] || 0;
  return Math.max(1, Math.round(A * Math.pow(b, Math.max(0, level - off))));
}

export class CharacterStats {
  constructor(profession) {
    this.profession = profession || 'knight';
    // Use-skill levels + accumulated tries toward the next level.
    this.skills = {};
    this.skillTries = {};
    for (const s of USE_SKILLS) { this.skills[s] = SKILL_START[s]; this.skillTries[s] = 0; }
    // Active skill-tree points, bucketed by job tier (1..4).
    this.spByTier = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.skillLevels = {};  // skillId -> level (1..maxLevel)
    this.lastLevel = 1;
  }

  // Total unspent SP across all tiers (legacy readers / panel headers).
  get sp() {
    return this.spByTier[1] + this.spByTier[2] + this.spByTier[3] + this.spByTier[4];
  }
  spForTier(tier) { return this.spByTier[tier] || 0; }

  // ---- USE skills API ------------------------------------------------------
  // The level of a use-skill (precision/damage source for basic attacks).
  useSkill(skill) { return this.skills[skill] != null ? this.skills[skill] : 0; }

  // The use-skill level for a weapon type (what combat reads for damage/miss).
  weaponSkillLevel(weaponType) { return this.useSkill(weaponTypeToSkill(weaponType)); }

  // Grant `amount` tries to a use-skill; advance levels while the threshold is
  // met. Returns the number of levels gained (so callers can toast "advanced").
  trainSkill(skill, amount = 1) {
    if (this.skills[skill] == null) return 0;
    this.skillTries[skill] = (this.skillTries[skill] || 0) + amount;
    let gained = 0;
    let need = triesToAdvance(this.profession, skill, this.skills[skill]);
    while (this.skillTries[skill] >= need) {
      this.skillTries[skill] -= need;
      this.skills[skill] += 1;
      gained++;
      need = triesToAdvance(this.profession, skill, this.skills[skill]);
    }
    return gained;
  }

  // Magic level rises by mana spent on spells (1 try per mana point).
  trainMagic(manaSpent) { return this.trainSkill('magic', Math.max(0, Math.round(manaSpent))); }

  // 0..1 progress toward the next level of a use-skill (drives the UI bar).
  skillProgress(skill) {
    if (this.skills[skill] == null) return 0;
    const need = triesToAdvance(this.profession, skill, this.skills[skill]);
    return Math.max(0, Math.min(1, (this.skillTries[skill] || 0) / need));
  }

  // ---- compatibility shims (stats are gone; HP/MP come from level+vocation) -
  damageMultiplier() { return 1; }
  attackSpeedMul() { return 1; }
  bonusHp() { return 0; }
  bonusMana() { return 0; }

  // Magic level boosts spell/power damage modestly (used by main.js casting):
  // each magic level adds ~0.8% so a mage still clearly out-nukes a knight's
  // spells without the magic term ballooning skill damage on the compressed
  // scale (skills are now "support" — see professions.skillPower).
  spellPowerMul() { return 1 + this.useSkill('magic') * 0.008; }

  // ---- active skill tree ---------------------------------------------------
  grantForLevels(fromLevel, toLevel) {
    const from = Math.max(1, fromLevel | 0);
    const to = Math.max(from, toLevel | 0);
    for (let lvl = from + 1; lvl <= to; lvl++) {
      const tier = tierForLevel(lvl);
      this.spByTier[tier] = (this.spByTier[tier] || 0) + SP_PER_LEVEL;
    }
    this.lastLevel = to;
  }

  skillLevel(id) { return this.skillLevels[id] || 0; }

  addSkillPoint(skill) {
    if (!skill) return false;
    const tier = skillTier(skill);
    if ((this.spByTier[tier] || 0) <= 0) return false;
    const cur = this.skillLevel(skill.id);
    if (cur >= (skill.maxLevel || 20)) return false;
    this.skillLevels[skill.id] = cur + 1;
    this.spByTier[tier] -= 1;
    return true;
  }

  serialize() {
    return {
      skills: { ...this.skills },
      skillTries: { ...this.skillTries },
      spByTier: { ...this.spByTier },
      skillLevels: this.skillLevels,
      lastLevel: this.lastLevel,
    };
  }

  load(data) {
    if (!data) return;
    // New saves carry use-skills; old saves carried str/dex/int/luk + ap, which
    // we simply ignore (skills start fresh).
    if (data.skills && typeof data.skills === 'object') {
      for (const s of USE_SKILLS) {
        if (typeof data.skills[s] === 'number') this.skills[s] = data.skills[s];
      }
    }
    if (data.skillTries && typeof data.skillTries === 'object') {
      for (const s of USE_SKILLS) {
        if (typeof data.skillTries[s] === 'number') this.skillTries[s] = data.skillTries[s];
      }
    }
    this.spByTier = { 1: 0, 2: 0, 3: 0, 4: 0 };
    if (data.spByTier && typeof data.spByTier === 'object') {
      for (const k of [1, 2, 3, 4]) {
        const v = data.spByTier[k];
        if (typeof v === 'number') this.spByTier[k] = v;
      }
    } else if (typeof data.sp === 'number') {
      this.spByTier[1] = data.sp;            // very old single-pool migration
    }
    if (data.skillLevels && typeof data.skillLevels === 'object') this.skillLevels = data.skillLevels;
    if (typeof data.lastLevel === 'number') this.lastLevel = data.lastLevel;
  }
}

export { SP_PER_LEVEL };
