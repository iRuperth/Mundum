import * as THREE from 'three';
import { buildNpcModel } from './npcModels.js';
import { NPCS } from './data/npcs.js';
import { CITIES } from './cities.js';

const NPC_RADIUS = 2.6;

// Places every NPC on its city plaza and shows a floating '!' over quest
// givers that have something available.
export class WorldNpcs {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.entries = [];
    this._build();
  }

  _build() {
    const cityById = {};
    for (const c of CITIES) cityById[c.id] = c;
    for (const npc of NPCS) {
      const city = cityById[npc.city];
      if (!city) continue;
      const x = city.x + (npc.offset ? npc.offset.x : 0);
      const z = city.z + (npc.offset ? npc.offset.z : 0);
      const y = this.world.heightAt(x, z);
      const model = buildNpcModel(npc.model, { color: npc.color, scale: 1 });
      model.group.position.set(x, y, z);
      model.group.rotation.y = Math.atan2(city.x - x, city.z - z);
      this.scene.add(model.group);

      const mark = makeMarker();
      mark.position.set(x, y + 2.2, z);
      mark.visible = false;
      this.scene.add(mark);

      this.entries.push({ npc, model, x, z, mark });
    }
  }

  // Show the '!' over givers that can give or complete a quest right now.
  refreshMarkers(canInteract) {
    for (const e of this.entries) e.mark.visible = canInteract(e.npc);
  }

  npcAt(x, z) {
    for (const e of this.entries) {
      if (Math.hypot(e.x - x, e.z - z) < NPC_RADIUS) return e.npc;
    }
    return null;
  }

  tick(dt) {
    for (const e of this.entries) {
      e.model.update(dt);
      e.mark.rotation.y += dt * 2;
      e.mark.position.y = this.world.heightAt(e.x, e.z) + 2.2 + Math.sin(performance.now() * 0.004) * 0.12;
    }
  }
}

function makeMarker() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe000 });
  const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 4, 8), mat);
  bar.position.y = 0.16;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat);
  dot.position.y = -0.12;
  group.add(bar, dot);
  return group;
}
