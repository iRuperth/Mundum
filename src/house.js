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
import { buildItemMesh, fitItemToSlot } from './itemDisplay.js';
import { houseFrontGeometry } from './cities.js';

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

// How many items the owner may show on the FRONT wall, outside the house. Two
// shelves of TWO — one under each ground-floor window — so passers-by see four of
// the owner's best pieces (display-only) without entering. Slots 0-1 = left window
// shelf, 2-3 = right window shelf. Same four are mirrored inside on the door wall.
export const FACADE_SLOTS = 4;
export const FACADE_PER_SHELF = 2;
// Plaque board size for the facade pieces — both the exterior shelves and the
// indoor door-wall niches use this, so all the display plaques read the same size
// as the showcase-wall ones inside.
export const FACADE_PLAQUE_SIZE = 0.9;

// House SIZE TIER → items shown PER WALL (the player's spec). A house has 3 usable
// walls — back, west and east — the fourth holds the door, so it's left clear.
//   basic 1-floor cottage  →  3 per wall  (9 total)
//   2-floor / medium house  →  4 per wall (12 total)
//   large / mansion         →  6 per wall (18 total)
// Each wall shows ONE big row of items spanning ~80% of the wall, so the pieces
// read large and proud instead of a cramped grid of tiny plaques.
export function houseSizeTier(lot) {
  if (lot.mansion || houseFootprint(lot) > 90) return 'large';
  if ((lot.floors || 1) >= 2 || houseFootprint(lot) > 45) return 'two';
  return 'basic';
}

// Items shown PER WALL for a size tier.
export function perWallSlots(lot) {
  const tier = houseSizeTier(lot);
  if (tier === 'large') return 6;
  if (tier === 'two') return 4;
  return 3;
}

