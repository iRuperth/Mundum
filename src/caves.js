import * as THREE from 'three';
import { makeNoise } from './noise.js';

// A generated underground cave SYSTEM, Tibia-style — now MULTI-FLOOR and big.
//
// A dungeon expands into several stacked floors (rooms). Each floor is a large
// enclosed room with rocky walls, stalagmites and its own lighting. Floors are
// linked by internal stairs: a DOWN stair sinks you to the next (deeper, harder)
// floor, an UP stair climbs back toward the surface; the top floor's up-stair is
// the exit to the overworld. The deeper you go the tougher the creatures and the
// bigger the respawn area — the cave's reward chests sit on the deepest floor.
//
// The whole system duck-types the World interface (heightAt / solidAt / update /
// noise) for the ACTIVE floor, so the player and combat code treat it like the
// surface world once swapped in. main.js drives floor changes via descendFloor /
// ascendFloor and reads `activeFloorIndex` for difficulty + the minimap.

const WALL_H = 8;           // wall / ceiling height (taller, roomier)
const PLAYER_PAD = 0.45;    // keep the player off the walls by this much

// Deterministic per-vertex jitter: roughens a faceted geometry in place so a
// clean primitive (cone, dodecahedron, gem) reads as natural craggy rock. The
// offset is hashed from the vertex position so it's stable across rebuilds (no
// Math.random — the project stays deterministic). `amt` is the max push in metres.
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

// Cheap geometry merge for the few hand-built composites (e.g. the stacked-cone
// column). Concatenates the (already non-indexed / expanded) position attributes
// of several geometries into one non-indexed BufferGeometry — enough for our
// flat-shaded rock, where we re-jitter and recompute normals afterwards anyway.
// Avoids pulling in BufferGeometryUtils for one call.
function mergePositions(geos) {
  const parts = geos.map((g) => g.toNonIndexed().attributes.position.array);
  let total = 0;
  for (const a of parts) total += a.length;
  const out = new Float32Array(total);
  let off = 0;
  for (const a of parts) { out.set(a, off); off += a.length; }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(out, 3));
  merged.computeVertexNormals();
  return merged;
}

// Short, dark fog so the room reads deep without revealing the wall seams. A
// touch farther than before since the rooms are much larger now.
export function caveFog() { return new THREE.Fog(0x070608, 9, 70); }
export function caveBackground() { return new THREE.Color(0x070608); }

// One floor of a cave system: a single big room. Owns its geometry, its solids,
// and the stair landings that link it up/down. floorIndex 0 is the top (entrance)
// floor; higher indices are deeper and harder.
class CaveFloor {
  constructor(scene, dungeon, floorIndex, floorCount) {
    this.scene = scene;
    this.dungeon = dungeon;
    this.floorIndex = floorIndex;
    this.floorCount = floorCount;
    this.floorY = 0.7;
    // Rooms grow with the cave's size and a little with depth, so there's lots of
    // space to hunt. Much bigger than the old 22x22 box.
    const big = dungeon.big ? 14 : 0;
    this.halfX = 46 + big + floorIndex * 4;
    this.halfZ = 46 + big + floorIndex * 4;
    this.cx = 0; this.cz = 0;            // each floor is centered on origin
    this.noise = makeNoise(0xCAFE ^ hashId(dungeon.id) ^ (floorIndex * 2654435761));

    this.solidsList = [];                // interior pillar/stalagmite footprints
    // Stair landings. The up-stair sits in the +Z wall; the down-stair (only on
    // non-deepest floors) sits in the -Z wall, so the two are at opposite ends
    // and you cross the whole room between them.
    this.upStairs = { x: 0, z: this.halfZ - 5, radius: 3.0 };
    this.downStairs = floorIndex < floorCount - 1
      ? { x: 0, z: -this.halfZ + 5, radius: 3.0 }
      : null;
    // Where the player should appear when arriving on this floor from above /
    // below. Arriving from above lands you at the down-stair foot you just used,
    // i.e. this floor's up-stair landing; arriving from below lands at the
    // down-stair landing.
    this.arriveFromAbove = { x: this.upStairs.x, z: this.upStairs.z - 5 };
    this.arriveFromBelow = this.downStairs
      ? { x: this.downStairs.x, z: this.downStairs.z + 5 }
      : { x: 0, z: 0 };

    this.group = new THREE.Group();
    this.group.visible = false;
    this._torchLights = [];

    this._build();
    scene.add(this.group);
  }

  // --- World interface (for the active floor) ------------------------------

  heightAt() { return this.floorY; }

