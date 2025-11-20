import * as THREE from 'three';
import { buildCreatureModel } from './creatureModels.js';
import './creatureDesigns.js';        // side effect: registers the authored creature designs
import './creatureDesignsExtra.js';   // side effect: hand-authored vermin + dragon designs
import { buildLootBagMesh } from './itemMeshes.js';
import { creaturesForLevel, CREATURES, getCreature } from './data/creatures.js';
import { zonePoolAt, wildernessLevelAt } from './zones.js';
import { elementMultiplier } from './data/items.js';
import { resolveItem } from './inventory.js';
import { getLang } from './i18n.js';
import { cityAt } from './cities.js';

const MAX_ALIVE = 22;
const SPAWN_RADIUS = 42;
const DESPAWN_RADIUS = 70;
const ATTACK_RANGE = 2.4;
const ATTACK_COOLDOWN = 0.7;
const DEATH_DUR = 0.6;       // seconds the death topple + dissolve plays
const LEASH_RADIUS = 36;     // farther than this from home, a creature gives up and returns
const WANDER_RADIUS = 12;   // how far a creature roams from its spawn point
const WANDER_SPEED = 0.55;  // roam pace as a fraction of the creature's chase speed

// Delegate to the world's own biome map when it has one (the surface World), so
// snow/desert/mountain/forest spawns match the terrain you see. 'grass' counts
// as 'forest' for spawn pools. Returns 'forest' as a safe default.
function biomeAt(world, x, z) {
  if (world.biomeAt) {
    const b = world.biomeAt(x, z);
    return b === 'grass' ? 'forest' : b;
  }
  return 'forest';
}

// How far apart to sample along the eye→creature segment when testing for walls.
const LOS_STEP = 1.2;          // metres between samples
const LOS_TERRAIN_MARGIN = 0.4; // ground must rise this far above the sight line to block

// True if there is a clear line of sight from `eye` (camera position) to a head
// at (hx, hy, hz). Walls = the world's registered solids (rocks, trees, cave
// pillars/walls) plus terrain that humps above the line. Used to hide nameplates
// and health bars behind walls — you only see what's actually in front of you.
function hasLineOfSight(world, eye, hx, hy, hz) {
  const dx = hx - eye.x, dy = hy - eye.y, dz = hz - eye.z;
  const horiz = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(horiz / LOS_STEP));
  // Walk the segment, skipping the endpoints (eye is never inside a wall; the
  // last sample sits on the creature itself).
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sx = eye.x + dx * t;
    const sz = eye.z + dz * t;
    const sy = eye.y + dy * t;
    // A solid footprint between us blocks the view.
    if (world.solidAt && world.solidAt(sx, sz, 0)) return false;
    // Terrain humping above the sight line blocks it too (looking over a hill).
    if (world.heightAt) {
      const ground = world.heightAt(sx, sz);
      if (ground > sy + LOS_TERRAIN_MARGIN) return false;
    }
  }
  return true;
}

const _losHead = new THREE.Vector3();

class Creature {
  constructor(def, world, scene, opts = {}) {
    this.def = def;
    this.world = world;
    this.scene = scene;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.dead = false;
    this.attackTimer = 0;
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    // Combat behaviour state + wiring (enemy ranged/area attacks, leash regen).
    this.provoked = false;
    this.returning = false;
    this.dungeon = opts.dungeon || null;            // in a cave: don't leash to cities
    this.rngFn = opts.rng || Math.random;           // shared deterministic rng
    this.combatHooks = opts.combatHooks || { spawnEnemyArea() {}, spawnEnemyShot() {} };
    this.model = buildCreatureModel(def.family, { color: def.color, scale: def.variantScale });
    scene.add(this.model.group);

    this.bar = makeHealthBar();
    this.model.group.add(this.bar.group);
    this.bar.group.position.y = 1.5 * def.variantScale + 0.4;

    // Floating name above the head, coloured by THREAT (recoloured lazily in
    // _updateLabels when the player's level changes). ⚔ marks aggressive foes.
    this._threatColor = '#ffffff';
    this.nameTag = makeNameTag(def.name, def.aggressive, this._threatColor);
    this.nameTag.position.y = 1.5 * def.variantScale + 0.62;
    this.model.group.add(this.nameTag);

    this.baseScale = this.model.group.scale.x;
    this.dying = false;
    this.deathT = 0;
    this.flashT = 0;
    this._mats = [];
    this.model.group.traverse((o) => { if (o.material && o.material.emissive) this._mats.push(o.material); });

    // Wander state: home is the patrol-area center (set on spawn). targetX/Z is
    // the current roam goal; waitT pauses briefly between legs so it isn't frantic.
    this.homeX = 0; this.homeZ = 0;
    this.targetX = 0; this.targetZ = 0;
    this.waitT = 0;
    // Per-creature deterministic RNG, seeded later from the spawn position.
    this._rng = mulberry(1);
  }

