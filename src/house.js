// Player housing — Tibia-style houses you can buy, enter, decorate and show off.
//
// The world only has solid house SHELLS (cities.js buildHouse) and a flat list
// of house lots (buildCities().houses, each { id, city, x, z, rot, w, d, floors,
// mansion, basement, doorX, doorZ, style }). This module owns everything ELSE:
//
//   • HouseStore — the player's single owned house: which lot, the showcase items
//     on each wall, per-wall "for sale" flags & prices, exterior/interior colours,
//     light temperature, and the visitor ban list. Serializes into the save.
//   • A private INTERIOR room you walk into (an instanced space, mirroring the
//     cave descend/ascend pattern in main.js): floor + four showcase walls + a
//     window strip + a warm/cold lamp, and a basement level reached by a stair
//     for the biggest homes. Items sit on the walls as framed plaques (white
//     frame = not for sale, orange = for sale) so any item type shows off.
//   • Helpers to price a lot by size, compute showcase capacity, and read the
//     interior's exit/stair triggers.
//
// Only ONE house per player keeps persistence trivial. When online, the owner's
// colours / showcased items / ban list ride over net.js so visitors see the real
// room (net wiring lives in main.js + net.js, not here).

import * as THREE from 'three';
import { iconFor } from './itemIcons.js';

// ---------------------------------------------------------------------------
// Pricing & capacity (everything scales with the house SIZE).
// ---------------------------------------------------------------------------

// A coarse footprint score: floor area × floor count, doubled-ish for mansions.
// Drives both the purchase price and how many showcase slots the walls hold.
export function houseFootprint(lot) {
  const area = (lot.w || 5) * (lot.d || 5);
  const floors = lot.floors || 1;
  let score = area * (1 + (floors - 1) * 0.7);
  if (lot.mansion) score *= 1.35;
  if (lot.basement) score *= 1.25;
  return score;
}

// TEMPORARY testing flag: when true, every house is FREE (price 0) so the housing
// feature can be exercised without grinding gold. Flip back to false to restore
// the real prices below — nothing else needs to change (housePrice is the single
// source of truth for the buy dialog, the gold check/spend, and the sell refund).
export const FREE_HOUSES = true;

// Purchase price in gold (bronze units). Tuned so a small cottage is ~8k and a
// basement mansion runs ~70k+, rounded to a tidy number. Selling refunds half.
export function housePrice(lot) {
  if (FREE_HOUSES) return 0;   // testing: houses cost nothing
  const base = Math.round(houseFootprint(lot) * 220);
  // Round to the nearest 500 so prices read clean in the buy dialog.
  return Math.max(5000, Math.round(base / 500) * 500);
}

// How many showcase columns fit across ONE wall: "3 rows and every column that
// fits on the wall — the bigger the house, the more items". One column per ~0.9m
// of interior wall, clamped so a tiny house still shows a few and a mansion a lot.
function colsForWall(lot) {
  const span = Math.max(lot.w, lot.d) || 5;
  return Math.max(4, Math.min(14, Math.round(span / 0.85)));
}

export const SHOWCASE_ROWS = 3;

// How many items the owner may show on the FRONT wall, outside the house. The
// spec: replace one window space with two display slots.
export const FACADE_SLOTS = 2;

// The set of showcase WALLS in a house, each with its own capacity. A house has
// the four interior walls; mansions add a long gallery wall; a basement adds two
// more walls downstairs (the extra value of a cellar). Returns an array of
// { id, label, cols, rows, cap, floor } so the UI and the 3D builder agree.
export function showcaseWalls(lot) {
  const cols = colsForWall(lot);
  const rows = SHOWCASE_ROWS;
  const walls = [];
  const add = (id, floor) => walls.push({ id, label: id, cols, rows, cap: cols * rows, floor });
  // Four ground-floor walls (north/east/south-with-door uses fewer, west).
  add(0, 'ground');
  add(1, 'ground');
  add(2, 'ground');
  add(3, 'ground');
  if (lot.mansion || (lot.floors || 1) >= 2) add(4, 'ground'); // a gallery wall
  if (lot.basement) { add(5, 'basement'); add(6, 'basement'); }
  return walls;
}

// Total showcase capacity across all walls — shown in the buy dialog.
export function showcaseCapacity(lot) {
  return showcaseWalls(lot).reduce((n, w) => n + w.cap, 0);
}

