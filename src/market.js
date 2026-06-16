// Free Market — open-air stalls you walk up to (no teleport interior).
//
// MapleStory-style free market: a city's market area holds a fixed ring of
// stalls. A player walks to a free stall, "touches" it (interact), and it
// becomes theirs while they sell — they place backpack items on it with a price
// each. Other players who walk up can buy; the seller is paid automatically
// (in their backpack) and gets a "X bought your item" message, even if they
// were offline when the sale happened.
//
// The DATABASE is the single source of truth for stall contents (see the
// market_* methods in auth.js, backed by ADD_market.sql). This module is
// presentation + geometry only: where the stalls stand, how to detect the one
// a player is at, and how to build a counter with item plaques. State here is
// intentionally thin — a stall's contents are always re-read from the DB.

import * as THREE from 'three';
import { iconFor } from './itemIcons.js';

// ---------------------------------------------------------------------------
// Geometry / placement constants. Everything (build + detection) derives from
// these, so the 3D stalls and interactableAt always agree.
// ---------------------------------------------------------------------------
export const STALL_COUNT = 12;        // fixed stalls per city market area
export const STALL_CAP = 3;           // a stall sells up to 3 items, shown in a row
export const STALL_RADIUS = 2.4;      // interact distance to "touch" a stall

const STALL_RING_R = 9;               // stalls ring the market-district centre
const COUNTER_W = 2.4, COUNTER_H = 0.9, COUNTER_D = 1.0;

const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });

// Lay STALL_COUNT counters in a ring around a market-district centre (mx,mz).
// Returns [{ stallId, x, z, rot }] with rot facing the stall inward toward the
// centre. Deterministic so cities.js (build) and interactableAt (detect) agree.
export function stallLayout(mx, mz) {
  const out = [];
  for (let i = 0; i < STALL_COUNT; i++) {
    const a = (i / STALL_COUNT) * Math.PI * 2;
    const x = mx + Math.cos(a) * STALL_RING_R;
    const z = mz + Math.sin(a) * STALL_RING_R;
    // Face the stall OUTWARD, away from the market centre, so a shopper walking
    // up from the open plaza sees the counter front, the goods and the sign — not
    // their backs. (Local +Z is the stall's "front"; point it away from centre.)
    const rot = Math.atan2(x - mx, z - mz);
    out.push({ stallId: i, x, z, rot });
  }
  return out;
}

// Build ONE stall counter (counter box + awning + poles + a low back board for
// plaques) for a stallLayout() entry, standing on ground height `y`. Returns a
// THREE.Group and registers a solid so players walk up to the front, not
// through it. `world` may be null (no collision, e.g. in tests).
export function buildStall(stall, y, mats, world) {
  const g = new THREE.Group();
  const wood = (mats && mats.wood) || lambert(0x6a4a2b);
  const awnCol = (mats && mats.awning) || lambert(0xb6452f);

  const counter = new THREE.Mesh(new THREE.BoxGeometry(COUNTER_W, COUNTER_H, COUNTER_D), wood);
  counter.position.set(0, COUNTER_H / 2, 0);
  g.add(counter);

  // A thin back board the item plaques hang on, raised behind the counter.
  const board = new THREE.Mesh(new THREE.BoxGeometry(COUNTER_W, 1.1, 0.08), lambert(0x4a3826));
  board.position.set(0, COUNTER_H + 0.55, -COUNTER_D / 2 + 0.05);
  g.add(board);

  const awn = new THREE.Mesh(new THREE.BoxGeometry(COUNTER_W + 0.4, 0.12, 1.4), awnCol);
  awn.position.set(0, 2.1, -0.3);
  awn.rotation.x = -0.2;
  g.add(awn);
  for (const s of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6), wood);
    pole.position.set(s * (COUNTER_W / 2), 1.05, -0.5);
    g.add(pole);
  }

  g.position.set(stall.x, y, stall.z);
  g.rotation.y = stall.rot;
  if (world && world.addSolid) world.addSolid(stall.x, stall.z, 1.2);
  return g;
}

// Rasterize an item's SVG icon to a CanvasTexture once, cached by a per-item key
// (baseId + rarity) so re-hanging the same item type is cheap. Same approach as
// house.js, kept self-contained here (house.js does not export its builder).
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