  flash() { this.flashT = 0.12; }

  placeAt(x, z) {
    this.pos.set(x, this.world.heightAt(x, z), z);
    this.model.group.position.copy(this.pos);
    this.homeX = x; this.homeZ = z;
    // Seed this creature's RNG from its spawn point so its roaming is varied but
    // stable, then pick an initial roam target right away (always in motion).
    this._rng = mulberry(((Math.round(x * 13.7) * 73856093) ^ (Math.round(z * 9.1) * 19349663)) >>> 0);
    this._pickRoamTarget();
  }

  // Choose a new wander goal somewhere inside the patrol area, on walkable land.
  _pickRoamTarget() {
    for (let i = 0; i < 4; i++) {
      const a = this._rng() * Math.PI * 2;
      const r = WANDER_RADIUS * (0.25 + this._rng() * 0.75);
      const tx = this.homeX + Math.cos(a) * r;
      const tz = this.homeZ + Math.sin(a) * r;
      if (this.world.heightAt(tx, tz) >= 0.6) { this.targetX = tx; this.targetZ = tz; return; }
    }
    // Fallback: stay home if every sample landed in water.
    this.targetX = this.homeX; this.targetZ = this.homeZ;
  }

  // Step toward the current roam target; pause and repick on arrival. Returns
  // true while actually walking (drives the walk animation).
  _wander(dt) {
    if (this.waitT > 0) { this.waitT -= dt; return false; }
    const tx = this.targetX - this.pos.x;
    const tz = this.targetZ - this.pos.z;
    const d = Math.hypot(tx, tz);
    if (d < 0.5) {
      this.waitT = 0.6 + this._rng() * 1.8; // brief rest, then a new leg
      this._pickRoamTarget();
      return false;
    }
    const sp = this.def.speed * WANDER_SPEED * dt;
    this.pos.x += (tx / d) * sp;
    this.pos.z += (tz / d) * sp;
    this.yaw = Math.atan2(tx, tz);
    return true;
  }