// A short size label for the buy dialog: small / medium / large / mansion.
export function houseSizeKey(lot) {
  if (lot.mansion) return 'houseSizeMansion';
  const f = houseFootprint(lot);
  if (f > 90) return 'houseSizeLarge';
  if (f > 45) return 'houseSizeMedium';
  return 'houseSizeSmall';
}

// ---------------------------------------------------------------------------
// HouseStore — the player's single owned house. Pure data + serialize.
// ---------------------------------------------------------------------------

// Default exterior/interior palette + light. Hex ints; the UI offers a fixed
// palette of solid colours to pick from (the spec: "solo colores sólidos").
function defaultColors() {
  return {
    wall: 0xcdb892,   // exterior wall
    roof: 0x6f8f3a,   // roof
    door: 0x6a4a2b,   // door
    trim: 0x4a3826,   // exterior trim/beams
    inWall: 0xe7ddc8, // interior wall
    inFloor: 0x9a7b56, // interior floor
  };
}

export class HouseStore {
  constructor() {
    this.owned = null;   // null, or { lotId, city, boughtAt }
    // walls[wallId] = array of slots; each slot is null OR { item }. Houses are
    // DISPLAY-only now — selling moved to the city free market (market.js), so a
    // slot no longer carries a for-sale flag or price.
    this.walls = {};
    this.colors = defaultColors();
    this.light = 'warm';   // 'warm' | 'cold'
    this.bans = [];        // lowercased player names blocked from visiting
    this.closed = false;   // when true, nobody but the owner may enter
    // Facade: up to FACADE_SLOTS items shown OUTSIDE on the front wall (in place
    // of a window), so passers-by see the owner's best pieces without entering.
    // Display-only — these can't be bought. Each entry is an item instance or null.
    this.facade = new Array(FACADE_SLOTS).fill(null);
  }

  ownsAny() { return !!this.owned; }
  ownsLot(lotId) { return !!this.owned && this.owned.lotId === lotId; }

  // Buy `lot`: record ownership and seed empty showcase walls for its size.
  buy(lot) {
    this.owned = { lotId: lot.id, city: lot.city, boughtAt: nowStamp() };
    this.walls = {};
    for (const w of showcaseWalls(lot)) this.walls[w.id] = new Array(w.cap).fill(null);
    this.colors = defaultColors();
    this.light = 'warm';
    this.bans = [];
    this.closed = false;
    this.facade = new Array(FACADE_SLOTS).fill(null);
  }

  // Give up the house: returns the array of items that were on display (so the
  // caller can decide their fate — the spec drops them) and clears ownership.
  sell() {
    const items = this.allItems();
    this.owned = null;
    this.walls = {};
    return items;
  }

  // Every item currently on display, flattened (used on sell / for net sync).
  allItems() {
    const out = [];
    for (const k of Object.keys(this.walls)) {
      for (const s of this.walls[k] || []) if (s && s.item) out.push(s.item);
    }
    return out;
  }

  wall(wallId) {
    if (!this.walls[wallId]) this.walls[wallId] = [];
    return this.walls[wallId];
  }

  // Place `item` on wall `wallId` at the first free slot (or a given index).
  // Returns the slot index used, or -1 if the wall is full.
  place(wallId, item, index = -1) {
    const arr = this.wall(wallId);
    let i = index;
    if (i < 0 || i >= arr.length || arr[i]) i = arr.findIndex((s) => !s);
    if (i < 0) return -1;
    arr[i] = { item };
    return i;
  }

  // Take the item back off the wall (owner only). Returns the item or null.
  take(wallId, index) {
    const arr = this.wall(wallId);
    const slot = arr[index];
    if (!slot) return null;
    arr[index] = null;
    return slot.item;
  }

  slot(wallId, index) {
    const arr = this.wall(wallId);
    return arr[index] || null;
  }

  // Ban list helpers (names, case-insensitive).
  ban(name) {
    const n = String(name || '').trim().toLowerCase();
    if (n && !this.bans.includes(n)) this.bans.push(n);
  }
  unban(name) {
    const n = String(name || '').trim().toLowerCase();
    this.bans = this.bans.filter((b) => b !== n);
  }
  isBanned(name) {
    if (this.closed) return true;
    return this.bans.includes(String(name || '').trim().toLowerCase());
  }

