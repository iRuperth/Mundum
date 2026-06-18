// creatureDecor.js — thematic GROUND scenery around open-world creature lairs.
//
// Each creature's habitat tells a small story: hydra spawns sit among leathery
// eggs and puddles, fire/dragon lairs scorch the earth and glow with embers,
// undead camps are littered with the bones of failed adventurers, and so on.
//
// This is PURE DECORATION. Nothing built here is added to any pickup, collision
// or loot system — it is scenery only. It mirrors the look of dungeons.js's
// buildEntranceDecor (same materials: bone / web / scorch / ember etc.), but it
// scatters in WORLD space around a single creature's spawn point rather than a
// cave mouth.
//
// PERFORMANCE / DISPOSAL CONTRACT
// --------------------------------
// All geometries and materials are created ONCE at module scope and SHARED by
// every lair. A spawn only allocates a THREE.Group plus a handful of Mesh
// wrappers (which are cheap). When a creature despawns, combat.js calls
// disposeLairDecor(group): we remove the group from the scene and drop child
// references, but we DO NOT dispose the shared geometries/materials — they live
// for the lifetime of the module and are reused by the next lair. This keeps
// spawn/despawn churn allocation-light and leak-free.

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Shared materials (created lazily, so the module can be imported for static
// checks without a live THREE context). Styled to match buildEntranceDecor.
// ---------------------------------------------------------------------------
let MATS = null;
function mats() {
  if (MATS) return MATS;
  MATS = {
    bone: new THREE.MeshLambertMaterial({ color: 0xddd6c4 }),                 // bones / skulls
    boneDark: new THREE.MeshLambertMaterial({ color: 0xb7ae97 }),             // dirtier bone
    egg: new THREE.MeshLambertMaterial({ color: 0x9aa86f }),                  // leathery hydra egg
    eggSpot: new THREE.MeshLambertMaterial({ color: 0x6f7c4a }),              // egg mottling blob
    puddle: new THREE.MeshLambertMaterial({ color: 0x2c4a5a, transparent: true, opacity: 0.7 }), // water/slime puddle
    poison: new THREE.MeshLambertMaterial({ color: 0x3fae3a, emissive: 0x123d12, transparent: true, opacity: 0.78 }), // poison pool
    poisonBubble: new THREE.MeshLambertMaterial({ color: 0x6fd86a, emissive: 0x1c5a1c }), // bubble
    scorch: new THREE.MeshLambertMaterial({ color: 0x1a1410 }),               // burned ground
    ember: new THREE.MeshBasicMaterial({ color: 0xff5522 }),                  // glowing ember
    // Cobweb drawn as faint THREADS (a LineBasicMaterial), so it reads as a real
    // spider web rather than a grey glass pane. Kept low-opacity + no depth write
    // so it never looks like a solid slab on the ground.
    web: new THREE.LineBasicMaterial({ color: 0xe8eef4, transparent: true, opacity: 0.32, depthWrite: false }), // cobweb threads
    sac: new THREE.MeshLambertMaterial({ color: 0xe6e2d2, transparent: true, opacity: 0.85 }), // egg sac
    steel: new THREE.MeshLambertMaterial({ color: 0x9aa2ad }),                // broken sword blade
    wood: new THREE.MeshLambertMaterial({ color: 0x5a3a22 }),                 // spear/torch shaft
    flame: new THREE.MeshBasicMaterial({ color: 0xff8a33 }),                  // torch flame
  };
  return MATS;
}

// ---------------------------------------------------------------------------
// Shared geometries (created lazily, once). Sizing is varied at placement time
// via per-mesh scale so a single geometry serves many looks.
// ---------------------------------------------------------------------------
// Build a radial cobweb as LINE SEGMENTS in the XY plane, centred at the origin
// with an outer radius of 1 (scaled per strand at placement). It's the classic
// spider-web look: N spokes from the centre out, plus a few concentric rings of
// short chords spiralling between the spokes. Returns a BufferGeometry suitable
// for THREE.LineSegments (vertices come in start/end pairs).
function makeWebGeometry() {
  const SPOKES = 9;          // radial threads
  const RINGS = 4;           // concentric thread rings
  const verts = [];
  // Spokes: centre -> rim for each angle.
  for (let s = 0; s < SPOKES; s++) {
    const a = (s / SPOKES) * Math.PI * 2;
    verts.push(0, 0, 0, Math.cos(a), Math.sin(a), 0);
  }
  // Rings: connect adjacent spokes at each radius with a slight sag so the
  // threads bow inward like a real web (chords, not a perfect circle).
  for (let r = 1; r <= RINGS; r++) {
    const rad = r / RINGS;
    const sag = 0.82;        // pull each chord's far point in a touch
    for (let s = 0; s < SPOKES; s++) {
      const a0 = (s / SPOKES) * Math.PI * 2;
      const a1 = ((s + 1) / SPOKES) * Math.PI * 2;
      verts.push(Math.cos(a0) * rad, Math.sin(a0) * rad, 0,
                 Math.cos(a1) * rad * sag, Math.sin(a1) * rad * sag, 0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return geo;
}

let GEOS = null;
function geos() {
  if (GEOS) return GEOS;
  GEOS = {
    egg: new THREE.SphereGeometry(0.32, 10, 8),       // scaled tall into an ovoid
    eggSpot: new THREE.SphereGeometry(0.07, 6, 5),
    puddle: new THREE.CircleGeometry(0.7, 14),
    poolSmall: new THREE.CircleGeometry(0.6, 14),
    poolBig: new THREE.CircleGeometry(1.0, 16),
    bubble: new THREE.SphereGeometry(0.1, 6, 5),
    scorch: new THREE.CircleGeometry(1.0, 14),
    ember: new THREE.SphereGeometry(0.1, 6, 5),
    bone: new THREE.CapsuleGeometry(0.07, 0.5, 4, 6),
    skull: new THREE.SphereGeometry(0.17, 8, 6),
    socket: new THREE.SphereGeometry(0.05, 6, 5),
    web: makeWebGeometry(),                            // radial spider web (line segments)
    sac: new THREE.SphereGeometry(0.22, 8, 6),
    blade: new THREE.BoxGeometry(0.06, 0.9, 0.16),    // broken-sword blade stuck in ground
    guard: new THREE.BoxGeometry(0.36, 0.06, 0.08),   // crossguard
    shaft: new THREE.CylinderGeometry(0.04, 0.05, 1.8, 6), // spear/torch shaft
    spearTip: new THREE.ConeGeometry(0.09, 0.3, 5),
    flame: new THREE.SphereGeometry(0.13, 6, 5),
  };
  return GEOS;
}

// ---------------------------------------------------------------------------
// Deterministic placement: seed a tiny PRNG from the spawn position so a lair's
// layout is stable for a given (x,z) and never shimmers/realloc-jitters. Same
// hash style as combat.js's placeAt seeding.
// ---------------------------------------------------------------------------
function hashSeed(x, z) {
  return ((Math.round(x * 13.7) * 73856093) ^ (Math.round(z * 9.1) * 19349663)) >>> 0;
}
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Golden-angle spiral around (cx,cz), like buildEntranceDecor, but tuned tight
// (radius ~2-5m) so a lair stays compact around its creature. `rng` adds a small
// stable jitter so it doesn't look mechanical.
function ringPoint(cx, cz, i, world, rng) {
  const a = i * 2.39996 + rng() * 0.6;            // golden angle + tiny stable wobble
  const r = 2.0 + (i % 4) * 0.85 + rng() * 0.5;   // ~2-5m out
  const x = cx + Math.cos(a) * r;
  const z = cz + Math.sin(a) * r;
  return { x, z, y: world.heightAt(x, z) };
}

// ---------------------------------------------------------------------------
// Family classification. def.family is the creature key (e.g. 'hydra',
// 'dragon', 'skeleton'); def.element is one of 'none' | 'fire' | 'water' |
// 'plant'. We list both the real families in this game AND the broader spec
// names (e.g. green_dragon, poison_spider, lich) so the logic stays correct if
// those families are ever added — unknown names simply never match.
// ---------------------------------------------------------------------------
const UNDEAD = new Set([
  'skeleton', 'zombie', 'ghoul', 'mummy', 'bonebeast', 'lich', 'necromancer',
  'wraith', 'ghost', 'vampire',
]);
const FIRE_FAMS = new Set([
  'dragon', 'demon', 'fire_elemental', 'fire_devil', 'hellhound', 'lava_golem',
  'imp', 'elemental', 'mage',
]);
const POISON_FAMS = new Set([
  'poison_spider', 'snake', 'green_dragon', 'mandrake', 'mushroom', 'treant',
]);
const SPIDER_FAMS = new Set([
  'spider', 'giant_spider', 'tarantula', 'poison_spider', 'scorpion', 'wasp',
  'beetle',
]);
const CAMP_FAMS = new Set([
  'orc', 'goblin', 'troll', 'minotaur', 'cyclops', 'ogre', 'kobold',
]);
// Deadlier spider/insect families also get a bone or two among the webs.
const DEADLY_BUGS = new Set(['giant_spider', 'tarantula', 'poison_spider', 'scorpion']);

// ===========================================================================
// Per-family builders. Each adds a SMALL number of shared-geometry meshes to
// `group`, positioned in world space around (cx, cz). Mesh count capped per
// lair to keep the world tidy and fast.
// ===========================================================================

function buildHydra(group, cx, cz, world, rng) {
  const G = geos(), M = mats();
  // 2-4 leathery eggs, half-buried, mottled with darker spots.
  const eggs = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < eggs; i++) {
    const p = ringPoint(cx, cz, i, world, rng);
    const egg = new THREE.Mesh(G.egg, M.egg);
    const s = 0.85 + rng() * 0.5;
    egg.scale.set(s, s * (1.3 + rng() * 0.3), s);      // ovoid, taller than wide
    egg.rotation.set(rng() * 0.5 - 0.25, rng() * Math.PI, rng() * 0.5 - 0.25);
    egg.position.set(p.x, p.y + 0.18 * s, p.z);        // half-buried
    group.add(egg);
    // a couple of mottling blobs on the shell
    for (let k = 0; k < 2; k++) {
      const spot = new THREE.Mesh(G.eggSpot, M.eggSpot);
      const a = rng() * Math.PI * 2;
      spot.position.set(p.x + Math.cos(a) * 0.18 * s, p.y + 0.2 * s, p.z + Math.sin(a) * 0.18 * s);
      group.add(spot);
    }
  }
  // a couple of small puddles (hydra is a water creature)
  for (let i = 0; i < 2; i++) {
    const p = ringPoint(cx, cz, i + 5, world, rng);
    const puddle = new THREE.Mesh(G.puddle, M.puddle);
    puddle.rotation.x = -Math.PI / 2;
    const s = 0.7 + rng() * 0.6;
    puddle.scale.set(s, s, 1);
    puddle.position.set(p.x, p.y + 0.03, p.z);
    group.add(puddle);
  }
}

function buildPoison(group, cx, cz, world, rng) {
  const G = geos(), M = mats();
  // flat green poison pools + a few bubbles rising from them.
  const pools = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < pools; i++) {
    const p = ringPoint(cx, cz, i, world, rng);
    const big = rng() > 0.5;
    const pool = new THREE.Mesh(big ? G.poolBig : G.poolSmall, M.poison);
    pool.rotation.x = -Math.PI / 2;
    const s = 0.8 + rng() * 0.7;
    pool.scale.set(s, s, 1);
    pool.position.set(p.x, p.y + 0.04, p.z);
    group.add(pool);
    const bubbles = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < bubbles; k++) {
      const b = new THREE.Mesh(G.bubble, M.poisonBubble);
      const a = rng() * Math.PI * 2, br = rng() * 0.4 * s;
      b.position.set(p.x + Math.cos(a) * br, p.y + 0.08 + rng() * 0.06, p.z + Math.sin(a) * br);
      group.add(b);
    }
  }
}

function buildFire(group, cx, cz, world, rng) {
  const G = geos(), M = mats();
  // scorched black ground circles + glowing orange embers (the user's "burned
  // ground"), echoing the dragon entrance decor.
  const marks = 4 + Math.floor(rng() * 4);   // 4-7
  for (let i = 0; i < marks; i++) {
    const p = ringPoint(cx, cz, i, world, rng);
    const burn = new THREE.Mesh(G.scorch, M.scorch);
    burn.rotation.x = -Math.PI / 2;
    const s = 0.6 + rng() * 0.9;
    burn.scale.set(s, s, 1);
    burn.position.set(p.x, p.y + 0.04, p.z);
    group.add(burn);
    if (rng() > 0.45) {
      const ember = new THREE.Mesh(G.ember, M.ember);
      ember.position.set(p.x + (rng() - 0.5) * 0.4, p.y + 0.12 + rng() * 0.1, p.z + (rng() - 0.5) * 0.4);
      group.add(ember);
    }
  }
}

// Scatter a couple of bones + an optional skull at a point — shared by the
// undead lair and the deadlier-bug / camp "failed adventurer" touches.
function scatterBones(group, p, rng, withSkull) {
  const G = geos(), M = mats();
  const bone = new THREE.Mesh(G.bone, rng() > 0.5 ? M.bone : M.boneDark);
  bone.rotation.set(Math.PI / 2, 0, rng() * Math.PI * 2);
  bone.position.set(p.x, p.y + 0.08, p.z);
  group.add(bone);
  if (withSkull) {
    const skull = new THREE.Mesh(G.skull, M.bone);
    skull.position.set(p.x + 0.35, p.y + 0.16, p.z + 0.1);
    group.add(skull);
    // two dark eye sockets
    for (let e = -1; e <= 1; e += 2) {
      const sock = new THREE.Mesh(G.socket, M.boneDark);
      sock.position.set(p.x + 0.35 + e * 0.06, p.y + 0.18, p.z + 0.1 + 0.13);
      group.add(sock);
    }
  }
}

function buildUndead(group, cx, cz, world, rng) {
  // scattered bones, a skull or two, and a broken sword stuck in the ground as a
  // "failed adventurer" carcass.
  const G = geos(), M = mats();
  const piles = 4 + Math.floor(rng() * 3);   // 4-6 bone spots
  for (let i = 0; i < piles; i++) {
    const p = ringPoint(cx, cz, i, world, rng);
    scatterBones(group, p, rng, i % 3 === 0);   // a skull on ~1/3 of them
  }
  // broken sword planted in the earth, hilt-up, slightly leaning.
  if (rng() > 0.3) {
    const p = ringPoint(cx, cz, 7, world, rng);
    const lean = (rng() - 0.5) * 0.5;
    const blade = new THREE.Mesh(G.blade, M.steel);
    blade.position.set(p.x, p.y + 0.4, p.z);
    blade.rotation.z = lean;
    group.add(blade);
    const guard = new THREE.Mesh(G.guard, M.steel);
    guard.position.set(p.x + Math.sin(lean) * 0.32, p.y + 0.78, p.z);
    guard.rotation.z = lean;
    group.add(guard);
  }
}

function buildSpider(group, cx, cz, world, rng, deadly) {
  const G = geos(), M = mats();
  // Cobwebs drawn as radial THREAD webs (LineSegments), standing mostly upright
  // like a web strung between bushes — tilted back a little and turned randomly,
  // so they read as webs, not panes of glass lying on the grass.
  const strands = 3 + Math.floor(rng() * 3);   // 3-5
  for (let i = 0; i < strands; i++) {
    const p = ringPoint(cx, cz, i, world, rng);
    const web = new THREE.LineSegments(G.web, M.web);
    const s = 0.7 + rng() * 0.8;
    web.scale.setScalar(s);
    // Upright-ish: a small backward lean (tilt around X) + a random spin around Y,
    // hung so its lower rim sits just above the ground.
    web.rotation.set((rng() - 0.5) * 0.5, rng() * Math.PI * 2, (rng() - 0.5) * 0.3);
    web.position.set(p.x, p.y + s * 0.95, p.z);
    web.renderOrder = 2;
    group.add(web);
  }
  const sacs = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < sacs; i++) {
    const p = ringPoint(cx, cz, i + 6, world, rng);
    const sac = new THREE.Mesh(G.sac, M.sac);
    const s = 0.8 + rng() * 0.6;
    sac.scale.set(s, s * 1.15, s);
    sac.position.set(p.x, p.y + 0.2 * s, p.z);
    group.add(sac);
  }
  // deadlier bugs lie among the bones of their prey.
  if (deadly) {
    const p = ringPoint(cx, cz, 9, world, rng);
    scatterBones(group, p, rng, rng() > 0.5);
  }
}

