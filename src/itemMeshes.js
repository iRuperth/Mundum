// 3D models for consumables & containers (Tibia overhaul). No image textures —
// everything is built from Three.js primitives with emissive/standard materials
// so each item stands out. Potions are real bottles with liquid you can see;
// the big elixirs are fat honey-jar flasks with dripping, glowing contents.
// Containers are stitched leather packs with flaps, buckles and themed crests.
import * as THREE from 'three';

const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });
const glass = (c) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.1 });
const liquid = (c, e = 0.45) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: e, roughness: 0.3 });
const metal = (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.85, roughness: 0.35 });
const leather = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0.05 });

function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r * f); c.g = Math.min(1, c.g * f); c.b = Math.min(1, c.b * f);
  return c.getHex();
}

// ---------------------------------------------------------------------------
// POTIONS. The shape escalates with the potion's power so a player reads rank at
// a glance: fruit-tier = actual fruit; low/mid = slim vials; high = round flasks;
// elite/percent = fat honey-jar flasks with dripping, glowing mana/blood.
// ---------------------------------------------------------------------------
export function buildPotionMesh(p) {
  const g = new THREE.Group();
  const col = p.color || 0xff4d4d;

  // Fruit-tier consumables are the literal fruit, not a bottle.
  const FRUIT = new Set(['apple', 'grapes', 'pear', 'melon', 'berry', 'blueberries', 'mango']);
  if (FRUIT.has(p.id)) return buildFruitMesh(p);

  // Bottle class by tier/amount.
  const amount = p.restore || (p.restorePct ? 9999 : 200);
  const isElite = p.tier === 'elite' || amount >= 1500 || p.restorePct;
  const isHigh = !isElite && (p.tier === 'high' || amount >= 500);

  if (isElite) {
    // FAT HONEY-JAR FLASK: a rounded pot-belly jar, wide cork, with thick glowing
    // liquid that bulges at a meniscus and DRIPS down the outside.
    const bodyGlass = glass(shade(col, 1.2));
    const jar = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), bodyGlass);
    jar.scale.set(1, 1.05, 1); jar.position.y = 0.16; g.add(jar);
    // neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 12), bodyGlass);
    neck.position.y = 0.33; g.add(neck);
    // thick glowing liquid filling most of the jar
    const fill = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 12), liquid(col, 0.6));
    fill.scale.set(1, 0.95, 1); fill.position.y = 0.15; g.add(fill);
    // bulging meniscus at the top
    const meniscus = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), liquid(shade(col, 1.25), 0.7));
    meniscus.scale.set(1, 0.5, 1); meniscus.position.y = 0.3; g.add(meniscus);
    // DRIPS running down the glass
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5;
      const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.06 + (i % 2) * 0.04, 4, 6), liquid(shade(col, 1.15), 0.6));
      drip.position.set(Math.cos(a) * 0.15, 0.2 - (i % 2) * 0.05, Math.sin(a) * 0.15);
      g.add(drip);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), liquid(shade(col, 1.15), 0.6));
      bead.position.set(Math.cos(a) * 0.16, 0.1 - (i % 2) * 0.05, Math.sin(a) * 0.16);
      g.add(bead);
    }
    // cork + a wax seal ring
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.06, 10), lambert(0x8a5a2a));
    cork.position.y = 0.39; g.add(cork);
    const seal = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 14), metal(0xd9b341));
    seal.rotation.x = Math.PI / 2; seal.position.y = 0.35; g.add(seal);
    // a soft glow
    const light = new THREE.PointLight(col, 0.8, 0.8); light.position.y = 0.18; g.add(light);
    g.userData.liquid = fill;
  } else if (isHigh) {
    // Round-bellied flask with a tall neck and visible liquid line.
    const bottle = glass(shade(col, 1.2));
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), bottle);
    belly.position.y = 0.12; g.add(belly);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.14, 10), bottle);
    neck.position.y = 0.28; g.add(neck);
    const fill = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), liquid(col, 0.5));
    fill.scale.set(1, 0.85, 1); fill.position.y = 0.11; g.add(fill);
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.05, 8), lambert(0x8a5a2a));
    cork.position.y = 0.36; g.add(cork);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 12), metal(0xd9b341));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.21; g.add(ring);
    g.userData.liquid = fill;
  } else {
    // Slim conical vial for low/mid potions.
    const bottle = glass(shade(col, 1.2));
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.26, 10), bottle);
    body.position.y = 0.15; g.add(body);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.072, 0.18, 10), liquid(col, 0.45));
    fill.position.y = 0.12; g.add(fill);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.06, 8), bottle);
    neck.position.y = 0.31; g.add(neck);
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.05, 8), lambert(0x8a5a2a));
    cork.position.y = 0.36; g.add(cork);
    g.userData.liquid = fill;
  }
  return g;
}

