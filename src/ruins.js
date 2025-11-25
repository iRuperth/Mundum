import * as THREE from 'three';

// Surface RUINS — abandoned buildings, ghost towns and broken structures that
// are open-air hunting grounds, NOT caves. The user wanted outdoor sites: a
// derelict multi-floor town crawling with ghosts/undead, ruined watchtowers full
// of orcs, a collapsed temple, etc. Each ruin sits in a themed spot, builds solid
// walls/floors you can walk among (and climb, where there are stairs), and acts
// like a dungeon's outside-influence: within its radius the named creature
// families spawn, ignoring the gentle wilderness pool.
//
// Ruins reuse the World.addSolid collision system, so their walls block movement.
// They duck-type just enough for main.js to query "am I in a ruin?" for spawning.

// Each ruin: id, a label, world anchor (snapped to terrain), the creature
// `families` that haunt it, a `radius` of spawn influence, and a `kind` that
// drives which structure is built. Levels come from the families themselves
// (same as caves), so a ruin in a high zone is dangerous and one near the start
// is gentle.
export const RUINS = [
  {
    id: 'hollowmoor', label: { es: 'Pueblo Fantasma de Hollowmoor', en: 'Hollowmoor Ghost Town' },
    x: 300, z: 520, radius: 90, kind: 'ghosttown',
    families: ['ghost', 'skeleton', 'zombie', 'wraith'],
  },
  {
    id: 'ruinwatch', label: { es: 'Atalayas en Ruinas', en: 'Ruined Watchtowers' },
    x: 600, z: -180, radius: 80, kind: 'towers',
    families: ['orc', 'goblin'],
  },
  {
    id: 'sunktemple', label: { es: 'Templo Derruido', en: 'Fallen Temple' },
    // Out east in the desert.
    x: 980, z: 480, radius: 80, kind: 'temple',
    families: ['scorpion', 'zombie', 'beetle'],
  },
  {
    id: 'frostkeep', label: { es: 'Fortaleza Helada', en: 'Frozen Keep' },
    // Up north in the snow.
    x: -120, z: -980, radius: 80, kind: 'keep',
    families: ['wolf', 'bear', 'troll'],
  },
];

const ENTRANCE_PAD = 0;
const tmp = new THREE.Color();

let mats = null;
function materials() {
  if (mats) return mats;
  mats = {
    stone: new THREE.MeshLambertMaterial({ color: 0x8d877c, flatShading: true }),
    stoneDark: new THREE.MeshLambertMaterial({ color: 0x6a655c, flatShading: true }),
    mossStone: new THREE.MeshLambertMaterial({ color: 0x6f7a5a, flatShading: true }),
    wood: new THREE.MeshLambertMaterial({ color: 0x5a4030, flatShading: true }),
    woodDark: new THREE.MeshLambertMaterial({ color: 0x3e2c20, flatShading: true }),
    ice: new THREE.MeshLambertMaterial({ color: 0xbfe0ef, flatShading: true }),
    iceDark: new THREE.MeshLambertMaterial({ color: 0x8fb8cf, flatShading: true }),
    sand: new THREE.MeshLambertMaterial({ color: 0xc7ab74, flatShading: true }),
    sandDark: new THREE.MeshLambertMaterial({ color: 0xa1854f, flatShading: true }),
    dark: new THREE.MeshLambertMaterial({ color: 0x14110f }),
    rubble: new THREE.MeshLambertMaterial({ color: 0x756f64, flatShading: true }),
    glass: new THREE.MeshBasicMaterial({ color: 0x222a2e }),     // broken/empty windows
  };
  return mats;
}

// A broken wall segment: a box with a jagged (lower at one end) top, registered
// solid so it blocks movement. `crumble` 0..1 lowers + tilts it.
function brokenWall(group, world, x, z, w, h, d, rot, mat, crumble = 0) {
  const y0 = world.heightAt(x, z);
  const hh = h * (1 - crumble * 0.6);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
  wall.position.set(x, y0 + hh / 2, z);
  wall.rotation.y = rot;
  wall.rotation.z = crumble * 0.12 * (((x + z) & 1) ? 1 : -1);
  group.add(wall);
  // Collision: a couple of circles along the wall so the whole span blocks.
  if (world.addSolid) {
    const half = w / 2;
    const fx = Math.cos(rot), fz = -Math.sin(rot);
    for (let t = -1; t <= 1; t++) {
      world.addSolid(x + fx * half * t * 0.7, z + fz * half * t * 0.7, Math.max(d, 0.6) * 0.6 + 0.2);
    }
  }
  return wall;
}

// A pile of rubble (collidable lump) for crumbled corners.
function rubblePile(group, world, x, z, s, mat) {
  const y0 = world.heightAt(x, z);
  const pile = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat);
  pile.position.set(x, y0 + s * 0.35, z);
  pile.rotation.set(x, z, x + z);
  group.add(pile);
  if (world.addSolid) world.addSolid(x, z, s * 0.6);
}

