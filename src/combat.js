import * as THREE from 'three';
import { buildCreatureModel } from './creatureModels.js';
import { creaturesForLevel } from './data/creatures.js';
import { elementMultiplier } from './data/items.js';
import { resolveItem } from './inventory.js';
import { getLang } from './i18n.js';

const MAX_ALIVE = 22;
const SPAWN_RADIUS = 42;
const DESPAWN_RADIUS = 70;
const ATTACK_RANGE = 2.4;
const ATTACK_COOLDOWN = 0.7;
const WANDER_RADIUS = 12;   // how far a creature roams from its spawn point
const WANDER_SPEED = 0.55;  // roam pace as a fraction of the creature's chase speed

function biomeAt(world, x, z) {
  const h = world.heightAt(x, z);
  if (h < 1.1) return 'beach';
  if (h > 19) return 'mountain';
  const forest = world.noise.fbm(x * 0.006 + 431, z * 0.006 - 87, 2);
  return forest > 0.55 ? 'forest' : 'grass';
}

class Creature {
  constructor(def, world, scene) {
    this.def = def;
    this.world = world;
    this.scene = scene;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.dead = false;
    this.attackTimer = 0;
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.model = buildCreatureModel(def.family, { color: def.color, scale: def.variantScale });
    scene.add(this.model.group);

    this.bar = makeHealthBar();
    this.model.group.add(this.bar.group);
    this.bar.group.position.y = 1.5 * def.variantScale + 0.4;

    // Floating name above the head: red for aggressive creatures, white otherwise.
    this.nameTag = makeNameTag(def.name, def.aggressive);
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

  update(dt, player, onPlayerHit, isNight) {
    if (this.flashT > 0) {
      this.flashT -= dt;
      const k = Math.max(0, this.flashT / 0.12);
      for (const m of this._mats) m.emissive.setRGB(k, k, k);
    }
    if (this.dying) {
      this.nameTag.visible = false;
      this.deathT += dt;
      const e = this.deathT / 0.35;
      const s = this.baseScale * Math.max(0.01, 1 - e);
      this.model.group.scale.setScalar(s);
      this.model.group.rotation.z += dt * 6;
      if (e >= 1) this.dead = true;
      return;
    }
    if (this.dead) return;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);

    let moving = false;
    const chasing = this.def.aggressive && dist < this.def.aggroRange;
    if (chasing && dist > ATTACK_RANGE) {
      // Aggressive and the player is in range: home in on them.
      const sp = this.def.speed * dt;
      this.pos.x += (dx / dist) * sp;
      this.pos.z += (dz / dist) * sp;
      this.yaw = Math.atan2(dx, dz);
      moving = true;
    } else if (!chasing) {
      // Otherwise roam the patrol area so every creature is always in motion.
      moving = this._wander(dt);
    }

    if (dist <= ATTACK_RANGE) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackTimer = ATTACK_COOLDOWN;
        let dmg = this.def.attack * (isNight ? 1.3 : 1);
        dmg = Math.max(1, Math.round(dmg - player.defense * 0.5));
        onPlayerHit(dmg, this);
      }
    }

    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);
    this.model.group.position.copy(this.pos);
    this.model.group.rotation.y = this.yaw;
    this.model.update(dt, moving);

    const frac = this.hp / this.maxHp;
    this.bar.fill.scale.x = Math.max(0.001, frac);
    this.bar.fill.position.x = -(1 - frac) * 0.5;
    this.bar.group.visible = frac < 1;
    this.bar.group.lookAt(player.pos.x, this.bar.group.getWorldPosition(new THREE.Vector3()).y, player.pos.z);
  }

  takeDamage(amount) {
    if (this.dying) return false;
    this.hp -= amount;
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
function makeNameTag(text, aggressive) {
  const pad = 12, fontPx = 44;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `bold ${fontPx}px system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = fontPx + pad * 2;
  c.width = w; c.height = h;
  // Re-set font after resizing the canvas (resizing clears the context state).
  ctx.font = `bold ${fontPx}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, w / 2, h / 2);
  ctx.fillStyle = aggressive ? '#ff5a4d' : '#ffffff';
  ctx.fillText(text, w / 2, h / 2);

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
  setDungeon(dungeon) {
    this.dungeon = dungeon || null;
  }

  spawnNear(player) {
    let x, z, h;
    let tries = 6;
    do {
      const angle = this.rng() * Math.PI * 2;
      const r = SPAWN_RADIUS * (0.4 + this.rng() * 0.6);
      x = player.pos.x + Math.cos(angle) * r;
      z = player.pos.z + Math.sin(angle) * r;
      h = this.world.heightAt(x, z);
    } while (h < 0.6 && --tries > 0);
    if (h < 0.6) return;

    let list;
    if (this.dungeon && this.dungeon.creatureFamilies) {
      const fams = this.dungeon.creatureFamilies;
      list = creaturesForLevel(player.level).filter((c) => fams.includes(c.family));
      if (!list.length) list = creaturesForLevel(player.level);
    } else {
      const biome = biomeAt(this.world, x, z);
      const pool = creaturesForLevel(player.level).filter(
        (c) => c.spawnBiome === biome || c.spawnBiome === 'anywhere');
      list = pool.length ? pool : creaturesForLevel(player.level);
    }
    if (!list.length) return;
    const def = list[Math.floor(this.rng() * list.length)];
    const c = new Creature(def, this.world, this.scene);
    c.placeAt(x, z);
    this.creatures.push(c);
  }

  update(dt, player, isNight, eventMult) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.creatures.length < MAX_ALIVE) {
      this.spawnTimer = 1.4;
      this.spawnNear(player);
    }

    for (const c of this.creatures) {
      c.update(dt, player, (dmg, src) => this.hooks.onPlayerHit(dmg, src), isNight);
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
    for (const d of this.drops) d.spin(dt);
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
    const atk = (w ? w.atk : 5) * (player.damageMul || 1);
    const elem = w ? w.element : 'none';
    const mult = elementMultiplier(elem, best.def.element);
    let dmg = Math.max(0, Math.round((atk - best.def.defense * 0.3) * mult));
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
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshLambertMaterial({ color: item.color || 0xd9b34a }));
    const startY = world.heightAt(pos.x, pos.z) + 0.4;
    mesh.position.set(pos.x, startY, pos.z);
    this.scene.add(mesh);

    // Rare drops get a colored glow so kids spot treasure from afar.
    let glow = null;
    if (item.rarity === 'legendary' || item.rarity === 'elite') {
      glow = new THREE.PointLight(item.rarity === 'legendary' ? 0xffd166 : 0x5dade2, 8, 4);
      mesh.add(glow);
    }

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

  // Collect any drop within pickup range; returns the item or null. Drops still
  // in their toss/grace window are skipped so a freshly dropped item doesn't get
  // re-grabbed the instant it leaves your hand.
  tryPickup(player) {
    const now = performance.now();
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      if (d.pickupAt && now < d.pickupAt) continue;
      if (Math.hypot(d.pos.x - player.pos.x, d.pos.z - player.pos.z) < 1.5) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        d.mesh.material.dispose();
        this.drops.splice(i, 1);
        return d.item;
      }
    }
    return null;
  }

  clear() {
    for (const c of this.creatures) c.dispose();
    this.creatures = [];
    for (const d of this.drops) { this.scene.remove(d.mesh); }
    this.drops = [];
  }
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
