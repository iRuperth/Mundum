import { CITIES, cityAt } from './cities.js';
import { t } from './i18n.js';

const RANGE = 90;        // half-width shown by the corner minimap, in meters
const BIG_RANGE = 320;   // the expanded map zooms out to show much more

export class Minimap {
  constructor(canvas, world, cityLabel, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.cityLabel = cityLabel;
    this.size = canvas.width;

    // Optional expanded-map widgets, wired up when the player taps the minimap.
    this.coords = opts.coords || null;       // small coord readout under the minimap
    this.big = opts.big || null;             // big canvas
    this.bigCtx = this.big ? this.big.getContext('2d') : null;
    this.bigCoords = opts.bigCoords || null;
    this.overlay = opts.overlay || null;     // overlay container, toggled .hidden
    this.expanded = false;
  }

  toggle(force) {
    if (!this.overlay) return;
    this.expanded = force === undefined ? !this.expanded : force;
    this.overlay.classList.toggle('hidden', !this.expanded);
  }

  // Draw a top-down view centered on the player. Peers and creatures are dots.
  draw(player, peers, creatures) {
    this._render(this.ctx, this.size, RANGE, player, peers, creatures, true);

    const p = player.pos;
    if (this.coords) this.coords.textContent = fmtCoords(p);

    const here = cityAt(p.x, p.z);
    this.cityLabel.textContent = here ? here.name : t('wilderness');

    if (this.expanded && this.bigCtx) {
      this._render(this.bigCtx, this.big.width, BIG_RANGE, player, peers, creatures, false);
      if (this.bigCoords) {
        const name = here ? here.name : t('wilderness');
        this.bigCoords.textContent = `${name}  —  ${fmtCoords(p)}`;
      }
    }
  }

  // Render one frame into the given context at the given world range.
  _render(ctx, s, range, player, peers, creatures, legend) {
    const half = s / 2;
    ctx.clearRect(0, 0, s, s);

    const step = legend ? 6 : 8;
    for (let py = 0; py < s; py += step) {
      for (let px = 0; px < s; px += step) {
        const wx = player.pos.x + ((px - half) / half) * range;
        const wz = player.pos.z + ((py - half) / half) * range;
        ctx.fillStyle = terrainColor(this.world, wx, wz);
        ctx.fillRect(px, py, step, step);
      }
    }

    for (const c of CITIES) {
      const p = this.worldToMap(c, player, half, range);
      if (p) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      }
    }

    if (creatures) {
      ctx.fillStyle = '#e74c3c';
      for (const c of creatures) {
        const p = this.worldToMap(c.pos, player, half, range);
        if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 7); ctx.fill(); }
      }
    }

    if (peers) {
      ctx.fillStyle = '#3498db';
      for (const id in peers) {
        const p = this.worldToMap(peers[id], player, half, range);
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

    if (legend) this._drawLegend(ctx);
  }

  _drawLegend(ctx) {
    const rows = [['#f1c40f', t('city')], ['#e74c3c', t('enemy')], ['#3498db', t('player')]];
    ctx.font = '8px system-ui';
    ctx.textBaseline = 'middle';
    let y = 8;
    for (const [color, label] of rows) {
      ctx.fillStyle = color;
      ctx.fillRect(4, y - 2, 5, 5);
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(11, y - 5, ctx.measureText(label).width + 4, 10);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, 13, y);
      y += 12;
    }
  }

  worldToMap(wp, player, half, range = RANGE) {
    const dx = wp.x - player.pos.x;
    const dz = wp.z - player.pos.z;
    if (Math.abs(dx) > range || Math.abs(dz) > range) return null;
    return { x: half + (dx / range) * half, y: half + (dz / range) * half };
  }
}

// Roblox-style readout: world X / Y (height) / Z, rounded to whole meters.
function fmtCoords(p) {
  return `X ${Math.round(p.x)}  Y ${Math.round(p.y)}  Z ${Math.round(p.z)}`;
}

function terrainColor(world, x, z) {
  const h = world.heightAt(x, z);
  if (h < -0.8) return '#2f6fa8';
  if (h < 0.6) return '#cdbd86';
  if (h > 22) return '#eef3f7';
  if (h > 17) return '#8a877f';
  return h > 8 ? '#4a8f44' : '#57a14d';
}