  setColor(key, hex) { if (key in this.colors) this.colors[key] = hex >>> 0; }
  setLight(temp) { this.light = temp === 'cold' ? 'cold' : 'warm'; }

  // Facade display (front wall, outside). Show / clear / read one of the two
  // slots. Display-only — items here are a copy for show, not removed from the
  // backpack and never for sale.
  setFacade(index, item) {
    if (index < 0 || index >= FACADE_SLOTS) return;
    this.facade[index] = item || null;
  }
  clearFacade(index) {
    if (index < 0 || index >= FACADE_SLOTS) return;
    this.facade[index] = null;
  }
  facadeItem(index) { return this.facade[index] || null; }

  serialize() {
    return {
      owned: this.owned,
      walls: this.walls,
      colors: this.colors,
      light: this.light,
      bans: this.bans,
      closed: this.closed,
      facade: this.facade,
    };
  }

  load(data) {
    if (!data || typeof data !== 'object') return;
    this.owned = data.owned || null;
    this.walls = (data.walls && typeof data.walls === 'object') ? data.walls : {};
    this.colors = Object.assign(defaultColors(), data.colors || {});
    this.light = data.light === 'cold' ? 'cold' : 'warm';
    this.bans = Array.isArray(data.bans) ? data.bans : [];
    this.closed = !!data.closed;
    // Normalize the facade to exactly FACADE_SLOTS entries (older saves lack it).
    const f = Array.isArray(data.facade) ? data.facade : [];
    this.facade = new Array(FACADE_SLOTS).fill(null).map((_, i) => f[i] || null);
  }

  // The public snapshot other players receive to render a visit (colours, light,
  // the items on show, the facade display and the ban list — all display-only).
  publicState(lot, ownerName) {
    return {
      lotId: this.owned ? this.owned.lotId : null,
      city: this.owned ? this.owned.city : null,
      owner: ownerName,
      colors: this.colors,
      light: this.light,
      walls: this.walls,
      facade: this.facade,
      closed: this.closed,
      bans: this.bans,
    };
  }
}

// Date.now() is unavailable in workflow scripts but fine in the browser app.
function nowStamp() { try { return Date.now(); } catch (_) { return 0; } }

// ---------------------------------------------------------------------------
// The interior ROOM. An instanced space the player teleports into. It exposes
// a setVisible(), the exit-door trigger, the basement stair triggers, and a
// rebuild() to repaint colours / re-light / re-hang items when they change.
// ---------------------------------------------------------------------------

const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });

// Build a framed plaque for one showcased item: a thin board with the item's
// 2D icon painted onto a canvas texture, ringed by a white frame. Houses are
// display-only (selling moved to the city free market), so every plaque uses
// the same neutral frame.
function buildPlaque(slot, size = 0.7) {
  const g = new THREE.Group();
  // Frame (slightly larger flat box) + recessed board.
  const frame = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.05), lambert(0xf2efe6));
  g.add(frame);
  const back = new THREE.Mesh(new THREE.BoxGeometry(size * 0.84, size * 0.84, 0.04), lambert(0x2b2620));
  back.position.z = 0.02;
  g.add(back);
  if (slot && slot.item) {
    const tex = iconTexture(slot.item);
    if (tex) {
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(size * 0.78, size * 0.78),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      face.position.z = 0.05;
      g.add(face);
    }
  }
  return g;
}

// Rasterize an item's SVG icon to a CanvasTexture once, cached by a per-item key
// (baseId + rarity), so re-hanging the same item type is cheap.
const _texCache = new Map();
function iconTexture(item) {
  const key = (item.baseId || item.name || 'item') + ':' + (item.rarity || '');
  if (_texCache.has(key)) return _texCache.get(key);
  let svg;
  try { svg = iconFor(item); } catch (_) { svg = null; }
  if (!svg) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const tex = new THREE.CanvasTexture(canvas);
  const img = new Image();
  const blob = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    ctx.drawImage(img, 8, 8, 112, 112);
    tex.needsUpdate = true;
  };
  img.src = blob;
  _texCache.set(key, tex);
  return tex;
}

