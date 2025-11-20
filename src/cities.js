import * as THREE from 'three';
import { WEAPONS, ARMORS, CONTAINERS, POTIONS } from './data/items.js';

// Fixed city layout. Nominal positions are deterministic; each is then snapped
// to the nearest flat grassland so cities never sit underwater. Every city has
// a temple (spawn and respawn point), a shop, a depot and a teleport portal.
// Each city sits in a distinct biome (world.js lays climate by latitude with a
// wide gradual transition): Greenhollow in the temperate middle, Oakvale in the
// forest, Stonehaven up in the frozen north, Dragonreach down in the desert, plus
// the new distant cities (Westharbor, Frostpeak, Sandport) in the continent's
// far corners. The map is a FINITE peninsula, so all cities sit inside it.
// `id` stays stable (NPCs/quests/saves key off it); `name` is what players see.
// `style` drives a distinct look per city (see CITY_STYLES below). Greenhollow is
// the temperate capital with a castle; the others each have their own character.
export const CITIES = [
  { id: 'rivertown', name: 'Greenhollow', x: 0, z: 0, biome: 'forest', style: 'capital' },
  { id: 'oakvale', name: 'Oakvale', x: -420, z: 280, biome: 'forest', style: 'village' },
  { id: 'stonehaven', name: 'Stonehaven', x: -300, z: -1180, biome: 'snow', style: 'mountain' },
  // Dragonreach is the desert (pharaonic) city — now out EAST where the desert is.
  { id: 'dragonreach', name: 'Dragonreach', x: 1180, z: 260, biome: 'desert', style: 'desert' },
  // New distant cities, each in its own corner of the finite continent with a
  // distinct biome and character: a forest river-port to the west, a frozen
  // mining outpost to the far north, and a sun-baked oasis town in the far east
  // desert (south-east corner).
  { id: 'westharbor', name: 'Westharbor', x: -1200, z: 120, biome: 'forest', style: 'harbor' },
  { id: 'frostpeak', name: 'Frostpeak', x: 300, z: -1080, biome: 'snow', style: 'frost' },
  { id: 'sandport', name: 'Sandport', x: 1080, z: 780, biome: 'desert', style: 'oasis' },
];

// Per-style look: wall/roof palette, roof shape, and how big the city pad is.
// The capital is a huge Tibia-style grid city (radius covers its rectangle); the
// others are round towns — but now MUCH bigger than before (the user wanted them
// large), each with its own palette and a signature `landmark` so no two cities
// feel the same.
// `shape` gives each non-capital town a DISTINCT walled silhouette (not all
// circles): { sides, rot, aspect } describes a regular polygon — `sides` corners,
// rotated by `rot` radians, optionally squashed along x by `aspect` (≠1 makes a
// rectangle/lozenge). The wall, the map outline and the in-city test all read it,
// so e.g. the desert city is a hard pharaonic rectangle and the frost town a
// sharp diamond, while the capital keeps its own irregular grid silhouette.
export const CITY_STYLES = {
  capital:  { radius: 245, wall: 0xd8c9a8, wall2: 0xc6b48c, roof: 0x8e3f2c, roof2: 0x6e3b22, stone: 0xb9b2a2, pitched: true, castle: true, grid: true },
  // Oakvale — a big timbered forest town with green roofs and a great oak. Soft
  // rounded heptagon.
  village:  { radius: 110, wall: 0xcdb892, wall2: 0xb9a17e, roof: 0x6f8f3a, roof2: 0x55702c, stone: 0x9a9488, pitched: true,  castle: false, landmark: 'oak', shape: { sides: 7, rot: 0.2 } },
  // Stonehaven — a slate-grey frozen mountain town with steep blue roofs. Angular
  // hexagonal keep.
  mountain: { radius: 108, wall: 0x9aa3ad, wall2: 0x808a96, roof: 0x49566a, roof2: 0x37425a, stone: 0x8d96a1, pitched: true,  castle: false, landmark: 'obelisk', shape: { sides: 6, rot: 0 } },
  // Dragonreach — a flat-roofed sandstone desert city: a hard PHARAONIC rectangle.
  desert:   { radius: 112, wall: 0xe0c690, wall2: 0xcdaf76, roof: 0xc98b3e, roof2: 0xa66f2c, stone: 0xd2bd92, pitched: false, castle: false, landmark: 'pyramid', shape: { sides: 4, rot: Math.PI / 4, aspect: 1.35 } },
  // Westharbor — a teal-roofed river port with a lighthouse: a wide pentagon.
  harbor:   { radius: 116, wall: 0xcfd6cf, wall2: 0xb6c2bd, roof: 0x2f7d77, roof2: 0x215c58, stone: 0x9aa6a4, pitched: true,  castle: false, landmark: 'lighthouse', shape: { sides: 5, rot: Math.PI, aspect: 1.2 } },
  // Frostpeak — an icy mining outpost: a sharp DIAMOND.
  frost:    { radius: 104, wall: 0xdfe9f0, wall2: 0xc4d4e0, roof: 0x7fb0cc, roof2: 0x5d90b4, stone: 0xbcccd6, pitched: true,  castle: false, landmark: 'icetower', shape: { sides: 4, rot: 0, aspect: 1 } },
  // Sandport — an oasis town: an octagon around a palm pool.
  oasis:    { radius: 110, wall: 0xe7c98c, wall2: 0xd2ad68, roof: 0x39a39a, roof2: 0x2b7d77, stone: 0xd8c193, pitched: false, castle: false, landmark: 'oasis', shape: { sides: 8, rot: Math.PI / 8 } },
};

// The wall-outline polygon for a shaped town: `sides` world points around the
// center at `radius`, rotated by shape.rot, squashed by shape.aspect on x. A
// town with no shape falls back to a many-sided polygon (reads as a circle).
function townPolygon(cx, cz, radius, shape) {
  const sides = shape && shape.sides ? shape.sides : 32;
  const rot = shape && shape.rot ? shape.rot : 0;
  const aspect = shape && shape.aspect ? shape.aspect : 1;
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * radius * aspect, z: cz + Math.sin(a) * radius });
  }
  return pts;
}

// True if (x,z) is inside a shaped town's polygon (point-in-polygon). Used by the
// in-city test so the flat pad + "no creatures in town" follow the real outline.
function pointInPolygon(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, zi = pts[i].z, xj = pts[j].x, zj = pts[j].z;
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

// Largest pad so world.js flattening and the in-city test cover every city.
export const CITY_RADIUS = 245;
const CITY_RIM = 30;          // ground eases back to nature over this width

function styleFor(c) { return CITY_STYLES[c.style] || CITY_STYLES.village; }

// How far OUT from the city center anything gets built (wall, outskirts road,
// the outer tree ring, the landmark/town hall). The flat pad must cover ALL of
// it — otherwise a wall segment, tree or lamp lands on natural (sloped) ground
// just past the wall and visibly floats. Round towns build a tree ring at ~R+8
// and props at offsets; the grid capital builds approach roads ~36m past its
// wall. We flatten generously past those so nothing sits on a step.
function flatRadiusFor(c) {
  const st = styleFor(c);
  if (st.grid) return st.radius;           // capital pad (245) already covers its roads
  return st.radius + 20;                   // round town: cover the outer tree ring + belt
}
const TEMPLE_RADIUS = 5;
const SHOP_RADIUS = 7;   // market hall is a big building; let you trade near it
const DEPOT_RADIUS = 5;
const PORTAL_RADIUS = 3.5;

let citiesPlaced = false;

export function placeCities(world) {
  if (citiesPlaced) return;
  citiesPlaced = true;
  // Pass 1: find solid, FLAT ground for every city and remember its flat level.
  // Search using the city's real footprint so the chosen spot is flat across the
  // whole pad, not just at the center, and KEEP CLEAR of cities already placed so
  // two pads (and their rims) never overlap — overlapping pads created a hidden
  // step where one city's flat met another's slope, which floated walls/trees.
  // The capital is placed first so it gets the flat spot nearest its origin.
  const placed = [];
  for (const c of CITIES) {
    const padR = flatRadiusFor(c);
    const spot = findLand(world, c.x, c.z, padR, placed);
    c.x = spot.x; c.z = spot.z;
    c.groundY = world.heightAt(c.x, c.z);
    placed.push({ x: c.x, z: c.z, r: padR });
  }
  // Pass 2: flatten each pad (after placement, so the land search stays natural).
  // The pad covers everything the city builds (wall + outer ring + outskirts) and
  // a WIDE rim eases it back to nature, so no wall, tree or lamp floats on a step.
  for (const c of CITIES) {
    world.registerCityFlat(c.x, c.z, c.groundY, flatRadiusFor(c), CITY_RIM);
  }
}

// Find a buildable spot near (ox,oz): solid ground (above water, below the high
// peaks) that is also genuinely FLAT over the whole footprint, so the pad's rim
// only has to bridge gentle ground and nothing perches on a hidden slope. We
// sample a ring of points across the would-be pad and reject the spot if any of
// them is steep — a single steep sample means a hill or valley runs through the
// town, which is exactly what produced the floating walls/trees.
function findLand(world, ox, oz, padR = 130, placed = []) {
  // Max height variation tolerated across the pad footprint (meters). Tight, so
  // the flattened pad never sits on a noticeable hump or dip.
  const FLAT_TOL = 3.0;
  // A candidate must keep its whole pad+rim clear of every city already placed,
  // so no two pads overlap. CITY_RIM(30) is added on both sides as breathing room.
  const clearsPlaced = (x, z) => {
    for (const p of placed) {
      if (Math.hypot(x - p.x, z - p.z) < padR + p.r + CITY_RIM * 2) return false;
    }
    return true;
  };
  let fallback = null;
  for (let r = 0; r < 2200; r += 24) {
    const steps = Math.max(1, Math.floor(r / 24) * 6);
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(ox + Math.cos(a) * r);
      const z = Math.round(oz + Math.sin(a) * r);
      if (!clearsPlaced(x, z)) continue;             // would overlap another city
      const h = world.heightAt(x, z);
      if (h < 1.8 || h > 14) continue;
      // Sample the footprint: center + two rings. Reject if it's not near-flat.
      let lo = h, hi = h, steep = false;
      for (const rr of [padR * 0.5, padR]) {
        for (let k = 0; k < 8 && !steep; k++) {
          const aa = (k / 8) * Math.PI * 2;
          const hh = world.heightAt(x + Math.cos(aa) * rr, z + Math.sin(aa) * rr);
          if (hh < 0.5 || hh > 20) { steep = true; break; } // pad would hit water/peak
          lo = Math.min(lo, hh); hi = Math.max(hi, hh);
          if (hi - lo > FLAT_TOL) steep = true;
        }
      }
      if (steep) { if (!fallback) fallback = { x, z }; continue; }
      return { x, z };
    }
  }
  // Nothing perfectly flat AND clear found: best near-solid spot we saw, else the
  // nominal spot (placement still succeeds even on an awkward seed).
  return fallback || { x: ox, z: oz };
}

// Global shop cap: vendors only stock SIMPLE gear up to this level requirement.
// Anything stronger (level 22+, plus every 'epic'/'legendary-tier' item) must be
// earned from creature drops or quests, never bought. The user's rule: "lo máximo
// es hasta nivel 20-22 o así... cosas sencillas". Potions are exempt (you can
// always buy the level-appropriate flat potion).
export const SHOP_LEVEL_CAP = 22;
const buyable = (it) => it.shopTier === 'shop' && (it.levelReq || 1) <= SHOP_LEVEL_CAP;

// Only the plain bags/backpacks are buyable; the fancy looted ones (fur, golden,
// dragon, demon) are epic/legendary and stay loot-only.
const buyableContainers = () => CONTAINERS.filter((c) => !c.shopTier || c.shopTier === 'shop');

export function shopStock() {
  const weapons = WEAPONS.filter(buyable);
  const armors = ARMORS.filter(buyable);
  // Shops sell the flat-amount potions (not the rare % restores / elixirs).
  const potions = POTIONS.filter((p) => !p.restorePct);
  return [...weapons, ...armors, ...buyableContainers(), ...potions];
}

