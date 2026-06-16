import * as THREE from 'three';
import { buildCharacter } from './character.js';
import { WATER_LEVEL, WORLD_BOUND } from './world.js';

const GRAVITY = 26;
const JUMP_V = 8.6;
const WALK = 4.6;
const SPRINT = 7.6;
const MAX_STEP = 1.05;    // tallest step you can walk up
const WORLD_LIMIT = WORLD_BOUND; // hard square clamp just past the ocean edge
const PLAYER_RADIUS = 0.35;       // body width used for solid collisions
const MAX_WADE_DEPTH = 1.0;       // can't walk more than 1 m below the waterline

export const EYE_HEIGHT = 1.5;

export class Player {
  constructor(scene, world, profile) {
    this.world = world;
    this.char = buildCharacter(profile);
    scene.add(this.char.group);

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.grounded = false;
    this.walkPhase = 0;

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    scene.add(this.shadow);
  }

  spawnAt(x, z) {
    this.pos.set(x, this.world.heightAt(x, z) + 0.2, z);
    this.vel.set(0, 0, 0);
    this.grounded = false; // re-evaluated on the next update; never carry a stale value
    this.char.group.position.copy(this.pos);
    this.shadow.position.set(x, this.pos.y + 0.05, z);
  }

  // Rebuild the visible model when sex/hair changes in the creation screen.
  rebuildCharacter(profile) {
    const scene = this.char.group.parent;
    const old = this.char.group;
    if (scene) scene.remove(old);
    old.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.char = buildCharacter(profile);
    this.char.group.position.copy(this.pos);
    this.char.group.rotation.y = this.yaw + Math.PI;
    if (scene) scene.add(this.char.group);
  }

  applyLook(dx, dy) {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy, -1.45, 1.45);
  }

  get inWater() {
    // Only the SURFACE world has water. House interiors and caves are built far
    // below y=0, so the old absolute "pos.y < WATER_LEVEL" wrongly read them as
    // underwater — which let holding Space "swim up" forever (the infinite-jump
    // bug indoors). Gate on the current world actually having water.
    if (!this.world || !this.world.hasWater) return false;
    return this.pos.y + 0.4 < WATER_LEVEL;
  }

  // Whether the player can't stand at (x, z): a wall too tall to step up, a
  // tree/rock footprint, or water deeper than the wade limit. Walking parallel
  // to (or out of) deep water is still allowed — only going deeper is blocked.
  _blocked(x, z) {
    const ground = this.world.heightAt(x, z);
    if (ground - this.pos.y > MAX_STEP) return true;
    if (this.world.solidAt(x, z, PLAYER_RADIUS)) return true;
    if (ground < WATER_LEVEL - MAX_WADE_DEPTH) {
      const here = this.world.heightAt(this.pos.x, this.pos.z);
      if (ground < here) return true; // refuse to wade deeper, allow coming back out
    }
    return false;
  }

  update(dt, controls) {
    const inWater = this.inWater;
    // The Game Master always moves 5x an ordinary hero. This wins over the
    // boots' speedBonus (which recompute() rewrites whenever the inventory
    // changes), so GM speed never gets clobbered by an equip change.
    // A mount adds a flat +30% (mountBonus = 0.3) on top of the boots' speedBonus.
    const boost = this.gm ? 5 : 1 + (this.speedBonus || 0) + (this.mountBonus || 0);
    // An ice/frost status slows movement (slowFactor < 1); GM ignores it.
    const slow = this.gm ? 1 : (this.slowFactor != null ? this.slowFactor : 1);
    const speed = (controls.sprint ? SPRINT : WALK) * boost * (inWater ? 0.45 : 1) * slow;

    // movement direction relative to the camera
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    let dx = fx * controls.move.z + (-fz) * controls.move.x;
    let dz = fz * controls.move.z + fx * controls.move.x;
    const len = Math.hypot(dx, dz);
    if (len > 1) { dx /= len; dz /= len; }
    this.vel.x = dx * speed;
    this.vel.z = dz * speed;

    // jump / swim — a mount gives +30% jump height (mountJumpMul = 1.3).
    if (controls.consumeJump() && this.grounded && !inWater) this.vel.y = JUMP_V * (this.mountJumpMul || 1);
    if (inWater) {
      this.vel.y -= 7 * dt;
      this.vel.y = Math.max(this.vel.y, -2.6);
      if (controls.jumpHeld) this.vel.y = 2.8;
    } else {
      this.vel.y -= GRAVITY * dt;
    }

    // horizontal movement, resolved per-axis so we slide along whatever blocks us:
    // tall steps (walls), tree/rock footprints, and water deeper than the wade limit.
    let nx = this.pos.x + this.vel.x * dt;
    let nz = this.pos.z + this.vel.z * dt;
    // If the player's CURRENT cell already counts as blocked (e.g. teleported
    // onto a tree/rock footprint, or shoved into a solid), don't block moves out
    // of it — otherwise every candidate is blocked too and they freeze forever.
    // Only veto moves when we're starting from a clear cell. (Tradeoff: while
    // stuck, movement is uncollided, so a very thin wall could be walked through
    // — acceptable, since being able to escape always beats a permanent freeze.)
    const stuck = this._blocked(this.pos.x, this.pos.z);
    if (!stuck && this._blocked(nx, this.pos.z)) { nx = this.pos.x; this.vel.x = 0; }
    if (!stuck && this._blocked(nx, nz)) { nz = this.pos.z; this.vel.z = 0; }
    this.pos.x = THREE.MathUtils.clamp(nx, -WORLD_LIMIT, WORLD_LIMIT);
    this.pos.z = THREE.MathUtils.clamp(nz, -WORLD_LIMIT, WORLD_LIMIT);

    // vertical + ground
    this.pos.y += this.vel.y * dt;
    const ground = this.world.heightAt(this.pos.x, this.pos.z);
    if (this.pos.y <= ground) {
      this.pos.y = ground;
      this.vel.y = Math.max(this.vel.y, 0);
      this.grounded = true;
    } else {
      this.grounded = this.pos.y - ground < 0.08;
    }

    // model animation and placement
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    this.walkPhase += hSpeed * dt * 2.3;
    // Mounted: the hero sits on the saddle (static straddle, no gait). `mounted`
    // is set by the MountSystem on mount()/dismount().
    if (this.char.setSeated) this.char.setSeated(!!this.mounted);
    this.char.animate(this.walkPhase, hSpeed / WALK, this.grounded || inWater, dt);
    this.char.updateAttack(dt);
    this.char.group.position.copy(this.pos);
    // When mounted, lift the rider up onto the saddle (mountRiderY set by MountSystem).
    this.char.group.position.y += (this.mountRiderY || 0);
    this.char.group.rotation.y = this.yaw + Math.PI;

    // contact shadow
    const k = Math.max(0, 1 - (this.pos.y - ground) * 0.12);
    this.shadow.position.set(this.pos.x, ground + 0.05, this.pos.z);
    this.shadow.scale.setScalar(0.55 + 0.45 * k);
    this.shadow.material.opacity = 0.05 + 0.22 * k;
  }
}