  solidAt(x, z, pad = 0) {
    const p = pad + PLAYER_PAD;
    if (Math.abs(x - this.cx) > this.halfX - p || Math.abs(z - this.cz) > this.halfZ - p) return true;
    for (const s of this.solidsList) {
      const rr = s.r + pad;
      const dx = s.x - x, dz = s.z - z;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
  }

  clampSpawn(x, z) {
    const m = 2.5;
    return {
      x: THREE.MathUtils.clamp(x, this.cx - this.halfX + m, this.cx + this.halfX - m),
      z: THREE.MathUtils.clamp(z, this.cz - this.halfZ + m, this.cz + this.halfZ - m),
    };
  }

  update() {
    const f = 0.8 + Math.sin(performance.now() * 0.009) * 0.12 + Math.sin(performance.now() * 0.021) * 0.06;
    for (const l of this._torchLights) l.intensity = l.userData.base * f;
  }

  setVisible(v) { this.group.visible = v; }

  // --- Geometry ------------------------------------------------------------

  _build() {
    const n = this.noise;
    // Deeper floors get a darker, cooler stone so descent feels like going deeper.
    const depthT = this.floorCount > 1 ? this.floorIndex / (this.floorCount - 1) : 0;
    const floorBase = new THREE.Color(0x4a4540).lerp(new THREE.Color(0x33312f), depthT);
    const wallCol = new THREE.Color(0x4a4640).lerp(new THREE.Color(0x352f33), depthT);

    const matFloor = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const matWall = new THREE.MeshLambertMaterial({ color: wallCol.getHex(), flatShading: true });
    const matWallDark = new THREE.MeshLambertMaterial({ color: 0x2c2926, flatShading: true });
    const matRock = new THREE.MeshLambertMaterial({ color: 0x55504a, flatShading: true });
    const matCeil = new THREE.MeshLambertMaterial({ color: 0x231f1c, flatShading: true });
    const matStone = new THREE.MeshLambertMaterial({ color: 0x6a655d, flatShading: true });
    // A bright, faintly glowing crystal tone — its hue deepens (warm->cool) with
    // depth so deeper floors feel more magical. Emissive so it reads in the gloom.
    const crystalCol = new THREE.Color(0x6fd0ff).lerp(new THREE.Color(0xb98cff), depthT);
    const matCrystal = new THREE.MeshLambertMaterial({
      color: crystalCol.getHex(), emissive: crystalCol.clone().multiplyScalar(0.5).getHex(), flatShading: true,
    });

    // Floor with mottled rock vertex colors. More subdivisions for the big room.
    const segs = 40;
    const fgeo = new THREE.PlaneGeometry(this.halfX * 2, this.halfZ * 2, segs, segs);
    fgeo.rotateX(-Math.PI / 2);
    const pos = fgeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i), wz = pos.getZ(i);
      // Two octaves: a broad rolling swell plus a finer, faster ripple so the
      // floor reads as genuinely rocky/uneven. Capped well under ~0.3m so it's
      // purely visual and the (flat) heightAt() walk stays honest.
      const lo = n.fbm(wx * 0.2 + 5, wz * 0.2, 2) * 0.2;
      const hi = n.fbm(wx * 0.7 - 3, wz * 0.7 + 2, 2) * 0.1;
      pos.setY(i, this.floorY - 0.05 + lo + hi);
      const j = n.hash(Math.round(wx * 6), Math.round(wz * 6));
      tmp.copy(floorBase).multiplyScalar(0.82 + j * 0.3);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    pos.needsUpdate = true;
    fgeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    fgeo.computeVertexNormals();
    this.group.add(new THREE.Mesh(fgeo, matFloor));

    // Ceiling.
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(this.halfX * 2, this.halfZ * 2), matCeil);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = WALL_H;
    this.group.add(ceil);