// Normalize a def/instance to a coarse kind: 'weapon' | 'shield' | 'armor' |
// 'potion' | 'container'. Weapons have an attack type; armors have a slot.
function itemKind(it) {
  if (it.kind === 'potion' || it.restoreType) return 'potion';
  if (it.type === 'shield') return 'shield';
  if (it.type === 'container' || it.capacity != null) return 'container';
  if (['sword', 'axe', 'mace', 'lance', 'bow', 'wand'].includes(it.type)) return 'weapon';
  if (it.slot) return 'armor';
  return it.type || 'misc';
}

// Does a shop descriptor accept this item (def or backpack instance)?
function matchesDesc(desc, it) {
  if (!desc) return false;
  if (desc.all) return true;
  const kind = itemKind(it);
  if (desc.kinds && desc.kinds.includes(kind)) return true;
  if (desc.types && it.type && desc.types.includes(it.type)) return true;
  if (desc.slots && it.slot && desc.slots.includes(it.slot)) return true;
  if (desc.tiers && it.tier && desc.tiers.includes(it.tier)) return true;
  return false;
}

// The catalog a vendor offers to buy, filtered to shop-tier sellable defs.
export function shopStockFor(shop) {
  if (!shop || !shop.sells) return shopStock();
  const sellable = [
    ...WEAPONS.filter(buyable),
    ...ARMORS.filter(buyable),
    ...buyableContainers(),
    ...POTIONS.filter((p) => !p.restorePct),
  ];
  return sellable.filter((d) => matchesDesc(shop.sells, d));
}

// Will this vendor buy the given backpack item from the player?
export function vendorBuysItem(shop, item) {
  return !!(shop && matchesDesc(shop.buys, item));
}

// Coins the player receives when selling `item` to this vendor.
export function sellPrice(shop, item) {
  const mult = shop && shop.sellMult != null ? shop.sellMult : 0.4;
  return Math.max(1, Math.floor((item.value || 0) * mult));
}

// Coins the player pays when buying `def` from this vendor.
export function buyPrice(shop, def) {
  const mult = shop && shop.buyMult != null ? shop.buyMult : 1;
  return Math.max(1, Math.floor((def.value || 0) * mult));
}

export function cityAt(x, z) {
  for (const c of CITIES) {
    if (Math.hypot(c.x - x, c.z - z) < styleFor(c).radius) return c;
  }
  return null;
}

export function nearestCity(x, z) {
  let best = CITIES[0], bd = Infinity;
  for (const c of CITIES) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// The wall outline of a city, for drawing on the map. Grid cities (the capital)
// trace the irregular masked footprint as a world-space polygon; round towns are
// a circle at the wall radius (the wall sits at radius - 3, see buildWall).
// Returns { shape:'poly', points:[{x,z},...] } or { shape:'circle', x, z, radius }.
export function cityWallOutline(city) {
  const st = styleFor(city);
  if (st.grid) {
    return { shape: 'poly', points: capitalWallPolygon(city.x, city.z, GRID.cell) };
  }
  // Shaped towns trace their polygon; legacy/round ones still draw a circle.
  if (st.shape) {
    return { shape: 'poly', points: townPolygon(city.x, city.z, st.radius - 3, st.shape) };
  }
  return { shape: 'circle', x: city.x, z: city.z, radius: st.radius - 3 };
}

// Trace the outer boundary of CAPITAL_CELLS as a single closed loop of world
// points. Collect every boundary edge (a cell side whose neighbor is outside),
// then stitch the edges end-to-end into an ordered ring. Cached after first use.
let _capitalPoly = null;
function capitalWallPolygon(cx, cz, cell) {
  if (_capitalPoly) return _capitalPoly.map((p) => ({ x: cx + p.x, z: cz + p.z }));
  const half = cell / 2;
  // Each boundary edge as two integer-keyed endpoints (in half-cell units so all
  // coordinates are integers and match exactly when shared between edges).
  const k = (a, b) => `${a},${b}`;
  const edges = [];
  for (const { col, row } of CAPITAL_CELLS.list) {
    const x0 = col * 2 - 1, x1 = col * 2 + 1;   // cell spans [col*2-1 .. col*2+1] in half-units
    const z0 = row * 2 - 1, z1 = row * 2 + 1;
    if (!cellInCity(col, row - 1)) edges.push([k(x0, z0), k(x1, z0)]); // N
    if (!cellInCity(col, row + 1)) edges.push([k(x0, z1), k(x1, z1)]); // S
    if (!cellInCity(col - 1, row)) edges.push([k(x0, z0), k(x0, z1)]); // W
    if (!cellInCity(col + 1, row)) edges.push([k(x1, z0), k(x1, z1)]); // E
  }
  // Adjacency: each endpoint links to its edge partners; walk the loop.
  const adj = new Map();
  for (const [a, b] of edges) {
    (adj.get(a) || adj.set(a, []).get(a)).push(b);
    (adj.get(b) || adj.set(b, []).get(b)).push(a);
  }
  const start = edges[0][0];
  const ring = [start];
  let prev = null, cur = start;
  for (let guard = 0; guard < edges.length + 4; guard++) {
    const nbrs = adj.get(cur) || [];
    const next = nbrs.find((n) => n !== prev) ?? nbrs[0];
    if (next === undefined || next === start) break;
    ring.push(next); prev = cur; cur = next;
  }
  _capitalPoly = ring.map((key) => {
    const [hx, hz] = key.split(',').map(Number);
    return { x: hx * half, z: hz * half };
  });
  return _capitalPoly.map((p) => ({ x: cx + p.x, z: cz + p.z }));
}

// The temple is the city center: it is where players spawn and respawn.
export function templePos(city) {
  return { x: city.x, z: city.z };
}

// Themed quarters for the small round towns, placed around the temple at a fixed
// bearing and distance. Each anchors a few houses and decoration so the town
// reads as real districts. The big shop buildings are enterable (solid walls +
// a doorway). The market sells general goods (matches the legacy 'shop'
// interactable); others are vendor NPC homes.
// Six themed quarters now (added `archer`), spread around the ring so every
// round town has a building for each vendor trade — including the bow sellers —
// and no vendor is ever left homeless at the temple center. The south bearing
// (Math.PI*1.5) stays clear for the gate.
const DISTRICTS = [
  { key: 'mage',     angle: Math.PI * 0.20, distF: 0.55, label: 'Arcane Tower' },
  { key: 'archer',   angle: Math.PI * 0.55, distF: 0.55, label: 'Fletcher' },
  { key: 'knight',   angle: Math.PI * 0.85, distF: 0.55, label: 'Armory' },
  { key: 'potion',   angle: Math.PI * 1.15, distF: 0.55, label: 'Apothecary' },
  { key: 'market',   angle: Math.PI * 1.45, distF: 0.55, label: 'Market Hall' },
  { key: 'library',  angle: Math.PI * 1.80, distF: 0.62, label: 'Great Library' },
];

export function buildCities(scene, world) {
  const group = new THREE.Group();

  const props = [];
  const portals = [];
  const interiors = []; // { city, kind, x, z, y } — where a vendor NPC walks
  for (const c of CITIES) {
    const flat = c.groundY != null ? c.groundY : world.heightAt(c.x, c.z);
    const st = styleFor(c);
    const mats = makeStyleMats(st);

    const built = st.grid
      ? buildGridCity(group, world, c, flat, mats, st)
      : buildRoundCity(group, world, c, flat, mats, st);

    for (const it of built.interiors) interiors.push(it);
    portals.push({ city: c, mesh: built.portalMesh });
    props.push({
      city: c, temple: templePos(c),
      shop: built.shopPos, depot: built.depotPos, portal: built.portalPos,
      // Extra named POIs (bank, food, archer, townhall...) for the map markers.
      pois: built.pois || [],
    });
  }
  scene.add(group);
  return { group, props, portals, interiors };
}

// A teleport portal ring + glowing disc at (x,z). Returns its mesh + position.
function buildPortal(group, x, z, y, mats) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.3, 8, 18), mats.portal);
  ring.position.set(x, y + 1.6, z);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 18),
    new THREE.MeshBasicMaterial({ color: 0xb89bff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  disc.position.set(x, y + 1.6, z);
  group.add(ring, disc);
  return { mesh: ring, pos: { x, z } };
}

// A city's signature LANDMARK: a distinct tall structure so every town has its
// own silhouette. Built on the city pad (flat ground), solid where it makes
// sense. `kind` selects which one.
function buildLandmark(group, world, x, z, y, kind, mats) {
  if (kind === 'oak') {
    // A huge ancient oak: a thick trunk and a broad layered canopy.
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.9, 9, 10), mats.wood);
    trunk.position.set(x, y + 4.5, z);
    group.add(trunk);
    for (let i = 0; i < 3; i++) {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(5.5 - i * 0.8, 0), mats.leaf);
      blob.position.set(x + (i - 1) * 1.6, y + 9 + i * 1.6, z + (i % 2 ? 1.4 : -1.4));
      group.add(blob);
    }
    if (world) world.addSolid(x, z, 2.0);
  } else if (kind === 'obelisk' || kind === 'icetower') {
    // A tall tapered tower/obelisk (frosty blue for the ice town).
    const mat = kind === 'icetower' ? mats.glass : mats.stone;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 16, kind === 'icetower' ? 6 : 4), mat);
    shaft.position.set(x, y + 8, z);
    group.add(shaft);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.0, 4, kind === 'icetower' ? 6 : 4), mats.roof);
    cap.position.set(x, y + 18, z);
    group.add(cap);
    if (world) world.addSolid(x, z, 2.2);
  } else if (kind === 'pyramid') {
    // A grand stepped sandstone pyramid flanked by two obelisks and a sphinx —
    // the pharaonic centrepiece of the desert city.
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const s = 20 * (1 - i / tiers);
      const block = new THREE.Mesh(new THREE.BoxGeometry(s, 2.6, s), mats.stone);
      block.position.set(x, y + (i + 0.5) * 2.6, z);
      group.add(block);
    }
    // gilded capstone
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3, 4), mats.gold);
    cap.position.set(x, y + tiers * 2.6 + 1.4, z); cap.rotation.y = Math.PI / 4;
    group.add(cap);
    if (world) world.addSolid(x, z, 10.5);
    // A pair of tall obelisks in front of the pyramid.
    for (const s of [-1, 1]) {
      const ox = x + s * 14, oz = z + 14;
      const obel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 12, 4), mats.stone);
      obel.position.set(ox, y + 6, oz); obel.rotation.y = Math.PI / 4;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2, 4), mats.gold);
      tip.position.set(ox, y + 13, oz); tip.rotation.y = Math.PI / 4;
      group.add(obel, tip);
      if (world) world.addSolid(ox, oz, 1.1);
    }
    // A crouching sphinx (a stylised body + head block) guarding the approach.
    const sbody = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 2.4), mats.stone);
    sbody.position.set(x, y + 1.5, z + 22); group.add(sbody);
    const shead = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 2.2), mats.stone);
    shead.position.set(x + 2.2, y + 4, z + 22); group.add(shead);
    const sface = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.4), mats.gold);
    sface.position.set(x + 2.2, y + 4.2, z + 23.1); group.add(sface);
    if (world) world.addSolid(x, z + 22, 3.4);
  } else if (kind === 'lighthouse') {
    // A striped lighthouse with a glowing lamp room.
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 3.0, 16, 14), mats.temple);
    body.position.set(x, y + 8, z);
    group.add(body);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3, 14), mats.glass);
    lamp.position.set(x, y + 17.5, z);
    group.add(lamp);
    const light = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10), mats.lamp);
    light.position.set(x, y + 17.5, z);
    group.add(light);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.6, 14), mats.roof);
    roof.position.set(x, y + 20.3, z);
    group.add(roof);
    if (world) world.addSolid(x, z, 3.0);
  } else if (kind === 'oasis') {
    // A palm-ringed pool with a domed shrine: the heart of the oasis town.
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.2, 0.5, 24), mats.water);
    pool.position.set(x, y + 0.2, z);
    group.add(pool);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = x + Math.cos(a) * 7.5, pz = z + Math.sin(a) * 7.5;
      const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 6, 6), mats.wood);
      palm.position.set(px, y + 3, pz); palm.rotation.z = (i % 2 ? 0.12 : -0.12);
      const fronds = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 0), mats.leaf);
      fronds.position.set(px, y + 6.2, pz);
      group.add(palm, fronds);
      if (world) world.addSolid(px, pz, 0.5);
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.roof);
    dome.position.set(x + 11, y + 3, z);
    group.add(dome);
    if (world) world.addSolid(x + 11, z, 3.2);
  }
}

