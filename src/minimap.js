import { CITIES, cityAt } from './cities.js';
import { t } from './i18n.js';

const RANGE = 90;

export class Minimap {
  constructor(canvas, world, cityLabel) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.cityLabel = cityLabel;
    this.size = canvas.width;
    this._t = 0;
  }

  // Draw a top-down view centered on the player. Peers and creatures are dots.
  draw(player, peers, creatures) {
    const ctx = this.ctx;
    const s = this.size;
    const half = s / 2;
    ctx.clearRect(0, 0, s, s);

    const step = 6;
    for (let py = 0; py < s; py += step) {
      for (let px = 0; px < s; px += step) {
        const wx = player.pos.x + ((px - half) / half) * RANGE;
        const wz = player.pos.z + ((py - half) / half) * RANGE;
        ctx.fillStyle = terrainColor(this.world, wx, wz);
        ctx.fillRect(px, py, step, step);
      }
    }

    for (const c of CITIES) {
      const p = this.worldToMap(c, player, half);
      if (p) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      }
    }

    if (creatures) {
      ctx.fillStyle = '#e74c3c';
      for (const c of creatures) {
        const p = this.worldToMap(c.pos, player, half);
        if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 7); ctx.fill(); }
      }
    }

    if (peers) {
      ctx.fillStyle = '#3498db';
      for (const id in peers) {
        const p = this.worldToMap(peers[id], player, half);
        if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); }
      }
    }

    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath();
    ctx.fill();
    ctx.restore();

    const here = cityAt(player.pos.x, player.pos.z);
    this.cityLabel.textContent = here ? here.name : t('wilderness');
  }

  worldToMap(wp, player, half) {
    const dx = wp.x - player.pos.x;
    const dz = wp.z - player.pos.z;
    if (Math.abs(dx) > RANGE || Math.abs(dz) > RANGE) return null;
    return { x: half + (dx / RANGE) * half, y: half + (dz / RANGE) * half };
  }
}

function terrainColor(world, x, z) {
  const h = world.heightAt(x, z);
  if (h < -0.8) return '#2f6fa8';
  if (h < 0.6) return '#cdbd86';
  if (h > 22) return '#eef3f7';
  if (h > 17) return '#8a877f';
  return h > 8 ? '#4a8f44' : '#57a14d';
}
