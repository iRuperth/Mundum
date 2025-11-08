import * as THREE from 'three';

// Pooled floating combat text. One canvas texture is reused per popup and a
// fixed pool of sprites avoids per-hit allocations and GPU texture churn.
const POOL_SIZE = 24;
const LIFE = 0.8;

export class FloatText {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 64;
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      sprite.scale.set(1, 0.5, 1);
      sprite.visible = false;
      scene.add(sprite);
      this.pool.push({ canvas, ctx: canvas.getContext('2d'), tex, sprite, t: 0, baseY: 0 });
    }
  }

  spawn(pos, text, color) {
    const p = this.pool.pop();
    if (!p) return;
    const ctx = p.ctx;
    ctx.clearRect(0, 0, 128, 64);
    ctx.font = 'bold 40px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = '#000';
    ctx.strokeText(text, 64, 32);
    ctx.fillStyle = color; ctx.fillText(text, 64, 32);
    p.tex.needsUpdate = true;
    p.baseY = pos.y + 1.6;
    p.sprite.position.set(pos.x, p.baseY, pos.z);
    p.sprite.material.opacity = 1;
    p.sprite.visible = true;
    p.t = 0;
    this.active.push(p);
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.t += dt;
      const e = p.t / LIFE;
      if (e >= 1) {
        p.sprite.visible = false;
        this.active.splice(i, 1);
        this.pool.push(p);
        continue;
      }
      p.sprite.position.y = p.baseY + e * 0.8;
      p.sprite.material.opacity = 1 - e;
    }
  }
}
