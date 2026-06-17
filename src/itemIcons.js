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
  // Elemental flair along the blade edge (so a Magma Axe reads as fire, etc.).
  elementEdge(p, item, hx - 4.8 * sc, hy - 0.6 * sc, hx - 5.4 * sc, hy + 2.6 * sc);
  if (el && t > 0.3 && v !== 'hatchet') p.circle(hx - 2.4 * sc, hy + 1.0 * sc, 0.7, el, outline(el));
}

// Adds element-themed flair (flame licks / frost shards / venom drips / sparks)
// running along an edge from (x1,y1) to (x2,y2). No-op for non-elemental gear.
function elementEdge(p, item, x1, y1, x2, y2) {
  const e = item.element;
  if (!e || e === 'none') return;
  const id = item.baseId || '';
  const dx = (x2 - x1) / 3, dy = (y2 - y1) / 3;
  const fire = /fire|magma|flame|inferno|phoenix|hellforged|demon/.test(id) || e === 'fire';
  const ice = /frost|glacial|ice|winter|crystal/.test(id) || e === 'water';
  const pois = /venom|blight|poison|toxic|nature/.test(id) || e === 'plant';
  for (let i = 0; i <= 3; i++) {
    const x = x1 + dx * i, y = y1 + dy * i;
    if (fire) { p.poly(`${x},${y} ${x - 1.0},${y - 1.8} ${x + 0.6},${y - 0.6}`, '#ff6a2a', null); if (i % 2) p.px(x - 1.2, y - 2.0, '#ffd23a', 0.6, 0.6, 0.9); }
    else if (ice) { p.poly(`${x},${y} ${x - 0.5},${y - 1.4} ${x + 0.5},${y - 0.9}`, '#dff6ff', '#bfe6ff'); }
    else if (pois) { p.circle(x, y + 0.4, 0.45, '#5fd23a', null); if (i % 2) p.circle(x - 0.2, y + 1.4, 0.3, '#7fe04a', null); }
  }
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
  // Elemental flair on the upper limb (flame_bow burns, frost_bow ices, etc.).
  elementEdge(p, item, 9.5, 4.0, 11.5, 2.5);
  // A small id-coloured nock bead so two same-shape bows never match.
  p.px(3.0, 7.6, accentColor(item.baseId || '', 7), 0.8, 0.8, 0.85);
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

// Wands & staves. Every one differs by: SHAFT (length/wood/straight·bent·knotted)
// and TIP EFFECT (single/twin/triple orb, crystal gem, flame, poison drip, ice
// shards, eye). Named staves get a signature effect; the rest derive a stable
// one from the id, so no two ever match.
const WAND_TIP = {           // signature tip effect per famous staff/wand
  staff_of_flames: 'flame', wand_of_inferno: 'flame', staff_of_chaos: 'flame',
  staff_of_blight: 'poison', wand_of_decay: 'poison', void_wand: 'poison',
  glacial_staff: 'ice', frost_bow: 'ice',
  cosmic_staff: 'triple', genesis_staff: 'triple', spellbinder_rod: 'triple',
  mystic_staff: 'twin', moonlight_rod: 'twin', snakebite_rod: 'twin',
  arcane_wand: 'gem', aqua_wand: 'orb', water_wand: 'orb', fire_wand: 'flame', plant_wand: 'poison',
};
const WAND_SHAFT = {         // shaft style per id family
  glacial_staff: 'crystal', staff_of_blight: 'knotted', wand_of_decay: 'knotted',
  cosmic_staff: 'spiral', genesis_staff: 'spiral', mystic_staff: 'bent', moonlight_rod: 'bent',
};

function paintWand(p, item, t) {
  const c = hexStr(item.color);
  const id = item.baseId || item.id || '';
  const v = variantOf(item, t > 0.55 ? 'staff' : 'wand');
  const woods = ['#4a2f1b', '#3a2614', '#5a3a22', '#2f2436', '#43331f', '#564a3a'];
  const shaftC = woods[hashId(id) % woods.length];
  const orb = ELEMENT_COLOR[item.element] || c;
  const acc = accentColor(id, 5);

  // Length scales with class: wand short, rod medium, staff long.
  const len = v === 'wand' ? 0 : v === 'rod' ? 1 : 2;
  const bx = 5.2 - len * 0.7, by = 13.0 + len * 0.4;     // butt (bottom)
  const tx = 10.2 + len * 0.4, ty = 4.6 - len * 0.9;     // head (top)
  const tipType = WAND_TIP[id] || ['orb', 'twin', 'gem', 'orb', 'flame'][hashId(id) % 5];
  const shaftType = WAND_SHAFT[id] || ['straight', 'bent', 'knotted'][hashId(id) % 3];

  // --- SHAFT --------------------------------------------------------------
  const sw = 1.2 + len * 0.3;
  if (shaftType === 'bent') {
    // a gently bent wooden shaft (two segments)
    const mxb = (bx + tx) / 2 - 1.0, myb = (by + ty) / 2;
    p.parts.push(`<path d="M${bx} ${by} Q ${mxb} ${myb} ${tx} ${ty}" fill="none" stroke="${shaftC}" stroke-width="${sw}" stroke-linecap="round"/>`);
    p.parts.push(`<path d="M${bx} ${by} Q ${mxb} ${myb} ${tx} ${ty}" fill="none" stroke="${shade(shaftC, 1.3)}" stroke-width="0.5" stroke-linecap="round"/>`);
  } else if (shaftType === 'knotted') {
    p.line(bx, by, tx, ty, shaftC, sw);
    p.line(bx, by, tx, ty, shade(shaftC, 1.3), 0.5);
    // knots/burls along it
    for (const k of [0.32, 0.62]) { const kx = bx + (tx - bx) * k, ky = by + (ty - by) * k; p.circle(kx, ky, sw * 0.6, shade(shaftC, 0.8), outline(shaftC)); }
  } else if (shaftType === 'crystal') {
    // an ice/crystal staff: pale faceted shaft
    p.line(bx, by, tx, ty, '#bfe6ff', sw);
    p.line(bx, by, tx, ty, '#eaffff', 0.5);
  } else if (shaftType === 'spiral') {
    p.line(bx, by, tx, ty, shaftC, sw);
    // spiral wrap
    for (let k = 0.2; k < 0.9; k += 0.16) { const kx = bx + (tx - bx) * k, ky = by + (ty - by) * k; p.px(kx - 0.4, ky, acc, 0.9, 0.45, 0.85); }
  } else {
    p.line(bx, by, tx, ty, shaftC, sw);
    p.line(bx, by, tx, ty, shade(shaftC, 1.3), 0.5);
  }
  // dark grip near the butt
  p.line(bx + 0.2, by - 0.2, bx + 1.3, by - 1.7, '#2a1a10', sw + 0.2);

  // --- TIP EFFECT ---------------------------------------------------------
  const gx = tx + 0.4, gy = ty - 0.2;
  const drawOrb = (x, y, r, col) => { p.circle(x, y, r, col, outline(col)); p.circle(x - r * 0.3, y - r * 0.3, r * 0.4, shade(col, 1.9), null); };
  const glow = (x, y, r, col, op) => { p.circle(x, y, r, mix(col, '#ffffff', 0.15), null); p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` opacity="${op}"/>`); };
  const haloOp = item.rarity === 'legendary' ? 0.5 : 0.3;

  switch (tipType) {
    case 'flame': { // a flame burning at the tip
      glow(gx, gy, 2.4, '#ff7a2a', haloOp + 0.1);
      p.poly(`${gx},${gy - 2.4} ${gx - 1.3},${gy + 0.8} ${gx + 1.3},${gy + 0.8}`, '#ff6a2a', null);
      p.poly(`${gx},${gy - 1.5} ${gx - 0.8},${gy + 0.6} ${gx + 0.8},${gy + 0.6}`, '#ffd23a', null);
      p.px(gx - 1.6, gy - 2.6, '#ffb04a', 0.7, 0.7, 0.9); p.px(gx + 1.3, gy - 1.8, '#ff8a3a', 0.6, 0.6, 0.9); // embers
      break;
    }
    case 'poison': { // a green orb dripping venom
      drawOrb(gx, gy, 1.5, '#5fd23a');
      p.parts.push(`<path d="M${gx - 0.4} ${gy + 1.3} Q ${gx - 0.6} ${gy + 3.2} ${gx} ${gy + 3.6} Q ${gx + 0.6} ${gy + 3.2} ${gx + 0.4} ${gy + 1.3} Z" fill="#4fb02a"/>`); // drip
      p.circle(gx, gy + 4.0, 0.5, '#7fe04a', null);
      break;
    }
    case 'ice': { // a cluster of ice shards
      for (const [dx, h] of [[-1.1, 2.0], [0, 2.8], [1.1, 2.0]]) p.poly(`${gx + dx},${gy + 0.8} ${gx + dx - 0.55},${gy - h} ${gx + dx + 0.55},${gy + 0.8}`, '#dff6ff', '#bfe6ff');
      glow(gx, gy - 0.6, 1.8, '#cdeeff', haloOp);
      break;
    }
    case 'triple': { // three small orbs in a fan
      glow(gx, gy, 2.4, orb, haloOp);
      drawOrb(gx - 1.5, gy + 0.6, 0.9, orb);
      drawOrb(gx + 1.5, gy + 0.6, 0.9, orb);
      drawOrb(gx, gy - 1.2, 1.0, mix(orb, '#ffffff', 0.2));
      break;
    }
    case 'twin': { // two orbs (main + accent bead)
      drawOrb(gx, gy, 1.5, orb);
      drawOrb(gx - 1.8, gy + 1.6, 0.75, mix(orb, acc, 0.5));
      break;
    }
    case 'gem': { // a faceted crystal instead of a round orb
      glow(gx, gy, 2.0, orb, haloOp);
      gem(p, gx, gy, 1.7, orb);
      break;
    }
    default: { // single orb in claw prongs (classic staff) or plain (wand)
      if (v !== 'wand') { // claw prongs cradle the orb
        const prongC = ['#d9c46a', '#c8ccd2', acc][hashId(id) % 3];
        p.line(gx - 1.4, gy + 0.4, gx - 0.4, gy - 1.0, prongC, 0.8);
        p.line(gx + 1.4, gy + 0.4, gx + 0.4, gy - 1.0, prongC, 0.8);
        glow(gx, gy, 2.2, orb, haloOp);
      }
      drawOrb(gx, gy, v === 'wand' ? 1.5 : 1.6, orb);
      // collar motif below keeps same-colour wands apart
      p.circle(gx - 1.1, gy + 1.3, 0.5, acc, outline(acc));
    }
  }
  // a small id-coloured rune speck on the shaft for extra per-id variety
  p.px(bx + (tx - bx) * 0.5 - 0.3, by + (ty - by) * 0.5, acc, 0.7, 0.7, 0.85);
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
    // Light retouch: a soft top-left sheen + four edge rivets so plain heaters
    // read as forged metal, not a flat plate.
    p.poly('5,3.6 8,3.0 7,6 4.6,6', shade(c, 1.3), null);
    p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.45"/>');
    for (const [rx, ry] of [[4.4, 4.2], [11.6, 4.2], [8, 12.6]]) p.circle(rx, ry, 0.35, shade(c, 1.4), outline(c));
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
// Every helmet has its OWN silhouette (Tibia 7.4 style) — no two share a shape.
// Small reusable parts (dome, brim, visor, horns…) compose each one; a switch on
// the item id picks the bespoke build, falling back to a tiered generic helm.
function paintHelmet(p, item, t) {
  const c = hexStr(item.color);
  const id = item.baseId || item.id || '';
  const o = outline(c), lt = shade(c, 1.32), dk = shade(c, 0.64);

  // --- shared part builders ------------------------------------------------
  const dome = (col, top = 4.0, w = 4.6) =>
    p.parts.push(`<path d="M${8 - w} 11 A ${w} ${11 - top} 0 0 1 ${8 + w} 11 Z" fill="${col}" stroke="${outline(col)}" stroke-width="0.6"/>`);
  const brow = (col, lift = 0) => p.px(3.4, 10.2 - lift, col, 9.2, 1.1);           // open brow band
  const faceGuard = (col) => { p.px(3.6, 9.8, col, 8.8, 3.2); p.px(5.2, 10.8, outline(col), 5.6, 0.9); }; // closed visor + slit
  const cross = (col) => { p.px(7.5, 6.0, col, 1.0, 5.0, 0.9); p.px(6.2, 7.6, col, 3.6, 1.0, 0.9); };     // crusader cross
  const plume = (col, x, h) => { for (let i = 0; i < 3; i++) p.poly(`${x},${4.0 + i * 0.4} ${x - 1.4},${2.0 + i * 0.5 - h} ${x + 0.6},${3.6 + i * 0.4}`, col, null); };
  const sideHorn = (col, dirOut) => {
    const s = dirOut, bx = s > 0 ? 12.2 : 3.8;
    p.poly(`${bx},10 ${bx + s * 3.2},8.4 ${bx + s * 1.6},10.8`, col, outline(col));   // curved cattle horn
  };
  const upHorn = (col, x, dir) => p.poly(`${x},9 ${x + dir * 1.2},3.0 ${x + dir * 2.6},9`, col, outline(col)); // big up-swept demon horn

  switch (id) {
    case 'cloth_hood': { // soft fabric hood with a draped cowl
      p.parts.push(`<path d="M4 12 Q 4 4 8 4 Q 12 4 12 12 Q 10 10.5 8 10.8 Q 6 10.5 4 12 Z" fill="${c}" stroke="${o}" stroke-width="0.6"/>`);
      p.parts.push(`<path d="M6 11.6 Q 8 9.8 10 11.6" fill="${dk}" stroke="none"/>`);   // face shadow
      p.line(5.4, 6.0, 6.6, 5.2, lt, 0.5);
      return;
    }
    case 'straw_hat': { // wide conical straw brim
      p.poly('8,4.2 11,10.6 5,10.6', c, o);
      p.px(2.8, 10.4, shade(c, 0.9), 10.4, 1.4);
      p.line(5.4, 9.6, 10.6, 9.6, shade(c, 0.8), 0.4); p.line(6.2, 7.6, 9.8, 7.6, shade(c, 0.8), 0.4); // weave
      return;
    }
    case 'wizard_hat': { // tall pointed star hat with a droop
      p.poly('9.0,1.8 11.4,12 4.6,12', c, o);
      p.poly('9.0,1.8 10.2,3.0 8.4,3.2', dk, null);   // folded droop tip
      p.px(3.6, 11.4, shade(c, 0.82), 8.8, 1.4);      // brim
      p.circle(8.2, 6.2, 0.6, '#ffe066', null);
      for (const [sx, sy] of [[6.6, 8.2], [9.4, 9.2], [7.8, 10.2]]) p.px(sx, sy, '#ffe066', 0.8, 0.8, 0.95);
      return;
    }
    case 'leather_helmet': { // small leather cap with a stitched seam
      dome(c, 5.0, 4.2);
      brow(shade(c, 0.85));
      p.line(8, 5.4, 8, 9.6, dk, 0.5);                // centre seam
      for (let y = 6; y <= 9; y += 1.5) { p.px(7.7, y, lt, 0.6, 0.5, 0.8); }   // stitches
      return;
    }
    case 'studded_helmet': { // leather cap dotted with metal studs
      dome(c, 5.0, 4.2);
      brow(shade(c, 0.85));
      for (const [sx, sy] of [[6.2, 7.2], [9.8, 7.2], [8, 6.0], [6.6, 9.0], [9.4, 9.0]]) p.circle(sx, sy, 0.42, '#cfd3d8', o);
      return;
    }
    case 'chain_helmet': { // mail coif — a dome made of ring texture
      dome(c, 4.4);
      brow(shade(c, 0.9));
      for (let y = 6; y <= 10; y += 1.3) for (let x = 4.6; x <= 11; x += 1.2) p.circle(x, y, 0.34, shade(c, 1.15), null);
      return;
    }
    case 'iron_helmet': { // conical nasal helm (Norman) — pointed top + nose bar
      p.poly('8,2.8 12,11 4,11', c, o);
      p.px(3.6, 10.4, shade(c, 0.85), 8.8, 1.2);      // rim
      p.px(7.5, 9.2, dk, 1.0, 3.0, 0.95);             // nasal bar
      p.line(8, 3.4, 8, 9.0, lt, 0.5);
      return;
    }
    case 'brass_helmet': { // open kettle hat with a wide brim
      dome(c, 5.0, 3.8);
      p.px(2.6, 10.0, shade(c, 1.05), 10.8, 1.3);     // wide kettle brim
      p.px(2.6, 11.3, shade(c, 0.8), 10.8, 0.7);
      p.line(8, 5.6, 8, 9.4, lt, 0.5);
      return;
    }
    case 'steel_helmet': { // closed barbute with a Y visor slit
      dome(c, 3.6);
      faceGuard(shade(c, 0.85));
      p.px(7.6, 8.4, outline(c), 0.9, 2.6, 0.95);     // vertical slit (Y-barbute)
      p.line(5.2, 6.2, 6.6, 5.4, lt, 0.6);
      return;
    }
    case 'warrior_helmet': { // open helm with a side plume
      dome(c, 3.8);
      brow(shade(c, 1.05));
      faceGuard(shade(c, 0.8));
      plume('#d63b3b', 3.0, 0.6);                      // red side plume
      return;
    }
    case 'crusader_helmet': { // great helm: flat-top box with cross + slit
      p.parts.push(`<path d="M4 6 Q 4 4 8 4 Q 12 4 12 6 L 12 12.5 Q 8 13.5 4 12.5 Z" fill="${c}" stroke="${o}" stroke-width="0.6"/>`);
      p.px(4.2, 7.6, outline(c), 7.6, 0.7);            // eye slit
      cross(shade(c, 0.7));                            // riveted cross
      p.px(5.4, 11.0, dk, 5.2, 0.5);                   // breath holes row
      return;
    }
    case 'crown_helmet': { // jewelled crown
      const gold = '#f0d878';
      p.px(4, 9, gold, 8, 2);
      p.poly('4,9 5,5 6,9 8,4.5 10,9 11,5 12,9', gold, outline(gold));
      gem(p, 8, 8, 1.2, ELEMENT_COLOR[item.element] || '#ff5a55');
      p.circle(5.6, 9.6, 0.5, '#4d7dff', null); p.circle(10.4, 9.6, 0.5, '#4caf50', null);
      return;
    }
    case 'royal_helmet': { // ornate closed helm with a tall feather crest
      dome(c, 3.6);
      faceGuard(shade(c, 0.82));
      p.px(5.2, 10.8, outline(c), 5.6, 0.9);
      plume('#e8d24a', 8, 1.4);                        // golden crest feathers
      p.circle(8, 8.6, 0.45, '#ff5a55', o);            // brow gem
      return;
    }
    case 'dragon_helmet': { // fanged dragon maw helm with back-swept horns
      dome(c, 4.0);
      faceGuard(shade(c, 0.78));
      for (const s of [-1, 1]) p.poly(`${8 + s * 2.2},5.4 ${8 + s * 4.0},3.0 ${8 + s * 2.6},6.6`, shade(c, 0.6), o); // horns
      // jagged fang teeth along the mouth
      for (let i = 0; i < 4; i++) p.poly(`${5.2 + i * 1.2},11.4 ${5.8 + i * 1.2},12.8 ${6.4 + i * 1.2},11.4`, '#f5efe0', null);
      p.circle(6.4, 9.0, 0.5, '#ffcc33', null); p.circle(9.6, 9.0, 0.5, '#ffcc33', null); // glowing eyes
      return;
    }
    case 'frost_helmet': { // glacial helm crowned with ice shards
      dome(c, 4.2);
      brow(shade(c, 1.1));
      for (const [sx, h] of [[5.4, 2.2], [8, 1.4], [10.6, 2.2]]) p.poly(`${sx},6 ${sx - 0.7},${h} ${sx + 0.7},6`, '#dff6ff', '#bfe6ff'); // ice spikes
      p.line(8, 6.6, 8, 9.6, '#eaffff', 0.6);
      return;
    }
    case 'demon_helmet': case 'demon_helmet2': { // demonic helm, huge swept horns + glowing eyes
      dome(c, 4.4);
      faceGuard(shade(c, 0.7));
      upHorn(shade(c, 0.6), 4.6, -1); upHorn(shade(c, 0.6), 11.4, 1);   // big up-swept horns
      p.poly('6.0,9.4 7.2,9.0 6.6,10.4', '#ff5a2a', null); p.poly('10.0,9.4 8.8,9.0 9.4,10.4', '#ff5a2a', null); // angry glowing eyes
      return;
    }
    case 'horned_helmet': { // viking helm with curved cattle horns to the sides
      dome(c, 4.4);
      brow(shade(c, 1.05));
      sideHorn('#efe8d0', 1); sideHorn('#efe8d0', -1);
      p.px(7.5, 5.0, lt, 1.0, 4.0, 0.6);               // centre ridge
      return;
    }
    case 'celestial_helmet': { // radiant helm with a halo and feathered wings
      dome(c, 4.4);
      brow(shade(c, 1.1));
      p.parts.push(`<ellipse cx="8" cy="4.2" rx="3.2" ry="0.9" fill="none" stroke="#fff3a0" stroke-width="0.7"/>`); // halo
      for (const s of [-1, 1]) { p.poly(`${8 + s * 3.0},9 ${8 + s * 5.4},7.4 ${8 + s * 3.0},10.6`, '#fffce0', '#e8dca0'); } // wings
      return;
    }
    case 'warden_helmet': { // nature warden: open helm wreathed in leaves
      dome(c, 4.4);
      brow(shade(c, 1.05));
      for (const s of [-1, 1]) { p.poly(`${8 + s * 2.6},8.4 ${8 + s * 4.2},6.8 ${8 + s * 3.2},9.4`, '#6fbf4c', '#3f7a32'); p.poly(`${8 + s * 3.2},9.6 ${8 + s * 4.6},8.6 ${8 + s * 3.6},10.4`, '#5aa83f', '#3f7a32'); }
      p.circle(8, 8.6, 0.5, '#cfe9a0', null);
      return;
    }
  }

  // --- generic fallback: a tiered dome helm (open or closed) ---------------
  const closed = item.coverage === 'closed';
  dome(c, 4.0);
  if (closed) faceGuard(shade(c, 0.85)); else brow(shade(c, 1.1));
  if (t > 0.5) p.line(8, 6.4, 8, 9.0, '#ffe066', 0.7);  // crest glint on fancy tiers
  p.line(5.0, 7.4, 6.6, 6.4, lt, 0.6);
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
  const o = outline(c), lt = shade(c, 1.25), dk = shade(c, 0.66);
  const soft = /cloth|leather|studded|robe|shirt/i.test(id);

  // Themed chest overlay drawn ON TOP of the plate/tunic base, so every armour
  // has its own signature even when two share a colour.
  const themeOverlay = () => {
    switch (id) {
      case 'dragon_armor': // dragon scales + a fanged crest at the collar
        for (let r = 0; r < 3; r++) for (let cx = 0; cx < 3 - (r % 2); cx++) p.poly(`${5.6 + cx * 1.6 + (r % 2) * 0.8},${7 + r * 1.6} ${6.4 + cx * 1.6 + (r % 2) * 0.8},${8 + r * 1.6} ${5.6 + cx * 1.6 + (r % 2) * 0.8},${9 + r * 1.6} ${4.8 + cx * 1.6 + (r % 2) * 0.8},${8 + r * 1.6}`, shade(c, 1.12), dk);
        p.circle(8, 5.6, 0.5, '#ffcc33', null); break;            // glowing core
      case 'frost_armor': // icy rime — pale shards on the chest
        for (const [sx, sy, h] of [[6.4, 9, 1.6], [9.6, 9, 1.6], [8, 7.4, 2.0]]) p.poly(`${sx},${sy} ${sx - 0.6},${sy - h} ${sx + 0.6},${sy - h}`, '#dff6ff', '#bfe6ff');
        break;
      case 'demon_armor': case 'abyssal_armor': // demon face on the chest
        p.poly('6,6.6 4.6,4.6 6.8,6', dk, null); p.poly('10,6.6 11.4,4.6 9.2,6', dk, null); // horns
        p.circle(6.8, 8.4, 0.5, '#ff5a2a', null); p.circle(9.2, 8.4, 0.5, '#ff5a2a', null); // eyes
        p.poly('6.6,10.4 9.4,10.4 8,11.6', '#2a0008', null); break;  // fanged grin
      case 'golden_armor': case 'royal_armor': // ornate filigree + central gem
        p.line(6, 7, 6, 12, lt, 0.4); p.line(10, 7, 10, 12, lt, 0.4);
        gem(p, 8, 8.6, 1.1, id === 'royal_armor' ? '#7fe0ff' : '#ff5a55'); break;
      case 'celestial_armor': // radiant star + wings hint
        p.poly('8,6.2 8.6,8 10.4,8 9,9.2 9.5,11 8,9.9 6.5,11 7,9.2 5.6,8 7.4,8', '#fff3a0', null); break;
      case 'warden_armor': // leafy nature breastplate
        for (const s of [-1, 1]) p.poly(`${8 + s * 1.6},9 ${8 + s * 3.0},7.6 ${8 + s * 2.0},9.8`, '#6fbf4c', '#3f7a32');
        p.circle(8, 8.6, 0.6, '#cfe9a0', null); break;
      case 'scale_armor': // overlapping scale rows
        for (let r = 0; r < 3; r++) for (let cx = 0; cx < 3; cx++) p.parts.push(`<path d="M${5.4 + cx * 1.7},${7 + r * 1.7} a 0.85 0.85 0 0 1 1.7 0 z" fill="${shade(c, 1.1)}" stroke="${dk}" stroke-width="0.3"/>`);
        break;
      case 'chain_armor': // mail ring texture
        for (let y = 6.5; y <= 12; y += 1.2) for (let x = 5.2; x <= 10.8; x += 1.1) p.circle(x, y, 0.32, shade(c, 1.15), null);
        break;
    }
  };

  // --- Mage robe: long hooded robe (not a plate). ---
  if (/mage_robe|robe/i.test(id)) {
    p.poly('5.5,4 10.5,4 12,13.5 4,13.5', c, o);
    p.poly('6.6,4 9.4,4 8,7', shade(c, 0.75), null);
    p.line(8, 6.5, 8, 13, shade(c, 0.7), 0.6);
    p.line(5.2, 13.4, 10.8, 13.4, '#e0c060', 0.7);
    p.circle(8, 9.5, 1.0, accentColor(id, 8), outline(c));
    p.line(6.2, 5.6, 6.0, 12.6, shade(c, 1.3), 0.4);
    return;
  }

  // --- Heavy plate base + theme overlay. ---
  if (!soft) {
    paintPlateBody(p, c, { gem: (!THEMED_ARMOR.has(id) && t > 0.7) ? (ELEMENT_COLOR[item.element] || '#f0d878') : null });
    themeOverlay();
    p.circle(8, 12.0, 0.4, accentColor(id, 9), null);  // unique rivet
    return;
  }

  // --- Soft tunic / shirt / leather (laced). ---
  p.poly('4.5,4 11.5,4 11.5,13 8,14 4.5,13', c, o);
  p.circle(4.2, 5.0, 1.6, shade(c, 1.0), o);
  p.circle(11.8, 5.0, 1.6, shade(c, 1.0), o);
  p.poly('6.5,4 9.5,4 8,6', shade(c, 0.8), null);
  p.line(8, 6, 8, 12.5, shade(c, 0.7), 0.5);
  for (let y = 6.5; y < 12; y += 1.4) p.line(7.2, y, 8.8, y, shade(c, 1.2), 0.4);
  p.px(4.7, 11.4, shade(c, 0.6), 6.6, 1.0);
  if (/studded/i.test(id)) for (const [sx, sy] of [[6, 7], [10, 7], [6.5, 9.5], [9.5, 9.5]]) p.circle(sx, sy, 0.4, '#cfc0a0', null);
  p.circle(8, 11.9, 0.45, accentColor(id, 9), null);
}
const THEMED_ARMOR = new Set(['dragon_armor', 'frost_armor', 'demon_armor', 'abyssal_armor', 'golden_armor', 'royal_armor', 'celestial_armor', 'warden_armor', 'scale_armor', 'chain_armor']);

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
  // Themed leg overlay so dragon/frost/demon/golden… legs each read distinct.
  const legX = [5.9, 10.1];
  switch (id) {
    case 'dragon_legs': // scale rows down each greave + a small claw at the cuff
      for (const lx of legX) for (let r = 0; r < 3; r++) p.poly(`${lx},${7 + r * 1.8} ${lx + 0.9},${8 + r * 1.8} ${lx},${9 + r * 1.8} ${lx - 0.9},${8 + r * 1.8}`, shade(c, 1.12), dk);
      break;
    case 'frost_legs': for (const lx of legX) for (const [sy, h] of [[8, 1.4], [11, 1.4]]) p.poly(`${lx},${sy} ${lx - 0.5},${sy - h} ${lx + 0.5},${sy - h}`, '#dff6ff', '#bfe6ff'); break;
    case 'demon_legs': case 'abyssal_legs': for (const lx of legX) { p.circle(lx, 8.6, 0.45, '#ff5a2a', null); p.poly(`${lx - 0.8},11 ${lx + 0.8},11 ${lx},12.2`, '#2a0008', null); } break;
    case 'golden_legs': case 'golden_legs2': case 'royal_legs': for (const lx of legX) { p.line(lx, 6, lx, 12.5, lt, 0.4); p.circle(lx, 9, 0.5, id === 'golden_legs2' || id === 'royal_legs' ? '#7fe0ff' : '#ffe066', o); } break;
    case 'celestial_legs': for (const lx of legX) p.poly(`${lx},7.4 ${lx + 0.5},8.6 ${lx - 0.5},8.6`, '#fff3a0', null); break;
    case 'warden_legs': for (const lx of legX) p.poly(`${lx},8.6 ${lx + 1.2},7.4 ${lx + 0.4},9.2`, '#6fbf4c', '#3f7a32'); break;
    case 'scale_legs': for (const lx of legX) for (let r = 0; r < 4; r++) p.parts.push(`<path d="M${lx - 0.85},${6.6 + r * 1.5} a 0.85 0.7 0 0 1 1.7 0 z" fill="${shade(c, 1.1)}" stroke="${dk}" stroke-width="0.3"/>`); break;
    case 'chain_legs': for (const lx of legX) for (let y = 6.5; y <= 12; y += 1.2) p.circle(lx, y, 0.32, shade(c, 1.15), null); break;
  }
  // Unique id accent on the waist clasp.
  p.circle(8, 4.1, 0.45, accentColor(id, 9), null);
}

