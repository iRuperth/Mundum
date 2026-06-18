import * as THREE from 'three';

// Cave and dungeon locations scattered far from the cities. Each dungeon marks
// a spot where certain creature families spawn denser inside, and carries a
// reward chest the player can open once. Coordinates are deterministic literals
// chosen to sit well away from the four cities (see cities.js).
// `floors` = how many stacked rooms the cave has (deeper floors spawn the
// family's tougher variants — see combat.setDungeon depth banding). `big` widens
// every room. The flagship cave of each creature group gets several floors and
// its reward chest; the lesser dens stay shallow.
export const DUNGEONS = [
  {
    id: 'ratcave', name: { es: 'Cueva de Ratas', en: 'Rat Cave' },
    x: 90, z: 120, minLevel: 1, floors: 2,
    creatureFamilies: ['rat', 'worm'],
    chest: { itemId: 'copper_sword', reward: 1, questId: 'rat-cave-clear' },
  },
  {
    id: 'spidernest', name: { es: 'Nido de Aranas', en: 'Spider Nest' },
    x: -260, z: -180, minLevel: 6, floors: 3, big: true,
    creatureFamilies: ['spider', 'beetle'],
    chest: { itemId: 'leather_armor', reward: 1, questId: 'spider-nest-clear' },
  },
  {
    id: 'orcfort', name: { es: 'Fuerte Orco', en: 'Orc Fort' },
    x: 540, z: -260, minLevel: 14, floors: 3, big: true,
    creatureFamilies: ['orc', 'goblin', 'kobold'],
    chest: { itemId: 'iron_sword', reward: 1, questId: 'orc-fort-clear' },
  },
  {
    id: 'trollcave', name: { es: 'Cueva del Trol', en: 'Troll Cave' },
    x: -540, z: 460, minLevel: 8, floors: 2,
    creatureFamilies: ['troll'],
    chest: { itemId: 'steel_sword', reward: 1, questId: 'troll-cave-clear' },
  },
  // The troll mega-zone has several scattered caves; the toughest (trollcave6)
  // holds the supreme Troll Champion across 4 floors. They reuse the standard
  // cave machinery. Most dens are shallow 1-floor pockets; the throne is deep.
  { id: 'trollcave2', name: { es: 'Guarida Trol', en: 'Troll Den' }, x: -470, z: 380, minLevel: 6, floors: 1, creatureFamilies: ['troll'], chest: { itemId: 'iron_armor', reward: 1, questId: 'troll-den2-clear' } },
  { id: 'trollcave3', name: { es: 'Foso Trol', en: 'Troll Pit' }, x: -620, z: 520, minLevel: 7, floors: 1, creatureFamilies: ['troll'], chest: { itemId: 'studded_armor', reward: 1, questId: 'troll-den3-clear' } },
  { id: 'trollcave4', name: { es: 'Madriguera Trol', en: 'Troll Burrow' }, x: -560, z: 300, minLevel: 8, floors: 2, creatureFamilies: ['troll', 'spider'], chest: { itemId: 'iron_sword', reward: 1, questId: 'troll-den4-clear' } },
  { id: 'trollcave5', name: { es: 'Cubil Trol', en: 'Troll Lair' }, x: -440, z: 540, minLevel: 9, floors: 1, creatureFamilies: ['troll'], chest: { itemId: 'battle_axe', reward: 1, questId: 'troll-den5-clear' } },
  { id: 'trollcave6', name: { es: 'Trono del Campeón', en: "Champion's Throne" }, x: -640, z: 420, minLevel: 12, floors: 4, big: true, creatureFamilies: ['troll'], chest: { itemId: 'morning_star', reward: 1, questId: 'troll-champion-clear' } },
  {
    id: 'undeadcrypt', name: { es: 'Cripta de los Muertos', en: 'Undead Crypt' },
    x: 420, z: 620, minLevel: 30, floors: 4, big: true,
    creatureFamilies: ['skeleton', 'zombie', 'ghost', 'wraith'],
    chest: { itemId: 'knight_sword', reward: 1, questId: 'undead-crypt-clear' },
  },
  {
    id: 'dragonlair', name: { es: 'Guarida del Dragon', en: 'Dragon Lair' },
    x: 200, z: -760, minLevel: 40, floors: 4, big: true,
    creatureFamilies: ['dragon', 'wyvern', 'lizardman'],
    chest: { itemId: 'dragon_shield', reward: 1, questId: 'dragon-lair-clear' },
  },
  {
    id: 'demonabyss', name: { es: 'Abismo Demoniaco', en: 'Demon Abyss' },
    x: -780, z: -680, minLevel: 50, floors: 4, big: true,
    creatureFamilies: ['demon', 'imp', 'cultist'],
    chest: { itemId: 'demon_sword', reward: 1, questId: 'demon-abyss-clear' },
  },
  // Beast dens added with the mount overhaul: the wolf pack, the tiger hollow,
  // and the glacial lair of the level-100 Crystal Dragon (supreme mount source).
  {
    id: 'wolfden', name: { es: 'Guarida del Lobo', en: 'Wolf Den' },
    x: -120, z: 420, minLevel: 7, floors: 2,
    creatureFamilies: ['wolf'],
    chest: { itemId: 'studded_armor', reward: 1, questId: 'wolf-den-clear' },
  },
  {
    id: 'tigerhollow', name: { es: 'Cubil del Tigre', en: "Tiger's Hollow" },
    x: 340, z: 300, minLevel: 15, floors: 2,
    creatureFamilies: ['tiger'],
    chest: { itemId: 'chain_armor', reward: 1, questId: 'tiger-hollow-clear' },
  },
  {
    id: 'glaciallair', name: { es: 'Guarida Glacial', en: 'Glacial Lair' },
    x: -200, z: -900, minLevel: 90, floors: 4, big: true,
    creatureFamilies: ['crystal_dragon'],
    chest: { itemId: 'frost_armor', reward: 1, questId: 'glacial-lair-clear' },
  },
];