// A two/three-floor ruined house shell: outer walls with gaps, an upper floor
// slab reachable by an external stone stair, a broken roof. Open so creatures
// roam inside and you can climb to the upper floor to fight on it. Solid walls.
function ruinedHouse(group, world, cx, cz, mat, matDark, floors = 2) {
  const w = 8, d = 7, fh = 3.2;
  const y0 = world.heightAt(cx, cz);
  // Floor slabs (ground is terrain; upper floors are stone slabs you stand on).
  for (let f = 1; f < floors; f++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, 0.4, d - 0.6), matDark);
    slab.position.set(cx, y0 + f * fh, cz);
    group.add(slab);
  }
  // Four walls per the lower floors, each with a missing chunk (gap) so it reads
  // ruined and lets you walk in. Top floor walls are shorter (crumbled).
  const totalH = floors * fh;
  // North & south walls (run along x), with a doorway gap on the south.
  for (const [zz, gap] of [[cz - d / 2, false], [cz + d / 2, true]]) {
    if (gap) {
      // two short segments leaving a door
      brokenWall(group, world, cx - w / 4 - 0.6, zz, w / 2 - 1.2, totalH, 0.5, 0, mat, 0.15);
      brokenWall(group, world, cx + w / 4 + 0.6, zz, w / 2 - 1.2, totalH, 0.5, 0, mat, 0.15);
    } else {
      brokenWall(group, world, cx, zz, w, totalH, 0.5, 0, mat, 0.25);
    }
  }
  // East & west walls (run along z).
  for (const xx of [cx - w / 2, cx + w / 2]) {
    brokenWall(group, world, xx, cz, d, totalH, 0.5, Math.PI / 2, mat, 0.3);
  }
  // External stair to the upper floor (a short stone flight against the east wall).
  if (floors > 1) {
    for (let i = 0; i < 7; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.8), matDark);
      step.position.set(cx + w / 2 + 1.2, y0 + 0.2 + i * (fh - 0.4) / 7, cz - d / 2 + 1 + i * 0.5);
      group.add(step);
    }
  }
  // A few broken roof beams across the top.
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.25, 0.25), matDark);
    beam.position.set(cx, y0 + totalH + 0.3, cz + i * (d / 3));
    beam.rotation.z = 0.05 * i;
    group.add(beam);
  }
}

// A leaning ruined tower: a tall cylinder shell, broken at the top, solid.
function ruinedTower(group, world, cx, cz, mat, matDark, h = 11) {
  const y0 = world.heightAt(cx, cz);
  const r = 2.6;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.5, h, 12, 1, true), mat);
  tower.position.set(cx, y0 + h / 2, cz);
  tower.rotation.x = 0.03; tower.rotation.z = 0.04;   // a slight lean
  group.add(tower);
  if (world.addSolid) world.addSolid(cx, cz, r + 0.4);
  // jagged broken crown: a ring of blocks of varying height
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const bh = 0.6 + (i % 3) * 0.6;
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.9, bh, 0.6), matDark);
    merlon.position.set(cx + Math.cos(a) * r, y0 + h + bh / 2 - 0.2, cz + Math.sin(a) * r);
    merlon.rotation.y = -a;
    group.add(merlon);
  }
  // a doorway-dark disc at the base
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), materials().dark);
  door.position.set(cx, y0 + 1.3, cz + r + 0.01);
  group.add(door);
}

// A toppled column (collidable) + base, for temples.
function column(group, world, cx, cz, mat, toppled = false) {
  const y0 = world.heightAt(cx, cz);
  if (toppled) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 10), mat);
    seg.rotation.z = Math.PI / 2;
    seg.position.set(cx, y0 + 0.5, cz);
    group.add(seg);
    if (world.addSolid) world.addSolid(cx, cz, 1.2);
  } else {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 6, 12), mat);
    col.position.set(cx, y0 + 3, cz);
    group.add(col);
    if (world.addSolid) world.addSolid(cx, cz, 0.8);
  }
}

