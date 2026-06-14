// Procedural pixel-art icon generator. No external assets, no DOM dependency at
// module load — everything is drawn into a tiny SVG string at call time and
// cached. Each item gets a DISTINCT look derived from its data (type/slot/kind,
// baseId tier, element, rarity, color) so a Wooden Sword never looks like an
// Excalibur and a fire wand never looks like a water wand.
//
// Output contract: iconFor(item) -> an HTML string (an inline <svg>) that can be
// dropped straight into innerHTML wherever the UI used to print an emoji. That
// keeps drag-drop, count badges and tooltips working untouched.

// ---------------------------------------------------------------------------
// Colour helpers — all operate on 0xRRGGBB integers and #rrggbb strings.
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

// Element accent colours used for glints, gems, runes and elemental motifs.
const ELEMENT_COLOR = {
  fire: '#ff6a2a', water: '#3fb6ff', plant: '#4fd06a', none: null,
};
const RARITY_GLOW = {
  legendary: '#ffd34d', elite: '#7fe0ff', normal: null,
};

// ---------------------------------------------------------------------------
// Tier inference — most weapons/armor have no explicit tier number, only a
// levelReq and a colour. We derive a 0..1 "tier" so higher gear gets fancier
// pixels (gems, runes, glints, ornate guards) on top of its colour.
// ---------------------------------------------------------------------------
function tier01(item) {
  const lvl = item.levelReq || 1;
  return Math.max(0, Math.min(1, (lvl - 1) / 139));
}

// ---------------------------------------------------------------------------
// Tiny SVG painter. We accumulate <rect> pixels and a few primitives, then wrap
// in an <svg>. Coordinates are in the 16-grid; sub-pixel rects are allowed for
// smoother diagonals. crispEdges keeps it pixel-sharp.
// ---------------------------------------------------------------------------
class Painter {
  constructor() { this.parts = []; }
  // A single pixel (or block) at grid x,y with size w,h.
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
  // A diagonal blade/bar drawn as a thick stroke with a lighter glint stripe.
  bar(x1, y1, x2, y2, w, color) {
    this.line(x1, y1, x2, y2, outline(color), w + 0.7);
    this.line(x1, y1, x2, y2, color, w);
    this.line(x1, y1, x2, y2, shade(color, 1.5), Math.max(0.5, w * 0.32));
  }
  svg() {
    return `<svg class="pxico" viewBox="0 0 ${GRID} ${GRID}" width="100%" height="100%" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${this.parts.join('')}</svg>`;
  }
}

// Add a glow halo behind legendary/elite items (drawn first, low opacity).
function addRarityGlow(p, item) {
  const g = RARITY_GLOW[item.rarity];
  if (!g) return;
  p.circle(8, 8, 7.4, g, null);
  // Overwrite the disc with transparency by reusing opacity on the rect base.
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.18"/>');
}

// A small elemental/rarity gem placed on weapons that warrant one.
function gem(p, x, y, r, color) {
  p.poly(`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`, color, outline(color));
  p.px(x - r * 0.35, y - r * 0.45, shade(color, 1.7), r * 0.5, r * 0.5, 0.9);
}

// ---------------------------------------------------------------------------
// Per-baseId shape variants. Sparse: only weapons that should deviate from the
// type's default silhouette are listed. Unlisted ids fall through to the type
// default (which reproduces the old geometry), so they render unchanged.
// ---------------------------------------------------------------------------
const SHAPE_VARIANT = {
  // --- swords ---
  dagger: 'dagger', wooden_sword: 'short', training_sword: 'short', short_sword: 'short',
  copper_sword: 'short', rapier: 'rapier', sabre: 'curved', serpent_sword: 'curved',
  frost_blade: 'curved', broadsword: 'broad', knight_sword: 'broad', steel_sword: 'broad',
  crystal_sword: 'great', dragon_sword: 'great', hellforged_blade: 'great', demon_sword: 'great',
  soul_reaver: 'great', celestial_sword: 'great', excalibur: 'excalibur',
  // --- axes ---
  halberd: 'halberd', reaper_scythe: 'scythe', mining_pick: 'pick', rusty_axe: 'hatchet',
  hand_axe: 'hatchet', hatchet: 'hatchet', copper_axe: 'hatchet',
  double_axe: 'double', war_axe: 'double', titan_axe: 'great_axe', worldsplitter: 'great_axe',
  apocalypse_axe: 'great_axe', guardian_axe: 'great_axe',
  // --- bows ---
  short_bow: 'short', training_bow: 'short', wooden_bow: 'short', long_bow: 'long',
  hunter_bow: 'long', recurve_bow: 'recurve', composite_bow: 'recurve', eternal_bow: 'recurve',
  genesis_bow: 'recurve',
  // --- wands ---
  twig_wand: 'wand', apprentice_wand: 'wand', arcane_wand: 'wand', void_wand: 'wand',
  aqua_wand: 'wand', snakebite_rod: 'rod', moonlight_rod: 'rod', spellbinder_rod: 'rod',
  mystic_staff: 'staff', glacial_staff: 'staff', staff_of_blight: 'staff', staff_of_flames: 'staff',
  staff_of_chaos: 'staff', cosmic_staff: 'staff', genesis_staff: 'staff',
  // --- shields ---
  buckler: 'buckler', wooden_shield: 'round', studded_shield: 'round',
  tower_shield: 'tower', plate_shield: 'tower', mastermind_shield: 'tower',
  aegis_shield: 'aegis', celestial_shield: 'aegis', crown_shield: 'crown',
};

function variantOf(item, dflt) { return SHAPE_VARIANT[item.baseId] || dflt; }

