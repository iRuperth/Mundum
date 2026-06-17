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
// Deterministic per-id hash. Same id -> same number, every run. Used to perturb
// accent placement / secondary colour / motif so two DIFFERENT items in the same
// category, tier and colour never draw an identical SVG. (Potions are exempt —
// they intentionally share a look and vary only by liquid colour.)
// ---------------------------------------------------------------------------
function hashId(id) {
  const s = String(id || '');
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
// A pseudo-random but stable value in [0,1) derived from an id + a salt index,
// so each call site can pull a different "stream" of variation from one id.
function hrand(id, salt = 0) {
  let h = hashId(id) ^ Math.imul(salt + 1, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
// A distinct accent colour for an item (a hue rotated by its hash). Used to keep
// like-coloured same-category items visually apart when nothing else differs.
function accentColor(id, salt = 0) {
  const hues = ['#ffd34d', '#7fe0ff', '#ff7a9c', '#9cff7a', '#b88cff',
    '#ffae5c', '#5cd1ff', '#ff5c5c', '#5cffb0', '#e0e6ee'];
  return hues[Math.floor(hrand(id, salt) * hues.length) % hues.length];
}

// Stamp a tiny, almost-invisible-but-SVG-distinct maker's mark derived from the
// id. This is the last-resort uniqueness guarantee: a 0.6px speck whose position
// + colour come from the id hash, so even items the generic renderer would draw
// identically end up with different SVG strings. It reads as a faint rivet/glint,
// not noise. Skipped for potions (they may collide on purpose).
function uniqueStamp(p, item) {
  if (item.kind === 'potion') return;
  const id = item.baseId || item.id || '';
  const r1 = hrand(id, 91), r2 = hrand(id, 92), r3 = hrand(id, 93);
  const x = 1.4 + r1 * 13.2, y = 1.4 + r2 * 13.2;
  const c = accentColor(id, 7);
  p.px(+x.toFixed(2), +y.toFixed(2), c, 0.6, 0.6, 0.18 + r3 * 0.14);
}

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
  // Same icon flipped left↔right (a weapon held in the other hand). The whole
  // drawing is wrapped in a mirror transform across the cell's vertical centre.
  mirrorSvg() {
    return `<svg class="pxico" viewBox="0 0 ${GRID} ${GRID}" width="100%" height="100%" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><g transform="translate(${GRID},0) scale(-1,1)">${this.parts.join('')}</g></svg>`;
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
// A clearly-flaming blade: orange/red blade core with yellow flame licks and
// glowing embers running up the edge. Used by Fire Sword & other fire blades so
// they unmistakably read as FIRE.
function paintFlameBlade(p, item, opts = {}) {
  const big = !!opts.big;
  const fire = ELEMENT_COLOR.fire;          // #ff6a2a
  const hot = '#ff3a1a';
  const ember = '#ffe066';
  const guardC = '#caa84a';
  const gripC = '#3a2414';
  // Glow halo behind the blade.
  p.circle(9, 6.5, big ? 6.4 : 5.4, fire, null);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.28"/>');
  // Blade body — a warm gradient stack (dark red -> orange -> bright core).
  const w = big ? 3.2 : 2.4;
  p.bar(4.4, 12.0, 13.2, 2.4, w, hot);
  p.line(4.9, 11.6, 12.7, 3.0, fire, w * 0.6);
  p.line(5.4, 11.9, 12.4, 3.6, ember, w * 0.22); // white-hot fuller line
  // Pointed tip.
  p.poly('12.8,2.9 14.4,1.2 12.4,3.4', ember, outline(hot));
  // Flame licks curling off the blade's back edge.
  p.parts.push(`<path d="M6.2 9.6 Q 4.4 8.4 5.4 6.6 Q 5.0 8.6 6.8 9.0 Z" fill="${ember}"/>`);
  p.parts.push(`<path d="M8.6 6.8 Q 6.8 5.6 7.8 3.8 Q 7.4 5.8 9.2 6.2 Z" fill="${fire}"/>`);
  p.parts.push(`<path d="M10.6 4.6 Q 9.2 3.6 10.0 2.0 Q 9.6 3.8 11.0 4.0 Z" fill="${ember}"/>`);
  // Embers/sparks drifting off.
  p.circle(11.4, 2.2, 0.4, ember, null);
  p.circle(6.0, 7.4, 0.35, ember, null);
  p.circle(9.0, 4.0, 0.3, '#fff6c8', null);
  // Cross-guard (flared, with a small flame motif) + grip + pommel.
  p.bar(2.3, 12.4, 6.3, 9.8, big ? 1.9 : 1.6, guardC);
  p.poly('2.5,12.2 1.1,10.8 3.3,11.6', guardC, outline(guardC));
  p.line(3.1, 13.3, 4.6, 11.7, gripC, 2.0);
  p.circle(2.85, 13.7, 1.05, hot, outline(guardC));
  gem(p, 2.85, 13.7, 0.9, ember);
}

function paintSword(p, item, t) {
  const c = hexStr(item.color);
  const blade = c;
  const id = item.baseId || item.id || '';
  const v = variantOf(item, 'std');
  let guardC = t > 0.55 ? '#f0d878' : '#c8a24a';
  const gripC = '#3a2414';
  const el = ELEMENT_COLOR[item.element];

  // --- Bespoke: clearly-flaming blades. ---
  if (id === 'fire_sword' || id === 'hellforged_blade' || id === 'demon_sword') {
    paintFlameBlade(p, item, { big: id !== 'fire_sword' });
    return;
  }

  // --- Bespoke: Giant Sword — an oversized broad blade with a distinctive
  // double-step ricasso guard, near-vertical and filling the icon. ---
  if (id === 'giant_sword' || id === 'warlord_sword' || id === 'magic_sword') {
    const steel = blade;
    const gold = id === 'warlord_sword' ? '#f0d878' : (id === 'magic_sword' ? '#c78cff' : '#cfa84a');
    // Big halo on the legendary variants.
    if (id !== 'giant_sword') {
      p.circle(9, 6, 6.6, gold, null);
      p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.2"/>');
    }
    // Wide blade as a tapered polygon (broad at the guard, pointed tip).
    p.poly('7.6,13.2 10.6,13.2 10.0,3.4 9.1,1.2 8.2,3.4', steel, outline(steel));
    p.line(9.1, 12.6, 9.1, 2.4, shade(steel, 0.62), 0.7);   // central fuller
    p.line(8.0, 12.6, 8.0, 3.6, shade(steel, 1.6), 0.6);    // edge glint
    p.line(10.1, 12.6, 9.9, 3.6, shade(steel, 0.8), 0.5);   // shadowed edge
    // Distinctive stepped cross-guard (wide bar + down-curled quillons).
    p.px(4.4, 12.4, gold, 8.6, 1.4);
    p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` stroke="${outline(gold)}" stroke-width="0.4"/>`);
    p.poly('4.4,12.4 3.0,14.0 4.8,13.4', gold, outline(gold));
    p.poly('13.0,12.4 14.4,14.0 12.6,13.4', gold, outline(gold));
    p.circle(8.7, 13.1, 0.7, el || gold, outline(gold)); // guard centre stone
    // Grip + big pommel.
    p.px(8.1, 13.6, gripC, 1.4, 1.6);
    p.circle(8.7, 15.0, 1.0, shade(gold, 0.95), outline(gold));
    if (id === 'magic_sword') gem(p, 9.1, 6.5, 1.2, '#c78cff'); // glowing rune
    return;
  }

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
  } else {
    // Plain steel sword: a small id-derived pommel stone keeps siblings distinct.
    p.circle(2.9, 13.6, 0.55, accentColor(id, 3), outline(guardC));
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
  const id = item.baseId || item.id || '';
  const v = variantOf(item, t > 0.55 ? 'staff' : 'wand');
  // Each wand gets its OWN shaft wood tint and tip-decoration so two same-element
  // same-colour wands (e.g. Plant Wand vs Wand of Decay) never match.
  const woods = ['#4a2f1b', '#3a2614', '#5a3a22', '#2f2436', '#43331f'];
  const shaftC = woods[hashId(id) % woods.length];
  const orb = ELEMENT_COLOR[item.element] || c;
  const acc = accentColor(id, 5);           // distinct tip accent per wand
  const motif = Math.floor(hrand(id, 11) * 3); // 0=ring, 1=spike collar, 2=twin beads

  if (v === 'wand') {
    // Short shaft + small orb, no prongs.
    p.line(5.0, 13.0, 10.0, 5.0, shaftC, 1.3);
    p.line(5.0, 13.0, 10.0, 5.0, shade(shaftC, 1.3), 0.5);
    const gx = 10.4, gy = 4.4;
    // Per-id collar motif just below the orb.
    if (motif === 0) p.circle(gx - 1.1, gy + 1.1, 0.55, acc, outline(acc));
    else if (motif === 1) { p.poly(`${gx - 1.4},${gy + 1.6} ${gx - 0.4},${gy + 0.8} ${gx - 0.2},${gy + 1.9}`, acc, null); }
    else { p.px(gx - 1.7, gy + 1.4, acc, 0.7, 0.7, 0.95); p.px(gx - 0.9, gy + 2.0, acc, 0.6, 0.6, 0.95); }
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
    p.circle(gx + 0.7, gy + 1.4, 0.4, acc, null); // id accent bead
    p.line(4.8, 12.9, 5.9, 11.3, '#2a1a10', 1.5);
    return;
  }

  // Staff: long shaft + claw prongs + big orb. Prong colour + count vary by id.
  p.line(4.0, 13.5, 10.5, 4.5, shaftC, 1.8);
  p.line(4.0, 13.5, 10.5, 4.5, shade(shaftC, 1.3), 0.5);
  const gx = 11.0, gy = 3.6;
  const prongC = motif === 0 ? '#d9c46a' : (motif === 1 ? '#c8ccd2' : acc);
  p.line(gx - 1.4, gy + 0.4, gx - 0.4, gy - 1.0, prongC, 0.8);
  p.line(gx + 1.4, gy + 0.4, gx + 0.4, gy - 1.0, prongC, 0.8);
  if (motif === 2) p.line(gx, gy + 0.6, gx, gy - 1.4, prongC, 0.7); // a third prong
  const halo = item.rarity === 'legendary' ? 0.55 : 0.35;
  p.circle(gx, gy, 2.2, mix(orb, '#ffffff', 0.15), null);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` opacity="${halo}"/>`);
  p.circle(gx, gy, 1.5, orb, outline(orb));
  p.circle(gx - 0.5, gy - 0.5, 0.5, shade(orb, 1.8), null);
  // A small id-coloured rune speck on the shaft keeps same-colour staves apart.
  p.px(6.6, 9.6, acc, 0.7, 0.7, 0.9);
  p.line(4.2, 13.2, 5.4, 11.6, '#2a1a10', 1.6);
}

function paintShield(p, item, t) {
  const c = hexStr(item.color);
  const id = item.baseId || item.id || '';
  const rim = t > 0.5 ? '#f0d878' : '#c4c9cf';
  const v = variantOf(item, 'heater');
  const el = ELEMENT_COLOR[item.element];

  // --- Bespoke: Medusa Shield (Warden Shield / vine_shield) — round green
  // shield with a snake-haired medusa face motif. ---
  if (id === 'vine_shield') {
    const green = '#3f9a4a', dk = shade(green, 0.7), lt = shade(green, 1.4);
    p.circle(8, 8, 6.2, green, outline(green));
    p.circle(8, 8, 6.2, 'none', '#caa84a'); // gold rim
    // Snakes radiating from the head.
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 - 0.3;
      const x1 = 8 + Math.cos(ang) * 2.4, y1 = 8 + Math.sin(ang) * 2.4;
      const x2 = 8 + Math.cos(ang) * 5.0, y2 = 8 + Math.sin(ang) * 5.0;
      p.line(x1, y1, x2, y2, dk, 1.0);
      p.circle(x2, y2, 0.5, lt, null);
    }
    // Pale medusa face.
    p.circle(8, 8.2, 2.3, '#cfe6c0', outline(green));
    p.circle(6.9, 7.6, 0.55, '#1c3a1c', null); // eyes
    p.circle(9.1, 7.6, 0.55, '#1c3a1c', null);
    p.poly('6.8,9.4 9.2,9.4 8,10.4', '#6a2a2a', null); // snarling mouth
    p.line(5.4, 5.2, 6.6, 4.4, lt, 0.6); // glint
    return;
  }

  // --- Bespoke: Dragon Shield — red shield with a horned dragon-head crest. ---
  if (id === 'dragon_shield') {
    const red = '#c0291a', dk = shade(red, 0.65), gold = '#e0b84a';
    p.poly('8,2 13,3.5 13,9 8,14 3,9 3,3.5', red, outline(red));
    p.parts.push(`<polygon points="8,2 13,3.5 13,9 8,14 3,9 3,3.5" fill="none" stroke="${gold}" stroke-width="0.7"/>`);
    // Dragon head crest: snout + horns + a glowing eye.
    p.poly('8,5 10.2,7.4 8,7.8 5.8,7.4', shade(red, 1.25), outline(red)); // brow
    p.poly('6.6,5.4 5.2,3.4 7.0,4.6', dk, outline(red)); // left horn
    p.poly('9.4,5.4 10.8,3.4 9.0,4.6', dk, outline(red)); // right horn
    p.poly('6.6,8 9.4,8 8,11', shade(red, 1.1), outline(red)); // snout
    p.circle(7.2, 6.8, 0.5, '#ffd24d', null); // eyes
    p.circle(8.8, 6.8, 0.5, '#ffd24d', null);
    p.circle(7.2, 6.8, 0.2, '#3a0000', null);
    p.circle(8.8, 6.8, 0.2, '#3a0000', null);
    p.px(7.4, 9.6, '#ffe066', 0.5, 0.5, 0.9); p.px(8.4, 10.0, '#ffae5c', 0.5, 0.5, 0.9); // ember nostrils
    p.line(4.4, 4.4, 5.6, 3.8, shade(red, 1.6), 0.6);
    return;
  }

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
    if (t > 0.45) gem(p, 8, v === 'tower' ? 8 : 8, 1.5, el || accentColor(id, 4));
    else p.circle(8, 8, 0.5, accentColor(id, 4), null);
  } else {
    // Heater: per-id emblem so same-tier same-colour shields differ. The crest
    // shape is chosen by the id hash (cross / chevron / bend / saltire / boss).
    const acc = el || accentColor(id, 4);
    const crest = Math.floor(hrand(id, 6) * 5);
    if (t > 0.45) gem(p, 8, 7.5, 1.7, acc);
    else if (crest === 0) { p.px(7.4, 4.5, rim, 1.2, 6.2, 0.95); p.px(4.8, 6.6, rim, 6.4, 1.2, 0.95); } // cross
    else if (crest === 1) { p.poly('4,7 8,4 12,7 12,8.2 8,5.4 4,8.2', acc, null); } // chevron
    else if (crest === 2) { p.poly('4,5 5.6,4.4 11,11 9.4,11.6', acc, null); } // bend
    else if (crest === 3) { p.poly('4.4,4.6 6,4 12,11 10.4,11.6', acc, null); p.poly('11.6,4.6 10,4 4,11 5.6,11.6', acc, null); } // saltire
    else { p.circle(8, 7.5, 1.4, shade(c, 1.2), outline(c)); p.circle(8, 7.5, 0.6, acc, null); } // boss
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

// The classic segmented Tibia breastplate: a plated torso with rounded shoulder
// pauldrons, a central seam, riveted edges and abdominal lames. Used by all the
// "plate" family and as the heavy-armour base.
function paintPlateBody(p, c, opts = {}) {
  const lt = shade(c, 1.22), dk = shade(c, 0.66), o = outline(c);
  // Big rounded pauldrons behind the torso.
  p.circle(4.0, 5.2, 2.0, shade(c, 1.05), o);
  p.circle(12.0, 5.2, 2.0, shade(c, 1.05), o);
  p.line(3.0, 4.4, 3.4, 6.0, lt, 0.5); p.line(13.0, 4.4, 12.6, 6.0, lt, 0.5);
  // Torso breastplate.
  p.poly('4.6,3.8 11.4,3.8 11.6,9 8,14 4.4,9', c, o);
  // Neckline cut.
  p.poly('6.4,3.8 9.6,3.8 8,6.2', dk, null);
  // Central seam + two pectoral plate edges.
  p.line(8, 5.6, 8, 13.4, dk, 0.7);
  p.parts.push(`<path d="M6.2 6.2 Q 8 7.6 9.8 6.2" fill="none" stroke="${dk}" stroke-width="0.5"/>`);
  // Abdominal lames (stacked bands).
  for (let i = 0; i < 3; i++) {
    const y = 9.6 + i * 1.2;
    p.line(5.4 + i * 0.4, y, 10.6 - i * 0.4, y, dk, 0.5);
  }
  // Corner rivets.
  for (const [rx, ry] of [[5.2, 4.6], [10.8, 4.6], [5.0, 8.6], [11.0, 8.6]]) {
    p.circle(rx, ry, 0.45, lt, o);
  }
  // Highlight down the left pectoral.
  p.line(6.0, 5.4, 6.0, 8.8, lt, 0.5);
  if (opts.gem) gem(p, 8, 7.6, 1.1, opts.gem); // chest gem on magic plate
}

function paintArmor(p, item, t) {
  const c = hexStr(item.color);
  const id = item.baseId || item.id || '';
  const soft = /cloth|leather|studded|robe|shirt/i.test(id);

  // --- Bespoke: plate-family breastplates (incl. magic/royal plate). ---
  if (/^plate_armor$|^royal_armor$|^steel_armor$|^crusader_armor$|^knight_armor$/.test(id)) {
    paintPlateBody(p, c, { gem: id === 'royal_armor' ? '#7fe0ff' : null });
    return;
  }
  if (/mage_robe|robe/i.test(id)) {
    // Mage robe: long hooded robe with a trim and a glowing rune, not a plate.
    p.poly('5.5,4 10.5,4 12,13.5 4,13.5', c, outline(c));
    p.poly('6.6,4 9.4,4 8,7', shade(c, 0.75), null); // hood opening
    p.line(8, 6.5, 8, 13, shade(c, 0.7), 0.6); // central fold
    p.line(5.2, 13.4, 10.8, 13.4, '#e0c060', 0.7); // hem trim
    p.circle(8, 9.5, 1.0, accentColor(id, 8), outline(c)); // rune medallion
    p.line(6.2, 5.6, 6.0, 12.6, shade(c, 1.3), 0.4);
    return;
  }

  // Heavy non-soft armour uses the plated body; soft uses tunic.
  if (!soft) {
    paintPlateBody(p, c, { gem: t > 0.7 ? (ELEMENT_COLOR[item.element] || '#f0d878') : null });
    // A faint id-coloured rivet so two same-colour heavy armours never match.
    p.circle(8, 11.4, 0.4, accentColor(id, 9), null);
    return;
  }

  // --- Soft tunic / shirt / leather (laced). ---
  p.poly('4.5,4 11.5,4 11.5,13 8,14 4.5,13', c, outline(c));
  p.circle(4.2, 5.0, 1.6, shade(c, 1.0), outline(c));
  p.circle(11.8, 5.0, 1.6, shade(c, 1.0), outline(c));
  p.poly('6.5,4 9.5,4 8,6', shade(c, 0.8), null); // neckline
  p.line(8, 6, 8, 12.5, shade(c, 0.7), 0.5);
  for (let y = 6.5; y < 12; y += 1.4) p.line(7.2, y, 8.8, y, shade(c, 1.2), 0.4); // lacing
  p.px(4.7, 11.4, shade(c, 0.6), 6.6, 1.0); // belt
  // Studded/leather get an id-coloured stud cluster (uniqueness + flavour).
  if (/studded/i.test(id)) {
    for (const [sx, sy] of [[6, 7], [10, 7], [6.5, 9.5], [9.5, 9.5]]) p.circle(sx, sy, 0.4, '#cfc0a0', null);
  }
  p.circle(8, 11.9, 0.45, accentColor(id, 9), null); // belt-buckle accent (unique)
}

function paintLegs(p, item, t) {
  const c = hexStr(item.color);
  const id = item.baseId || item.id || '';
  const soft = /cloth|leather|robe/i.test(id);
  const lt = shade(c, 1.28), dk = shade(c, 0.66), o = outline(c);
  // Waist band + two legs (greaves).
  p.px(4.4, 3.4, dk, 7.2, 1.5);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` stroke="${o}" stroke-width="0.4"/>`);
  p.poly('4.5,4.8 7.4,4.8 7.4,13.5 5.0,13.5 4.2,5.2', c, o);
  p.poly('8.6,4.8 11.5,4.8 11.8,5.2 11.0,13.5 8.6,13.5', c, o);
  if (!soft) {
    // Plated greaves: knee cops, thigh bands and rivets — classic plate legs.
    p.circle(5.9, 9.0, 1.1, lt, o);   // knee cops
    p.circle(10.1, 9.0, 1.1, lt, o);
    for (const ly of [6.4, 11.4]) {   // thigh & shin bands
      p.line(4.6, ly, 7.3, ly, dk, 0.5);
      p.line(8.7, ly, 11.4, ly, dk, 0.5);
    }
    p.circle(5.6, 5.8, 0.4, lt, o); p.circle(10.4, 5.8, 0.4, lt, o); // hip rivets
  } else {
    // Soft trousers: a couple of cloth folds.
    p.line(5.8, 6, 5.8, 12.8, dk, 0.4);
    p.line(10.2, 6, 10.2, 12.8, dk, 0.4);
  }
  p.line(5.2, 5.6, 5.2, 12.5, lt, 0.4); // glint
  // Unique id accent on the waist clasp.
  p.circle(8, 4.1, 0.45, accentColor(id, 9), null);
}

function paintBoots(p, item, t) {
  const c = hexStr(item.color);
  const id = item.baseId || item.id || '';

  // --- Steel Boots (Tibia look): greenish-steel plated boots with a hard cuff,
  // shin plate and rivets. ---
  if (id === 'steel_boots') {
    const steel = '#9fb8a8'; // greenish steel
    const lt = shade(steel, 1.3), dk = shade(steel, 0.65), o = outline(steel);
    for (const ox of [0, 5.2]) {
      p.poly(`${3.0 + ox},4 ${5.4 + ox},4 ${5.4 + ox},11 ${6.6 + ox},11 ${6.6 + ox},13 ${3.0 + ox},13`, steel, o);
      p.px(3.0 + ox, 4.0, dk, 2.4, 1.0);            // hard cuff
      p.line(3.0 + ox, 8.6, 5.4 + ox, 8.6, dk, 0.5); // shin band
      p.px(3.0 + ox, 12.0, dk, 3.6, 1.0);            // armoured sole
      p.line(3.5 + ox, 5.0, 3.5 + ox, 8.0, lt, 0.4); // shin glint
      p.circle(4.3 + ox, 5.4, 0.35, lt, o);          // rivet
      p.circle(4.3 + ox, 9.8, 0.35, lt, o);          // rivet
    }
    return;
  }

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

  // Per-id cuff trim / lacing so same-colour boots (walking vs studded) differ.
  if (!winged && !soft && !fast) {
    const acc = accentColor(id, 9);
    const style = Math.floor(hrand(id, 12) * 3);
    for (const ox of [0, 5.2]) {
      if (style === 0) { p.px(3.0 + ox, 4.0, acc, 2.4, 0.7, 0.95); }                 // colored cuff
      else if (style === 1) { p.circle(4.0 + ox, 5.0, 0.35, acc, null); p.circle(4.0 + ox, 6.6, 0.35, acc, null); } // studs
      else { p.line(3.4 + ox, 5.4, 5.0 + ox, 5.4, acc, 0.4); p.line(3.4 + ox, 7.0, 5.0 + ox, 7.0, acc, 0.4); }      // straps
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

// Coin stack — Tibia-style. Modes by count:
//  • FEW (1–4): coins face you, round with a visible face mark, lightly
//    clustered — easy to tell apart and count.
//  • 5: exactly the 2×2 of "4" plus ONE coin in the centre.
//  • MANY (6–15): coins pile into a triangular PYRAMID — a 1/2/3/4/5 stack
//    (apex→base), filled from the base up. The rows OVERLAP vertically so the
//    coins read as tokens stacked one on top of another (like the Tibia heap).
//    15 is the visual cap (the full mountain); more shows the same full stack.
// Each tier keeps its colour. Drawn top-row→bottom-row so fronts overlap.
function paintCoin(p, item) {
  const c = hexStr(item.color);
  const lit = shade(c, 1.6), dk = shade(c, 0.62), edge = outline(c);
  const n = Math.max(1, Math.min(15, Math.floor(item.count || 1)));

  // A tiny "mm" engraved on the coin face (the coin's name — "mm coins").
  // Drawn with smooth rendering (the icon is crispEdges, which would pixelate
  // small text) and a darker tone so it reads as stamped metal.
  const mmMark = (cx, cy, size) => {
    p.parts.push(
      `<text x="${cx}" y="${cy + size * 0.36}" font-family="Arial, sans-serif" font-weight="700" font-size="${size}" fill="${dk}" text-anchor="middle" shape-rendering="geometricPrecision" style="pointer-events:none">mm</text>`
    );
  };

  // A coin facing the viewer: round disc + rim + glint + the "mm" stamp.
  const R = 2.0;
  const coinFace = (cx, cy, r = R) => {
    p.circle(cx, cy + r * 0.16, r, dk, edge);            // thickness/shadow
    p.circle(cx, cy, r, c, edge);                        // body
    p.circle(cx, cy, r * 0.66, shade(c, 1.1), null);     // raised face
    p.circle(cx - r * 0.3, cy - r * 0.32, r * 0.32, lit, null); // glint
    mmMark(cx, cy, r * 0.82);                            // "mm" stamp on the face
  };

  // The 2×2 square used by counts 4 and 5.
  const SQUARE = [[6, 10.2], [10, 10.2], [6.7, 6.6], [10.3, 6.4]];

  // ---- FEW: 1–4 coins seen from the front ----------------------------------
  if (n <= 4) {
    const layouts = {
      1: [[8, 9]],
      2: [[6.4, 9.4], [9.6, 8.6]],
      3: [[6.2, 10], [9.8, 9.6], [8, 6.8]],
      4: SQUARE,
    };
    for (const [x, y] of layouts[n]) coinFace(x, y);
    return;
  }

  // ---- 5: the 2×2 square plus one coin in the centre -----------------------
  if (n === 5) {
    for (const [x, y] of SQUARE) coinFace(x, y);
    coinFace(8.25, 8.4);   // centre coin, drawn last so it sits on top
    return;
  }

  // ---- MANY (6–15): a triangular PYRAMID of stacked tokens -----------------
  // Round coins in rows that overlap VERTICALLY (small DY) so they look stacked
  // one on top of another. Triangle 1/2/3/4/5: base (5) at the bottom up to a
  // single coin at the apex. Filled from the base up, so it grows like a heap.
  const r = 1.7;
  const heapCoin = (cx, cy) => {
    p.circle(cx, cy + r * 0.5, r, dk, edge);             // thickness shown below
    p.circle(cx, cy, r, c, edge);                        // body
    p.circle(cx, cy, r * 0.6, shade(c, 1.12), null);     // face
    p.circle(cx - r * 0.32, cy - r * 0.34, r * 0.3, lit, null); // glint
    mmMark(cx, cy - r * 0.05, r * 0.72);                 // "mm" stamp (toward the visible upper face)
  };
  const DX = r * 1.16;   // horizontal step (< 2r → side overlap)
  const DY = r * 1.02;   // SMALL vertical step → rows overlap (stacked look)
  // Triangle rows from BASE (widest, bottom) up to the apex; sums to 15.
  const baseToApex = [5, 4, 3, 2, 1];
  const take = baseToApex.map(() => 0);
  let left = n;
  for (let ri = 0; ri < baseToApex.length && left > 0; ri++) {
    const t = Math.min(baseToApex[ri], left); take[ri] = t; left -= t;
  }

  const baseY = 13.4;    // bottom row sits low in the cell
  // Draw from the TOP row down so each lower (front) row overlaps the one above.
  for (let ri = baseToApex.length - 1; ri >= 0; ri--) {
    const k = take[ri];
    if (!k) continue;
    const y = baseY - ri * DY;
    const x0 = 8 - (k - 1) * DX / 2;
    for (let i = 0; i < k; i++) heapCoin(x0 + i * DX, y);
  }
}

function paintContainer(p, item) {
  const c = hexStr(item.color);
  const o = outline(c), lit = shade(c, 1.18), dk = shade(c, 0.72);
  const id = item.baseId || '';
  const big = (item.capacity || 8) >= 20;
  if (big) {
    // A real BACKPACK silhouette: a rounded pack body with two shoulder straps
    // arcing over the top, a buckled top flap and a front pocket — so it reads as
    // a backpack you'd wear, not a flat briefcase.
    // Shoulder straps behind the body.
    p.parts.push(`<path d="M5.4 5 Q 4 9 5 13" fill="none" stroke="${dk}" stroke-width="1.1"/>`);
    p.parts.push(`<path d="M10.6 5 Q 12 9 11 13" fill="none" stroke="${dk}" stroke-width="1.1"/>`);
    // Rounded body.
    p.parts.push(`<path d="M4 7 Q 4 4.5 8 4.5 Q 12 4.5 12 7 L 12 13 Q 12 14.4 10.6 14.4 L 5.4 14.4 Q 4 14.4 4 13 Z" fill="${c}" stroke="${o}" stroke-width="0.6"/>`);
    // Front pocket.
    p.parts.push(`<path d="M5.4 10 L 10.6 10 L 10.6 13.4 Q 10.6 14 10 14 L 6 14 Q 5.4 14 5.4 13.4 Z" fill="${dk}" stroke="${o}" stroke-width="0.5"/>`);
    // Top flap + buckle.
    p.parts.push(`<path d="M4.4 6.4 Q 8 5 11.6 6.4 L 11.6 9 Q 8 8.2 4.4 9 Z" fill="${lit}" stroke="${o}" stroke-width="0.5"/>`);
    p.px(7.2, 8.2, '#caa84a', 1.6, 1.0);              // buckle strap
    p.px(7.4, 8.3, shade('#caa84a', 0.7), 1.2, 0.7);
  } else {
    // A drawstring POUCH: a round sack pinched into a tied neck at the top, with
    // the cord ends poking up — clearly a little bag, not a skirt.
    p.parts.push(`<path d="M3.4 10.5 Q 3.4 6.6 8 6.6 Q 12.6 6.6 12.6 10.5 Q 12.6 14.6 8 14.6 Q 3.4 14.6 3.4 10.5 Z" fill="${c}" stroke="${o}" stroke-width="0.6"/>`);
    // Cinched neck.
    p.parts.push(`<path d="M6 6.8 Q 8 5.6 10 6.8 L 9.4 8 Q 8 7.2 6.6 8 Z" fill="${dk}" stroke="${o}" stroke-width="0.5"/>`);
    // Drawstring cords.
    p.line(6.6, 6.4, 5.6, 4.6, dk, 0.6);
    p.line(9.4, 6.4, 10.4, 4.6, dk, 0.6);
    p.circle(5.6, 4.6, 0.5, dk, null);
    p.circle(10.4, 4.6, 0.5, dk, null);
    // A soft highlight on the belly.
    p.circle(6.4, 10.2, 1.1, lit, null);
    p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.5"/>');
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
  const id = item.baseId || item.id || '';
  if (/torch/i.test(id)) {
    // A proper torch: a bound wooden haft topped by a layered teardrop FLAME
    // (deep red → orange → yellow → white core) with a couple of sparks, so it
    // unmistakably reads as fire, not a stick with a triangle. Brighter torches
    // burn taller/whiter and tint by their own glowColor.
    const glow = hexStr(item.glowColor || 0xffb24d);
    const tall = (item.radius || 9) >= 12; // bright torch
    p.line(8, 15, 8, 9, '#4a3019', 2.0);                 // haft
    p.line(8, 15, 8, 9, '#6a4423', 0.9);                 // haft highlight
    p.px(6.9, 8.4, '#3a2614', 2.2, 1.4);                 // binding/head
    p.line(7, 8.6, 9, 8.6, '#8a5a2a', 0.5);
    p.line(7, 9.2, 9, 9.2, '#8a5a2a', 0.5);
    // Flame, built from nested teardrops; the bright torch reaches higher.
    const top = tall ? 0.6 : 1.4;
    p.parts.push(`<path d="M8 ${top} Q 11.4 5 9.6 8.4 Q 8 10 6.4 8.4 Q 4.6 5 8 ${top} Z" fill="${shade(glow, 0.85)}"/>`);
    p.parts.push(`<path d="M8 ${top + 1.6} Q 10.4 5.6 9 8 Q 8 9.2 7 8 Q 5.6 5.6 8 ${top + 1.6} Z" fill="${glow}"/>`);
    p.parts.push(`<path d="M8 ${top + 3} Q 9.4 6 8.7 7.7 Q 8 8.6 7.3 7.7 Q 6.6 6 8 ${top + 3} Z" fill="${shade(glow, 1.4)}"/>`);
    p.circle(8, tall ? 5.8 : 6.6, 0.7, '#fff6c8', null); // white-hot core
    p.circle(10.3, 3.4, 0.45, '#ffd166', null);          // spark
    p.circle(5.9, 4.4, 0.35, '#ffb24d', null);           // spark
    if (tall) p.circle(9.4, 2.0, 0.35, '#fff0c0', null); // extra high spark
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
// Materials & trophies — beast scraps the player farms and sells. Each is drawn
// procedurally (NOT an emoji) like the rest of the items: the shape is inferred
// from the id keyword (scale, fang, hide, bone, essence, claw, wing, horn…) and
// tinted by the material's own colour, so silk, a dragon scale and a demon horn
// all read as distinct little objects.
// ---------------------------------------------------------------------------
// Trophy ids are `trophy_<family>` where <family> is the CREATURE name (rat,
// spider, demon…), NOT the body-part keyword in its display name. So keyword
// matching alone would dump nearly every trophy into the generic 'lump'. This
// map pins each family to the shape that matches what the trophy actually is
// (a Rat Tail is a tail, a Bat Wing is a wing, a Spider Leg is a leg…).
const TROPHY_FAMILY_SHAPE = {
  worm: 'tail', rat: 'tail', bat: 'wing', snake: 'hide', spider: 'leg',
  scorpion: 'fang', slime: 'blob', frog: 'leg', crab: 'fang', beetle: 'scale',
  wasp: 'fang', boar: 'fang', wolf: 'fang', bear: 'fang', deer: 'horn',
  chicken: 'wing', sheep: 'hide', goblin: 'ear', orc: 'fang', troll: 'silk',
  tiger: 'fang', crystal_dragon: 'scale',
  ogre: 'wood', kobold: 'fang', dwarf: 'silk', elf: 'silk', lizardman: 'scale',
  minotaur: 'horn', cyclops: 'eye', skeleton: 'bone', zombie: 'blob',
  ghost: 'essence', wraith: 'hide', vampire: 'fang', mimic: 'key', imp: 'horn',
  demon: 'horn', gargoyle: 'wing', golem: 'essence', elemental: 'essence',
  treant: 'wood', mushroom: 'mushroom', mandrake: 'wood', fairy: 'essence',
  dragon: 'fang', wyvern: 'fang', hydra: 'scale', serpent: 'scale',
  harpy: 'wing', shark: 'fang', jellyfish: 'blob', turtle: 'scale',
  cultist: 'tome', knight: 'crown', mage: 'crystal',
};

function matShape(id) {
  const s = String(id || '').toLowerCase();
  // Trophies resolve by family first (the part before keyword matching ever runs).
  if (s.startsWith('trophy_')) {
    const fam = s.slice('trophy_'.length);
    if (TROPHY_FAMILY_SHAPE[fam]) return TROPHY_FAMILY_SHAPE[fam];
  }
  // --- Keyword matching for materials. Specific shapes before generic ones. ---
  if (/key|lock/.test(s)) return 'key';
  if (/crown|crest/.test(s)) return 'crown';
  if (/eye/.test(s)) return 'eye';
  if (/ear/.test(s)) return 'ear';
  if (/egg/.test(s)) return 'egg';
  if (/tome|page|book|scroll|grimoire/.test(s)) return 'tome';
  if (/leg/.test(s)) return 'leg'; // spider/frog leg — a thin jointed limb, NOT a ball
  if (/wing|feather/.test(s)) return 'wing';
  if (/horn|antler|tusk/.test(s)) return 'horn';
  if (/fang|tooth|sting|talon|claw|stinger/.test(s)) return 'fang';
  if (/scale|shell|chitin|carapace|fin|plate/.test(s)) return 'scale';
  if (/bone|skull/.test(s)) return 'bone';
  if (/crystal|shard|gem|frost|mana/.test(s)) return 'crystal';
  if (/silk|thread|hair|braid|beard|lock|mane|fur(?!nace)/.test(s)) return 'silk';
  if (/hide|pelt|leather|wool|rags|cloak|robe|shroud|skin/.test(s)) return 'hide';
  if (/jelly|slime|tentacle|ectoplasm|flesh|ooze/.test(s)) return 'blob';
  if (/vial|venom|blood|antidote|poison|gland|potion|elixir/.test(s)) return 'vial';
  if (/honey|royal/.test(s)) return 'honey';
  if (/cheese/.test(s)) return 'cheese';
  if (/mushroom|spore|cap/.test(s)) return 'mushroom';
  if (/ingot/.test(s)) return 'ingot';
  if (/ore|iron|stone|rock|metal/.test(s)) return 'ore';
  if (/bark|wood|root|branch|splinter|stick/.test(s)) return 'wood';
  if (/essence|dust|soul|magma|hellfire|core|storm|spirit/.test(s)) return 'essence';
  if (/tail/.test(s)) return 'tail';
  return 'lump';
}

function paintMaterial(p, item) {
  const c = hexStr(item.color || 0x9a8a6a);
  const o = outline(c), lit = shade(c, 1.3), dk = shade(c, 0.7);
  switch (matShape(item.baseId)) {
    case 'scale':
      // Overlapping plates.
      p.poly('4,9 8,5 12,9 8,13', c, o);
      p.poly('6,8 8,6 10,8 8,10', lit, null);
      p.line(8, 6, 8, 12, dk, 0.5);
      break;
    case 'fang':
      // A curved tooth/claw.
      p.poly('6,3 10,4 8,14', c, o);
      p.poly('6.6,3.6 8.6,4.4 8,9', lit, null);
      break;
    case 'horn':
      p.parts.push(`<path d="M5 13 Q 6 5 12 3 Q 8 7 7.5 13 Z" fill="${c}" stroke="${o}" stroke-width="0.6"/>`);
      p.line(6.4, 11, 8.6, 6, lit, 0.6);
      break;
    case 'hide':
      // A stretched pelt.
      p.poly('4,5 7,3 9,3 12,5 11,12 8,14 5,12', c, o);
      p.circle(7, 7, 0.6, dk, null); p.circle(9.5, 8.5, 0.5, dk, null);
      break;
    case 'bone':
      p.line(5, 11, 11, 5, c, 2.2);
      p.circle(5, 11, 1.3, c, o); p.circle(4.2, 11.6, 1.0, c, o);
      p.circle(11, 5, 1.3, c, o); p.circle(11.8, 4.4, 1.0, c, o);
      break;
    case 'essence':
      p.circle(8, 8, 4.5, c, null);
      p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.3"/>');
      p.circle(8, 8, 2.6, lit, o);
      p.px(7, 6.4, '#ffffff', 1, 1, 0.8);
      break;
    case 'crystal':
      gem(p, 8, 8, 4, c);
      p.px(6.6, 6, '#ffffff', 0.9, 0.9, 0.85);
      break;
    case 'wing':
      p.parts.push(`<path d="M4 12 Q 5 4 13 5 Q 8 8 12 11 Q 8 10 4 12 Z" fill="${c}" stroke="${o}" stroke-width="0.6"/>`);
      p.line(5, 11, 12, 5.5, dk, 0.5);
      break;
    case 'silk':
      // A wound spool of thread.
      p.rectO(5, 5, 6, 6, c, o);
      for (let i = 0; i < 4; i++) p.line(5, 6 + i * 1.4, 11, 6 + i * 1.4, lit, 0.4);
      break;
    case 'vial':
      p.poly('6.5,3 9.5,3 9.5,5 11,13 5,13 6.5,5', shade('#cfe8ff', 1), '#9fb0c2');
      p.poly('6.2,8 9.8,8 10.6,13 5.4,13', c, null); // liquid
      break;
    case 'ore':
      // A rough mineral chunk with embedded glinting veins.
      p.poly('4,9 6,5 11,5 13,10 9,13 5,12', c, o);
      p.px(6, 7, lit, 2, 1.4, 0.7); // facet
      p.px(9.6, 8.4, shade(c, 1.6), 0.9, 0.9, 0.9); // ore speck
      p.px(7.2, 10.4, shade(c, 1.6), 0.8, 0.8, 0.9);
      break;
    case 'ingot':
      // A trapezoid metal bar with a bright top edge.
      p.poly('4.5,10 11.5,10 12.5,13 3.5,13', dk, o);
      p.poly('5,7.5 11,7.5 11.5,10 4.5,10', c, o);
      p.line(5.4, 8, 10.6, 8, lit, 0.6); // top sheen
      break;
    case 'wood':
      // A short log / root: rounded ends with grain rings.
      p.parts.push(`<path d="M4 6 Q 4 5 5 5 L 11 5 Q 12 5 12 6 L 12 10 Q 12 11 11 11 L 5 11 Q 4 11 4 10 Z" fill="${c}" stroke="${o}" stroke-width="0.6"/>`);
      p.circle(11, 8, 1.4, dk, null); // cut end
      p.circle(11, 8, 0.7, lit, null);
      p.line(5, 7, 10, 7, dk, 0.4); p.line(5, 9, 10, 9, dk, 0.4); // grain
      break;
    case 'mushroom':
      // Domed cap on a short stalk, with spots.
      p.px(7, 9, shade('#efe6d2', 1), 2, 4); // stalk
      p.parts.push(`<path d="M3.5 9 Q 8 2.5 12.5 9 Z" fill="${c}" stroke="${o}" stroke-width="0.6"/>`); // cap
      p.circle(6.4, 7, 0.6, lit, null); p.circle(9.6, 7.2, 0.5, lit, null); p.circle(8, 5.6, 0.5, lit, null); // spots
      break;
    case 'cheese':
      // A wedge with a couple of holes.
      p.poly('3,11 13,5 13,11', c, o);
      p.line(3, 11, 13, 11, dk, 0.5); // front rind edge
      p.circle(9, 9.4, 0.8, dk, null); p.circle(11, 8.2, 0.55, dk, null); // holes
      break;
    case 'honey':
      // A hex jar of glistening honey with a drip.
      p.poly('5,5 11,5 12,8 11,12 5,12 4,8', shade(c, 0.85), o);
      p.poly('5.6,5.6 10.4,5.6 11.2,8 10.4,11.2 5.6,11.2 4.8,8', c, null);
      p.px(6, 6.4, lit, 1.2, 4, 0.7); // sheen
      p.poly('7.4,12 8.6,12 8,14.4', c, null); // drip
      break;
    case 'blob':
      // A wobbly gelatinous droplet with a bright highlight (jelly/slime/ooze).
      p.parts.push(`<path d="M4 9 Q 4 4.5 8 4.5 Q 12 4.5 12 9 Q 12 13 8 13 Q 4 13 4 9 Z" fill="${c}" stroke="${o}" stroke-width="0.6"/>`);
      p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.85"/>');
      p.circle(6.6, 7.2, 1.0, shade(c, 1.7), null); // gloss
      p.circle(9.4, 10, 0.6, lit, null);
      break;
    case 'leg':
      // A thin jointed limb (spider/frog leg): two segments meeting at a knee,
      // tapering to a pointed tip — reads clearly as a leg, never a ball.
      p.line(3.5, 4, 8, 8.5, c, 1.7); // upper segment
      p.line(8, 8.5, 12.5, 13, c, 1.5); // lower segment
      p.line(3.5, 4, 8, 8.5, lit, 0.5); // segment glints
      p.line(8, 8.5, 12.5, 13, lit, 0.45);
      p.circle(8, 8.5, 1.1, shade(c, 0.85), o); // knee joint
      p.poly('12.5,13 13.8,13.6 13,11.8', c, o); // clawed tip
      break;
    case 'ear':
      // A pointed humanoid ear (goblin) with an inner fold.
      p.parts.push(`<path d="M6 13 Q 4 9 6 5 Q 8 3 10 4 Q 12 6 9.5 13 Z" fill="${c}" stroke="${o}" stroke-width="0.6"/>`);
      p.parts.push(`<path d="M7 11 Q 6 8 7.5 6 Q 9 5 9.5 7" fill="none" stroke="${dk}" stroke-width="0.6"/>`); // inner fold
      break;
    case 'tail':
      p.parts.push(`<path d="M4 13 Q 10 13 11 7 Q 11 4 8 4" fill="none" stroke="${c}" stroke-width="2"/>`);
      p.circle(8, 4, 1.0, c, o);
      break;
    case 'eye':
      p.circle(8, 8, 4, '#f0ece0', o);
      p.circle(8, 8, 2, c, null);
      p.circle(8, 8, 0.9, '#101014', null);
      p.px(6.8, 6.8, '#ffffff', 0.9, 0.9, 0.9);
      break;
    case 'crown':
      p.poly('4,12 4,7 6,9 8,5 10,9 12,7 12,12', c, o);
      p.circle(8, 6, 0.7, '#ff5a55', null);
      break;
    case 'key':
      p.circle(6, 6, 2.2, 'none', c); p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('stroke-width="0.6"', 'stroke-width="1.4"');
      p.line(7.5, 7.5, 12, 12, c, 1.4); p.line(12, 12, 13, 11, c, 1.4); p.line(11, 11, 12, 10, c, 1.4);
      break;
    case 'egg':
      p.parts.push(`<ellipse cx="8" cy="9" rx="3.2" ry="4" fill="${c}" stroke="${o}" stroke-width="0.6"/>`);
      p.px(6.6, 6.5, lit, 1.2, 1.6, 0.7);
      break;
    case 'tome':
      p.rectO(4, 4, 8, 9, c, o);
      p.px(4, 4, dk, 1.4, 9); // spine
      p.line(6, 6.5, 11, 6.5, lit, 0.4); p.line(6, 8.5, 11, 8.5, lit, 0.4); p.line(6, 10.5, 11, 10.5, lit, 0.4);
      break;
    default: // 'lump' — a rounded nugget of stuff
      p.circle(8, 9, 3.6, c, o);
      p.circle(6.6, 7.6, 1.1, lit, null);
  }
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
  if (item.kind === 'light') { paintLight(p, item); uniqueStamp(p, item); return; }
  if (item.kind === 'potion') {
    // Potions are the ONE exception to the uniqueness rule (no stamp): they may
    // look near-identical and vary only by liquid colour.
    return (item.tier === 'fruit') ? paintFruit(p, item) : paintPotion(p, item);
  }
  // Beast scraps: materials and trophies get a drawn icon (not an emoji).
  if (item.kind === 'material' || item.kind === 'trophy' || item.type === 'trophy') { paintMaterial(p, item); uniqueStamp(p, item); return; }
  // Containers.
  if (item.slot === 'bag' || item.type === 'container') { paintContainer(p, item); uniqueStamp(p, item); return; }
  // Weapons by type.
  if (item.type && WEAPON_PAINTERS[item.type]) { WEAPON_PAINTERS[item.type](p, item, t); uniqueStamp(p, item); return; }
  // Armour by slot.
  if (item.slot && SLOT_PAINTERS[item.slot]) { SLOT_PAINTERS[item.slot](p, item, t); uniqueStamp(p, item); return; }
  // Shield can arrive as type:'shield' (handled above) or slot:'shield'.
  if (item.slot === 'shield') { paintShield(p, item, t); uniqueStamp(p, item); return; }
  // Fallback: a labelled tile so nothing is invisible.
  p.rectO(2, 2, 12, 12, hexStr(item.color || 0x888888), outline(item.color || 0x888888));
  p.px(6, 6, '#fff', 4, 4, 0.6);
  uniqueStamp(p, item);
}

// ---------------------------------------------------------------------------
// Public API with a string cache keyed by the visually-relevant fields.
// ---------------------------------------------------------------------------
const cache = new Map();

function cacheKey(item, mirror) {
  // Coins are the one item whose icon changes with the stack size (the pile
  // grows 1→25), so the count is part of their key. Other stackables (potions,
  // etc.) look the same at any count, so count is excluded to keep cache hits.
  const coinCount = item.kind === 'coin' ? Math.min(15, Math.max(1, Math.floor(item.count || 1))) : '';
  return [
    item.kind || '', item.type || '', item.slot || '', item.baseId || '',
    item.element || '', item.rarity || '', item.color || '', item.tier || '',
    item.coverage || '', item.capacity || '', item.speedBonus || '', item.levelReq || '',
    coinCount, mirror ? 'M' : '',
  ].join('|');
}

// Returns an inline <svg> string for the given backpack/equip item instance.
// Accepts both backpack instances (baseId) and raw shop definitions (id), and
// for definitions infers `slot` from a 'container'/weapon shape where needed.
// `opts.mirror` flips the icon horizontally — used when a weapon is held in the
// off-hand (shield slot), so it reads as gripped in the other hand.
export function iconFor(item, opts) {
  if (!item) return '';
  const mirror = !!(opts && opts.mirror);
  // Shop defs carry `id` not `baseId`; normalise so per-item painters can match.
  if (!item.baseId && item.id) item = { ...item, baseId: item.id };
  const key = cacheKey(item, mirror);
  let svg = cache.get(key);
  if (svg) return svg;
  const p = new Painter();
  try { paintItem(p, item); } catch (_) { /* leave whatever drew */ }
  svg = mirror ? p.mirrorSvg() : p.svg();
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