// --- Small round town (Oakvale, Stonehaven, Dragonreach) ---------------------
// The original radial layout: temple at center, themed districts at bearings,
// a ring of homes, props and a stone wall with one gate.
function buildRoundCity(group, world, c, flat, mats, st) {
  const R = st.radius;
  const interiors = [];
  const pois = [];   // named map markers for every notable building in the town

  buildStreets(group, c.x, c.z, flat, R, mats);
  buildWall(group, world, c.x, c.z, flat, R - 3, mats, st.shape);
  // Dress each of the three gates: a paved approach strip running out through the
  // opening, flanked by a pair of lamps, so the exits read as real roads out of
  // town (and match the gate markers drawn on the map).
  for (const gateA of ROUND_GATE_BEARINGS) {
    const dx = Math.cos(gateA), dz = Math.sin(gateA);
    const px = -dz, pz = dx;                 // perpendicular (road width axis)
    const gx = c.x + dx * (R - 3), gz = c.z + dz * (R - 3);
    const road = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 30), mats.stoneDark);
    road.position.set(gx + dx * 9, flat - 0.04, gz + dz * 9);
    road.rotation.y = -gateA + Math.PI / 2;
    group.add(road);
    buildProp(group, world, gx + px * 3.5, gz + pz * 3.5, flat, 'lamp', mats);
    buildProp(group, world, gx - px * 3.5, gz - pz * 3.5, flat, 'lamp', mats);
  }
  buildTemple(group, c.x, c.z, flat, mats.temple, mats.stone);
  pois.push({ x: c.x, z: c.z, icon: '🏛️', label: 'Temple' });
  buildTownHall(group, world, c.x, c.z + 18, flat, mats);
  pois.push({ x: c.x, z: c.z + 18, icon: '🏛️', label: 'Town Hall' });
  buildNameLabel(group, c, flat + 15);
  // Each town's signature landmark, off to one side of the plaza, so the
  // skyline reads differently in every city — and it gets its own map marker.
  if (st.landmark) {
    const lx = c.x - R * 0.34, lz = c.z - R * 0.18;
    buildLandmark(group, world, lx, lz, flat, st.landmark, mats);
    const lm = LANDMARK_POI[st.landmark];
    if (lm) pois.push({ x: lx, z: lz, icon: lm.icon, label: lm.label });
  }

  for (const dist of DISTRICTS) {
    const dd = R * dist.distF;
    const dx = c.x + Math.cos(dist.angle) * dd;
    const dz = c.z + Math.sin(dist.angle) * dd;
    const facing = Math.atan2(c.x - dx, c.z - dz);
    const inside = buildDistrict(group, world, dx, dz, flat, facing, dist.key, mats, st);
    if (inside) interiors.push({ city: c, kind: dist.key, x: inside.x, z: inside.z, y: flat });
    // Mark every district building on the map with its trade icon + label.
    const dp = DISTRICT_POI[dist.key];
    if (dp) pois.push({ x: dx, z: dz, icon: dp.icon, label: dp.label });
  }

  // Houses fill two concentric rings whose counts scale with the (now large)
  // radius, so the big towns read as packed neighbourhoods, not a thin outer ring
  // around an empty field. The outer ring sits just inside the wall; the inner
  // ring at ~0.55R fills the mid-town. A couple of gaps are left for the gate.
  const ringDefs = [
    { rr: R * 0.80, n: Math.max(12, Math.round(R / 7)) },
    { rr: R * 0.55, n: Math.max(8, Math.round(R / 11)) },
  ];
  let hi = 0;
  for (const ring of ringDefs) {
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * Math.PI * 2 + 0.4;
      // keep all three gate corridors clear on the outer ring
      if (ring.rr > R * 0.7 && nearAnyGate(a, ROUND_GATE_BEARINGS, 0.22)) continue;
      const hx = c.x + Math.cos(a) * ring.rr, hz = c.z + Math.sin(a) * ring.rr;
      buildHouse(group, world, hx, hz, flat, {
        w: 4.5 + (hi % 3), d: 4.5 + (hi % 2), wall: hi % 2 ? mats.wall : mats.wall2,
        roof: hi % 2 ? mats.roof : mats.roof2, door: mats.door, glass: mats.glass,
        rot: Math.atan2(c.x - hx, c.z - hz), pitched: st.pitched, solid: true,
        twoFloor: hi % 3 === 0, chimney: hi % 2 === 0,
      });
      hi++;
    }
  }

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    buildProp(group, world, c.x + Math.cos(a) * 15, c.z + Math.sin(a) * 15, flat, 'lamp', mats);
  }
  const clutter = ['crate', 'barrel', 'cart', 'crate', 'barrel', 'well', 'cart', 'crate'];
  for (let i = 0; i < clutter.length; i++) {
    const a = (i / clutter.length) * Math.PI * 2 + 0.7;
    const rr = R * (0.32 + (i % 3) * 0.12);
    buildProp(group, world, c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr, flat, clutter[i], mats);
  }
  // Greenery so the town and its outskirts don't read as bare: benches and
  // flowerbeds inside, a ring of trees and bushes just outside the wall.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    buildProp(group, world, c.x + Math.cos(a) * R * 0.5, c.z + Math.sin(a) * R * 0.5, flat, i % 2 ? 'flowers' : 'bench', mats);
  }
  const treeRing = Math.round(R * 0.7);
  for (let i = 0; i < treeRing; i++) {
    const a = (i / treeRing) * Math.PI * 2;
    if (nearAnyGate(a, ROUND_GATE_BEARINGS, 0.25)) continue; // clear all four gates
    const rr = R + 4 + (i % 3) * 2;
    buildProp(group, world, c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr, flat, i % 3 === 0 ? 'bush' : 'tree', mats);
  }

  const market = interiors.find((it) => it.kind === 'market');
  const shopPos = market ? { x: market.x, z: market.z } : { x: c.x + 12, z: c.z };
  const depotPos = { x: c.x - 12, z: c.z };
  buildDepot(group, world, depotPos.x, depotPos.z, flat, mats);
  pois.push({ x: depotPos.x, z: depotPos.z, icon: '🏦', label: 'Depot' });
  const portalPos = { x: c.x, z: c.z + 13 };
  const portal = buildPortal(group, portalPos.x, portalPos.z, flat, mats);

  return { interiors, shopPos, depotPos, portalPos, portalMesh: portal.mesh, pois };
}

// Map markers for a round town's themed districts and signature landmark, keyed
// by the district key / landmark kind. The icons match the minimap's POI_STYLE
// glyph table (cities.js POIs and minimap drawing share these emoji keys).
const DISTRICT_POI = {
  mage:    { icon: '🔮', label: 'Arcane Tower' },
  knight:  { icon: '⚔️', label: 'Armory' },
  potion:  { icon: '⚗️', label: 'Apothecary' },
  market:  { icon: '🛒', label: 'Market Hall' },
  library: { icon: '📖', label: 'Great Library' },
  archer:  { icon: '🏹', label: 'Fletcher' },
};
const LANDMARK_POI = {
  oak:        { icon: '🌳', label: 'Great Oak' },
  obelisk:    { icon: '🗿', label: 'Obelisk' },
  icetower:   { icon: '🗼', label: 'Ice Tower' },
  pyramid:    { icon: '🔺', label: 'Pyramid' },
  lighthouse: { icon: '🗼', label: 'Lighthouse' },
  oasis:      { icon: '🌴', label: 'Oasis' },
};

// --- Big Tibia-style grid city (the capital) ---------------------------------
// A rectangular walled city laid on a square street grid. The grid is GW x GH
// cells of CELL meters. A central plaza holds the temple + teleport. Named shop
// buildings occupy fixed cells (so map POIs and vendor interiors are stable);
// the remaining cells are filled with varied houses. Returns the interactable
// positions, the portal mesh, and named POIs for the map.
const GRID = {
  cell: 26,    // size of one block (building + surrounding street)
  street: 7,   // street width between blocks
};

// The capital's footprint is an ABSTRACT, irregular silhouette — not a rectangle.
// Each string is one row of grid cells (top row is the most negative Z / north);
// '#' is inside the city, ' ' is outside. The shape is wider east-west than it is
// tall, bulges out on a couple of sides, and has clipped/uneven corners so the
// wall that traces it reads as an organic medieval town, not a box.
// Rows are indexed top→bottom; the center cell (0,0) is marked so col/row math
// stays anchored regardless of how the art is drawn.
const CAPITAL_SHAPE = [
  '   ####        ',   // a small northern keep district juts out
  '  ######   ##  ',
  ' ############# ',   // long east-west body
  '###############',   // widest row
  '###############',
  ' ############# ',
  ' ###########   ',   // south-east is clipped, south-west bulges
  '  #######      ',
  '   ####        ',   // a southern gate spur
];
// Which cell in the art is world-center (col 0, row 0): row index 4, the char
// column where the body is centered. Computed once below as SHAPE_ORIGIN.
const SHAPE_ORIGIN = { r: 4, c: 7 };

// Named buildings, addressed by grid cell (col,row) with the center cell (0,0)
// = SHAPE_ORIGIN. `kind` selects interior decor + which vendor lives there;
// `icon` is the map marker. Every listed cell must be inside CAPITAL_SHAPE.
// Services cluster near the plaza; a few sit out in the spur districts so those
// extensions have a reason to exist (and an NPC to meet).
const CAPITAL_LOTS = [
  { col:  0, row: -1, kind: 'bank',    label: 'Bank of Greenhollow', icon: '🏦', big: true },
  { col: -1, row: -1, kind: 'potion',  label: 'Apothecary',          icon: '⚗️' },
  { col:  1, row: -1, kind: 'food',    label: 'The Copper Kettle',   icon: '🍲' },
  { col: -2, row:  0, kind: 'knight',  label: 'Armory',              icon: '⚔️' },
  { col:  2, row:  0, kind: 'mage',    label: 'Arcane Tower',        icon: '🔮', tower: true },
  { col: -1, row:  1, kind: 'archer',  label: 'Fletcher & Bows',     icon: '🏹' },
  { col:  1, row:  1, kind: 'market',  label: 'Market Hall',         icon: '🛒', big: true },
  { col: -3, row:  0, kind: 'bag',     label: 'Sacks & Satchels',    icon: '🎒' },
  { col:  3, row: -1, kind: 'townhall',label: 'Town Hall',           icon: '🏛️', big: true },
  // Spur districts: extra trades that give the odd-shaped wings a purpose.
  { col:  0, row: -3, kind: 'temple2', label: 'North Keep',          icon: '🏰', big: true },
  { col: -4, row:  2, kind: 'tavern',  label: 'The Wayfarer Inn',    icon: '🍺' },
  { col:  4, row: -2, kind: 'jeweler', label: 'Gemcutter',           icon: '💎' },
];

// Build a fast lookup of which (col,row) cells are inside the city, plus the
// list of occupied cells, derived once from CAPITAL_SHAPE.
const CAPITAL_CELLS = (() => {
  const inside = new Set();
  const list = [];
  let minC = 0, maxC = 0, minR = 0, maxR = 0;
  for (let r = 0; r < CAPITAL_SHAPE.length; r++) {
    const rowStr = CAPITAL_SHAPE[r];
    for (let cI = 0; cI < rowStr.length; cI++) {
      if (rowStr[cI] !== '#') continue;
      const col = cI - SHAPE_ORIGIN.c;
      const row = r - SHAPE_ORIGIN.r;
      inside.add(`${col},${row}`);
      list.push({ col, row });
      minC = Math.min(minC, col); maxC = Math.max(maxC, col);
      minR = Math.min(minR, row); maxR = Math.max(maxR, row);
    }
  }
  return { inside, list, minC, maxC, minR, maxR };
})();
const cellInCity = (col, row) => CAPITAL_CELLS.inside.has(`${col},${row}`);

