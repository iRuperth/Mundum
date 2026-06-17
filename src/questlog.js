import { getQuest, QUESTS } from './data/quests.js';

// Tracks the player's quest state: which are active, their per-objective
// progress, and which are done. Drives objective updates from game events.
const STATUS = { ACTIVE: 'active', DONE: 'done' };

export class QuestLog {
  constructor() {
    this.active = {};
    this.done = {};
  }

  isActive(id) { return !!this.active[id]; }
  isDone(id) { return !!this.done[id]; }

  // `ctx` (optional) carries the world gates an imaginative quest can demand:
  //   { isNight: bool, hasItems: (itemId, count) => bool }
  // A quest may be `nightOnly` (only offered after dark) and/or list
  // `requiresItems: [{ itemId, count }]` — a thematic KEY or barter the player
  // must already hold to even start it (e.g. a demon-bone key to pass the hound).
  // When no ctx is supplied (older callers), the world gates are skipped so the
  // quest still shows; the level gate always applies.
  canAccept(id, level, ctx) {
    const q = getQuest(id);
    if (!q) return false;
    if (this.active[id] || this.done[id]) return false;
    if (level < (q.minLevel || 1)) return false;
    if (ctx) {
      if (q.nightOnly && !ctx.isNight) return false;
      if (q.dayOnly && ctx.isNight) return false;
      if (q.requiresItems && ctx.hasItems) {
        for (const r of q.requiresItems) {
          if (!ctx.hasItems(r.itemId, r.count || 1)) return false;
        }
      }
    }
    return true;
  }

  // Why a quest can't be accepted yet (for a helpful NPC line). Returns one of
  // 'ok' | 'level' | 'night' | 'day' | 'items' | 'taken'. Mirrors canAccept.
  acceptBlocker(id, level, ctx) {
    const q = getQuest(id);
    if (!q) return 'taken';
    if (this.active[id] || this.done[id]) return 'taken';
    if (level < (q.minLevel || 1)) return 'level';
    if (ctx) {
      if (q.nightOnly && !ctx.isNight) return 'night';
      if (q.dayOnly && ctx.isNight) return 'day';
      if (q.requiresItems && ctx.hasItems) {
        for (const r of q.requiresItems) {
          if (!ctx.hasItems(r.itemId, r.count || 1)) return 'items';
        }
      }
    }
    return 'ok';
  }

  accept(id) {
    const q = getQuest(id);
    if (!q || this.active[id] || this.done[id]) return false;
    this.active[id] = { id, progress: q.objectives.map(() => 0) };
    return true;
  }

  // Returns the list of quests ready to turn in (all objectives met).
  readyToComplete() {
    const out = [];
    for (const id in this.active) {
      if (this._allMet(id)) out.push(id);
    }
    return out;
  }

  _allMet(id) {
    const q = getQuest(id);
    const st = this.active[id];
    if (!q || !st) return false;
    return q.objectives.every((o, i) => st.progress[i] >= (o.count || 1));
  }

  // Apply a game event to every active quest. event = { type, target }.
  // Returns ids whose progress changed.
  onEvent(type, target) {
    const changed = [];
    for (const id in this.active) {
      const q = getQuest(id);
      const st = this.active[id];
      q.objectives.forEach((o, i) => {
        if (o.type !== type) return;
        if (st.progress[i] >= (o.count || 1)) return;
        if (matches(o.target, target)) {
          st.progress[i] = Math.min((o.count || 1), st.progress[i] + 1);
          if (!changed.includes(id)) changed.push(id);
        }
      });
    }
    return changed;
  }

  // Complete a quest, returning its rewards or null. Chains the next quest.
  complete(id) {
    const q = getQuest(id);
    if (!q || !this._allMet(id)) return null;
    delete this.active[id];
    if (!q.repeatable) this.done[id] = true;
    if (q.next) this.accept(q.next);
    return { rewards: q.rewards || {}, next: q.next || null };
  }

  objectiveText(id, lang) {
    const q = getQuest(id);
    const st = this.active[id];
    if (!q || !st) return [];
    return q.objectives.map((o, i) => {
      const label = o.desc ? (o.desc[lang] || o.desc.es) : o.type;
      return { text: label, have: st.progress[i], need: o.count || 1, done: st.progress[i] >= (o.count || 1) };
    });
  }

  activeList() { return Object.keys(this.active).map((id) => getQuest(id)).filter(Boolean); }

  serialize() { return { active: this.active, done: this.done }; }
  load(data) {
    if (!data) return;
    if (data.active) this.active = data.active;
    if (data.done) this.done = data.done;
  }
}

// An objective target may be a family, item id, city id or npc id. We match
// leniently: exact equality, or the event target starting with the family.
function matches(want, got) {
  if (want == null) return true;
  if (want === got) return true;
  const w = String(want).toLowerCase().replace(/-/g, '_');
  const g = String(got || '').toLowerCase().replace(/-/g, '_');
  return w === g || g.startsWith(w + '_') || g === w;
}

export { QUESTS, STATUS };