const ENTRANCE_RADIUS = 7;   // how close counts as "at the cave mouth"
const OUTSIDE_RADIUS = 30;   // cave creatures also spawn outside within this range
const CHEST_RADIUS = 2.5;    // how close counts as "at the chest"

// Deterministic per-vertex jitter: pushes each vertex of a faceted primitive by
// a hashed offset so a clean DodecahedronGeometry becomes a unique craggy rock.
// Hashed from the vertex position (no Math.random — the world stays deterministic).
// `amt` is the max push in metres, `salt` makes two rocks from the same geometry
// differ. Mutates and returns the geometry.
function jitterGeometry(geo, amt, salt = 0) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const h = (n) => {
      let v = Math.imul((Math.round(x * 97) ^ Math.round(z * 131)) + n + salt, 374761393)
            ^ Math.imul(Math.round(y * 113) + n * 53, 668265263);
      v = Math.imul(v ^ (v >>> 13), 1274126177); v ^= v >>> 16;
      return (v >>> 0) / 4294967296 - 0.5;
    };
    pos.setX(i, x + h(1) * amt);
    pos.setY(i, y + h(7) * amt);
    pos.setZ(i, z + h(13) * amt);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// A small pool of pre-jittered detail-1 boulder geometries, built lazily and
// shared across every entrance so the cave mouths are craggy rock without a
// per-boulder geometry cost. Pick one by index for variety.
let boulderGeos = null;
function boulders() {
  if (boulderGeos) return boulderGeos;
  boulderGeos = [];
  for (let g = 0; g < 5; g++) {
    boulderGeos.push(jitterGeometry(new THREE.DodecahedronGeometry(1, 1), 0.18, g * 23));
  }
  return boulderGeos;
}