// ---------------------------------------------------------------------------
// Weapon painters. Each returns nothing; draws onto p. They vary shape detail
// by tier (t in 0..1) and decorate with element/rarity accents.
// ---------------------------------------------------------------------------
function paintSword(p, item, t) {
  const c = hexStr(item.color);
  const blade = c;
  const v = variantOf(item, 'std');
  let guardC = t > 0.55 ? '#f0d878' : '#c8a24a';
  const gripC = '#3a2414';
  const el = ELEMENT_COLOR[item.element];

  // --- Iconic aura behind the blade (excalibur / celestial) drawn first. ---
  if (v === 'excalibur') {
    guardC = '#ffe066';
    p.circle(9, 7, 6, '#ffe066', null);
    p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.22"/>');
  }

  // --- Blade silhouette per variant. ---
  if (v === 'curved') {
    // Single-edged saber: two strokes along a curved path.
    p.parts.push(`<path d="M4.5 12 Q 9 8 13.4 2.6" fill="none" stroke="${outline(blade)}" stroke-width="2.6" stroke-linecap="round"/>`);
    p.parts.push(`<path d="M4.5 12 Q 9 8 13.4 2.6" fill="none" stroke="${blade}" stroke-width="1.7" stroke-linecap="round"/>`);
    p.parts.push(`<path d="M4.5 12 Q 9 8 13.4 2.6" fill="none" stroke="${shade(blade, 1.5)}" stroke-width="0.55" stroke-linecap="round"/>`);
    p.poly('13.4,2.6 14.4,1.6 12.6,3.2', shade(blade, 1.3), outline(blade));
  } else if (v === 'dagger') {
    p.bar(6.0, 11.0, 10.5, 5.0, 1.5, blade);
    p.poly('10.3,5.3 11.4,3.9 10.0,5.7', shade(blade, 1.3), outline(blade));
  } else if (v === 'rapier') {
    p.bar(4.0, 12.5, 13.0, 2.5, 1.0, blade);
    p.poly('12.8,2.7 13.8,1.7 12.4,3.1', shade(blade, 1.3), outline(blade));
  } else if (v === 'short') {
    p.bar(5.5, 11.0, 11.0, 5.0, 1.6, blade);
    p.poly('10.8,5.2 12.0,3.8 10.4,5.8', shade(blade, 1.3), outline(blade));
  } else if (v === 'broad') {
    p.bar(4.5, 11.5, 12.5, 3.5, 2.8, blade);
    p.poly('12.0,4.2 13.8,2.2 11.8,4.8', shade(blade, 1.3), outline(blade));
    p.line(5.2, 10.8, 11.8, 4.5, shade(blade, 0.7), 0.5);
  } else if (v === 'great' || v === 'excalibur') {
    p.bar(4.2, 12.0, 13.4, 2.0, 3.2, blade);
    p.poly('12.9,2.6 14.6,0.9 12.5,3.3', shade(blade, 1.4), outline(blade));
    p.line(5.0, 11.2, 12.4, 3.4, shade(blade, 0.7), 0.6); // fuller
    p.line(5.8, 11.6, 12.8, 3.8, v === 'excalibur' ? '#ffffff' : shade(blade, 1.6), 0.6); // glint
  } else {
    // Default (std): original geometry.
    p.bar(4.5, 11.5, 12.5, 3.5, t > 0.4 ? 2.2 : 1.8, blade);
    p.poly('12.2,4.0 13.6,2.4 12.0,4.6', shade(blade, 1.3), outline(blade));
    if (t > 0.3) p.line(5.2, 10.8, 11.8, 4.5, shade(blade, 0.7), 0.5);
  }

  // --- Cross-guard. ---
  if (v === 'rapier') {
    p.circle(4.6, 11.6, 1.3, guardC, outline(guardC)); // cup guard
  } else if (v === 'broad') {
    p.bar(2.2, 12.4, 6.4, 9.8, 2.0, guardC);
  } else if (v === 'great' || v === 'excalibur') {
    p.bar(2.4, 12.3, 6.2, 9.8, 1.8, guardC);
    p.poly('2.6,12.0 1.2,10.6 3.4,11.4', guardC, outline(guardC)); // upswept quillon
    p.poly('6.0,10.2 7.4,8.8 5.2,9.6', guardC, outline(guardC));
  } else {
    p.bar(2.6, 12.1, 6.0, 10.0, t > 0.4 ? 1.6 : 1.4, guardC);
  }

  // --- Grip + pommel. ---
  p.line(3.2, 13.2, 4.6, 11.6, gripC, 2.0);
  p.circle(2.9, 13.6, 1.05, shade(guardC, 0.9), outline(guardC));

  // --- Element / rarity / iconic gem on the pommel. ---
  if (v === 'excalibur') {
    gem(p, 2.9, 13.6, 1.0, '#ffe066');
  } else if (el) {
    gem(p, 2.9, 13.6, (v === 'great') ? 1.0 : 0.85, el);
  } else if (v === 'great' || item.rarity === 'legendary') {
    gem(p, 2.9, 13.6, (v === 'great') ? 1.0 : 0.85, RARITY_GLOW.legendary || guardC);
  }
}