  update(dt, player, onPlayerHit, isNight, eye) {
    if (this.flashT > 0) {
      this.flashT -= dt;
      const k = Math.max(0, this.flashT / 0.12);
      for (const m of this._mats) m.emissive.setRGB(k, k, k);
    }
    if (this.dying) {
      this.nameTag.visible = false;
      this.deathT += dt;
      const e = this.deathT / DEATH_DUR;
      // The model plays its per-archetype topple/collapse (dieT), then the whole
      // group dissolves (shrinks) over the back half so it reads as a death, not
      // a pop-out.
      this.model.update(dt, false, Math.min(1, e));
      const s = this.baseScale * Math.max(0.01, 1 - e * e);
      this.model.group.scale.setScalar(s);
      if (e >= 1) this.dead = true;
      return;
    }
    if (this.dead) return;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const distHome = Math.hypot(this.pos.x - this.homeX, this.pos.z - this.homeZ);

    // RANGED attackers (archers, spearmen) keep their distance and shoot;
    // everyone else (melee/caster) closes in. Ranged engages from aggroRange.
    const ranged = this.def.attackKind === 'ranged';
    const engageRange = ranged ? this.def.aggroRange : ATTACK_RANGE;

    // A creature engages if it's aggressive OR it was provoked (a passive you
    // attacked fights back). Provocation ends when it has to leash home.
    // The Game Master is invisible to creatures: they never aggro, chase or
    // attack GM Maple — he simply walks among them while they roam.
    const wantsPlayer = !player.gm
      && (this.def.aggressive || this.provoked)
      && dist < Math.max(this.def.aggroRange, 8);

    // LEASH: if dragged too far from home (or the player ducked into a city),
    // stop chasing, walk home and regen — interrupted only by a fresh hit.
    if (this.returning) {
      // Regenerate 10%/s while walking back; stop returning once home.
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1 * dt);
      const hx = this.homeX - this.pos.x, hz = this.homeZ - this.pos.z;
      const hd = Math.hypot(hx, hz);
      if (hd < 1.0) { this.returning = false; this.provoked = false; }
      else {
        const sp = this.def.speed * dt;
        this.pos.x += (hx / hd) * sp; this.pos.z += (hz / hd) * sp;
        this.yaw = Math.atan2(hx, hz);
      }
      this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);
      this.model.group.position.copy(this.pos);
      this.model.group.rotation.y = this.yaw;
      this.model.update(dt, true);
      this._updateLabels(player, eye);
      return;
    }

    let moving = false;
    let chasing = wantsPlayer && dist > engageRange;
    if (chasing) {
      // Would the next step cross into a city, or pull us past the leash radius?
      // If so, give up and head home (you can't drag a dragon into a town).
      const sp = this.def.speed * dt;
      const nx = this.pos.x + (dx / dist) * sp;
      const nz = this.pos.z + (dz / dist) * sp;
      const wouldLeash = Math.hypot(nx - this.homeX, nz - this.homeZ) > LEASH_RADIUS;
      const intoCity = !this.dungeon && !!cityAt(nx, nz);
      if (wouldLeash || intoCity) {
        this.returning = true;
        moving = this._wander(dt);   // a beat of motion before the return kicks in
      } else {
        this.pos.x = nx; this.pos.z = nz;
        this.yaw = Math.atan2(dx, dz);
        moving = true;
      }
    } else if (ranged && wantsPlayer && dist < engageRange * 0.5) {
      // Ranged attacker too close: back away to keep its shooting distance.
      const sp = this.def.speed * 0.7 * dt;
      this.pos.x -= (dx / dist) * sp; this.pos.z -= (dz / dist) * sp;
      this.yaw = Math.atan2(dx, dz);
      moving = true;
    } else if (!wantsPlayer) {
      moving = this._wander(dt);
    } else {
      this.yaw = Math.atan2(dx, dz);   // face the player while attacking
    }

    // ATTACK. Melee hits in ATTACK_RANGE; ranged/caster shoot within aggroRange.
    const inAttackRange = ranged ? (dist <= engageRange) : (dist <= ATTACK_RANGE);
    if (wantsPlayer && inAttackRange) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackTimer = ATTACK_COOLDOWN * (ranged ? 1.4 : 1);
        if (this.model.attack) this.model.attack();
        // Occasional self-heal (hydra, dragon, ghoul-likes).
        if (this.def.selfHeal && this.rngFn() < this.def.selfHeal.chance) {
          this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.def.selfHeal.amount);
        }
        // Occasional AREA burst (hydra poison, dragon fire, scarab cloud): damages
        // the player if standing in it. Not every swing — gated by chance.
        if (this.def.areaAttack && this.rngFn() < this.def.areaAttack.chance) {
          const a = this.def.areaAttack;
          this.combatHooks.spawnEnemyArea(this.pos, a.kind, a.radius);
          if (dist <= a.radius) {
            let dmg = this.def.attack * a.damageMul * (isNight ? 1.3 : 1);
            dmg = Math.max(1, Math.round(dmg - player.defense * 0.5));
            onPlayerHit(dmg, this);
          }
        } else {
          let dmg = this.def.attack * (isNight ? 1.3 : 1);
          dmg = Math.max(1, Math.round(dmg - player.defense * 0.5));
          // Ranged shows a flying projectile; melee/caster hit directly.
          if (ranged) this.combatHooks.spawnEnemyShot(this.pos, player.pos, dmg, this);
          else onPlayerHit(dmg, this);
        }
      }
    }

    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);
    this.model.group.position.copy(this.pos);
    this.model.group.rotation.y = this.yaw;
    this.model.update(dt, moving);
    this._updateLabels(player, eye);
  }

  // Nameplate + health bar visibility/orientation, factored out so the leash
  // "returning" path can reuse it.
  _updateLabels(player, eye) {
    // Recolour the nameplate by threat only when the colour actually changes
    // (i.e. the player levelled up), so we rebuild the canvas texture rarely.
    const want = threatColor((this.def.level || 1) - (player.level || 1));
    if (want !== this._threatColor) {
      this._threatColor = want;
      const newTag = makeNameTag(this.def.name, this.def.aggressive, want);
      newTag.position.y = this.nameTag.position.y;
      newTag.visible = this.nameTag.visible;
      this.model.group.remove(this.nameTag);
      if (this.nameTag.material.map) this.nameTag.material.map.dispose();
      this.nameTag.material.dispose();
      this.nameTag = newTag;
      this.model.group.add(this.nameTag);
    }
    let inSight = true;
    if (eye) {
      this.model.group.getWorldPosition(_losHead);
      inSight = hasLineOfSight(this.world, eye, _losHead.x, this.pos.y + this.nameTag.position.y, _losHead.z);
    }
    this.nameTag.visible = inSight;
    const frac = this.hp / this.maxHp;
    this.bar.fill.scale.x = Math.max(0.001, frac);
    this.bar.fill.position.x = -(1 - frac) * 0.5;
    this.bar.group.visible = inSight && frac < 1;
    this.bar.group.lookAt(player.pos.x, this.bar.group.getWorldPosition(new THREE.Vector3()).y, player.pos.z);
  }

  takeDamage(amount) {
    if (this.dying) return false;
    this.hp -= amount;
    // Being attacked provokes a passive into fighting back, and interrupts any
    // leash-home regeneration (you can't farm a fleeing creature's heal).
    this.provoked = true;
    this.returning = false;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      this.bar.group.visible = false;
      return true;
    }
    return false;
  }

  dispose() {
    if (this.nameTag) {
      if (this.nameTag.material.map) this.nameTag.material.map.dispose();
      this.nameTag.material.dispose();
    }
    this.scene.remove(this.model.group);
    this.model.dispose();
  }
}

