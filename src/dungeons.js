import * as THREE from 'three';

// Cave and dungeon locations scattered far from the cities. Each dungeon marks
// a spot where certain creature families spawn denser inside, and carries a
// reward chest the player can open once. Coordinates are deterministic literals
// chosen to sit well away from the four cities (see cities.js).
export const DUNGEONS = [
  {
    id: 'ratcave', name: { es: 'Cueva de Ratas', en: 'Rat Cave' },
    x: 90, z: 120, minLevel: 1,
    creatureFamilies: ['rat', 'worm'],
    chest: { itemId: 'copper_sword', reward: 1, questId: 'rat-cave-clear' },
  },
  {
    id: 'spidernest', name: { es: 'Nido de Aranas', en: 'Spider Nest' },
    x: -260, z: -180, minLevel: 6,
    creatureFamilies: ['spider', 'beetle'],
    chest: { itemId: 'leather_armor', reward: 1, questId: 'spider-nest-clear' },
  },
  {
    id: 'orcfort', name: { es: 'Fuerte Orco', en: 'Orc Fort' },
    x: 540, z: -260, minLevel: 14,
    creatureFamilies: ['orc', 'goblin', 'kobold'],
    chest: { itemId: 'iron_sword', reward: 1, questId: 'orc-fort-clear' },
  },
  {
    id: 'trollcave', name: { es: 'Cueva del Trol', en: 'Troll Cave' },
    x: -540, z: 460, minLevel: 22,
    creatureFamilies: ['troll', 'ogre'],
    chest: { itemId: 'steel_sword', reward: 1, questId: 'troll-cave-clear' },
  },
  {
    id: 'undeadcrypt', name: { es: 'Cripta de los Muertos', en: 'Undead Crypt' },
    x: 420, z: 620, minLevel: 30,
    creatureFamilies: ['skeleton', 'zombie', 'ghost', 'wraith'],
    chest: { itemId: 'knight_sword', reward: 1, questId: 'undead-crypt-clear' },
  },
  {
    id: 'dragonlair', name: { es: 'Guarida del Dragon', en: 'Dragon Lair' },
    x: 200, z: -760, minLevel: 40,
    creatureFamilies: ['dragon', 'wyvern', 'lizardman'],
    chest: { itemId: 'dragon_shield', reward: 1, questId: 'dragon-lair-clear' },
  },
  {
    id: 'demonabyss', name: { es: 'Abismo Demoniaco', en: 'Demon Abyss' },
    x: -780, z: -680, minLevel: 50,
    creatureFamilies: ['demon', 'imp', 'cultist'],
    chest: { itemId: 'demon_sword', reward: 1, questId: 'demon-abyss-clear' },
  },
];

const ENTRANCE_RADIUS = 7;   // how close counts as "at the cave mouth"
const CHEST_RADIUS = 2.5;    // how close counts as "at the chest"

// Shared materials, created lazily so the module can be imported without a
// live THREE context for static checks.
let mats = null;
function materials() {
  if (mats) return mats;
  mats = {
    rock: new THREE.MeshLambertMaterial({ color: 0x6f6a63 }),
    rockDark: new THREE.MeshLambertMaterial({ color: 0x4b4742 }),
    mouth: new THREE.MeshLambertMaterial({ color: 0x14110f }),
    chestBody: new THREE.MeshLambertMaterial({ color: 0x7a4a22 }),
    chestLid: new THREE.MeshLambertMaterial({ color: 0x8a5628 }),
    chestBand: new THREE.MeshLambertMaterial({ color: 0xe0b441 }),
    chestOpen: new THREE.MeshLambertMaterial({ color: 0x4f7a3a }),
  };
  return mats;
}

// Builds a rocky cave mouth for one dungeon and returns its center on terrain.
function buildEntrance(group, world, d, m) {
  const y = world.heightAt(d.x, d.z);

  // a low rock mound the mouth is set into
  const mound = new THREE.Mesh(new THREE.SphereGeometry(5.5, 10, 8), m.rock);
  mound.scale.set(1.3, 0.7, 1.1);
  mound.position.set(d.x, y + 0.6, d.z);
  group.add(mound);

  // a few boulders around the base for a rugged silhouette
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.6;
    const bx = d.x + Math.cos(a) * 5.2;
    const bz = d.z + Math.sin(a) * 5.2;
    const by = world.heightAt(bx, bz);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 + (i % 2) * 0.4, 0), m.rockDark);
    rock.position.set(bx, by + 0.5, bz);
    rock.rotation.y = a;
    group.add(rock);
  }

  // the dark mouth: a flattened torus ring against a black disc, facing south
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.7, 8, 16), m.rockDark);
  ring.position.set(d.x, y + 2.2, d.z + 3.4);
  ring.scale.set(1, 1.15, 0.5);
  group.add(ring);

  const mouth = new THREE.Mesh(new THREE.CircleGeometry(2.4, 16), m.mouth);
  mouth.position.set(d.x, y + 2.2, d.z + 3.55);
  mouth.scale.set(1, 1.15, 1);
  group.add(mouth);

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
    const c = buildChest(group, world, d, m);
    entrances.push({ dungeon: d, x: d.x, z: d.z, radius: ENTRANCE_RADIUS });
    chests.push({
      dungeon: d, mesh: c.mesh, x: c.x, z: c.z, baseY: c.baseY,
      opened: false, questId: d.chest.questId, reward: d.chest,
    });
  }

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
