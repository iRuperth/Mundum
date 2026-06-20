import * as THREE from 'three';
import { buildCharacter } from './character.js';
import { EquipVisuals } from './equipVisuals.js';

// A live, drag-to-rotate 3D character viewer for the creation screen. Shows the
// FULL model — hair, face and any equipped gear — exactly as it looks in-game,
// and the player spins it with the mouse/finger to inspect it from every side.
// One shared WebGL renderer blits into each instance's own 2D canvas, so the
// browser never runs out of contexts.

let shared = null;
function sharedRenderer() {
  if (shared) return shared;
  const canvas = document.createElement('canvas');
  shared = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  shared.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  return shared;
}

function makeStage(profile) {
  const scene = new THREE.Scene();
  // Three-point-ish lighting: a warm key, a cool rim for edge definition, a soft
  // sky/ground fill, and a low front fill so the face/chest never go muddy.
  const key = new THREE.DirectionalLight(0xfff4e2, 1.35); key.position.set(1.8, 2.6, 2.6);
  const rim = new THREE.DirectionalLight(0x9fd1ff, 0.6); rim.position.set(-2.2, 1.8, -2);
  const fill = new THREE.HemisphereLight(0xdcecff, 0x2a2f48, 1.0);
  const front = new THREE.DirectionalLight(0xffffff, 0.35); front.position.set(0, 0.6, 4);
  scene.add(key, rim, fill, front);

  const char = buildCharacter(profile);
  try { char.animate(0, 0, true, 0); } catch (_) { /* ignore */ }
  scene.add(char.group);

  let equipVisuals = null;
  if (profile.equip && Object.keys(profile.equip).length) {
    try {
      equipVisuals = new EquipVisuals(char);
      equipVisuals.setBaseColors(profile.colors || {});
      equipVisuals.refresh(profile.equip, profile.level || 1);
    } catch (_) { equipVisuals = null; }
  }

  // Frame the camera to the ACTUAL model bounds (gear/hair change the height), so
  // the character fills the view consistently and stands centred — not cropped at
  // the feet or floating up top.
  let camY = 0.95, dist = 3.6;
  try {
    const box = new THREE.Box3().setFromObject(char.group);
    if (isFinite(box.min.y) && isFinite(box.max.y)) {
      const h = Math.max(0.8, box.max.y - box.min.y);
      camY = (box.max.y + box.min.y) / 2;
      dist = h * 1.85;
    }
  } catch (_) { /* keep defaults */ }
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, camY + 0.05, dist);
  camera.lookAt(0, camY, 0);

  function dispose() {
    scene.remove(char.group);
    char.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { Array.isArray(o.material) ? o.material.forEach((m) => m.dispose()) : o.material.dispose(); }
    });
  }
  return { scene, camera, char, dispose };
}

export class CharPreview {
  constructor(profile, opts = {}) {
    this.size = opts.size || 300;
    this.autoRotate = opts.autoRotate !== false;
    this.interactive = opts.interactive !== false;
    this.yaw = 0;
    this.dragging = false;
    this.lastX = 0;
    this.spinVel = 0.4;
    this._raf = null;
    this._lastT = 0;
    this._phase = 0;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'char-preview';
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d');

    this.stage = makeStage(profile);
    if (this.interactive) this._bindDrag();
  }

  get el() { return this.canvas; }

  setProfile(profile) {
    if (this.stage) this.stage.dispose();
    this.stage = makeStage(profile);
  }

  _bindDrag() {
    const down = (x) => { this.dragging = true; this.lastX = x; this.spinVel = 0; this.canvas.classList.add('grabbing'); };
    const move = (x) => { if (!this.dragging) return; this.yaw += (x - this.lastX) * 0.012; this.lastX = x; this.spinVel = 0; };
    const up = () => { this.dragging = false; this.canvas.classList.remove('grabbing'); };
    this.canvas.addEventListener('mousedown', (e) => { e.preventDefault(); down(e.clientX); });
    window.addEventListener('mousemove', (e) => move(e.clientX));
    window.addEventListener('mouseup', up);
    this.canvas.addEventListener('touchstart', (e) => down(e.touches[0].clientX), { passive: true });
    this.canvas.addEventListener('touchmove', (e) => move(e.touches[0].clientX), { passive: true });
    this.canvas.addEventListener('touchend', up);
    this._handlers = { move, up };
  }

  start() {
    if (this._raf) return;
    const loop = (t) => {
      this._raf = requestAnimationFrame(loop);
      const dt = this._lastT ? Math.min(0.05, (t - this._lastT) / 1000) : 0;
      this._lastT = t;
      this._tick(dt);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = null; this._lastT = 0; }

  _tick(dt) {
    if (this.autoRotate && !this.dragging) this.yaw += this.spinVel * dt;
    this._phase += dt;
    if (this.stage && this.stage.char) {
      this.stage.char.group.rotation.y = this.yaw;
      try { this.stage.char.animate(this._phase, 0, true, dt); } catch (_) { /* ignore */ }
    }
    this.render();
  }

  render() {
    if (!this.stage) return;
    const r = sharedRenderer();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = this.canvas.clientWidth || this.size;
    const cssH = this.canvas.clientHeight || this.size;
    const w = Math.max(1, Math.floor(cssW * dpr));
    const h = Math.max(1, Math.floor(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    r.setSize(w, h, false);
    this.stage.camera.aspect = w / h;
    this.stage.camera.updateProjectionMatrix();
    r.render(this.stage.scene, this.stage.camera);
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.drawImage(r.domElement, 0, 0, w, h);
  }

  destroy() {
    this.stop();
    if (this.stage) { this.stage.dispose(); this.stage = null; }
    if (this._handlers) {
      window.removeEventListener('mousemove', this._handlers.move);
      window.removeEventListener('mouseup', this._handlers.up);
    }
  }
}