    // Four walls.
    const T = 1.4;
    const walls = [
      [0, this.halfZ + T / 2, this.halfX * 2 + T * 2, T],
      [0, -this.halfZ - T / 2, this.halfX * 2 + T * 2, T],
      [this.halfX + T / 2, 0, T, this.halfZ * 2 + T * 2],
      [-this.halfX - T / 2, 0, T, this.halfZ * 2 + T * 2],
    ];
    for (const [wx, wz, sx, sz] of walls) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(sx, WALL_H, sz), matWall);
      w.position.set(wx, WALL_H / 2, wz);
      this.group.add(w);
    }

    // Rocky bumps along the wall bases for a rugged silhouette. Count scales with
    // the (now much larger) perimeter. These use a detail-1 dodecahedron with a
    // deterministic vertex jitter so each boulder is a unique craggy chunk rather
    // than a clean stone — the wall base reads as natural broken rock. We share a
    // small pool of pre-jittered geometries (cheap) and pick one per bump.
    const rockGeos = [];
    for (let g = 0; g < 4; g++) {
      rockGeos.push(jitterGeometry(new THREE.DodecahedronGeometry(1, 1), 0.22, g * 17));
    }
    const bumpCount = Math.round((this.halfX + this.halfZ) * 1.25);
    for (let i = 0; i < bumpCount; i++) {
      const side = i % 4;
      const t = n.hash(i * 7, side);
      const along = (t - 0.5) * 2 * (this.halfX - 1.5);
      let x, z;
      if (side === 0) { x = along; z = this.halfZ - 0.6; }
      else if (side === 1) { x = along; z = -this.halfZ + 0.6; }
      else if (side === 2) { x = this.halfX - 0.6; z = along; }
      else { x = -this.halfX + 0.6; z = along; }
      // Wider size spread: mostly low rubble with the odd big shoulder boulder.
      const big = n.hash(i, 99) > 0.82;
      const s = (big ? 2.2 : 0.7) + n.hash(i, i * 3) * (big ? 1.6 : 1.6);
      const geo = rockGeos[(i * 7 + side) % rockGeos.length];
      const rock = new THREE.Mesh(geo, matRock);
      rock.scale.setScalar(s);
      rock.position.set(x, this.floorY + s * 0.3, z);
      rock.rotation.set(n.hash(i, 1) * 6, n.hash(i, 2) * 6, n.hash(i, 3) * 6);
      this.group.add(rock);
    }
    // A few craggy boulders shouldered mid-wall (higher up) so the walls don't
    // read as flat slabs above the rubble line. Sparse — one every ~third bump.
    const midCount = Math.round((this.halfX + this.halfZ) * 0.18);
    for (let i = 0; i < midCount; i++) {
      const side = i % 4;
      const along = (n.hash(i * 23, side + 5) - 0.5) * 2 * (this.halfX - 4);
      let x, z;
      if (side === 0) { x = along; z = this.halfZ - 1.0; }
      else if (side === 1) { x = along; z = -this.halfZ + 1.0; }
      else if (side === 2) { x = this.halfX - 1.0; z = along; }
      else { x = -this.halfX + 1.0; z = along; }
      const s = 1.3 + n.hash(i, 41) * 1.4;
      const rock = new THREE.Mesh(rockGeos[(i * 5 + 1) % rockGeos.length], matWallDark);
      rock.scale.setScalar(s);
      rock.position.set(x, this.floorY + 2.0 + n.hash(i, 61) * (WALL_H - 4), z);
      rock.rotation.set(n.hash(i, 11) * 6, n.hash(i, 12) * 6, n.hash(i, 13) * 6);
      this.group.add(rock);
    }

    // Pillars + stalagmites scattered across the big floor (instanced cones), all
    // registered as solids so the room has cover but stays very walkable. Many
    // more than before to fill the larger space. Kept clear of both stair landings.
    const upCount = Math.round(this.halfX * this.halfZ / 80);
    // 8-sided cone, lightly jittered so each formation looks like a knobbly
    // mineral spire rather than a clean traffic cone (instancing still shares
    // this one base geometry — the per-instance scale below adds the variety).
    const upGeo = new THREE.ConeGeometry(0.6, 2.6, 8);
    upGeo.translate(0, 1.3, 0);
    jitterGeometry(upGeo, 0.1, 3);
    const ups = new THREE.InstancedMesh(upGeo, matStone, upCount);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sv = new THREE.Vector3();
    let placed = 0;
    for (let i = 0; placed < upCount && i < upCount * 5; i++) {
      const x = (n.hash(i * 11 + 1, 7) * 2 - 1) * (this.halfX - 4);
      const z = (n.hash(i * 13 + 5, 9) * 2 - 1) * (this.halfZ - 4);
      if (Math.hypot(x - this.upStairs.x, z - this.upStairs.z) < 6) continue;
      if (this.downStairs && Math.hypot(x - this.downStairs.x, z - this.downStairs.z) < 6) continue;
      // Non-uniform scale: some are thin tall needles, some fat squat stumps.
      const s = 0.6 + n.hash(i, 21) * 1.4;
      const thin = n.hash(i, 71);                  // 0 = fat stump .. 1 = needle
      const rad = s * (0.55 + thin * 0.7);
      const hgt = s * (0.7 + (1 - thin) * 1.3);
      q.identity(); sv.set(rad, hgt, rad); v.set(x, this.floorY, z);
      m4.compose(v, q, sv);
      ups.setMatrixAt(placed, m4);
      this.solidsList.push({ x, z, r: 0.45 * rad + 0.2 });
      placed++;
    }
    ups.count = placed;
    ups.frustumCulled = false;
    this.group.add(ups);

    // Stalactites (ceiling).
    const downCount = Math.round(this.halfX * this.halfZ / 70);
    const downGeo = new THREE.ConeGeometry(0.5, 2.0, 8);
    downGeo.rotateX(Math.PI);
    downGeo.translate(0, -1.0, 0);
    jitterGeometry(downGeo, 0.08, 5);
    const downs = new THREE.InstancedMesh(downGeo, matStone, downCount);
    let dn = 0;
    for (let i = 0; dn < downCount && i < downCount * 4; i++) {
      const x = (n.hash(i * 17 + 2, 3) * 2 - 1) * (this.halfX - 2);
      const z = (n.hash(i * 19 + 4, 8) * 2 - 1) * (this.halfZ - 2);
      // Same thin-needle / fat-stump spread, hanging from the ceiling.
      const s = 0.5 + n.hash(i, 31) * 1.1;
      const thin = n.hash(i, 83);
      const rad = s * (0.55 + thin * 0.7);
      const hgt = s * (0.7 + (1 - thin) * 1.5);
      q.identity(); sv.set(rad, hgt, rad); v.set(x, WALL_H, z);
      m4.compose(v, q, sv);
      downs.setMatrixAt(dn, m4);
      dn++;
    }
    downs.count = dn;
    downs.frustumCulled = false;
    this.group.add(downs);

    // Cave crystals: sparse clusters of faceted gems that glow in the gloom — a
    // magical relief accent. Two instanced sets share one octahedron base: bright
    // shards jutting from the floor, and a few clinging high on the walls. Count
    // scales with room size like the formations but stays modest. Tilted off-axis
    // so a cluster reads as several blades fanning out, Tibia-crystal-cave style.
    const crysGeo = new THREE.OctahedronGeometry(0.5, 0);
    crysGeo.scale(1, 2.0, 1);                         // stretch into a pointed shard
    crysGeo.translate(0, 0.5, 0);                     // base sits on the ground
    const floorCrys = Math.round(this.halfX * this.halfZ / 280);
    const wallCrys = Math.round((this.halfX + this.halfZ) * 0.12);
    const crystals = new THREE.InstancedMesh(crysGeo, matCrystal, floorCrys + wallCrys);
    let cn = 0;
    // floor shards, kept clear of the stair landings
    for (let i = 0; cn < floorCrys && i < floorCrys * 6; i++) {
      const x = (n.hash(i * 29 + 3, 12) * 2 - 1) * (this.halfX - 5);
      const z = (n.hash(i * 31 + 7, 14) * 2 - 1) * (this.halfZ - 5);
      if (Math.hypot(x - this.upStairs.x, z - this.upStairs.z) < 7) continue;
      if (this.downStairs && Math.hypot(x - this.downStairs.x, z - this.downStairs.z) < 7) continue;
      const s = 0.5 + n.hash(i, 51) * 1.1;
      q.setFromEuler(new THREE.Euler((n.hash(i, 52) - 0.5) * 0.6, n.hash(i, 53) * 6, (n.hash(i, 54) - 0.5) * 0.6));
      sv.set(s, s * (0.8 + n.hash(i, 55) * 0.8), s); v.set(x, this.floorY, z);
      m4.compose(v, q, sv);
      crystals.setMatrixAt(cn++, m4);
    }
    // wall-clinging shards, high up, angled to point inward off each wall
    for (let i = 0; cn < floorCrys + wallCrys && i < wallCrys * 6; i++) {
      const side = i % 4;
      const along = (n.hash(i * 37, side + 2) - 0.5) * 2 * (this.halfX - 4);
      let x, z, tilt;
      if (side === 0) { x = along; z = this.halfZ - 0.8; tilt = -Math.PI * 0.6; }
      else if (side === 1) { x = along; z = -this.halfZ + 0.8; tilt = Math.PI * 0.6; }
      else if (side === 2) { x = this.halfX - 0.8; z = along; tilt = 0; }
      else { x = -this.halfX + 0.8; z = along; tilt = 0; }
      const s = 0.4 + n.hash(i, 57) * 0.7;
      q.setFromEuler(new THREE.Euler(tilt, side * Math.PI / 2, side >= 2 ? Math.PI * 0.6 : 0));
      sv.set(s, s, s); v.set(x, this.floorY + 2.5 + n.hash(i, 58) * (WALL_H - 4), z);
      m4.compose(v, q, sv);
      crystals.setMatrixAt(cn++, m4);
    }
    crystals.count = cn;
    crystals.frustumCulled = false;
    this.group.add(crystals);

    // --- Decorative cavern detail -------------------------------------------
    // The blocks below add natural-cavern dressing on top of the structural
    // formations above: floor-to-ceiling columns, glowing mushrooms, still
    // pools, ground rubble/bones and wall ore veins. They're all deterministic
    // (seeded from floorIndex + an index, never Math.random) and either instanced
    // or a small fixed count, so they stay cheap. A couple of extra material
    // tones (mushroom cap, pool water, bone) live alongside the existing ones.
    const seed = (this.floorIndex + 1) * 2654435761;     // per-floor placement salt
    const matMushroom = new THREE.MeshLambertMaterial({ color: 0xe7ddc7, flatShading: true });
    const matBone = new THREE.MeshLambertMaterial({ color: 0xd8d2bf, flatShading: true });
    // Mushroom caps glow a complementary hue to the crystals (warm amber on the
    // shallow floors, shifting toward pink-magenta with depth) so the room has a
    // second, softer light colour besides the cold crystal blue.
    const mushCol = new THREE.Color(0xffb15a).lerp(new THREE.Color(0xff6fae), depthT);
    const matMushCap = new THREE.MeshLambertMaterial({
      color: mushCol.getHex(), emissive: mushCol.clone().multiplyScalar(0.55).getHex(), flatShading: true,
    });
    // Pool water: a dark teal that cools toward inky blue with depth. Drawn flat
    // and translucent with depthWrite off so it reads as a still surface, not a slab.
    const poolCol = new THREE.Color(0x12414a).lerp(new THREE.Color(0x0e2842), depthT);
    const matPool = new THREE.MeshBasicMaterial({
      color: poolCol.getHex(), transparent: true, opacity: 0.55, depthWrite: false,
    });

    // 1. STONE COLUMNS: a few thick floor-to-ceiling pillars where a stalagmite
    // and stalactite have fused. Built as a jittered cylinder pinched in the
    // middle (two stacked cones meeting), so it reads as a craggy mineral column
    // rather than a clean post. Each is a solid like the stalagmites so they give
    // the room real cover. Count scales modestly with the room (≈2–5).
    const colCount = THREE.MathUtils.clamp(Math.round(this.halfX * this.halfZ / 1400), 2, 5);
    // Two stacked cones that meet at the waist make a natural hourglass column.
    const colGeo = (() => {
      const lower = new THREE.ConeGeometry(0.55, WALL_H * 0.55, 9);
      lower.translate(0, WALL_H * 0.275, 0);
      const upper = new THREE.ConeGeometry(0.55, WALL_H * 0.55, 9);
      upper.rotateX(Math.PI);
      upper.translate(0, WALL_H - WALL_H * 0.275, 0);
      // Merge by hand: copy both into one buffer geometry, then jitter the whole
      // thing so the seam at the waist disappears into the craggy surface.
      const merged = mergePositions([lower, upper]);
      lower.dispose(); upper.dispose();
      return jitterGeometry(merged, 0.28, 23);
    })();
    const cols = new THREE.InstancedMesh(colGeo, matRock, colCount);
    let coln = 0;
    const colSpots = [];                                 // remember columns so clutter can hug them
    for (let i = 0; coln < colCount && i < colCount * 8; i++) {
      const x = (n.hash(i * 41 + seed, 17) * 2 - 1) * (this.halfX - 8);
      const z = (n.hash(i * 43 + seed, 19) * 2 - 1) * (this.halfZ - 8);
      // keep clear of the stairs and the room centre crossing line
      if (Math.hypot(x - this.upStairs.x, z - this.upStairs.z) < 10) continue;
      if (this.downStairs && Math.hypot(x - this.downStairs.x, z - this.downStairs.z) < 10) continue;
      if (Math.abs(x) < 4) continue;
      const rad = 0.9 + n.hash(i + seed, 22) * 0.7;
      q.identity(); sv.set(rad, 1, rad); v.set(x, this.floorY, z);
      m4.compose(v, q, sv);
      cols.setMatrixAt(coln, m4);
      this.solidsList.push({ x, z, r: 0.55 * rad + 0.4 });
      colSpots.push({ x, z });
      coln++;
    }
    cols.count = coln;
    cols.frustumCulled = false;
    this.group.add(cols);

    // 2. GLOWING MUSHROOMS: short pale stalks topped with an emissive cap, in
    // little clusters tucked near the walls (and a few at the column feet). Two
    // instanced sets share the stalk/cap geometries; the cap colour is the warm
    // mushCol so they pool a soft second glow on the floor.
    const mushCount = Math.round((this.halfX + this.halfZ) * 0.55);
    const stalkGeo = new THREE.CylinderGeometry(0.07, 0.11, 0.5, 6);
    stalkGeo.translate(0, 0.25, 0);
    const capGeo = new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
    capGeo.translate(0, 0.5, 0);
    const stalks = new THREE.InstancedMesh(stalkGeo, matMushroom, mushCount);
    const caps = new THREE.InstancedMesh(capGeo, matMushCap, mushCount);
    let mn = 0;
    for (let i = 0; mn < mushCount && i < mushCount * 3; i++) {
      // Most mushrooms hug a wall; a sprinkling sit at column feet for life there.
      let x, z;
      const atCol = colSpots.length && n.hash(i + seed, 60) > 0.78;
      if (atCol) {
        const c = colSpots[(i * 7) % colSpots.length];
        x = c.x + (n.hash(i + seed, 61) * 2 - 1) * 2.0;
        z = c.z + (n.hash(i + seed, 62) * 2 - 1) * 2.0;
      } else {
        const side = i % 4;
        const along = (n.hash(i * 7 + seed, side) * 2 - 1) * (this.halfX - 3);
        const inset = 1.2 + n.hash(i + seed, 63) * 3.5;     // a metre or three off the wall
        if (side === 0) { x = along; z = this.halfZ - inset; }
        else if (side === 1) { x = along; z = -this.halfZ + inset; }
        else if (side === 2) { x = this.halfX - inset; z = along; }
        else { x = -this.halfX + inset; z = along; }
      }
      if (Math.hypot(x - this.upStairs.x, z - this.upStairs.z) < 6) continue;
      if (this.downStairs && Math.hypot(x - this.downStairs.x, z - this.downStairs.z) < 6) continue;
      const s = 0.6 + n.hash(i + seed, 64) * 0.9;
      const lean = (n.hash(i + seed, 65) - 0.5) * 0.5;       // a touch of natural lean
      q.setFromEuler(new THREE.Euler(lean, n.hash(i + seed, 66) * 6, lean));
      sv.set(s, s, s); v.set(x, this.floorY, z);
      m4.compose(v, q, sv);
      stalks.setMatrixAt(mn, m4);
      caps.setMatrixAt(mn, m4);
      mn++;
    }
    stalks.count = mn; caps.count = mn;
    stalks.frustumCulled = false; caps.frustumCulled = false;
    this.group.add(stalks); this.group.add(caps);

    // 3. WATER / MINERAL POOLS: one or two flat translucent discs lying in low
    // spots, each ringed by a few small boulders so it reads as a still pool in a
    // rocky basin rather than a painted circle. Purely cosmetic — laid just above
    // the floor and left walkable (the rim rocks are too small to bother as solids).
    const poolCount = this.halfX * this.halfZ > 2600 ? 2 : 1;
    for (let p = 0; p < poolCount; p++) {
      const px = (n.hash(p * 71 + seed, 30) * 2 - 1) * (this.halfX - 12);
      const pz = (n.hash(p * 73 + seed, 31) * 2 - 1) * (this.halfZ - 12);
      const pr = 2.4 + n.hash(p + seed, 32) * 2.0;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(pr, 20), matPool);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(px, this.floorY + 0.02, pz);      // skim just over the floor bumps
      this.group.add(disc);
      // Rocky rim: small boulders from the shared pre-jittered pool ringing the disc.
      const rimN = 7 + Math.round(pr);
      for (let r = 0; r < rimN; r++) {
        const a = (r / rimN) * Math.PI * 2 + n.hash(p * 13 + r + seed, 33) * 0.4;
        const rr = pr + 0.3 + n.hash(p + r + seed, 34) * 0.5;
        const rs = 0.35 + n.hash(p * 5 + r + seed, 35) * 0.5;
        const rim = new THREE.Mesh(rockGeos[(r + p) % rockGeos.length], matRock);
        rim.scale.setScalar(rs);
        rim.position.set(px + Math.cos(a) * rr, this.floorY + rs * 0.2, pz + Math.sin(a) * rr);
        rim.rotation.set(n.hash(r + seed, 36) * 6, n.hash(r + seed, 37) * 6, n.hash(r + seed, 38) * 6);
        this.group.add(rim);
      }
    }

    // 4. RUBBLE & BONES: a scatter of tiny jittered rock chunks and a few pale
    // bone shards strewn across the floor so the ground reads lived-in. Both are
    // instanced and cosmetic (no solids). Rubble uses a small jittered dodecahedron;
    // bones are thin pale cylinders laid almost flat.
    const rubbleCount = Math.round(this.halfX * this.halfZ / 90);
    const rubbleGeo = jitterGeometry(new THREE.DodecahedronGeometry(0.28, 0), 0.1, 27);
    const rubble = new THREE.InstancedMesh(rubbleGeo, matRock, rubbleCount);
    let rb = 0;
    for (let i = 0; rb < rubbleCount && i < rubbleCount * 2; i++) {
      const x = (n.hash(i * 53 + seed, 40) * 2 - 1) * (this.halfX - 3);
      const z = (n.hash(i * 59 + seed, 41) * 2 - 1) * (this.halfZ - 3);
      if (Math.hypot(x - this.upStairs.x, z - this.upStairs.z) < 5) continue;
      if (this.downStairs && Math.hypot(x - this.downStairs.x, z - this.downStairs.z) < 5) continue;
      const s = 0.5 + n.hash(i + seed, 42) * 1.3;
      q.setFromEuler(new THREE.Euler(n.hash(i + seed, 43) * 6, n.hash(i + seed, 44) * 6, n.hash(i + seed, 45) * 6));
      sv.set(s, s * (0.5 + n.hash(i + seed, 46) * 0.5), s); v.set(x, this.floorY + s * 0.06, z);
      m4.compose(v, q, sv);
      rubble.setMatrixAt(rb++, m4);
    }
    rubble.count = rb;
    rubble.frustumCulled = false;
    this.group.add(rubble);

    // Bones: thin pale cylinders lying nearly flat — a handful, sparse and creepy.
    const boneCount = Math.round((this.halfX + this.halfZ) * 0.12);
    const boneGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 5);
    boneGeo.rotateZ(Math.PI / 2);                         // lay the cylinder on its side
    const bones = new THREE.InstancedMesh(boneGeo, matBone, boneCount);
    let bn = 0;
    for (let i = 0; bn < boneCount && i < boneCount * 3; i++) {
      const x = (n.hash(i * 61 + seed, 47) * 2 - 1) * (this.halfX - 4);
      const z = (n.hash(i * 67 + seed, 48) * 2 - 1) * (this.halfZ - 4);
      if (Math.hypot(x - this.upStairs.x, z - this.upStairs.z) < 6) continue;
      if (this.downStairs && Math.hypot(x - this.downStairs.x, z - this.downStairs.z) < 6) continue;
      const s = 0.7 + n.hash(i + seed, 49) * 0.8;
      // a slight tip off the ground plus a random yaw so they don't all line up
      q.setFromEuler(new THREE.Euler((n.hash(i + seed, 50) - 0.5) * 0.3, n.hash(i + seed, 51) * 6, (n.hash(i + seed, 52) - 0.5) * 0.3));
      sv.set(s, s, s); v.set(x, this.floorY + 0.05, z);
      m4.compose(v, q, sv);
      bones.setMatrixAt(bn++, m4);
    }
    bones.count = bn;
    bones.frustumCulled = false;
    this.group.add(bones);

    // 5. WALL VEINS: thin emissive crystal/ore streaks set flush into the wall
    // faces (re-using the crystal material) so the rock walls aren't blank slabs.
    // Each is a slim flattened box laid against a wall and tilted slightly, so a
    // run of them reads as a glowing mineral seam threading through the stone.
    const veinCount = Math.round((this.halfX + this.halfZ) * 0.16);
    const veinGeo = new THREE.BoxGeometry(0.12, 1.0, 0.06);
    const veins = new THREE.InstancedMesh(veinGeo, matCrystal, veinCount);
    let vn = 0;
    for (let i = 0; vn < veinCount && i < veinCount * 2; i++) {
      const side = i % 4;
      const along = (n.hash(i * 79 + seed, side + 3) * 2 - 1) * (this.halfX - 3);
      let x, z, yaw;
      if (side === 0) { x = along; z = this.halfZ - 0.4; yaw = 0; }
      else if (side === 1) { x = along; z = -this.halfZ + 0.4; yaw = 0; }
      else if (side === 2) { x = this.halfX - 0.4; z = along; yaw = Math.PI / 2; }
      else { x = -this.halfX + 0.4; z = along; yaw = Math.PI / 2; }
      const y = this.floorY + 1.0 + n.hash(i + seed, 81) * (WALL_H - 2.5);
      const len = 0.8 + n.hash(i + seed, 82) * 2.0;
      const tilt = (n.hash(i + seed, 83) - 0.5) * 1.2;    // lean the seam off vertical
      q.setFromEuler(new THREE.Euler(0, yaw, tilt));
      sv.set(1, len, 1); v.set(x, y, z);
      m4.compose(v, q, sv);
      veins.setMatrixAt(vn++, m4);
    }
    veins.count = vn;
    veins.frustumCulled = false;
    this.group.add(veins);

    // Stairs: an UP flight (climb to a glowing exit arch in the +Z wall) and, if
    // this isn't the deepest floor, a DOWN flight (descend into a dark pit in the
    // -Z wall). Both are marked so they read at a glance, Tibia-style.
    this._buildUpStairs(matStone, matWallDark);
    if (this.downStairs) this._buildDownStairs(matStone, matWallDark);
    this._buildLights();
  }

  // The way UP/out: a flight climbing to a lit arch against the +Z wall.
  _buildUpStairs(matStone, matDark) {
    const sx = this.upStairs.x, sz = this.upStairs.z;
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.4, 0.9), matStone);
      step.position.set(sx, this.floorY + 0.2 + i * 0.42, sz + 1.0 + i * 0.85);
      this.group.add(step);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.55, 8, 16), matDark);
    ring.position.set(sx, this.floorY + 2.8, sz + 1.0 + steps * 0.85);
    ring.scale.set(1, 1.1, 0.5);
    this.group.add(ring);
    // The top floor's exit glows blue (to the surface); inner up-stairs glow warm.
    const exitToSurface = this.floorIndex === 0;
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(2.0, 16),
      new THREE.MeshBasicMaterial({ color: exitToSurface ? 0x9fd1ff : 0xffd9a0 }));
    mouth.position.set(sx, this.floorY + 2.8, sz + 0.9 + steps * 0.85);
    mouth.scale.set(1, 1.1, 1);
    this.group.add(mouth);
    const glow = new THREE.PointLight(exitToSurface ? 0xbfe0ff : 0xffc878, 4, 14);
    glow.position.set(sx, this.floorY + 2.6, sz);
    this.group.add(glow);
  }

  // The way DOWN/deeper: a flight sinking into a dark pit against the -Z wall.
  _buildDownStairs(matStone, matDark) {
    const sx = this.downStairs.x, sz = this.downStairs.z;
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.4, 0.9), matStone);
      // descend: each step lower and closer to the wall
      step.position.set(sx, this.floorY - 0.0 - i * 0.34, sz - 1.0 - i * 0.85);
      this.group.add(step);
    }
    // A dark pit mouth and a faint red-ish glow so "down = danger" reads.
    const pit = new THREE.Mesh(new THREE.CircleGeometry(2.2, 16),
      new THREE.MeshBasicMaterial({ color: 0x140c0c }));
    pit.rotation.x = -Math.PI / 2;
    pit.position.set(sx, this.floorY - 0.3, sz - 1.0 - steps * 0.85);
    this.group.add(pit);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.5, 8, 16), matDark);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(sx, this.floorY + 0.1, sz - 1.0 - steps * 0.85);
    this.group.add(ring);
    const glow = new THREE.PointLight(0xff6a4a, 2.2, 12);
    glow.position.set(sx, this.floorY + 1.0, sz - 2);
    this.group.add(glow);
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(0x5a6675, 0x2a2420, 0.5);
    this.group.add(hemi);
    const amb = new THREE.AmbientLight(0x404a55, 0.22);
    this.group.add(amb);

    // Torches on a grid across the big room so the whole space is dim-but-visible.
    const stepX = this.halfX * 0.6, stepZ = this.halfZ * 0.6;
    const spots = [];
    for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) spots.push([gx * stepX, gz * stepZ]);
    for (const [x, z] of spots) {
      const torch = new THREE.PointLight(0xffb060, 4.5, 20, 1.5);
      torch.position.set(x, 3.6, z);
      torch.userData.base = 4.5;
      this.group.add(torch);
      this._torchLights.push(torch);
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd27a }));
      ember.position.copy(torch.position);
      this.group.add(ember);
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
  }
}

