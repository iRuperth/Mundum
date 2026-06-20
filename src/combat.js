import * as THREE from 'three';
import { buildCreatureModel } from './creatureModels.js';
import './creatureDesigns.js';        // side effect: registers the authored creature designs
import './creatureDesignsExtra.js';   // side effect: hand-authored vermin + dragon designs
import './mountDesigns.js';           // side effect: mount + tiger + ice-dragon designs
import { buildLootBagMesh } from './itemMeshes.js';
import { buildItemMesh } from './itemDisplay.js';
import { CreatureStatus } from './statusEffects.js';
import { buildCreatureLairDecor, disposeLairDecor } from './creatureDecor.js';
import { creaturesForLevel, CREATURES, getCreature } from './data/creatures.js';
import { zonePoolAt, wildernessLevelAt } from './zones.js';
import { elementMultiplier, getWeapon, getArmor, getQuiver, RARITY, instanceFromCoin, getCoin, coinsFromValue } from './data/items.js';
import { resolveItem } from './inventory.js';
import { getLang } from './i18n.js';
import { cityAt, capitalSafeLevelCap } from './cities.js';

const MAX_ALIVE = 22;
const MAX_PETS = 2;          // a druid keeps at most two loyal summons at once
const SPAWN_RADIUS = 42;
const DESPAWN_RADIUS = 70;
const ATTACK_RANGE = 2.4;
const ATTACK_COOLDOWN = 0.7;
const TAUNT_DURATION = 6;    // seconds a knight's Challenge locks a creature onto the player
const DEATH_DUR = 0.6;       // seconds the death topple + dissolve plays
const LEASH_RADIUS = 100;    // max chase distance from home (~100m): a creature
                             // pursues this far then gives up and walks back, so
                             // nobody can drag a strong creature into a low-level
                             // area to kill newbies — it leashes home long before.

// --- Loot rules ------------------------------------------------------------
// Drop-chance caps by item level: low-level gear (< DROP_CAP_LEVEL) never exceeds
// DROP_CAP_LO (6%); higher-level gear (>= DROP_CAP_LEVEL) never exceeds DROP_CAP_HI
// (3%) so strong gear stays a rare prize. 6% is the HARD ceiling for ANY gear
// drop — even a strong creature with a level-boosted dropMult can't push a gear
// item past 6%. Legendary gear never drops — only the Game Master grants it.
const DROP_CAP_LEVEL = 25;
const DROP_CAP_LO = 0.06;   // items under level 25 (hard ceiling for all gear)
const DROP_CAP_HI = 0.03;   // items level 25 and up

// Whether a loot id is EQUIPMENT (weapon / armor / quiver) — only gear is subject
// to the drop-chance caps. Materials, trophies, coins and lights are the steady
// grind/economy drops and keep their authored chances (silk 50%, trophy 60%…).
function isGearDrop(itemId) {
  return !!(getWeapon(itemId) || getArmor(itemId) || getQuiver(itemId));
}

// The floating label for a dropped stack: "100 × Bronze Coin", "12 × Mana Potion".
// A single item keeps its plain name. We use "N × name" (not pluralising) so it's
// correct in both ES and EN — Spanish names like "Moneda de Plata" don't take +s.
function dropLabel(name, count) {
  if (!count || count <= 1) return name;
  return count + ' × ' + name;
}

// Target ground SIZE (max-dimension, world units) for a dropped item's 3D model,
// so small things look small and big things look big: a ring/coin is tiny, a
// potion small, a weapon/armor near full size. Keeps the loot readable on the
// floor without one type dwarfing the others.
function dropGroundSize(item) {
  const slot = item.slot, type = item.type, kind = item.kind;
  if (kind === 'coin' || type === 'coin') return 0.32;          // a little coin stack
  if (slot === 'ring' || slot === 'amulet') return 0.26;        // jewelry, tiny
  if (kind === 'potion' || type === 'potion') return 0.34;      // potion/fruit, small
  if (kind === 'material' || kind === 'trophy') return 0.34;    // scrap, small
  if (slot === 'armor' || slot === 'legs') return 0.7;          // big gear
  if (type && ['sword', 'axe', 'mace', 'lance', 'bow', 'crossbow'].includes(type)) return 0.85; // weapons read long
  if (slot === 'helmet' || slot === 'boots' || type === 'shield' || type === 'wand') return 0.5;
  if (slot === 'bag' || type === 'container') return 0.5;
  return 0.45;
}

// The base item's required level (for the drop-chance cap), 0 if unknown.
function itemDropLevel(itemId) {
  const w = getWeapon(itemId); if (w) return w.levelReq || 0;
  const a = getArmor(itemId); if (a) return a.levelReq || 0;
  const q = getQuiver(itemId); if (q) return q.levelReq || 0;
  return 0; // materials/trophies/coins/lights have no level gate
}

// Whether a loot id is a LEGENDARY item (GM-only). A base flagged
// shopTier 'legendary-tier' is the curated legendary set; the random Legendary
// rarity roll is blocked separately on the resolved instance.
function isLegendaryDrop(itemId) {
  const w = getWeapon(itemId);
  if (w && w.shopTier === 'legendary-tier') return true;
  const a = getArmor(itemId);
  if (a && a.shopTier === 'legendary-tier') return true;
  return false;
}

// Level-banded potion tiers (self-contained so this never depends on the
// creatures data module). `small` returns the tier just BELOW the level, else
// the tier AT the level. Mirrors the creatures.js tables.
const POTION_HP_TIERS = [
  [1, 'apple'], [4, 'grapes'], [8, 'pear'], [12, 'melon'], [16, 'minor_health'],
  [22, 'health_potion'], [30, 'strong_health'], [38, 'great_health'],
  [48, 'mega_health'], [58, 'super_health'], [72, 'ultra_health'],
  [88, 'supreme_health'], [105, 'divine_health'],
];
const POTION_MANA_TIERS = [
  [1, 'berry'], [4, 'blueberries'], [8, 'mango'], [12, 'minor_mana'], [16, 'mana_potion'],
  [22, 'strong_mana'], [30, 'great_mana'], [38, 'mega_mana'],
  [48, 'super_mana'], [58, 'ultra_mana'], [72, 'supreme_mana'],
  [88, 'divine_mana'], [105, 'cosmic_mana'],
];
// The potion id for a kind ('hp'|'mana') at `level`. `small` picks one tier
// lower (a "small" potion) so a kill mixes small + large.
function potionTierId(kind, level, small) {
  const table = kind === 'mana' ? POTION_MANA_TIERS : POTION_HP_TIERS;
  let idx = 0;
  for (let i = 0; i < table.length; i++) { if (level >= table[i][0]) idx = i; else break; }
  if (small) idx = Math.max(0, idx - 1);
  return table[idx][1];
}