// Shared materials, created lazily so the module can be imported without a
// live THREE context for static checks.
let mats = null;
function materials() {
  if (mats) return mats;
  mats = {
    rock: new THREE.MeshLambertMaterial({ color: 0x6f6a63 }),
    rockDark: new THREE.MeshLambertMaterial({ color: 0x4b4742 }),
    mouth: new THREE.MeshLambertMaterial({ color: 0x14110f }),
    // Biome-themed entrance stone: pale sandstone for the desert, blue-white ice
    // for the snow, and a darker step stone for everywhere. Picked per entrance.
    iceRock: new THREE.MeshLambertMaterial({ color: 0xbfe0ef }),
    iceRockDark: new THREE.MeshLambertMaterial({ color: 0x8fb8cf }),
    sandRock: new THREE.MeshLambertMaterial({ color: 0xc7ab74 }),
    sandRockDark: new THREE.MeshLambertMaterial({ color: 0xa1854f }),
    stepStone: new THREE.MeshLambertMaterial({ color: 0x5a554e }),
    chestBody: new THREE.MeshLambertMaterial({ color: 0x7a4a22 }),
    chestLid: new THREE.MeshLambertMaterial({ color: 0x8a5628 }),
    chestBand: new THREE.MeshLambertMaterial({ color: 0xe0b441 }),
    chestOpen: new THREE.MeshLambertMaterial({ color: 0x4f7a3a }),
    web: new THREE.MeshBasicMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }),
    bone: new THREE.MeshLambertMaterial({ color: 0xddd6c4 }),
    moss: new THREE.MeshLambertMaterial({ color: 0x4a6a38 }),
    hide: new THREE.MeshLambertMaterial({ color: 0x8a6a44 }),       // tent hide
    wood: new THREE.MeshLambertMaterial({ color: 0x5a3a22 }),       // totem/post
    scorch: new THREE.MeshLambertMaterial({ color: 0x1a1410 }),     // burned ground
    ember: new THREE.MeshBasicMaterial({ color: 0xff5522 }),        // glowing embers
    sand: new THREE.MeshLambertMaterial({ color: 0xcab278 }),       // pyramid stone
  };
  return mats;
}

// A flat radial cobweb quad (corner web), for spider caves.
function cobweb(size) {
  const g = new THREE.PlaneGeometry(size, size);
  return g;
}

// Themed decoration scattered outside an entrance, by the cave's main family.
function buildEntranceDecor(group, world, d, m) {
  const fams = d.creatureFamilies || [];
  const around = (i, spread = 9) => {
    const a = (i * 2.39996);                       // golden-angle spread
    const r = 3.5 + (i % 3) * (spread / 3);
    const x = d.x + Math.cos(a) * r, z = d.z + Math.sin(a) * r;
    return { x, z, y: world.heightAt(x, z) };
  };

  if (fams.includes('spider')) {
    // Cobwebs strung between the boulders and over the mouth.
    for (let i = 0; i < 9; i++) {
      const p = around(i, 10);
      const web = new THREE.Mesh(cobweb(1.6 + (i % 3) * 0.6), m.web);
      web.position.set(p.x, p.y + 1.0 + (i % 2) * 0.6, p.z);
      web.rotation.set(Math.PI / 2 * (i % 2), i, 0);
      group.add(web);
    }
    // a big web across the mouth
    const big = new THREE.Mesh(cobweb(4.2), m.web);
    big.position.set(d.x, world.heightAt(d.x, d.z) + 2.2, d.z + 3.4);
    big.scale.set(1, 1.1, 1);
    group.add(big);
  } else if (fams.includes('skeleton') || fams.includes('zombie')) {
    for (let i = 0; i < 7; i++) {
      const p = around(i, 8);
      const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 6), m.bone);
      bone.position.set(p.x, p.y + 0.15, p.z);
      bone.rotation.set(Math.PI / 2, 0, i);
      group.add(bone);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), m.bone);
      skull.position.set(p.x + 0.4, p.y + 0.18, p.z);
      group.add(skull);
    }
  } else if (fams.includes('troll') || fams.includes('ogre')) {
    // Troll camp: mossy boulders + a couple of crude hide tents and a bone totem.
    for (let i = 0; i < 6; i++) {
      const p = around(i, 8);
      const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + (i % 2) * 0.5, 0), m.moss);
      moss.position.set(p.x, p.y + 0.4, p.z);
      moss.rotation.set(i, i * 2, 0);
      group.add(moss);
    }
    for (let i = 0; i < 2; i++) {
      const p = around(i * 4 + 1, 7);
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.0, 5), m.hide);
      tent.position.set(p.x, p.y + 1.0, p.z);
      group.add(tent);
    }
  } else if (fams.includes('orc')) {
    // Orc camp: more structured — hide tents, wooden palisade posts and a totem.
    for (let i = 0; i < 3; i++) {
      const p = around(i * 3 + 1, 8);
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.2, 4), m.hide);
      tent.position.set(p.x, p.y + 1.1, p.z);
      tent.rotation.y = i;
      group.add(tent);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = d.x + Math.cos(a) * 11, pz = d.z + Math.sin(a) * 11;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.6, 6), m.wood);
      post.position.set(px, world.heightAt(px, pz) + 0.8, pz);
      group.add(post);
    }
    const totem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.6, 6), m.wood);
    totem.position.set(d.x - 3, world.heightAt(d.x - 3, d.z - 3) + 1.3, d.z - 3);
    group.add(totem);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), m.bone);
    skull.position.set(d.x - 3, world.heightAt(d.x - 3, d.z - 3) + 2.7, d.z - 3);
    group.add(skull);
  } else if (fams.includes('dragon') || fams.includes('wyvern')) {
    // Dragon mountains: scorched ground patches with glowing embers and a few
    // charred bones (the user's "burned ground").
    for (let i = 0; i < 10; i++) {
      const p = around(i, 12);
      const burn = new THREE.Mesh(new THREE.CircleGeometry(1.0 + (i % 3) * 0.6, 12), m.scorch);
      burn.rotation.x = -Math.PI / 2;
      burn.position.set(p.x, p.y + 0.05, p.z);
      group.add(burn);
      if (i % 2 === 0) {
        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), m.ember);
        ember.position.set(p.x, p.y + 0.15, p.z);
        group.add(ember);
      }
    }
  }
}