function buildGridCity(group, world, c, flat, mats, st) {
  const { cell } = GRID;
  const interiors = [];
  const pois = [];

  // Grid cell (col,row) -> world center. Center cell is (0,0).
  const cellPos = (col, row) => ({ x: c.x + col * cell, z: c.z + row * cell });

  // Paved ground + streets, drawn only over the cells the irregular mask marks
  // as inside the city, so the silhouette is organic rather than a rectangle.
  buildMaskGround(group, c.x, c.z, flat, cell, mats);
  buildMaskStreets(group, c.x, c.z, flat, cell, GRID.street, mats);

  // Perimeter wall: traces the outer edges of the masked footprint, with gates.
  buildMaskWall(group, world, c.x, c.z, flat, cell, mats);

  // Central plaza: temple, a hero statue, fountains, benches and the teleport.
  // The statue sits NORTH of the temple (c.z + 9), well clear of the south spawn
  // point (the player appears at c.z - 8 by the south gate) so it never wedges
  // the player against its collision on spawn.
  buildTemple(group, c.x, c.z, flat, mats.temple, mats.stone);
  buildProp(group, world, c.x - 8, c.z, flat, 'fountain', mats);
  buildProp(group, world, c.x + 8, c.z, flat, 'fountain', mats);
  buildProp(group, world, c.x, c.z + 9, flat, 'statue', mats);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    buildProp(group, world, c.x + Math.cos(a) * 11, c.z + Math.sin(a) * 11, flat, i % 2 ? 'bench' : 'flowers', mats);
    buildProp(group, world, c.x + Math.cos(a + 0.5) * 13, c.z + Math.sin(a + 0.5) * 13, flat, 'tree', mats);
  }
  const portalPos = { x: c.x, z: c.z + cell * 0.5 };
  const portal = buildPortal(group, portalPos.x, portalPos.z, flat, mats);
  buildNameLabel(group, c, flat + 20);
  // The capital keeps its castle, set back in the northern keep spur.
  if (st.castle) buildCastle(group, world, c.x, c.z + (CAPITAL_CELLS.minR - 0.3) * cell, flat, mats);

  // Named buildings. A door faces the plaza when the lot is north/south of it;
  // east/west spur lots face inward along x instead.
  const taken = new Set(['0,0']);                  // plaza center
  let shopPos = null, depotPos = null;

  // Keep each usable gate's cell clear of houses and dress it as an entry plaza,
  // so the south/east/west gates stay walkable (the north gate hits the keep, so
  // it stays a decorative arch). These are the three real ways out of the city.
  const USABLE_GATES = CAPITAL_GATES.filter((g) => g.side !== 'N');
  for (const g of USABLE_GATES) {
    taken.add(`${g.col},${g.row}`);
    const gp = cellPos(g.col, g.row);
    // A flagstone disc + two lamps mark the gate square inside the wall.
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(cell * 0.34, cell * 0.34, 0.22, 24), mats.stoneDark);
    plaza.position.set(gp.x, flat - 0.02, gp.z);
    group.add(plaza);
    const [dx, dz] = SIDE_D[g.side];
    // Lamps flank the inner side of the gate; a banner-topped post by the arch.
    buildProp(group, world, gp.x - dz * 4, gp.z - dx * 4, flat, 'lamp', mats);
    buildProp(group, world, gp.x + dz * 4, gp.z + dx * 4, flat, 'lamp', mats);
  }

  for (const lot of CAPITAL_LOTS) {
    taken.add(`${lot.col},${lot.row}`);
    const p = cellPos(lot.col, lot.row);
    let facing;
    if (Math.abs(lot.col) > Math.abs(lot.row)) facing = lot.col < 0 ? Math.PI / 2 : -Math.PI / 2;
    else facing = lot.row < 0 ? 0 : Math.PI;
    const inside = buildShop(group, world, p.x, p.z, flat, facing, lot, mats, st);
    interiors.push({ city: c, kind: lot.interiorKey || lot.kind, x: inside.x, z: inside.z, y: flat });
    pois.push({ x: p.x, z: p.z, icon: lot.icon, label: lot.label });
    if (lot.kind === 'market') shopPos = { x: inside.x, z: inside.z };
    if (lot.kind === 'bank')   depotPos = { x: inside.x, z: inside.z };
  }
  shopPos = shopPos || { x: c.x + 12, z: c.z };
  depotPos = depotPos || { x: c.x - 12, z: c.z };

  // Fill the remaining masked cells with varied houses and lush garden lots.
  for (const { col, row } of CAPITAL_CELLS.list) {
    if (taken.has(`${col},${row}`)) continue;
    const p = cellPos(col, row);
    const seed = (col * 73856093) ^ (row * 19349663);
    const r = ((seed >>> 0) % 1000) / 1000;
    if (r < 0.26) {
      const garden = ['park', 'wellyard', 'market', 'orchard'][(seed >>> 3) % 4];
      buildGardenCell(group, world, p.x, p.z, flat, garden, mats);
      continue;
    }
    const big = r > 0.72;
    const w = big ? 9 + (seed % 3) : 6 + (seed % 3);
    const d = big ? 8 + ((seed >> 2) % 3) : 6 + ((seed >> 2) % 2);
    const twoFloor = big || r > 0.5;
    buildHouse(group, world, p.x, p.z, flat, {
      w, d, wallH: twoFloor ? 5.6 : 3.4,
      wall: (col + row) % 2 ? mats.wall : mats.wall2,
      roof: (col + row) % 2 ? mats.roof : mats.roof2,
      door: mats.door, glass: mats.glass, wood: mats.wood, awning: mats.awning,
      rot: row < 0 ? 0 : Math.PI,
      pitched: st.pitched, solid: true, twoFloor, chimney: r > 0.4,
    });
    const yard = ['flowers', 'bush', 'planter', 'bench'][(seed >>> 5) % 4];
    const front = row < 0 ? 1 : -1;
    buildProp(group, world, p.x - 3, p.z + front * (d / 2 + 2), flat, yard, mats);
    if (r > 0.6) buildProp(group, world, p.x + 3, p.z + front * (d / 2 + 1.8), flat, 'barrel', mats);
  }

  // Street furniture at the corner of every masked cell: trees, lamps, planters,
  // the odd statue — keeps the streetscape full without blocking the avenues.
  for (const { col, row } of CAPITAL_CELLS.list) {
    const x = c.x + (col + 0.5) * cell, z = c.z + (row + 0.5) * cell;
    if (Math.hypot(x - c.x, z - c.z) < cell * 0.7) continue;   // keep plaza clear
    const k = (col * 7 + row * 13 + 100) % 5;
    const kind = k === 0 ? 'statue' : k === 1 ? 'lamp' : k === 2 ? 'tree' : k === 3 ? 'planter' : 'bush';
    buildProp(group, world, x, z, flat, kind, mats);
  }

  // Decoration belt + a lamp-lit approach road outside the south gate.
  buildOutskirts(group, world, c.x, c.z, flat, cell, mats);

  return { interiors, shopPos, depotPos, portalPos, portalMesh: portal.mesh, pois };
}

// A cell with no house: a themed little open lot full of greenery / props.
function buildGardenCell(group, world, x, z, y, kind, mats) {
  if (kind === 'park') {
    // A small park: trees around a central bench, flowerbeds in the corners.
    buildProp(group, world, x, z, y, 'bench', mats);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.4;
      buildProp(group, world, x + Math.cos(a) * 5, z + Math.sin(a) * 5, y, 'tree', mats);
      buildProp(group, world, x + Math.cos(a + 0.8) * 3.5, z + Math.sin(a + 0.8) * 3.5, y, 'flowers', mats);
    }
  } else if (kind === 'orchard') {
    // Rows of trees with bushes between them.
    for (let r = -1; r <= 1; r++) for (let cI = -1; cI <= 1; cI++) {
      if (r === 0 && cI === 0) { buildProp(group, world, x, z, y, 'well', mats); continue; }
      buildProp(group, world, x + cI * 4.5, z + r * 4.5, y, (r + cI) % 2 ? 'tree' : 'bush', mats);
    }
  } else if (kind === 'market') {
    // An open-air market square: several stalls, crates and a lamp.
    buildProp(group, world, x - 4, z - 3, y, 'stall', mats);
    buildProp(group, world, x + 4, z - 3, y, 'stall', mats);
    buildProp(group, world, x, z + 4, y, 'stall', mats);
    buildProp(group, world, x, z, y, 'lamp', mats);
    buildProp(group, world, x - 3, z + 2, y, 'crate', mats);
    buildProp(group, world, x + 3, z + 2, y, 'barrel', mats);
  } else { // wellyard
    buildProp(group, world, x, z, y, 'well', mats);
    buildProp(group, world, x - 4, z - 4, y, 'tree', mats);
    buildProp(group, world, x + 4, z + 3, y, 'hay', mats);
    buildProp(group, world, x + 4, z - 4, y, 'flowers', mats);
    buildProp(group, world, x - 4, z + 4, y, 'cart', mats);
  }
}

// Decoration belt OUTSIDE the irregular wall: a band of trees and bushes hugging
// every boundary cell (skipping gate edges), plus a lamp-lit approach road south.
function buildOutskirts(group, world, cx, cz, y, cell, mats) {
  const half = cell / 2, m = 6;        // belt sits ~6m beyond each boundary edge
  for (const { col, row } of CAPITAL_CELLS.list) {
    const ccx = cx + col * cell, ccz = cz + row * cell;
    for (const side of ['N', 'S', 'E', 'W']) {
      const [dx, dz] = SIDE_D[side];
      if (cellInCity(col + dx, row + dz)) continue;
      if (isGate(col, row, side)) continue;          // keep gate approaches open
      // Two pieces of greenery just outside this boundary edge.
      const ex = ccx + dx * (half + m), ez = ccz + dz * (half + m);
      const tx = dz !== 0 ? cell * 0.28 : 0, tz = dx !== 0 ? cell * 0.28 : 0;
      const k = (col * 5 + row * 11) & 3;
      buildProp(group, world, ex - tx, ez - tz, y, k === 0 ? 'bush' : 'tree', mats);
      buildProp(group, world, ex + tx, ez + tz, y, k === 1 ? 'tree' : 'bush', mats);
    }
  }

  // A lamp-lit approach road out of each USABLE gate (south, east, west). Each
  // road runs straight out from the gate, flanked by lamps and trees, dressed
  // with carts/hay/a stall so all three exits feel like real travelled roads.
  for (const g of CAPITAL_GATES) {
    if (g.side === 'N') continue;                  // north gate is decorative (keep)
    const [dx, dz] = SIDE_D[g.side];
    // Gate opening center, just outside the wall.
    const gx = cx + (g.col + dx * 0.5) * cell, gz = cz + (g.row + dz * 0.5) * cell;
    const roadLen = 36;
    const horizontal = dx !== 0;                   // road runs along x (E/W) or z (S/N)
    const road = new THREE.Mesh(
      horizontal ? new THREE.BoxGeometry(roadLen, 0.2, 8) : new THREE.BoxGeometry(8, 0.2, roadLen),
      mats.stone);
    road.position.set(gx + dx * roadLen / 2, y - 0.04, gz + dz * roadLen / 2);
    group.add(road);
    // Perpendicular offset (the road's "sides") for flanking props.
    const px = dz, pz = dx;
    for (let i = 1; i <= 5; i++) {
      const rx = gx + dx * i * (roadLen / 6), rz = gz + dz * i * (roadLen / 6);
      buildProp(group, world, rx - px * 6, rz - pz * 6, y, i % 2 ? 'lamp' : 'tree', mats);
      buildProp(group, world, rx + px * 6, rz + pz * 6, y, i % 2 ? 'tree' : 'lamp', mats);
    }
    // A few road-side details, varied per gate.
    buildProp(group, world, gx + dx * 9 - px * 7.5, gz + dz * 9 - pz * 7.5, y, 'cart', mats);
    buildProp(group, world, gx + dx * 22 + px * 7.5, gz + dz * 22 + pz * 7.5, y, 'hay', mats);
    buildProp(group, world, gx + dx * 31 + px * 7, gz + dz * 31 + pz * 7, y, g.side === 'S' ? 'stall' : 'statue', mats);
  }
}