// Fruit-tier consumables as real little fruits.
function buildFruitMesh(p) {
  const g = new THREE.Group();
  const col = p.color || 0xe23b3b;
  if (p.id === 'grapes' || p.id === 'blueberries') {
    // a cluster of berries
    const berry = liquid(col, 0.15);
    const positions = [[0, 0.28, 0], [-0.05, 0.22, 0.02], [0.05, 0.22, -0.02], [-0.07, 0.15, 0], [0, 0.15, 0.05], [0.07, 0.15, 0], [-0.03, 0.08, 0.02], [0.03, 0.08, -0.02]];
    for (const [x, y, z] of positions) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), berry);
      b.position.set(x, y, z); g.add(b);
    }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 5), lambert(0x6a4a2a));
    stem.position.y = 0.33; g.add(stem);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), lambert(0x4caf50));
    leaf.rotation.z = 0.8; leaf.position.set(0.03, 0.34, 0); g.add(leaf);
    return g;
  }
  // round/oval fruit (apple, pear, melon, mango)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), lambert(col));
  if (p.id === 'pear') body.scale.set(0.85, 1.15, 0.85);
  if (p.id === 'melon') body.scale.set(1.25, 1.1, 1.25);
  if (p.id === 'mango') body.scale.set(1.1, 0.8, 0.9);
  body.position.y = 0.16; g.add(body);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 5), lambert(0x6a4a2a));
  stem.position.y = 0.3; g.add(stem);
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), lambert(0x4caf50));
  leaf.rotation.z = 0.9; leaf.position.set(0.04, 0.31, 0); g.add(leaf);
  if (p.id === 'melon') {
    // melon stripes
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.006, 4, 8, Math.PI), lambert(shade(col, 0.6)));
      stripe.rotation.y = a; stripe.rotation.x = Math.PI / 2; stripe.position.y = 0.16; g.add(stripe);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// CONTAINERS. Stitched leather packs: a rounded body, a top flap with a buckle,
// shoulder straps, side pockets, and a themed crest for the special bags.
// ---------------------------------------------------------------------------
export function buildContainerMesh(c) {
  const g = new THREE.Group();
  const col = c.color || 0x6a4a2b;
  const hide = leather(col);
  const hideD = leather(shade(col, 0.7));
  const isBag = c.id === 'bag' || (c.capacity && c.capacity <= 12 && !/backpack/.test(c.id));

  if (isBag) {
    // A burlap/jute DRAWSTRING SACK like the reference: a plump body that pinches
    // in to a gathered, ruffled neck cinched by a cord, with two dangling ties.
    return buildSackMesh(col, { crest: c });
  }

  // BACKPACK: a boxy stitched body with a buckled flap and straps.
  const body = new THREE.Mesh(roundedBox(0.26, 0.34, 0.16, 0.04), hide);
  body.position.y = 0.2; g.add(body);
  // top flap
  const flap = new THREE.Mesh(roundedBox(0.27, 0.16, 0.04, 0.03), hideD);
  flap.position.set(0, 0.32, 0.085); flap.rotation.x = 0.15; g.add(flap);
  // buckle
  const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.01, 6, 12), metal(0xc8a24a));
  buckle.position.set(0, 0.26, 0.12); g.add(buckle);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.015), hideD);
  strap.position.set(0, 0.3, 0.115); g.add(strap);
  // shoulder straps on the back
  for (const s of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.014, 6, 12, Math.PI), hideD);
    sh.position.set(s * 0.07, 0.22, -0.08); sh.rotation.set(0, 0, 0); g.add(sh);
  }
  // side pockets
  for (const s of [-1, 1]) {
    const pkt = new THREE.Mesh(roundedBox(0.06, 0.14, 0.06, 0.02), hide);
    pkt.position.set(s * 0.16, 0.16, 0.02); g.add(pkt);
  }
  // stitch line down the front
  for (let i = 0; i < 6; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.005), lambert(shade(col, 1.4)));
    st.position.set(0, 0.1 + i * 0.035, 0.085); g.add(st);
  }
  addCrest(g, c, 0.18, 0.09);
  return g;
}

