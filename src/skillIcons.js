// Procedural pixel-art SKILL icon generator. The exact sibling of itemIcons.js
// and creatureIcons.js: no external assets, no DOM dependency at module load —
// everything is drawn into a tiny SVG string at call time and cached. Each
// skill gets a DISTINCT glyph derived from its `fx` string (29 of them) and
// tinted from its `fxColor`, so a single arrow never looks like a meteor and a
// fire bolt reads warm while an ice nova reads cold.
//
// Output contract: skillIcon(skill) -> an HTML string (an inline <svg>) that
// drops straight into innerHTML wherever the skill panel printed an emoji.
// Mirrors iconFor(item) exactly: Map cache, defensive try/catch, never blank.
//
// Kept SELF-CONTAINED on purpose (the tiny colour helpers, the Painter class
// and the gem helper are duplicated from itemIcons.js, exactly as
// creatureIcons.js already does) so this file has zero imports and can be loaded
// anywhere — skill panel, hotbar, wiki — without coupling the icon engines.

// ---------------------------------------------------------------------------
// Colour helpers — operate on 0xRRGGBB integers and #rrggbb strings. Same
// engine as itemIcons.js / creatureIcons.js. (fxColor is a hex INT, which
// hexStr handles.)
// ---------------------------------------------------------------------------
const GRID = 16; // logical pixel grid; the SVG viewBox is 0 0 16 16