// --- Precise aim geometry --------------------------------------------------
// Every targeting decision (the red-cross lock, the actual hit, and the point a
// projectile flies toward) uses ONE shared body model per creature so they all
// agree no matter how high/low the creature sits. The body is a vertical CAPSULE
// (a segment from feet to head, plus a radius) matching the visible model: feet
// at pos.y (the model is lifted onto the ground by footOffset), head at
// ~1.5*scale (where the name tag/health bar sit), torso half-width ~0.45*scale.
function creatureBody(c) {
  const s = c.def.variantScale || 1;
  return {
    bx: c.pos.x, bz: c.pos.z,
    y0: c.pos.y + 0.15 * s,                 // ankle (a touch above the feet)
    y1: c.pos.y + 1.45 * s,                 // crown of the head
    r: 0.42 * s + 0.18,                     // body radius (+ a small aim-assist pad)
  };
}

// Closest approach between a ray (origin o, unit dir d) and a vertical segment
// [P0,P1]. Returns { t, d2, point } where t is the distance along the ray to the
// closest point, d2 the squared gap to the segment, and point the segment point
// nearest the ray. Used for ray-vs-capsule hit tests and for the exact aim point.
const _rcA = new THREE.Vector3(), _rcB = new THREE.Vector3(), _rcPt = new THREE.Vector3();
function rayVsVertSeg(ox, oy, oz, dx, dy, dz, bx, y0, y1, bz) {
  // Sample the segment densely and take the closest point on the RAY to each
  // sample, keeping the best — robust, branch-light, and exact enough at our
  // scale (segments are <~4m). This avoids the degenerate cases of the analytic
  // segment-segment solve when the ray is near-parallel to the vertical body.
  let bestD2 = Infinity, bestT = 0, bestY = y0;
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const sy = y0 + (y1 - y0) * (i / N);
    // closest point on the ray to (bx, sy, bz): t = dot(P-O, dir)
    let t = (bx - ox) * dx + (sy - oy) * dy + (bz - oz) * dz;
    if (t < 0) t = 0;
    const px = ox + dx * t, py = oy + dy * t, pz = oz + dz * t;
    const gx = px - bx, gy = py - sy, gz = pz - bz;
    const d2 = gx * gx + gy * gy + gz * gz;
    if (d2 < bestD2) { bestD2 = d2; bestT = t; bestY = sy; }
  }
  return { t: bestT, d2: bestD2, y: bestY };
}
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
const _barWorld = new THREE.Vector3();   // scratch for the health-bar lookAt (avoids per-frame alloc)
const LOS_REFRESH = 0.2;                  // seconds between per-creature line-of-sight rechecks

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
    this.taunted = 0;   // >0 = forced to chase the player (knight Challenge)
    this._losPhase = (opts.rng ? opts.rng() : Math.random()) * LOS_REFRESH;  // stagger LoS rechecks
    // Player-inflicted status (burn/poison DOT + slow). Sorcerer fire burns;
    // druid ice/poison slows + poisons. Ticked in update(); applied to speed.
    this.status = new CreatureStatus();
    this.dungeon = opts.dungeon || null;            // in a cave: don't leash to cities
    this.rngFn = opts.rng || Math.random;           // shared deterministic rng
    this.combatHooks = opts.combatHooks || { spawnEnemyArea() {}, spawnEnemyShot() {} };
    this.model = buildCreatureModel(def.family, { color: def.color, scale: def.variantScale, design: def.design, boss: !!(def.boss || def.supreme) });
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
    this.targeted = false;       // true while it's the player's aimed-at target
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

  // Movement speed after player-inflicted SLOW (druid control). Used by all the
  // chase/flee/wander/back-away movement so a slowed creature visibly crawls.
  get spd() { return this.def.speed * this.status.speedMultiplier(); }

  // Mark/unmark this creature as the player's current target. While targeted it
  // glows a steady red so the player can see exactly who their next hit/shot
  // lands on, even when the creature is above or below them. Restores the normal
  // (unlit) look when cleared.
  setTargeted(on) {
    if (this.targeted === on) return;
    this.targeted = on;
    if (this.flashT <= 0) this._applyEmissive();   // don't fight an active hit-flash
  }

  // Write the current emissive tint: a hit-flash (white) wins while it lasts,
  // else the target glow (red) if targeted, else nothing.
  _applyEmissive() {
    if (this.targeted) { for (const m of this._mats) m.emissive.setRGB(0.55, 0.04, 0.04); }
    else { for (const m of this._mats) m.emissive.setRGB(0, 0, 0); }
  }

  // Put the visible model at the creature's logical position, lifted by the
  // model's footOffset so its lowest point (feet) rests ON the terrain instead of
  // sinking through it. pos.y stays the ground height for AI / line-of-sight.
  _placeModel() {
    this.model.group.position.set(this.pos.x, this.pos.y + (this.model.footOffset || 0), this.pos.z);
  }

  placeAt(x, z) {
    this.pos.set(x, this.world.heightAt(x, z), z);
    this._placeModel();
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
    const sp = this.spd * WANDER_SPEED * dt;
    this.pos.x += (tx / d) * sp;
    this.pos.z += (tz / d) * sp;
    this.yaw = Math.atan2(tx, tz);
    return true;
  }

  update(dt, player, onPlayerHit, isNight, eye) {
    this._dtForLos = dt;   // remembered so _updateLabels can throttle its LoS check
    if (this.flashT > 0) {
      this.flashT -= dt;
      const k = Math.max(0, this.flashT / 0.12);
      // White hit-flash; when it fades, fall back to the target glow (or nothing).
      if (this.flashT <= 0) this._applyEmissive();
      else for (const m of this._mats) m.emissive.setRGB(Math.max(k, this.targeted ? 0.5 : 0), k * 0.5, k * 0.5);
    }
    // Player-inflicted DOT (burn/poison): drain HP on its tick and report it so
    // the combat system can float the number + award the kill if it dies from it.
    if (!this.dying && !this.dead && this.status.active) {
      this.status.tick(dt, (amt, kind) => {
        if (this.dying || this.dead) return;
        this.statusKind = kind;            // colours the floating number (burn/poison)
        const killed = this.takeDamage(amt);
        if (this._onStatusTick) this._onStatusTick(this, amt, kind, killed);
        this.statusKind = null;
      });
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
    // Floor the distance to a tiny epsilon so the `dx / dist` movement steps
    // below never divide by zero (player standing exactly on the creature would
    // otherwise NaN its position, freezing it and making it un-despawnable).
    const dist = Math.max(1e-4, Math.hypot(dx, dz));
    const distHome = Math.hypot(this.pos.x - this.homeX, this.pos.z - this.homeZ);

    // RANGED attackers (archers, spearmen) keep their distance and shoot;
    // everyone else (melee/caster) closes in. Ranged engages from aggroRange.
    const ranged = this.def.attackKind === 'ranged';
    const engageRange = ranged ? this.def.aggroRange : ATTACK_RANGE;

    // Decay the knight-taunt window. While taunted, the creature engages the
    // player regardless of aggro range (it was forcibly challenged).
    if (this.taunted > 0) this.taunted -= dt;

    // A creature engages if it's aggressive OR it was provoked (a passive you
    // attacked fights back) OR it's been taunted. Provocation ends when it has to
    // leash home. The Game Master is invisible to creatures: they never aggro.
    const wantsPlayer = !player.gm
      && (this.def.aggressive || this.provoked || this.taunted > 0)
      && (this.taunted > 0 || dist < Math.max(this.def.aggroRange, 8));

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
      this._placeModel();
      this.model.group.rotation.y = this.yaw;
      this.model.update(dt, true);
      this._updateLabels(player, eye);
      return;
    }

    // FLEE: below its HP threshold a creature runs away from the player instead
    // of fighting. fleeBelowHpPct comes from the def (small/passive critters flee
    // at 20%; many Tibia mobs flee 8–30%). A flying flee-er gets a height boost
    // below so it visibly takes off. Provoked passives also flee when scared.
    const fleePct = this.def.fleeBelowHpPct || 0;
    const scared = fleePct > 0 && (this.hp / this.maxHp) <= fleePct;
    if (scared && dist < 30) {
      this.fleeing = true;
      const sp = this.spd * (this.def.flying ? 1.3 : 1.1) * dt;   // panic is faster
      const nx = this.pos.x - (dx / dist) * sp;
      const nz = this.pos.z - (dz / dist) * sp;
      // don't flee into a city or off the map
      if (!(!this.dungeon && cityAt(nx, nz)) && this.world.heightAt(nx, nz) >= 0.4) {
        this.pos.x = nx; this.pos.z = nz;
      }
      this.yaw = Math.atan2(-dx, -dz);   // face away
      this._applyFlight(dt, true);
      this.pos.y = this.world.heightAt(this.pos.x, this.pos.z) + (this._flyY || 0);
      this._placeModel();
      this.model.group.rotation.y = this.yaw;
      this.model.update(dt, true);
      this._updateLabels(player, eye);
      return;
    }
    this.fleeing = false;

    let moving = false;
    let chasing = wantsPlayer && dist > engageRange;
    if (chasing) {
      // Would the next step cross into a city, or pull us past the leash radius?
      // If so, give up and head home (you can't drag a dragon into a town).
      const sp = this.spd * dt;
      const nx = this.pos.x + (dx / dist) * sp;
      const nz = this.pos.z + (dz / dist) * sp;
      // A TAUNTED creature ignores the leash radius (the knight forcibly holds it),
      // but it still can't be dragged into a city. Otherwise the normal leash
      // applies — too far from home and it gives up and walks back.
      const wouldLeash = this.taunted <= 0 && Math.hypot(nx - this.homeX, nz - this.homeZ) > LEASH_RADIUS;
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
      const sp = this.spd * 0.7 * dt;
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
            // Mounted shielding (the bear's +5) adds to the player's defense.
            const pdef = player.defense + (player.mountShielding || 0);
            dmg = Math.max(1, Math.round(dmg - pdef * 0.35));
            // The burst's own element drives the status it inflicts (a poison
            // cloud poisons even if the creature's base element differs).
            this.areaKind = a.kind;
            onPlayerHit(dmg, this);
            this.areaKind = null;
          }
        } else {
          let dmg = this.def.attack * (isNight ? 1.3 : 1);
          const pdef = player.defense + (player.mountShielding || 0);
          dmg = Math.max(1, Math.round(dmg - pdef * 0.35));
          // Ranged shows a flying projectile; melee/caster hit directly.
          if (ranged) this.combatHooks.spawnEnemyShot(this.pos, player.pos, dmg, this);
          else onPlayerHit(dmg, this);
        }
      }
    }

    // Flying foes hover; they SWOOP DOWN to ground level while attacking in range
    // and rise back up otherwise (and rise more when fleeing — handled above).
    const inAtkRange = ranged ? (dist <= engageRange) : (dist <= ATTACK_RANGE);
    this._applyFlight(dt, false, wantsPlayer && !inAtkRange);
    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z) + (this._flyY || 0);
    this._placeModel();
    this.model.group.rotation.y = this.yaw;
    this.model.update(dt, moving);
    this._updateLabels(player, eye);
  }

  // Smoothly ease the creature's flight height (this._flyY) toward a target. Only
  // affects flying defs; grounded foes keep _flyY at 0. `fleeing` lifts it high to
  // escape; `cruise` keeps it aloft while approaching; otherwise it swoops to 0 to
  // bite. So a dragon dives in, attacks, then climbs away — easy for archers,
  // hard for melee knights to corner.
  _applyFlight(dt, fleeing, cruise) {
    if (!this.def.flying) { this._flyY = 0; return; }
    const high = this.def.flyHeight || 3.2;
    const target = fleeing ? high * 1.4 : (cruise ? high : 0.2);
    const cur = this._flyY || 0;
    this._flyY = cur + (target - cur) * Math.min(1, dt * 3);
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
    // Line-of-sight (hides the nameplate/bar behind walls) is EXPENSIVE — it
    // walks the eye→creature segment sampling terrain height + solids. Recompute
    // it only every LOS_REFRESH seconds (cached in _inSight), staggered per
    // creature by a random phase so they don't all recompute on the same frame.
    if (eye) {
      if (this._losT === undefined) this._losT = this._losPhase || 0;   // initial stagger
      this._losT -= (this._dtForLos || 0.016);
      if (this._losT <= 0 || this._inSight === undefined) {
        this._losT = LOS_REFRESH;
        this.model.group.getWorldPosition(_losHead);
        this._inSight = hasLineOfSight(this.world, eye, _losHead.x, this.pos.y + this.nameTag.position.y, _losHead.z);
      }
    } else {
      this._inSight = true;
    }
    const inSight = this._inSight;
    this.nameTag.visible = inSight;
    const frac = this.hp / this.maxHp;
    this.bar.fill.scale.x = Math.max(0.001, frac);
    this.bar.fill.position.x = -(1 - frac) * 0.5;
    this.bar.group.visible = inSight && frac < 1;
    this.bar.group.lookAt(player.pos.x, this.bar.group.getWorldPosition(_barWorld).y, player.pos.z);
  }

  takeDamage(amount, attackerId = 'self') {
    if (this.dying) return false;
    this.hp -= amount;
    // Log who dealt how much, so a kill's XP can be split among everyone who
    // helped (party play). Single-player: only 'self' ever appears → gets it all.
    if (!this._dmgBy) this._dmgBy = {};
    this._dmgBy[attackerId] = (this._dmgBy[attackerId] || 0) + Math.max(0, amount);
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
    // Tear down the lair scenery built at spawn (open-world creatures only).
    // disposeLairDecor removes the group from the scene and drops child
    // references; it deliberately keeps the shared module-level geometries/
    // materials alive for the next lair (see creatureDecor.js disposal contract).
    if (this._lairDecor) { disposeLairDecor(this._lairDecor); this._lairDecor = null; }
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

function makeNameTag(text, aggressive, color, scale = 0.55) {
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
    this.currentTarget = null;     // the creature the crosshair is locked onto
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

      // CITY SAFE-RING SAFETY: EVERY city has a protected ring just outside its
      // walls — no strong creature may spawn there, so a fresh arrival (walked or
      // teleported in) isn't one-shot by a dragon on the doorstep, even where a
      // tough zone disc overlaps the town. The cap eases up to the zone's natural
      // level by the ring edge; outside the ring it's null = no limit, so the
      // strong creatures simply live FARTHER from town.
      const cap = capitalSafeLevelCap(x, z);
      if (cap != null) {
        const safe = list.filter((c) => (c.level || 1) <= cap);
        // Fall back to the gentlest creatures in the world if nothing in the
        // current pool is weak enough, so the ring is never empty.
        list = safe.length ? safe : CREATURES.filter((c) => !c.supreme && (c.level || 1) <= cap);
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
    // Thematic GROUND scenery around this lair (hydra eggs, scorch marks, bones,
    // poison pools, cobwebs, camp gear). Surface/zone spawns only: inside a cave
    // buildEntranceDecor already themes the floor, so skip it there to avoid
    // double decoration. Pure decoration — not added to any pickup/loot/collision.
    if (!this.dungeon) {
      const decor = buildCreatureLairDecor(def, x, z, this.world);
      if (decor) { this.scene.add(decor); c._lairDecor = decor; }
    }
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
    this._lastEventMult = eventMult;   // so a DOT kill awards xp/loot with the live event mult
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

    this._updateAllies(dt, player);
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

  // Loyal SUMMONS (druid pets). Unlike the old expiring orbs, these are real
  // little creatures that follow their owner, chase the foe the owner is fighting,
  // bite it, and stay alive until killed (the owner's death / disconnect tears
  // them down via clear()). Owner is the player object; targets come from
  // focusPetsOn() (the owner attacking a creature) or the nearest aggressor.
  _updateAllies(dt, player) {
    if (!this.allies || !this.allies.length) return;
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const a = this.allies[i];

      // Dying: play the topple/dissolve then remove (same feel as a creature).
      if (a.dying) {
        a.deathT += dt;
        const e = a.deathT / DEATH_DUR;
        a.model.update(dt, false, Math.min(1, e));
        a.model.group.scale.setScalar(a.baseScale * Math.max(0.01, 1 - e * e));
        if (e >= 1) { this._removeAlly(i); }
        continue;
      }

      // Pick a target: the owner's focus (what they're attacking) if it's alive
      // and not too far; else the nearest live creature within a leash of the pet.
      let tgt = a.focus && !a.focus.dead && !a.focus.dying ? a.focus : null;
      if (tgt && Math.hypot(tgt.pos.x - (player ? player.pos.x : a.pos.x), tgt.pos.z - (player ? player.pos.z : a.pos.z)) > 26) tgt = null;
      if (!tgt) {
        let best = null, bestD = 12;
        for (const c of this.creatures) {
          if (c.dead || c.dying) continue;
          const d = Math.hypot(c.pos.x - a.pos.x, c.pos.z - a.pos.z);
          if (d < bestD) { bestD = d; best = c; }
        }
        tgt = best;
      }
      a.focus = tgt;

      let moving = false;
      if (tgt) {
        // Charge the target; bite when in melee range on a cooldown.
        const dx = tgt.pos.x - a.pos.x, dz = tgt.pos.z - a.pos.z;
        const d = Math.max(1e-4, Math.hypot(dx, dz));
        if (d > 1.8) {
          const sp = a.speed * dt;
          a.pos.x += (dx / d) * sp; a.pos.z += (dz / d) * sp;
          a.yaw = Math.atan2(dx, dz);
          moving = true;
        } else {
          a.yaw = Math.atan2(dx, dz);
          a.hitTimer -= dt;
          if (a.hitTimer <= 0) {
            a.hitTimer = 0.9;
            if (a.model.attack) a.model.attack();
            const dmg = Math.max(1, Math.round(a.power - tgt.def.defense * 0.3));
            const killed = tgt.takeDamage(dmg);
            this.hooks.onCreatureHit(tgt, dmg, 1);
            if (killed) a.focus = null;
          }
        }
      } else if (player) {
        // No foe: heel to the owner, lagging a couple of metres behind.
        const dx = player.pos.x - a.pos.x, dz = player.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 2.6) {
          const sp = a.speed * 0.9 * dt;
          a.pos.x += (dx / d) * sp; a.pos.z += (dz / d) * sp;
          a.yaw = Math.atan2(dx, dz);
          moving = true;
        }
      }

      // A pet can be hurt: aggressive creatures in melee range chip its HP, so it
      // can actually die (and then the druid must resummon).
      a.dmgTimer -= dt;
      if (a.dmgTimer <= 0) {
        a.dmgTimer = 1;
        for (const c of this.creatures) {
          if (c.dead || c.dying || !(c.def.aggressive || c.provoked)) continue;
          if (Math.hypot(c.pos.x - a.pos.x, c.pos.z - a.pos.z) < 2.0) {
            a.hp -= Math.max(1, Math.round(c.def.attack * 0.6));
            a.flashT = 0.12;
          }
        }
        if (a.hp <= 0) { this._killAlly(a); continue; }
      }

      a.pos.y = this.world.heightAt(a.pos.x, a.pos.z);
      a.model.group.position.copy(a.pos);
      a.model.group.rotation.y = a.yaw;
      a.model.update(dt, moving);

      // Hit flash + health bar (only when hurt).
      if (a.flashT > 0) { a.flashT -= dt; for (const m of a._mats) m.emissive.setRGB(a.flashT > 0 ? 0.6 : 0, 0, 0); }
      const frac = a.hp / a.maxHp;
      a.bar.fill.scale.x = Math.max(0.001, frac);
      a.bar.fill.position.x = -(1 - frac) * 0.5;
      a.bar.group.visible = frac < 1;
      a.bar.group.lookAt(a.pos.x, a.bar.group.getWorldPosition(_losHead).y, (player ? player.pos.z : a.pos.z + 1));
    }
  }

  // Begin a pet's death animation (it stays in the list one beat to topple).
  _killAlly(a) {
    if (a.dying) return;
    a.dying = true; a.deathT = 0;
    a.bar.group.visible = false;
  }

  // Remove a pet from the scene + list by index.
  _removeAlly(i) {
    const a = this.allies[i];
    if (a.bar && a.bar.group && a.bar.group.parent) a.bar.group.parent.remove(a.bar.group);
    this.scene.remove(a.model.group);
    a.model.dispose();
    this.allies.splice(i, 1);
  }

  // Point every live pet at the creature the owner just attacked, so they pile
  // onto the same foe ("si el druida ataca a una criatura, su criatura va a
  // atacarla enseguida"). Called from main.js when the player lands an attack.
  focusPetsOn(creature) {
    if (!creature || creature.dead || creature.dying || !this.allies) return;
    for (const a of this.allies) if (!a.dying) a.focus = creature;
  }

  // How many live (non-dying) pets exist right now.
  petCount() {
    return this.allies ? this.allies.filter((a) => !a.dying).length : 0;
  }

  // Each frame: pick the creature the player is aiming at and glow it red, so the
  // player always knows who their next hit/shot lands on — including creatures
  // well above or below them. We score by how closely the camera ray points at
  // the creature's torso (a generous cone), not by an exact sphere hit, so a foe
  // up a slope or down in a pit still locks on. Ties break toward the nearer one.
  acquireTarget(player, camDir, rayOrigin) {
    const ranged = player.weapon && (player.weapon.type === 'bow' || player.weapon.type === 'wand');
    const reach = ranged ? (player.attackRange || 14) : 4.5;
    const ox = rayOrigin ? rayOrigin.x : player.pos.x;
    const oy = rayOrigin ? rayOrigin.y : player.pos.y + 1.4;
    const oz = rayOrigin ? rayOrigin.z : player.pos.z;
    const dlen = Math.hypot(camDir.x, camDir.y, camDir.z) || 1;
    const rx = camDir.x / dlen, ry = camDir.y / dlen, rz = camDir.z / dlen;

    // Precise: the crosshair locks onto a creature only when the camera ray
    // actually passes through its body capsule (feet→head), so a creature higher
    // up a slope, in a pit, or flying overhead is marked exactly when the cross
    // is on it — not merely "roughly ahead". Pick the NEAREST such creature.
    // A tiny tolerance beyond the radius gives gentle aim-assist without locking
    // things the cross clearly isn't on.
    let best = null, bestT = Infinity;
    for (const c of this.creatures) {
      if (c.dead || c.dying) continue;
      const pdx = c.pos.x - player.pos.x, pdz = c.pos.z - player.pos.z;
      if (Math.hypot(pdx, pdz) > reach) continue;          // horizontal reach only
      const b = creatureBody(c);
      const hit = rayVsVertSeg(ox, oy, oz, rx, ry, rz, b.bx, b.y0, b.y1, b.bz);
      if (hit.t <= 0) continue;                             // behind the camera
      const tol = b.r + 0.12;                               // small aim-assist pad
      if (hit.d2 > tol * tol) continue;                     // ray misses the body
      if (hit.t < bestT) { bestT = hit.t; best = c; }       // nearest along the ray
    }
    this.setTarget(best);
    return best;
  }

  // Swap the highlighted target, clearing the old glow and lighting the new.
  setTarget(c) {
    if (this.currentTarget === c) return;
    if (this.currentTarget && !this.currentTarget.dead) this.currentTarget.setTargeted(false);
    this.currentTarget = c || null;
    if (this.currentTarget) this.currentTarget.setTargeted(true);
  }

  // Find the creature the player is aiming at, within melee/aim range.
  attack(player, camDir, rayOrigin) {
    // Prefer the locked-on target (the red one) so you hit exactly what's marked,
    // as long as it's still alive and within reach. Falls back to a fresh raycast.
    const lockReach = (player.weapon && (player.weapon.type === 'bow' || player.weapon.type === 'wand'))
      ? (player.attackRange || 14) : 4.5;
    const locked = this.currentTarget;
    if (locked && !locked.dead && !locked.dying
        && Math.hypot(locked.pos.x - player.pos.x, locked.pos.z - player.pos.z) <= lockReach) {
      // The crosshair is RED on this creature: the promise to the player is that
      // the hit lands no matter what, so resolve it as GUARANTEED (skip the miss
      // roll). Damage is still scaled by the level gap — a far-higher mob just
      // takes less, it doesn't dodge.
      return this._resolveHit(player, locked, true);
    }
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

    // Hit exactly what the crosshair is on: test the camera ray against each
    // creature's body CAPSULE (feet→head) — the same geometry the red-cross lock
    // uses — and take the nearest one the ray actually passes through. Accurate
    // regardless of the creature's height relative to the player.
    let best = null, bestT = Infinity;
    for (const c of this.creatures) {
      if (c.dead || c.dying) continue;
      // Horizontal reach is measured from the player, not the camera.
      const pdx = c.pos.x - player.pos.x, pdz = c.pos.z - player.pos.z;
      if (Math.hypot(pdx, pdz) > reach) continue;
      const bd = creatureBody(c);
      const hit = rayVsVertSeg(ox, oy, oz, rx, ry, rz, bd.bx, bd.y0, bd.y1, bd.bz);
      if (hit.t <= 0) continue;               // behind the camera
      if (hit.d2 > bd.r * bd.r) continue;     // ray misses the body capsule
      if (hit.t < bestT) { bestT = hit.t; best = c; }
    }
    if (!best) return null;
    return this._resolveHit(player, best);
  }

  // Roll the hit/miss and damage against a chosen creature (shared by the locked
  // target path and the raycast fallback). When `guaranteed` (the crosshair was
  // RED on this creature), the miss roll is skipped entirely — the hit always
  // lands; only the level-gap DAMAGE penalty remains.
  _resolveHit(player, best, guaranteed = false) {
    const ranged = player.weapon && (player.weapon.type === 'bow' || player.weapon.type === 'wand');
    const reach = ranged ? (player.attackRange || 14) : 4;
    const w = player.weapon;
    const elem = w ? w.element : 'none';
    const mult = elementMultiplier(elem, best.def.element);

    // MISS by level gap (Tibia-style). A creature more than 10 levels above you
    // is uncatchable (always miss / 0 damage); up to +10 you miss with rising
    // odds, which your weapon SKILL (precision) mitigates. Distance attacks also
    // miss more the farther the target is. A GUARANTEED (red-cross) hit never
    // misses.
    const diff = (best.def.level || 1) - (player.level || 1);
    let missChance = 0;
    if (guaranteed) missChance = 0;
    else if (diff >= 11) missChance = 1;
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

    // Tibia damage shape: maxHit = K · skill · weaponAtk + level/LVL_DIV, rolled,
    // then armor is subtracted. player.damageMul folds in vocation + passive
    // skills. Constants tuned for the compressed weaponAtk<=53 scale (see plan):
    // a bow also adds its equipped quiver's flat arrowAtk to weaponAtk.
    const K = 0.055, LVL_DIV = 8, DEF_SUB = 0.25;
    let weaponAtk = (w ? w.atk : 7);
    if (w && w.type === 'bow') weaponAtk += (player.arrowAtk || 0);
    const maxHit = (K * skill * weaponAtk + (player.level || 1) / LVL_DIV) * (player.damageMul || 1);
    const rolled = maxHit * (0.5 + this.rng() * 0.5);  // 50-100% of max
    let dmg = Math.max(0, Math.round((rolled - best.def.defense * DEF_SUB) * mult));
    if (mult === 0) dmg = 0;
    // The level penalty normally lives in the MISS roll, but a guaranteed
    // (red-cross) hit never misses — so for it we carry the penalty over into a
    // DAMAGE scale instead, keeping the "daño normal, penalización por nivel"
    // balance the user asked for: an over-levelled mob still takes far less.
    if (guaranteed && diff > 0 && dmg > 0) {
      const pen = Math.max(0.1, 1 - Math.min(1, Math.pow(diff / 11, 1.5)) * 0.9);
      dmg = Math.max(1, Math.round(dmg * pen));
    }
    const killed = best.takeDamage(dmg);
    this.hooks.onCreatureHit(best, dmg, mult);
    return { creature: best, dmg, killed, mult };
  }

  // Summon a LOYAL PET: a real little creature that follows the druid, charges
  // the foe they're fighting and stays until killed. Capped at MAX_PETS; when
  // already full, the pet with the MOST remaining HP vanishes to make room for
  // the new one (so a fresh summon always sticks, replacing the sturdiest old
  // one — the user's rule). `opts.maxPets` overrides the cap. Returns the pet.
  spawnAlly(family, pos, level, opts = {}) {
    if (!this.allies) this.allies = [];
    const cap = opts.maxPets || MAX_PETS;
    // Enforce the cap on the LIVE (non-dying) pets: remove the highest-HP one.
    const live = this.allies.filter((a) => !a.dying);
    if (live.length >= cap) {
      let strongest = live[0];
      for (const a of live) if (a.hp > strongest.hp) strongest = a;
      this._removeAlly(this.allies.indexOf(strongest));
    }

    const scale = 0.8;
    const model = buildCreatureModel(family || 'imp', { color: 0x66ccaa, scale });
    const hp = Math.round(40 + level * 14);          // tougher with the druid's level
    const ally = {
      pos: (pos.clone ? pos.clone() : new THREE.Vector3(pos.x, pos.y, pos.z)),
      model, family,
      hp, maxHp: hp,
      power: Math.round(8 + level * 1.4),            // bite damage scales with level
      speed: 5.5,                                    // a touch faster than the druid so it can catch up
      yaw: 0, hitTimer: 0, dmgTimer: 1, flashT: 0,
      focus: null, dying: false, deathT: 0,
      baseScale: model.group.scale.x,
      _mats: [],
    };
    ally.pos.y = this.world.heightAt(ally.pos.x, ally.pos.z);
    model.group.position.copy(ally.pos);
    model.group.traverse((o) => { if (o.material && o.material.emissive) ally._mats.push(o.material); });
    // A green-tinted health bar so the player can read the pet's life.
    ally.bar = makeHealthBar();
    ally.bar.fill.material.color.setHex(0x4fd06a);
    ally.bar.group.position.y = 1.5 * scale + 0.4;
    model.group.add(ally.bar.group);
    this.scene.add(model.group);
    this.allies.push(ally);
    return ally;
  }

  // Apply skill damage to every creature within `radius` of a world point.
  // Returns how many were hit (for feedback). Used by area/ranged spells.
  // `inflict` (optional): { burn|poison|slow } — a Tibia-style status the spell
  // leaves behind (sorcerer fire burns; druid ice/poison slows + bleeds). The DOT
  // total scales with the hit so a strong nuke leaves a strong lingering effect.
  damageArea(center, radius, amount, inflict) {
    let hits = 0;
    const r2 = radius * radius;
    for (const c of this.creatures) {
      if (c.dead || c.dying) continue;
      const dx = c.pos.x - center.x, dz = c.pos.z - center.z;
      if (dx * dx + dz * dz > r2) continue;
      const dmg = Math.max(1, Math.round(amount - c.def.defense * 0.3));
      c.takeDamage(dmg);
      this.hooks.onCreatureHit(c, dmg, 1);
      if (inflict) this.applyStatus(c, inflict, dmg);
      hits++;
    }
    return hits;
  }

  // Apply a status effect to one creature, scaling the DOT pool to `baseDmg` (so
  // a stronger spell burns/poisons harder). Wires the creature's status-tick to
  // the float-number + kill-award flow once.
  applyStatus(c, kind, baseDmg) {
    if (!c || c.dead || c.dying || !c.status) return;
    if (!c._onStatusTick) c._onStatusTick = (cr, amt, k, killed) => this._onCreatureStatusTick(cr, amt, k, killed);
    if (kind === 'burn') {
      // Burn: ~2.5× the hit over ~5 ticks (no slow). Sorcerer's fire pressure.
      c.status.applyBurn(Math.max(6, Math.round(baseDmg * 2.5)), Math.max(2, Math.round(baseDmg * 0.5)));
    } else if (kind === 'poison') {
      // Poison: a long bleed (~3× the hit) that ticks while the fight lasts.
      c.status.applyPoison(Math.max(6, Math.round(baseDmg * 3)), Math.max(2, Math.round(baseDmg * 0.35)));
    } else if (kind === 'slow') {
      c.status.applySlow();
    } else if (kind === 'slowpoison') {
      // Druid signature: slow AND poison together.
      c.status.applySlow();
      c.status.applyPoison(Math.max(6, Math.round(baseDmg * 3)), Math.max(2, Math.round(baseDmg * 0.35)));
    }
  }

  // A creature took DOT damage this tick: float the number and, if the tick
  // killed it, run the normal kill flow (xp + loot) just like a direct hit.
  _onCreatureStatusTick(c, amt, kind, killed) {
    this.hooks.onCreatureHit(c, amt, 1, false, kind);
    if (killed && !c._rewarded) { c._rewarded = true; this.onKill(c, this._lastEventMult || { xp: 1, drop: 1 }); }
  }

  // TAUNT / Challenge (knight): every creature within `radius` is forced to aggro
  // the player — it provokes them and interrupts any leash-home, so a knight can
  // pull a pack off teammates and tank them. Returns how many were taunted.
  tauntArea(center, radius) {
    let n = 0;
    const r2 = radius * radius;
    for (const c of this.creatures) {
      if (c.dead || c.dying) continue;
      const dx = c.pos.x - center.x, dz = c.pos.z - center.z;
      if (dx * dx + dz * dz > r2) continue;
      c.provoked = true;
      c.returning = false;
      c.taunted = TAUNT_DURATION;     // a window where it ignores leash and sticks to you
      n++;
    }
    return n;
  }

  onKill(c, eventMult) {
    const xp = Math.round(c.def.exp * eventMult.xp);
    this.hooks.onKill(c, xp);
    const dropMult = eventMult.drop;
    const lang = getLang();
    for (const entry of c.def.loot) {
      if (entry.itemId === 'gold') {
        const amount = entry.min + Math.floor(this.rng() * (entry.max - entry.min + 1));
        if (amount > 0) {
          // Money DROPS on the ground as 3D coin stacks (highest denomination
          // first), instead of going straight to the wallet — pick it up by walking
          // over it, same as any item. Each tier is its own little stack.
          for (const part of coinsFromValue(amount)) {
            const def = getCoin(part.id);
            if (def) this._dropAt(c.pos, instanceFromCoin(def, part.count, lang));
          }
        }
        continue;
      }
      // Potions are handled by a dedicated roll below (1-3, size mix), so the
      // creature's authored potion entries are skipped here.
      if (entry.potion) continue;
      // LEGENDARY gear never drops — only the Game Master grants it. A
      // 'legendary-tier' base (or a rolled Legendary rarity) is dropped silently.
      if (isLegendaryDrop(entry.itemId)) continue;
      // Drop-chance cap, EQUIPMENT only: gear of level 25+ is capped at 3%, gear
      // under level 25 at 8% — so even cheap gear is a real find and strong gear
      // stays rare. Materials, trophies, coins and lights keep their full authored
      // chances (the steady grind economy: silk 50%, trophy 60%…).
      let chance = (entry.chance || 0) * dropMult;
      if (isGearDrop(entry.itemId)) {
        const cap = itemDropLevel(entry.itemId) >= DROP_CAP_LEVEL ? DROP_CAP_HI : DROP_CAP_LO;
        chance = Math.min(chance, cap);
      }
      chance = Math.min(1, chance);
      if (this.rng() < chance) {
        const item = resolveItem(entry.itemId, () => this.rng(), c.def.level, lang);
        // A weapon can randomly roll Legendary inside resolveItem — block that too.
        if (item && item.rarity !== RARITY.LEGENDARY) this._dropAt(c.pos, item);
      }
    }
    this._rollPotions(c);
  }

  // Drop 1-3 potions per kill, mixing a SMALL (one tier below) and a LARGE (at
  // the creature's level) potion, with a chance to give health, mana, or BOTH.
  // Strong foes lean toward more/larger potions. All self-contained here.
  _rollPotions(c) {
    const lang = getLang();
    const lv = c.def.level || 1;
    const strong = c.def.role === 'boss' || c.def.role === 'tank' || lv >= 25;
    // What rolls: 45% HP only, 25% mana only, 30% both. Strong foes always both.
    const r = this.rng();
    const giveHp = strong || r < 0.45 || r >= 0.70;
    const giveMana = strong || r >= 0.45;
    // How many of EACH kind: usually 1, sometimes 2, rarely 3 (more for bosses).
    const count = () => {
      const k = this.rng();
      if (strong) return k < 0.45 ? 1 : k < 0.85 ? 2 : 3;
      return k < 0.7 ? 1 : k < 0.95 ? 2 : 3;
    };
    const dropPotion = (id) => {
      const item = resolveItem(id, () => this.rng(), lv, lang);
      if (item) this._dropAt(c.pos, item);
    };
    // Pick a small (one tier down) and large (at level) id from the tier tables.
    if (giveHp) {
      const n = count();
      for (let i = 0; i < n; i++) dropPotion(potionTierId('hp', lv, i === 0));
    }
    if (giveMana) {
      const n = count();
      for (let i = 0; i < n; i++) dropPotion(potionTierId('mana', lv, i === 0));
    }
  }

  // Scatter a resolved item near the creature in a little burst.
  _dropAt(pos, item) {
    const a = this.rng() * Math.PI * 2;
    const s = 2 + this.rng() * 2;
    this.spawnDrop(pos, item, { vel: { x: Math.cos(a) * s, y: 3.5 + this.rng() * 2, z: Math.sin(a) * s } });
  }

  // Spawn a ground drop. opts.vel = {x,y,z} gives it an initial toss so it flies
  // in an arc and lands a bit away (used when the player drops an item forward,
  // so it doesn't land underfoot and get re-grabbed instantly). opts.pickupDelay
  // (seconds) blocks pickup until it settles.
  spawnDrop(pos, item, opts = {}) {
    const world = this.world;
    // The actual ITEM as a small 3D model on the ground (a sword, a potion, a coin
    // stack…), not a generic bag — so you see exactly what dropped. We wrap it so we
    // can scale it to a sensible ground size by category (tiny for rings/coins,
    // bigger for weapons/armor). Falls back to the loot bag only if the item has no
    // 3D form for some reason.
    let mesh;
    try {
      const itemMesh = buildItemMesh(item);
      if (itemMesh) {
        mesh = new THREE.Group();
        // Frame the item to a target ground HEIGHT by its category, then drop it so
        // it rests ON the ground (not half-buried / floating).
        const target = dropGroundSize(item);
        const box = new THREE.Box3().setFromObject(itemMesh);
        const size = new THREE.Vector3(); box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 0.3;
        const s = target / maxDim;
        itemMesh.scale.setScalar(s);
        // re-measure after scaling to sit it on the ground
        const box2 = new THREE.Box3().setFromObject(itemMesh);
        itemMesh.position.y -= box2.min.y;             // lowest point at y=0
        mesh.add(itemMesh);
        mesh.userData.itemModel = itemMesh;
      }
    } catch (_) { mesh = null; }
    if (!mesh) mesh = buildLootBagMesh(item.rarity || 'normal');
    const startY = world.heightAt(pos.x, pos.z) + 0.4;
    mesh.position.set(pos.x, startY, pos.z);
    this.scene.add(mesh);

    // MU-Online style ground loot: every drop sits on a soft glowing disc and
    // wears a floating name label, so you can spot it and read what it is, then
    // grab it just by walking over it. Rarer items glow brighter/coloured.
    const rarity = item.rarity || 'normal';
    const tierCol = rarity === 'legendary' ? 0xffd166 : rarity === 'elite' ? 0x7fe0ff
      : item.kind === 'material' ? 0xd8c69a : item.kind === 'trophy' ? 0xc8b89a
      : item.kind === 'potion' ? 0xff7a7a : 0xfff0c0;
    // Glow halo on the ground (a flat additive disc that gently pulses).
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 20),
      new THREE.MeshBasicMaterial({ color: tierCol, transparent: true, opacity: 0.5,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.rotation.x = -Math.PI / 2;
    // The item wrapper's base is at the wrapper origin (item lowest point = y 0),
    // so the halo sits right at the wrapper's foot, on the ground.
    halo.position.y = mesh.userData.itemModel ? 0.02 : -0.28;
    halo.renderOrder = 2;
    mesh.add(halo);
    mesh.userData.halo = halo;
    // Floating name label above the drop, coloured by tier. Stacked items (coins,
    // potions, fruit, materials…) show the COUNT and pluralise — e.g. "100 Bronze
    // Coins", "12 Mana Potions" — so you read the amount at a glance.
    const baseName = typeof item.name === 'string' ? item.name
      : (item.name && (item.name.es || item.name.en)) || '';
    const labelText = dropLabel(baseName, item.count || 1);
    const nameTag = makeNameTag(labelText, false, '#' + tierCol.toString(16).padStart(6, '0'), 0.42);
    nameTag.position.y = 0.85;
    mesh.add(nameTag);

    // Rare drops already carry an emissive point light from buildLootBagMesh;
    // grab it (if any) so the per-frame logic can keep it with the bag. Common
    // drops rely on the additive ground halo for their shine (no extra dynamic
    // light each — that would blow past the renderer's light budget in a big
    // fight), so the world never floods with point lights.
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
      // An item model's base is at the wrapper origin, so it rests almost ON the
      // ground (small clearance for the idle bob); the bag's pivot is centred, so
      // it needs the old 0.3 lift.
      _lift: mesh.userData.itemModel ? 0.06 : 0.3,
      spin(dt) {
        mesh.rotation.y += dt * 1.4;
        if (this.flying) {
          this.vel.y -= 16 * dt; // gravity
          mesh.position.x += this.vel.x * dt;
          mesh.position.y += this.vel.y * dt;
          mesh.position.z += this.vel.z * dt;
          const ground = world.heightAt(mesh.position.x, mesh.position.z) + this._lift;
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
        // Pulse the ground halo so the loot shimmers and is easy to spot.
        const halo = mesh.userData.halo;
        if (halo) {
          const k = 0.4 + Math.sin(performance.now() * 0.004 + this.phase) * 0.18;
          halo.material.opacity = k;
          halo.rotation.z += dt * 0.6; // counter-spin a touch for a twinkle
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
    let veto = null;
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      if (d.pickupAt && now < d.pickupAt) continue;
      if (Math.hypot(d.pos.x - player.pos.x, d.pos.z - player.pos.z) >= 1.5) continue;
      const reason = canAccept ? canAccept(d.item) : 'ok';
      // Can't take THIS one (full/too heavy): remember the reason but keep
      // scanning, so a pickable item under an un-acceptable one isn't blocked.
      if (reason !== 'ok') { if (!veto) veto = { item: null, reason, pos: d.pos }; continue; }
      this.scene.remove(d.mesh);
      disposeMesh(d.mesh);
      this.drops.splice(i, 1);
      return { item: d.item, reason: 'ok' };
    }
    return veto;
  }

  clear() {
    this.currentTarget = null;   // drop the lock; creatures are about to vanish
    for (const c of this.creatures) c.dispose();
    this.creatures = [];
    for (const d of this.drops) { this.scene.remove(d.mesh); disposeMesh(d.mesh); }
    this.drops = [];
    // Also tear down in-flight enemy projectiles, area rings and summoned allies
    // so a zone transition (descend/ascend/teleport) can't deal "phantom" damage
    // in the new context or leak their meshes into the scene.
    if (this._enemyShots) {
      for (const s of this._enemyShots) { this.scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }
      this._enemyShots = [];
    }
    if (this._fxRings) {
      for (const r of this._fxRings) { this.scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }
      this._fxRings = [];
    }
    if (this.allies) {
      for (const a of this.allies) {
        this.scene.remove(a.model.group);
        a.model.dispose();
        if (a.bar && a.bar.fill) { a.bar.fill.material.dispose(); a.bar.fill.geometry.dispose(); }
      }
      this.allies = [];
    }
  }
}

// Free a mesh's geometry/material plus those of any child meshes (e.g. the
// rarity outline added to a ground drop) so picking items up doesn't leak.
function disposeMesh(mesh) {
  mesh.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (o.material.map) o.material.map.dispose();   // sprite/canvas labels
      o.material.dispose();
    }
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
