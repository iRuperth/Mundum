import * as THREE from 'three';
import { buildNpcModel } from './npcModels.js';
import { NPCS } from './data/npcs.js';
import { CITIES } from './cities.js';

const NPC_RADIUS = 2.6;
const HOME_RADIUS = 3.4;   // how far an NPC strolls from its spawn spot
const WALK_SPEED = 0.7;    // meters per second while strolling
const FACE_HOLD = 4;       // seconds an NPC keeps facing the player after talking

// Small deterministic PRNG so each NPC's stroll is varied but stable per spot.
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smoothly rotate `from` toward `to`, never overshooting, taking the short way.
function turnToward(from, to, maxStep) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}

// Places every NPC on its city, strolls them gently around home, turns them to
// face the player on interaction, and floats a '!' over available quest givers.
// Map a vendor NPC's wares to the district building it should live in, so the
// shopkeeper walks around inside the matching themed shop.
function districtForNpc(npc) {
  // An explicit district wins, so capital staff land in their named building
  // (bank, food, archer, bag, townhall) — this also covers the banker and the
  // mayor, who have no shop but still belong inside a building.
  if (npc.district) return npc.district;
  if (!npc.shop) return null;
  const s = npc.shop.sells || {};
  const k = s.kinds || [], t = s.types || [];
  if (k.includes('potion')) return 'potion';
  if (t.includes('bow')) return 'archer';
  if (k.includes('weapon') || k.includes('armor') || k.includes('shield')) return 'knight';
  if (t.includes('wand')) return 'mage';
  if (k.includes('container')) return 'bag';
  if (s.tiers) return 'food';
  return 'market';
}

export class WorldNpcs {
  constructor(scene, world, interiors = []) {
    this.scene = scene;
    this.world = world;
    this.interiors = interiors;
    this.entries = [];
    this._build();
  }

  // Find the interior center of a district building in a given city.
  _interiorFor(cityId, key) {
    return this.interiors.find((it) => it.city.id === cityId && it.kind === key) || null;
  }

  _build() {
    const cityById = {};
    for (const c of CITIES) cityById[c.id] = c;
    for (const npc of NPCS) {
      const city = cityById[npc.city];
      if (!city) continue;
      // Vendors stand (and stroll) inside their themed shop building; everyone
      // else uses their authored offset from the city center.
      let x, z, indoor = false;
      const dKey = districtForNpc(npc);
      const interior = dKey ? this._interiorFor(npc.city, dKey) : null;
      if (interior) { x = interior.x; z = interior.z; indoor = true; }
      else { x = city.x + (npc.offset ? npc.offset.x : 0); z = city.z + (npc.offset ? npc.offset.z : 0); }
      // The whole city sits on one flat pad, so every NPC stands on city.groundY.
      const y = city.groundY != null ? city.groundY : this.world.heightAt(x, z);
      // Dress NPCs for their city's climate: snow towns wear cool winter coats,
      // desert towns wear warm sandy robes; temperate towns keep their own color.
      const color = climateTint(npc.color, city.biome);
      const model = buildNpcModel(npc.model, { color, scale: 1 });
      const yaw = Math.atan2(city.x - x, city.z - z);
      model.group.position.set(x, y, z);
      model.group.rotation.y = yaw;
      this.scene.add(model.group);

      const mark = makeMarker();
      mark.position.set(x, y + 2.2, z);
      mark.visible = false;
      this.scene.add(mark);

      // A floating name tag over every NPC's head, so the player can read who
      // each townsperson is at a glance (the user asked for a name above each
      // NPC). Billboarded sprite, drawn on top so walls never hide the name.
      const nameTag = makeNpcNameTag(npc.name, npc.role);
      nameTag.position.set(x, y + 2.9, z);
      this.scene.add(nameTag);

      const rng = mulberry(((Math.round(x * 13.7) * 73856093) ^ (Math.round(z * 9.1) * 19349663)) >>> 0);
      const e = {
        npc, model, x, z, y, mark, nameTag, yaw, rng, indoor,
        // Indoor vendors keep a tight stroll so they don't clip through the walls.
        roam: indoor ? 3.0 : HOME_RADIUS,
        homeX: x, homeZ: z, targetX: x, targetZ: z, waitT: rng() * 2, faceT: 0,
      };
      this._pickRoamTarget(e);
      this.entries.push(e);
    }
  }

  // Pick a new stroll goal somewhere inside the home radius.
  _pickRoamTarget(e) {
    const a = e.rng() * Math.PI * 2;
    const r = (e.roam || HOME_RADIUS) * (0.3 + e.rng() * 0.7);
    e.targetX = e.homeX + Math.cos(a) * r;
    e.targetZ = e.homeZ + Math.sin(a) * r;
  }