function paintAxe(p, item, t) {
  const c = hexStr(item.color);
  const head = c;
  const haft = '#5a3a22';
  const twoH = item.twoHanded;
  const v = variantOf(item, twoH ? 'great_axe' : 'std');
  const el = ELEMENT_COLOR[item.element];

  if (v === 'scythe') {
    // Long near-vertical snath with a big curved blade off the top.
    p.line(11, 2, 7, 14, haft, 1.8);
    p.line(11, 2, 7, 14, shade(haft, 1.3), 0.5);
    p.parts.push(`<path d="M11 2 Q 3 2 2 8" fill="none" stroke="${outline(head)}" stroke-width="2.4" stroke-linecap="round"/>`);
    p.parts.push(`<path d="M11 2 Q 3 2 2 8" fill="none" stroke="${head}" stroke-width="1.5" stroke-linecap="round"/>`);
    p.parts.push(`<path d="M11 2 Q 3 2 2 8" fill="none" stroke="${shade(head, 1.5)}" stroke-width="0.5" stroke-linecap="round"/>`);
    p.circle(7, 14, 0.8, shade(haft, 0.8), outline(haft));
    if (el) p.circle(9, 4, 0.7, el, outline(el));
    return;
  }
  if (v === 'pick') {
    // Two opposed narrow points off the haft top (mining pick), grey, no gem.
    p.line(8.5, 14.0, 10.5, 3.5, haft, 1.5);
    p.line(8.5, 14.0, 10.5, 3.5, shade(haft, 1.3), 0.5);
    p.poly('10.5,3.5 3.0,5.0 4.0,6.4', head, outline(head)); // left point
    p.poly('10.5,3.5 13.6,7.4 12.2,8.0', head, outline(head)); // right point
    p.px(10.0, 3.2, shade(head, 0.7), 1.2, 1.6, 0.9); // socket
    p.circle(8.6, 14.0, 0.8, shade(haft, 0.8), outline(haft));
    return;
  }
  if (v === 'halberd') {
    // Spear point on top + an axe blade mid-haft on a long pole.
    p.line(6.0, 14.5, 10.8, 1.5, haft, 1.8);
    p.line(6.0, 14.5, 10.8, 1.5, shade(haft, 1.3), 0.5);
    p.poly('10.5,1.5 11.4,4 9.6,4', shade(head, 1.1), outline(head)); // spear point
    const hx = 8.8, hy = 6.6;
    p.poly(`${hx},${hy} ${hx - 4.4},${hy - 1.0} ${hx - 5.0},${hy + 2.4} ${hx - 0.6},${hy + 3.0}`, head, outline(head));
    p.line(hx - 4.8, hy - 0.4, hx - 5.0, hy + 2.2, shade(head, 1.6), 0.6);
    p.circle(6.1, 14.5, 0.8, shade(haft, 0.8), outline(haft));
    if (el && t > 0.3) p.circle(hx - 2.2, hy + 1.0, 0.7, el, outline(el));
    return;
  }

  // Haft for the fan-head family (hatchet/double/great_axe/std).
  const hThick = v === 'great_axe' ? 2.2 : (twoH ? 1.8 : 1.5);
  if (v === 'hatchet') {
    p.line(6.0, 14.0, 9.5, 5.0, haft, 1.5);
    p.line(6.0, 14.0, 9.5, 5.0, shade(haft, 1.3), 0.5);
  } else {
    p.line(6.0, 14.0, 10.5, 2.5, haft, hThick);
    p.line(6.0, 14.0, 10.5, 2.5, shade(haft, 1.3), 0.5);
  }

  // Axe head: a fan blade. great_axe scales it up; hatchet shrinks it.
  const sc = v === 'great_axe' ? 1.4 : (v === 'hatchet' ? 0.7 : 1.0);
  const hx = v === 'hatchet' ? 9.2 : 9.6, hy = v === 'hatchet' ? 4.6 : 4.6;
  p.poly(`${hx},${hy} ${hx - 4.6 * sc},${hy - 1.2 * sc} ${hx - 5.2 * sc},${hy + 2.6 * sc} ${hx - 0.6 * sc},${hy + 3.2 * sc}`, head, outline(head));
  p.line(hx - 5.0 * sc, hy - 0.6 * sc, hx - 5.2 * sc, hy + 2.4 * sc, shade(head, 1.6), 0.6);

  // Back blade: double-bit (always, symmetric) or generic back spike.
  if (v === 'double') {
    p.poly(`${hx},${hy} ${hx + 4.6},${hy - 1.2} ${hx + 5.2},${hy + 2.6} ${hx + 0.6},${hy + 3.2}`, shade(head, 0.95), outline(head));
    p.line(hx + 5.0, hy - 0.6, hx + 5.2, hy + 2.4, shade(head, 1.5), 0.6);
  } else if (v === 'great_axe') {
    p.poly(`${hx},${hy} ${hx + 3.4},${hy - 0.6} ${hx + 3.8},${hy + 2.4} ${hx + 0.4},${hy + 3.0}`, shade(head, 0.9), outline(head));
    p.poly(`${hx + 0.2},${hy - 1.0} ${hx + 1.2},${hy - 3.2} ${hx + 2.0},${hy - 0.8}`, shade(head, 1.05), outline(head)); // top spike
  } else if (v !== 'hatchet' && (twoH || t > 0.5)) {
    p.poly(`${hx},${hy} ${hx + 3.2},${hy - 0.6} ${hx + 3.6},${hy + 2.2} ${hx + 0.4},${hy + 2.8}`, shade(head, 0.9), outline(head));
  }

  // Socket band.
  p.px(hx - 0.4, hy + 0.2, shade(head, 0.7), 1.1, 2.6 * sc, 0.9);
  // Pommel.
  p.circle(6.1, 14.0, 0.8, shade(haft, 0.8), outline(haft));
  if (el && t > 0.3 && v !== 'hatchet') p.circle(hx - 2.4 * sc, hy + 1.0 * sc, 0.7, el, outline(el));
}

