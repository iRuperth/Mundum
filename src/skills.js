import * as THREE from 'three';
import { skillPower } from './data/professions.js';

// Runtime skill system. Owns the VISUAL effects of cast skills (expanding area
// rings, moving projectile bolts, heal sparkles, summon poofs) and triggers the
// gameplay outcome through ctx callbacks at the right moment. It never touches
// creature hp directly; combat does, via ctx.
//
// Effects are lightweight emissive meshes. Geometry/material are shared across
// effects of the same kind and disposed once on system disposal, never per cast,
// so casting in a loop allocates nothing but a small effect record.

const MAX_EFFECTS = 24;        // hard cap on concurrent visual effects
const RING_LIFE = 0.45;        // seconds an area/heal ring expands and fades
const BOLT_SPEED = 28;         // projectile travel speed (m/s)
const SUMMON_POOF_LIFE = 0.5;  // seconds a summon poof lives

// Per-skill tint, falling back to a neutral magic blue.
const KIND_COLOR = {
  area: 0xff7a3a,
  melee: 0xffd27a,
  ranged: 0xbfe9ff,
  heal: 0x5ce08a,
  summon: 0xb98aff,
};

export class SkillSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.effects = [];

    // Shared resources. A unit ring (radius 1) scaled per effect, a unit sphere
    // for bolts and sparkles, and a basic material cloned per effect so colors
    // and opacity animate independently without new geometry allocations.
    this._ringGeo = new THREE.RingGeometry(0.82, 1, 28);
    this._sphereGeo = new THREE.SphereGeometry(0.18, 8, 6);
    this._geoms = [this._ringGeo, this._sphereGeo];
    this._mats = []; // cloned materials we own and must dispose
  }

  // Material factory: a cloned emissive-looking basic material so each effect
  // fades on its own. We track it for disposal.
  _mat(color, opacity) {
    const m = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
    });
    this._mats.push(m);
    return m;
  }

  // Ground height helper, defensive if world lacks heightAt.
  _groundY(x, z) {
    return this.world && this.world.heightAt ? this.world.heightAt(x, z) : 0;
  }

  // Cast a skill. casterPos is a Vector3, casterYaw radians (forward = +Z atan2
  // convention used by combat). level is the character level. ctx supplies the
  // gameplay callbacks. Returns true if the cast produced an effect.
  cast(skill, casterPos, casterYaw, level, ctx) {
    if (!skill || this.effects.length >= MAX_EFFECTS) return false;
    const color = KIND_COLOR[skill.kind] || 0x88aaff;
    const amount = skillPower(skill, level);

    if (skill.kind === 'area' || skill.kind === 'melee') {
      // Area lands centered on the caster (melee uses a small radius).
      const center = casterPos.clone();
      center.y = this._groundY(center.x, center.z) + 0.05;
      const radius = skill.radius || 3;
      if (ctx && ctx.damageArea) ctx.damageArea(center.clone(), radius, amount);
      this._spawnRing(center, radius, color);
      return true;
    }

    if (skill.kind === 'ranged') {
      // Fire a bolt forward; damage applies as an area where it lands.
      const dir = new THREE.Vector3(Math.sin(casterYaw), 0, Math.cos(casterYaw));
      const start = casterPos.clone();
      start.y = this._groundY(start.x, start.z) + 1.1;
      const range = 18;
      const target = casterPos.clone().addScaledVector(dir, range);
      target.y = this._groundY(target.x, target.z) + 0.05;
      const radius = skill.radius || 1.5;
      this._spawnBolt(start, target, color, () => {
        if (ctx && ctx.damageArea) ctx.damageArea(target.clone(), radius, amount);
        this._spawnRing(target.clone(), radius, color);
      });
      return true;
    }

    if (skill.kind === 'heal') {
      // Heal the player immediately; show sparkles rising from the caster.
      if (ctx && ctx.healPlayer) ctx.healPlayer(amount);
      this._spawnSparkles(casterPos.clone(), color);
      if (skill.radius > 0) {
        const center = casterPos.clone();
        center.y = this._groundY(center.x, center.z) + 0.05;
        this._spawnRing(center, skill.radius, color);
      }
      return true;
    }

    if (skill.kind === 'summon') {
      const count = skill.summonCount || 1;
      const family = skill.summonFamily;
      for (let i = 0; i < count; i++) {
        const a = casterYaw + (i - (count - 1) / 2) * 0.7;
        const dist = 2.2;
        const pos = casterPos.clone();
        pos.x += Math.sin(a) * dist;
        pos.z += Math.cos(a) * dist;
        pos.y = this._groundY(pos.x, pos.z);
        if (ctx && ctx.spawnSummon) ctx.spawnSummon(family, pos.clone(), level);
        this._spawnPoof(pos.clone(), color);
      }
      return true;
    }

    return false;
  }

  _spawnRing(center, radius, color) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const mesh = new THREE.Mesh(this._ringGeo, this._mat(color, 0.85));
    mesh.rotation.x = -Math.PI / 2; // lay flat on the ground
    mesh.position.copy(center);
    mesh.renderOrder = 5;
    this.scene.add(mesh);
    this.effects.push({ kind: 'ring', mesh, t: 0, life: RING_LIFE, radius });
  }

  _spawnBolt(start, target, color, onArrive) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const mesh = new THREE.Mesh(this._sphereGeo, this._mat(color, 1));
    mesh.position.copy(start);
    mesh.renderOrder = 6;
    this.scene.add(mesh);
    const dist = start.distanceTo(target);
    this.effects.push({
      kind: 'bolt', mesh, t: 0, life: Math.max(0.05, dist / BOLT_SPEED),
      from: start.clone(), to: target.clone(), onArrive, arrived: false,
    });
  }

  _spawnSparkles(pos, color) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const group = new THREE.Group();
    const n = 6;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(this._sphereGeo, this._mat(color, 1));
      const a = (i / n) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4);
      s.scale.setScalar(0.6);
      group.add(s);
    }
    group.position.copy(pos);
    group.renderOrder = 6;
    this.scene.add(group);
    this.effects.push({ kind: 'sparkle', mesh: group, t: 0, life: 0.7 });
  }

  _spawnPoof(pos, color) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const mesh = new THREE.Mesh(this._sphereGeo, this._mat(color, 0.9));
    mesh.position.copy(pos);
    mesh.position.y += 0.6;
    mesh.renderOrder = 6;
    this.scene.add(mesh);
    this.effects.push({ kind: 'poof', mesh, t: 0, life: SUMMON_POOF_LIFE });
  }

  // Advance and retire active effects. Disposes only the per-effect cloned
  // material (shared geometry stays). Call once per frame.
  update(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      const k = Math.min(1, e.t / e.life);

      if (e.kind === 'ring') {
        const r = e.radius * (0.2 + 0.8 * k);
        e.mesh.scale.setScalar(r);
        e.mesh.material.opacity = 0.85 * (1 - k);
      } else if (e.kind === 'bolt') {
        e.mesh.position.lerpVectors(e.from, e.to, k);
        if (!e.arrived && k >= 1) {
          e.arrived = true;
          if (e.onArrive) e.onArrive();
        }
      } else if (e.kind === 'sparkle') {
        e.mesh.position.y += dt * 0.8;
        for (const c of e.mesh.children) c.material.opacity = 1 - k;
      } else if (e.kind === 'poof') {
        e.mesh.scale.setScalar(0.5 + k * 2.2);
        e.mesh.material.opacity = 0.9 * (1 - k);
      }

      if (k >= 1) {
        this._retire(e);
        this.effects.splice(i, 1);
      }
    }
  }

  // Remove an effect from the scene and dispose its owned material(s).
  _retire(e) {
    this.scene.remove(e.mesh);
    if (e.mesh.material) this._disposeMat(e.mesh.material);
    if (e.mesh.children) {
      for (const c of e.mesh.children) {
        if (c.material) this._disposeMat(c.material);
      }
    }
  }

  _disposeMat(mat) {
    const idx = this._mats.indexOf(mat);
    if (idx >= 0) this._mats.splice(idx, 1);
    mat.dispose();
  }

  // Tear everything down: retire live effects and dispose shared geometry.
  dispose() {
    for (const e of this.effects) this._retire(e);
    this.effects = [];
    for (const g of this._geoms) g.dispose();
    for (const m of this._mats) m.dispose();
    this._mats = [];
  }
}