// A themed crest on special bags: gold shield, dragon face, demon face.
function addCrest(g, c, y, z) {
  if (c.id === 'golden_backpack') {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), metal(0xe8c34a));
    disc.rotation.x = Math.PI / 2; disc.position.set(0, y, z); g.add(disc);
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 0), liquid(0xff5577, 0.4));
    gem.position.set(0, y, z + 0.02); g.add(gem);
  } else if (c.id === 'dragon_backpack') {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lambert(shade(c.color, 0.8)));
    head.scale.set(1, 0.8, 0.6); head.position.set(0, y, z); g.add(head);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 5), lambert(0x3a2a1a));
      horn.position.set(s * 0.04, y + 0.05, z); horn.rotation.z = -s * 0.5; g.add(horn);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), liquid(0x66ff88, 0.7));
      eye.position.set(s * 0.022, y + 0.01, z + 0.03); g.add(eye);
    }
  } else if (c.id === 'demon_backpack') {
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), lambert(0x5a1414));
    face.scale.set(1, 1, 0.6); face.position.set(0, y, z); g.add(face);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.07, 5), lambert(0x1a0a0a));
      horn.position.set(s * 0.045, y + 0.05, z); horn.rotation.z = -s * 0.6; g.add(horn);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 5), liquid(0xff6600, 0.9));
      eye.position.set(s * 0.022, y + 0.01, z + 0.03); g.add(eye);
    }
  } else if (c.id === 'fur_bag') {
    // fuzzy fur tufts
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 4), leather(shade(c.color, 1.2)));
      tuft.position.set(Math.cos(a) * 0.12, y, z * 0.5 + Math.sin(a) * 0.06);
      tuft.rotation.z = Math.cos(a); g.add(tuft);
    }
  }
}

// A rounded box (BoxGeometry with chamfer feel via a slightly inset bevel proxy).
function roundedBox(w, h, d, r) {
  // Three.js has no rounded box primitive; approximate with a Box for the body.
  // (r reserved for future ExtrudeGeometry rounding; kept simple + cheap here.)
  return new THREE.BoxGeometry(w, h, d);
}

// ---------------------------------------------------------------------------
// JUTE DRAWSTRING SACK (the loot bag). Built to match a burlap pouch: a plump
// lower body, a pinched neck gathered into a ruffle, a cord cinch, and two ties
// dangling at the front. `col` tints the cloth; opts.crest adds a themed badge.
// ---------------------------------------------------------------------------
export function buildSackMesh(col = 0xbf9b6a, opts = {}) {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, metalness: 0.0 });
  const clothD = new THREE.MeshStandardMaterial({ color: shade(col, 0.82), roughness: 0.95 });
  const cord = lambert(shade(col, 0.6));

  // Plump body (slightly squashed sphere, fuller at the bottom).
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), cloth);
  body.scale.set(1, 1.05, 1); body.position.y = 0.15; g.add(body);
  // a soft fold seam down the front for fabric feel
  for (const s of [-1, 1]) {
    const fold = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.18, 4, 6), clothD);
    fold.position.set(s * 0.06, 0.14, 0.13); fold.rotation.z = s * 0.12; g.add(fold);
  }
  // Pinched neck above the cinch.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.07, 12), cloth);
  neck.position.y = 0.3; g.add(neck);
  // Gathered ruffle bursting out the top (a cluster of little cloth lobes).
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), i % 2 ? clothD : cloth);
    lobe.scale.set(0.8, 1.3, 0.8);
    lobe.position.set(Math.cos(a) * 0.05, 0.37, Math.sin(a) * 0.05);
    lobe.rotation.z = Math.cos(a) * 0.3; lobe.rotation.x = Math.sin(a) * 0.3;
    g.add(lobe);
  }
  // The drawstring cinch (a cord wrap at the neck).
  const cinch = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 6, 16), cord);
  cinch.rotation.x = Math.PI / 2; cinch.position.y = 0.3; g.add(cinch);
  // Two ties dangling down the front with little knots.
  for (const s of [-1, 1]) {
    const tie = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.12, 4, 6), cord);
    tie.position.set(s * 0.05, 0.22, 0.1); tie.rotation.z = s * 0.4; g.add(tie);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), cord);
    knot.position.set(s * 0.08, 0.15, 0.12); g.add(knot);
  }
  if (opts.crest) addCrest(g, opts.crest, 0.15, 0.16);
  return g;
}