function paintBow(p, item, t) {
  const c = hexStr(item.color);
  const isXbow = /crossbow|arbalest|ballista|recon|scout/i.test(item.baseId || '');
  if (isXbow) { paintCrossbow(p, item, t, c); return; }
  const v = variantOf(item, 'recurve');
  // Vertical bow: a C-curve limb + string + nocked arrow. Curve & tips vary.
  let d = 'M11 2.5 C 5 5, 5 11, 11 13.5';
  let limbW = 2.4;
  if (v === 'short') { d = 'M10 4 C 6 6, 6 10, 10 12'; limbW = 2.4; }
  else if (v === 'long') { d = 'M11 1.5 C 6 5, 6 11, 11 14.5'; limbW = 2.0; }
  p.parts.push(`<path d="${d}" fill="none" stroke="${outline(c)}" stroke-width="${limbW}" stroke-linecap="round"/>`);
  p.parts.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${limbW - 0.9}" stroke-linecap="round"/>`);
  // Recurve tips flick out (always on for recurve, never for short/long).
  if (v === 'recurve') {
    p.line(11, 2.5, 12.4, 1.6, c, 1.4);
    p.line(11, 13.5, 12.4, 14.4, c, 1.4);
  }
  // String (spans the limb tips per variant).
  if (v === 'short') p.line(10.3, 3.9, 10.3, 12.1, '#efeadf', 0.5);
  else if (v === 'long') p.line(11.3, 1.4, 11.3, 14.6, '#efeadf', 0.5);
  else p.line(11.3, 2.4, 11.3, 13.6, '#efeadf', 0.5);
  // Nocked arrow.
  p.line(4.0, 8.0, 11.3, 8.0, '#7a4a22', 0.9);
  p.poly('3.2,8 4.6,7.0 4.6,9.0', '#cfd4da', '#888'); // arrowhead
  p.line(11.0, 7.2, 11.7, 8.0, ELEMENT_COLOR[item.element] || '#e23b3b', 0.7); // fletch
  p.line(11.0, 8.8, 11.7, 8.0, ELEMENT_COLOR[item.element] || '#e23b3b', 0.7);
}

function paintCrossbow(p, item, t, c) {
  // Horizontal stock + prod.
  p.line(3, 8.5, 12, 8.5, '#5c3d22', 1.8); // stock
  p.parts.push(`<path d="M9 4.5 C 11 6.5, 11 10.5, 9 12.5" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`);
  p.line(9, 5.0, 9, 12.0, '#efeadf', 0.5); // string
  p.line(7, 7.6, 12, 8.4, shade(c, 1.3), 0.8); // loaded bolt
  p.poly('12,8.4 13.2,7.8 13.2,9.0', '#cfd4da', '#888');
  p.line(4.5, 8.5, 4.0, 11.0, '#3a2414', 1.4); // trigger grip
  const el = ELEMENT_COLOR[item.element];
  if (el) p.circle(6.5, 8.5, 0.8, el, outline(el));
}

function paintWand(p, item, t) {
  const c = hexStr(item.color);
  const v = variantOf(item, t > 0.55 ? 'staff' : 'wand');
  const isStaff = v === 'staff';
  const shaftC = '#4a2f1b';
  const orb = ELEMENT_COLOR[item.element] || c;

  if (v === 'wand') {
    // Short shaft + small orb, no prongs.
    p.line(5.0, 13.0, 10.0, 5.0, shaftC, 1.3);
    p.line(5.0, 13.0, 10.0, 5.0, shade(shaftC, 1.3), 0.5);
    const gx = 10.4, gy = 4.4;
    p.circle(gx, gy, 1.6, orb, outline(orb));
    p.circle(gx - 0.4, gy - 0.4, 0.5, shade(orb, 1.8), null);
    p.line(5.2, 12.7, 6.4, 10.9, '#2a1a10', 1.4);
    return;
  }
  if (v === 'rod') {
    // Medium shaft, twin-bead tip, no prongs.
    p.line(4.6, 13.2, 10.2, 4.8, shaftC, 1.5);
    p.line(4.6, 13.2, 10.2, 4.8, shade(shaftC, 1.3), 0.5);
    const gx = 10.6, gy = 4.2;
    p.circle(gx, gy, 1.5, orb, outline(orb));
    p.circle(gx - 0.4, gy - 0.4, 0.45, shade(orb, 1.8), null);
    p.circle(gx - 1.8, gy + 1.6, 0.7, shade(orb, 1.2), outline(orb)); // twin bead
    p.line(4.8, 12.9, 5.9, 11.3, '#2a1a10', 1.5);
    return;
  }

  // Staff: long shaft + claw prongs + big orb.
  p.line(4.0, 13.5, 10.5, 4.5, shaftC, 1.8);
  p.line(4.0, 13.5, 10.5, 4.5, shade(shaftC, 1.3), 0.5);
  const gx = 11.0, gy = 3.6;
  p.line(gx - 1.4, gy + 0.4, gx - 0.4, gy - 1.0, '#d9c46a', 0.8);
  p.line(gx + 1.4, gy + 0.4, gx + 0.4, gy - 1.0, '#d9c46a', 0.8);
  const halo = item.rarity === 'legendary' ? 0.55 : 0.35;
  p.circle(gx, gy, 2.2, mix(orb, '#ffffff', 0.15), null);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` opacity="${halo}"/>`);
  p.circle(gx, gy, 1.5, orb, outline(orb));
  p.circle(gx - 0.5, gy - 0.5, 0.5, shade(orb, 1.8), null);
  p.line(4.2, 13.2, 5.4, 11.6, '#2a1a10', 1.6);
}

