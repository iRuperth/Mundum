import * as THREE from 'three';
import { buildNpcModel } from './npcModels.js';
import { NPCS } from './data/npcs.js';
import { CITIES } from './cities.js';
import { buildItemMesh, fitItemToSlot } from './itemDisplay.js';
import { getArmor, getWeapon } from './data/items.js';

// The treasures shown (decoration only) on the rarity collector's stall walls —
// a curated wall of legendary gear and jewels the player can look at but not take.
const COLLECTOR_DISPLAY = [
  'demon_armor', 'golden_armor', 'dragon_helmet', 'royal_armor',
  'demon_helmet', 'crusader_helmet', 'golden_legs', 'platinum_amulet',
  'demon_sword', 'crystal_sword', 'demon_axe', 'frost_helmet',
];

// Build the collector's ornate stall: a wooden kiosk with a back-and-side wall,
// a counter, an awning, and a grid of glass-cased 3D treasures mounted on the
// walls. Pure decoration — nothing here is interactive. Returns a THREE.Group to
// place at the collector's feet (origin at ground, facing +Z toward the plaza).
function buildCollectorStall() {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x3a2616 });
  const cloth = new THREE.MeshLambertMaterial({ color: 0x6a1b4a });   // rich purple awning
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9b341, metalness: 0.7, roughness: 0.4 });
  const W = 4.6, H = 3.4, D = 2.6;
  const backZ = -D;                  // inside face of the back wall
  const counterTopY = 1.0;           // top of the counter the collector stands at

  // Back wall + two side walls (behind/around the collector, away from the plaza).
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.18), darkWood);
  back.position.set(0, H / 2, backZ);
  g.add(back);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.18, H, D), wood);
    side.position.set(s * W / 2, H / 2, -D / 2);
    g.add(side);
  }
  // Counter the collector stands behind (front of the kiosk, toward the plaza).
  const counter = new THREE.Mesh(new THREE.BoxGeometry(W, counterTopY, 0.5), wood);
  counter.position.set(0, counterTopY / 2, -0.35);
  g.add(counter);
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.1, 0.66), darkWood);
  counterTop.position.set(0, counterTopY, -0.35);
  g.add(counterTop);

  // Awning: a FLAT slab sitting level on top of the two front posts (no tilt — the
  // old −0.18 tilt is what read as a deformed canopy), with a hanging valance
  // stripe and a gold trim edge so it reads as a proper market canopy.
  const awnY = H - 0.15;
  const awning = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, 0.14, D + 0.5), cloth);
  awning.position.set(0, awnY, -D / 2 + 0.3);
  g.add(awning);
  const valance = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, 0.34, 0.06), cloth);
  valance.position.set(0, awnY - 0.22, 0.55);
  g.add(valance);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, 0.06, 0.06), gold);
  trim.position.set(0, awnY - 0.4, 0.55);
  g.add(trim);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, awnY, 8), wood);
    post.position.set(s * (W / 2 + 0.3), awnY / 2, 0.5);
    g.add(post);
  }

  // A tidy SHELF of treasures on the back wall — ABOVE the counter so nothing clips
  // into it. Each treasure sits in its own glass-fronted case on a wooden shelf
  // board. Two shelves of N, filling the wall between the counter and the awning.
  const spinners = [];
  const cols = 4, rows = 2, cell = 0.82;
  const startX = -((cols - 1) * cell) / 2;
  const bandBottom = counterTopY + 0.55;       // clear of the counter top
  const bandTop = awnY - 0.55;                  // clear of the awning
  const rowStep = rows > 1 ? (bandTop - bandBottom) / (rows - 1) : 0;
  let n = 0;
  for (let row = 0; row < rows; row++) {
    const py = bandTop - row * rowStep;
    // A wooden shelf board running the width, under this row of cases.
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.07, 0.34), wood);
    shelf.position.set(0, py - cell * 0.46, backZ + 0.26);
    g.add(shelf);
    for (let col = 0; col < cols; col++) {
      const id = COLLECTOR_DISPLAY[n % COLLECTOR_DISPLAY.length]; n++;
      const def = getArmor(id) || getWeapon(id);
      if (!def) continue;
      const px = startX + col * cell;
      // a recessed dark case set into the back wall
      const caseBox = new THREE.Mesh(new THREE.BoxGeometry(cell * 0.9, cell * 0.9, 0.1),
        new THREE.MeshLambertMaterial({ color: 0x201810 }));
      caseBox.position.set(px, py, backZ + 0.1);
      g.add(caseBox);
      let mesh = null;
      try { mesh = buildItemMesh(def); } catch (_) { mesh = null; }
      if (mesh) {
        const fitted = fitItemToSlot(mesh, cell * 0.38);
        fitted.position.set(px, py, backZ + 0.3);
        g.add(fitted);
        spinners.push(fitted);
      }
    }
  }
  g.userData.spinners = spinners;   // gently rotated by WorldNpcs.update()
  return g;
}