function makeHealthBar() {
  const group = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.13),
    new THREE.MeshBasicMaterial({ color: 0x301010, depthTest: false }));
  bg.renderOrder = 998;
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.13),
    new THREE.MeshBasicMaterial({ color: 0xd23b3b, depthTest: false }));
  fill.renderOrder = 999;
  fill.position.z = 0.001;
  group.add(bg, fill);
  return { group, fill };
}

// A camera-facing text sprite for the creature's name. Aggressive creatures are
// drawn in red so threats read at a glance.
// The nameplate colour encodes THREAT (the creature's level vs yours): green ≤
// you, white near, yellow/orange when it out-levels you, red when it's 11+
// above (uncatchable). Aggressive creatures get a ⚔ marker so you can tell
// they'll attack on sight regardless of the colour.
function threatColor(diff) {
  if (diff >= 11) return '#ff3b3b';   // red: cannot be killed
  if (diff >= 6) return '#ff8a3a';    // orange
  if (diff >= 1) return '#ffd24d';    // yellow
  if (diff >= -4) return '#ffffff';   // white: even
  return '#7bed6f';                   // green: weaker than you
}

function makeNameTag(text, aggressive, color) {
  const label = aggressive ? `⚔ ${text}` : text;
  const pad = 12, fontPx = 44;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `bold ${fontPx}px system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(label).width) + pad * 2;
  const h = fontPx + pad * 2;
  c.width = w; c.height = h;
  // Re-set font after resizing the canvas (resizing clears the context state).
  ctx.font = `bold ${fontPx}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(label, w / 2, h / 2);
  ctx.fillStyle = color || (aggressive ? '#ff5a4d' : '#ffffff');
  ctx.fillText(label, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.renderOrder = 1000;
  const scale = 0.55;
  sprite.scale.set((w / h) * scale, scale, 1);
  return sprite;
}

export class CombatSystem {
  constructor(scene, world, hooks) {
    this.scene = scene;
    this.world = world;
    this.hooks = hooks;
    this.creatures = [];
    this.drops = [];
    this.spawnTimer = 0;
    this.dungeon = null;
    this.rng = mulberry(987654321);
  }

  rngFloat() { return this.rng(); }

  // When set, spawns favor the dungeon's creature families and ignore biome.
  // `depth` (0-based floor index) makes deeper floors spawn the tougher variants
  // of those families — the cave gets harder the further down you go.
  setDungeon(dungeon, depth = 0) {
    this.dungeon = dungeon || null;
    this.dungeonDepth = depth | 0;
    this.dungeonFloors = dungeon && dungeon.floors ? dungeon.floors : 1;
  }

  // When set (a surface RUIN the player stands in), surface spawns draw from this
  // ruin's haunting families at their natural levels, overriding the gentle
  // wilderness pool — so e.g. a ghost town actually spawns ghosts/undead. Cleared
  // (null) when the player leaves the ruin. Caves (setDungeon) take precedence.
  setSurfaceSite(site) {
    this.surfaceSite = site || null;
  }

  spawnNear(player) {
    let x, z, h, inTown;
    let tries = 8;
    do {
      const angle = this.rng() * Math.PI * 2;
      const r = SPAWN_RADIUS * (0.4 + this.rng() * 0.6);
      x = player.pos.x + Math.cos(angle) * r;
      z = player.pos.z + Math.sin(angle) * r;
      // In a bounded room (cave), pull the point inside the walls.
      if (this.world.clampSpawn) { const c = this.world.clampSpawn(x, z); x = c.x; z = c.z; }
      h = this.world.heightAt(x, z);
      // No creatures inside a city — only NPCs live there. (Skip in dungeons.)
      inTown = !this.dungeon && !!cityAt(x, z);
    } while ((h < 0.6 || inTown) && --tries > 0);
    if (h < 0.6 || inTown) return;

    let list;
    if (this.dungeon && this.dungeon.creatureFamilies) {
      // Inside / near a boss cave: that cave's families, at the cave's own fixed
      // difficulty (not the player's level band) — the cave is the zone's
      // hardest pocket. DEPTH BAND: on a multi-floor cave the top floor leans on
      // the family's weaker variants and each floor down opens up the stronger
      // ones, so descending genuinely ramps the danger.
      const fams = this.dungeon.creatureFamilies;
      let famList = CREATURES.filter((c) => fams.includes(c.family) && !c.supreme);
      if (!famList.length) famList = CREATURES.filter((c) => fams.includes(c.family));
      const floors = Math.max(1, this.dungeonFloors || 1);
      if (floors > 1 && famList.length) {
        const lvls = famList.map((c) => c.level);
        const lo = Math.min(...lvls), hi = Math.max(...lvls);
        const span = Math.max(1, hi - lo);
        // This floor opens the band from `lo` up to a depth-scaled ceiling; the
        // deepest floor sees the whole family (including its toughest members).
        const t = (this.dungeonDepth + 1) / floors;
        const ceil = lo + span * Math.min(1, t + 0.15);
        // Floor (depth) also raises the FLOOR of the band a little, so the top
        // floor isn't crowded by the strongest variants.
        const floorLvl = lo + span * Math.max(0, this.dungeonDepth / floors - 0.25);
        list = famList.filter((c) => c.level <= ceil && c.level >= floorLvl);
        if (!list.length) list = famList.filter((c) => c.level <= ceil);
        if (!list.length) list = famList;
      } else {
        list = famList;
      }
    } else if (this.surfaceSite && this.surfaceSite.families) {
      // Standing in a surface RUIN: spawn its haunting families at their natural
      // levels (e.g. ghost town -> ghosts/skeletons/zombies/wraiths). This wins
      // over the zone/wilderness pool so the ruin feels themed and dangerous.
      const fams = this.surfaceSite.families;
      list = CREATURES.filter((c) => fams.includes(c.family) && !c.supreme);
      if (!list.length) list = CREATURES.filter((c) => fams.includes(c.family));
    } else {
      // Surface: geography decides difficulty. Use the themed zone's fixed pool
      // when in one, else a gentle wilderness pool by distance from the capital.
      const zonePool = zonePoolAt(x, z);
      if (zonePool && zonePool.length) {
        list = zonePool;
      } else {
        const lv = wildernessLevelAt(x, z);
        const biome = biomeAt(this.world, x, z);
        const pool = creaturesForLevel(lv).filter(
          (c) => (c.spawnBiome === biome || c.spawnBiome === 'anywhere') && !c.supreme);
        list = pool.length ? pool : creaturesForLevel(lv).filter((c) => !c.supreme);
      }
    }
    if (!list.length) return;
    const def = list[Math.floor(this.rng() * list.length)];
    const c = new Creature(def, this.world, this.scene, {
      dungeon: this.dungeon,
      rng: () => this.rng(),
      combatHooks: {
        spawnEnemyArea: (pos, kind, radius) => this.spawnEnemyArea(pos, kind, radius),
        spawnEnemyShot: (from, to, dmg, src) => this.spawnEnemyShot(from, to, dmg, src),
      },
    });
    c.placeAt(x, z);
    this.creatures.push(c);
  }

  // GM tool: summon a specific creature by its definition id at a world point
  // (a few metres in front of the GM). Returns the spawned creature, or null if
  // the id is unknown. Bypasses the spawn-cap and biome rules on purpose.
  gmSpawn(creatureId, x, z) {
    const def = getCreature(creatureId);
    if (!def) return null;
    const c = new Creature(def, this.world, this.scene, {
      dungeon: this.dungeon,
      rng: () => this.rng(),
      combatHooks: {
        spawnEnemyArea: (pos, kind, radius) => this.spawnEnemyArea(pos, kind, radius),
        spawnEnemyShot: (from, to, dmg, src) => this.spawnEnemyShot(from, to, dmg, src),
      },
    });
    c.placeAt(x, z);
    this.creatures.push(c);
    return c;
  }

  // A telegraphed enemy AREA burst (hydra poison, dragon fire, scarab cloud): a
  // brief coloured disc on the ground that fades. Purely visual — the damage to
  // the player is applied by the creature when it fires (see Creature.update).
  spawnEnemyArea(pos, kind, radius) {
    const color = kind === 'fire' ? 0xff5522 : kind === 'energy' ? 0xb78aff : 0x6ad24a;
    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 20),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, this.world.heightAt(pos.x, pos.z) + 0.08, pos.z);
    this.scene.add(ring);
    if (!this._fxRings) this._fxRings = [];
    this._fxRings.push({ mesh: ring, life: 0.6, max: 0.6 });
  }

  // A flying enemy projectile (arrow/spear/bolt) that travels to the player and
  // applies its damage on arrival via the onPlayerHit hook.
  spawnEnemyShot(from, to, dmg, src) {
    const geo = new THREE.SphereGeometry(0.12, 6, 5);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    mesh.position.set(from.x, from.y + 1.0, from.z);
    this.scene.add(mesh);
    if (!this._enemyShots) this._enemyShots = [];
    this._enemyShots.push({
      mesh, dmg, src,
      target: { x: to.x, y: to.y + 1.0, z: to.z },
      speed: 22,
    });
  }

  update(dt, player, isNight, eventMult, eye) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.creatures.length < MAX_ALIVE) {
      this.spawnTimer = 1.4;
      this.spawnNear(player);
    }

    for (const c of this.creatures) {
      c.update(dt, player, (dmg, src) => this.hooks.onPlayerHit(dmg, src), isNight, eye);
    }

    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      // Award the kill the moment it starts dying, then let it dissolve.
      if (c.dying && !c._rewarded) { c._rewarded = true; this.onKill(c, eventMult); }
      const dist = Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z);
      if (c.dead || (!c.dying && dist > DESPAWN_RADIUS)) {
        c.dispose();
        this.creatures.splice(i, 1);
      }
    }

    this._updateAllies(dt);
    this._updateEnemyFx(dt, player);
    for (const d of this.drops) d.spin(dt);
  }

  // Fade area rings; fly enemy projectiles to the player and deal their damage
  // on arrival.
  _updateEnemyFx(dt, player) {
    if (this._fxRings) {
      for (let i = this._fxRings.length - 1; i >= 0; i--) {
        const r = this._fxRings[i];
        r.life -= dt;
        const k = Math.max(0, r.life / r.max);
        r.mesh.material.opacity = 0.4 * k;
        r.mesh.scale.setScalar(1 + (1 - k) * 0.3);
        if (r.life <= 0) {
          this.scene.remove(r.mesh);
          r.mesh.geometry.dispose(); r.mesh.material.dispose();
          this._fxRings.splice(i, 1);
        }
      }
    }
    if (this._enemyShots) {
      for (let i = this._enemyShots.length - 1; i >= 0; i--) {
        const s = this._enemyShots[i];
        const mx = s.target.x - s.mesh.position.x;
        const my = s.target.y - s.mesh.position.y;
        const mz = s.target.z - s.mesh.position.z;
        const d = Math.hypot(mx, my, mz);
        const step = s.speed * dt;
        if (d <= step || d < 0.4) {
          // Arrived: apply the shot's damage and remove it.
          this.hooks.onPlayerHit(s.dmg, s.src);
          this.scene.remove(s.mesh);
          s.mesh.geometry.dispose(); s.mesh.material.dispose();
          this._enemyShots.splice(i, 1);
        } else {
          s.mesh.position.x += (mx / d) * step;
          s.mesh.position.y += (my / d) * step;
          s.mesh.position.z += (mz / d) * step;
        }
      }
    }
  }

  _updateAllies(dt) {
    if (!this.allies || !this.allies.length) return;
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const a = this.allies[i];
      a.life -= dt;
      a.model.update(dt, false);
      a.model.group.rotation.y += dt;
      a.hitTimer -= dt;
      if (a.hitTimer <= 0) {
        a.hitTimer = 1;
        for (const c of this.creatures) {
          if (c.dead || c.dying) continue;
          if (Math.hypot(c.pos.x - a.pos.x, c.pos.z - a.pos.z) < 5) {
            c.takeDamage(Math.max(1, Math.round(a.power)));
            this.hooks.onCreatureHit(c, Math.round(a.power), 1);
            break;
          }
        }
      }
      if (a.life <= 0) {
        this.scene.remove(a.model.group);
        a.model.dispose();
        this.allies.splice(i, 1);
      }
    }
  }

  // Find the creature the player is aiming at, within melee/aim range.
  attack(player, camDir, rayOrigin) {
    const ranged = player.weapon && (player.weapon.type === 'bow' || player.weapon.type === 'wand');
    const reach = ranged ? (player.attackRange || 14) : 4;

    // Raycast from the crosshair (camera center) and hit the creature whose body
    // sphere the ray passes through, nearest first. This makes the attack hit
    // exactly what's under the crosshair instead of "whoever is roughly ahead".
    const ox = rayOrigin ? rayOrigin.x : player.pos.x;
    const oy = rayOrigin ? rayOrigin.y : player.pos.y + 1.4;
    const oz = rayOrigin ? rayOrigin.z : player.pos.z;
    const dlen = Math.hypot(camDir.x, camDir.y, camDir.z) || 1;
    const rx = camDir.x / dlen, ry = camDir.y / dlen, rz = camDir.z / dlen;

    let best = null, bestT = Infinity;
    for (const c of this.creatures) {
      if (c.dead || c.dying) continue;
      // Horizontal reach is measured from the player, not the camera.
      const pdx = c.pos.x - player.pos.x, pdz = c.pos.z - player.pos.z;
      if (Math.hypot(pdx, pdz) > reach) continue;

      // Sphere centered on the creature's torso, radius scaled to its size.
      const r = 0.7 * (c.def.variantScale || 1) + 0.35;
      const cx = c.pos.x, cy = c.pos.y + 0.9 * (c.def.variantScale || 1), cz = c.pos.z;
      const mx = ox - cx, my = oy - cy, mz = oz - cz;
      const b = mx * rx + my * ry + mz * rz;
      const cc = mx * mx + my * my + mz * mz - r * r;
      if (cc > 0 && b > 0) continue;          // ray points away from the sphere
      const disc = b * b - cc;
      if (disc < 0) continue;                 // ray misses the sphere
      const tHit = -b - Math.sqrt(disc);      // nearest intersection distance
      const t = tHit < 0 ? 0 : tHit;
      if (t < bestT) { bestT = t; best = c; }
    }
    if (!best) return null;

    const w = player.weapon;
    const elem = w ? w.element : 'none';
    const mult = elementMultiplier(elem, best.def.element);

    // MISS by level gap (Tibia-style). A creature more than 10 levels above you
    // is uncatchable (always miss / 0 damage); up to +10 you miss with rising
    // odds, which your weapon SKILL (precision) mitigates. Distance attacks also
    // miss more the farther the target is.
    const diff = (best.def.level || 1) - (player.level || 1);
    let missChance = 0;
    if (diff >= 11) missChance = 1;
    else if (diff > 0) missChance = Math.pow(diff / 11, 1.5);
    const skill = player.weaponSkill || 10;
    if (missChance > 0 && missChance < 1) {
      const acc = Math.min(0.6, skill * 0.006);     // precision from weapon skill
      missChance *= (1 - acc);
      if (ranged) {                                  // farther = harder to hit
        const dist = Math.hypot(best.pos.x - player.pos.x, best.pos.z - player.pos.z);
        missChance *= Math.min(1.6, 1 + dist / (reach || 14));
        missChance = Math.min(1, missChance);
      }
    }
    if (missChance > 0 && this.rng() < missChance) {
      this.hooks.onCreatureHit(best, 0, mult, true);  // true = miss
      return { creature: best, dmg: 0, killed: false, mult, miss: true };
    }

    // Tibia damage shape: maxHit = K · skill · weaponAtk + level/5, rolled, then
    // armor is subtracted. player.damageMul folds in vocation + passive skills.
    const weaponAtk = (w ? w.atk : 7);
    const maxHit = (0.085 * skill * weaponAtk + (player.level || 1) / 5) * (player.damageMul || 1);
    const rolled = maxHit * (0.5 + this.rng() * 0.5);  // 50-100% of max
    let dmg = Math.max(0, Math.round((rolled - best.def.defense * 0.3) * mult));
    if (mult === 0) dmg = 0;
    const killed = best.takeDamage(dmg);
    this.hooks.onCreatureHit(best, dmg, mult);
    return { creature: best, dmg, killed, mult };
  }

  // A summoned ally: a friendly creature model that periodically damages nearby
  // enemies and expires after a while. Kept simple (no pathing).
  spawnAlly(family, pos, level) {
    const ally = {
      pos: pos.clone ? pos.clone() : { x: pos.x, y: pos.y, z: pos.z },
      model: buildCreatureModel(family || 'imp', { color: 0x66ccaa, scale: 0.8 }),
      life: 18, hitTimer: 0, power: 6 + level * 0.8,
    };
    ally.model.group.position.copy(this.scene.position).set(ally.pos.x, this.world.heightAt(ally.pos.x, ally.pos.z), ally.pos.z);
    this.scene.add(ally.model.group);
    if (!this.allies) this.allies = [];
    this.allies.push(ally);
  }

  // Apply skill damage to every creature within `radius` of a world point.
  // Returns how many were hit (for feedback). Used by area/ranged spells.
  damageArea(center, radius, amount) {
    let hits = 0;
    const r2 = radius * radius;
    for (const c of this.creatures) {
      if (c.dead || c.dying) continue;
      const dx = c.pos.x - center.x, dz = c.pos.z - center.z;
      if (dx * dx + dz * dz > r2) continue;
      const dmg = Math.max(1, Math.round(amount - c.def.defense * 0.3));
      c.takeDamage(dmg);
      this.hooks.onCreatureHit(c, dmg, 1);
      hits++;
    }
    return hits;
  }

  onKill(c, eventMult) {
    const xp = Math.round(c.def.exp * eventMult.xp);
    this.hooks.onKill(c, xp);
    const dropMult = eventMult.drop;
    const lang = getLang();
    let potionDropped = false; // cap potions at one per creature
    for (const entry of c.def.loot) {
      if (entry.itemId === 'gold') {
        const amount = entry.min + Math.floor(this.rng() * (entry.max - entry.min + 1));
        if (amount > 0) this.hooks.onLoot({ gold: amount });
        continue;
      }
      if (entry.potion && potionDropped) continue;
      const chance = Math.min(1, (entry.chance || 0) * dropMult);
      if (this.rng() < chance) {
        const item = resolveItem(entry.itemId, () => this.rng(), c.def.level, lang);
        if (item) {
          // Scatter loot in a little burst so multiple drops don't stack.
          const a = this.rng() * Math.PI * 2;
          const s = 2 + this.rng() * 2;
          this.spawnDrop(c.pos, item, { vel: { x: Math.cos(a) * s, y: 3.5 + this.rng() * 2, z: Math.sin(a) * s } });
          if (entry.potion) potionDropped = true;
        }
      }
    }
  }

  // Spawn a ground drop. opts.vel = {x,y,z} gives it an initial toss so it flies
  // in an arc and lands a bit away (used when the player drops an item forward,
  // so it doesn't land underfoot and get re-grabbed instantly). opts.pickupDelay
  // (seconds) blocks pickup until it settles.
  spawnDrop(pos, item, opts = {}) {
    const world = this.world;
    // A loot BAG (jute drawstring sack) instead of a plain crate — tinted by the
    // item's rarity so kids read its tier, with a glow on rare drops.
    const mesh = buildLootBagMesh(item.rarity || 'normal');
    const startY = world.heightAt(pos.x, pos.z) + 0.4;
    mesh.position.set(pos.x, startY, pos.z);
    this.scene.add(mesh);

    // Rare drops already carry an emissive point light from buildLootBagMesh;
    // grab it (if any) so the per-frame logic can keep it with the bag.
    let glow = null;
    mesh.traverse((o) => { if (o.isPointLight) glow = o; });

    const vel = opts.vel ? { x: opts.vel.x || 0, y: opts.vel.y || 0, z: opts.vel.z || 0 } : null;
    const drop = {
      item, mesh, glow, pos: mesh.position,
      vel, flying: !!vel,
      pickupAt: opts.pickupDelay ? performance.now() + opts.pickupDelay * 1000 : 0,
      baseY: startY,
      phase: pos.x, // de-syncs the idle bob between nearby drops
      // Per-frame motion: ballistic flight while tossed, gentle idle bob once
      // it has settled on the ground.
      spin(dt) {
        mesh.rotation.y += dt * 1.6;
        if (this.flying) {
          this.vel.y -= 16 * dt; // gravity
          mesh.position.x += this.vel.x * dt;
          mesh.position.y += this.vel.y * dt;
          mesh.position.z += this.vel.z * dt;
          const ground = world.heightAt(mesh.position.x, mesh.position.z) + 0.3;
          if (mesh.position.y <= ground && this.vel.y <= 0) {
            // Land: small bounce, bleed off horizontal speed; settle when slow.
            mesh.position.y = ground;
            if (this.vel.y < -3) {
              this.vel.y = -this.vel.y * 0.35;
              this.vel.x *= 0.5; this.vel.z *= 0.5;
            } else {
              this.flying = false;
              this.baseY = ground;
            }
          }
        } else {
          mesh.position.y = this.baseY + Math.sin(performance.now() * 0.003 + this.phase) * 0.1;
        }
      },
    };
    this.drops.push(drop);
  }

  // Player-dropped loot bag from death; recoverable by walking back.
  spawnLootBag(pos, item) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x7a4a21 }));
    mesh.position.set(pos.x, this.world.heightAt(pos.x, pos.z) + 0.35, pos.z);
    this.scene.add(mesh);
    const drop = { item, mesh, pos: mesh.position, baseY: mesh.position.y,
      spin(dt) { mesh.rotation.y += dt * 1.2; } };
    this.drops.push(drop);
  }

  // Collect any drop within pickup range; returns { item } or null. Drops still
  // in their toss/grace window are skipped so a freshly dropped item doesn't get
  // re-grabbed the instant it leaves your hand. `canAccept(item)` (optional) lets
  // the caller veto a pickup so a too-heavy/full item stays put on the ground
  // instead of being grabbed and re-dropped at the player's feet every frame.
  tryPickup(player, canAccept) {
    const now = performance.now();
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      if (d.pickupAt && now < d.pickupAt) continue;
      if (Math.hypot(d.pos.x - player.pos.x, d.pos.z - player.pos.z) >= 1.5) continue;
      const reason = canAccept ? canAccept(d.item) : 'ok';
      if (reason !== 'ok') return { item: null, reason, pos: d.pos };
      this.scene.remove(d.mesh);
      disposeMesh(d.mesh);
      this.drops.splice(i, 1);
      return { item: d.item, reason: 'ok' };
    }
    return null;
  }

  clear() {
    for (const c of this.creatures) c.dispose();
    this.creatures = [];
    for (const d of this.drops) { this.scene.remove(d.mesh); disposeMesh(d.mesh); }
    this.drops = [];
  }
}

// Free a mesh's geometry/material plus those of any child meshes (e.g. the
// rarity outline added to a ground drop) so picking items up doesn't leak.
function disposeMesh(mesh) {
  mesh.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
}

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
