// MapleStory-style character stats: STR, DEX, INT, LUK plus the point pools you
// spend on level-up. Each level grants AP (ability points for stats) and SP
// (skill points for the skill tree). The primary stat per job boosts damage,
// secondary stats give smaller bonuses.
const STATS = ['str', 'dex', 'int', 'luk'];

// AP granted per level for stats, and SP per level for skills.
const AP_PER_LEVEL = 5;
const SP_PER_LEVEL = 3;

// Each job's primary stat (drives its main damage) and secondary stat.
const JOB_STATS = {
  knight:  { primary: 'str', secondary: 'dex' },
  paladin: { primary: 'dex', secondary: 'str' },
  mage:    { primary: 'int', secondary: 'luk' },
  druid:   { primary: 'int', secondary: 'luk' },
};

const BASE_STAT = 5; // every stat starts at 5, like MapleStory

export class CharacterStats {
  constructor(profession) {
    this.profession = profession || 'knight';
    this.str = BASE_STAT;
    this.dex = BASE_STAT;
    this.int = BASE_STAT;
    this.luk = BASE_STAT;
    this.ap = 0;            // unspent ability points
    this.sp = 0;            // unspent skill points
    this.skillLevels = {};  // skillId -> level (1..maxLevel)
    this.lastLevel = 1;
  }

  // Award AP and SP for going from `fromLevel` to `toLevel`.
  grantForLevels(fromLevel, toLevel) {
    const gained = Math.max(0, toLevel - fromLevel);
    this.ap += gained * AP_PER_LEVEL;
    this.sp += gained * SP_PER_LEVEL;
    this.lastLevel = toLevel;
  }

  // Spend one ability point raising a stat. Returns true on success.
  addStat(stat) {
    if (this.ap <= 0 || !STATS.includes(stat)) return false;
    this[stat] += 1;
    this.ap -= 1;
    return true;
  }

  skillLevel(id) { return this.skillLevels[id] || 0; }

  // Spend one skill point on a skill, respecting its cap. Returns true/false.
  addSkillPoint(skill) {
    if (this.sp <= 0 || !skill) return false;
    const cur = this.skillLevel(skill.id);
    if (cur >= (skill.maxLevel || 20)) return false;
    this.skillLevels[skill.id] = cur + 1;
    this.sp -= 1;
    return true;
  }

  // Primary-stat damage multiplier: each point of the job's primary stat adds a
  // little damage; the secondary adds less. Tuned so stats matter but don't
  // dwarf skill levels.
  damageMultiplier() {
    const js = JOB_STATS[this.profession] || JOB_STATS.knight;
    const primary = this[js.primary] - BASE_STAT;
    const secondary = this[js.secondary] - BASE_STAT;
    return 1 + primary * 0.01 + secondary * 0.004;
  }

  // Bonus max HP/mana from stats: STR and DEX give a little HP, INT/LUK a little
  // mana, so spending AP also shapes your durability like MapleStory.
  bonusHp() { return (this.str - BASE_STAT) * 4 + (this.dex - BASE_STAT) * 2; }
  bonusMana() { return (this.int - BASE_STAT) * 6 + (this.luk - BASE_STAT) * 2; }

  serialize() {
    return {
      str: this.str, dex: this.dex, int: this.int, luk: this.luk,
      ap: this.ap, sp: this.sp, skillLevels: this.skillLevels, lastLevel: this.lastLevel,
    };
  }

  load(data) {
    if (!data) return;
    for (const s of STATS) if (typeof data[s] === 'number') this[s] = data[s];
    if (typeof data.ap === 'number') this.ap = data.ap;
    if (typeof data.sp === 'number') this.sp = data.sp;
    if (data.skillLevels && typeof data.skillLevels === 'object') this.skillLevels = data.skillLevels;
    if (typeof data.lastLevel === 'number') this.lastLevel = data.lastLevel;
  }
}

export { STATS, JOB_STATS, AP_PER_LEVEL, SP_PER_LEVEL };