// One interior instance, built for a specific lot + the owner's HouseStore-style
// state (which may be the local store, or a remote visitor's snapshot).
export class HouseInterior {
  // `state` is { colors, light, walls } (HouseStore.publicState or the live store).
  constructor(scene, lot, state, opts = {}) {
    this.scene = scene;
    this.lot = lot;
    this.state = state;
    this.readOnly = !!opts.readOnly;   // visitors can't rearrange
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    // Interior room dimensions derived from the lot footprint, with comfy walls.
    const W = Math.max(7, (lot.w || 5) + 2);
    const D = Math.max(7, (lot.d || 5) + 2);
    this.W = W; this.D = D;
    this.H = 3.4;
    // Place the room far from the surface world so its solids never collide with
    // anything outside (a private pocket, like the caves sit below the map).
    this.origin = { x: 0, y: -400, z: 0 };
    this.exit = { x: 0, z: D / 2 - 0.6 };          // the door, in room-local coords
    this.stair = lot.basement ? { x: W / 2 - 1.2, z: -(D / 2 - 1.2) } : null;
    this.basementY = -3.0;                          // basement floor offset
    this.activeFloor = 0;                           // 0 = ground, 1 = basement

    // The light is rebuilt with the room; keep a handle so we can recolour it.
    this.lamp = null;
    this._lampBase = 1.1;
    this._wallMeshes = [];   // showcase plaque groups, indexed for picking

    this.rebuild();
  }

  // Move between ground (0) and basement (1) — the stair acts like a cave's
  // internal floor change. Returns the landing point + yaw for the player.
  enterBasement() {
    this.activeFloor = 1;
    return { x: this.worldX(this.stair.x), z: this.worldZ(this.stair.z + 2), yaw: 0 };
  }
  enterGround() {
    this.activeFloor = 0;
    return { x: this.worldX(this.stair ? this.stair.x : 0), z: this.worldZ(this.stair ? this.stair.z + 1 : 0), yaw: Math.PI };
  }

  worldX(lx) { return this.origin.x + lx; }
  worldZ(lz) { return this.origin.z + lz; }

  // Where the player should stand when they enter (just inside the door, facing in).
  entryPoint() {
    return { x: this.worldX(0), z: this.worldZ(this.exit.z - 1.6), yaw: Math.PI };
  }

  // World-space exit trigger (step here → leave the house).
  exitTrigger() {
    return { x: this.worldX(this.exit.x), z: this.worldZ(this.exit.z), r: 1.1 };
  }

  // World-space basement stair trigger, or null.
  stairTrigger() {
    if (!this.stair) return null;
    return { x: this.worldX(this.stair.x), z: this.worldZ(this.stair.z), r: 1.0 };
  }

  setVisible(v) { this.group.visible = v; }

  // --- World interface (duck-typed like CaveSystem) ------------------------
  // The interior duck-types World so the player/combat can use it directly while
  // inside. `activeFloor` 0 = ground, 1 = basement; the stair swaps between them.
  // Collision is the room's four walls (perimeter box) for the active floor.

  floorY() { return this.origin.y + (this.activeFloor === 1 ? this.basementY : 0); }

  heightAt() { return this.floorY(); }

  // Bounds the third-person camera must stay within so it never slips out of the
  // room (through the door gap, a wall, the floor or the ceiling) and shows the
  // black void outside — the latter is why the view "broke" while walking: the
  // camera Y rose through the ceiling or dropped through the floor of the small
  // room when looking up/down. Includes the vertical range now.
  cameraBounds() {
    const m = 0.4;          // keep the camera a touch inside the walls
    const fy = this.floorY();
    return {
      minX: this.origin.x - this.W / 2 + m, maxX: this.origin.x + this.W / 2 - m,
      minZ: this.origin.z - this.D / 2 + m, maxZ: this.origin.z + this.D / 2 - m,
      minY: fy + 0.5, maxY: fy + this.H - 0.3,   // floor → just under the ceiling
    };
  }

  solidAt(x, z, pad = 0) {
    const lx = x - this.origin.x, lz = z - this.origin.z;
    const halfW = this.W / 2 - 0.25, halfD = this.D / 2 - 0.25;
    const p = pad + 0.3;
    // Outside the room box is solid, EXCEPT the door gap on the front (+z) wall.
    if (lz > halfD - p) {
      // door gap is |lx| < 0.8 on the front wall
      if (Math.abs(lx) > 0.8) return true;
    }
    if (lz < -(halfD - p)) return true;
    if (Math.abs(lx) > halfW - p) return true;
    return false;
  }

