import * as THREE from 'three';
import { buildNpcModel } from './npcModels.js';
import { NPCS } from './data/npcs.js';
import { CITIES } from './cities.js';
import { WATER_LEVEL } from './world.js';

const NPC_RADIUS = 2.6;
const DRY_MARGIN = 0.8;        // keep NPCs this far above the waterline
const CITY_PLAZA_RADIUS = 26; // matches CITY_RADIUS in cities.js

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
      let x = city.x + (npc.offset ? npc.offset.x : 0);
      let z = city.z + (npc.offset ? npc.offset.z : 0);
      // pull toward the city center until standing on dry land
      for (let i = 0; i < 12 && this.world.heightAt(x, z) < WATER_LEVEL + DRY_MARGIN; i++) {
        x += (city.x - x) * 0.2;
        z += (city.z - z) * 0.2;
      }
      // The city plaza is a flat disc at the center height; NPCs standing on it
      // must use the plaza top, not the lower natural ground beneath, or they
      // sink into it. Plaza top = centerHeight - 0.1 + 0.15 (half its 0.3 thick).
      const plazaTop = this.world.heightAt(city.x, city.z) + 0.05;
      const onPlaza = Math.hypot(x - city.x, z - city.z) < CITY_PLAZA_RADIUS;
      const y = onPlaza ? plazaTop : this.world.heightAt(x, z);
      const model = buildNpcModel(npc.model, { color: npc.color, scale: 1 });
      model.group.position.set(x, y, z);
      model.group.rotation.y = Math.atan2(city.x - x, city.z - z);
      this.scene.add(model.group);

      const mark = makeMarker();
      mark.position.set(x, y + 2.2, z);
      mark.visible = false;
      this.scene.add(mark);

      this.entries.push({ npc, model, x, z, y, mark });
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
      // Float the marker above the NPC's actual standing height (plaza or ground).
      e.mark.position.y = e.y + 2.2 + Math.sin(performance.now() * 0.004) * 0.12;
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