// Gate edges, as { col, row, side } where `side` is the boundary edge of that
// masked cell that opens (N=-z, S=+z, E=+x, W=-x). Each must be a real boundary
// edge (the neighbor in that direction is outside the mask). The south gate by
// the market is the main entrance the spawn/approach-road line up with.
const CAPITAL_GATES = [
  { col: 0, row: 3, side: 'S' },    // main south gate (lines up with the spawn/road)
  { col: 7, row: 0, side: 'E' },    // east gate at the long body's tip
  { col: -7, row: 0, side: 'W' },   // west gate
  { col: 0, row: -3, side: 'N' },   // north gate by the keep
];
const isGate = (col, row, side) => CAPITAL_GATES.some((g) => g.col === col && g.row === row && g.side === side);
// Direction deltas for neighbor lookups.
const SIDE_D = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

// Paved earth slab under each masked cell (no grass peeks between the blocks).
function buildMaskGround(group, cx, cz, y, cell, mats) {
  for (const { col, row } of CAPITAL_CELLS.list) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(cell + 1, 0.3, cell + 1), mats.dirt);
    slab.position.set(cx + col * cell, y - 0.16, cz + row * cell);
    group.add(slab);
  }
}

// Streets along every shared edge between two masked cells, so paving only
// appears inside the city. A darker plaza disc marks the center.
function buildMaskStreets(group, cx, cz, y, cell, street, mats) {
  const drawn = new Set();
  for (const { col, row } of CAPITAL_CELLS.list) {
    // Avenue strip on the west edge and cross-street on the north edge of each
    // cell; dedupe so shared edges aren't double-drawn.
    for (const [side, dx, dz] of [['W', -1, 0], ['N', 0, -1], ['E', 1, 0], ['S', 0, 1]]) {
      if (!cellInCity(col + dx, row + dz)) continue;          // only between two inside cells
      const key = [Math.min(col, col + dx), Math.min(row, row + dz), dx === 0 ? 'h' : 'v'].join(',');
      if (drawn.has(key)) continue;
      drawn.add(key);
      const ex = cx + (col + dx * 0.5) * cell, ez = cz + (row + dz * 0.5) * cell;
      const geo = dx === 0
        ? new THREE.BoxGeometry(cell, 0.2, street)
        : new THREE.BoxGeometry(street, 0.2, cell);
      const s = new THREE.Mesh(geo, mats.stone);
      s.position.set(ex, y - 0.04, ez);
      group.add(s);
    }
  }
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(cell * 0.62, cell * 0.62, 0.3, 40), mats.stoneDark);
  plaza.position.set(cx, y - 0.02, cz);
  group.add(plaza);
}

// Wall that traces the OUTER boundary of the masked footprint: for every masked
// cell, any side whose neighbor is outside the city gets a wall segment (unless
// it's a gate). Towers rise where boundary edges turn a corner and beside gates.
function buildMaskWall(group, world, cx, cz, y, cell, mats) {
  const H = 4.2, T = 1.2, half = cell / 2;
  const seg = (mx, mz, horizontal, gap) => {
    // One boundary edge centered at (mx,mz). `gap` carves a gate opening.
    const len = cell;
    const pieces = gap
      ? [[-(len / 2), -(len / 2 - (len - 9) / 2)], [(len / 2 - (len - 9) / 2), len / 2]]
      : [[-len / 2, len / 2]];
    for (const [a, b] of pieces) {
      const mid = (a + b) / 2, plen = b - a;
      if (plen < 0.3) continue;
      const wx = horizontal ? mx + mid : mx;
      const wz = horizontal ? mz : mz + mid;
      const geo = horizontal
        ? new THREE.BoxGeometry(plen, H, T)
        : new THREE.BoxGeometry(T, H, plen);
      const m = new THREE.Mesh(geo, mats.stone);
      m.position.set(wx, y + H / 2, wz);
      group.add(m);
      world && world.addSolid(wx, wz, plen * 0.5 + 0.3);
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, T), mats.stoneDark);
      tooth.position.set(wx, y + H + 0.2, wz);
      if (!horizontal) tooth.rotation.y = Math.PI / 2;
      group.add(tooth);
    }
  };
  const tower = (tx, tz) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 6.5, 12), mats.stone);
    t.position.set(tx, y + 3.25, tz);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2, 2.3, 12), mats.roof);
    cap.position.set(tx, y + 7.7, tz);
    group.add(t, cap);
    world && world.addSolid(tx, tz, 1.8);
  };
  const towerAt = new Set();
  for (const { col, row } of CAPITAL_CELLS.list) {
    const ccx = cx + col * cell, ccz = cz + row * cell;
    for (const side of ['N', 'S', 'E', 'W']) {
      const [dx, dz] = SIDE_D[side];
      if (cellInCity(col + dx, row + dz)) continue;          // interior edge, skip
      const gate = isGate(col, row, side);
      if (side === 'N') seg(ccx, ccz - half, true, gate);
      else if (side === 'S') seg(ccx, ccz + half, true, gate);
      else if (side === 'E') seg(ccx + half, ccz, false, gate);
      else seg(ccx - half, ccz, false, gate);
      // Tower at each end of a gate, and at convex corners of the footprint.
      if (gate) {
        if (side === 'N' || side === 'S') {
          towerAt.add(`${ccx - 5.5},${side === 'N' ? ccz - half : ccz + half}`);
          towerAt.add(`${ccx + 5.5},${side === 'N' ? ccz - half : ccz + half}`);
        } else {
          towerAt.add(`${side === 'E' ? ccx + half : ccx - half},${ccz - 5.5}`);
          towerAt.add(`${side === 'E' ? ccx + half : ccx - half},${ccz + 5.5}`);
        }
      }
    }
    // A tower on an outside corner (two adjacent sides both boundary).
    const N = !cellInCity(col, row - 1), S = !cellInCity(col, row + 1);
    const E = !cellInCity(col + 1, row), W = !cellInCity(col - 1, row);
    if (N && W) towerAt.add(`${ccx - half},${ccz - half}`);
    if (N && E) towerAt.add(`${ccx + half},${ccz - half}`);
    if (S && W) towerAt.add(`${ccx - half},${ccz + half}`);
    if (S && E) towerAt.add(`${ccx + half},${ccz + half}`);
  }
  for (const key of towerAt) {
    const [tx, tz] = key.split(',').map(Number);
    tower(tx, tz);
  }
}

// Build the per-style material set (shared across one city's buildings).
function makeStyleMats(st) {
  const M = (color, extra) => new THREE.MeshLambertMaterial({ color, ...(extra || {}) });
  return {
    wall: M(st.wall), wall2: M(st.wall2), roof: M(st.roof), roof2: M(st.roof2),
    shop: M(0xe0b441), depot: M(0x6a4a2a), stone: M(st.stone), stoneDark: M(st.stone & 0xfefefe),
    temple: M(0xe8e2d0), door: M(0x4a3220), glass: M(0x9fd6e8), wood: M(0x6a4a30),
    water: M(0x3a86c9, { transparent: true, opacity: 0.8 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffd27a }),
    portal: new THREE.MeshBasicMaterial({ color: 0x7e5bef }),
    leaf: M(0x4a8f44), gold: M(0xd9b34a), potionR: M(0xe23b3b), potionB: M(0x3b6be2),
    book: M(0x9a3b3b), metal: M(0x9aa0ab),
    // Extra palette for the grid city: packed-earth between cobbles, an awning
    // green and a warm food/tavern tone.
    dirt: M(0x9c8a63), awning: M(0x4f7a3a), food: M(0xc06a32), cloth: M(0xb44d7a),
  };
}

// A small house: a solid box with a roof, door and windows. Not enterable, so
// when `solid` is set it registers one collision circle over its footprint.
function buildHouse(group, world, x, z, y, opts = {}) {
  const w = opts.w || 5, d = opts.d || 5, wallH = opts.wallH || 3.2;
  const rot = opts.rot || 0;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), opts.wall);
  wall.position.set(x, y + wallH / 2, z);
  wall.rotation.y = rot;
  const pitched = opts.pitched !== false;
  const roof = pitched
    ? new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.8, 2.2, 4), opts.roof)
    : new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), opts.roof);
  roof.position.set(x, y + wallH + (pitched ? 1.1 : 0.25), z);
  roof.rotation.y = rot + (pitched ? Math.PI / 4 : 0);
  group.add(wall, roof);
  if (opts.solid && world) world.addSolid(x, z, Math.max(w, d) * 0.5);

  // Door and windows sit on the front face (+z before rotation).
  const fx = Math.sin(rot), fz = Math.cos(rot);   // front normal
  const sx = Math.cos(rot), sz = -Math.sin(rot);  // side axis
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.1), opts.door);
  door.position.set(x + fx * (d / 2 + 0.02), y + 0.85, z + fz * (d / 2 + 0.02));
  door.rotation.y = rot;
  group.add(door);
  // Ground-floor windows flank the door; two-floor houses add an upper row.
  const rows = opts.twoFloor ? [wallH * 0.42, wallH * 0.78] : [wallH * 0.62];
  for (const wy of rows) {
    for (const s of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.08), opts.glass);
      win.position.set(
        x + fx * (d / 2 + 0.02) + sx * s * (w * 0.28),
        y + wy,
        z + fz * (d / 2 + 0.02) + sz * s * (w * 0.28));
      win.rotation.y = rot;
      // Shutters either side of each window for a Tibian timbered look.
      group.add(win);
    }
  }
  // A small awning over the door (uses the wood tone if provided).
  if (opts.awning && opts.wood) {
    const aw = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.7), opts.awning);
    aw.position.set(x + fx * (d / 2 + 0.4), y + 1.9, z + fz * (d / 2 + 0.4));
    aw.rotation.y = rot; aw.rotation.x = 0.18;
    group.add(aw);
  }
  // A brick chimney with a wisp of a cap on bigger homes.
  if (opts.chimney) {
    const cx = x + sx * (w * 0.3), cz = z + sz * (w * 0.3);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), opts.roof);
    ch.position.set(cx, y + wallH + 1.2, cz); ch.rotation.y = rot;
    group.add(ch);
  }
}

// A two-floor town hall: stacked stone blocks, a clock-tower-ish roof and a sign.
function buildTownHall(group, world, x, z, y, mats) {
  const ground = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 7), mats.wall);
  ground.position.set(x, y + 2, z);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 5.4), mats.wall2);
  upper.position.set(x, y + 5.7, z);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3, 4), mats.roof2);
  roof.position.set(x, y + 8.9, z);
  roof.rotation.y = Math.PI / 4;
  group.add(ground, upper, roof);
  if (world) world.addSolid(x, z, 4.4);

  // Tall double doors and a row of windows on the ground floor.
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.12), mats.door);
  door.position.set(x, y + 1.3, z + 3.55);
  group.add(door);
  for (let i = -1; i <= 1; i += 2) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.1), mats.glass);
    win.position.set(x + i * 2.6, y + 2.6, z + 3.55);
    group.add(win);
    const winU = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), mats.glass);
    winU.position.set(x + i * 1.8, y + 5.8, z + 2.75);
    group.add(winU);
  }
  // Flag poles flanking the entrance.
  for (const s of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), mats.wood);
    pole.position.set(x + s * 3.6, y + 2, z + 3.4);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.06), mats.roof);
    flag.position.set(x + s * 3.15, y + 3.6, z + 3.4);
    group.add(pole, flag);
  }
}

