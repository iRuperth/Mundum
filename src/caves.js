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

    // Floor with mottled rock vertex colors. More subdivisions for the big room.
    const segs = 40;
    const fgeo = new THREE.PlaneGeometry(this.halfX * 2, this.halfZ * 2, segs, segs);
    fgeo.rotateX(-Math.PI / 2);
    const pos = fgeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i), wz = pos.getZ(i);
      pos.setY(i, this.floorY - 0.05 + n.fbm(wx * 0.2 + 5, wz * 0.2, 2) * 0.18);
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
    // the (now much larger) perimeter.
    const bumpCount = Math.round((this.halfX + this.halfZ) * 1.0);
    for (let i = 0; i < bumpCount; i++) {
      const side = i % 4;
      const t = n.hash(i * 7, side);
      const along = (t - 0.5) * 2 * (this.halfX - 1.5);
      let x, z;
      if (side === 0) { x = along; z = this.halfZ - 0.6; }
      else if (side === 1) { x = along; z = -this.halfZ + 0.6; }
      else if (side === 2) { x = this.halfX - 0.6; z = along; }
      else { x = -this.halfX + 0.6; z = along; }
      const s = 0.8 + n.hash(i, i * 3) * 1.9;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), matRock);
      rock.position.set(x, this.floorY + s * 0.3, z);
      rock.rotation.set(n.hash(i, 1) * 6, n.hash(i, 2) * 6, n.hash(i, 3) * 6);
      this.group.add(rock);
    }

    // Pillars + stalagmites scattered across the big floor (instanced cones), all
    // registered as solids so the room has cover but stays very walkable. Many
    // more than before to fill the larger space. Kept clear of both stair landings.
    const upCount = Math.round(this.halfX * this.halfZ / 90);
    const upGeo = new THREE.ConeGeometry(0.6, 2.6, 6);
    upGeo.translate(0, 1.3, 0);
    const ups = new THREE.InstancedMesh(upGeo, matStone, upCount);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sv = new THREE.Vector3();
    let placed = 0;
    for (let i = 0; placed < upCount && i < upCount * 5; i++) {
      const x = (n.hash(i * 11 + 1, 7) * 2 - 1) * (this.halfX - 4);
      const z = (n.hash(i * 13 + 5, 9) * 2 - 1) * (this.halfZ - 4);
      if (Math.hypot(x - this.upStairs.x, z - this.upStairs.z) < 6) continue;
      if (this.downStairs && Math.hypot(x - this.downStairs.x, z - this.downStairs.z) < 6) continue;
      const s = 0.6 + n.hash(i, 21) * 1.4;
      q.identity(); sv.set(s, s, s); v.set(x, this.floorY, z);
      m4.compose(v, q, sv);
      ups.setMatrixAt(placed, m4);
      this.solidsList.push({ x, z, r: 0.45 * s + 0.2 });
      placed++;
    }
    ups.count = placed;
    ups.frustumCulled = false;
    this.group.add(ups);

    // Stalactites (ceiling).
    const downCount = Math.round(this.halfX * this.halfZ / 80);
    const downGeo = new THREE.ConeGeometry(0.5, 2.0, 6);
    downGeo.rotateX(Math.PI);
    downGeo.translate(0, -1.0, 0);
    const downs = new THREE.InstancedMesh(downGeo, matStone, downCount);
    let dn = 0;
    for (let i = 0; dn < downCount && i < downCount * 4; i++) {
      const x = (n.hash(i * 17 + 2, 3) * 2 - 1) * (this.halfX - 2);
      const z = (n.hash(i * 19 + 4, 8) * 2 - 1) * (this.halfZ - 2);
      const s = 0.5 + n.hash(i, 31) * 1.1;
      q.identity(); sv.set(s, s, s); v.set(x, WALL_H, z);
      m4.compose(v, q, sv);
      downs.setMatrixAt(dn, m4);
      dn++;
    }
    downs.count = dn;
    downs.frustumCulled = false;
    this.group.add(downs);

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