function hexStr(c) {
  if (typeof c === 'string') return c[0] === '#' ? c : '#' + c;
  return '#' + (c & 0xffffff).toString(16).padStart(6, '0');
}
function toRGB(c) {
  const n = typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : (c & 0xffffff);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function fromRGB(r, g, b) {
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + ((cl(r) << 16) | (cl(g) << 8) | cl(b)).toString(16).padStart(6, '0');
}
// Lighten (f>1) or darken (f<1) a colour by scaling toward white/black.
function shade(c, f) {
  const { r, g, b } = toRGB(c);
  if (f >= 1) {
    const t = f - 1;
    return fromRGB(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
  }
  return fromRGB(r * f, g * f, b * f);
}
// A readable dark outline derived from the base colour (never pure black so it
// reads on dark UI too).
function outline(c) { return shade(c, 0.32); }
function mix(a, b, t) {
  const x = toRGB(a), y = toRGB(b);
  return fromRGB(x.r + (y.r - x.r) * t, x.g + (y.g - x.g) * t, x.b + (y.b - x.b) * t);
}

// A warm tint, biased toward orange — for fire/flame motifs derived from a base
// accent that may be cool (e.g. a fire arrow whose fxColor is still blueish).
function warm(c) { return mix(c, '#ff7a2a', 0.5); }

// ---------------------------------------------------------------------------
// Tiny SVG painter (duplicated from itemIcons.js). Accumulate <rect>/primitive
// pixels in the 16-grid, then wrap in an <svg>. crispEdges keeps it sharp.
// ---------------------------------------------------------------------------
class Painter {
  constructor() { this.parts = []; }
  px(x, y, color, w = 1, h = 1, op = 1) {
    const o = op === 1 ? '' : ` opacity="${op}"`;
    this.parts.push(`<rect x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${+h.toFixed(2)}" fill="${color}"${o}/>`);
  }
  rectO(x, y, w, h, fill, stroke) {
    this.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="0.6"/>`);
  }
  circle(cx, cy, r, fill, stroke) {
    const s = stroke ? ` stroke="${stroke}" stroke-width="0.6"` : '';
    this.parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${s}/>`);
  }
  poly(points, fill, stroke) {
    const s = stroke ? ` stroke="${stroke}" stroke-width="0.6" stroke-linejoin="round"` : '';
    this.parts.push(`<polygon points="${points}" fill="${fill}"${s}/>`);
  }
  line(x1, y1, x2, y2, color, w = 1) {
    this.parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`);
  }
  // A free-form SVG path stroke (curved blade arcs, vines, spirals).
  path(d, color, w = 1) {
    this.parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  // A thick stroke with an outline pass + lighter glint stripe — gives shafts,
  // lances and blades a lit edge for free.
  bar(x1, y1, x2, y2, w, color) {
    this.line(x1, y1, x2, y2, outline(color), w + 0.7);
    this.line(x1, y1, x2, y2, color, w);
    this.line(x1, y1, x2, y2, shade(color, 1.5), Math.max(0.5, w * 0.32));
  }
  svg() {
    return `<svg class="pxico" viewBox="0 0 ${GRID} ${GRID}" width="100%" height="100%" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${this.parts.join('')}</svg>`;
  }
}

// A small gem / spark mote. Same shape as the itemIcons gem.
function gem(p, x, y, r, color) {
  p.poly(`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`, color, outline(color));
  p.px(x - r * 0.35, y - r * 0.45, shade(color, 1.7), r * 0.5, r * 0.5, 0.9);
}

// A faint radial disc drawn FIRST behind every active skill so the bright glyph
// reads on dark UI. Same opacity-rewrite trick as itemIcons.addRarityGlow.
function halo(p, c, op = 0.16) {
  p.circle(8, 8, 7.2, c, null);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` opacity="${op}"/>`);
}

// An arrow primitive: shaft + filled head + two fletch lines at the tail. Shared
// by the whole arrow/bow family so every arrow reads the same way.
function arrow(p, x1, y1, x2, y2, c) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;       // unit along the shaft
  const px = -uy, py = ux;                   // perpendicular
  p.bar(x1, y1, x2, y2, 1.1, c);
  // Filled triangular head at the tip.
  const hb = 2.0, hw = 1.4;                  // head back distance / half-width
  const bx = x2 - ux * hb, by = y2 - uy * hb;
  p.poly(
    `${x2},${y2} ${(bx + px * hw).toFixed(2)},${(by + py * hw).toFixed(2)} ${(bx - px * hw).toFixed(2)},${(by - py * hw).toFixed(2)}`,
    shade(c, 1.4), outline(c)
  );
  // Two fletches at the tail.
  p.line(x1, y1, x1 + ux * 1.6 + px * 1.3, y1 + uy * 1.6 + py * 1.3, outline(c), 0.7);
  p.line(x1, y1, x1 + ux * 1.6 - px * 1.3, y1 + uy * 1.6 - py * 1.3, outline(c), 0.7);
}

// ===========================================================================
// The 29 fx recipes. Each is DISTINCT and derives its whole palette from one
// base accent colour (skill.fxColor). Signature: (p, skill) -> void.
// ===========================================================================

// --- Arrow / bow family ----------------------------------------------------

function fxSingleArrow(p, c) {
  arrow(p, 4.0, 12.0, 12.5, 3.5, c);
}

function fxArrowFan(p, c) {
  // Three diverging arrows sharing a tail at bottom-centre.
  const lit = shade(c, 1.4);
  arrow(p, 8, 14, 3.5, 4.5, c);   // NW
  arrow(p, 8, 14, 8, 2.5, lit);   // N
  arrow(p, 8, 14, 12.5, 4.5, c);  // NE
}

function fxHeavyArrow(p, c) {
  // One thick arrow + two motion streaks behind the tail (knockback gust).
  arrow(p, 5.0, 11.0, 13.0, 4.5, c);
  p.line(2.0, 13.0, 5.2, 11.4, shade(c, 0.7), 0.8);
  p.line(2.6, 14.0, 5.8, 12.4, shade(c, 0.6), 0.7);
}

function fxExplosiveArrow(p, c) {
  // Arrow into a starburst at the tip + a warm flame core.
  arrow(p, 3.5, 13.0, 11.0, 5.5, c);
  const sp = warm(c);
  p.poly('11.5,2.0 12.4,4.6 14.8,4.0 12.8,5.6 13.6,8.0 11.6,6.6 9.6,8.0 10.6,5.6 8.8,4.0 11.0,4.6', sp, outline(sp));
  p.circle(11.5, 5.0, 1.2, shade(warm(c), 1.4), null);
}

function fxArrowRain(p, c) {
  // 4 short arrows angled steeply downward + 3 ground-impact ticks.
  const xs = [3.5, 6.5, 9.5, 12.5], ys = [2.5, 1.5, 2.5, 1.5];
  for (let i = 0; i < 4; i++) arrow(p, xs[i] - 1.4, ys[i], xs[i] + 1.0, ys[i] + 6.0, c);
  for (const tx of [5.0, 8.0, 11.0]) {
    p.line(tx - 0.8, 14.4, tx, 13.4, shade(c, 1.3), 0.7);
    p.line(tx + 0.8, 14.4, tx, 13.4, shade(c, 1.3), 0.7);
  }
}

function fxFireArrow(p, c) {
  // Arrow whose head is a flame (orange tip, yellow inner) + trailing embers.
  p.bar(3.5, 13.0, 10.5, 6.0, 1.1, c);
  const fl = warm(c);
  p.poly('10.5,6.0 13.2,2.4 11.6,5.6 13.6,5.0 11.0,7.6', fl, outline(fl));
  p.poly('11.2,5.4 12.4,3.6 11.4,6.2', shade(fl, 1.6), null); // yellow inner
  p.px(5.0, 11.6, fl, 0.9, 0.9, 0.9); // ember
  p.px(3.6, 12.6, shade(fl, 1.3), 0.8, 0.8, 0.85);
}

// --- Beam / wind -----------------------------------------------------------

function fxPierceBeam(p, c) {
  // A horizontal lance across the icon + faint after-image above.
  p.line(2.0, 6.0, 13.0, 6.0, shade(c, 0.7), 0.8);   // after-image
  p.bar(2.0, 8.5, 12.5, 8.5, 1.6, c);                // main lance
  p.poly('12.5,8.5 14.6,7.0 14.6,10.0', shade(c, 1.4), outline(c)); // head at right
}

function fxHurricane(p, c) {
  // Dense cone of 5 thin arrow shafts fanning right with slight curve.
  const lit = shade(c, 1.5);
  for (let i = 0; i < 5; i++) {
    const y = 4.0 + i * 2.0;
    const cy = 8.0 + (y - 8.0) * 0.45; // converge toward centre at the tip
    p.bar(2.5, y, 12.5, cy, 0.8, i % 2 ? lit : c);
    p.poly(`${14.4},${cy} ${13.2},${cy - 1.0} ${13.2},${cy + 1.0}`, shade(c, 1.4), outline(c));
  }
}

// --- Bolt / magic ----------------------------------------------------------

function fxMagicBolt(p, c) {
  // A glowing orb with 3 short radiating sparks (basic energy bolt).
  const lit = shade(c, 1.6);
  p.circle(8, 8, 3.0, c, outline(c));
  p.circle(7.0, 7.0, 1.0, lit, null);
  for (const a of [-0.4, 1.0, 2.4]) {
    p.line(8 + Math.cos(a) * 4.0, 8 + Math.sin(a) * 4.0, 8 + Math.cos(a) * 6.4, 8 + Math.sin(a) * 6.4, lit, 0.8);
  }
}

function fxTwinBolt(p, c) {
  // Two parallel diagonal claw-streaks with sparks at the tips.
  const lit = shade(c, 1.5);
  p.bar(3.5, 12.5, 11.0, 4.0, 1.0, c);
  p.bar(6.0, 13.0, 13.5, 4.5, 1.0, lit);
  gem(p, 11.2, 3.8, 0.9, lit);
  gem(p, 13.7, 4.3, 0.9, lit);
}

function fxLightning(p, c) {
  // A zigzag bolt top->bottom, white inner glint, small fork branch.
  const pts = '9,1.5 6.5,7 8.5,7 5.5,14.5';
  p.poly('9,1.5 6.5,7 8.5,7 5.5,14.5 7.2,7.6 5.2,7.6', outline(c), null); // body
  p.path('M9 1.5 L6.5 7 L8.5 7 L5.5 14.5', c, 1.6);
  p.path('M9 1.5 L6.5 7 L8.5 7 L5.5 14.5', shade(c, 1.7), 0.5); // glint
  p.line(8.0, 7.0, 11.0, 9.5, c, 1.0); // fork branch
}

// --- Area / elemental ------------------------------------------------------

function fxPoisonCloud(p, c) {
  // 3 overlapping low-opacity bubbles + 2 drip pixels below.
  const blobs = [[8, 7.5, 3.6, 0.8], [5.4, 8.6, 2.4, 0.55], [10.6, 8.6, 2.4, 0.55]];
  for (const [cx, cy, r, op] of blobs) {
    p.circle(cx, cy, r, c, null);
    p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` opacity="${op}"/>`);
  }
  p.circle(6.6, 6.4, 0.8, shade(c, 1.5), null); // shine
  p.px(6.4, 12.4, c, 0.9, 1.6, 0.8); // drips
  p.px(9.6, 12.8, c, 0.9, 1.4, 0.7);
}

function fxExplosion(p, c) {
  // Spiky 8-point starburst + bright core + 3 debris pixels.
  let pts = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 2.4 : 6.4;
    pts += `${(8 + Math.cos(a) * r).toFixed(2)},${(8 + Math.sin(a) * r).toFixed(2)} `;
  }
  p.poly(pts.trim(), c, outline(c));
  p.circle(8, 8, 2.2, shade(c, 1.6), null);
  for (const [dx, dy] of [[-5.6, -4.4], [5.8, 4.2], [4.6, -5.4]]) p.px(8 + dx, 8 + dy, shade(c, 1.3), 0.9, 0.9, 0.9);
}

function fxIceNova(p, c) {
  // Central hub with 6 radiating ice spikes on a ring + pale glints.
  const lit = mix(c, '#ffffff', 0.5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bx = 8 + Math.cos(a) * 2.0, by = 8 + Math.sin(a) * 2.0;
    const tx = 8 + Math.cos(a) * 6.6, ty = 8 + Math.sin(a) * 6.6;
    const px = -Math.sin(a), py = Math.cos(a);
    p.poly(`${tx.toFixed(2)},${ty.toFixed(2)} ${(bx + px).toFixed(2)},${(by + py).toFixed(2)} ${(bx - px).toFixed(2)},${(by - py).toFixed(2)}`, c, outline(c));
  }
  p.circle(8, 8, 2.0, lit, outline(c));
  p.circle(7.3, 7.3, 0.7, '#ffffff', null);
}

function fxBlizzard(p, c) {
  // Diagonal snow streaks + scattered snowflake pixels + 2 spike clusters.
  const lit = mix(c, '#ffffff', 0.4);
  for (const x of [3.5, 6.0, 8.5, 11.0]) p.line(x, 2.0, x - 2.4, 9.0, lit, 0.7);
  for (const [fx, fy] of [[5.0, 4.5], [9.5, 3.5], [7.0, 7.5], [11.0, 6.0], [4.0, 8.0]]) p.px(fx, fy, '#ffffff', 0.8, 0.8, 0.9);
  for (const cx of [5.5, 10.0]) {
    p.poly(`${cx},10.5 ${cx - 1.0},13.8 ${cx + 1.0},13.8`, c, outline(c));
    p.line(cx, 11.0, cx, 13.5, lit, 0.5);
  }
}

function fxMeteor(p, c) {
  // Dark rock descending from NE + trailing flame + impact spark lower-left.
  const rock = shade(c, 0.55), fl = warm(c);
  p.poly('14.5,1.5 11.5,2.5 12.0,5.0 14.0,4.5', fl, null);       // flame trail
  p.poly('13.5,3.0 11.0,4.0 11.5,6.5 13.5,6.0', shade(fl, 1.5), null);
  p.circle(8.5, 8.5, 2.8, rock, outline(rock));                  // rock
  p.circle(7.4, 7.6, 0.9, shade(rock, 0.8), null);               // crater
  p.px(9.4, 9.2, shade(rock, 0.7), 0.9, 0.9, 0.8);
  // impact spark
  p.poly('4.5,12.5 5.4,13.4 4.0,14.0 3.2,13.0', shade(fl, 1.4), null);
  p.line(3.0, 14.5, 6.0, 14.5, fl, 0.7);
}

function fxFrozenOrb(p, c) {
  // Layered ice sphere ringed by 4 tiny shards.
  const lit = mix(c, '#ffffff', 0.55);
  p.circle(8, 8, 5.6, c, null);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.3"/>'); // halo
  p.circle(8, 8, 3.4, c, outline(c));
  p.circle(8, 8, 1.8, lit, null);
  p.circle(7.2, 7.2, 0.7, '#ffffff', null); // highlight
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const x = 8 + Math.cos(a) * 6.0, y = 8 + Math.sin(a) * 6.0;
    p.poly(`${x.toFixed(2)},${(y - 1.0).toFixed(2)} ${(x + 0.9).toFixed(2)},${(y + 0.6).toFixed(2)} ${(x - 0.9).toFixed(2)},${(y + 0.6).toFixed(2)}`, lit, outline(c));
  }
}

function fxHolyNova(p, c) {
  // Radiant sunburst: bright central core with 8 alternating rays + pale halo.
  const lit = mix(c, '#ffffff', 0.6);
  p.circle(8, 8, 6.8, lit, null);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.18"/>');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 ? 4.6 : 6.8;
    p.line(8 + Math.cos(a) * 2.2, 8 + Math.sin(a) * 2.2, 8 + Math.cos(a) * r, 8 + Math.sin(a) * r, lit, i % 2 ? 0.7 : 1.0);
  }
  gem(p, 8, 8, 2.2, lit);
  p.circle(8, 8, 0.9, '#ffffff', null);
}

// --- Melee / slash ---------------------------------------------------------

function fxSlashArc(p, c) {
  // A single curved blade-sweep + trailing motion dots.
  p.path('M3 12 Q 9 3 14 6.5', outline(c), 2.6);
  p.path('M3 12 Q 9 3 14 6.5', c, 1.6);
  p.path('M3 12 Q 9 3 14 6.5', shade(c, 1.7), 0.5);
  p.px(3.6, 13.0, c, 0.8, 0.8, 0.7);
  p.px(2.4, 11.4, shade(c, 0.8), 0.7, 0.7, 0.6);
}

function fxDoubleSlash(p, c) {
  // Two crossed slash arcs forming an X + a spark where they cross.
  p.path('M3 4 Q 8 8 13 13', outline(c), 2.2);
  p.path('M3 4 Q 8 8 13 13', c, 1.3);
  p.path('M13 4 Q 8 8 3 13', outline(c), 2.2);
  p.path('M13 4 Q 8 8 3 13', shade(c, 1.4), 1.3);
  gem(p, 8, 8.5, 1.3, shade(c, 1.7));
}

function fxHeavySmash(p, c) {
  // A downward impact wedge + radiating crack lines + dust pixels at base.
  p.poly('8,2 10.5,9 8,11 5.5,9', c, outline(c)); // wedge
  p.line(7.0, 6.0, 8.4, 4.0, shade(c, 1.6), 0.6); // glint
  for (const a of [-2.4, -1.6, -1.0]) {
    p.line(8, 11, 8 + Math.cos(a) * 5.0, 12.0 - Math.sin(a) * 3.0, shade(c, 0.8), 0.7);
  }
  p.line(8, 11, 3.0, 13.0, shade(c, 0.8), 0.7);
  p.line(8, 11, 13.0, 13.0, shade(c, 0.8), 0.7);
  p.px(4.5, 13.6, shade(c, 1.2), 0.8, 0.8, 0.7);
  p.px(11.0, 13.6, shade(c, 1.2), 0.8, 0.8, 0.7);
}

function fxShockwave(p, c) {
  // Concentric rings of increasing r (decreasing opacity) + centre dot.
  const rings = [[6.6, 0.4], [4.6, 0.6], [2.6, 0.85]];
  for (const [r, op] of rings) {
    p.circle(8, 8, r, 'none', c);
    p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` opacity="${op}"/>`);
  }
  p.circle(8, 8, 1.1, shade(c, 1.5), outline(c));
}

function fxWhirlwind(p, c) {
  // A spiral path + 3 small blades placed around it at rotated angles.
  p.path('M8 8 Q 9.5 5.5 7 4.5 Q 3.5 3.5 3.5 7.5 Q 3.5 12.5 8.5 12.5 Q 13 12.5 13 7.5', c, 1.4);
  p.path('M8 8 Q 9.5 5.5 7 4.5 Q 3.5 3.5 3.5 7.5 Q 3.5 12.5 8.5 12.5 Q 13 12.5 13 7.5', shade(c, 1.7), 0.4);
  const lit = shade(c, 1.4);
  p.poly('12.6,7.0 14.4,6.4 13.4,8.4', lit, outline(c));
  p.poly('3.0,9.0 1.4,9.6 2.6,7.6', lit, outline(c));
  p.poly('8.6,12.8 8.2,14.6 10.0,13.4', lit, outline(c));
}

function fxRoar(p, c) {
  // Open-mouth shout: nested chevrons opening rightward (sound cone) widening
  // outward + 2 emphasis dots.
  const lit = shade(c, 1.4);
  p.poly('3.5,8 6.5,4.5 6.5,11.5', c, outline(c)); // mouth wedge
  for (let i = 0; i < 3; i++) {
    const x = 7.5 + i * 2.0, h = 2.0 + i * 1.6;
    p.path(`M${x} ${8 - h} L${x + 1.4} 8 L${x} ${8 + h}`, i % 2 ? lit : c, 1.2);
  }
  p.px(13.6, 4.5, lit, 0.9, 0.9, 0.85);
  p.px(13.6, 10.6, lit, 0.9, 0.9, 0.85);
}

// --- Heal / nature / summon / buff -----------------------------------------

function fxSelfHeal(p, c) {
  // A plus-cross + a sparkle top-right + rising sparkle pixels.
  const lit = shade(c, 1.5);
  p.px(6.6, 4.0, c, 2.8, 8.0);  // vertical bar
  p.px(4.0, 6.6, c, 8.0, 2.8);  // horizontal bar
  p.px(7.0, 4.4, lit, 2.0, 0.8, 0.7); // glint
  gem(p, 12.4, 4.0, 1.3, lit); // sparkle
  p.px(3.2, 9.0, lit, 0.8, 0.8, 0.8);
  p.px(11.4, 11.0, lit, 0.8, 0.8, 0.7);
}

function fxHealNova(p, c) {
  // A cross at centre inside an expanding ring + 4 small + ticks around it.
  const lit = shade(c, 1.5);
  p.circle(8, 8, 6.4, 'none', c);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.5"/>');
  p.px(7.0, 5.4, c, 2.0, 5.2);
  p.px(5.4, 7.0, c, 5.2, 2.0);
  for (const [tx, ty] of [[8, 1.6], [8, 14.4], [1.6, 8], [14.4, 8]]) {
    p.px(tx - 0.7, ty - 0.25, lit, 1.4, 0.5, 0.9);
    p.px(tx - 0.25, ty - 0.7, lit, 0.5, 1.4, 0.9);
  }
}

function fxVineBurst(p, c) {
  // 2-3 curved vines sprouting upward + thorn branches + a leaf.
  const lit = shade(c, 1.4), dk = shade(c, 0.8);
  p.path('M5 15 Q 3 9 6 4', c, 1.6);
  p.path('M8 15 Q 9 8 7 3', dk, 1.5);
  p.path('M11 15 Q 13 9 10 5', lit, 1.4);
  // thorns
  p.line(4.3, 10.0, 3.0, 9.0, c, 0.6);
  p.line(8.6, 9.0, 10.0, 8.2, dk, 0.6);
  p.line(11.6, 9.5, 13.0, 9.0, lit, 0.6);
  // leaf
  p.poly('6,4 8.4,2.2 7.6,5.0', lit, outline(c));
  p.poly('10,5 12.4,3.6 10.6,6.4', c, outline(c));
}

function fxSummonPoof(p, c) {
  // A puff cloud with a small pawprint inside + 3 sparkle pixels.
  const blobs = [[8, 9, 3.4, 0.75], [5.4, 9.6, 2.2, 0.55], [10.6, 9.6, 2.2, 0.55], [8, 6.8, 2.2, 0.5]];
  for (const [cx, cy, r, op] of blobs) {
    p.circle(cx, cy, r, c, null);
    p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` opacity="${op}"/>`);
  }
  const paw = outline(c);
  p.circle(8, 10.4, 1.2, paw, null);              // heel pad
  for (const [dx, dy] of [[-1.4, -1.2], [-0.5, -1.7], [0.5, -1.7], [1.4, -1.2]]) p.circle(8 + dx, 9.0 + dy, 0.55, paw, null); // toes
  p.px(3.0, 5.0, shade(c, 1.6), 0.9, 0.9, 0.9);   // sparkles
  p.px(13.0, 5.2, shade(c, 1.6), 0.9, 0.9, 0.85);
  p.px(12.4, 12.0, shade(c, 1.6), 0.8, 0.8, 0.8);
}

function fxSelfBuff(p, c) {
  // Two stacked upward chevrons rising from a base bar + an aura glow.
  halo(p, c, 0.18);
  const lit = shade(c, 1.5);
  p.path('M4 8 L8 3.5 L12 8', c, 1.8);   // upper chevron
  p.path('M4 8 L8 3.5 L12 8', shade(c, 1.7), 0.5);
  p.path('M4 12 L8 7.5 L12 12', lit, 1.6); // lower chevron
  p.px(5.0, 13.4, c, 6.0, 1.2); // base bar
}

// ---------------------------------------------------------------------------
// fx -> painter map. All 29 keys present, so known data NEVER hits the
// kind-based fallback. Each painter receives (p, c) where c is the base accent.
// ---------------------------------------------------------------------------
const FX_PAINTERS = {
  single_arrow: fxSingleArrow, arrow_fan: fxArrowFan, heavy_arrow: fxHeavyArrow,
  explosive_arrow: fxExplosiveArrow, arrow_rain: fxArrowRain, fire_arrow: fxFireArrow,
  pierce_beam: fxPierceBeam, hurricane: fxHurricane,
  magic_bolt: fxMagicBolt, twin_bolt: fxTwinBolt, lightning: fxLightning,
  poison_cloud: fxPoisonCloud, explosion: fxExplosion, ice_nova: fxIceNova,
  blizzard: fxBlizzard, meteor: fxMeteor, frozen_orb: fxFrozenOrb, holy_nova: fxHolyNova,
  slash_arc: fxSlashArc, double_slash: fxDoubleSlash, heavy_smash: fxHeavySmash,
  shockwave: fxShockwave, whirlwind: fxWhirlwind, roar: fxRoar,
  self_heal: fxSelfHeal, heal_nova: fxHealNova, vine_burst: fxVineBurst,
  summon_poof: fxSummonPoof, self_buff: fxSelfBuff,
  // Directional waves (fire/energy/ice/poison cone) reuse the shockwave painter —
  // a forward-arc burst reads correctly for a cone.
  wave: fxShockwave,
};

// Startup completeness assert: the 29 fx strings shipped in data/professions.js
// must each have a painter, so no active skill ever hits the kind fallback.
const FX_KEYS = [
  'single_arrow', 'arrow_fan', 'heavy_arrow', 'explosive_arrow', 'arrow_rain', 'fire_arrow',
  'pierce_beam', 'hurricane', 'magic_bolt', 'twin_bolt', 'lightning', 'poison_cloud',
  'explosion', 'ice_nova', 'blizzard', 'meteor', 'frozen_orb', 'holy_nova', 'slash_arc',
  'double_slash', 'heavy_smash', 'shockwave', 'whirlwind', 'roar', 'self_heal', 'heal_nova',
  'vine_burst', 'summon_poof', 'self_buff', 'wave',
];
for (const k of FX_KEYS) {
  if (!FX_PAINTERS[k]) throw new Error(`skillIcons: fx "${k}" has no painter`);
}

// ---------------------------------------------------------------------------
// Kind-based safety net for any FUTURE fx string not in the map above. Keyed
// off skill.kind so something always draws — guarantees no blank fallback.
// ---------------------------------------------------------------------------
function paintByKind(p, skill, c) {
  switch (skill.kind) {
    case 'area': return fxExplosion(p, c);
    case 'melee': return fxSlashArc(p, c);
    case 'ranged': return fxSingleArrow(p, c);
    case 'heal': return fxSelfHeal(p, c);
    case 'summon': return fxSummonPoof(p, c);
    case 'buff': return fxSelfBuff(p, c);
    default: return fxMagicBolt(p, c);
  }
}

// ---------------------------------------------------------------------------
// Passive glyph (no blank fallback). Passives carry no fx and no fxColor, so the
// default accent applies. A cog + aura reads clearly as "not an active skill".
// Optionally tinted by which passive stat it boosts so they aren't identical.
// ---------------------------------------------------------------------------
function passiveTint(skill) {
  const pv = skill.passive || {};
  if (pv.maxHpPerLevel) return 0xff6a5a;                      // HP -> red
  if (pv.maxManaPerLevel) return 0x6fa8ff;                    // mana -> blue
  if (pv.critPerLevel || pv.critDamagePerLevel) return 0xffd24d; // crit -> gold
  if (pv.attackSpeedPerLevel || pv.rangePerLevel) return 0x7bed6f; // speed -> green
  return 0x9fd0ff;
}

function paintPassive(p, skill) {
  const c = hexStr(skill.fxColor ?? passiveTint(skill));
  halo(p, c, 0.14);
  // gear/cog glyph: outer ring of 8 teeth + hub.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.px(8 + Math.cos(a) * 5 - 0.6, 8 + Math.sin(a) * 5 - 0.6, c, 1.2, 1.2);
  }
  p.circle(8, 8, 3.4, shade(c, 0.9), outline(c));
  p.circle(8, 8, 1.4, shade(c, 1.5), outline(c)); // hub bore
  gem(p, 11.5, 4.5, 1.1, mix(c, '#ffffff', 0.4)); // aura spark accent
}

// ---------------------------------------------------------------------------
// Dispatch.
// ---------------------------------------------------------------------------
function paintSkill(p, skill) {
  // Passives never have an fx -> dedicated cog/aura glyph.
  if (skill.kind === 'passive' || !skill.fx) return paintPassive(p, skill);
  const c = hexStr(skill.fxColor ?? 0x9fd0ff);
  halo(p, c, 0.16); // faint disc behind every active skill so it reads on dark UI
  const fn = FX_PAINTERS[skill.fx];
  if (fn) return fn(p, c, skill);
  return paintByKind(p, skill, c); // kind-based fallback — NEVER blank
}

// ---------------------------------------------------------------------------
// Public API with a string cache keyed by the visually-relevant fields only.
// Mirrors iconFor() / creatureIcon(): Map cache, defensive try/catch.
// ---------------------------------------------------------------------------
const cache = new Map();

function cacheKey(skill) {
  return [skill.fx || '', skill.kind || '', (skill.fxColor ?? ''), skill.passive ? 'P' : ''].join('|');
}

// Returns an inline <svg> string for the given skill record. Mirrors iconFor().
export function skillIcon(skill) {
  if (!skill) return '';
  const key = cacheKey(skill);
  let svg = cache.get(key);
  if (svg) return svg;
  const p = new Painter();
  try { paintSkill(p, skill); } catch (_) { /* leave whatever drew */ }
  // Defensive fallback: a skill that somehow drew nothing still gets a tile.
  if (!p.parts.length) {
    const c = hexStr(skill.fxColor ?? 0x9fd0ff);
    p.rectO(2, 2, 12, 12, c, outline(c));
    p.px(6, 6, '#fff', 4, 4, 0.6);
  }
  svg = p.svg();
  cache.set(key, svg);
  return svg;
}
