import { CITIES, cityAt } from './cities.js';
import { t } from './i18n.js';

const RANGE = 90;        // half-width shown by the corner minimap, in meters
const BIG_RANGE = 320;   // default half-width for the expanded map
const BIG_MIN = 60;      // most zoomed-in the big map goes
const BIG_MAX = 1400;    // most zoomed-out

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

    // Pan/zoom state for the expanded map. bigCenter is the world point shown at
    // the map's center; null means "follow the player".
    this.bigCenter = null;
    this.bigRange = BIG_RANGE;

    // Points of interest drawn as emoji on the map: { x, z, icon }.
    this.pois = opts.pois || [];
  }

  toggle(force) {
    if (!this.overlay) return;
    this.expanded = force === undefined ? !this.expanded : force;
    this.overlay.classList.toggle('hidden', !this.expanded);
    // Reset to follow-the-player every time the map is opened.
    if (this.expanded) { this.bigCenter = null; this.bigRange = BIG_RANGE; }
  }

  // Drag the expanded map by a pixel delta; switches it to free-look mode.
  pan(dxPx, dyPx, player) {
    if (!this.big) return;
    const c = this.bigCenter || { x: player.pos.x, z: player.pos.z };
    const perPx = (this.bigRange * 2) / this.big.width;
    this.bigCenter = { x: c.x - dxPx * perPx, z: c.z - dyPx * perPx };
  }

  // Zoom the expanded map in/out. factor < 1 zooms in, > 1 zooms out.
  zoom(factor) {
    this.bigRange = Math.max(BIG_MIN, Math.min(BIG_MAX, this.bigRange * factor));
  }

  // Re-center the expanded map on the player (used by a "recenter" control).
  recenter() { this.bigCenter = null; }

  // Draw a top-down view centered on the player. Peers and creatures are dots.
  draw(player, peers, creatures) {
    const pp = player.pos;
    this._render(this.ctx, this.size, pp.x, pp.z, RANGE, player, peers, creatures, true);

    if (this.coords) this.coords.textContent = fmtCoords(pp);

    const here = cityAt(pp.x, pp.z);
    this.cityLabel.textContent = here ? here.name : t('wilderness');

    if (this.expanded && this.bigCtx) {
      const c = this.bigCenter || { x: pp.x, z: pp.z };
      this._render(this.bigCtx, this.big.width, c.x, c.z, this.bigRange, player, peers, creatures, false);
      if (this.bigCoords) {
        const at = cityAt(c.x, c.z);
        const name = at ? at.name : t('wilderness');
        const tag = this.bigCenter ? `${name}  —  X ${Math.round(c.x)}  Z ${Math.round(c.z)}` : `${name}  —  ${fmtCoords(pp)}`;
        this.bigCoords.textContent = tag;
      }
    }
  }

  // Render one frame into ctx, centered on world point (cx, cz) at the given range.
  _render(ctx, s, cx, cz, range, player, peers, creatures, legend) {
    const half = s / 2;
    ctx.clearRect(0, 0, s, s);

    const step = legend ? 6 : 8;
    for (let py = 0; py < s; py += step) {
      for (let px = 0; px < s; px += step) {
        const wx = cx + ((px - half) / half) * range;
        const wz = cz + ((py - half) / half) * range;
        ctx.fillStyle = terrainColor(this.world, wx, wz);
        ctx.fillRect(px, py, step, step);
      }
    }

    for (const c of CITIES) {
      const p = this.worldToMap(c, cx, cz, half, range);
      if (p) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      }
    }

    // Points of interest as emoji (shop, weapons, potions, depot, dungeons...).
    if (this.pois.length) {
      ctx.font = (legend ? 11 : 14) + 'px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const poi of this.pois) {
        const p = this.worldToMap(poi, cx, cz, half, range);
        if (p) ctx.fillText(poi.icon, p.x, p.y);
      }
    }

    if (creatures) {
      ctx.fillStyle = '#e74c3c';
      for (const c of creatures) {
        const p = this.worldToMap(c.pos, cx, cz, half, range);
        if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 7); ctx.fill(); }
      }
    }

    if (peers) {
      ctx.fillStyle = '#3498db';
      for (const id in peers) {
        const p = this.worldToMap(peers[id], cx, cz, half, range);
        if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); }
      }
    }

    // Player marker: a heading arrow when centered on them, a plain dot otherwise.
    const me = this.worldToMap(player.pos, cx, cz, half, range);
    if (me) {
      ctx.save();
      ctx.translate(me.x, me.y);
      ctx.rotate(-player.yaw);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

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

  worldToMap(wp, cx, cz, half, range = RANGE) {
    const dx = wp.x - cx;
    const dz = wp.z - cz;
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