// A whole cave: a stack of CaveFloor rooms. Presents the World interface for
// whichever floor is active, and exposes floor navigation + stair lookups for
// main.js and the minimap. Only the active floor is visible/updated.
export class CaveSystem {
  constructor(scene, dungeon) {
    this.scene = scene;
    this.dungeon = dungeon;
    this.floorCount = Math.max(1, dungeon.floors || 1);
    this.floors = [];
    for (let i = 0; i < this.floorCount; i++) {
      this.floors.push(new CaveFloor(scene, dungeon, i, this.floorCount));
    }
    this.activeFloorIndex = 0;
    this.fog = caveFog();
    this.background = caveBackground();
  }

  get active() { return this.floors[this.activeFloorIndex]; }
  // The exit-to-surface stair is the top floor's up-stair.
  get upStairs() { return this.floors[0].upStairs; }

  // --- World interface delegates to the active floor -----------------------
  heightAt(x, z) { return this.active.heightAt(x, z); }
  solidAt(x, z, pad) { return this.active.solidAt(x, z, pad); }
  clampSpawn(x, z) { return this.active.clampSpawn(x, z); }
  get noise() { return this.active.noise; }

  update(dt) { this.active.update(dt); }

  setVisible(v) {
    // Only the active floor shows; the rest stay hidden so we don't render
    // every floor at once.
    for (let i = 0; i < this.floors.length; i++) this.floors[i].setVisible(v && i === this.activeFloorIndex);
  }

