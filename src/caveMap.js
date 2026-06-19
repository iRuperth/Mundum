// Per-player CAVE EXPLORATION memory ("fog of war" for the underground map).
//
// The cave minimap used to show a blank grey disc. Now it draws the REAL cave
// structure (rock vs walkable floor, sampled from the floor's solidAt), but only
// the parts the player has actually WALKED NEAR — the map fills in as you explore,
// Tibia-style, instead of being handed to you complete. This module owns that
// "where have I been" memory and its persistence, so each character keeps their
// own map history across sessions.
//
// Storage model: a coarse grid of CELL-metre cells. For each (dungeonId, floor)
// we keep a Set of revealed cell keys ("gx,gz"). Revealing is cheap (a small disc
// of cells around the player each tick); querying is a Set lookup. Serializes to
// a compact { "dungeonId|floor": [packedCell, ...] } object that rides in the
// save next to the house/depot/etc.

// Cell size in metres. 2m reads as a chunky explored-area brush — fine enough to
// trace corridors and room edges, coarse enough that the revealed Set stays small
// (a 100m room is ~50×50 = 2500 cells max, a few KB packed).
export const CAVE_CELL = 2;

// How far around the player counts as "seen" and gets revealed each step, in
// metres. A little generous so walking a corridor reveals its width, not a 1-cell
// thread. (The minimap still only DRAWS revealed cells; this is the brush size.)
export const CAVE_SIGHT = 9;

// Pack a cell coord pair into one integer key. Coords are small signed ints
// (rooms are < ~70m half-extent → < 35 cells), so a 16-bit-per-axis pack with a
// bias is plenty and keeps the serialized array of plain numbers tiny.
const BIAS = 1024;                      // shift so negatives pack positive
function packCell(gx, gz) { return (gx + BIAS) * 4096 + (gz + BIAS); }

export class CaveMap {
  constructor() {
    // key "dungeonId|floor" -> Set<packedCell>
    this.floors = new Map();
  }

  _key(dungeonId, floor) { return `${dungeonId}|${floor}`; }

  _set(dungeonId, floor) {
    const k = this._key(dungeonId, floor);
    let s = this.floors.get(k);
    if (!s) { s = new Set(); this.floors.set(k, s); }
    return s;
  }

  // Mark every cell within CAVE_SIGHT of world point (x,z) on this floor as seen.
  // Returns true if anything NEW was revealed (so the caller can trigger a save).
  reveal(dungeonId, floor, x, z, sight = CAVE_SIGHT) {
    const s = this._set(dungeonId, floor);
    const r = Math.ceil(sight / CAVE_CELL);
    const cgx = Math.round(x / CAVE_CELL), cgz = Math.round(z / CAVE_CELL);
    let added = false;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > r * r) continue;     // round brush
        const key = packCell(cgx + dx, cgz + dz);
        if (!s.has(key)) { s.add(key); added = true; }
      }
    }
    return added;
  }

  // Has the cell containing world point (x,z) been revealed on this floor?
  isRevealed(dungeonId, floor, x, z) {
    const s = this.floors.get(this._key(dungeonId, floor));
    if (!s) return false;
    return s.has(packCell(Math.round(x / CAVE_CELL), Math.round(z / CAVE_CELL)));
  }

  // Cheap "has the player been here at all" check, to skip drawing structure for
  // a floor that's never been entered.
  hasAny(dungeonId, floor) {
    const s = this.floors.get(this._key(dungeonId, floor));
    return !!(s && s.size);
  }

  // --- Persistence ---------------------------------------------------------
  // Compact plain-object form: { "id|floor": [packedCell, ...] }. Sets become
  // arrays; packed ints keep it small even for a fully-explored multi-floor cave.
  serialize() {
    const out = {};
    for (const [k, s] of this.floors) {
      if (s.size) out[k] = Array.from(s);
    }
    return out;
  }

  load(data) {
    this.floors = new Map();
    if (!data || typeof data !== 'object') return;
    for (const k of Object.keys(data)) {
      const arr = data[k];
      if (Array.isArray(arr) && arr.length) this.floors.set(k, new Set(arr));
    }
  }
}
