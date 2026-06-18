// QUEST GUIDE — resolves WHERE the player should go for their active quests, so
// the HUD can draw a waypoint arrow and the minimap a destination marker. Pure
// geography: maps each quest objective to an (x,z) world point.
//
//   reach  → dungeon/city id  → its coords
//   talk   → npc id           → its city coords (+offset)
//   kill   → creature family  → the zone center where it spawns
//   collect→ item id          → (no fixed spot) fall back to the giver city
//   turn-in (all objectives met) → the giver NPC's city
//
// Used by main.js: it picks the NEAREST incomplete objective of the lowest-level
// active quest as the current waypoint (so the guidance follows what you're on).

import { CITIES } from './cities.js';
import { DUNGEONS } from './dungeons.js';
import { ZONES } from './zones.js';
import { NPCS } from './data/npcs.js';

const NPC_BY_ID = new Map(NPCS.map((n) => [n.id, n]));
const CITY_BY_ID = new Map(CITIES.map((c) => [c.id, c]));
const DUNGEON_BY_ID = new Map(DUNGEONS.map((d) => [d.id, d]));
// First zone that hosts each creature family → its center (deterministic).
const ZONE_BY_FAMILY = (() => {
  const m = new Map();
  for (const z of ZONES) for (const f of (z.families || [])) if (!m.has(f)) m.set(f, z);
  return m;
})();

// World point of a city (optionally nudged by an npc offset).
function cityPoint(cityId, npc) {
  const c = CITY_BY_ID.get(cityId);
  if (!c) return null;
  return { x: c.x + (npc && npc.offset ? npc.offset.x || 0 : 0),
           z: c.z + (npc && npc.offset ? npc.offset.z || 0 : 0),
           name: c.name };
}

// Resolve ONE objective to a destination { x, z, name } or null.
function objectiveDest(o, quest) {
  if (!o) return null;
  if (o.type === 'reach') {
    const d = DUNGEON_BY_ID.get(o.target);
    if (d) return { x: d.x, z: d.z, name: locName(d.name) };
    const c = CITY_BY_ID.get(o.target);
    if (c) return { x: c.x, z: c.z, name: c.name };
  } else if (o.type === 'talk') {
    const npc = NPC_BY_ID.get(o.target);
    if (npc && npc.worldPos) return { x: npc.worldPos.x, z: npc.worldPos.z, name: npc.name };
    if (npc) return cityPoint(npc.city, npc);
  } else if (o.type === 'kill') {
    const z = ZONE_BY_FAMILY.get(o.target);
    if (z && z.center) return { x: z.center.x, z: z.center.z, name: locName(z.name) };
  }
  // collect (and any unresolved): default to the quest giver's city.
  return giverPoint(quest);
}

// The quest giver's city point (the turn-in / fallback location).
function giverPoint(quest) {
  if (!quest) return null;
  const npc = quest.giverNpc ? NPC_BY_ID.get(quest.giverNpc) : null;
  if (npc && npc.worldPos) return { x: npc.worldPos.x, z: npc.worldPos.z, name: npc.name };
  if (quest.city) return cityPoint(quest.city, npc);
  return null;
}

function locName(o) {
  if (!o) return '';
  if (typeof o === 'string') return o;
  return o.es || o.en || '';
}

// Given the QuestLog and the active quest list, return the current WAYPOINT:
//   { x, z, name, quest, turnIn }   or null if there's nothing to point at.
// Strategy: take the lowest-minLevel active quest; if all its objectives are met,
// point at its giver (turn-in); else point at its first unmet objective. This
// keeps the arrow on whatever the player is most likely working on.
export function currentWaypoint(questLog, activeQuests) {
  if (!activeQuests || !activeQuests.length) return null;
  const sorted = [...activeQuests].sort((a, b) => (a.minLevel || 0) - (b.minLevel || 0));
  for (const q of sorted) {
    const st = questLog.active[q.id];
    if (!st) continue;
    const ready = questLog.readyToComplete().includes(q.id);
    if (ready) {
      const p = giverPoint(q);
      if (p) return { ...p, quest: q, turnIn: true };
      continue;
    }
    // first objective not yet complete
    const objs = q.objectives || [];
    for (let i = 0; i < objs.length; i++) {
      const have = (st.progress && st.progress[i]) || 0;
      if (have >= (objs[i].count || 1)) continue;
      const p = objectiveDest(objs[i], q);
      if (p) return { ...p, quest: q, turnIn: false };
    }
    // no objective resolved a point — fall back to the giver
    const p = giverPoint(q);
    if (p) return { ...p, quest: q, turnIn: false };
  }
  return null;
}

// The giver city of a quest, for the chain-advance toast ("habla con X en Y").
export function questGiverInfo(quest, lang = 'es') {
  if (!quest) return null;
  const npc = quest.giverNpc ? NPC_BY_ID.get(quest.giverNpc) : null;
  const city = quest.city ? CITY_BY_ID.get(quest.city) : (npc ? CITY_BY_ID.get(npc.city) : null);
  return {
    npcName: npc ? npc.name : null,
    cityName: city ? city.name : null,
  };
}