  update() {
    // Gentle lamp flicker so the room feels alive.
    if (this.lamp) {
      try {
        const f = 0.92 + Math.sin(performance.now() * 0.006) * 0.06;
        this.lamp.intensity = this._lampBase * f;
      } catch (_) { /* ignore */ }
    }
  }

  // Tear down and rebuild all geometry from the current state — called on enter
  // and whenever colours / light / showcased items change.
  rebuild() {
    // Clear previous children.
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this._wallMeshes = [];
    const c = this.state.colors || defaultColors();
    const W = this.W, D = this.D, H = this.H;
    const ox = this.origin.x, oy = this.origin.y, oz = this.origin.z;

    const floorMat = lambert(c.inFloor);
    const wallMat = lambert(c.inWall);
    const T = 0.3;   // wall thickness

    // Floor.
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), floorMat);
    floor.position.set(ox, oy - 0.1, oz);
    this.group.add(floor);
    // Ceiling.
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), lambert(0x3a3026));
    ceil.position.set(ox, oy + H, oz);
    this.group.add(ceil);

    // Four walls. The front (+z) wall has a door GAP so the exit reads as a door,
    // and a WINDOW strip up high (visitors inside can "look out"; the spec).
    const mkWall = (cx, cz, sx, sz, len) => {
      const geo = new THREE.BoxGeometry(sx || T, H, sz || T);
      const m = new THREE.Mesh(geo, wallMat);
      m.position.set(ox + cx, oy + H / 2, oz + cz);
      this.group.add(m);
    };
    mkWall(0, -D / 2, W, T);                 // back (north)
    mkWall(-W / 2, 0, T, D);                 // left (west)
    mkWall(W / 2, 0, T, D);                  // right (east)
    // Front wall split around the door gap (door ~1.4 wide, centred).
    const doorHalf = 0.8;
    const segW = (W - doorHalf * 2) / 2;
    mkWall(-(doorHalf + segW / 2), D / 2, segW, T);
    mkWall(doorHalf + segW / 2, D / 2, segW, T);
    // A lintel over the door so the gap reads as a doorway, not a hole.
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorHalf * 2 + 0.4, 0.5, T), wallMat);
    lintel.position.set(ox, oy + H - 0.25, oz + D / 2);
    this.group.add(lintel);

    // Window strip high on the back wall: glowing panes the player can see "out"
    // through. From outside the house is opaque (no interior render on the
    // surface), satisfying "desde fuera no se ve dentro hasta que entras".
    for (let i = -1; i <= 1; i++) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.7, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x9fd4ff, emissive: 0x294a66, emissiveIntensity: 0.6 }));
      win.position.set(ox + i * 2.0, oy + H - 0.7, oz - D / 2 + 0.04);
      this.group.add(win);
    }

    // A welcome rug so the room isn't bare.
    const rug = new THREE.Mesh(new THREE.BoxGeometry(W * 0.5, 0.04, D * 0.4), lambert(0x7a3b3b));
    rug.position.set(ox, oy + 0.03, oz);
    this.group.add(rug);

    // Hang the showcase plaques on each wall.
    this._hangWalls(ox, oy, oz, W, D, H);

    // Basement: a stair down to a second room with its own showcase walls.
    if (this.lot.basement) this._buildBasement(ox, oy, oz, W, D);

    // Light. The surface sun + hemisphere are switched OFF while indoors, so the
    // room must light ITSELF fully or it reads pitch black. We use a bright fill
    // ambient + a hemisphere (sky/ground) so every wall is clearly lit, plus the
    // warm/cold ceiling lamp on top for character.
    const warm = (this.state.light || 'warm') !== 'cold';
    const lampCol = warm ? 0xffd9a0 : 0xa9d4ff;
    // Balanced so the room is clearly lit (the surface sun/hemi are off indoors)
    // WITHOUT washing out to white. A soft ambient + hemisphere for base fill, a
    // modest ceiling lamp for warmth, and a gentle doorway fill for the corners.
    this._lampBase = 0.6;
    this.lamp = new THREE.PointLight(lampCol, this._lampBase, 24, 1.6);
    this.lamp.position.set(ox, oy + H - 0.6, oz);
    this.group.add(this.lamp);
    const amb = new THREE.AmbientLight(warm ? 0xffe7cc : 0xd6e4ff, 0.5);
    this.group.add(amb);
    const hemi = new THREE.HemisphereLight(warm ? 0xffe2b8 : 0xcfe0ff, 0x2a2018, 0.45);
    hemi.position.set(ox, oy + H, oz);
    this.group.add(hemi);
    const fill = new THREE.PointLight(lampCol, 0.35, 22, 1.8);
    fill.position.set(ox, oy + 1.4, oz + D / 2 - 0.6);
    this.group.add(fill);
    // A visible lamp fixture hanging from the ceiling.
    const fixture = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshStandardMaterial({ color: lampCol, emissive: lampCol, emissiveIntensity: 0.9 }));
    fixture.position.set(ox, oy + H - 0.4, oz);
    this.group.add(fixture);
  }

  // Lay each showcase wall's slots out as a 3-row grid of framed plaques on the
  // four interior walls (and the gallery wall, if any), at eye height.
  _hangWalls(ox, oy, oz, W, D, H) {
    const walls = showcaseWalls(this.lot).filter((w) => w.floor === 'ground');
    // Map wall ids to a flat placement on each interior face.
    const faces = [
      { nx: 0, nz: 1, cx: 0, cz: -D / 2 + 0.18, span: W },   // back wall, faces +z
      { nx: 1, nz: 0, cx: -W / 2 + 0.18, cz: 0, span: D },   // west wall, faces +x
      { nx: -1, nz: 0, cx: W / 2 - 0.18, cz: 0, span: D },   // east wall, faces -x
      { nx: 0, nz: -1, cx: 0, cz: D / 2 - 0.18, span: W },   // front (over door), faces -z
      { nx: 0, nz: 1, cx: 0, cz: -D / 2 + 0.5, span: W },    // gallery (slightly in)
    ];
    for (let wi = 0; wi < walls.length; wi++) {
      const wall = walls[wi];
      const face = faces[wi % faces.length];
      this._hangOneWall(wall, face, ox, oy, oz, H, 0);
    }
  }

  // Lay a single wall's slots: `rows` rows × `cols` cols, centred on the face.
  _hangOneWall(wall, face, ox, oy, oz, H, yBase) {
    const arr = (this.state.walls && this.state.walls[wall.id]) || [];
    const cell = 0.82;
    const cols = wall.cols, rows = wall.rows;
    const totalW = Math.min(face.span - 0.6, cols * cell);
    const stepX = cols > 1 ? totalW / cols : 0;
    const startX = -totalW / 2 + stepX / 2;
    const yTop = yBase + H - 0.8;
    // Along-face axis is perpendicular to the face normal.
    const ax = face.nz, az = -face.nx; // 90° rotation of the normal
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const idx = r * cols + col;
        if (idx >= wall.cap) break;
        const slot = arr[idx] || null;
        const plaque = buildPlaque(slot, cell * 0.92);
        const offX = startX + col * stepX;
        const y = yTop - r * cell;
        const px = ox + face.cx + ax * offX + face.nx * 0.04;
        const pz = oz + face.cz + az * offX + face.nz * 0.04;
        plaque.position.set(px, oy + y, pz);
        plaque.rotation.y = Math.atan2(face.nx, face.nz);
        plaque.userData = { wallId: wall.id, index: idx };
        this.group.add(plaque);
        this._wallMeshes.push(plaque);
      }
    }
  }

  // A basement room below the ground floor, with a stair down and two more walls.
  _buildBasement(ox, oy, oz, W, D) {
    const by = oy + this.basementY;
    const bMat = lambert(0x6b5a44);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), bMat);
    floor.position.set(ox, by - 0.1, oz);
    this.group.add(floor);
    // Stair: a run of steps from the ground floor down to the basement corner.
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), lambert(0x8a7355));
      const t = i / steps;
      s.position.set(
        ox + (this.stair.x) - i * 0.0,
        oy - t * (-this.basementY),
        oz + this.stair.z + i * 0.5);
      this.group.add(s);
    }
    // Two basement showcase walls.
    const walls = showcaseWalls(this.lot).filter((w) => w.floor === 'basement');
    const faces = [
      { nx: 0, nz: 1, cx: 0, cz: -D / 2 + 0.18, span: W },
      { nx: 1, nz: 0, cx: -W / 2 + 0.18, cz: 0, span: D },
    ];
    for (let i = 0; i < walls.length; i++) {
      this._hangOneWall(walls[i], faces[i % faces.length], ox, by, oz, this.H, 0);
    }
    // Basement glow so it isn't pitch black.
    const lamp = new THREE.PointLight(0xffcaa0, 0.8, 16, 1.6);
    lamp.position.set(ox, by + this.H - 0.7, oz);
    this.group.add(lamp);
  }

  // Pick the showcase slot the player is looking/standing nearest to, for the
  // interact key (returns { wallId, index } or null). `px,pz` are world coords.
  nearestSlot(px, pz, maxDist = 2.2) {
    let best = null, bestD2 = maxDist * maxDist;
    for (const m of this._wallMeshes) {
      const dx = m.position.x - px, dz = m.position.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) { bestD2 = d2; best = m.userData; }
    }
    return best;
  }

  // The wall slot the player is AIMING at: a Raycaster from the crosshair hits a
  // slot mesh. So you place the item exactly where the cross points, not at a
  // slot picked by proximity. Falls back to the nearest slot if the ray misses.
  slotAtAim(raycaster, px, pz) {
    if (this._wallMeshes && this._wallMeshes.length) {
      // Recurse: a plaque is a Group, so the ray hits a child mesh — walk up to
      // the plaque that carries the slot userData.
      const hits = raycaster.intersectObjects(this._wallMeshes, true);
      for (const h of hits) {
        let o = h.object;
        while (o && !(o.userData && o.userData.wallId != null)) o = o.parent;
        if (o && o.userData && o.userData.wallId != null) return o.userData;
      }
    }
    return this.nearestSlot(px, pz, 4.0);
  }

  dispose() {
    if (this.group.parent) this.group.parent.remove(this.group);
    while (this.group.children.length) this.group.remove(this.group.children[0]);
  }
}