// A simple stepped pyramid (sandstone) — desert zone structures, used instead of
// houses there. Returns a group placed on the terrain at (x,z).
export function buildPyramid(world, x, z, size = 6) {
  const m = materials();
  const g = new THREE.Group();
  const y0 = world.heightAt(x, z);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const s = size * (1 - i / tiers);
    const block = new THREE.Mesh(new THREE.BoxGeometry(s, size / tiers, s), m.sand);
    block.position.set(x, y0 + (i + 0.5) * (size / tiers), z);
    g.add(block);
  }
  return g;
}

// Builds a SOLID cave mouth for one dungeon and returns its center on terrain.
// The mound is a real obstacle — collision rings ring its base so you can't walk
// through the rock — with one open notch on the south side where a visible
// stairway descends into the dark mouth, Tibia-style. The stone is themed by the
// surrounding biome: pale ice in the snow, sandstone in the desert, grey rock
// elsewhere. The `descend` trigger sits on those steps (see buildDungeonEntrances).
function buildEntrance(group, world, d, m) {
  const y = world.heightAt(d.x, d.z);
  // Pick the entrance palette from the biome the mouth sits in.
  const biome = world.biomeAt ? world.biomeAt(d.x, d.z) : 'forest';
  const body = biome === 'snow' ? m.iceRock : biome === 'desert' ? m.sandRock : m.rock;
  const dark = biome === 'snow' ? m.iceRockDark : biome === 'desert' ? m.sandRockDark : m.rockDark;

  // A tumulus: a stack of chunky boulders forming a ring/hill around the mouth,
  // taller and wider than the old smooth dome so it reads as a cairn you must
  // walk around. The south notch (facing +Z, toward the steps) stays open.
  const R = 6.2;                                  // mound footprint radius
  const NOTCH = 0.55;                             // half-angle of the open stair notch (rad)
  const moundCenterA = Math.PI / 2;               // notch faces +Z (south)
  const bgeos = boulders();                       // shared craggy rock geometries
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    // Leave the south notch open for the stairway.
    let da = Math.abs(((a - moundCenterA + Math.PI) % (Math.PI * 2)) - Math.PI);
    if (da < NOTCH) continue;
    const rr = R - 0.4 + ((i % 3) - 1) * 0.5;
    const bx = d.x + Math.cos(a) * rr;
    const bz = d.z + Math.sin(a) * rr;
    const by = world.heightAt(bx, bz);
    const s = 1.6 + (i % 3) * 0.7;
    // Detail-1, pre-jittered boulder scaled to size: each ring stone reads as a
    // unique craggy rock carved by weather rather than a smooth lump.
    const rock = new THREE.Mesh(bgeos[i % bgeos.length], i % 2 ? body : dark);
    rock.scale.setScalar(s);
    rock.position.set(bx, by + s * 0.45, bz);
    rock.rotation.set(i * 1.3, i * 0.7, i * 0.5);
    group.add(rock);
    // SOLID: a collision circle for this boulder so the player can't pass through.
    if (world.addSolid) world.addSolid(bx, bz, s * 0.62);
  }
  // A rocky arch/brow over the mouth: a few craggy boulders bridging the top of
  // the south notch so the entrance reads as carved INTO the rock, not just a
  // gap in a ring. Sit them above and behind the mouth disc; no collision (they
  // overhang head height where the player can't stand).
  for (let i = 0; i < 4; i++) {
    const t = (i / 3) - 0.5;                       // -0.5 .. 0.5 across the brow
    const bx = d.x + t * 5.2;
    const bz = d.z + 2.4 - Math.abs(t) * 0.8;      // dip the ends down a touch
    const by = world.heightAt(d.x, d.z) + 3.9 - Math.abs(t) * 1.1;
    const s = 1.5 - Math.abs(t) * 0.5;
    const rock = new THREE.Mesh(bgeos[(i + 2) % bgeos.length], i % 2 ? dark : body);
    rock.scale.setScalar(s);
    rock.position.set(bx, by, bz);
    rock.rotation.set(i * 0.9, i * 1.7, i * 0.4);
    group.add(rock);
  }
  // A capping back wall behind the mouth (north side) so the hill reads tall.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(4.6, 10, 8), body);
  cap.scale.set(1.4, 0.9, 1.0);
  cap.position.set(d.x, y + 1.4, d.z - 1.6);
  group.add(cap);
  if (world.addSolid) world.addSolid(d.x, d.z - 1.6, 3.4);

  // the dark mouth: a flattened arch ring against a black disc, facing south
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.7, 8, 16), dark);
  ring.position.set(d.x, y + 2.2, d.z + 3.2);
  ring.scale.set(1, 1.15, 0.5);
  group.add(ring);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(2.4, 16), m.mouth);
  mouth.position.set(d.x, y + 2.2, d.z + 3.35);
  mouth.scale.set(1, 1.15, 1);
  group.add(mouth);

  // A clear, well-lit stairway descending through the notch into the mouth — the
  // way down. Wide stone steps that sink into the ground, with low side rails so
  // the stair reads at a glance from across the field (Tibia "hole with stairs").
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const sy = y + 0.15 - i * 0.5;
    const sz = d.z + 1.6 + i * 0.72;
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.42, 0.9), m.stepStone);
    step.position.set(d.x, sy, sz);
    group.add(step);
    // side rails (skip the very front so you can step on)
    if (i > 0) for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.95), dark);
      rail.position.set(d.x + side * 1.75, sy + 0.4, sz);
      group.add(rail);
      // A small craggy chunk tucked against the rail to rough up the clean edge
      // (cheap: shares the pooled boulder geometry, only on the rail steps).
      const chunk = new THREE.Mesh(bgeos[(i + side + 5) % bgeos.length], dark);
      chunk.scale.setScalar(0.45 + (i % 2) * 0.15);
      chunk.position.set(d.x + side * 2.0, sy, sz);
      chunk.rotation.set(i * 0.7, side * 1.1, i * 0.5);
      group.add(chunk);
    }
  }
  // a dark pit at the bottom of the steps to sell the descent
  const pit = new THREE.Mesh(new THREE.CircleGeometry(1.7, 14), m.mouth);
  pit.rotation.x = -Math.PI / 2;
  pit.position.set(d.x, y - 2.6, d.z + 1.6 + steps * 0.72);
  group.add(pit);

  return y;
}

