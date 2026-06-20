// Party system — group up with other players for an XP bonus, and split a kill's
// XP among everyone who helped. Pure data + math here; the networking (invites,
// presence) is wired in main.js/net.js on top of this model.
//
// XP bonus rules (the player's spec):
//   • solo (party of 1)                      → ×1.00 (no bonus)
//   • in a group of 2 or more               → ×1.10 (+10%)
//   • a FULL group of 4, ALL different       → ×1.10 + ×0.20 = ×1.30 (+30% total)
//     professions (knight/paladin/mage/druid)
// The diversity bonus stacks on top of the group bonus and only triggers at a
// 4-member party where every member is a distinct profession.

export const PARTY_MAX = 4;
const GROUP_BONUS = 0.10;       // +10% just for being grouped (2+)
const DIVERSITY_BONUS = 0.20;   // +20% extra for a 4-of-a-kind-different party

// The XP multiplier for a party, given its members' professions. `members` is an
// array of profession ids (strings). Works for the local solo case too (length 1).
export function partyXpMultiplier(members) {
  const n = Array.isArray(members) ? members.length : 0;
  if (n < 2) return 1.0;                       // solo → no bonus
  let mult = 1.0 + GROUP_BONUS;                // grouped → +10%
  if (n >= PARTY_MAX) {
    const distinct = new Set(members.filter(Boolean)).size;
    if (distinct >= PARTY_MAX) mult += DIVERSITY_BONUS;   // 4 different profs → +20%
  }
  return mult;
}

// A short human label for the active bonus (for the party UI / toast).
export function partyBonusLabel(members) {
  const m = partyXpMultiplier(members);
  if (m <= 1.0) return '';
  return `+${Math.round((m - 1) * 100)}% XP`;
}

// Split a kill's XP among the attackers who damaged the creature. `shares` is a
// map { attackerId → damageDealt }. Returns { attackerId → xpAwarded }, each
// proportional to that attacker's damage, summing to ~totalXp. The local player's
// own party bonus is applied later (per-recipient) by the caller.
export function splitKillXp(totalXp, shares) {
  const ids = Object.keys(shares || {});
  if (!ids.length) return {};
  let total = 0;
  for (const id of ids) total += Math.max(0, shares[id] || 0);
  const out = {};
  if (total <= 0) {                            // no damage logged → even split
    const each = Math.round(totalXp / ids.length);
    for (const id of ids) out[id] = each;
    return out;
  }
  for (const id of ids) out[id] = Math.round(totalXp * (Math.max(0, shares[id] || 0) / total));
  return out;
}

// The party model held by the local client. Tracks member ids + their professions,
// so the bonus can be computed and shown. The local player is always a member.
export class Party {
  constructor(selfId, selfProfession) {
    this.selfId = selfId;
    // members: Map<id, { id, name, profession }>
    this.members = new Map();
    this.setSelf(selfId, 'You', selfProfession);
  }
  setSelf(id, name, profession) {
    this.selfId = id;
    this.members.set(id, { id, name: name || 'You', profession: profession || 'knight' });
  }
  add(id, name, profession) {
    if (this.members.size >= PARTY_MAX && !this.members.has(id)) return false;
    this.members.set(id, { id, name: name || 'Adventurer', profession: profession || 'knight' });
    return true;
  }
  remove(id) {
    if (id === this.selfId) { this.disband(); return; }
    this.members.delete(id);
  }
  disband() {
    const self = this.members.get(this.selfId);
    this.members.clear();
    if (self) this.members.set(this.selfId, self);
  }
  has(id) { return this.members.has(id); }
  size() { return this.members.size; }
  inParty() { return this.members.size >= 2; }
  ids() { return [...this.members.keys()]; }
  professions() { return [...this.members.values()].map((m) => m.profession); }
  xpMultiplier() { return partyXpMultiplier(this.professions()); }
  bonusLabel() { return partyBonusLabel(this.professions()); }
}
