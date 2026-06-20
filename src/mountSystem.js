import * as THREE from 'three';
import { buildCreatureModel } from './creatureModels.js';
import { getMount, MOUNT_SPEED_MUL, MOUNT_JUMP_MUL } from './data/mounts.js';

// Seat height = a fraction of the mount's measured bounding-box top, so a rider
// straddles the beast's back regardless of its scale/design. Quadrupeds seat low
// (back is ~0.6 of total height incl. ears/horns); winged beasts seat higher.
const _box = new THREE.Box3();
export function seatFromBox(group, frac = 0.6) {
  _box.setFromObject(group);
  const top = _box.max.y;
  if (!isFinite(top) || top <= 0) return 0.9;
  return top * frac;
}

// MountSystem — owns the player's set of mounts (owned ids + which is active)
// and the visible 3D beast the player rides. The mount model is a reused
// creature model (buildCreatureModel) so the art matches the bestiary; the
// player's own character group is lifted onto the saddle each frame.
//
// While mounted, player.mountBonus is set so player.js multiplies speed and jump
// by 1.3 (MOUNT_SPEED_MUL / MOUNT_JUMP_MUL). Dismounting clears it.
export class MountSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.owned = new Set();       // mount ids the player has unlocked
    this.activeId = null;         // the selected mount (ridden when `riding`)
    this.riding = false;          // currently mounted?
    this.model = null;            // { group, update, dispose } from buildCreatureModel
    this.mountDef = null;         // the data/mounts.js entry of the active mount
    this._shadow = null;
  }

  // ---- ownership -----------------------------------------------------------
  has(id) { return this.owned.has(id); }
  ownedList() { return [...this.owned]; }

  // Grant a mount (shop purchase or quest reward). Returns false if already owned.
  unlock(id) {
    if (!getMount(id) || this.owned.has(id)) return false;
    this.owned.add(id);
    // Auto-select the first mount you ever get, for convenience.
    if (!this.activeId) this.activeId = id;
    return true;
  }

  // ---- selection / mounting ------------------------------------------------
  // Pick which owned mount is the "active" one (does not mount it).
  select(id) {
    if (!this.owned.has(id)) return false;
    const wasRiding = this.riding;
    if (this.riding) this.dismount();
    this.activeId = id;
    if (wasRiding) this.mount();   // hot-swap the beast under the rider
    return true;
  }

  isMounted() { return this.riding; }

  // Toggle on the hotkey (G). Mounts the active mount, or dismounts if already up.
  toggle() {
    if (this.riding) { this.dismount(); return false; }
    return this.mount();
  }

  mount(id) {
    if (id) this.select(id);
    if (this.riding) return true;
    const def = getMount(this.activeId);
    if (!def || !this.owned.has(this.activeId)) return false;

    this.mountDef = def;
    this.model = buildCreatureModel(def.family, { color: def.color, scale: def.scale, design: def.design });
    this.scene.add(this.model.group);
    // Where the rider sits: measure the beast's height and seat them on its back
    // (seatFrac of the bbox top), so the lift auto-adapts to scale/design. A
    // per-mount riderY (absolute world units) overrides this when set. The mount
    // group is itself lifted by footOffset (so its feet rest on the ground), so
    // the rider's lift must include that same offset to stay on the saddle.
    const foot = this.model.footOffset || 0;
    const seatY = (def.riderY != null ? def.riderY : seatFromBox(this.model.group, def.seatFrac)) + foot;

    // A soft contact shadow under the beast (bigger than the player's).
    this._shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.7 * def.scale, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }),
    );
    this._shadow.rotation.x = -Math.PI / 2;
    this.scene.add(this._shadow);

    this.riding = true;
    // Apply THIS mount's own bonus block (each mount differs). Fall back to the
    // universal multipliers if a mount somehow lacks a bonus.
    const b = def.bonus || {};
    this.player.mounted = true;                        // drives the seated pose
    this.player.mountBonus = b.speed != null ? b.speed : (MOUNT_SPEED_MUL - 1);
    this.player.mountJumpMul = 1 + (b.jump != null ? b.jump : (MOUNT_JUMP_MUL - 1));
    this.player.mountShielding = b.shielding || 0;     // bear: flat shielding while ridden
    this.player.mountHpRegen = b.hpRegen || null;      // scorpion: +N hp every M s
    this.player.mountManaRegen = b.manaRegen || null;  // stag: +N mana every M s
    this.player.mountRiderY = seatY;                   // how high the rider sits
    return true;
  }

  dismount() {
    if (!this.riding) return;
    if (this.model) {
      this.scene.remove(this.model.group);
      this.model.dispose && this.model.dispose();
      this.model = null;
    }
    if (this._shadow) {
      this.scene.remove(this._shadow);
      this._shadow.geometry.dispose();
      this._shadow.material.dispose();
      this._shadow = null;
    }
    this.mountDef = null;
    this.riding = false;
    this.player.mounted = false;
    this.player.mountBonus = 0;
    this.player.mountJumpMul = 1;
    this.player.mountShielding = 0;
    this.player.mountHpRegen = null;
    this.player.mountManaRegen = null;
    this.player.mountRiderY = 0;
  }

  // ---- per-frame -----------------------------------------------------------
  // Place + animate the mount under the player. Called every frame after the
  // player has been updated (so player.pos / player.yaw are current).
  update(dt) {
    if (!this.riding || !this.model) return;
    const p = this.player;
    const g = this.model.group;
    // Lift the mount by its footOffset so its feet rest on the ground (same clamp
    // the combat creatures use). The rider seat (player.mountRiderY) already
    // includes this offset (set in mount()).
    g.position.set(p.pos.x, p.pos.y + (this.model.footOffset || 0), p.pos.z);
    // Face the same way the player faces (player char is yawed by +PI to face
    // forward; the mount model's head is at +Z, so match that convention).
    g.rotation.y = p.yaw + Math.PI;

    // Walk animation when the player is actually moving horizontally.
    const moving = Math.hypot(p.vel.x, p.vel.z) > 0.4;
    this.model.update(dt, moving);

    // Ride along with the beast: player.update already placed the rider at
    // pos + mountRiderY this frame; add the mount's live body bob/lunge (world
    // units, from model.bob) so the hero rises and rocks WITH the mount instead
    // of floating statically. A gentle yaw sway sells the gait too.
    const bob = this.model.bob;
    if (bob && p.char && p.char.group) {
      p.char.group.position.y += bob.y;
      // bob.z is forward along the mount's facing; rotate it into world XZ by yaw.
      const fz = -Math.cos(p.yaw), fx = -Math.sin(p.yaw);
      p.char.group.position.x += fx * bob.z;
      p.char.group.position.z += fz * bob.z;
    }

    // Contact shadow follows the ground beneath the player.
    if (this._shadow) {
      const ground = p.world ? p.world.heightAt(p.pos.x, p.pos.z) : p.pos.y;
      this._shadow.position.set(p.pos.x, ground + 0.05, p.pos.z);
    }
  }

  // ---- persistence ---------------------------------------------------------
  serialize() {
    return { owned: [...this.owned], active: this.activeId };
  }

  load(data) {
    if (!data) return;
    this.owned = new Set(Array.isArray(data.owned) ? data.owned.filter((id) => getMount(id)) : []);
    this.activeId = (data.active && this.owned.has(data.active)) ? data.active
      : (this.owned.size ? [...this.owned][0] : null);
    // Never resume mounted — start dismounted on load.
    if (this.riding) this.dismount();
  }
}