// Builds a closed treasure chest near the cave mouth. The lid is a child so it
// can be rotated open later.
function buildChest(group, world, d, m) {
  const cx = d.x + 4.5;
  const cz = d.z + 4.5;
  const cy = world.heightAt(cx, cz);

  const chest = new THREE.Group();
  chest.position.set(cx, cy, cz);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.0), m.chestBody);
  body.position.y = 0.45;
  chest.add(body);

  const band = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.18, 1.05), m.chestBand);
  band.position.y = 0.45;
  chest.add(band);

  // the lid pivots from its rear edge so rotating -X opens it
  const lid = new THREE.Group();
  lid.position.set(0, 0.9, -0.5);
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 1.0), m.chestLid);
  lidMesh.position.set(0, 0.0, 0.5);
  lid.add(lidMesh);
  chest.add(lid);
  chest.userData.lid = lid;

  group.add(chest);
  return { mesh: chest, x: cx, z: cz, baseY: cy };
}

// Builds all dungeon entrances and their chests, snapped to terrain height.
// Returns the group plus lookup arrays for entrances and chests.
export function buildDungeonEntrances(scene, world) {
  const m = materials();
  const group = new THREE.Group();
  const entrances = [];
  const chests = [];

  for (const d of DUNGEONS) {
    buildEntrance(group, world, d, m);
    buildEntranceDecor(group, world, d, m);
    const c = buildChest(group, world, d, m);
    entrances.push({
      dungeon: d, x: d.x, z: d.z, radius: ENTRANCE_RADIUS,
      // Standing on the steps (in front of the mouth) descends into the cave.
      descend: { x: d.x, z: d.z + 4.0, radius: 2.4 },
      // Within this wider radius the cave's creatures also spawn on the surface.
      outsideRadius: OUTSIDE_RADIUS,
    });
    chests.push({
      dungeon: d, mesh: c.mesh, x: c.x, z: c.z, baseY: c.baseY,
      opened: false, questId: d.chest.questId, reward: d.chest,
    });
  }

  // Desert zone structures: pyramids instead of houses (Khelmun desert). These
  // are pure scenery, placed at the desert camp anchors.
  const DESERT_PYRAMIDS = [
    { x: 1040, z: 220, size: 8 }, { x: 1160, z: 320, size: 6 },
    { x: 1180, z: 260, size: 11 }, { x: 1180, z: 180, size: 5 },
  ];
  for (const py of DESERT_PYRAMIDS) group.add(buildPyramid(world, py.x, py.z, py.size));

  scene.add(group);
  return { group, entrances, chests };
}