function paintShield(p, item, t) {
  const c = hexStr(item.color);
  const rim = t > 0.5 ? '#f0d878' : '#c4c9cf';
  const v = variantOf(item, 'heater');
  const el = ELEMENT_COLOR[item.element];

  // --- Body silhouette per variant. ---
  if (v === 'buckler') {
    p.circle(8, 8, 4.6, c, outline(c));
    p.circle(8, 8, 4.6, 'none', rim); // rim
    p.circle(8, 8, 1.4, shade(c, 1.3), outline(c)); // boss
  } else if (v === 'round') {
    p.circle(8, 8, 6, c, outline(c));
    p.circle(8, 8, 6, 'none', rim);
    p.circle(8, 8, 1.3, shade(c, 1.25), outline(c)); // boss
  } else if (v === 'tower') {
    p.px(4, 2, c, 8, 12);
    p.parts.push(`<rect x="4" y="2" width="8" height="12" fill="none" stroke="${outline(c)}" stroke-width="0.6"/>`);
    p.parts.push(`<rect x="4" y="2" width="8" height="12" fill="none" stroke="${rim}" stroke-width="0.5"/>`);
    p.line(8, 2.4, 8, 13.6, shade(c, 0.7), 0.6); // center seam
    p.circle(6, 4, 0.6, shade(c, 1.3), outline(c)); // rivets
    p.circle(10, 4, 0.6, shade(c, 1.3), outline(c));
    p.circle(6, 12, 0.6, shade(c, 1.3), outline(c));
    p.circle(10, 12, 0.6, shade(c, 1.3), outline(c));
  } else if (v === 'aegis') {
    p.circle(8, 8, 6, c, outline(c));
    p.circle(8, 8, 6, 'none', rim);
    for (let a = 0; a < 8; a++) { // ring of rim studs
      const ang = (a / 8) * Math.PI * 2;
      p.circle(8 + Math.cos(ang) * 5, 8 + Math.sin(ang) * 5, 0.5, rim, null);
    }
    gem(p, 8, 8, 1.8, el || RARITY_GLOW.legendary || rim);
    p.line(4.2, 5.4, 5.8, 4.4, shade(c, 1.6), 0.6);
    return;
  } else {
    // Heater (default) and crown share the heater body.
    p.poly('8,2 13,3.5 13,9 8,14 3,9 3,3.5', c, outline(c));
    p.parts.push(`<polygon points="8,2 13,3.5 13,9 8,14 3,9 3,3.5" fill="none" stroke="${rim}" stroke-width="0.7"/>`);
  }

  // --- Emblem. ---
  if (v === 'crown') {
    // Gold crown emblem.
    p.px(5, 8.6, '#f0d878', 6, 1.4);
    p.poly('5,8.6 6,5 7,8.6 8,4.5 9,8.6 10,5 11,8.6', '#f0d878', outline('#f0d878'));
    p.circle(6, 5, 0.5, '#ff5a55', null);
    p.circle(10, 5, 0.5, '#ff5a55', null);
    p.circle(8, 4.5, 0.5, el || '#ff5a55', null);
  } else if (v === 'buckler' || v === 'round' || v === 'tower') {
    // Decorate with a gem on higher tiers, else a cross/boss already drawn.
    if (t > 0.45) gem(p, 8, v === 'tower' ? 8 : 8, 1.5, el || rim);
  } else if (t > 0.45) {
    gem(p, 8, 7.5, 1.8, el || rim);
  } else {
    p.px(7.4, 4.5, rim, 1.2, 6.2, 0.95);
    p.px(4.8, 6.6, rim, 6.4, 1.2, 0.95);
  }
  // Top-left glint.
  p.line(5.0, 4.2, 6.6, 3.6, shade(c, 1.6), 0.6);
}

// ---------------------------------------------------------------------------
// Armour painters (slot-based).
// ---------------------------------------------------------------------------
function paintHelmet(p, item, t) {
  const c = hexStr(item.color);
  const closed = item.coverage === 'closed';
  const id = item.baseId || '';
  if (/wizard_hat|wizard/i.test(id)) { // starry pointed hat
    p.poly('8.6,2.2 11,12 5,12', c, outline(c)); // slight droop tip
    p.poly('8.6,2.2 9.8,3.2 8.2,3.4', shade(c, 0.8), null); // folded droop
    p.px(4.2, 11.4, shade(c, 0.8), 7.6, 1.4); // brim
    p.circle(8, 6, 0.6, '#ffe066', null); // star
    p.px(6.6, 8.0, '#ffe066', 0.8, 0.8, 0.95); // sparkles
    p.px(9.2, 9.4, '#ffe066', 0.8, 0.8, 0.95);
    p.px(7.8, 10.0, '#ffe066', 0.8, 0.8, 0.95);
    return;
  }
  if (/straw_hat|straw/i.test(id)) {
    p.poly('8,4 11.5,11 4.5,11', c, outline(c));
    p.px(3.6, 10.6, shade(c, 0.9), 8.8, 1.3);
    return;
  }
  if (/crown_helmet/i.test(id)) { // a crown
    const gold = '#f0d878';
    p.px(4, 9, gold, 8, 2); // band
    p.poly('4,9 5,5 6,9 8,4.5 10,9 11,5 12,9', gold, outline(gold)); // points
    const jewel = ELEMENT_COLOR[item.element] || '#ff5a55';
    gem(p, 8, 8, 1.2, jewel); // center jewel
    p.circle(5.6, 9.6, 0.5, '#4d7dff', null); // band jewels
    p.circle(10.4, 9.6, 0.5, '#4caf50', null);
    return;
  }
  // Dome helm.
  p.parts.push(`<path d="M3.5 11 A 4.5 4.5 0 0 1 12.5 11 Z" fill="${c}" stroke="${outline(c)}" stroke-width="0.6"/>`);
  if (closed) {
    p.px(3.6, 10.4, shade(c, 0.85), 8.8, 2.6); // face guard
    p.px(5.4, 11.3, outline(c), 5.2, 0.9); // visor slit
  } else {
    p.px(3.6, 10.4, shade(c, 1.1), 8.8, 1.2); // open brow band
  }
  if (/horned/i.test(id)) { // horns
    p.poly('4,11 2.4,8.6 4.4,9.6', shade(c, 1.2), outline(c));
    p.poly('12,11 13.6,8.6 11.6,9.6', shade(c, 1.2), outline(c));
  }
  // Crest glint on fancy tiers.
  if (t > 0.5) p.line(8, 6.6, 8, 9.0, '#ffe066', 0.7);
  p.line(5.0, 7.6, 6.6, 6.6, shade(c, 1.6), 0.6);
}