// Round towns now open all FOUR cardinal gates (north, south, east, west)
// instead of one, so every town has plenty of clearly-marked ways out — the user
// asked for ≥3 exits shown on the map. These are the bearings the wall leaves
// open and that cityGates() reports for the map markers. Math.PI*1.5 points to
// -Z (the top of the map = north), where the spawn sits, so that gate is the one
// the player arrives at.
const ROUND_GATE_BEARINGS = [Math.PI * 1.5, Math.PI * 0.5, 0, Math.PI];  // N, S, E, W
// How close (in radians) a bearing must be to a gate bearing to count as "on a
// gate" — used to leave wall gaps, clear the tree ring, and place gate towers.
const GATE_HALF_ANGLE = 0.18;
function nearAnyGate(a, bearings = ROUND_GATE_BEARINGS, half = GATE_HALF_ANGLE) {
  for (const g of bearings) {
    if (Math.abs(((a - g + Math.PI) % (Math.PI * 2)) - Math.PI) < half) return true;
  }
  return false;
}

// World-space gate points for a city, for the map to mark its exits. Round towns
// report their four cardinal gates on the wall; the grid capital reports its
// three usable gates (south, east, west — the north gate is a decorative keep
// arch). Either way every city shows at least three marked ways out.
export function cityGates(city) {
  const st = styleFor(city);
  if (st.grid) {
    const cell = GRID.cell;
    return CAPITAL_GATES.filter((g) => g.side !== 'N').map((g) => {
      const [dx, dz] = SIDE_D[g.side];
      return { x: city.x + (g.col + dx * 0.5) * cell, z: city.z + (g.row + dz * 0.5) * cell };
    });
  }
  const r = st.radius - 3;
  return ROUND_GATE_BEARINGS.map((a) => ({ x: city.x + Math.cos(a) * r, z: city.z + Math.sin(a) * r }));
}

// A stone wall around the town. When `shape` is given the wall traces a POLYGON
// (straight runs of stone between corner towers — so the desert city is a hard
// rectangle, the frost town a diamond, etc.); otherwise it falls back to the old
// circular ring. Either way it's solid, with the four cardinal gates left open
// (N, S, E, W), and the shape matches what the map outline and in-city test use.
function buildWall(group, world, cx, cz, y, radius, mats, shape) {
  if (shape) {
    // Polygon wall: build each edge as a row of short wall blocks between the
    // shape's corners (with a tower at every corner), leaving a gate gap on the
    // edges nearest the four cardinals so the town has a way out each direction.
    const pts = townPolygon(cx, cz, radius, shape);
    const n = pts.length;
    // Pick the edge nearest each gate bearing; open all of them.
    const gateEdges = new Set();
    for (const gA of ROUND_GATE_BEARINGS) {
      let edge = 0, bestD = Infinity;
      for (let i = 0; i < n; i++) {
        const mx = (pts[i].x + pts[(i + 1) % n].x) / 2, mz = (pts[i].z + pts[(i + 1) % n].z) / 2;
        const a = Math.atan2(mz - cz, mx - cx);
        const d = Math.abs(((a - gA + Math.PI) % (Math.PI * 2)) - Math.PI);
        if (d < bestD) { bestD = d; edge = i; }
      }
      gateEdges.add(edge);
    }
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const ex = b.x - a.x, ez = b.z - a.z;
      const len = Math.hypot(ex, ez);
      const rot = Math.atan2(ez, ex);
      const blocks = Math.max(2, Math.round(len / 4));
      for (let k = 0; k < blocks; k++) {
        const t0 = k / blocks, t1 = (k + 1) / blocks, tm = (t0 + t1) / 2;
        // Leave a gap in the middle of every gate edge.
        if (gateEdges.has(i) && tm > 0.38 && tm < 0.62) continue;
        const wx = a.x + ex * tm, wz = a.z + ez * tm;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(len / blocks * 1.04, 3.6, 1.2), mats.stone);
        seg.position.set(wx, y + 1.8, wz);
        seg.rotation.y = -rot;
        group.add(seg);
        if (world) world.addSolid(wx, wz, (len / blocks) * 0.55);
        if (k % 2 === 0) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 1.2), mats.stoneDark);
          tooth.position.set(wx, y + 3.9, wz); tooth.rotation.y = -rot;
          group.add(tooth);
        }
      }
      // Corner tower.
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 6, 10), mats.stone);
      tower.position.set(a.x, y + 3, a.z);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.0, 2.2, 10), mats.roof);
      cap.position.set(a.x, y + 7.1, a.z);
      group.add(tower, cap);
      if (world) world.addSolid(a.x, a.z, 1.9);
    }
    return;
  }

  // --- Legacy circular ring (kept for any unshaped town) ---
  const segs = Math.max(40, Math.round(radius * 0.9));
  const gateHalf = 0.16;
  const segLen = (2 * Math.PI * radius) / segs * 1.05;
  const segGeo = new THREE.BoxGeometry(segLen, 3.4, 1.1);
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    if (nearAnyGate(a, ROUND_GATE_BEARINGS, gateHalf)) continue;   // leave each gate open
    const wx = cx + Math.cos(a) * radius;
    const wz = cz + Math.sin(a) * radius;
    const seg = new THREE.Mesh(segGeo, mats.stone);
    seg.position.set(wx, y + 1.7, wz);
    seg.rotation.y = -a + Math.PI / 2;
    group.add(seg);
    if (world) world.addSolid(wx, wz, segLen * 0.5);
    if (i % 2 === 0) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.1), mats.stoneDark);
      tooth.position.set(wx, y + 3.7, wz);
      tooth.rotation.y = -a + Math.PI / 2;
      group.add(tooth);
    }
  }
  // Gate towers flanking each of the three openings.
  for (const gateA of ROUND_GATE_BEARINGS) {
    for (const s of [-1, 1]) {
      const a = gateA + s * (gateHalf + 0.08);
      const tx = cx + Math.cos(a) * radius;
      const tz = cz + Math.sin(a) * radius;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 5, 10), mats.stone);
      tower.position.set(tx, y + 2.5, tz);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.8, 10), mats.roof);
      cap.position.set(tx, y + 5.9, tz);
      group.add(tower, cap);
    }
  }
}

// Paved plaza and radial streets out to each district, scaled to the city size.
function buildStreets(group, cx, cz, y, R, mats) {
  const plazaR = Math.max(15, R * 0.3);
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(plazaR, plazaR, 0.3, 40), mats.stone);
  plaza.position.set(cx, y - 0.1, cz);
  group.add(plaza);
  // Cracked-tile look: a slightly darker inner ring.
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(plazaR * 0.45, plazaR * 0.45, 0.32, 40), mats.stoneDark);
  inner.position.set(cx, y - 0.08, cz);
  group.add(inner);
  // Streets fan out to each district plus the cardinal directions.
  const ends = [...DISTRICTS.map((d) => d.angle), 0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  for (const a of ends) {
    const len = R - 4;
    const street = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, len), mats.stoneDark);
    street.position.set(cx + Math.cos(a) * (len / 2 + 4), y - 0.05, cz + Math.sin(a) * (len / 2 + 4));
    street.rotation.y = -a + Math.PI / 2;
    group.add(street);
  }
}

// One district: a big enterable themed building (with an NPC walking inside) plus
// a couple of houses and decoration. Returns the interior center {x,z} so the
// matching vendor NPC can be placed to roam inside.
function buildDistrict(group, world, x, z, y, facing, key, mats, st) {
  const inside = buildEnterable(group, world, x, z, y, facing, key, mats, st);

  // A house or two flanking the main building so the district reads fuller.
  const sx = Math.cos(facing), sz = -Math.sin(facing);
  buildHouse(group, world, x + sx * 11, z + sz * 11, y, {
    w: 4.5, d: 4.5, wall: mats.wall, roof: mats.roof, door: mats.door, glass: mats.glass,
    rot: facing, pitched: st.pitched, solid: true,
  });
  buildHouse(group, world, x - sx * 11, z - sz * 11, y, {
    w: 4.5, d: 4.5, wall: mats.wall2, roof: mats.roof2, door: mats.door, glass: mats.glass,
    rot: facing, pitched: st.pitched, solid: true,
  });

  // Street decoration in front of the building.
  buildProp(group, world, x + Math.sin(facing) * 5.5 + sx * 2, z + Math.cos(facing) * 5.5 + sz * 2, y, 'crate', mats);
  buildProp(group, world, x + Math.sin(facing) * 5.5 - sx * 2, z + Math.cos(facing) * 5.5 - sz * 2, y, 'barrel', mats);
  return inside;
}

// Wall / sign / decor palette per shop trade. Used by buildShop so each named
// capital building reads as its trade from the street and from inside.
const SHOP_LOOK = {
  bank:     { wall: 'stone', sign: 'gold',    decor: 'bank' },
  market:   { wall: 'shop',  sign: 'gold',    decor: 'market' },
  potion:   { wall: 'wall2', sign: 'potionR', decor: 'potion' },
  food:     { wall: 'food',  sign: 'awning',  decor: 'food' },
  knight:   { wall: 'stone', sign: 'metal',   decor: 'knight' },
  archer:   { wall: 'wall',  sign: 'leaf',    decor: 'archer' },
  mage:     { wall: 'glass', sign: 'portal',  decor: 'mage' },
  bag:      { wall: 'cloth', sign: 'cloth',   decor: 'bag' },
  townhall: { wall: 'temple',sign: 'roof',    decor: 'townhall' },
  library:  { wall: 'wall',  sign: 'book',    decor: 'library' },
  temple2:  { wall: 'stone', sign: 'metal',   decor: 'keep' },
  tavern:   { wall: 'food',  sign: 'awning',  decor: 'tavern' },
  jeweler:  { wall: 'wall2', sign: 'portal',  decor: 'jeweler' },
};

// A named capital building you can walk into. Generalizes buildEnterable: bigger
// footprint for `lot.big`, a spire for `lot.tower` (mage), trade-specific wall
// color, sign and interior. Returns the interior center {x,z} (NPC roams here).
function buildShop(group, world, x, z, y, facing, lot, mats, st) {
  const look = SHOP_LOOK[lot.kind] || SHOP_LOOK.market;
  const W = lot.big ? 15 : 12, D = lot.big ? 14 : 12, H = lot.big ? 5.4 : 4.4, T = 0.6;
  const wallMat = mats[look.wall] || mats.shop;
  const fx = Math.sin(facing), fz = Math.cos(facing);
  const sx = Math.cos(facing), sz = -Math.sin(facing);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), mats.stone);
  floor.position.set(x, y + 0.1, z); floor.rotation.y = facing;
  group.add(floor);

  const wallSeg = (lx, lz, ww, dd) => {
    const wx = x + sx * lx + fx * lz;
    const wz = z + sz * lx + fz * lz;
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww, H, dd), wallMat);
    m.position.set(wx, y + H / 2, wz); m.rotation.y = facing;
    group.add(m);
    const span = Math.max(ww, dd);
    const along = ww >= dd;
    const n = Math.max(1, Math.round(span / 1.2));
    for (let i = 0; i < n; i++) {
      const o = (n === 1) ? 0 : (i / (n - 1) - 0.5) * span;
      const ox = along ? o : 0, oz = along ? 0 : o;
      world && world.addSolid(wx + sx * ox + fx * oz, wz + sz * ox + fz * oz, 0.6);
    }
  };

  const doorGap = 3;
  const sidePiece = (W - doorGap) / 2;
  wallSeg(-(doorGap / 2 + sidePiece / 2), D / 2, sidePiece, T);
  wallSeg(+(doorGap / 2 + sidePiece / 2), D / 2, sidePiece, T);
  wallSeg(0, -D / 2, W, T);
  wallSeg(-W / 2, 0, T, D);
  wallSeg(+W / 2, 0, T, D);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorGap + 0.4, 0.7, T), wallMat);
  lintel.position.set(x + fx * (D / 2), y + H - 0.35, z + fz * (D / 2));
  lintel.rotation.y = facing;
  group.add(lintel);

  // Roof: pitched gable for most, a tall spire for the mage tower.
  if (lot.tower) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.34, W * 0.4, 5, 12), wallMat);
    drum.position.set(x, y + H + 2.5, z);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(W * 0.4, 6, 12), mats.roof);
    spire.position.set(x, y + H + 8, z);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), mats.portal);
    orb.position.set(x, y + H + 11.4, z);
    group.add(drum, spire, orb);
  } else {
    const roof = st.pitched
      ? new THREE.Mesh(new THREE.ConeGeometry(W * 0.75, 3.4, 4), mats.roof)
      : new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.6, D + 0.6), mats.roof);
    roof.position.set(x, y + H + (st.pitched ? 1.5 : 0.3), z);
    roof.rotation.y = facing + (st.pitched ? Math.PI / 4 : 0);
    group.add(roof);
  }

  // Hanging trade sign over the door.
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 0.14), mats[look.sign] || mats.gold);
  sign.position.set(x + fx * (D / 2 + 0.4), y + 3.1, z + fz * (D / 2 + 0.4));
  sign.rotation.y = facing;
  group.add(sign);

  // Two lamp posts flanking the entrance + a couple of crates/barrels outside.
  buildProp(group, world, x + fx * (D / 2 + 2.5) + sx * 2.6, z + fz * (D / 2 + 2.5) + sz * 2.6, y, 'lamp', mats);
  buildProp(group, world, x + fx * (D / 2 + 2.5) - sx * 2.6, z + fz * (D / 2 + 2.5) - sz * 2.6, y, 'lamp', mats);

  decorateInterior(group, x, z, y, facing, look.decor, mats);
  return { x, z };
}

