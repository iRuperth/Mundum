import * as THREE from 'three';
import { buildCharacter } from './character.js';
import { EquipVisuals } from './equipVisuals.js';

// Renders other players. Each peer is a character model interpolated toward its
// last broadcast state. A floating name tag sits above the head.
const DEFAULT_COLORS = { skin: '#f2c79b', shirt: '#3498db', pants: '#34495e', hair: '#4a2f1b' };

export class Peers {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.peers = new Map();
  }

  list() {
    const out = {};
    for (const [id, p] of this.peers) out[id] = p.pos;
    return out;
  }

  // The peer whose body a screen ray hits (left-clicking a player). Returns
  // { id, peer } or null. Uses each peer's character group for the hit test.
  raycast(raycaster) {
    let best = null, bestDist = Infinity;
    for (const [id, peer] of this.peers) {
      const hits = raycaster.intersectObject(peer.char.group, true);
      if (hits.length && hits[0].distance < bestDist) {
        bestDist = hits[0].distance;
        best = { id, peer };
      }
    }
    return best;
  }

  update(id, state) {
    let peer = this.peers.get(id);
    if (!peer) peer = this._create(id, state);
    peer.target.set(state.x, state.y, state.z);
    peer.targetYaw = state.yaw || 0;
    peer.lastSeen = performance.now();
    if (state.name && peer.name !== state.name) {
      peer.name = state.name;
      this._setTag(peer, state.name);
    }
    // Worn gear: re-apply when the broadcast carries an `equip` snapshot (only
    // sent on change / while asleep) so peers show the player's set.
    if (state.equip && peer.equipVisuals) {
      try { peer.equipVisuals.refresh(state.equip, state.level || 1); } catch (_) {}
    }
    // Sleeping: lay the body down (and stop walk animation in tick). Toggling
    // only on change keeps the pose stable.
    const sleeping = !!state.sleeping;
    if (sleeping !== peer.sleeping) {
      peer.sleeping = sleeping;
      if (peer.char.setSleeping) peer.char.setSleeping(sleeping);
    }
  }

  _create(id, state) {
    const profile = {
      colors: { ...DEFAULT_COLORS, ...(state.colors || {}) },
      sex: state.sex || 'male',
      hair: state.hair || 'short',
      nose: state.nose || 'small',
      mouth: state.mouth || 'smile',
      eyes: state.eyes || 'normal',
      brows: state.brows || 'normal',
      ears: state.ears || 'normal',
    };
    const char = buildCharacter(profile);
    this.scene.add(char.group);
    const tag = this._makeTag(state.name || '?');
    char.group.add(tag.sprite);
    tag.sprite.position.y = 2.1;
    // Visible worn gear (weapon/armor/helmet/…) so peers look equipped like the
    // local hero. Applied from the broadcast `equip` snapshot when present.
    const equipVisuals = new EquipVisuals(char);
    const peer = {
      char, tag, equipVisuals, name: state.name || '',
      pos: new THREE.Vector3(state.x, state.y, state.z),
      target: new THREE.Vector3(state.x, state.y, state.z),
      yaw: state.yaw || 0, targetYaw: state.yaw || 0,
      walkPhase: 0, lastSeen: performance.now(), sleeping: false,
    };
    if (state.equip) { try { equipVisuals.refresh(state.equip, state.level || 1); } catch (_) {} }
    if (state.sleeping) { peer.sleeping = true; if (char.setSleeping) char.setSleeping(true); }
    this.peers.set(id, peer);
    return peer;
  }

  _makeTag(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.2, 0.55, 1);
    const tag = { canvas, tex, sprite };
    this._drawTag(tag, text);
    return tag;
  }

  _setTag(peer, text) { this._drawTag(peer.tag, text); }

  _drawTag(tag, text) {
    const ctx = tag.canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(text, 128, 34);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, 128, 34);
    tag.tex.needsUpdate = true;
  }

  tick(dt) {
    const now = performance.now();
    for (const [id, peer] of this.peers) {
      if (now - peer.lastSeen > 15000) { this.remove(id); continue; }
      peer.pos.lerp(peer.target, Math.min(1, dt * 8));
      const moving = peer.pos.distanceTo(peer.target) > 0.02;
      peer.yaw += angleDelta(peer.yaw, peer.targetYaw) * Math.min(1, dt * 10);
      // A sleeping peer lies still — keep the lie-down pose (animate with 0 phase
      // so setSleeping's breathing carries) and don't advance the walk cycle.
      if (peer.sleeping) {
        peer.char.animate(0, 0, true, dt);
      } else {
        peer.walkPhase += (moving ? dt * 9 : 0);
        peer.char.animate(peer.walkPhase, moving ? 1 : 0, true, dt);
      }
      peer.char.updateAttack(dt);
      peer.char.group.position.copy(peer.pos);
      peer.char.group.rotation.y = peer.yaw + Math.PI;
    }
  }

  remove(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.scene.remove(peer.char.group);
    peer.char.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    if (peer.tag) { peer.tag.tex.dispose(); peer.tag.sprite.material.dispose(); }
    this.peers.delete(id);
  }

  clear() {
    for (const id of [...this.peers.keys()]) this.remove(id);
  }
}

function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