function paintArmor(p, item, t) {
  const c = hexStr(item.color);
  const id = item.baseId || '';
  const soft = /cloth|leather|studded|robe|shirt/i.test(id);
  // Torso plate / tunic.
  p.poly('4.5,4 11.5,4 11.5,13 8,14 4.5,13', c, outline(c));
  // Pauldrons.
  p.circle(4.2, 5.0, 1.6, shade(c, soft ? 1.0 : 1.1), outline(c));
  p.circle(11.8, 5.0, 1.6, shade(c, soft ? 1.0 : 1.1), outline(c));
  // Neckline.
  p.poly('6.5,4 9.5,4 8,6', shade(c, 0.8), null);
  // Center ridge / lacing.
  if (soft) {
    p.line(8, 6, 8, 12.5, shade(c, 0.7), 0.5);
    for (let y = 6.5; y < 12; y += 1.4) p.line(7.2, y, 8.8, y, shade(c, 1.2), 0.4);
  } else {
    p.line(8, 5, 8, 13.5, shade(c, 0.65), 0.7); // plate seam
    p.line(6.0, 6.4, 6.0, 12.5, shade(c, 1.25), 0.5); // glint
  }
  // Belt.
  p.px(4.7, 11.4, shade(c, 0.6), 6.6, 1.0);
  if (t > 0.55) p.circle(8, 11.9, 0.7, '#f0d878', outline('#f0d878')); // buckle gem
}

function paintLegs(p, item, t) {
  const c = hexStr(item.color);
  // Waist band + two legs.
  p.px(4.5, 3.5, shade(c, 0.7), 7, 1.4);
  p.poly('4.5,4.8 7.4,4.8 7.4,13.5 5.0,13.5 4.2,5.2', c, outline(c));
  p.poly('8.6,4.8 11.5,4.8 11.8,5.2 11.0,13.5 8.6,13.5', c, outline(c));
  // Knee plates on heavy gear.
  if (!/cloth|leather|robe/i.test(item.baseId || '')) {
    p.circle(6.0, 9.0, 1.0, shade(c, 1.15), outline(c));
    p.circle(10.0, 9.0, 1.0, shade(c, 1.15), outline(c));
  }
  p.line(5.5, 5.6, 5.5, 12.5, shade(c, 1.3), 0.4); // glint
}

function paintBoots(p, item, t) {
  const c = hexStr(item.color);
  const id = item.baseId || '';

  // --- Boots of Haste (Tibia look): tan/yellow boots + small ankle wings. ---
  if (id === 'fast_boots') {
    const tan = '#d9b24a';
    for (const ox of [0, 5.2]) {
      p.poly(`${3.0 + ox},4 ${5.4 + ox},4 ${5.4 + ox},11 ${6.6 + ox},11 ${6.6 + ox},13 ${3.0 + ox},13`, tan, outline(tan));
      p.px(3.0 + ox, 9.6, shade(tan, 0.7), 2.4, 0.9); // sole/cuff
      p.line(3.4 + ox, 5.0, 3.4 + ox, 9.0, shade(tan, 1.25), 0.4); // upper highlight
      p.px(3.2 + ox, 9.4, '#ffe066', 2.6, 1.0); // yellow accent cuff
    }
    // Two-feather wings at each ankle (low, Tibia style).
    for (const ox of [0, 5.2]) {
      p.poly(`${2.6 + ox},9 ${0.7 + ox},7.7 ${2.6 + ox},10.2`, '#fdf6d8', '#caa');
      p.poly(`${2.6 + ox},9.6 ${1.1 + ox},8.6 ${2.6 + ox},10.6`, '#f0e6b8', '#caa');
    }
    return;
  }

  // --- Winged / Hermes boots: prominent multi-feather wings. ---
  const winged = id === 'winged_boots' || id === 'hermes_boots';
  const soft = id === 'soft_boots';
  const fast = !winged && !soft && (item.speedBonus || 0) > 0.18;

  // A pair of side-view boots (rounder toe for soft slippers).
  for (const ox of [0, 5.2]) {
    if (soft) {
      // Soft green slipper: curved low cut, no hard heel.
      p.poly(`${3.0 + ox},5.5 ${5.4 + ox},5.5 ${6.6 + ox},11 ${6.6 + ox},13 ${3.0 + ox},13`, c, outline(c));
      p.line(3.4 + ox, 7.0, 6.0 + ox, 7.0, shade(c, 1.2), 0.5); // fabric fold
    } else {
      p.poly(`${3.0 + ox},4 ${5.4 + ox},4 ${5.4 + ox},11 ${6.6 + ox},11 ${6.6 + ox},13 ${3.0 + ox},13`, c, outline(c));
      p.px(3.0 + ox, 9.6, shade(c, 0.75), 2.4, 0.9); // cuff
      p.line(3.4 + ox, 5.0, 3.4 + ox, 9.0, shade(c, 1.3), 0.4);
    }
  }

  if (winged) {
    // Larger 3-feather wing cluster at each ankle, extending past the boot.
    const wc = id === 'hermes_boots' ? '#fff0a0' : '#dff2ff';
    const wo = id === 'hermes_boots' ? '#dcb' : '#bcd';
    for (const ox of [0, 5.2]) {
      p.poly(`${2.8 + ox},8.6 ${0.2 + ox},6.8 ${2.8 + ox},9.6`, wc, wo);
      p.poly(`${2.8 + ox},9.4 ${0.6 + ox},8.2 ${2.8 + ox},10.2`, wc, wo);
      p.poly(`${2.8 + ox},10.2 ${1.0 + ox},9.6 ${2.8 + ox},11.0`, shade(wc, 0.92), wo);
    }
  } else if (fast) {
    // Generic small wings for swift/traveller/glacial/dragon/demon/celestial.
    const w = '#dff2ff';
    p.poly('2.6,7 0.6,5.6 2.6,8.4', w, '#bcd');
    p.poly('7.8,7 5.8,5.6 7.8,8.4', w, '#bcd');
  }
}