// The showcase WALLS: each { id, cols, rows, cap, floor }. Three walls (back,
// west, east), each a single row of `perWall` big slots. The door wall stays bare.
export function showcaseWalls(lot) {
  const perWall = perWallSlots(lot);
  const walls = [];
  const add = (id) => walls.push({ id, label: id, cols: perWall, rows: 1, cap: perWall, floor: 'ground' });
  add(0);   // back wall
  add(1);   // west wall
  add(2);   // east wall
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
    // A name sign over the door ("Nana's House"), with an editable background
    // colour. Owner-only to edit (from Manage house); visitors just read it.
    this.name = '';
    this.nameColor = 0xffcaa0;   // warm parchment by default
    // Logged-off-asleep flag (Tibia bed). Lives HERE so it rides the existing
    // `house` jsonb column to the cloud (no schema change) — on re-login the
    // character resumes asleep in the middle of this house. false when awake.
    this.sleeping = false;
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
    this.name = '';
    this.nameColor = 0xffcaa0;
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

  // House name sign (owner-only edit). Name is trimmed + length-capped so it fits
  // the sign; the colour is the sign's background.
  setName(text) { this.name = String(text || '').slice(0, 22); }
  setNameColor(hex) { this.nameColor = (hex >>> 0); }

  serialize() {
    return {
      owned: this.owned,
      walls: this.walls,
      colors: this.colors,
      light: this.light,
      bans: this.bans,
      closed: this.closed,
      facade: this.facade,
      name: this.name,
      nameColor: this.nameColor,
      sleeping: this.sleeping,
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
    this.name = typeof data.name === 'string' ? data.name.slice(0, 22) : '';
    this.nameColor = (data.nameColor != null ? data.nameColor : 0xffcaa0) >>> 0;
    this.sleeping = !!data.sleeping;
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
      name: this.name,
      nameColor: this.nameColor,
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
  // A wall mount: a backing board + a small shelf, and the item posed on it as a
  // real 3D model (sword, armor, potion, gem…) jutting out of the wall — not a
  // flat icon. Empty slots show just the board.
  const board = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.04), lambert(0x2b2620));
  g.add(board);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(size + 0.06, size + 0.06, 0.03), lambert(0x6a4a2a));
  frame.position.z = -0.01;
  g.add(frame);
  if (slot && slot.item) {
    let mesh = null;
    try { mesh = buildItemMesh(slot.item); } catch (_) { mesh = null; }
    if (mesh) {
      const fitted = fitItemToSlot(mesh, size * 0.42);
      fitted.position.z = size * 0.42 + 0.05;   // stand proud of the board
      g.add(fitted);
      g.userData.spin = fitted;                 // gently rotate the showpiece
    } else {
      // Fallback to the old 2D icon plaque if a 3D mesh can't be built.
      const tex = iconTexture(slot.item);
      if (tex) {
        const face = new THREE.Mesh(
          new THREE.PlaneGeometry(size * 0.78, size * 0.78),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
        face.position.z = 0.04;
        g.add(face);
      }
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
    this._facadeMeshes = []; // door-wall facade niches, indexed for picking

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

  // The middle of the room — where a player who logged off ASLEEP wakes up on
  // re-login (Tibia-style: you reappear standing in the centre of your house).
  centerPoint() {
    return { x: this.worldX(0), z: this.worldZ(0), yaw: Math.PI };
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

  // Build the bed in the back-left corner and remember its local spot, where the
  // sleeping player model lies (centre of the mattress, facing along the bed).
  _buildBed(ox, oy, oz, W, D) {
    const wood = lambert(0x6a4a2a);
    const sheet = lambert(0x8a3b4b);
    const pillow = lambert(0xeae0d0);
    const bx = -W / 2 + 0.85;          // back-left corner, local
    const bz = -D / 2 + 0.7;
    const bed = new THREE.Group();
    bed.position.set(ox + bx, oy, oz + bz);
    // frame + legs
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 2.0), wood);
    frame.position.y = 0.22; bed.add(frame);
    // mattress + sheet
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.16, 1.9), lambert(0xd8d2c4));
    mattress.position.y = 0.4; bed.add(mattress);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.1, 1.2), sheet);
    blanket.position.set(0, 0.46, 0.3); bed.add(blanket);
    // pillow at the head (−z end)
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.35), pillow);
    pil.position.set(0, 0.5, -0.75); bed.add(pil);
    // headboard
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.12), wood);
    head.position.set(0, 0.5, -0.98); bed.add(head);
    this.group.add(bed);
    // Local + world bed spot. The mattress top is ~0.48 above floor; the sleeper
    // lies along +z (feet) with head toward −z.
    this._bedLocal = { x: bx, z: bz, y: 0.48 };
  }

  // World-space sleep trigger (step beside the bed + interact → sleep).
  bedTrigger() {
    if (!this._bedLocal) return null;
    return { x: this.worldX(this._bedLocal.x), z: this.worldZ(this._bedLocal.z), r: 1.6 };
  }

  // Where the sleeping player model lies (world coords + the lie-down yaw).
  bedSleepSpot() {
    if (!this._bedLocal) return null;
    return {
      x: this.worldX(this._bedLocal.x),
      y: this.floorY() + this._bedLocal.y,
      z: this.worldZ(this._bedLocal.z),
      yaw: 0,
    };
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
    // Slowly rotate each showcased 3D item so it reads as a displayed showpiece.
    if (this._wallMeshes) {
      let t = 0;
      try { t = performance.now() * 0.0006; } catch (_) { t = 0; }
      for (const p of this._wallMeshes) {
        const sp = p.userData && p.userData.spin;
        if (sp) sp.rotation.y = t;
      }
      for (const p of (this._facadeMeshes || [])) {
        const sp = p.userData && p.userData.spin;
        if (sp) sp.rotation.y = t;
      }
    }
  }

  // Tear down and rebuild all geometry from the current state — called on enter
  // and whenever colours / light / showcased items change.
  rebuild() {
    // Clear previous children.
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this._wallMeshes = [];
    this._facadeMeshes = [];   // door-wall facade niches (editable from inside)
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

    // A BED in the back-left corner — click it to sleep. (The only furniture; the
    // spec is "a bed in one corner, nothing else".) Store its world spot so the
    // sleep trigger + the sleeping-pose placement can find it.
    this._buildBed(ox, oy, oz, W, D);

    // Hang the showcase plaques on each wall.
    this._hangWalls(ox, oy, oz, W, D, H);

    // Mirror the FACADE pieces (the ones shown outside under the windows) on the
    // INSIDE of the door wall — two per side of the door — so the owner sees their
    // shopfront from indoors too. Display-only: not editable, not pickable.
    this._hangFacadeReflection(ox, oy, oz, W, D, H, doorHalf);

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

  // Lay each showcase wall's slots out as ONE big row of framed plaques, spanning
  // ~80% of the wall, on the three usable interior walls (back, west, east). The
  // front wall holds the door, so it's deliberately left bare.
  _hangWalls(ox, oy, oz, W, D, H) {
    const walls = showcaseWalls(this.lot).filter((w) => w.floor === 'ground');
    // Wall ids 0/1/2 → back / west / east faces. (No front/door wall.)
    const faces = [
      { nx: 0, nz: 1, cx: 0, cz: -D / 2 + 0.18, span: W },   // back wall, faces +z
      { nx: 1, nz: 0, cx: -W / 2 + 0.18, cz: 0, span: D },   // west wall, faces +x
      { nx: -1, nz: 0, cx: W / 2 - 0.18, cz: 0, span: D },   // east wall, faces -x
    ];
    for (let wi = 0; wi < walls.length; wi++) {
      const wall = walls[wi];
      const face = faces[wi % faces.length];
      this._hangOneWall(wall, face, ox, oy, oz, H, 0);
    }
  }

  // The interior side of the FACADE: four display niches on the door wall — TWO to
  // the LEFT of the doorway (facade slots 0,1) and TWO to the RIGHT (2,3) —
  // mirroring the two exterior shelves under the windows, same plaque size as the
  // showcase walls. The owner edits these from INSIDE (aim + interact): an empty
  // niche shows a frame to fill, a filled one can be swapped/taken, and any change
  // updates what passers-by see OUTSIDE. A visitor (read-only) just sees them.
  _hangFacadeReflection(ox, oy, oz, W, D, H, doorHalf) {
    const facade = (this.state && Array.isArray(this.state.facade)) ? this.state.facade : [];
    const size = FACADE_PLAQUE_SIZE;
    // The front wall (thickness 0.3) is centred at oz + D/2, so its interior face
    // is at oz + D/2 - 0.15. Stand the plaque a hair proud of that, INTO the room.
    const zFace = oz + D / 2 - 0.15 - 0.05;
    const yMid = oy + H * 0.52;             // eye height, same band as the side walls
    // Two niches per side, evenly distributed across the wall segment from the
    // doorframe to the corner — so they fit and stay centred even on a big house.
    const inner = doorHalf + size * 0.6 + 0.2;   // first niche clears the doorframe
    const outer = W / 2 - size * 0.6 - 0.2;       // last niche clears the corner
    const lo = Math.min(inner, outer), hi = Math.max(inner, outer);
    const xs = [lo + (hi - lo) * 0.33, lo + (hi - lo) * 0.67];   // 2 columns per side
    // Left side: facade slots 0,1 (x negative). Right side: 2,3 (x positive).
    const layout = [];
    xs.forEach((xv, i) => { layout.push({ x: -xv, slot: i }); });            // left
    xs.forEach((xv, i) => { layout.push({ x: xv, slot: FACADE_PER_SHELF + i }); }); // right
    for (const { x, slot } of layout) {
      const item = facade[slot] || null;
      // Always draw the niche (empty → just the frame, a "vitrine" to fill).
      const plaque = buildPlaque(item ? { item } : null, size);
      plaque.position.set(ox + x, yMid, zFace);
      plaque.rotation.y = Math.PI;          // face into the room (-z)
      // Tag as an editable FACADE slot so the interior picker (slotAtAim) can edit
      // what shows outside. Also tag the item for the hover tooltip when filled.
      plaque.userData.facadeSlot = slot;
      if (item) { plaque.userData.facadeItem = item; }
      plaque.traverse((o) => { o.userData.facadeSlot = slot; if (item) o.userData.facadeItem = item; });
      this.group.add(plaque);
      this._facadeMeshes.push(plaque);
    }
  }

  // Lay a single wall's slots as ONE centred ROW that spans ~80% of the wall.
  // The plaques are sized to fill that span (big, proud showpieces), centred at
  // eye height.
  _hangOneWall(wall, face, ox, oy, oz, H, yBase) {
    const arr = (this.state.walls && this.state.walls[wall.id]) || [];
    const n = wall.cap;
    if (n <= 0) return;
    // 80% of the wall span, divided into one cell per item. The plaque board is a
    // hair smaller than its cell so neighbours don't touch.
    const span = face.span * 0.8;
    const stepX = span / n;
    const startX = -span / 2 + stepX / 2;
    const size = Math.min(stepX * 0.9, H * 0.55);   // cap height so it fits the wall
    const yMid = yBase + H * 0.52;                  // centred a touch above middle
    // Along-face axis is perpendicular to the face normal.
    const ax = face.nz, az = -face.nx; // 90° rotation of the normal
    for (let col = 0; col < n; col++) {
      const idx = col;
      const slot = arr[idx] || null;
      const plaque = buildPlaque(slot, size);
      const offX = startX + col * stepX;
      const px = ox + face.cx + ax * offX + face.nx * 0.04;
      const pz = oz + face.cz + az * offX + face.nz * 0.04;
      plaque.position.set(px, oy + yMid, pz);
      plaque.rotation.y = Math.atan2(face.nx, face.nz);
      const spin = plaque.userData.spin || null;  // preserve the showpiece ref
      plaque.userData = { wallId: wall.id, index: idx, spin };
      this.group.add(plaque);
      this._wallMeshes.push(plaque);
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
  // interact key (returns { wallId, index } for a wall plaque, { facadeSlot } for a
  // door-wall facade niche, or null). `px,pz` are world coords.
  nearestSlot(px, pz, maxDist = 2.2) {
    let best = null, bestD2 = maxDist * maxDist;
    for (const m of [...this._wallMeshes, ...(this._facadeMeshes || [])]) {
      const dx = m.position.x - px, dz = m.position.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) { bestD2 = d2; best = m.userData; }
    }
    return best;
  }

  // The slot the player is AIMING at: a Raycaster from the crosshair hits a plaque
  // mesh. So you place the item exactly where the cross points, not at a slot
  // picked by proximity. Checks both the showcase WALL plaques and the door-wall
  // FACADE niches. Falls back to the nearest slot if the ray misses.
  slotAtAim(raycaster, px, pz) {
    const all = [...(this._wallMeshes || []), ...(this._facadeMeshes || [])];
    if (all.length) {
      // Recurse: a plaque is a Group, so the ray hits a child mesh — walk up to
      // the plaque carrying the slot userData (wallId for a wall, facadeSlot for
      // a door-wall niche).
      const hits = raycaster.intersectObjects(all, true);
      for (const h of hits) {
        let o = h.object;
        while (o && !(o.userData && (o.userData.wallId != null || o.userData.facadeSlot != null))) o = o.parent;
        if (o && o.userData && (o.userData.wallId != null || o.userData.facadeSlot != null)) return o.userData;
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

// The owner's house NAME sign ("Nana's House"), centred high on the front wall
// over the door, in the owner's chosen background colour. Empty name → no sign.
// Reuses makeSignBoard for the canvas-textured board; the frame stays a fixed
// dark wood so only the parchment colour changes. Returns a Group (empty if no
// name), positioned + rotated to sit flush over the doorway.
export function buildNameSign(lot, name, colorHex) {
  const g = new THREE.Group();
  if (!name) return g;
  const rot = lot.rot || 0;
  const fx = Math.sin(rot), fz = Math.cos(rot);    // outward front normal
  const geom = houseFrontGeometry(lot);
  const sign = makeSignBoard(name, (colorHex != null ? colorHex : 0xffcaa0) >>> 0, 0x6a4a2b);
  // High on the wall, just under the eave: a hair below the wall top, centred on
  // the door's X/Z, standing slightly proud so it never z-fights the wall.
  const out = 0.12;
  sign.position.set(
    lot.doorX + fx * out,
    lot.y + geom.wallH - 0.55,
    lot.doorZ + fz * out);
  sign.rotation.y = rot;
  g.add(sign);
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

// Two display SHELVES on the FRONT wall — one under each ground-floor window —
// each carrying TWO of the owner's best pieces (FACADE_PER_SHELF), so passers-by
// see four showpieces without entering. The plaques are the same size as the
// indoor showcase plaques (FACADE_PLAQUE_SIZE) and the gap adapts to the house's
// window spacing so two always fit cleanly under each window, even on big homes.
// Display-only (no buying, no taking): each plaque is tagged with userData.facadeItem
// so the world raycast can show its name + stats on hover. `facade` is the
// HouseStore.facade array (FACADE_SLOTS items or null). Slots 0-1 hang under the
// left window, 2-3 under the right. Returns a Group (empty if none).
export function buildFacadeDisplay(lot, facade) {
  const g = new THREE.Group();
  if (!Array.isArray(facade)) return g;
  const rot = lot.rot || 0;
  const out = 0.07;          // stand a hair proud of the wall so it never z-fights
  const geom = houseFrontGeometry(lot);
  const { fx, fz, sx, sz } = geom;
  const plaqueSize = FACADE_PLAQUE_SIZE;
  // The shelf hangs just UNDER each window. The window pane is 0.8 tall centred at
  // winY, so its SILL is at winY - 0.4. Drop the shelf board right under the sill,
  // and centre the plaques in the band below it.
  const sillY = lot.y + geom.winY - 0.4;             // bottom edge of the window
  const boardY = sillY - 0.18;                       // shelf board just under the sill
  const shelfY = boardY - 0.06 - plaqueSize * 0.5;   // plaques rest ON the board
  // Two plaques per shelf, side by side with a small gap. The half-width of the
  // pair (used to size the shelf board + back-plate).
  const gap = plaqueSize + 0.18;                     // centre-to-centre spacing
  const halfSpan = gap / 2 + plaqueSize / 2;

  geom.windows.forEach((win, wi) => {
    // A wooden shelf board under this window, flush to the wall.
    const board = new THREE.Mesh(new THREE.BoxGeometry(halfSpan * 2 + 0.3, 0.1, 0.4), lambert(0x6a4a2a));
    board.position.set(win.x + fx * (out + 0.14), boardY, win.z + fz * (out + 0.14));
    board.rotation.y = rot;
    g.add(board);
    // A thin back-plate so the items read against the wall like a cabinet.
    const back = new THREE.Mesh(new THREE.BoxGeometry(halfSpan * 2 + 0.3, plaqueSize + 0.2, 0.04), lambert(0x4a3826));
    back.position.set(win.x + fx * out, shelfY, win.z + fz * out);
    back.rotation.y = rot;
    g.add(back);

    for (let j = 0; j < FACADE_PER_SHELF; j++) {
      const slot = wi * FACADE_PER_SHELF + j;
      const item = facade[slot];
      if (!item) continue;
      const plaque = buildPlaque({ item }, plaqueSize);
      const off = (j - (FACADE_PER_SHELF - 1) / 2) * gap;   // centre the two
      plaque.position.set(
        win.x + fx * (out + 0.06) + sx * off,
        shelfY,
        win.z + fz * (out + 0.06) + sz * off);
      plaque.rotation.y = rot;
      // Tag so the world raycast can show "name + stats" on hover (display-only).
      plaque.userData.facadeItem = item;
      plaque.traverse((o) => { o.userData.facadeItem = item; });
      g.add(plaque);
    }
  });
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
