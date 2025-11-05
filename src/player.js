import * as THREE from 'three';
import { buildCharacter } from './character.js';
import { WATER_LEVEL } from './world.js';

const GRAVITY = 26;
const JUMP_V = 8.6;
const WALK = 4.6;
const SPRINT = 7.6;
const MAX_STEP = 1.05; // tallest step you can walk up
const WORLD_LIMIT = 1600; // keeps the player inside the playable map

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
    this.char.group.position.copy(this.pos);
    this.shadow.position.set(x, this.pos.y + 0.05, z);
  }

  // Rebuild the visible model when sex/hair changes in the creation screen.
  rebuildCharacter(profile) {
    const scene = this.char.group.parent;
    if (scene) scene.remove(this.char.group);
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
    return this.pos.y + 0.4 < WATER_LEVEL;
  }

  update(dt, controls) {
    const inWater = this.inWater;
    const boost = 1 + (this.speedBonus || 0);
    const speed = (controls.sprint ? SPRINT : WALK) * boost * (inWater ? 0.45 : 1);

    // movement direction relative to the camera
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    let dx = fx * controls.move.z + (-fz) * controls.move.x;
    let dz = fz * controls.move.z + fx * controls.move.x;
    const len = Math.hypot(dx, dz);
    if (len > 1) { dx /= len; dz /= len; }
    this.vel.x = dx * speed;
    this.vel.z = dz * speed;

    // jump / swim
    if (controls.consumeJump() && this.grounded && !inWater) this.vel.y = JUMP_V;
    if (inWater) {
      this.vel.y -= 7 * dt;
      this.vel.y = Math.max(this.vel.y, -2.6);
      if (controls.jumpHeld) this.vel.y = 2.8;
    } else {
      this.vel.y -= GRAVITY * dt;
    }

    // horizontal movement with wall blocking, per-axis so we slide along walls
    let nx = this.pos.x + this.vel.x * dt;
    let nz = this.pos.z + this.vel.z * dt;
    if (this.world.heightAt(nx, this.pos.z) - this.pos.y > MAX_STEP) { nx = this.pos.x; this.vel.x = 0; }
    if (this.world.heightAt(nx, nz) - this.pos.y > MAX_STEP) { nz = this.pos.z; this.vel.z = 0; }
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
    this.char.animate(this.walkPhase, hSpeed / WALK, this.grounded || inWater);
    this.char.updateAttack(dt);
    this.char.group.position.copy(this.pos);
    this.char.group.rotation.y = this.yaw + Math.PI;

    // contact shadow
    const k = Math.max(0, 1 - (this.pos.y - ground) * 0.12);
    this.shadow.position.set(this.pos.x, ground + 0.05, this.pos.z);
    this.shadow.scale.setScalar(0.55 + 0.45 * k);
    this.shadow.material.opacity = 0.05 + 0.22 * k;
  }
}
