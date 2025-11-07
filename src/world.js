import * as THREE from 'three';
import { makeNoise } from './noise.js';

export const WATER_LEVEL = 0;
const CHUNK = 64;   // chunk size in meters
const RES = 32;     // subdivisions per chunk

const C_SAND      = new THREE.Color(0xd5c382);
const C_SAND_DEEP = new THREE.Color(0x8f9a66);
const C_GRASS_A   = new THREE.Color(0x57a14d);
const C_GRASS_B   = new THREE.Color(0x4a8f44);
const C_ROCK      = new THREE.Color(0x8a877f);
const C_SNOW      = new THREE.Color(0xeef3f7);
const C_CANOPY_A  = new THREE.Color(0x3e8a3c);
const C_CANOPY_B  = new THREE.Color(0x76b04b);

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const tmpColor = new THREE.Color();

export class World {
  constructor(scene, seed, radius) {
    this.scene = scene;
    this.radius = radius;
    this.noise = makeNoise(seed);
    this.chunks = new Map();
    this.queue = [];
    this._cx = null;
    this._cz = null;

    this.matTerrain = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.matTrunk = new THREE.MeshLambertMaterial({ color: 0x6a4a30, flatShading: true });
    this.matCanopy = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    this.matRock = new THREE.MeshLambertMaterial({ color: 0x8d8d86, flatShading: true });

    this.geoTrunk = new THREE.CylinderGeometry(0.16, 0.26, 1.7, 5);
    this.geoTrunk.translate(0, 0.85, 0);
    this.geoCanopy = new THREE.IcosahedronGeometry(1.45, 0);
    this.geoCanopy.scale(1, 1.3, 1);
    this.geoCanopy.translate(0, 2.8, 0);
    this.geoRock = new THREE.IcosahedronGeometry(0.8, 0);
    this.geoRock.scale(1, 0.72, 1);

    const viewDist = radius * CHUNK * 0.92;
    scene.fog = new THREE.Fog(0x7ec9ff, viewDist * 0.45, viewDist);

    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(viewDist * 5, viewDist * 5),
      new THREE.MeshLambertMaterial({ color: 0x2f86c9, transparent: true, opacity: 0.72, depthWrite: false })
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = WATER_LEVEL - 0.04;
    scene.add(this.water);
  }

  // Terrain height at any world point: the mesh and the physics share this one
  // formula, so no raycasting is needed.
  heightAt(x, z) {
    const n = this.noise;
    const cont = n.fbm(x * 0.0016, z * 0.0016, 3);
    const hills = n.fbm(x * 0.012 + 71, z * 0.012 - 33, 4);
    const mont = n.fbm(x * 0.0045 + 503, z * 0.0045 + 211, 4);
    let h = (cont - 0.47) * 45 + (hills - 0.5) * 7;
    h += Math.pow(Math.max(0, mont - 0.5) * 2, 2.2) * 55;
    return h;
  }

  update(px, pz, buildAll = false) {
    const cx = Math.floor(px / CHUNK), cz = Math.floor(pz / CHUNK);
    if (cx !== this._cx || cz !== this._cz) {
      this._cx = cx;
      this._cz = cz;
      this._refreshQueue(cx, cz);
    }
    let budget = buildAll ? Infinity : 2;
    while (budget-- > 0 && this.queue.length) {
      const { key, cx: qx, cz: qz } = this.queue.shift();
      if (!this.chunks.has(key)) this._buildChunk(qx, qz);
    }
    this.water.position.x = px;
    this.water.position.z = pz;
  }