// ---------------------------------------------------------------------------
// Exterior dressing on the SURFACE: a "for sale" sign over a purchasable lot,
// and a recolour "skin" over the owned house (a thin coloured overlay on the
// shell's walls / roof / door, since the shared city mesh isn't individually
// addressable). Both are cheap groups added to the scene and toggled.
// ---------------------------------------------------------------------------

// A floating "FOR SALE" sign + price tag hovering over a lot's door.
export function buildForSaleSign(lot, label) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), lambert(0x6a4a2b));
  post.position.y = 0.8;
  g.add(post);
  // The board just announces "For sale" (localized); the price + buy is shown
  // when you walk to the door and interact. Orange to read as a sale tag.
  const board = makeSignBoard('🏠 ' + (label || ''), 0xffcaa0, 0x6a4a2b);
  board.position.y = 1.7;
  g.add(board);
  // Plant the sign on the FRONT LAWN, off to one side of the doorway — like a real
  // "for sale" sign in the yard, not blocking the door. Front normal points out
  // from the door; the side axis runs along the house front. We push it forward
  // (onto the grass, clear of the doorstep) and over to the left of the door.
  const rot = lot.rot || 0;
  const fx = Math.sin(rot), fz = Math.cos(rot);   // outward (door-facing) normal
  const sx = Math.cos(rot), sz = -Math.sin(rot);  // along the house front (side)
  const fwd = 2.4;   // out from the door, onto the lawn
  const side = -2.0; // to the LEFT of the door (negative side axis)
  g.position.set(
    lot.doorX + fx * fwd + sx * side,
    lot.y + 0.05,
    lot.doorZ + fz * fwd + sz * side);
  // Face the sign back toward the approaching street (same way as the door).
  g.rotation.y = rot;
  return g;
}