  // Step toward the current goal; rest briefly and repick on arrival. Returns
  // true while actually walking (drives the walk animation).
  _wander(e, dt) {
    if (e.waitT > 0) { e.waitT -= dt; return false; }
    const tx = e.targetX - e.x, tz = e.targetZ - e.z;
    const d = Math.hypot(tx, tz);
    if (d < 0.3) {
      e.waitT = 1 + e.rng() * 2.5;
      this._pickRoamTarget(e);
      return false;
    }
    const step = WALK_SPEED * dt;
    e.x += (tx / d) * step;
    e.z += (tz / d) * step;
    e.yaw = turnToward(e.yaw, Math.atan2(tx, tz), dt * 6);
    return true;
  }

  // Turn an NPC to face the player and hold the gaze (pauses its strolling).
  facePlayer(npcId, px, pz) {
    for (const e of this.entries) {
      if (e.npc.id !== npcId) continue;
      e.targetYaw = Math.atan2(px - e.x, pz - e.z);
      e.faceT = FACE_HOLD;
      return;
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

  // Hide/show all NPCs and their markers (used when the player goes underground).
  setVisible(v) {
    for (const e of this.entries) {
      e.model.group.visible = v;
      e.nameTag.visible = v;
      if (!v) e.mark.visible = false;
    }
  }

  tick(dt) {
    for (const e of this.entries) {
      let moving = false;
      if (e.faceT > 0) {
        // Holding the player's gaze: stand still and turn to them.
        e.faceT -= dt;
        if (e.targetYaw != null) e.yaw = turnToward(e.yaw, e.targetYaw, dt * 8);
      } else {
        moving = this._wander(e, dt);
      }
      e.model.group.position.set(e.x, e.y, e.z);
      e.model.group.rotation.y = e.yaw;
      e.model.update(dt, moving);
      e.mark.rotation.y += dt * 2;
      const bob = Math.sin(performance.now() * 0.004) * 0.12;
      e.mark.position.set(e.x, e.y + 2.2 + bob, e.z);
      // Keep the name tag riding just above the NPC's head as it strolls. The
      // quest '!' marker shares the same airspace, so the name sits a touch
      // higher when the marker is showing.
      e.nameTag.position.set(e.x, e.y + (e.mark.visible ? 3.3 : 2.9) + bob * 0.4, e.z);
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

// Name color per role, so a glance tells townsfolk apart: gold for royalty and
// mayors, steel-blue for guards, soft green for quest givers, parchment for the
// rest. Matches the friendly, readable look of the creature name tags.
const ROLE_COLOR = {
  king: '#ffd34d', mayor: '#ffd34d', priest: '#bfe3ff', guard: '#9fc1e8',
  questgiver: '#9ff09a', banker: '#ffe08a', merchant: '#ffe6b0', vendor: '#ffe6b0',
  villager: '#e8e0cf',
};

// A floating, billboarded name tag for an NPC — the same canvas-sprite technique
// the creatures and city signs use. Drawn on top (depthTest off) so it's always
// legible, with a dark outline so it reads over any background.
function makeNpcNameTag(text, role) {
  const pad = 12, fontPx = 40;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `bold ${fontPx}px system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = fontPx + pad * 2;
  c.width = w; c.height = h;
  ctx.font = `bold ${fontPx}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, w / 2, h / 2);
  ctx.fillStyle = ROLE_COLOR[role] || '#e8e0cf';
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.renderOrder = 999;
  const scale = 0.5;
  sprite.scale.set((w / h) * scale, scale, 1);
  return sprite;
}

// Blend an NPC's base color toward a climate tint so towns look dressed for
// their region. Temperate ('forest') keeps the original color unchanged.
const CLIMATE_TINT = { snow: 0x9fc4e8, desert: 0xd8b46a };
function climateTint(baseColor, biome) {
  const tint = CLIMATE_TINT[biome];
  if (tint == null || baseColor == null) return baseColor;
  const br = (baseColor >> 16) & 255, bg = (baseColor >> 8) & 255, bb = baseColor & 255;
  const tr = (tint >> 16) & 255, tg = (tint >> 8) & 255, tb = tint & 255;
  const mix = 0.45; // how strongly the climate shows through
  const r = Math.round(br * (1 - mix) + tr * mix);
  const g = Math.round(bg * (1 - mix) + tg * mix);
  const b = Math.round(bb * (1 - mix) + tb * mix);
  return (r << 16) | (g << 8) | b;
}