  _refreshQueue(cx, cz) {
    const r = this.radius;
    // drop chunks that are now too far
    for (const [key, chunk] of this.chunks) {
      if (Math.max(Math.abs(chunk.cx - cx), Math.abs(chunk.cz - cz)) > r + 1) {
        this.scene.remove(chunk.group);
        chunk.terrainGeo.dispose();
        for (const m of chunk.instanced) m.dispose();
        this.chunks.delete(key);
      }
    }
    // queue the missing ones, nearest first
    this.queue.length = 0;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        if (!this.chunks.has(key)) {
          this.queue.push({ key, cx: cx + dx, cz: cz + dz, d: dx * dx + dz * dz });
        }
      }
    }
    this.queue.sort((a, b) => a.d - b.d);
  }

  _buildChunk(cx, cz) {
    const n = this.noise;
    const ox = (cx + 0.5) * CHUNK, oz = (cz + 0.5) * CHUNK;
    const group = new THREE.Group();

    // terrain
    const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, RES, RES);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + ox, wz = pos.getZ(i) + oz;
      const h = this.heightAt(wx, wz);
      pos.setY(i, h);
      const slope = (Math.abs(this.heightAt(wx + 1.3, wz) - h) +
                     Math.abs(this.heightAt(wx, wz + 1.3) - h)) / 1.3;
      const jitter = n.hash(Math.round(wx * 7), Math.round(wz * 7));

      if (h > 24 + jitter * 5) tmpColor.copy(C_SNOW);
      else if (slope > 1.15 || h > 19) tmpColor.copy(C_ROCK);
      else if (h < 1.1) tmpColor.copy(h < -0.8 ? C_SAND_DEEP : C_SAND);
      else tmpColor.copy(C_GRASS_A).lerp(C_GRASS_B, n.fbm(wx * 0.02 + 311, wz * 0.02, 2));

      const m = 0.93 + jitter * 0.14;
      colors[i * 3] = tmpColor.r * m;
      colors[i * 3 + 1] = tmpColor.g * m;
      colors[i * 3 + 2] = tmpColor.b * m;
    }
    pos.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrain = new THREE.Mesh(geo, this.matTerrain);
    terrain.position.set(ox, 0, oz);
    group.add(terrain);

    // vegetation and rocks, deterministic per chunk
    const trees = [], rocks = [];
    for (let i = 0; i < 30; i++) {
      const wx = cx * CHUNK + n.hash(cx * 53 + i, cz * 91 + 7) * CHUNK;
      const wz = cz * CHUNK + n.hash(cx * 67 - i, cz * 39 + 3) * CHUNK;
      const h = this.heightAt(wx, wz);
      const slope = Math.abs(this.heightAt(wx + 1.5, wz) - h) + Math.abs(this.heightAt(wx, wz + 1.5) - h);
      const rnd = n.hash(cx * 13 + i * 7, cz * 29 - i * 3);

      if (i < 22) {
        if (h < 1.4 || h > 17 || slope > 1.1) continue;
        const forest = n.fbm(wx * 0.006 + 431, wz * 0.006 - 87, 2);
        if (forest > 0.55 || (forest > 0.4 && rnd < 0.22)) {
          trees.push({ x: wx, y: h, z: wz, s: 0.8 + rnd * 0.7, rot: rnd * 6.28, g: n.hash(i * 31, cx + cz) });
        }
      } else {
        if (h < 0.8 || slope > 1.6 || rnd > 0.4) continue;
        rocks.push({ x: wx, y: h, z: wz, s: 0.5 + rnd * 2.2, rot: rnd * 6.28 });
      }
    }

    const instanced = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sv = new THREE.Vector3();

    if (trees.length) {
      const trunks = new THREE.InstancedMesh(this.geoTrunk, this.matTrunk, trees.length);
      const canopies = new THREE.InstancedMesh(this.geoCanopy, this.matCanopy, trees.length);
      trees.forEach((t, i) => {
        q.setFromAxisAngle(Y_AXIS, t.rot);
        sv.setScalar(t.s);
        v.set(t.x, t.y - 0.15, t.z);
        m4.compose(v, q, sv);
        trunks.setMatrixAt(i, m4);
        canopies.setMatrixAt(i, m4);
        canopies.setColorAt(i, tmpColor.copy(C_CANOPY_A).lerp(C_CANOPY_B, t.g));
      });
      trunks.frustumCulled = canopies.frustumCulled = false;
      group.add(trunks, canopies);
      instanced.push(trunks, canopies);
    }

    if (rocks.length) {
      const rocksMesh = new THREE.InstancedMesh(this.geoRock, this.matRock, rocks.length);
      rocks.forEach((r, i) => {
        q.setFromAxisAngle(Y_AXIS, r.rot);
        sv.set(r.s * 0.85, r.s, r.s * 1.1);
        v.set(r.x, r.y - 0.12, r.z);
        m4.compose(v, q, sv);
        rocksMesh.setMatrixAt(i, m4);
      });
      rocksMesh.frustumCulled = false;
      group.add(rocksMesh);
      instanced.push(rocksMesh);
    }

    this.scene.add(group);
    this.chunks.set(`${cx},${cz}`, { cx, cz, group, terrainGeo: geo, instanced });
  }
}