// A big building you can walk into: four solid walls with a doorway gap on the
// front face, an open interior with themed decor and a counter the NPC stands
// behind. Returns the interior center {x,z}. Door faces `facing` (toward plaza).
function buildEnterable(group, world, x, z, y, facing, key, mats, st) {
  const W = 11, D = 11, H = 4.2, T = 0.5; // footprint, wall height, thickness
  const wallMat = key === 'mage' ? mats.glass : key === 'knight' ? mats.stone
    : key === 'potion' ? mats.wall2 : key === 'library' ? mats.wall : mats.shop;
  // Local axes: f = front normal (door side), s = side axis.
  const fx = Math.sin(facing), fz = Math.cos(facing);
  const sx = Math.cos(facing), sz = -Math.sin(facing);

  // Floor slab.
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), mats.stone);
  floor.position.set(x, y + 0.1, z);
  floor.rotation.y = facing;
  group.add(floor);

  // Helper to drop a wall box at a local offset and register collision along it.
  const wallSeg = (lx, lz, ww, dd) => {
    const wx = x + sx * lx + fx * lz;
    const wz = z + sz * lx + fz * lz;
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww, H, dd), wallMat);
    m.position.set(wx, y + H / 2, wz);
    m.rotation.y = facing;
    group.add(m);
    // Collision: a row of circles along the longer span.
    const span = Math.max(ww, dd);
    const along = ww >= dd; // circles run along x-local or z-local
    const n = Math.max(1, Math.round(span / 1.2));
    for (let i = 0; i < n; i++) {
      const o = (n === 1) ? 0 : (i / (n - 1) - 0.5) * span;
      const ox = along ? o : 0, oz = along ? 0 : o;
      world && world.addSolid(wx + sx * ox + fx * oz, wz + sz * ox + fz * oz, 0.55);
    }
  };

  const doorGap = 2.6;
  // Front wall split into two pieces leaving a central doorway.
  const sidePiece = (W - doorGap) / 2;
  wallSeg(-(doorGap / 2 + sidePiece / 2), D / 2, sidePiece, T);
  wallSeg(+(doorGap / 2 + sidePiece / 2), D / 2, sidePiece, T);
  // Back wall (solid) and two side walls.
  wallSeg(0, -D / 2, W, T);
  wallSeg(-W / 2, 0, T, D);
  wallSeg(+W / 2, 0, T, D);

  // Lintel over the doorway + a flat roof slab.
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorGap + 0.4, 0.6, T), wallMat);
  lintel.position.set(x + fx * (D / 2), y + H - 0.3, z + fz * (D / 2));
  lintel.rotation.y = facing;
  const roof = st.pitched
    ? new THREE.Mesh(new THREE.ConeGeometry(W * 0.78, 3, 4), mats.roof)
    : new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.6, D + 0.6), mats.roof);
  roof.position.set(x, y + H + (st.pitched ? 1.3 : 0.3), z);
  roof.rotation.y = facing + (st.pitched ? Math.PI / 4 : 0);
  group.add(lintel, roof);

  // A hanging sign over the door, colored by trade.
  const signMat = key === 'mage' ? mats.portal : key === 'knight' ? mats.metal
    : key === 'potion' ? mats.potionR : key === 'library' ? mats.book : mats.gold;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.12), signMat);
  sign.position.set(x + fx * (D / 2 + 0.4), y + 2.9, z + fz * (D / 2 + 0.4));
  sign.rotation.y = facing;
  group.add(sign);

  // Interior decor + a counter near the back, themed by trade.
  decorateInterior(group, x, z, y, facing, key, mats);
  return { x, z }; // NPC roams around the interior center
}

// Themed clutter inside an enterable building: potion shelves, weapon racks,
// bookcases, market stalls, magic orbs — so each shop looks the part inside.
function decorateInterior(group, x, z, y, facing, key, mats) {
  const fx = Math.sin(facing), fz = Math.cos(facing);
  const sx = Math.cos(facing), sz = -Math.sin(facing);
  const at = (lx, lz) => ({ x: x + sx * lx + fx * lz, z: z + sz * lx + fz * lz });

  // A wooden counter near the back where the NPC stands.
  const cpos = at(0, -2.6);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(5, 1.1, 0.9), mats.wood);
  counter.position.set(cpos.x, y + 0.55, cpos.z);
  counter.rotation.y = facing;
  group.add(counter);

  // Back shelves: a tall plank wall full of trade-specific items.
  const shelfMat = mats.wood;
  for (const lx of [-3.5, 3.5]) {
    const p = at(lx, -4);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3, 5), shelfMat);
    shelf.position.set(p.x, y + 1.5, p.z); shelf.rotation.y = facing;
    group.add(shelf);
  }

  const item = (lx, lz, h, mat, r = 0.18) => {
    const p = at(lx, lz);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), mat);
    m.position.set(p.x, y + 0.55 + 1.1 + h / 2 - 1.1, p.z); // sit on a shelf row
    m.position.y = y + 1.5 + (Math.random() - 0.5) * 1.6;
    group.add(m);
  };

  if (key === 'potion') {
    // Rows of red/blue potion bottles on the shelves + a cauldron.
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 3.5 : -3.5;
      item(side, -4, 0.5, i % 2 ? mats.potionR : mats.potionB, 0.15);
    }
    const caul = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.metal);
    const cp = at(-2, 1); caul.position.set(cp.x, y + 0.55, cp.z); group.add(caul);
  } else if (key === 'knight') {
    // Weapon racks: a few swords leaning, plus an anvil.
    for (let i = 0; i < 6; i++) {
      const p = at(-3.5 + (i % 2) * 7, -4);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.04), mats.metal);
      blade.position.set(p.x, y + 1.6, p.z + (i - 3) * 0.001); group.add(blade);
    }
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.5), mats.stoneDark);
    const ap = at(2.4, 1); anvil.position.set(ap.x, y + 0.45, ap.z); group.add(anvil);
  } else if (key === 'mage') {
    // Glowing orbs and a staff stand.
    for (let i = 0; i < 4; i++) {
      const p = at(-3 + i * 2, -3.8);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mats.portal);
      orb.position.set(p.x, y + 1.9, p.z); group.add(orb);
    }
  } else if (key === 'library') {
    // Tall bookcases in rows filling the hall.
    for (let r = -1; r <= 1; r++) {
      for (const lx of [-3.5, 3.5]) {
        const p = at(lx, r * 2.6);
        const bc = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 2.2), mats.wood);
        bc.position.set(p.x, y + 1.5, p.z); bc.rotation.y = facing; group.add(bc);
        const books = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 2), mats.book);
        books.position.set(p.x + fx * 0.2, y + 1.5, p.z + fz * 0.2); books.rotation.y = facing; group.add(books);
      }
    }
  } else if (key === 'bank') {
    // Stacks of gold coins on the counter and a strongbox vault behind.
    for (let i = 0; i < 6; i++) {
      const p = at(-2 + i * 0.8, -2.2);
      const coins = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.3 + (i % 3) * 0.15, 10), mats.gold);
      coins.position.set(p.x, y + 1.25, p.z); group.add(coins);
    }
    const vault = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 0.6), mats.metal);
    const vp = at(0, -4); vault.position.set(vp.x, y + 1.4, vp.z); vault.rotation.y = facing;
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12), mats.gold);
    dial.position.set(vp.x + fx * 0.4, y + 1.4, vp.z + fz * 0.4); dial.rotation.x = Math.PI / 2;
    group.add(vault, dial);
  } else if (key === 'food') {
    // Hanging hams, bread loaves and a stew pot.
    for (let i = 0; i < 5; i++) {
      const p = at(-3 + i * 1.5, -3.9);
      const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mats.food);
      loaf.position.set(p.x, y + 1.7, p.z); loaf.scale.y = 0.6; group.add(loaf);
    }
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.metal);
    const pp = at(2.2, 0.5); pot.position.set(pp.x, y + 0.55, pp.z); group.add(pot);
    // A couple of dining tables.
    for (const lx of [-2.5, 2.5]) {
      const tp = at(lx, 2.5);
      const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 1), mats.wood);
      table.position.set(tp.x, y + 0.8, tp.z); table.rotation.y = facing; group.add(table);
    }
  } else if (key === 'archer') {
    // Bows leaning on the rack and quivers of arrows.
    for (let i = 0; i < 4; i++) {
      const p = at(-3 + i * 2, -4);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 6, 12, Math.PI), mats.wood);
      bow.position.set(p.x, y + 1.7, p.z); bow.rotation.y = facing; group.add(bow);
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.9, 8), mats.leaf);
      quiver.position.set(p.x + sx * 0.5, y + 0.95, p.z + sz * 0.5); group.add(quiver);
    }
  } else if (key === 'bag') {
    // Backpacks and sacks of every color piled on the shelves.
    const cols = [mats.cloth, mats.potionB, mats.leaf, mats.gold, mats.potionR];
    for (let i = 0; i < 8; i++) {
      const p = at(-3.5 + (i % 4) * 2.3, i < 4 ? -3.9 : -2.4);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), cols[i % cols.length]);
      bag.position.set(p.x, y + (i < 4 ? 2.1 : 1.1), p.z); bag.rotation.y = facing; group.add(bag);
    }
  } else if (key === 'townhall') {
    // A long council table with a banner behind it.
    const tp = at(0, -3.5);
    const table = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 1.4), mats.wood);
    table.position.set(tp.x, y + 0.9, tp.z); table.rotation.y = facing; group.add(table);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.1), mats.roof);
    const bp = at(0, -4.6); banner.position.set(bp.x, y + 2.6, bp.z); banner.rotation.y = facing; group.add(banner);
  } else if (key === 'keep') {
    // The north keep's hall: a banner, a brazier and stacked shields.
    const banner = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 0.1), mats.roof);
    const bp = at(0, -4.6); banner.position.set(bp.x, y + 2.8, bp.z); banner.rotation.y = facing; group.add(banner);
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 0.6, 8), mats.metal);
    const brp = at(0, 1); brazier.position.set(brp.x, y + 0.9, brp.z); group.add(brazier);
    const fire = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mats.lamp);
    fire.position.set(brp.x, y + 1.4, brp.z); group.add(fire);
    for (let i = 0; i < 4; i++) {
      const p = at(-3 + i * 2, -4);
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 12), mats.metal);
      shield.position.set(p.x, y + 1.8, p.z); shield.rotation.x = Math.PI / 2; group.add(shield);
    }
  } else if (key === 'tavern') {
    // A tavern: round tables with mugs, a keg and a hearth.
    for (const [lx, lz] of [[-2.5, 1.5], [2.5, 1.5], [0, 3]]) {
      const tp = at(lx, lz);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 12), mats.wood);
      top.position.set(tp.x, y + 0.85, tp.z); group.add(top);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 6), mats.wood);
      leg.position.set(tp.x, y + 0.42, tp.z); group.add(leg);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8), mats.gold);
      mug.position.set(tp.x + 0.3, y + 1.03, tp.z); group.add(mug);
    }
    const keg = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 12), mats.wood);
    keg.rotation.z = Math.PI / 2; const kp = at(-3, -3.5); keg.position.set(kp.x, y + 0.6, kp.z); group.add(keg);
  } else if (key === 'jeweler') {
    // A jeweler: a glass display case sparkling with cut gems.
    const cp2 = at(0, -2.6);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 0.9), mats.glass);
    glass.position.set(cp2.x, y + 1.3, cp2.z); glass.rotation.y = facing; group.add(glass);
    const gemMats = [mats.potionB, mats.potionR, mats.portal, mats.leaf, mats.gold];
    for (let i = 0; i < 7; i++) {
      const p = at(-2.2 + i * 0.75, -2.6);
      const gem = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 6), gemMats[i % gemMats.length]);
      gem.position.set(p.x, y + 1.75, p.z); gem.rotation.x = Math.PI; group.add(gem);
    }
  } else { // market
    // Crates and barrels of goods + a fruit stall.
    for (let i = 0; i < 5; i++) {
      const p = at(-3.5 + i * 1.8, -3.8);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mats.wood);
      crate.position.set(p.x, y + 0.45, p.z); group.add(crate);
    }
  }
}

