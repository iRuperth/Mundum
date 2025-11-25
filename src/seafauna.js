import * as THREE from 'three';
import { WATER_LEVEL } from './world.js';

// A handful of small fish and the odd octopus drifting just under the water near
// the player, purely decorative (no combat). They wander in shallow coastal
// water and fade out / respawn as the player moves, so there are always a few
// around the coast without ever being a crowd.

const COUNT = 7;            // how many critters exist at once
const NEAR = 70;            // spawn within this radius of the player
const FAR = 110;            // despawn past this
const SWIM_DEPTH = 0.5;     // how far below the surface they swim

export class SeaFauna {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.items = [];
    this._seed = 1234567;

    this.matFish = new THREE.MeshLambertMaterial({ color: 0xc8773a, flatShading: true });
    this.matFish2 = new THREE.MeshLambertMaterial({ color: 0x6fb6d6, flatShading: true });
    this.matOcto = new THREE.MeshLambertMaterial({ color: 0x9a5bb0, flatShading: true });
  }

  _rnd() { this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0; return this._seed / 4294967296; }

  // True if (x, z) is shallow coastal water: below the surface but not the abyss.
  _isShallowWater(x, z) {
    const h = this.world.heightAt(x, z);
    return h < WATER_LEVEL - 0.3 && h > WATER_LEVEL - 6;
  }

  _makeBody(kind) {
    const g = new THREE.Group();
    if (kind === 'octopus') {
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), this.matOcto);
      head.scale.set(1, 1.1, 1);
      g.add(head);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 5), this.matOcto);
        leg.position.set(Math.cos(a) * 0.14, -0.22, Math.sin(a) * 0.14);
        leg.rotation.x = Math.PI;
        g.add(leg);
      }
    } else {
      const mat = this._rnd() < 0.5 ? this.matFish : this.matFish2;
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mat);
      body.scale.set(1.8, 1, 0.7);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 4), mat);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -0.34;
      g.add(body, tail);
    }
    return g;
  }

  _spawnOne(px, pz) {
    // Try a few coastal-water points near the player.
    for (let t = 0; t < 8; t++) {
      const a = this._rnd() * Math.PI * 2;
      const r = NEAR * (0.3 + this._rnd() * 0.7);
      const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      if (!this._isShallowWater(x, z)) continue;
      const kind = this._rnd() < 0.22 ? 'octopus' : 'fish';
      const mesh = this._makeBody(kind);
      mesh.position.set(x, WATER_LEVEL - SWIM_DEPTH, z);
      this.group.add(mesh);
      this.items.push({ mesh, kind, dir: this._rnd() * Math.PI * 2, speed: 0.6 + this._rnd() * 0.9, phase: this._rnd() * 6.28 });
      return;
    }
  }

  tick(dt, player) {
    const px = player.pos.x, pz = player.pos.z;
    // Top up the population with critters near the player.
    while (this.items.length < COUNT) {
      const before = this.items.length;
      this._spawnOne(px, pz);
      if (this.items.length === before) break; // no coastal water nearby right now
    }
    const now = performance.now() * 0.001;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i];
      // gentle wander
      f.dir += (this._rnd() - 0.5) * dt * 1.5;
      const nx = f.mesh.position.x + Math.cos(f.dir) * f.speed * dt;
      const nz = f.mesh.position.z + Math.sin(f.dir) * f.speed * dt;
      if (this._isShallowWater(nx, nz)) { f.mesh.position.x = nx; f.mesh.position.z = nz; }
      else f.dir += Math.PI; // turn back toward water
      f.mesh.position.y = WATER_LEVEL - SWIM_DEPTH + Math.sin(now * 2 + f.phase) * 0.12;
      f.mesh.rotation.y = -f.dir + Math.PI / 2;
      if (f.kind === 'octopus') f.mesh.rotation.y = now + f.phase; // octopi just bob/turn

      // Despawn if the player swam far away.
      if (Math.hypot(f.mesh.position.x - px, f.mesh.position.z - pz) > FAR) {
        this.group.remove(f.mesh);
        f.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
        this.items.splice(i, 1);
      }
    }
  }

  setVisible(v) { this.group.visible = v; }
}