function buildCamp(group, cx, cz, world, rng) {
  const G = geos(), M = mats();
  // a few crude bones plus a planted spear or a lit torch — a rough warband camp.
  const bones = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < bones; i++) {
    const p = ringPoint(cx, cz, i, world, rng);
    scatterBones(group, p, rng, i === 0);
  }
  const p = ringPoint(cx, cz, 4, world, rng);
  const torch = rng() > 0.5;
  const shaft = new THREE.Mesh(G.shaft, M.wood);
  const lean = (rng() - 0.5) * 0.35;
  shaft.position.set(p.x, p.y + 0.85, p.z);
  shaft.rotation.z = lean;
  group.add(shaft);
  const topY = p.y + 1.72;
  const topX = p.x + Math.sin(lean) * 0.9;
  if (torch) {
    const flame = new THREE.Mesh(G.flame, M.flame);
    flame.position.set(topX, topY, p.z);
    group.add(flame);
  } else {
    const tip = new THREE.Mesh(G.spearTip, M.steel);
    tip.position.set(topX, topY, p.z);
    tip.rotation.z = lean;
    group.add(tip);
  }
}

// ===========================================================================
// Public API
// ===========================================================================

// Build a small THREE.Group of ground scenery for this creature's lair, placed
// in WORLD space around (x, z). Returns null when the creature gets no decor
// (most weak/friendly animals — keeps the world clean and perf high).
//
// Classification precedence: a creature is undead OR fire OR poison OR
// spider/bug OR a camp dweller — checked in that order. Hydra is special-cased
// first. `def.element` refines fire/poison membership.
export function buildCreatureLairDecor(def, x, z, world) {
  if (!def || !world) return null;
  const fam = def.family;
  const el = def.element;

  const isUndead = UNDEAD.has(fam);
  const isFire = el === 'fire' || FIRE_FAMS.has(fam);
  const isPoison = el === 'plant' || POISON_FAMS.has(fam);
  const isSpider = SPIDER_FAMS.has(fam);
  const isCamp = CAMP_FAMS.has(fam);

  if (fam !== 'hydra' && !isUndead && !isFire && !isPoison && !isSpider && !isCamp) {
    return null;   // common/weak/friendly creature: no decor
  }

  const rng = mulberry(hashSeed(x, z));
  const group = new THREE.Group();

  if (fam === 'hydra') {
    buildHydra(group, x, z, world, rng);
  } else if (isUndead) {
    buildUndead(group, x, z, world, rng);
  } else if (isFire) {
    buildFire(group, x, z, world, rng);
  } else if (isPoison) {
    buildPoison(group, x, z, world, rng);
  } else if (isSpider) {
    buildSpider(group, x, z, world, rng, DEADLY_BUGS.has(fam));
  } else if (isCamp) {
    buildCamp(group, x, z, world, rng);
  }

  if (!group.children.length) return null;
  return group;
}

// Tear down a lair decor group. We remove every child from the group and drop
// references, but we DELIBERATELY do NOT dispose geometries/materials: those are
// shared at module scope and reused by every other lair (see the disposal
// contract at the top of this file). The caller is responsible for removing the
// group from the scene (it does so right before calling this).
export function disposeLairDecor(group) {
  if (!group) return;
  if (group.parent) group.parent.remove(group);
  // Clearing children releases the Mesh wrappers for GC; shared geo/mat survive.
  group.clear();
}