  // Switch which floor is active (used on descend/ascend). Hides the old room,
  // shows the new one. Returns the new active floor.
  _setActive(i) {
    this.floors[this.activeFloorIndex].setVisible(false);
    this.activeFloorIndex = THREE.MathUtils.clamp(i, 0, this.floorCount - 1);
    this.active.setVisible(true);
    return this.active;
  }

  // Is the point standing on the active floor's DOWN stair? Returns the next
  // floor's arrival point, or null. main.js uses this to sink the player deeper.
  downStairAt(x, z) {
    const f = this.active;
    if (!f.downStairs) return null;
    if (Math.hypot(x - f.downStairs.x, z - f.downStairs.z) > f.downStairs.radius) return null;
    if (this.activeFloorIndex >= this.floorCount - 1) return null;
    const next = this._setActive(this.activeFloorIndex + 1);
    return { x: next.arriveFromAbove.x, z: next.arriveFromAbove.z, floor: this.activeFloorIndex };
  }

  // Is the point on the active floor's UP stair? Returns the previous floor's
  // arrival point, or the sentinel { surface:true } when leaving the top floor.
  upStairAt(x, z) {
    const f = this.active;
    if (Math.hypot(x - f.upStairs.x, z - f.upStairs.z) > f.upStairs.radius) return null;
    if (this.activeFloorIndex === 0) return { surface: true };
    const prev = this._setActive(this.activeFloorIndex - 1);
    return { x: prev.arriveFromBelow.x, z: prev.arriveFromBelow.z, floor: this.activeFloorIndex };
  }