// Small standalone decorations. `kind` selects the shape.
function buildProp(group, world, x, z, y, kind, mats) {
  if (kind === 'barrel') {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.9, 12), mats.wood);
    b.position.set(x, y + 0.45, z);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.04, 6, 14), mats.stoneDark);
    band.rotation.x = Math.PI / 2; band.position.set(x, y + 0.45, z);
    group.add(b, band);
    world && world.addSolid(x, z, 0.45);
  } else if (kind === 'crate') {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mats.wood);
    c.position.set(x, y + 0.4, z);
    c.rotation.y = 0.3;
    // A second crate stacked, sometimes.
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mats.wood);
    c2.position.set(x + 0.2, y + 1.1, z - 0.1); c2.rotation.y = -0.2;
    group.add(c, c2);
    world && world.addSolid(x, z, 0.5);
  } else if (kind === 'cart') {
    // A wooden hand cart: a tilted bed on two wheels with handles.
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.0), mats.wood);
    bed.position.set(x, y + 0.7, z); bed.rotation.z = 0.12;
    const sideA = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), mats.wood);
    sideA.position.set(x, y + 0.95, z + 0.46);
    const sideB = sideA.clone(); sideB.position.z = z - 0.46;
    group.add(bed, sideA, sideB);
    for (const s of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 12), mats.stoneDark);
      wheel.rotation.x = Math.PI / 2; wheel.position.set(x - 0.5, y + 0.4, z + s * 0.5);
      group.add(wheel);
    }
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), mats.wood);
    handle.position.set(x + 1.1, y + 0.95, z); handle.rotation.z = Math.PI / 2.3;
    group.add(handle);
    world && world.addSolid(x, z, 1.0);
  } else if (kind === 'well') {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 1, 14), mats.stone);
    ring.position.set(x, y + 0.5, z);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 14), mats.water);
    water.position.set(x, y + 0.7, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2, 6), mats.wood);
    post.position.set(x + 0.9, y + 1.5, z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.8, 4), mats.roof);
    roof.position.set(x, y + 2.6, z); roof.rotation.y = Math.PI / 4;
    group.add(ring, water, post, roof);
    world && world.addSolid(x, z, 1.0);
  } else if (kind === 'lamp') {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6), mats.stoneDark);
    post.position.set(x, y + 1.3, z);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mats.lamp);
    glow.position.set(x, y + 2.7, z);
    group.add(post, glow);
  } else if (kind === 'orb') {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.9, 8), mats.stone);
    stand.position.set(x, y + 0.45, z);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), mats.portal);
    orb.position.set(x, y + 1.15, z);
    group.add(stand, orb);
  } else if (kind === 'fountain') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.6, 16), mats.stone);
    base.position.set(x, y + 0.3, z);
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.2, 16), mats.water);
    pool.position.set(x, y + 0.62, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.9, 8), mats.stone);
    stem.position.set(x, y + 1, z);
    group.add(base, pool, stem);
    world && world.addSolid(x, z, 1.5);
  } else if (kind === 'tree') {
    // A leafy tree: a trunk with two blobs of foliage. Solid so you walk around.
    const h = 2.6 + (Math.abs(x * 7 + z * 3) % 10) / 10 * 1.4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, h, 7), mats.wood);
    trunk.position.set(x, y + h / 2, z);
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), mats.leaf);
    c1.position.set(x, y + h + 0.6, z);
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), mats.leaf);
    c2.position.set(x + 0.7, y + h + 0.1, z - 0.4);
    group.add(trunk, c1, c2);
    world && world.addSolid(x, z, 0.6);
  } else if (kind === 'bush') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), mats.leaf);
    b.position.set(x, y + 0.6, z); b.scale.y = 0.8;
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mats.leaf);
    b2.position.set(x + 0.6, y + 0.45, z + 0.2); b2.scale.y = 0.8;
    group.add(b, b2);
  } else if (kind === 'flowers') {
    // A little flowerbed: a soil patch dotted with bright petals.
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 1.2), mats.dirt);
    bed.position.set(x, y + 0.09, z);
    group.add(bed);
    const petalMats = [mats.potionR, mats.gold, mats.potionB, mats.cloth];
    for (let i = 0; i < 7; i++) {
      const a = i * 1.7, rr = (i % 3) * 0.35;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4), mats.leaf);
      const fx2 = x + Math.cos(a) * rr, fz2 = z + Math.sin(a) * rr;
      stem.position.set(fx2, y + 0.32, fz2);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), petalMats[i % petalMats.length]);
      bloom.position.set(fx2, y + 0.54, fz2);
      group.add(stem, bloom);
    }
  } else if (kind === 'bench') {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), mats.wood);
    seat.position.set(x, y + 0.5, z);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), mats.wood);
    back.position.set(x, y + 0.8, z - 0.2);
    group.add(seat, back);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.4), mats.stoneDark);
      leg.position.set(x + s * 0.65, y + 0.25, z);
      group.add(leg);
    }
  } else if (kind === 'statue') {
    // A heroic statue on a plinth at a junction or plaza corner.
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.6), mats.stone);
    plinth.position.set(x, y + 0.5, z);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.6, 8), mats.stoneDark);
    body.position.set(x, y + 1.8, z);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mats.stoneDark);
    head.position.set(x, y + 2.8, z);
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.04), mats.metal);
    sword.position.set(x + 0.45, y + 2.4, z);
    group.add(plinth, body, head, sword);
    world && world.addSolid(x, z, 1.0);
  } else if (kind === 'stall') {
    // A market stall: a counter under a striped awning, with crates of goods.
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1), mats.wood);
    counter.position.set(x, y + 0.45, z);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.4), mats.awning);
    awn.position.set(x, y + 2.1, z - 0.2); awn.rotation.x = -0.2;
    group.add(counter, awn);
    for (const s of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6), mats.wood);
      pole.position.set(x + s * 1.2, y + 1.05, z - 0.4);
      group.add(pole);
    }
    const goods = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), mats.food);
    goods.position.set(x - 0.5, y + 1.1, z); group.add(goods);
    const goods2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mats.potionR);
    goods2.position.set(x + 0.5, y + 1.05, z); group.add(goods2);
    world && world.addSolid(x, z, 1.2);
  } else if (kind === 'planter') {
    // A raised stone planter with a small shrub — lines streets nicely.
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 1), mats.stone);
    box.position.set(x, y + 0.3, z);
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), mats.leaf);
    shrub.position.set(x, y + 0.95, z); shrub.scale.y = 0.85;
    group.add(box, shrub);
    world && world.addSolid(x, z, 0.55);
  } else if (kind === 'hay') {
    const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1, 12), mats.gold);
    bale.rotation.z = Math.PI / 2; bale.position.set(x, y + 0.6, z);
    group.add(bale);
    world && world.addSolid(x, z, 0.7);
  }
}

// The capital's castle keep: a big stone block with four corner towers and a
// banner. Solid (you walk around it, not through it). Marks Greenhollow as the
// royal capital so it reads differently from the smaller towns.
function buildCastle(group, world, x, z, y, mats) {
  const keep = new THREE.Mesh(new THREE.BoxGeometry(14, 12, 12), mats.stone);
  keep.position.set(x, y + 6, z);
  const top = new THREE.Mesh(new THREE.BoxGeometry(15, 1, 13), mats.stoneDark);
  top.position.set(x, y + 12.2, z);
  group.add(keep, top);
  world && world.addSolid(x, z, 9);
  // Corner towers.
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    const tx = x + dx * 7.5, tz = z + dz * 6.5;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.3, 16, 12), mats.stone);
    tower.position.set(tx, y + 8, tz);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.5, 12), mats.roof);
    cap.position.set(tx, y + 17.5, tz);
    group.add(tower, cap);
    world && world.addSolid(tx, tz, 2.3);
  }
  // A banner on the front face.
  const banner = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5, 0.15), mats.roof);
  banner.position.set(x, y + 8, z + 6.2);
  group.add(banner);
}

// The depot: a sturdy stone strongbox of a building, solid, with a banded door.
function buildDepot(group, world, x, z, y, mats) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 3.4, 4), mats.depot);
  body.position.set(x, y + 1.7, z);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 4.4), mats.stoneDark);
  roof.position.set(x, y + 3.6, z);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.15), mats.metal);
  door.position.set(x, y + 1.1, z + 2.05);
  group.add(body, roof, door);
  world && world.addSolid(x, z, 2.6);
}

// Floating city name above the town hall, rendered to a canvas sprite.
function buildNameLabel(group, city, y) {
  const pad = 16, fontPx = 52;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = `bold ${fontPx}px system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(city.name).width) + pad * 2;
  const h = fontPx + pad * 2;
  cv.width = w; cv.height = h;
  ctx.font = `bold ${fontPx}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(city.name, w / 2, h / 2);
  ctx.fillStyle = '#ffe9b0';
  ctx.fillText(city.name, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true }));
  const scale = 1.6;
  sprite.scale.set((w / h) * scale, scale, 1);
  sprite.position.set(city.x, y, city.z + 16);
  group.add(sprite);
}

// A small marble temple at the city center: stepped base, pillars and a roof.
function buildTemple(group, cx, cz, flat, matTemple, matStone) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 0.8, 16), matStone);
  base.position.set(cx, flat + 0.4, cz);
  group.add(base);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.4, 16), matTemple);
  floor.position.set(cx, flat + 0.9, cz);
  group.add(floor);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = cx + Math.cos(a) * 3.4;
    const pz = cz + Math.sin(a) * 3.4;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 8), matTemple);
    pillar.position.set(px, flat + 3, pz);
    group.add(pillar);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5, 2.4, 16), matTemple);
  roof.position.set(cx, flat + 6.2, cz);
  group.add(roof);
}

// Returns the interactable kind the player stands on, or null.
export function interactableAt(props, x, z) {
  for (const p of props) {
    if (Math.hypot(p.shop.x - x, p.shop.z - z) < SHOP_RADIUS) return { kind: 'shop', city: p.city };
    if (Math.hypot(p.depot.x - x, p.depot.z - z) < DEPOT_RADIUS) return { kind: 'depot', city: p.city };
    if (Math.hypot(p.portal.x - x, p.portal.z - z) < PORTAL_RADIUS) return { kind: 'portal', city: p.city };
  }
  return null;
}