function paintAmulet(p, item, t) {
  const c = hexStr(item.color);
  // Chain arc.
  p.parts.push(`<path d="M4 4 A 4 4 0 0 0 12 4" fill="none" stroke="#d9c46a" stroke-width="0.8"/>`);
  // Pendant gem.
  gem(p, 8, 9.5, 3.2, c);
  p.circle(8, 6.2, 0.7, '#d9c46a', '#9a7'); // bail
  if ((item.speedBonus || 0) > 0) { // swiftness/haste charms get clear wings
    const wc = '#fff0a0', wo = '#dcb';
    // Two-feather gold/white wings on each side over a yellow gem.
    p.poly('5,9.5 2.4,8.4 5,10.5', wc, wo);
    p.poly('5,10.2 2.8,9.4 5,11.0', shade(wc, 0.92), wo);
    p.poly('11,9.5 13.6,8.4 11,10.5', wc, wo);
    p.poly('11,10.2 13.2,9.4 11,11.0', shade(wc, 0.92), wo);
    gem(p, 8, 9.5, 1.6, '#ffe066'); // yellow gem accent
  }
}

// ---------------------------------------------------------------------------
// Consumables, containers, currency, lights.
// ---------------------------------------------------------------------------
function paintPotion(p, item) {
  const c = hexStr(item.color);
  const both = item.restoreType === 'both';
  // Flask body.
  p.poly('6,5 10,5 11,9 11,13 5,13 5,9', '#cfe3ef', '#8aa');
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.5"/>');
  // Liquid.
  p.poly('5.4,9 10.6,9 10.6,12.6 5.4,12.6', c, null);
  if (both) p.poly('8,9 10.6,9 10.6,12.6 8,12.6', '#4d7dff', null);
  // Neck + cork.
  p.px(6.6, 3.2, '#cfe3ef', 2.8, 2.0, 0.7);
  p.px(6.8, 2.4, '#7a5230', 2.4, 1.2);
  // Shine.
  p.line(6.2, 9.8, 6.2, 12, shade(c, 1.7), 0.5);
  // Sparkle for elixirs / % restores.
  if (item.restorePct) p.px(8, 10.4, '#ffffff', 0.8, 0.8, 0.9);
}

function paintFruit(p, item) {
  const c = hexStr(item.color);
  p.circle(8, 9, 3.6, c, outline(c));
  p.circle(6.6, 7.6, 1.0, shade(c, 1.6), null); // shine
  p.line(8, 5.4, 8.8, 3.6, '#6a4a22', 0.8); // stem
  p.poly('8.8,4.2 11,3.4 9.4,5.0', '#4caf50', null); // leaf
}

function paintCoin(p, item) {
  const c = hexStr(item.color);
  // Stack of three discs.
  for (let i = 2; i >= 0; i--) {
    const y = 9.5 + i * 0.2 - i * 2.1;
    p.circle(8, y + 2.0, 3.0, shade(c, 1 - i * 0.05), outline(c));
    p.circle(8 - 0.8, y + 1.2, 1.0, shade(c, 1.5), null);
  }
  // Coin face mark on top disc.
  p.px(7.4, 4.2, shade(c, 0.7), 1.2, 2.0, 0.8);
}

function paintContainer(p, item) {
  const c = hexStr(item.color);
  const id = item.baseId || '';
  const big = (item.capacity || 8) >= 20;
  if (big) { // framed backpack
    p.poly('3.5,5 12.5,5 12.5,14 3.5,14', c, outline(c));
    p.px(3.5, 5, shade(c, 1.15), 9, 1.4); // flap
    p.px(7.2, 4.4, shade(c, 0.8), 1.6, 2.0); // strap
    p.px(6.6, 8.5, shade(c, 0.7), 2.8, 1.2); // buckle
  } else { // pouch
    p.parts.push(`<path d="M4 7 Q 8 4 12 7 L 13 13 Q 8 15 3 13 Z" fill="${c}" stroke="${outline(c)}" stroke-width="0.6"/>`);
    p.px(5.5, 6.2, shade(c, 0.7), 5, 1.0); // drawstring
    p.line(6, 6.4, 6, 5.0, shade(c, 0.7), 0.5);
    p.line(10, 6.4, 10, 5.0, shade(c, 0.7), 0.5);
  }
  // Themed faces/marks on special bags (kid bling).
  if (/demon/i.test(id)) {
    // A little demon face on the flap: horns + glowing eyes + fanged grin.
    p.poly('5.4,5 4.2,2.6 6.2,4.4', shade(c, 0.7), outline(c)); // left horn
    p.poly('10.6,5 11.8,2.6 9.8,4.4', shade(c, 0.7), outline(c)); // right horn
    p.circle(6.6, 9, 0.9, '#ffd24d', null); // eye
    p.circle(9.4, 9, 0.9, '#ffd24d', null); // eye
    p.circle(6.6, 9, 0.35, '#7a0000', null);
    p.circle(9.4, 9, 0.35, '#7a0000', null);
    p.poly('6,11.4 10,11.4 8,12.8', '#1a0008', null); // fanged mouth
  } else if (/dragon/i.test(id)) {
    // Scaly ridge + an eye for the dragon backpack.
    p.poly('5,5.4 6.2,3.8 7.4,5.4', shade(c, 1.2), null);
    p.poly('7.4,5.4 8.6,3.8 9.8,5.4', shade(c, 1.2), null);
    p.poly('9.8,5.4 11,3.8 12.2,5.4', shade(c, 1.2), null);
    p.circle(8, 9.5, 0.8, '#ffe066', null);
    p.circle(8, 9.5, 0.3, '#1a0008', null);
  } else if (/golden/i.test(id)) {
    p.px(6.6, 8.5, '#fff4c0', 2.8, 1.2, 0.9); // bright golden buckle sheen
  }
}

function paintLight(p, item) {
  const c = hexStr(item.color);
  const id = item.baseId || '';
  if (/torch/i.test(id)) {
    p.line(8, 14, 8, 8, '#5a3a22', 1.6); // handle
    p.poly('8,3 10,7 6,7', '#ffb24d', null); // flame
    p.poly('8,4.5 9,7 7,7', '#ffe066', null);
    return;
  }
  // Glowing gem.
  const glow = hexStr(item.glowColor || item.color);
  p.circle(8, 8, 5.5, glow, null);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.22"/>');
  gem(p, 8, 8.5, 3.4, c);
  p.px(6.6, 6.6, '#ffffff', 1.0, 1.0, 0.85); // sparkle
}