  // Reset to the top floor (called when entering the cave fresh from the surface).
  resetToTop() { return this._setActive(0); }

  // Stair markers on the active floor, for the minimap: each { x, z, dir }.
  activeStairMarkers() { return this.stairMarkersForFloor(this.activeFloorIndex); }

  // Stair markers on ANY floor (used when the minimap peeks up/down a floor).
  stairMarkersForFloor(i) {
    const f = this.floors[Math.max(0, Math.min(this.floorCount - 1, i))];
    if (!f) return [];
    const out = [{ x: f.upStairs.x, z: f.upStairs.z, dir: 'up' }];
    if (f.downStairs) out.push({ x: f.downStairs.x, z: f.downStairs.z, dir: 'down' });
    return out;
  }

  // The walkable STRUCTURE of a floor, for the minimap to draw the real cave shape
  // (rock vs floor) instead of a blank disc. Returns the floor's rectangular
  // bounds and a solidAt(x,z) probe (no player padding, so the drawn walls sit
  // right at the geometry). The minimap samples this over a grid and masks it by
  // what the player has actually explored (fog of war, see caveMap.js).
  floorStructure(i) {
    const f = this.floors[Math.max(0, Math.min(this.floorCount - 1, i))];
    if (!f) return null;
    return {
      cx: f.cx, cz: f.cz, halfX: f.halfX, halfZ: f.halfZ,
      solidAt: (x, z) => f.solidAt(x, z, 0),
    };
  }

  dispose() {
    for (const f of this.floors) f.dispose();
  }
}

// Per-dungeon cave-system cache so re-entering is instant.
const systems = new Map();
export function getCaveFloor(scene, dungeon) {
  let s = systems.get(dungeon.id);
  if (!s) { s = new CaveSystem(scene, dungeon); systems.set(dungeon.id, s); }
  s.resetToTop();
  return s;
}

function hashId(id) {
  let h = 2166136261;
  for (let i = 0; i < String(id).length; i++) { h ^= String(id).charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
