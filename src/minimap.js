import { CITIES, cityAt, cityWallOutline, cityGates, cityMapFeatures } from './cities.js';
import { t } from './i18n.js';

const RANGE = 90;        // default half-width shown by the corner minimap, in meters
const CORNER_MIN = 24;   // most zoomed-in the corner map goes (read house detail)
const CORNER_MAX = 360;  // most zoomed-out the corner map goes
const BIG_RANGE = 320;   // default half-width for the expanded map
const BIG_MIN = 60;      // most zoomed-in the big map goes
const BIG_MAX = 1400;    // most zoomed-out
const CAVE_RANGE = 34;   // tighter view underground (rooms are ~50-72m half-extent)
// Underground, you only see creatures on YOUR floor and within this many meters
// (Tibia-style: the cave minimap is a short-range radar, not a god view).
const CAVE_CREATURE_SIGHT = 10;

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
    this.legend = opts.legend || null;       // left-side legend panel for the big map
    this.expanded = false;

    // Pan/zoom state for the expanded map. bigCenter is the world point shown at
    // the map's center; null means "follow the player".
    this.bigCenter = null;
    this.bigRange = BIG_RANGE;
    // The corner minimap's half-width, zoomable with the mouse wheel over it.
    this.cornerRange = RANGE;

    // Points of interest drawn as emoji on the map: { x, z, icon }.
    this.pois = opts.pois || [];
  }

  toggle(force) {
    if (!this.overlay) return;
    this.expanded = force === undefined ? !this.expanded : force;
    this.overlay.classList.toggle('hidden', !this.expanded);
    // Reset to follow-the-player every time the map is opened.
    if (this.expanded) {
      this.bigCenter = null; this.bigRange = BIG_RANGE;
      this.buildLegend();
    }
  }

  // Fill the legend panel (opts.legend) with one row per marker type, each row
  // showing the SAME glyph the map draws (via drawPoiIcon) or the plain colored
  // dot, beside a localized label. Rebuilt each open so it re-localizes and only
  // lists markers that can actually appear (the house row only when you own one).
  buildLegend() {
    const host = this.legend;
    if (!host) return;
    host.innerHTML = '';
    const title = document.createElement('h4');
    title.textContent = t('legendTitle');
    host.appendChild(title);

    // POI rows: an icon key drawn with drawPoiIcon (matches the map exactly) and
    // a label key. Only show the house row when the player actually owns a house.
    const owns = this.pois.some((p) => p.icon === '🏠');
    const poiRows = [
      ['🏠', 'mapKeyHouse', owns],
      ['📍', 'mapKeyQuest', true],
      ['🛒', 'mapKeyMarket', true],
      ['🏦', 'mapKeyBank', true],
      ['⚗️', 'mapKeyPotion', true],
      ['⚔️', 'mapKeyArmory', true],
      ['🔮', 'mapKeyMage', true],
      ['🏹', 'mapKeyArcher', true],
      ['🏛️', 'mapKeyTemple', true],
      ['🕳️', 'mapKeyDungeon', true],
      ['🏚️', 'mapKeyRuin', true],
    ];
    for (const [icon, key, show] of poiRows) {
      if (show) host.appendChild(this._legendRow((cx) => drawPoiIcon(cx, 9, 9, 5, icon), t(key)));
    }
    // Dot/marker rows drawn the same way the map draws them.
    host.appendChild(this._legendRow((cx) => { cx.fillStyle = '#3ad15a'; cx.beginPath(); cx.arc(9, 9, 4, 0, 7); cx.fill(); }, t('mapKeyGate')));
    host.appendChild(this._legendRow((cx) => { cx.fillStyle = '#e74c3c'; cx.beginPath(); cx.arc(9, 9, 4, 0, 7); cx.fill(); }, t('mapKeyEnemy')));
    host.appendChild(this._legendRow((cx) => { cx.fillStyle = '#3498db'; cx.beginPath(); cx.arc(9, 9, 4, 0, 7); cx.fill(); }, t('mapKeyPeer')));
    // Player-placed mark (flag) + the cave stairs (green up / orange down), so the
    // legend explains the underground icons too.
    host.appendChild(this._legendRow((cx) => drawPoiIcon(cx, 9, 9, 5, '🚩'), t('mapKeyMark')));
    host.appendChild(this._legendRow((cx) => drawStairIcon(cx, 9, 9, 5, true), t('mapKeyStairUp')));
    host.appendChild(this._legendRow((cx) => drawStairIcon(cx, 9, 9, 5, false), t('mapKeyStairDown')));
    // "You" — the white heading arrow.
    host.appendChild(this._legendRow((cx) => {
      cx.save(); cx.translate(9, 9); cx.fillStyle = '#fff';
      cx.beginPath(); cx.moveTo(0, -6); cx.lineTo(4, 5); cx.lineTo(-4, 5); cx.closePath(); cx.fill(); cx.restore();
    }, t('mapKeyYou')));
  }

  // One legend row: an 18×18 canvas swatch (so glyphs render identically to the
  // map) painted by `paint(ctx)`, plus the text label.
  _legendRow(paint, label) {
    const row = document.createElement('div');
    row.className = 'legend-row';
    const c = document.createElement('canvas');
    c.width = c.height = 18;
    paint(c.getContext('2d'));
    const span = document.createElement('span');
    span.textContent = label;
    row.appendChild(c); row.appendChild(span);
    return row;
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

  // Zoom the CORNER minimap in/out with the mouse wheel over it.
  zoomCorner(factor) {
    this.cornerRange = Math.max(CORNER_MIN, Math.min(CORNER_MAX, this.cornerRange * factor));
  }

  // Re-center the expanded map on the player (used by a "recenter" control).
  recenter() { this.bigCenter = null; }

  // Draw a top-down view centered on the player. Peers and creatures are dots.
  // `cave` (optional): { floorIndex, floorCount, viewFloor, stairs, label } puts
  // the minimap in underground mode — a floor schematic with up/down floor peek,
  // stair markers, and creatures limited to the player's own floor + short range.
  draw(player, peers, creatures, cave) {
    const pp = player.pos;
    if (cave) {
      this._renderCave(this.ctx, this.size, pp, player, creatures, cave, true);
      if (this.coords) this.coords.textContent = fmtCoords(pp);
      // Just the cave name — no "Floor 2/4" suffix (the user wants only which
      // cave it is). The stair pips on the map already show floors above/below.
      this.cityLabel.textContent = cave.label || t('wilderness');
      if (this.expanded && this.bigCtx) {
        this._renderCave(this.bigCtx, this.big.width, pp, player, creatures, cave, false);
        if (this.bigCoords) this.bigCoords.textContent = cave.label || '';
      }
      return;
    }

    this._render(this.ctx, this.size, pp.x, pp.z, this.cornerRange, player, peers, creatures, true);

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

  // Render the underground minimap: a dark floor schematic centered on the
  // player, with stair markers and (when viewing the player's own floor) nearby
  // creatures as dots. Up/down arrows show there are floors above/below; the big
  // map lets you page through them (viewFloor), but other floors never show mobs.
  _renderCave(ctx, s, pp, player, creatures, cave, legend) {
    const half = s / 2;
    ctx.clearRect(0, 0, s, s);
    // Unexplored = near-black fog. The real cave structure (rock vs walkable
    // floor) is painted ONLY over the cells the player has already explored, so
    // the map fills in as you walk instead of being handed to you complete.
    ctx.fillStyle = '#0c0b0a';
    ctx.fillRect(0, 0, s, s);

    const range = legend ? CAVE_RANGE : CAVE_RANGE * 1.4;
    const toMap = (wx, wz) => ({ x: half + ((wx - pp.x) / range) * half, y: half + ((wz - pp.z) / range) * half });
    const worldAt = (mx, my) => ({ x: pp.x + ((mx - half) / half) * range, z: pp.z + ((my - half) / half) * range });

    // --- Explored structure (fog of war) -------------------------------------
    // Sample the floor's solidAt over a grid of `step`-px cells. A revealed cell
    // is drawn as lit floor (walkable) or stone (rock); unrevealed cells are left
    // as fog. The reveal mask + solidAt come from the cave context (main.js).
    const st = cave.structure;
    const revealed = cave.revealed;
    if (st && typeof st.solidAt === 'function') {
      const step = legend ? 4 : 5;
      for (let my = 0; my < s; my += step) {
        for (let mx = 0; mx < s; mx += step) {
          const w = worldAt(mx + step / 2, my + step / 2);
          if (revealed && !revealed(w.x, w.z)) continue;   // still fogged
          const solid = st.solidAt(w.x, w.z);
          ctx.fillStyle = solid ? '#473f34' : '#7d7260';   // rock vs lit floor
          ctx.fillRect(mx, my, step, step);
        }
      }
      // A soft "currently lit" disc right around the player so their immediate
      // surroundings read a touch brighter than older explored rock.
      const lit = ctx.createRadialGradient(half, half, 2, half, half, half * 0.5);
      lit.addColorStop(0, 'rgba(255,240,200,0.10)');
      lit.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = lit; ctx.fillRect(0, 0, s, s);
    } else {
      // No structure available (shouldn't happen) — fall back to a plain disc.
      ctx.fillStyle = '#6a6051';
      ctx.beginPath(); ctx.arc(half, half, half * 0.9, 0, Math.PI * 2); ctx.fill();
    }

    // --- Stair icons: a little green stair = UP, orange stair = DOWN ----------
    // Only drawn once the player has explored near them (so the map reveals where
    // the exits are as you find them, not for free).
    for (const stp of (cave.stairs || [])) {
      if (revealed && !revealed(stp.x, stp.z)) continue;
      const p = toMap(stp.x, stp.z);
      drawStairIcon(ctx, p.x, p.y, legend ? 4.5 : 6, stp.dir === 'up');
    }

    // --- Player-placed named marks on THIS floor -----------------------------
    for (const m of (cave.marks || [])) {
      const p = toMap(m.x, m.z);
      drawMapMark(ctx, p.x, p.y, m.name, legend);
    }

    // Creatures: ONLY when viewing the player's own floor, and only those within
    // CAVE_CREATURE_SIGHT meters (the short-range radar the user asked for).
    if (creatures && cave.viewFloor === cave.floorIndex) {
      ctx.fillStyle = '#e74c3c';
      for (const c of creatures) {
        if (Math.hypot(c.pos.x - pp.x, c.pos.z - pp.z) > CAVE_CREATURE_SIGHT) continue;
        const p = toMap(c.pos.x, c.pos.z);
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 7); ctx.fill();
      }
    }

    // Player heading arrow (only drawn when viewing the player's own floor).
    if (cave.viewFloor === cave.floorIndex) {
      ctx.save(); ctx.translate(half, half); ctx.rotate(-player.yaw);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      // Viewing another floor: a faint "you are not here" hint dot.
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(half, half, 3, 0, 7); ctx.fill();
    }

    // Floor up/down indicators in the corners, so you know there's more cave
    // above/below and which floor you're peeking at.
    ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    if (cave.viewFloor > 0) { ctx.fillStyle = '#7bed6f'; ctx.fillText('▲', 4, 4); }
    if (cave.viewFloor < cave.floorCount - 1) { ctx.fillStyle = '#ff9a3a'; ctx.fillText('▼', 4, s - 18); }
  }

  // Build (or reuse) the offscreen terrain layer for the given view. Cached and
  // rebuilt only when the quantized center cell, range, or size changes — so a
  // standing/slow-moving player pays the noise cost roughly once, not per frame.
  _terrainLayer(s, cx, cz, range, legend) {
    const step = legend ? 6 : 8;
    // Quantize the cache center to a block of `step` world-pixels (coarse, so the
    // cache survives normal walking), and remember the quantized center. The live
    // _render() blits this with a sub-pixel offset (see drawImage in _render) to
    // keep it pixel-aligned with the city/dot transforms, so coarse quantization
    // doesn't cause visible drift. Rebuilt only when you cross a block or zoom.
    const worldPerPx = range / (s / 2);
    const block = worldPerPx * step;
    const qx = Math.round(cx / block);
    const qz = Math.round(cz / block);
    this._terrCx = qx * block; this._terrCz = qz * block;   // cached center (for the offset)
    const key = `${s}|${range.toFixed(1)}|${step}|${qx}|${qz}`;
    if (this._terrKey === key && this._terrCanvas) return this._terrCanvas;

    // Render with a `pad`-pixel border on every side so the live blit can shift
    // the layer by up to ±one block without exposing an empty edge.
    const pad = step * 2;
    this._terrPad = pad;
    const cs = s + pad * 2;
    if (!this._terrCanvas || this._terrCanvas.width !== cs) {
      this._terrCanvas = (typeof OffscreenCanvas !== 'undefined')
        ? new OffscreenCanvas(cs, cs)
        : Object.assign(document.createElement('canvas'), { width: cs, height: cs });
      this._terrCtx = this._terrCanvas.getContext('2d');
    }
    const tctx = this._terrCtx;
    const half = s / 2;
    const ccx = this._terrCx, ccz = this._terrCz;
    // Fill the padded canvas; map pixel (px,py) in the FINAL view sits at
    // (px+pad, py+pad) in this canvas, and runs from -pad..s+pad.
    for (let py = -pad; py < s + pad; py += step) {
      for (let px = -pad; px < s + pad; px += step) {
        const wx = ccx + ((px - half) / half) * range;
        const wz = ccz + ((py - half) / half) * range;
        tctx.fillStyle = terrainColor(this.world, wx, wz);
        tctx.fillRect(px + pad, py + pad, step, step);
      }
    }
    this._terrKey = key;
    return this._terrCanvas;
  }

  // Render one frame into ctx, centered on world point (cx, cz) at the given range.
  _render(ctx, s, cx, cz, range, player, peers, creatures, legend) {
    const half = s / 2;
    ctx.clearRect(0, 0, s, s);

    // TERRAIN LAYER (the expensive part — ~625 cells × ~7 fbm-noise evals each).
    // It only depends on (centerCell, range, size), so we render it ONCE to an
    // offscreen canvas and blit it every frame, rebuilding only when the player
    // crosses a block or zoom changes. This removes thousands of noise evals/frame
    // (the dominant minimap cost) — dots/POIs are still drawn fresh below.
    // The cache is centered on a quantized point; blit it shifted by the live-vs-
    // cached center delta (in map pixels) so it stays aligned with the dots.
    const terr = this._terrainLayer(s, cx, cz, range, legend);
    const perPxT = half / range;
    const ddx = (this._terrCx - cx) * perPxT, ddz = (this._terrCz - cz) * perPxT;
    const pad = this._terrPad || 0;
    // The padded layer's (pad,pad) is view-origin (0,0); shift by the live delta.
    ctx.drawImage(terr, Math.round(-pad + ddx), Math.round(-pad + ddz));

    // City walls: draw each city's perimeter (rectangle for the grid capital, a
    // circle for round towns) plus a center marker, so the map shows the outline
    // that surrounds each city, not just a dot.
    const perPx = half / range;            // map pixels per world meter
    for (const c of CITIES) {
      const center = this.toMap(c, cx, cz, half, range);
      // Tibia-style interior: draw the city's streets and house blocks when we're
      // zoomed in enough to read them (skip when the city is a far-off speck, both
      // to keep it legible and cheap). Roads are pale cobble, houses are roof-red
      // blocks with a dark outline.
      const cityHalfPx = (cityWallOutline(c).radius || 120) * perPx;
      if (cityHalfPx > 26) {
        const feat = cityMapFeatures(c);
        ctx.save();
        // Streets first (under the houses).
        ctx.fillStyle = 'rgba(196,180,150,0.85)';
        for (const r of feat.roads) {
          const p = this.toMap(r, cx, cz, half, range);
          if (r.round) { ctx.beginPath(); ctx.arc(p.x, p.y, (r.w / 2) * perPx, 0, Math.PI * 2); ctx.fill(); continue; }
          ctx.save(); ctx.translate(p.x, p.y); if (r.rot) ctx.rotate(r.rot + Math.PI / 2);
          ctx.fillRect(-(r.w * perPx) / 2, -(r.d * perPx) / 2, r.w * perPx, r.d * perPx);
          ctx.restore();
        }
        // House blocks.
        ctx.fillStyle = 'rgba(150,70,52,0.95)';
        ctx.strokeStyle = 'rgba(40,24,18,0.8)';
        ctx.lineWidth = 0.7;
        for (const b of feat.buildings) {
          const p = this.toMap(b, cx, cz, half, range);
          const w = b.w * perPx, d = b.d * perPx;
          if (w < 1.5) continue;                  // too small to bother
          ctx.fillRect(p.x - w / 2, p.y - d / 2, w, d);
          if (w > 4) ctx.strokeRect(p.x - w / 2, p.y - d / 2, w, d);
        }
        ctx.restore();
      }
      const o = cityWallOutline(c);
      ctx.save();
      ctx.strokeStyle = 'rgba(120,90,40,0.95)';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(241,196,15,0.10)';
      if (o.shape === 'poly') {
        // The capital's irregular wall: trace its world-space polygon.
        ctx.beginPath();
        o.points.forEach((wp, i) => {
          const p = this.toMap(wp, cx, cz, half, range);
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(center.x, center.y, o.radius * perPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      // Gate markers: a bright opening on the wall for each of the city's exits,
      // so the outline never looks like a sealed box. Each gate is a green disc
      // with a dark slot, drawn on top of the wall stroke.
      for (const g of cityGates(c)) {
        const gp = this.toMap(g, cx, cz, half, range);
        if (gp.x < -8 || gp.y < -8 || gp.x > s + 8 || gp.y > s + 8) continue;
        ctx.save();
        ctx.fillStyle = '#3ad15a';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 1.4;
        const gr = legend ? 3 : 4;
        ctx.beginPath(); ctx.arc(gp.x, gp.y, gr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // a darker slot through the disc = the open gateway
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(gp.x - gr * 0.4, gp.y - gr, gr * 0.8, gr * 2);
        ctx.restore();
      }
      // Center marker, only when it falls inside the view.
      if (Math.abs(c.x - cx) <= range && Math.abs(c.z - cz) <= range) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(center.x - 3, center.y - 3, 6, 6);
      }
    }

    // Points of interest as small DRAWN icons (not emoji): a clean colored glyph
    // per POI type reads sharper on the map than an emoji and scales with zoom.
    if (this.pois.length) {
      const r = legend ? 4 : 5;
      for (const poi of this.pois) {
        const p = this.worldToMap(poi, cx, cz, half, range);
        if (!p) continue;
        // The quest destination ('📍') draws a touch larger with a pulse ring so
        // it stands out from the static city/dungeon POIs.
        if (poi.icon === '📍') {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,210,77,.85)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
          drawPoiIcon(ctx, p.x, p.y, r + 1, poi.icon);
        } else {
          drawPoiIcon(ctx, p.x, p.y, r, poi.icon);
        }
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

    // Cardinal compass on the edges. The map is always north-up (top = -Z =
    // north, right = +X = east), so the letters are fixed to the canvas edges —
    // a quick orientation cue the user asked for, kept alongside the coordinates.
    this._drawCompass(ctx, s);

    if (legend) this._drawLegend(ctx);
  }

  // N/S/E/W markers hugging the four edges. North is tinted red so it stands out
  // as the reference, the others white. Drawn with a dark halo so they read over
  // any terrain color.
  _drawCompass(ctx, s) {
    const half = s / 2;
    const dirs = [
      { c: 'N', x: half, y: 11, color: '#ff6b5a' },
      { c: 'S', x: half, y: s - 9, color: '#ffffff' },
      { c: 'E', x: s - 9, y: half, color: '#ffffff' },
      { c: 'O', x: 11, y: half, color: '#ffffff' },   // Oeste (West) — Spanish UI
    ];
    ctx.save();
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const d of dirs) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(d.c, d.x, d.y);
      ctx.fillStyle = d.color;
      ctx.fillText(d.c, d.x, d.y);
    }
    ctx.restore();
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

  // Like worldToMap but never clamps to null — used for shapes (city walls) that
  // may straddle the view edge: the canvas clips the off-screen parts for us.
  toMap(wp, cx, cz, half, range = RANGE) {
    return { x: half + ((wp.x - cx) / range) * half, y: half + ((wp.z - cz) / range) * half };
  }
}

// Roblox-style readout: world X / Y (height) / Z, rounded to whole meters.
function fmtCoords(p) {
  return `X ${Math.round(p.x)}  Y ${Math.round(p.y)}  Z ${Math.round(p.z)}`;
}

// Map each POI's emoji to a crisp drawn glyph (color + shape) on the minimap, so
// markers read sharply at any zoom instead of relying on emoji font rendering.
// Falls back to a neutral dot for any unmapped icon.
const POI_STYLE = {
  '🏦': { color: '#f1c40f', shape: 'dollar' },   // bank ($)
  '🛒': { color: '#e67e22', shape: 'square' },   // market
  '⚗️': { color: '#9b59ff', shape: 'flask' },    // apothecary
  '🍲': { color: '#c0392b', shape: 'circle' },   // food
  '⚔️': { color: '#bdc3c7', shape: 'cross' },    // armory
  '🔮': { color: '#8e44ad', shape: 'diamond' },  // mage
  '🏹': { color: '#27ae60', shape: 'triangle' }, // archer
  '🎒': { color: '#b9770e', shape: 'square' },   // bag
  '🏛️': { color: '#ecf0f1', shape: 'temple' },   // temple / town hall
  '🏰': { color: '#bdc3c7', shape: 'temple' },   // keep
  '🍺': { color: '#d35400', shape: 'circle' },   // tavern
  '💎': { color: '#5dade2', shape: 'diamond' },  // jeweler
  '🕳️': { color: '#2c2c2c', shape: 'hole' },     // dungeon mouth
  '🏚️': { color: '#7f8c8d', shape: 'ruin' },     // ruin
  '📖': { color: '#c0843c', shape: 'square' },   // library
  '🌳': { color: '#2e8b3a', shape: 'tree' },     // great oak landmark
  '🌴': { color: '#2eae8a', shape: 'tree' },     // oasis landmark
  '🗼': { color: '#e0e0e0', shape: 'tower' },    // lighthouse / ice tower
  '🗿': { color: '#9aa0a6', shape: 'tower' },    // obelisk
  '🔺': { color: '#e0a050', shape: 'triangle' }, // pyramid
  '🏠': { color: '#34d058', shape: 'house' },    // the player's own house (green so it pops)
  '🚩': { color: '#ffd24d', shape: 'flag' },     // player-placed named map mark
  '📍': { color: '#ffd24d', shape: 'diamond' },  // QUEST destination (bright gold)
};

function drawPoiIcon(ctx, x, y, r, icon) {
  const st = POI_STYLE[icon] || { color: '#dddddd', shape: 'circle' };
  ctx.save();
  ctx.fillStyle = st.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 1;
  const path = () => {
    ctx.beginPath();
    switch (st.shape) {
      case 'square': ctx.rect(x - r, y - r, r * 2, r * 2); break;
      case 'diamond': ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); break;
      case 'triangle': ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath(); break;
      case 'hole': ctx.arc(x, y, r, 0, Math.PI * 2); break;
      case 'circle': default: ctx.arc(x, y, r, 0, Math.PI * 2); break;
    }
  };
  if (st.shape === 'cross') {
    ctx.lineWidth = 2.2; ctx.strokeStyle = st.color;
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    ctx.restore(); return;
  }
  if (st.shape === 'flask') {
    ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r); ctx.lineTo(x - r * 0.5, y - r * 0.2);
    ctx.lineTo(x - r, y + r); ctx.lineTo(x + r, y + r); ctx.lineTo(x + r * 0.5, y - r * 0.2);
    ctx.lineTo(x + r * 0.5, y - r); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); return;
  }
  if (st.shape === 'dollar') {
    // A gold coin with a $ — clearly reads as the bank on the map.
    ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2c00';
    ctx.font = `bold ${Math.round((r + 1) * 2.1)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', x, y + 0.5);
    ctx.restore(); return;
  }
  if (st.shape === 'temple') {
    // a little pediment: triangle roof over a base
    ctx.beginPath(); ctx.moveTo(x - r - 1, y - r * 0.2); ctx.lineTo(x, y - r); ctx.lineTo(x + r + 1, y - r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(x - r, y - r * 0.2, r * 2, r); ctx.strokeRect(x - r, y - r * 0.2, r * 2, r); ctx.restore(); return;
  }
  if (st.shape === 'ruin') {
    // a broken wall: two uneven blocks
    ctx.fillRect(x - r, y - r, r * 0.8, r * 2); ctx.fillRect(x + r * 0.2, y - r * 0.3, r * 0.8, r * 1.3);
    ctx.strokeRect(x - r, y - r, r * 0.8, r * 2); ctx.restore(); return;
  }
  if (st.shape === 'tree') {
    // a round canopy on a short trunk
    ctx.fillStyle = '#6a4a30';
    ctx.fillRect(x - r * 0.25, y, r * 0.5, r); ctx.strokeRect(x - r * 0.25, y, r * 0.5, r);
    ctx.fillStyle = st.color;
    ctx.beginPath(); ctx.arc(x, y - r * 0.25, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore(); return;
  }
  if (st.shape === 'tower') {
    // a tall narrow tower with a pointed cap
    ctx.fillRect(x - r * 0.5, y - r * 0.4, r, r * 1.4); ctx.strokeRect(x - r * 0.5, y - r * 0.4, r, r * 1.4);
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.4); ctx.lineTo(x, y - r * 1.3); ctx.lineTo(x + r * 0.6, y - r * 0.4); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore(); return;
  }
  if (st.shape === 'house') {
    // A little house: a square body with a pitched roof — reads clearly as "home".
    const b = r * 0.95;
    ctx.fillRect(x - b, y - b * 0.2, b * 2, b * 1.2);          // body
    ctx.strokeRect(x - b, y - b * 0.2, b * 2, b * 1.2);
    ctx.beginPath();                                            // roof
    ctx.moveTo(x - b - 1, y - b * 0.2); ctx.lineTo(x, y - b * 1.3); ctx.lineTo(x + b + 1, y - b * 0.2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(20,40,20,0.85)';                      // door
    ctx.fillRect(x - b * 0.3, y + b * 0.2, b * 0.6, b * 0.8);
    ctx.restore(); return;
  }
  if (st.shape === 'flag') {
    // A pin flag for a player-placed map mark.
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y + r); ctx.lineTo(x - r * 0.4, y - r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r); ctx.lineTo(x + r, y - r * 0.45); ctx.lineTo(x - r * 0.4, y + r * 0.1); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore(); return;
  }
  path(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// A little STAIRCASE glyph for the cave map: a 3-step flight drawn in green when
// it goes UP (toward the surface) and orange when it goes DOWN (deeper), so the
// exits read at a glance — green = subir, orange = bajar. Centered on (x,y).
function drawStairIcon(ctx, x, y, r, up) {
  const col = up ? '#5fe06a' : '#ff9a3a';
  ctx.save();
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 1;
  // Three ascending/descending steps. For "up" the steps climb to the right; for
  // "down" they descend to the right — a quick directional read.
  const n = 3;
  const sw = (r * 2) / n;            // step width
  const sh = (r * 1.6) / n;          // step rise
  for (let i = 0; i < n; i++) {
    const sx = x - r + i * sw;
    // Step top height grows (up) or shrinks (down) left→right.
    const h = up ? (i + 1) * sh : (n - i) * sh;
    const top = y + r * 0.8 - h;
    ctx.fillRect(sx, top, sw + 0.5, y + r * 0.8 - top);
    ctx.strokeRect(sx, top, sw + 0.5, y + r * 0.8 - top);
  }
  ctx.restore();
}

// A player-placed NAMED MAP MARK: a small flag pin with its name beside it. Used
// for Tibia-style "I was here, I'll come back" notes. On the corner map only the
// pin is drawn (no room for text); the big map shows the label too.
function drawMapMark(ctx, x, y, name, legend) {
  ctx.save();
  // Flag pole.
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 9); ctx.stroke();
  // Flag pennant.
  ctx.fillStyle = '#ffd24d'; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y - 7); ctx.lineTo(x, y - 5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Base dot.
  ctx.fillStyle = '#ffd24d';
  ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
  // Label (big map only, to keep the corner map uncluttered).
  if (!legend && name) {
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(name).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x + 5, y - 16, tw + 6, 14);
    ctx.fillStyle = '#fff';
    ctx.fillText(name, x + 8, y - 9);
  }
  ctx.restore();
}

// Map terrain color. This now reads the real BIOME (the same one the 3D ground
// uses), not just the height, so the desert shows up as sand and the whole snow
// region as white — instead of everything below the high peaks reading as green.
function terrainColor(world, x, z) {
  const h = world.heightAt(x, z);
  if (h < -0.8) return '#2f6fa8';            // deep water
  if (h < 0.6) return '#cdbd86';             // beach / shoreline sand
  const biome = world.biomeAt(x, z, h);
  switch (biome) {
    case 'desert':   return h > 16 ? '#b08a5a' : '#dcc483';   // dune sand (dry rock up high)
    case 'snow':     return h > 18 ? '#ffffff' : '#e6edf2';   // snowfield (white ONLY here)
    // Mountains stay GREY rock everywhere outside the snow region — no white
    // snowcaps, so a peak in the west or south never looks like snow.
    case 'mountain': return '#8a877f';
    default:                                                  // forest
      if (h > 19) return '#8a877f';          // bare rocky highland
      return h > 8 ? '#4a8f44' : '#57a14d';  // grass
  }
}