// The dropped loot bag in the world — a small sack tinted by rarity so kids spot
// treasure. Rarity drives the cloth colour + an optional glow.
export function buildLootBagMesh(rarity = 'normal', tint) {
  const col = tint != null ? tint
    : rarity === 'legendary' ? 0xd9b341
    : rarity === 'elite' ? 0x7a6a9a
    : 0xbf9b6a;
  const g = buildSackMesh(col);
  if (rarity === 'legendary' || rarity === 'elite') {
    const light = new THREE.PointLight(rarity === 'legendary' ? 0xffd166 : 0x5dade2, 6, 3.5);
    light.position.y = 0.2; g.add(light);
  }
  return g;
}

// ---------------------------------------------------------------------------
// 10 distinct loot-bag (sack) variants + 10 distinct backpacks. These feed both
// the items preview and the game's container roster. Each is a data entry the
// builders read (color + optional crest); shapes vary via crest/trim.
// ---------------------------------------------------------------------------
export const BAG_VARIANTS = [
  { id: 'sack_burlap',  name: 'Burlap Sack',   color: 0xbf9b6a, capacity: 8 },
  { id: 'sack_linen',   name: 'Linen Pouch',   color: 0xd8cba6, capacity: 8 },
  { id: 'sack_red',     name: 'Red Pouch',     color: 0xb5483f, capacity: 10 },
  { id: 'sack_green',   name: 'Green Pouch',   color: 0x4f8a52, capacity: 10 },
  { id: 'sack_blue',    name: 'Blue Pouch',    color: 0x3f6fb5, capacity: 10 },
  { id: 'sack_purple',  name: 'Violet Pouch',  color: 0x7a4fb5, capacity: 12 },
  { id: 'sack_velvet',  name: 'Velvet Bag',    color: 0x55224a, capacity: 12, crestId: 'golden_backpack' },
  { id: 'sack_leather', name: 'Leather Pouch', color: 0x7a512c, capacity: 12 },
  { id: 'sack_gold',    name: 'Gold-Thread Sack', color: 0xc9a23a, capacity: 14, crestId: 'golden_backpack' },
  { id: 'sack_fur',     name: 'Fur Pouch',     color: 0x8a6a3a, capacity: 14, crestId: 'fur_bag' },
];

export const BACKPACK_VARIANTS = [
  { id: 'pack_brown',    name: 'Brown Backpack',   color: 0x6a4a2b, capacity: 20 },
  { id: 'pack_red',      name: 'Red Backpack',     color: 0xa83a32, capacity: 20 },
  { id: 'pack_green',    name: 'Green Backpack',   color: 0x3f7a44, capacity: 20 },
  { id: 'pack_blue',     name: 'Blue Backpack',    color: 0x37598f, capacity: 20 },
  { id: 'pack_purple',   name: 'Purple Backpack',  color: 0x6a3f8f, capacity: 22 },
  { id: 'pack_orange',   name: 'Orange Backpack',  color: 0xc8762a, capacity: 22 },
  { id: 'pack_camo',     name: 'Ranger Backpack',  color: 0x556b3a, capacity: 22 },
  { id: 'pack_gold',     name: 'Golden Backpack',  color: 0xddbb33, capacity: 24, crestId: 'golden_backpack' },
  { id: 'pack_dragon',   name: 'Dragon Backpack',  color: 0xcc3322, capacity: 22, crestId: 'dragon_backpack' },
  { id: 'pack_demon',    name: 'Demon Backpack',   color: 0x7a0022, capacity: 24, crestId: 'demon_backpack' },
];

// Build a bag/backpack from a variant entry (routes crestId through addCrest).
export function buildBagVariant(v) {
  return buildSackMesh(v.color, { crest: v.crestId ? { id: v.crestId, color: v.color } : null });
}
export function buildBackpackVariant(v) {
  return buildContainerMesh({ id: v.crestId || 'backpack', name: v.name, color: v.color, capacity: v.capacity });
}