// A small framed plaque showing one item's icon (white frame, market look).
export function buildItemPlaque(item, size = 0.5) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.05), lambert(0xf2efe6));
  g.add(frame);
  const back = new THREE.Mesh(new THREE.BoxGeometry(size * 0.84, size * 0.84, 0.04), lambert(0x2b2620));
  back.position.z = 0.02;
  g.add(back);
  if (item) {
    const tex = iconTexture(item);
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

// Build a row of up to STALL_CAP item plaques standing ON a stall counter, so
// passers-by see what's for sale from a distance. `stall` is a layout entry
// ({ x, z, rot }); `items` is the array of item instances (in stall slot order);
// `y` is the ground height. Returns a THREE.Group positioned in world space.
function buildStallGoods(stall, items, y) {
  const g = new THREE.Group();
  const list = (items || []).slice(0, STALL_CAP);
  const gap = 0.66;                 // spacing between plaques along the counter
  const top = COUNTER_H + 0.42;     // local height: just above the counter top
  for (let i = 0; i < list.length; i++) {
    if (!list[i]) continue;
    const plaque = buildItemPlaque(list[i], 0.52);
    // Local X runs along the counter front; centre the row. Local Z forward
    // (+0.45, past the counter front edge) so the icons face the shopper.
    const lx = (i - (list.length - 1) / 2) * gap;
    plaque.position.set(lx, top, 0.45);
    g.add(plaque);
  }
  g.position.set(stall.x, y, stall.z);
  g.rotation.y = stall.rot;
  return g;
}

// A small canvas-textured hanging sign above the stall awning, naming the seller
// (e.g. "Mara's shop"). `label` is the already-localized text; `y` is the ground
// height. Returns a THREE.Group in world space, facing the same way as the stall.
const _signCache = new Map();
function signTexture(label) {
  if (_signCache.has(label)) return _signCache.get(label);
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4ead2';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#6a4a2b'; ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 58);
  ctx.fillStyle = '#3a2a18';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Shrink the font if the name is long so it never clips the board.
  let size = 30;
  while (size > 14 && ctx.measureText(label).width > 232) { size -= 2; ctx.font = `bold ${size}px sans-serif`; }
  ctx.fillText(label, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  _signCache.set(label, tex);
  return tex;
}

function buildStallSign(stall, label, y) {
  const g = new THREE.Group();
  const tex = signTexture(label);
  // The board itself + a thin frame behind it, hung just above the awning.
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5),
    new THREE.MeshBasicMaterial({ map: tex }));
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 0.06), lambert(0x4a3826));
  frame.position.z = -0.04;
  g.add(frame); g.add(board);
  g.position.set(stall.x, y + 2.55, stall.z);   // above the 2.1m awning
  g.rotation.y = stall.rot;
  return g;
}

// ---------------------------------------------------------------------------
// MarketStore — near-stateless. The DB is the truth; this only caches each
// city's stall layout so detecting the stall a player stands at is cheap.
// Kept as a class for symmetry with HouseStore and as a home for any future
// presentation cache (e.g. hung-plaque refresh).
// ---------------------------------------------------------------------------
export class MarketStore {
  constructor() {
    this.layoutByCity = new Map();   // cityId -> stallLayout()
  }

  setLayout(cityId, layout) { this.layoutByCity.set(cityId, layout || []); }
  layout(cityId) { return this.layoutByCity.get(cityId) || []; }

  // The stall the player stands at in `cityId`, or null.
  stallAt(cityId, x, z) {
    for (const s of this.layout(cityId)) {
      if (Math.hypot(s.x - x, s.z - z) < STALL_RADIUS) return s;
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// MarketDisplay — the 3D goods shown on the stall counters. The stall COUNTERS
// themselves are static (built once in cities.js); this owns a separate, mutable
// group of item plaques that is rebuilt for one city at a time as listings load
// or change (on entering a city, and after any place/take/buy). The DB is the
// source of truth — this only renders whatever listings it is handed.
// ---------------------------------------------------------------------------
export class MarketDisplay {
  // `scene` is the THREE.Scene; `store` is the MarketStore holding stall layouts.
  constructor(scene, store) {
    this.scene = scene;
    this.store = store;
    this.group = new THREE.Group();
    this.byCity = new Map();     // cityId -> THREE.Group of that city's goods
    scene.add(this.group);
  }

  // Rebuild the goods for one city from its listing rows. `listings` is the flat
  // array of rows for the city (each { stall_id, slot, item, seller_name });
  // `groundY` is the city's ground height; `labelFor(sellerName)` returns the
  // already-localized sign text (e.g. "Mara's shop"); `freeLabel` is the sign
  // shown over an EMPTY stall ("Free stall") so the market reads as a market even
  // before anyone lists anything. Both passed in so this module stays i18n-free.
  refreshCity(cityId, listings, groundY, labelFor, freeLabel) {
    // Drop the previous group for this city.
    const old = this.byCity.get(cityId);
    if (old) { this.group.remove(old); this.byCity.delete(cityId); }

    const layout = this.store.layout(cityId);
    if (!layout.length) return;
    const y = groundY || 0;
    // Bucket listings by stall, ordered by slot, so each counter shows its row.
    const byStall = new Map();
    for (const r of listings || []) {
      if (!byStall.has(r.stall_id)) byStall.set(r.stall_id, []);
      byStall.get(r.stall_id).push(r);
    }
    const cityGroup = new THREE.Group();
    for (const stall of layout) {
      const rows = byStall.get(stall.stallId);
      if (rows && rows.length) {
        // Occupied: show the items on the counter + the seller's name sign.
        rows.sort((a, b) => (a.slot || 0) - (b.slot || 0));
        cityGroup.add(buildStallGoods(stall, rows.map((r) => r.item), y));
        const seller = rows[0].seller_name || '';
        const label = labelFor ? labelFor(seller) : seller;
        if (label) cityGroup.add(buildStallSign(stall, label, y));
      } else if (freeLabel) {
        // Empty: a neutral "Free stall" sign so every stall reads as a shop.
        cityGroup.add(buildStallSign(stall, freeLabel, y));
      }
    }
    this.group.add(cityGroup);
    this.byCity.set(cityId, cityGroup);
  }

  // Show / hide all market goods (e.g. hidden while inside a house or cave).
  setVisible(v) { this.group.visible = !!v; }

  // Forget every city's goods (e.g. on a full teleport/reset). Cheap rebuild
  // happens lazily the next time a city is refreshed.
  clear() {
    for (const [, g] of this.byCity) this.group.remove(g);
    this.byCity.clear();
  }
}

export default MarketStore;