// A mace/club: a wooden haft with a heavy flanged head at the top. Fire maces
// (Thunder Hammer etc.) get a small ember on the head.
function paintMace(p, item) {
  const head = hexStr(item.color);
  const haft = '#5a3a22';
  const el = ELEMENT_COLOR[item.element];
  // Haft from lower-left grip to upper area.
  p.line(7, 14, 9, 6, haft, 1.8);
  p.line(7, 14, 9, 6, shade(haft, 1.3), 0.5);
  p.circle(7, 14, 0.8, shade(haft, 0.8), outline(haft)); // pommel
  // Flanged head: a chunky ball with little spikes.
  p.circle(9.5, 4.5, 2.6, head, outline(head));
  p.poly('9.5,1.4 10.4,3.2 8.6,3.2', shade(head, 1.2), outline(head)); // top flange
  p.poly('12.4,4.5 10.6,3.6 10.6,5.4', shade(head, 1.2), outline(head)); // right flange
  p.poly('6.6,4.5 8.4,3.6 8.4,5.4', shade(head, 0.85), outline(head));   // left flange
  p.circle(9.5, 4.5, 0.7, shade(head, 1.4), null); // highlight
  if (el) p.circle(9.5, 4.5, 0.9, el, outline(el));
}

// A long lance/polearm: a slim shaft running corner-to-corner with a long
// leaf-shaped point, plus a little pennant near the grip (Jarvan-style).
function paintLance(p, item) {
  const blade = hexStr(item.color);
  const haft = '#6a4a2a';
  const el = ELEMENT_COLOR[item.element];
  // Shaft from lower-left to upper-right.
  p.line(3, 14, 12, 3, haft, 1.4);
  p.line(3, 14, 12, 3, shade(haft, 1.3), 0.5);
  // Long leaf point at the top.
  p.poly('12,3 15,1 13.5,4.5', blade, outline(blade));
  p.poly('11,4 13.5,2 13,5', shade(blade, 1.2), null);
  // Collar where point meets shaft.
  p.circle(11.4, 4.4, 0.8, shade(blade, 0.8), outline(blade));
  // Pennant banner near the grip.
  p.poly('5.5,10 8.5,9 6.5,12', el || '#c0392b', outline(el || '#c0392b'));
  if (el) p.circle(13, 2.6, 0.7, el, outline(el));
}

// ---------------------------------------------------------------------------
// Dispatch.
// ---------------------------------------------------------------------------
const WEAPON_PAINTERS = { sword: paintSword, axe: paintAxe, mace: paintMace, lance: paintLance, bow: paintBow, wand: paintWand, shield: paintShield };
const SLOT_PAINTERS = { helmet: paintHelmet, armor: paintArmor, legs: paintLegs, boots: paintBoots, amulet: paintAmulet };

function paintItem(p, item) {
  addRarityGlow(p, item);
  const t = tier01(item);
  // Currency / consumables first (they carry kind).
  if (item.kind === 'coin') return paintCoin(p, item);
  if (item.kind === 'light') return paintLight(p, item);
  if (item.kind === 'potion') {
    return (item.tier === 'fruit') ? paintFruit(p, item) : paintPotion(p, item);
  }
  // Containers.
  if (item.slot === 'bag' || item.type === 'container') return paintContainer(p, item);
  // Weapons by type.
  if (item.type && WEAPON_PAINTERS[item.type]) return WEAPON_PAINTERS[item.type](p, item, t);
  // Armour by slot.
  if (item.slot && SLOT_PAINTERS[item.slot]) return SLOT_PAINTERS[item.slot](p, item, t);
  // Shield can arrive as type:'shield' (handled above) or slot:'shield'.
  if (item.slot === 'shield') return paintShield(p, item, t);
  // Fallback: a labelled tile so nothing is invisible.
  p.rectO(2, 2, 12, 12, hexStr(item.color || 0x888888), outline(item.color || 0x888888));
  p.px(6, 6, '#fff', 4, 4, 0.6);
}

// ---------------------------------------------------------------------------
// Public API with a string cache keyed by the visually-relevant fields.
// ---------------------------------------------------------------------------
const cache = new Map();

function cacheKey(item) {
  return [
    item.kind || '', item.type || '', item.slot || '', item.baseId || '',
    item.element || '', item.rarity || '', item.color || '', item.tier || '',
    item.coverage || '', item.capacity || '', item.speedBonus || '', item.levelReq || '',
  ].join('|');
}

// Returns an inline <svg> string for the given backpack/equip item instance.
// Accepts both backpack instances (baseId) and raw shop definitions (id), and
// for definitions infers `slot` from a 'container'/weapon shape where needed.
export function iconFor(item) {
  if (!item) return '';
  // Shop defs carry `id` not `baseId`; normalise so per-item painters can match.
  if (!item.baseId && item.id) item = { ...item, baseId: item.id };
  const key = cacheKey(item);
  let svg = cache.get(key);
  if (svg) return svg;
  const p = new Painter();
  try { paintItem(p, item); } catch (_) { /* leave whatever drew */ }
  svg = p.svg();
  cache.set(key, svg);
  return svg;
}

// Slot placeholders for empty equipment cells (paperdoll). Drawn faint.
export function slotPlaceholderIcon(slot) {
  const p = new Painter();
  const ghost = { color: 0x6c7686, element: 'none', baseId: '', levelReq: 1 };
  const painter = SLOT_PAINTERS[slot] || (slot === 'weapon' ? paintSword : slot === 'shield' ? paintShield : slot === 'bag' ? paintContainer : null);
  if (painter) painter(p, ghost, 0.2);
  let svg = p.svg().replace('class="pxico"', 'class="pxico ph-ico"');
  return svg;
}