// A small canvas-textured signboard.
function makeSignBoard(text, bg, frame) {
  const g = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 0.08), lambert(frame));
  g.add(back);
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 104;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#' + (bg >>> 0).toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, 256, 104);
  ctx.fillStyle = '#2b2620';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 56);
  const tex = new THREE.CanvasTexture(canvas);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.62),
    new THREE.MeshBasicMaterial({ map: tex }));
  face.position.z = 0.05;
  g.add(face);
  return g;
}

// A recolour overlay over the owned house shell: a thin coloured box hugging the
// walls, a roof cap and a door plate, in the owner's chosen exterior colours.
export function buildExteriorSkin(lot, colors) {
  const g = new THREE.Group();
  // Recolour the OWNED house in the player's palette. The skin must match the
  // real house shell (built by cities.buildHouse) EXACTLY in size, height and
  // roof, just a hair larger and fully OPAQUE so it cleanly covers the original
  // instead of a mismatched translucent box poking half-through it. buildHouse's
  // total body height is wallH*floors (wallH is the per-floor height on the lot).
  const floors = Math.max(1, Math.min(3, lot.floors || 1));
  const baseWallH = lot.wallH || 3.2;
  const wallH = baseWallH * floors;
  const w = (lot.w || 5) + 0.08, d = (lot.d || 5) + 0.08;
  const rot = lot.rot || 0;
  const skin = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), lambert(colors.wall));
  skin.position.set(lot.x, lot.y + wallH / 2, lot.z);
  skin.rotation.y = rot;
  g.add(skin);
  // Roof: a pitched cone matching buildHouse's roof (cone radius max(w,d)*0.8,
  // sitting on top of the body), so it lines up instead of floating/halved.
  const roofH = (lot.mansion ? 2.8 : 2.2);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.82, roofH, 4), lambert(colors.roof));
  roof.position.set(lot.x, lot.y + wallH + roofH / 2, lot.z);
  roof.rotation.y = rot + Math.PI / 4;
  g.add(roof);
  // Door plate on the front face.
  const fx = Math.sin(rot), fz = Math.cos(rot);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.75, 0.12), lambert(colors.door));
  door.position.set(lot.doorX + fx * 0.04, lot.y + 0.88, lot.doorZ + fz * 0.04);
  door.rotation.y = rot;
  g.add(door);
  return g;
}