// Boots are drawn FRONT-ON, Tibia 7.4 style: a pair of boots stood side by side,
// each a tall leg opening (cuff) at the top narrowing to a rounded toe at the
// bottom — exactly like the classic Steel Boots sprite. The two boots sit at the
// left/right of the cell (ox = left boot start, +6 for the right boot).
function paintBoots(p, item, t) {
  const c = hexStr(item.color);
  const id = item.baseId || item.id || '';

  // One LOW SHOE seen from the front-3/4 — ankle DOWN only (no tall boot shaft):
  // a short ankle opening on top, a rounded instep/heel, and a TOE that juts
  // forward to one side. `dir` (-1 left, +1 right) points the toe outward so the
  // pair splays apart like a stood-up pair of shoes. `style`: 'plate' (steel,
  // rivets), 'soft' (rounded slipper), default.
  //   x = the shoe's inner (toward-centre) edge of the ankle.
  const boot = (x, dir, col, style, tall) => {
    const o = outline(col), lt = shade(col, 1.32), dk = shade(col, 0.62);
    const ankleW = 2.6;                 // width of the ankle collar
    const al = x, ar = x + ankleW;      // ankle left/right
    // A tall boot has its collar up at knee height; a low shoe sits at the ankle.
    const topY = tall ? 3.0 : 6.6;      // top of the shaft / ankle collar
    const ankleY = 6.6;                 // where a tall shaft meets the foot
    const instepY = 8.6;                // top of the instep
    const baseY = 12.4;                 // ground line (sole top)
    const toeTip = (dir > 0 ? ar : al) + 2.4 * dir;   // toe juts outward
    const heelX  = (dir > 0 ? al : ar) - 0.3 * dir;   // heel a touch back
    // Tall boots get a vertical shaft (knee→ankle) drawn first, behind the foot.
    if (tall) {
      p.poly(`${al},${topY} ${ar},${topY} ${ar},${ankleY} ${al},${ankleY}`, col, o);
      p.line(x + 0.6, topY + 0.8, x + 0.6, ankleY - 0.3, lt, 0.5);   // shaft sheen
      if (style === 'plate') {
        p.line(al, topY + 1.4, ar, topY + 1.4, dk, 0.5);             // cuff band
        p.line(al, ankleY - 0.6, ar, ankleY - 0.6, dk, 0.45);       // knee/shin seam
      }
    }
    const collarY = tall ? ankleY : topY;   // where the foot's top points sit
    // Foot, clockwise from the back of the collar:
    //  collar back → collar front → instep → toe-top → toe-tip → sole-front
    //  → sole-back(heel) → heel-up.
    p.poly([
      `${heelX},${collarY}`,
      `${dir > 0 ? ar : al},${collarY}`,              // collar front
      `${dir > 0 ? ar + 0.4 : al - 0.4},${instepY}`,  // instep curve
      `${toeTip - 0.6 * dir},${instepY + 0.6}`,       // over the toes
      `${toeTip},${baseY - 0.8}`,                     // toe front
      `${toeTip - 0.9 * dir},${baseY}`,               // rounded toe tip on the ground
      `${heelX + 0.5 * dir},${baseY}`,                // sole back / heel base
      `${heelX},${baseY - 1.0}`,                      // heel back up
    ].join(' '), col, o);
    // Opening: a small ankle mouth on a low shoe, or the knee-high cuff on a boot.
    p.parts.push(`<ellipse cx="${x + ankleW / 2}" cy="${topY + 0.1}" rx="${ankleW / 2 - 0.2}" ry="0.6" fill="${dk}"/>`);
    if (style !== 'soft') p.parts.push(`<ellipse cx="${x + ankleW / 2}" cy="${topY + 0.1}" rx="${ankleW / 2 - 0.2}" ry="0.6" fill="none" stroke="${o}" stroke-width="0.35"/>`);
    // Instep highlight (a curved sheen over the top of the foot).
    p.line(x + 0.6, instepY, toeTip - 1.0 * dir, instepY + 0.4, lt, 0.5);
    if (style === 'plate') {
      // Steel: a metal seam over the instep + two rivets.
      p.line(al, instepY, ar, instepY, dk, 0.5);
      p.circle(x + 0.7, instepY - 1.2, 0.3, lt, o);
      p.circle(x + 1.9, instepY - 1.2, 0.3, lt, o);
    }
  };

  // Pair layout: ankles near the centre, toes splaying OUTWARD (left shoe toe
  // points left, right shoe toe points right) — a stood-up pair of shoes.
  const LX = 5.0, RX = 8.4;   // ankle inner-edge x of left / right shoe

  const winged = id === 'winged_boots' || id === 'hermes_boots';
  const soft = id === 'soft_boots';
  const fast = id === 'fast_boots' || (!winged && !soft && (item.speedBonus || 0) > 0.18);

  // Steel & iron boots are the only TALL ones — knee-high greaves, not low shoes.
  const tall = id === 'steel_boots' || id === 'iron_boots';

  // --- Steel Boots: greenish-steel plated, knee-high. ---
  if (id === 'steel_boots') {
    const steel = '#9fb8a8';
    boot(LX, -1, steel, 'plate', true);
    boot(RX, +1, steel, 'plate', true);
    return;
  }

  // The two boots (haste boots use a tan/yellow body; soft a rounded slipper).
  const bodyCol = id === 'fast_boots' ? '#d9b24a' : c;
  const style = soft ? 'soft' : 'normal';
  boot(LX, -1, bodyCol, style, tall);
  boot(RX, +1, bodyCol, style, tall);

  // Boots of Haste accent: a yellow band across each shoe's instep.
  if (id === 'fast_boots') {
    p.px(LX - 0.2, 8.4, '#ffe066', 2.8, 0.9, 0.95);
    p.px(RX - 0.4, 8.4, '#ffe066', 2.8, 0.9, 0.95);
  }

  // Per-id instep trim / strap so same-colour shoes differ — keeps every boot
  // icon unique. Skipped for the special boots above.
  if (!winged && !soft && !fast) {
    const acc = accentColor(id, 9);
    const variant = Math.floor(hrand(id, 12) * 3);
    for (const x of [LX, RX]) {
      if (variant === 0) { p.px(x - 0.2, 7.0, acc, 2.8, 0.7, 0.95); }                  // collar band
      else if (variant === 1) { p.circle(x + 0.6, 8.0, 0.3, acc, null); p.circle(x + 1.6, 8.4, 0.3, acc, null); } // studs on instep
      else { p.line(x + 0.2, 8.2, x + 2.2, 8.6, acc, 0.4); }                           // strap across instep
    }
  }

  // Wings flank each shoe's ankle, pointing outward (Hermes/winged/haste/fast).
  if (winged) {
    const wc = id === 'hermes_boots' ? '#fff0a0' : '#dff2ff';
    const wo = id === 'hermes_boots' ? '#dcb' : '#bcd';
    p.poly(`${LX},7.0 ${LX - 2.6},5.4 ${LX},8.2`, wc, wo);
    p.poly(`${LX},8.0 ${LX - 1.6},7.0 ${LX},9.0`, shade(wc, 0.92), wo);
    p.poly(`${RX + 2.6},7.0 ${RX + 5.2},5.4 ${RX + 2.6},8.2`, wc, wo);
    p.poly(`${RX + 2.6},8.0 ${RX + 4.2},7.0 ${RX + 2.6},9.0`, shade(wc, 0.92), wo);
  } else if (fast) {
    const w = '#fdf6d8', wo = '#caa';
    p.poly(`${LX},7.2 ${LX - 2.1},5.9 ${LX},8.4`, w, wo);
    p.poly(`${RX + 2.6},7.2 ${RX + 4.7},5.9 ${RX + 2.6},8.4`, w, wo);
  }
}