const NPC_RADIUS = 2.6;
const NAME_RANGE = 18;     // only show a name tag within this many meters (and with line of sight)
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

// Hash a string to a 32-bit seed so an NPC's look is stable across sessions.
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const LOOK_SKIN = [0xf2c79b, 0xe0a87e, 0xc68a5a, 0x9c6b43, 0x7a4f2e, 0xffdbac];
const LOOK_HAIR = [0x2a1a10, 0x3a2a1c, 0x4a2f1b, 0x6a4a2a, 0x222222, 0x555555, 0x992222];
const LOOK_GRAY = [0xb0b0b0, 0xd8d8d8, 0xe8e4dc, 0x9a9a9a];
const MALE_HATS = ['none', 'none', 'none', 'cap', 'feather', 'bandana', 'straw'];

// Build a DETERMINISTIC, unique-ish appearance for an NPC from its id, so the
// potion seller in one city never looks like the one in another. A hand-authored
// npc.look (the special lore characters) always wins over this. Roles with fixed
// regalia (king/wizard/priest/guard) keep their preset; we only vary the humans.
export function lookForNpc(npc) {
  if (npc.look) return npc.look;                 // authored look wins
  // Robe/regalia roles already read distinct; leave them to the preset.
  if (npc.model === 'king' || npc.model === 'wizard' || npc.model === 'priest') return undefined;
  const rng = mulberry(hashStr(npc.id || npc.name || 'npc'));
  const old = rng() < 0.28;                       // ~a quarter are elders (gray)
  const female = npc.model === 'woman';
  const look = {
    skin: LOOK_SKIN[(rng() * LOOK_SKIN.length) | 0],
    hair: old ? LOOK_GRAY[(rng() * LOOK_GRAY.length) | 0] : LOOK_HAIR[(rng() * LOOK_HAIR.length) | 0],
  };
  if (!female) {
    const b = rng();
    look.beard = old
      ? (b < 0.4 ? 'long' : b < 0.7 ? 'full' : 'short')
      : (b < 0.35 ? 'none' : b < 0.55 ? 'short' : b < 0.72 ? 'goatee' : b < 0.86 ? 'full' : 'long');
    if (rng() < 0.18) look.bald = true;
    else if (rng() < 0.2) look.balding = true;
    // build variety for non-fixed male roles
    const bd = rng();
    if (npc.model === 'man' || npc.model === 'merchant' || npc.model === 'smith') {
      look.build = bd < 0.14 ? 'fat' : bd < 0.24 ? 'dwarf' : bd < 0.34 ? 'slim' : 'broad';
    }
    look.hat = MALE_HATS[(rng() * MALE_HATS.length) | 0];
    if (rng() < 0.08) look.eyepatch = rng() < 0.5 ? 1 : -1;
    if (rng() < 0.14) look.glasses = true;
    if (rng() < 0.14) look.scar = true;          // smiths/guards often scarred
    if (rng() < 0.12) look.mole = true;
    if (rng() < 0.14) look.freckles = true;
    if (rng() < 0.1) look.big_nose = true;
    if (old && rng() < 0.5) look.bushyBrows = true;
  } else {
    if (rng() < 0.18) look.glasses = true;
    if (rng() < 0.16) look.freckles = true;
    if (rng() < 0.12) look.mole = true;
    if (rng() < 0.3) look.build = rng() < 0.5 ? 'slim' : 'broad';
  }
  return look;
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
    // How many vendors already placed in each building, so a second/third vendor
    // sharing a district stands BESIDE the first instead of on top of it.
    const interiorCount = {};
    for (const npc of NPCS) {
      // LOOSE NPCs stand out in the wild at explicit world coords (no city) — e.g.
      // the renegade orc near the orc camp. They snap to terrain height.
      let x, z, indoor = false, color, y;
      if (npc.worldPos) {
        x = npc.worldPos.x; z = npc.worldPos.z;
        y = this.world.heightAt(x, z);
        color = npc.color;
      } else {
        const city = cityById[npc.city];
        if (!city) continue;
        // Vendors stand (and stroll) inside their themed shop building; everyone
        // else uses their authored offset from the city center.
        const dKey = districtForNpc(npc);
        const interior = dKey ? this._interiorFor(npc.city, dKey) : null;
        if (interior) {
          // Fan multiple vendors of the same building out around its center so
          // they don't overlap (e.g. the weaponsmith + armorer sharing the
          // Armory). The first stands at center; the rest ring around it.
          const ikey = npc.city + ':' + dKey;
          const n = interiorCount[ikey] || 0;
          interiorCount[ikey] = n + 1;
          if (n === 0) { x = interior.x; z = interior.z; }
          else {
            const ang = (n - 1) * (Math.PI * 2 / 3) + 0.5;  // spread around the room
            x = interior.x + Math.cos(ang) * 2.4;
            z = interior.z + Math.sin(ang) * 2.4;
          }
          indoor = true;
        } else {
          x = city.x + (npc.offset ? npc.offset.x : 0); z = city.z + (npc.offset ? npc.offset.z : 0);
        }
        // The whole city sits on one flat pad, so every NPC stands on city.groundY.
        y = city.groundY != null ? city.groundY : this.world.heightAt(x, z);
        // Dress NPCs for their city's climate.
        color = climateTint(npc.color, city.biome);
      }
      const model = buildNpcModel(npc.model, { color, scale: 1, look: lookForNpc(npc) });
      // Face toward the city center (town NPCs) or a default heading (loose NPCs).
      const faceCity = !npc.worldPos && cityById[npc.city];
      const yaw = faceCity ? Math.atan2(faceCity.x - x, faceCity.z - z) : 0;
      model.group.position.set(x, y, z);
      model.group.rotation.y = yaw;
      this.scene.add(model.group);

      // The rarity collector gets an ornate treasure stall behind him (display
      // only). It faces the same way the collector does (toward the plaza).
      let stall = null;
      if (npc.collector) {
        stall = buildCollectorStall();
        stall.position.set(x, y, z);
        stall.rotation.y = yaw;
        this.scene.add(stall);
      }

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
        npc, model, x, z, y, mark, nameTag, yaw, rng, indoor, stall,
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

  tick(dt, playerPos = null) {
    const tnow = performance.now() * 0.0006;
    for (const e of this.entries) {
      let moving = false;
      // Spin the collector's display treasures so the stall reads as a showcase.
      if (e.stall && e.stall.userData.spinners) {
        for (const sp of e.stall.userData.spinners) sp.rotation.y = tnow;
      }
      if (e.faceT > 0) {
        // Holding the player's gaze: stand still and turn to them.
        e.faceT -= dt;
        if (e.targetYaw != null) e.yaw = turnToward(e.yaw, e.targetYaw, dt * 8);
      } else if (e.npc.collector) {
        // The collector stays put behind his counter (never wanders).
        moving = false;
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
      // Only show the name when the player is CLOSE and there's a clear line of
      // sight — a city wall between them hides it, so names no longer bleed
      // through walls or read from across the map. (Fades via opacity; the
      // sprite's own `.visible` still gates the whole NPC underground.)
      e.nameTag.material.opacity = this._tagVisible(e, playerPos) ? 1 : 0;
    }
  }

  // A name tag shows only within NAME_RANGE and with nothing solid between the
  // player and the NPC. Skips the line-of-sight raycast when out of range (cheap
  // early-out) and when the player is essentially on top of the NPC.
  _tagVisible(e, playerPos) {
    if (!playerPos) return true;
    const dx = e.x - playerPos.x, dz = e.z - playerPos.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > NAME_RANGE * NAME_RANGE) return false;
    if (d2 < 4) return true;   // right next to them — skip the LoS check
    return !this.world.lineBlocked(playerPos.x, playerPos.z, e.x, e.z);
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
  // NPC names are always YELLOW so they read instantly as non-player characters;
  // real players and bots wear white name tags (see peers.js / bots.js). The
  // per-role palette is kept around in case a future map key wants it.
  ctx.fillStyle = '#ffd34d';
  void role;
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