// Returns the dungeon whose mouth the point is within, or null.
export function dungeonEntranceAt(entrances, x, z) {
  for (const e of entrances) {
    if (Math.hypot(e.x - x, e.z - z) < e.radius) return e.dungeon;
  }
  return null;
}

// Returns the dungeon whose descend-steps the point is standing on, or null.
export function dungeonDescendAt(entrances, x, z) {
  for (const e of entrances) {
    const dd = e.descend;
    if (dd && Math.hypot(dd.x - x, dd.z - z) < dd.radius) return e.dungeon;
  }
  return null;
}

// Returns the dungeon whose wider outside-influence radius the point is in, or
// null. Used so cave creatures also appear on the surface near the entrance.
export function dungeonOutsideAt(entrances, x, z) {
  for (const e of entrances) {
    const r = e.outsideRadius || e.radius;
    if (Math.hypot(e.x - x, e.z - z) < r) return e.dungeon;
  }
  return null;
}

// Returns the chest the point is standing next to, or null.
export function chestAt(chests, x, z) {
  for (const c of chests) {
    if (Math.hypot(c.x - x, c.z - z) < CHEST_RADIUS) return c;
  }
  return null;
}

// Opens a chest visually: swings the lid up, tints the body and flags it.
export function openChestVisual(chest) {
  if (chest.opened) return;
  chest.opened = true;
  const lid = chest.mesh.userData.lid;
  if (lid) lid.rotation.x = -2.1;
  const m = materials();
  chest.mesh.children.forEach((c) => {
    if (c.material === m.chestBody) c.material = m.chestOpen;
  });
}

// Subtle idle motion: unopened chests bob and slowly spin so they read as
// loot from a distance. Cheap and time-driven, no per-frame allocation.
let clock = 0;
export function update(dt, chests) {
  clock += dt;
  if (!chests) return;
  for (const c of chests) {
    if (c.opened) continue;
    c.mesh.position.y = c.baseY + Math.sin(clock * 2 + c.x) * 0.12 + 0.12;
    c.mesh.rotation.y += dt * 0.4;
  }
}