// Amulets — a chain plus a PENDANT whose shape varies by id: plain bead/string
// necklaces, gem-cut pendants (round/oval/teardrop/marquise by hash), and themed
// charms (dragon claw, demon skull, phoenix feather, holy star, frost shard).
function paintAmulet(p, item, t) {
  const c = hexStr(item.color);
  const id = item.baseId || item.id || '';
  const o = outline(c), lt = shade(c, 1.5), dk = shade(c, 0.6);
  const chainC = /string_necklace|wooden_amulet/.test(id) ? '#8a6a3a' : '#d9c46a';
  // Chain arc + bail.
  p.parts.push(`<path d="M4 4 A 4 4 0 0 0 12 4" fill="none" stroke="${chainC}" stroke-width="0.8"/>`);
  const cx = 8, cy = 9.6;
  const bail = () => p.circle(cx, cy - 3.3, 0.7, chainC, '#9a7');

  switch (id) {
    case 'string_necklace': // beads on a cord, no gem
      for (let i = -2; i <= 2; i++) p.circle(8 + i * 1.3, 6.0 + Math.abs(i) * 0.5, 0.55, '#caa472', '#876');
      return;
    case 'dragon_amulet': { // a curved dragon claw clutching a gem
      bail(); p.parts.push(`<path d="M${cx} ${cy - 2.5} Q ${cx + 3} ${cy} ${cx + 1.2} ${cy + 3} Q ${cx} ${cy + 1} ${cx} ${cy - 2.5} Z" fill="${c}" stroke="${o}" stroke-width="0.5"/>`);
      p.circle(cx - 0.6, cy + 0.4, 1.0, '#ff5a55', '#a22'); return;
    }
    case 'demon_amulet': { // a little horned skull
      bail(); p.circle(cx, cy + 0.4, 1.9, c, o);
      p.poly(`${cx - 1.6},${cy - 1} ${cx - 2.6},${cy - 2.8} ${cx - 0.6},${cy - 1.6}`, dk, null);
      p.poly(`${cx + 1.6},${cy - 1} ${cx + 2.6},${cy - 2.8} ${cx + 0.6},${cy - 1.6}`, dk, null);
      p.circle(cx - 0.7, cy, 0.4, '#ff5a2a', null); p.circle(cx + 0.7, cy, 0.4, '#ff5a2a', null);
      p.poly(`${cx - 0.8},${cy + 1.4} ${cx + 0.8},${cy + 1.4} ${cx},${cy + 2.4}`, dk, null); return;
    }
    case 'phoenix_amulet': { // a feather pendant
      bail(); p.parts.push(`<path d="M${cx} ${cy - 2.6} Q ${cx + 1.6} ${cy} ${cx} ${cy + 3} Q ${cx - 1.6} ${cy} ${cx} ${cy - 2.6} Z" fill="${c}" stroke="${o}" stroke-width="0.5"/>`);
      p.line(cx, cy - 2.4, cx, cy + 2.8, dk, 0.4);
      for (let i = -2; i <= 2; i++) p.line(cx, cy + i * 0.8, cx + (i % 2 ? 1.0 : -1.0), cy + i * 0.8 + 0.6, dk, 0.3);
      return;
    }
    case 'celestial_amulet': case 'amulet_of_loss': { // a radiant star / holy charm
      bail(); const sc = id === 'amulet_of_loss' ? '#e8e8f0' : '#fff3a0';
      p.poly(`${cx},${cy - 2.6} ${cx + 0.8},${cy - 0.6} ${cx + 2.6},${cy - 0.4} ${cx + 1.1},${cy + 0.9} ${cx + 1.6},${cy + 2.8} ${cx},${cy + 1.6} ${cx - 1.6},${cy + 2.8} ${cx - 1.1},${cy + 0.9} ${cx - 2.6},${cy - 0.4} ${cx - 0.8},${cy - 0.6}`, sc, '#cc9');
      return;
    }
    case 'frost_amulet': { // an ice shard pendant
      bail(); p.poly(`${cx},${cy - 3} ${cx + 1.4},${cy} ${cx},${cy + 3.2} ${cx - 1.4},${cy}`, '#cdeeff', '#9cf');
      p.line(cx, cy - 2.6, cx, cy + 2.8, '#fff', 0.4); return;
    }
  }

  // Generic gem pendant — cut varies by hash so same-colour amulets differ.
  bail();
  const cut = hashId(id) % 4;
  if (cut === 0) gem(p, cx, cy, 3.0, c);                                  // diamond cut
  else if (cut === 1) { p.parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="2.2" ry="3.0" fill="${c}" stroke="${o}" stroke-width="0.5"/>`); p.parts.push(`<ellipse cx="${cx - 0.5}" cy="${cy - 0.8}" rx="0.8" ry="1.0" fill="${lt}"/>`); }  // oval
  else if (cut === 2) { p.parts.push(`<path d="M${cx} ${cy - 2.8} Q ${cx + 2.4} ${cy + 0.5} ${cx} ${cy + 3} Q ${cx - 2.4} ${cy + 0.5} ${cx} ${cy - 2.8} Z" fill="${c}" stroke="${o}" stroke-width="0.5"/>`); p.circle(cx - 0.5, cy - 0.4, 0.7, lt, null); } // teardrop
  else { p.poly(`${cx},${cy - 3} ${cx + 2},${cy} ${cx},${cy + 3} ${cx - 2},${cy}`, c, o); p.poly(`${cx},${cy - 3} ${cx + 1.2},${cy - 0.6} ${cx},${cy} ${cx - 1.2},${cy - 0.6}`, lt, null); } // marquise
  p.px(cx - 1.0, cy - 1.4, '#ffffff', 0.8, 0.8, 0.85);                    // sparkle

  if ((item.speedBonus || 0) > 0) { // swiftness/haste charms get clear wings
    const wc = '#fff0a0', wo = '#dcb';
    p.poly('5,9.5 2.4,8.4 5,10.5', wc, wo); p.poly('5,10.2 2.8,9.4 5,11.0', shade(wc, 0.92), wo);
    p.poly('11,9.5 13.6,8.4 11,10.5', wc, wo); p.poly('11,10.2 13.2,9.4 11,11.0', shade(wc, 0.92), wo);
  }
}

// Rings — a gold/silver band seen at an angle with a mounted gem/motif on top.
// The band tint + gem colour + motif vary by family (skill / magic / regen) so
// each of the 24 rings reads distinct.
function paintRing(p, item, t) {
  const id = item.baseId || item.id || '';
  const c = hexStr(item.color);
  // Band metal: skill rings = steel, mage = gold-violet, regen = the item colour.
  const band = /mage_ring/.test(id) ? '#d9b341' : /life_ring|mana_ring/.test(id) ? '#cfc4a8' : '#c8ccd2';
  const bo = outline(band), bl = shade(band, 1.4);
  // The ring band: an ellipse ring (torus look) tilted, lower in the cell.
  p.parts.push(`<ellipse cx="8" cy="10.6" rx="3.4" ry="2.4" fill="none" stroke="${bo}" stroke-width="2.0"/>`);
  p.parts.push(`<ellipse cx="8" cy="10.6" rx="3.4" ry="2.4" fill="none" stroke="${band}" stroke-width="1.2"/>`);
  p.parts.push(`<ellipse cx="6.4" cy="9.4" rx="0.7" ry="0.5" fill="${bl}" opacity="0.8"/>`); // band glint
  // The mounted gem / motif on the crown of the ring.
  const gx = 8, gy = 6.6;
  // Tier pips (1/2/3) shown as small studs on the shoulders for the evolution.
  const tier = /3$/.test(id) ? 3 : /2$/.test(id) ? 2 : 1;
  for (let i = 0; i < tier; i++) p.circle(4.6 + i * 0.0 + (i - (tier - 1) / 2) * 1.3, 8.6, 0.32, bl, bo);
  if (/mage_ring/.test(id)) { // glowing arcane gem + sparkle
    p.circle(gx, gy, 2.2, mix(c, '#ffffff', 0.15), null); p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.3"/>');
    gem(p, gx, gy, 1.8, c); p.px(gx - 1.0, gy - 1.2, '#ffffff', 0.8, 0.8, 0.9);
  } else if (/life_ring/.test(id)) { // a red heart-ish round gem
    p.circle(gx, gy, 1.7, c, outline(c)); p.circle(gx - 0.5, gy - 0.5, 0.55, shade(c, 1.8), null);
    p.px(gx - 0.4, gy + 0.2, '#fff', 0.5, 0.9, 0.7);
  } else if (/mana_ring/.test(id)) { // a blue droplet gem
    p.parts.push(`<path d="M${gx} ${gy - 2.0} Q ${gx + 1.6} ${gy} ${gx} ${gy + 1.8} Q ${gx - 1.6} ${gy} ${gx} ${gy - 2.0} Z" fill="${c}" stroke="${outline(c)}"/>`);
    p.circle(gx - 0.5, gy - 0.3, 0.5, shade(c, 1.8), null);
  } else if (/distance_ring/.test(id)) { // a green gem with a tiny arrow etch
    gem(p, gx, gy, 1.7, c); p.line(gx - 1.0, gy + 0.8, gx + 1.0, gy - 0.8, '#eafff0', 0.5); p.poly(`${gx + 1.0},${gy - 0.8} ${gx + 0.2},${gy - 0.7} ${gx + 0.8},${gy + 0.1}`, '#eafff0', null);
  } else { // melee rings (sword/axe/club/lance): a faceted steel gem + weapon glint
    gem(p, gx, gy, 1.7, c);
    if (/sword_ring|lance_ring/.test(id)) p.line(gx, gy - 1.4, gx, gy + 1.4, '#fff', 0.5);     // blade line
    else if (/axe_ring/.test(id)) p.poly(`${gx - 1.0},${gy} ${gx + 0.4},${gy - 1.2} ${gx + 0.4},${gy + 1.2}`, '#fff', null); // axe glint
    else p.circle(gx, gy, 0.6, '#fff', null);   // club knob
  }
}

// ---------------------------------------------------------------------------
// Consumables, containers, currency, lights.
// ---------------------------------------------------------------------------
function paintPotion(p, item) {
  const c = hexStr(item.color);
  const both = item.restoreType === 'both';
  // Big/strong potions read as fat ROUND-BELLIED flasks with a bordered rim;
  // small ones as a slightly rounder vial. Either way it's bulbous, not boxy.
  const big = item.restorePct || (item.restore || 0) >= 500 || item.tier === 'elite' || item.tier === 'high';
  const glass = '#cfe3ef', glassO = '#8aa';
  if (big) {
    // Round belly flask (a sphere of glass) with a short neck and corked rim.
    p.circle(8, 10, 3.7, glass, glassO);
    p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.45"/>');
    // Liquid fills the bowl as a clipped disc.
    p.parts.push(`<path d="M4.7 9.4 A 3.4 3.4 0 0 0 11.3 9.4 Q 11.3 12.8 8 13.4 Q 4.7 12.8 4.7 9.4 Z" fill="${c}"/>`);
    if (both) p.parts.push(`<path d="M8 9.4 L 11.3 9.4 A 3.4 3.4 0 0 1 8 13.4 Z" fill="#4d7dff"/>`);
    // Meniscus highlight + glass shine.
    p.parts.push(`<path d="M5.0 9.2 A 3.2 3.2 0 0 1 11.0 9.2" fill="none" stroke="${shade(c, 1.5)}" stroke-width="0.5"/>`);
    p.parts.push(`<ellipse cx="6.4" cy="9" rx="0.9" ry="1.6" fill="#ffffff" opacity="0.4"/>`);
    // Short wide neck + thick bordered rim (the "borde" the user wants).
    p.px(6.6, 4.6, glass, 2.8, 2.2, 0.55);
    p.px(6.0, 4.0, '#e6eef5', 4.0, 1.0, 0.9);     // bordered lip
    p.px(6.6, 2.7, '#7a5230', 2.8, 1.4);          // cork
    if (item.restorePct) { p.px(9.2, 8.4, '#ffffff', 0.9, 0.9, 0.95); p.px(6.2, 11.2, '#ffffff', 0.7, 0.7, 0.8); } // sparkle
    return;
  }
  // Small vial: a rounded bottom bottle (no hard corners).
  p.parts.push(`<path d="M6 5 L 10 5 L 10 8.5 Q 11.4 9.5 11.4 11.4 Q 11.4 13.4 8 13.4 Q 4.6 13.4 4.6 11.4 Q 4.6 9.5 6 8.5 Z" fill="${glass}" stroke="${glassO}" stroke-width="0.5"/>`);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('stroke-width="0.5"/>', 'stroke-width="0.5" opacity="0.55"/>');
  // Liquid in the rounded lower bulb.
  p.parts.push(`<path d="M5.0 10 Q 5.0 13.0 8 13.0 Q 11 13.0 11 10 Q 9 11 5.0 10 Z" fill="${c}"/>`);
  if (both) p.parts.push(`<path d="M8 10 Q 11 10.2 11 10 Q 11 13 8 13 Z" fill="#4d7dff"/>`);
  // Neck + cork + shine.
  p.px(6.4, 3.2, glass, 3.2, 2.0, 0.6);
  p.px(6.6, 2.4, '#7a5230', 2.8, 1.2);
  p.parts.push(`<ellipse cx="6.6" cy="11" rx="0.7" ry="1.3" fill="#ffffff" opacity="0.4"/>`);
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
  } else if (/star/i.test(id)) {
    // A bright five-point star crest on the flap + a couple of sparkles.
    const sx = 8, sy = 8.4;
    p.poly(`${sx},${sy - 2.4} ${sx + 0.7},${sy - 0.6} ${sx + 2.3},${sy - 0.5} ${sx + 1.0},${sy + 0.7} ${sx + 1.4},${sy + 2.4} ${sx},${sy + 1.4} ${sx - 1.4},${sy + 2.4} ${sx - 1.0},${sy + 0.7} ${sx - 2.3},${sy - 0.5} ${sx - 0.7},${sy - 0.6}`, '#ffe066', '#caa84a');
    p.px(5.2, 6.0, '#ffffff', 0.7, 0.7, 0.9); p.px(11, 7.2, '#ffffff', 0.6, 0.6, 0.9);
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
  // Glowing gems — each tier a DISTINCT cut, not just a recoloured diamond.
  const glow = hexStr(item.glowColor || item.color);
  const lt = shade(c, 1.7), dk = shade(c, 0.6), o = outline(c);
  const halo = (r, op = 0.22) => { p.circle(8, 8, r, glow, null); p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` opacity="${op}"/>`); };

  switch (id) {
    case 'diamond_gem': { // BRILLIANT-CUT DIAMOND: a wide crown table + facets + sparkle
      halo(6.2, 0.3);
      const ice = '#eaffff';
      // table (flat top) + crown
      p.poly('5,5.4 11,5.4 12.5,7.4 8,8 3.5,7.4', ice, '#a9d8ee');     // crown
      p.poly('5,5.4 11,5.4 9.6,6.6 6.4,6.6', '#ffffff', null);          // table facet (bright)
      // pavilion (point down) with facet lines
      p.poly('3.5,7.4 12.5,7.4 8,13.4', '#cdeeff', '#a9d8ee');
      p.line(3.5, 7.4, 8, 13.4, '#ffffff', 0.4); p.line(12.5, 7.4, 8, 13.4, '#ffffff', 0.4);
      p.line(6.4, 6.6, 7.4, 10, shade('#cdeeff', 0.85), 0.4); p.line(9.6, 6.6, 8.6, 10, shade('#cdeeff', 0.85), 0.4);
      p.line(8, 8, 8, 13.0, '#ffffff', 0.4);
      // sparkles / star glints
      for (const [sx, sy, s] of [[6.2, 5.0, 1.2], [10.6, 6.6, 0.9], [8, 9.5, 0.8]]) { p.line(sx - s, sy, sx + s, sy, '#ffffff', 0.5); p.line(sx, sy - s, sx, sy + s, '#ffffff', 0.5); }
      return;
    }
    case 'ruby': { // round brilliant — circular with a star of facets
      halo(5.6, 0.26);
      p.circle(8, 8, 3.6, c, o);
      p.poly('8,4.6 10.4,7 8,8 5.6,7', lt, null);                       // top facet
      for (const a of [0, 1, 2, 3, 4, 5]) { const ang = a / 6 * Math.PI * 2; p.line(8, 8, 8 + Math.cos(ang) * 3.4, 8 + Math.sin(ang) * 3.4, dk, 0.35); }
      p.px(6.4, 6.2, '#ffffff', 1.0, 1.0, 0.9);
      return;
    }
    case 'emerald': { // step / emerald cut — rectangle with parallel facet steps
      halo(5.6, 0.22);
      p.poly('5,4.8 11,4.8 11.6,6 11.6,10 11,11.2 5,11.2 4.4,10 4.4,6', c, o);
      for (const y of [6.2, 7.6, 9.0]) p.line(5.2, y, 10.8, y, dk, 0.4);  // steps
      p.poly('5,4.8 11,4.8 10,6 6,6', lt, null);                          // top step bright
      p.px(5.8, 5.4, '#ffffff', 0.9, 0.9, 0.85);
      return;
    }
    case 'sapphire': { // oval cut
      halo(5.6, 0.24);
      p.parts.push(`<ellipse cx="8" cy="8" rx="3.0" ry="4.0" fill="${c}" stroke="${o}" stroke-width="0.5"/>`);
      p.parts.push(`<ellipse cx="8" cy="6.4" rx="1.8" ry="1.4" fill="${lt}"/>`);
      p.line(8, 4, 8, 12, dk, 0.35); p.line(5.4, 8, 10.6, 8, dk, 0.35);
      p.px(6.8, 5.6, '#ffffff', 0.9, 0.9, 0.85);
      return;
    }
    case 'amethyst': { // marquise (pointed oval)
      halo(5.6, 0.24);
      p.poly('8,3.4 10.8,8 8,12.6 5.2,8', c, o);
      p.poly('8,3.4 9.8,7 8,8 6.2,7', lt, null);
      p.line(8, 3.4, 8, 12.6, dk, 0.35);
      p.px(6.8, 6.0, '#ffffff', 0.8, 0.8, 0.85);
      return;
    }
    case 'glow_pebble': { // a smooth glowing river stone
      halo(5.4, 0.3);
      p.parts.push(`<ellipse cx="8" cy="8.4" rx="3.6" ry="2.9" fill="${c}" stroke="${o}" stroke-width="0.5"/>`);
      p.parts.push(`<ellipse cx="6.8" cy="7.2" rx="1.3" ry="0.9" fill="#ffffff" opacity="0.7"/>`);
      return;
    }
  }
  // Other coloured gems (amber, topaz, rose, aqua, onyx, opal, garnet, star…):
  // pick a DISTINCT cut by id-hash so none repeats the diamond/ruby silhouette.
  halo(5.5, 0.26);
  const cut = hashId(id) % 5;
  if (cut === 0) {          // pear / teardrop
    p.parts.push(`<path d="M8 4 Q 11 8 11 10.4 Q 11 13 8 13 Q 5 13 5 10.4 Q 5 8 8 4 Z" fill="${c}" stroke="${o}" stroke-width="0.5"/>`);
    p.poly('8,5 9.6,9 8,10 6.4,9', lt, null); p.line(8, 4, 8, 13, dk, 0.35);
  } else if (cut === 1) {   // trillion (triangle)
    p.poly('8,4 12.4,12 3.6,12', c, o); p.poly('8,5.6 10.6,11 8,10 5.4,11', lt, null);
  } else if (cut === 2) {   // hexagon
    p.poly('8,4 11.6,6 11.6,10 8,12 4.4,10 4.4,6', c, o); p.poly('8,4 11.6,6 8,8 4.4,6', lt, null);
    p.line(8, 8, 8, 12, dk, 0.35);
  } else if (cut === 3) {   // cushion (rounded square) with cross facets
    p.parts.push(`<rect x="4.6" y="4.6" width="6.8" height="6.8" rx="1.6" fill="${c}" stroke="${o}" stroke-width="0.5"/>`);
    p.line(4.6, 4.6, 11.4, 11.4, dk, 0.35); p.line(11.4, 4.6, 4.6, 11.4, dk, 0.35); p.poly('8,5.2 9.4,8 8,8 6.6,8', lt, null);
  } else {                  // round brilliant (different facet star than ruby)
    p.circle(8, 8, 3.7, c, o); p.poly('5,6 11,6 9.6,8 6.4,8', lt, null);
    for (const a of [0.3, 1.35, 2.4]) { const ang = a * Math.PI; p.line(8, 8, 8 + Math.cos(ang) * 3.5, 8 + Math.sin(ang) * 3.5, dk, 0.35); }
  }
  p.px(6.5, 5.8, '#ffffff', 0.9, 0.9, 0.9);   // sparkle
}

// A mace/club: a wooden haft with a heavy flanged head at the top. Fire maces
// (Thunder Hammer etc.) get a small ember on the head.
// Maces / clubs / hammers — NOT just "stick + ball". The head shape is chosen by
// the item: wooden knob clubs, studded clubs, flanged maces, a spiked
// morning-star ball, and proper square-headed WAR HAMMERS / mauls (some double-
// headed) for the *_hammer ids. Each gets its element accent + per-id glint.
function paintMace(p, item) {
  const head = hexStr(item.color);
  const id = item.baseId || item.id || '';
  const haft = '#5a3a22';
  const lt = shade(head, 1.3), dk = shade(head, 0.68), o = outline(head);
  const el = ELEMENT_COLOR[item.element];
  // Diagonal haft, grip near bottom-left, head up top-right.
  const hx = 9.4, hy = 4.6;     // head centre
  p.line(6.4, 14, hx - 0.4, hy + 1.4, haft, 1.8);
  p.line(6.4, 14, hx - 0.4, hy + 1.4, shade(haft, 1.3), 0.5);
  p.circle(6.4, 14, 0.8, shade(haft, 0.8), outline(haft));     // pommel
  p.line(6.6, 12.4, 7.4, 11.0, '#3a2614', 1.7);                // grip wrap

  const isHammer = /hammer|maul/.test(id);
  const dbl = /war_hammer|dragon_hammer|thunder_hammer|hammer_of_wrath/.test(id); // double-headed
  if (isHammer) {
    // A blocky hammer head crossing the haft top, optionally double-faced.
    p.parts.push(`<rect x="${hx - 2.6}" y="${hy - 1.8}" width="${dbl ? 5.4 : 4.0}" height="3.6" rx="0.5" fill="${head}" stroke="${o}" stroke-width="0.5"/>`);
    p.px(hx - 2.4, hy - 1.6, lt, dbl ? 5.0 : 3.6, 0.8, 0.9);   // top bevel
    p.px(hx - 2.4, hy + 1.0, dk, dbl ? 5.0 : 3.6, 0.7, 0.9);   // bottom bevel
    p.line(hx - 0.2, hy - 1.8, hx - 0.2, hy + 1.8, dk, 0.5);   // face seam
    if (dbl) { p.px(hx - 2.9, hy - 1.2, dk, 0.6, 2.4, 0.9); p.px(hx + 2.5, hy - 1.2, dk, 0.6, 2.4, 0.9); } // two faces
    if (el) p.circle(hx, hy, 0.8, el, o);                       // elemental rune on the face
  } else if (/morning_star/.test(id)) {
    // Spiked ball (morning star).
    p.circle(hx, hy, 2.0, head, o);
    for (let a = 0; a < 8; a++) { const ang = a / 8 * Math.PI * 2; p.poly(`${hx + Math.cos(ang) * 2.6},${hy + Math.sin(ang) * 2.6} ${hx + Math.cos(ang - 0.25) * 1.7},${hy + Math.sin(ang - 0.25) * 1.7} ${hx + Math.cos(ang + 0.25) * 1.7},${hy + Math.sin(ang + 0.25) * 1.7}`, dk, null); }
    p.circle(hx - 0.6, hy - 0.6, 0.7, lt, null);
    if (el) p.circle(hx, hy, 0.8, el, null);
  } else if (/^club$|studded_club/.test(id)) {
    // A knobbly wooden club (tapered, wider at top).
    p.poly(`${hx - 1.6},${hy + 2.4} ${hx + 1.6},${hy + 2.4} ${hx + 2.0},${hy - 2.2} ${hx - 1.4},${hy - 2.6}`, '#7a5430', '#3a2614');
    p.line(hx - 0.6, hy + 2.0, hx - 0.2, hy - 2.0, '#8a5a2a', 0.5);
    if (/studded/.test(id)) for (const [sx, sy] of [[hx - 0.6, hy - 1], [hx + 0.7, hy + 0.2], [hx - 0.4, hy + 1.4], [hx + 0.9, hy - 1.6]]) p.circle(sx, sy, 0.42, '#cfd3d8', '#666');
  } else {
    // Flanged mace: a chunky head with vertical flanges around it.
    p.circle(hx, hy, 2.3, head, o);
    for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2; p.poly(`${hx + Math.cos(ang) * 2.9},${hy + Math.sin(ang) * 2.9} ${hx + Math.cos(ang - 0.3) * 1.8},${hy + Math.sin(ang - 0.3) * 1.8} ${hx + Math.cos(ang + 0.3) * 1.8},${hy + Math.sin(ang + 0.3) * 1.8}`, shade(head, 1.1), o); }
    p.circle(hx - 0.7, hy - 0.7, 0.7, lt, null);
    if (el) p.circle(hx, hy, 0.9, el, o);
  }
  // tiny ember/spark for fire/thunder hammers
  if (/thunder|wrath|inferno/.test(id)) p.px(hx + 1.6, hy - 2.6, '#ffe066', 0.8, 0.8, 0.9);
}

// A long lance/polearm: a slim shaft running corner-to-corner with a long
// leaf-shaped point, plus a little pennant near the grip (Jarvan-style).
// Lances / spears / polearms — a long shaft corner-to-corner with a varied head
// (leaf, narrow spike, barbed harpoon, or a broad halberd) and, on most, a
// CLOTH PENNANT/banner hanging near the head that flutters back down the shaft.
function paintLance(p, item) {
  const blade = hexStr(item.color);
  const id = item.baseId || item.id || '';
  const haft = id === 'dragon_lance' ? '#3a2030' : '#6a4a2a';
  const lt = shade(blade, 1.25), dk = shade(blade, 0.78), o = outline(blade);
  const el = ELEMENT_COLOR[item.element];
  // Shaft bottom-left → upper-right.
  p.line(2.6, 14, 11.6, 3.4, haft, 1.4);
  p.line(2.6, 14, 11.6, 3.4, shade(haft, 1.3), 0.5);
  p.circle(2.6, 14, 0.7, shade(haft, 0.8), outline(haft)); // butt cap

  const head = /royal_lance|dragon_lance|jarvan_lance/.test(id) ? 'leaf'
             : /iron_lance/.test(id) ? 'barbed' : 'spike';
  const tx = 12.6, ty = 1.8;   // tip
  if (head === 'leaf') {
    p.poly('11.6,3.4 12.6,1.6 14.4,1.0 12.4,4.6', blade, o);      // broad leaf blade
    p.poly('12.0,3.4 13.0,1.8 12.8,3.8', lt, null);               // bright side
    p.line(12.2, 3.6, 13.6, 1.4, dk, 0.4);                        // midrib
    p.circle(11.4, 4.2, 0.85, shade(blade, 0.8), o);              // ornate collar
    p.circle(11.4, 4.2, 0.4, lt, null);
  } else if (head === 'barbed') {
    p.poly(`11.6,3.4 ${tx},${ty} 13.6,3.8`, blade, o);            // narrow head
    p.poly('12.0,3.2 12.4,4.4 13.0,3.2', dk, null);               // barb hooks
    p.poly('13.0,2.8 13.6,3.8 13.8,2.6', dk, null);
  } else {
    p.poly(`11.4,3.6 ${tx},${ty} 13.2,4.2`, blade, o);            // slim spike
    p.poly(`11.8,3.6 12.6,2.2 12.4,3.8`, lt, null);
  }
  // Cloth pennant hanging from the collar, fluttering down the shaft.
  const pen = el || (id === 'royal_lance' ? '#3b6ea5' : id === 'dragon_lance' ? '#c0392b' : '#c0392b');
  p.parts.push(`<path d="M10.6 4.6 Q 8.2 5.6 6.2 5.0 Q 7.6 6.4 6.0 7.4 Q 8.4 7.0 9.8 6.0 Z" fill="${pen}" stroke="${outline(pen)}" stroke-width="0.4"/>`);
  p.line(10.6, 4.6, 7.2, 6.2, shade(pen, 1.3), 0.4);              // fold highlight
  if (el) p.circle(tx - 0.5, ty + 0.7, 0.6, el, null);            // elemental glint on the tip
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
const SLOT_PAINTERS = { helmet: paintHelmet, armor: paintArmor, legs: paintLegs, boots: paintBoots, amulet: paintAmulet, ring: paintRing };

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
// `opts.profession` lets the two HAND slots hint at what that hand expects:
// the empty WEAPON slot (right hand) shows a SHIELD ghost, or a BOW ghost for an
// archer/paladin — because that off-hand holds a shield or a bow (one at a time).
// The empty SHIELD slot (left hand) shows a SWORD ghost, since the main hand
// expects the weapon. This way the empty slot reads as "the other hand".
export function slotPlaceholderIcon(slot, opts) {
  const p = new Painter();
  const ghost = { color: 0x6c7686, element: 'none', baseId: '', levelReq: 1 };
  const isArcher = opts && (opts.profession === 'paladin' || opts.profession === 'archer');
  let painter;
  // The WEAPON slot (main hand) shows a sword ghost — that's what it expects.
  // The SHIELD slot (off-hand) shows a SHIELD ghost — or a BOW for an archer,
  // since that hand holds a shield or a bow. So an empty off-hand always reads
  // as "a shield goes here", never as a sword.
  if (slot === 'weapon') painter = isArcher ? paintBow : paintSword;
  else if (slot === 'shield') painter = isArcher ? paintBow : paintShield;
  else painter = SLOT_PAINTERS[slot] || (slot === 'bag' ? paintContainer : null);
  if (painter) painter(p, ghost, 0.2);
  let svg = p.svg().replace('class="pxico"', 'class="pxico ph-ico"');
  return svg;
}
