import * as THREE from 'three';
import { buildCreatureModel } from './creatureModels.js';
import { creaturesForLevel } from './data/creatures.js';
import { elementMultiplier } from './data/items.js';
import { resolveItem } from './inventory.js';

const MAX_ALIVE = 22;
const SPAWN_RADIUS = 42;
const DESPAWN_RADIUS = 70;
const ATTACK_RANGE = 2.4;
const ATTACK_COOLDOWN = 0.7;

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
  }

  placeAt(x, z) {
    this.pos.set(x, this.world.heightAt(x, z), z);
    this.model.group.position.copy(this.pos);
  }

  update(dt, player, onPlayerHit, isNight) {
    if (this.dead) return;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);

    let moving = false;
    if (this.def.aggressive && dist < this.def.aggroRange && dist > ATTACK_RANGE) {
      const sp = this.def.speed * dt;
      this.pos.x += (dx / dist) * sp;
      this.pos.z += (dz / dist) * sp;
      this.yaw = Math.atan2(dx, dz);
      moving = true;
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
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    return this.dead;
  }

  dispose() {
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
      const dist = Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z);
      if (c.dead || dist > DESPAWN_RADIUS) {
        if (c.dead) this.onKill(c, eventMult);
        c.dispose();
        this.creatures.splice(i, 1);
      }
    }

    for (const d of this.drops) d.spin(dt);
  }

  // Find the creature the player is aiming at, within melee/aim range.
  attack(player, camDir) {
    let best = null, bestScore = -1;
    for (const c of this.creatures) {
      if (c.dead) continue;
      const dx = c.pos.x - player.pos.x;
      const dz = c.pos.z - player.pos.z;
      const dist = Math.hypot(dx, dz);
      const reach = player.weapon && player.weapon.type === 'bow' ? 18 : 4;
      if (dist > reach) continue;
      const dot = (dx * camDir.x + dz * camDir.z) / (dist || 1);
      if (dot < 0.4) continue;
      const score = dot - dist * 0.02;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (!best) return null;

    const w = player.weapon;
    const atk = w ? w.atk : 5;
    const elem = w ? w.element : 'none';
    const mult = elementMultiplier(elem, best.def.element);
    let dmg = Math.max(0, Math.round((atk - best.def.defense * 0.3) * mult));
    if (mult === 0) dmg = 0;
    const killed = best.takeDamage(dmg);
    this.hooks.onCreatureHit(best, dmg, mult);
    return { creature: best, dmg, killed, mult };
  }

  onKill(c, eventMult) {
    const xp = Math.round(c.def.exp * eventMult.xp);
    this.hooks.onKill(c, xp);
    const dropMult = eventMult.drop;
    for (const entry of c.def.loot) {
      if (entry.itemId === 'gold') {
        const amount = entry.min + Math.floor(this.rng() * (entry.max - entry.min + 1));
        if (amount > 0) this.hooks.onLoot({ gold: amount });
        continue;
      }
      const chance = Math.min(1, (entry.chance || 0) * dropMult);
      if (this.rng() < chance) {
        const item = resolveItem(entry.itemId, () => this.rng(), c.def.level);
        if (item) this.spawnDrop(c.pos, item);
      }
    }
  }

  spawnDrop(pos, item) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshLambertMaterial({ color: item.color || 0xd9b34a }));
    mesh.position.set(pos.x, this.world.heightAt(pos.x, pos.z) + 0.4, pos.z);
    this.scene.add(mesh);
    const drop = {
      item, mesh, pos: mesh.position,
      spin(dt) { mesh.rotation.y += dt * 1.6; mesh.position.y = this.baseY + Math.sin(performance.now() * 0.003) * 0.1; },
      baseY: mesh.position.y,
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

  // Collect any drop within pickup range; returns the item or null.
  tryPickup(player) {
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
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