// Two framed item plaques on the FRONT wall, to one side of the door — the spec:
// one window slot becomes two display spaces showing the owner's best pieces so
// passers-by see them without entering. Display-only (no buying). `facade` is the
// HouseStore.facade array (up to FACADE_SLOTS items or null). Returns a Group, or
// an empty Group when nothing is on show.
export function buildFacadeDisplay(lot, facade) {
  const g = new THREE.Group();
  if (!Array.isArray(facade)) return g;
  const rot = lot.rot || 0;
  const fx = Math.sin(rot), fz = Math.cos(rot);     // outward (door-facing) normal
  const sx = Math.cos(rot), sz = -Math.sin(rot);    // along the house front (side)
  // A window-sized framed board carrying both plaques, mounted RIGHT of the door
  // (the +side of the front wall), at window height. Two slots side by side.
  const baseSide = 2.0;     // offset from the door along the front wall
  const gap = 0.62;         // spacing between the two plaques
  const wy = lot.y + 1.5;   // window height
  const out = 0.07;         // stand a hair proud of the wall so it never z-fights
  // A backing board behind both plaques, like a shop window.
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.95, 0.06), lambert(0x4a3826));
  board.position.set(
    lot.doorX + fx * out + sx * baseSide,
    wy,
    lot.doorZ + fz * out + sz * baseSide);
  board.rotation.y = rot;
  g.add(board);
  for (let i = 0; i < FACADE_SLOTS; i++) {
    const item = facade[i];
    if (!item) continue;
    const plaque = buildPlaque({ item }, 0.55);
    const off = (i - (FACADE_SLOTS - 1) / 2) * gap;   // centre the row of plaques
    plaque.position.set(
      lot.doorX + fx * (out + 0.05) + sx * (baseSide + off),
      wy,
      lot.doorZ + fz * (out + 0.05) + sz * (baseSide + off));
    plaque.rotation.y = rot;
    g.add(plaque);
  }
  return g;
}

// A tiny fixed palette of solid colours offered in the recolour UI (the spec:
// only solid colours). Grouped so the UI can show swatches.
export const HOUSE_PALETTE = [
  0xcdb892, 0xb9a17e, 0x8d96a1, 0xe0c690, 0xcfd6cf, 0xdfe9f0, 0xe7c98c,
  0x6f8f3a, 0x49566a, 0xc98b3e, 0x2f7d77, 0x7fb0cc, 0x39a39a, 0x8a3b3b,
  0x6a4a2b, 0x4a3826, 0x2b2620, 0xe7ddc8, 0x9a7b56, 0xf2efe6, 0x222831,
  0x9b59b6, 0x2980b9, 0x27ae60, 0xe67e22, 0xc0392b, 0xf1c40f, 0xecf0f1,
];