// Build one ruin's structures into `group`, themed by kind.
function buildRuin(group, world, r) {
  const m = materials();
  // Pick palette by kind (cosmetic theme).
  const pal = r.kind === 'keep'
    ? { wall: m.ice, dark: m.iceDark }
    : r.kind === 'temple'
      ? { wall: m.sand, dark: m.sandDark }
      : r.kind === 'ghosttown'
        ? { wall: m.mossStone, dark: m.stoneDark }
        : { wall: m.stone, dark: m.stoneDark };

  const around = (i, n, rad) => {
    const a = (i / n) * Math.PI * 2 + (r.id.length % 7) * 0.3;
    return { x: r.x + Math.cos(a) * rad, z: r.z + Math.sin(a) * rad };
  };

  if (r.kind === 'ghosttown') {
    // A derelict village: a ring of ruined houses (some 2-3 floors) around a
    // broken square with a dry fountain and toppled lamp posts.
    const n = 8;
    for (let i = 0; i < n; i++) {
      const p = around(i, n, 26 + (i % 3) * 8);
      ruinedHouse(group, world, p.x, p.z, pal.wall, pal.dark, 2 + (i % 2));
    }
    // central plaza wreck
    const fy = world.heightAt(r.x, r.z);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.8, 16), pal.dark);
    basin.position.set(r.x, fy + 0.4, r.z);
    group.add(basin);
    if (world.addSolid) world.addSolid(r.x, r.z, 2.6);
    for (let i = 0; i < 5; i++) { const p = around(i, 5, 14); rubblePile(group, world, p.x, p.z, 1 + (i % 2) * 0.6, m.rubble); }
  } else if (r.kind === 'towers') {
    // Three leaning watchtowers and a length of broken curtain wall between them.
    const n = 3;
    const pts = [];
    for (let i = 0; i < n; i++) { const p = around(i, n, 30); pts.push(p); ruinedTower(group, world, p.x, p.z, pal.wall, pal.dark, 10 + i * 2); }
    // curtain wall chunks linking the towers
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      const rot = Math.atan2(b.x - a.x, b.z - a.z);
      brokenWall(group, world, mx, mz, Math.hypot(b.x - a.x, b.z - a.z) * 0.55, 4.5, 1.0, rot + Math.PI / 2, pal.wall, 0.4);
    }
    for (let i = 0; i < 6; i++) { const p = around(i, 6, 18); rubblePile(group, world, p.x, p.z, 1 + (i % 2), m.rubble); }
  } else if (r.kind === 'temple') {
    // A colonnade: two rows of columns (some toppled) around a cracked altar dais.
    for (let i = 0; i < 6; i++) {
      column(group, world, r.x - 10 + i * 4, r.z - 6, pal.wall, i % 3 === 0);
      column(group, world, r.x - 10 + i * 4, r.z + 6, pal.wall, i % 4 === 0);
    }
    const dy = world.heightAt(r.x, r.z);
    const dais = new THREE.Mesh(new THREE.BoxGeometry(7, 0.8, 5), pal.dark);
    dais.position.set(r.x, dy + 0.4, r.z);
    group.add(dais);
    const altar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.6), pal.wall);
    altar.position.set(r.x, dy + 1.4, r.z);
    group.add(altar);
    if (world.addSolid) world.addSolid(r.x, r.z, 1.6);
    for (let i = 0; i < 5; i++) { const p = around(i, 5, 16); rubblePile(group, world, p.x, p.z, 1 + (i % 2) * 0.7, m.rubble); }
  } else { // keep
    // A square ruined keep: thick broken walls forming a courtyard, a stub tower
    // at one corner, frozen rubble. Walls are solid; the south wall has a gate.
    const s = 16, hy = world.heightAt(r.x, r.z);
    // north / south / east / west curtain walls with a south gate
    brokenWall(group, world, r.x, r.z - s / 2, s, 5, 1.2, 0, pal.wall, 0.35);
    brokenWall(group, world, r.x - s / 4 - 1, r.z + s / 2, s / 2 - 2, 5, 1.2, 0, pal.wall, 0.35);
    brokenWall(group, world, r.x + s / 4 + 1, r.z + s / 2, s / 2 - 2, 5, 1.2, 0, pal.wall, 0.35);
    brokenWall(group, world, r.x - s / 2, r.z, s, 5, 1.2, Math.PI / 2, pal.wall, 0.4);
    brokenWall(group, world, r.x + s / 2, r.z, s, 5, 1.2, Math.PI / 2, pal.wall, 0.4);
    ruinedTower(group, world, r.x - s / 2, r.z - s / 2, pal.wall, pal.dark, 9);
    for (let i = 0; i < 6; i++) { const p = around(i, 6, 12); rubblePile(group, world, p.x, p.z, 1 + (i % 2), m.rubble); }
  }
}

// Build every ruin's geometry and return the group + lookup data. main.js adds
// the group to the scene and uses ruinAt() to drive spawning inside a ruin.
export function buildRuins(scene, world) {
  const group = new THREE.Group();
  for (const r of RUINS) {
    // Snap the anchor to solid ground so the ruin doesn't float over water.
    const spot = findRuinLand(world, r.x, r.z);
    r.x = spot.x; r.z = spot.z;
    buildRuin(group, world, r);
  }
  scene.add(group);
  return { group, ruins: RUINS };
}

// Nudge a ruin anchor to nearby walkable land (height in a sane band, gentle
// slope), mirroring the city land search but cheaper.
function findRuinLand(world, ox, oz) {
  for (let rad = 0; rad < 600; rad += 28) {
    const steps = Math.max(1, Math.floor(rad / 28) * 6);
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(ox + Math.cos(a) * rad);
      const z = Math.round(oz + Math.sin(a) * rad);
      const h = world.heightAt(x, z);
      if (h < 1.6 || h > 16) continue;
      const slope = Math.abs(world.heightAt(x + 3, z) - h) + Math.abs(world.heightAt(x, z + 3) - h);
      if (slope < 1.4) return { x, z };
    }
  }
  return { x: ox, z: oz };
}

// The ruin whose influence radius the point falls in, or null. Used by the
// spawner so a ruin's haunting families spawn around (and inside) it.
export function ruinAt(x, z) {
  for (const r of RUINS) {
    if (Math.hypot(r.x - x, r.z - z) < r.radius) return r;
  }
  return null;
}
