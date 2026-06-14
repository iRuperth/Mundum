// Procedural pixel-art creature icon generator. The exact sibling of
// itemIcons.js: no external assets, no DOM dependency at module load —
// everything is drawn into a tiny SVG string at call time and cached. Each
// creature gets a DISTINCT portrait derived from its data (family/color/
// element/variantScale) so a Worm never looks like a Dragon and a Fire Slime
// reads differently from a Water Slime.
//
// Output contract: creatureIcon(creature) -> an HTML string (an inline <svg>)
// that drops straight into innerHTML wherever the UI printed a flat colour
// swatch. Mirrors iconFor(item) exactly: Map cache, key only by the four
// visually-relevant fields, defensive try/catch + labelled-tile fallback.
//
// Kept SELF-CONTAINED on purpose (the tiny colour helpers and the Painter class
// are duplicated from itemIcons.js) so this file has zero imports and can be
// loaded anywhere — wiki, combat, list rows — without coupling the two icon
// engines together.

// ---------------------------------------------------------------------------
// Colour helpers — operate on 0xRRGGBB integers and #rrggbb strings. Same
// engine as itemIcons.js.
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

// Element accent colours — same palette as itemIcons.ELEMENT_COLOR so creatures
// and their drops feel related.
const ELEMENT_ACCENT = { fire: '#ff6a2a', water: '#3fb6ff', plant: '#4fd06a', none: null };

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
  // A thick stroke with an outline pass + lighter glint stripe — gives serpent
  // bodies, dragon necks and tails a lit edge for free.
  bar(x1, y1, x2, y2, w, color) {
    this.line(x1, y1, x2, y2, outline(color), w + 0.7);
    this.line(x1, y1, x2, y2, color, w);
    this.line(x1, y1, x2, y2, shade(color, 1.5), Math.max(0.5, w * 0.32));
  }
  svg() {
    return `<svg class="pxico" viewBox="0 0 ${GRID} ${GRID}" width="100%" height="100%" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${this.parts.join('')}</svg>`;
  }
}

// A small gem (elemental cores / dragon eyes / fairy motes). Same shape as the
// itemIcons gem.
function gem(p, x, y, r, color) {
  p.poly(`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`, color, outline(color));
  p.px(x - r * 0.35, y - r * 0.45, shade(color, 1.7), r * 0.5, r * 0.5, 0.9);
}

// Tint bundle derived once per creature: body, lighter belly/underside, dark
// outline and a shadow plane. Same shading idiom as the armour painters.
function tints(c) {
  return {
    body: c,
    belly: shade(c, 1.25),
    dark: outline(c),
    shadow: shade(c, 0.7),
    glint: shade(c, 1.6),
  };
}

// ---------------------------------------------------------------------------
// Boss cue — a faint radial aura drawn FIRST (low opacity) behind big-scale
// creatures. Re-uses the itemIcons addRarityGlow opacity-rewrite trick.
// ---------------------------------------------------------------------------
function addBossCue(p, c, boss01) {
  if (boss01 <= 0) return;
  const g = mix('#ffd34d', hexStr(c.color), 0.25);
  p.circle(8, 8, 7.2, g, null);
  const op = (0.10 + boss01 * 0.16).toFixed(2);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` opacity="${op}"/>`);
}

// A small crown marks a champion (boss01 > 0.5).
function addCrown(p, boss01) {
  if (boss01 <= 0.5) return;
  const gold = '#ffd34d';
  p.poly('5.5,3.0 6.6,4.4 8,2.6 9.4,4.4 10.5,3.0 10.5,5.0 5.5,5.0', gold, outline(gold));
}

// ---------------------------------------------------------------------------
// Element aura — drawn LAST, on top. Fire licks, water bubbles, plant sprout.
// ---------------------------------------------------------------------------
function addElementAura(p, c, accent) {
  switch (c.element) {
    case 'fire': {
      p.poly('3.2,4.5 4.0,1.6 4.8,4.0', accent, null);
      p.poly('7.4,3.2 8.2,0.6 9.0,3.0', accent, null);
      p.poly('11.4,4.6 12.1,2.2 12.8,4.4', shade(accent, 1.2), null);
      break;
    }
    case 'water': {
      p.circle(3.0, 3.4, 0.7, accent, null);
      p.circle(12.8, 4.2, 0.55, accent, null);
      p.circle(4.6, 1.9, 0.45, shade(accent, 1.3), null);
      p.line(3.0, 14.3, 13.0, 14.3, accent, 0.7); // wave under the feet
      break;
    }
    case 'plant': {
      p.line(12.4, 5.4, 12.4, 2.6, accent, 0.7); // sprout stem
      p.poly('12.4,2.6 14.0,2.0 12.4,3.6', accent, outline(accent)); // leaf
      p.poly('12.4,4.0 10.8,3.4 12.4,5.0', shade(accent, 0.85), outline(accent)); // 2nd leaf
      break;
    }
    default: break;
  }
}

// ---------------------------------------------------------------------------
// Archetype painters. Each draws a centered 16x16 portrait. `grow` scales the
// silhouette outward from center for boss-y creatures (8-18% bigger).
// ---------------------------------------------------------------------------
function growF(boss01) { return 1 + boss01 * 0.18; } // 1.0 .. 1.18

function paintQuadruped(p, c, accent, boss01) {
  const T = tints(hexStr(c.color));
  // side-on body
  p.poly('3.5,8 11.5,8 12,10 11.5,11.5 4,11.5 3,10', T.body, T.dark);
  p.px(3.5, 8.2, T.belly, 8, 1.0, 0.5); // back highlight
  // four legs
  for (const lx of [4.4, 6.4, 9.0, 11.0]) p.line(lx, 11.3, lx, 13.6, T.shadow, 1.1);
  // round head
  p.circle(12.4, 8.0, 2.0, T.body, T.dark);
  // ears
  p.poly('11.4,6.2 11.0,4.4 12.2,6.0', T.body, T.dark);
  p.poly('13.4,6.2 13.8,4.4 12.6,6.0', T.body, T.dark);
  // tail
  p.line(3.4, 9.2, 1.6, 7.4, T.shadow, 1.2);
  // eye + snout
  p.circle(13.1, 7.7, 0.42, '#1a1a1a', null);
  p.px(13.6, 8.4, T.shadow, 0.8, 0.7, 0.9);
  addCrown(p, boss01);
}

function paintSerpent(p, c, accent, boss01) {
  const T = tints(hexStr(c.color));
  const w = 2.2 + boss01 * 1.0;
  // S-curve body using the glint pass.
  p.bar(2.5, 13.5, 6.0, 11.5, w, T.body);
  p.bar(6.0, 11.5, 6.5, 7.5, w, T.body);
  p.bar(6.5, 7.5, 10.0, 6.0, w, T.body);
  p.bar(10.0, 6.0, 11.5, 3.0, w, T.body);
  // wedge head
  p.poly('11.5,3.0 13.6,2.0 13.2,4.4 11.0,4.0', T.body, T.dark);
  // eye
  p.circle(12.4, 3.1, 0.4, '#1a1a1a', null);
  // forked tongue
  p.line(13.4, 2.4, 14.8, 1.6, '#d23b5b', 0.5);
  p.line(14.8, 1.6, 15.4, 1.1, '#d23b5b', 0.4);
  p.line(14.8, 1.6, 15.4, 2.1, '#d23b5b', 0.4);
  addCrown(p, boss01);
}

function paintHumanoid(p, c, accent, boss01) {
  const T = tints(hexStr(c.color));
  const g = growF(boss01);
  const hw = 1.7 * g; // half torso width
  // torso
  p.poly(`${8 - hw},6.5 ${8 + hw},6.5 ${8 + hw * 0.8},12.5 ${8 - hw * 0.8},12.5`, T.body, T.dark);
  // round head
  p.circle(8, 4.2, 1.9 * g, T.belly, T.dark);
  // arms
  p.line(8 - hw, 7.0, 8 - hw - 1.6, 10.5, T.shadow, 1.3);
  p.line(8 + hw, 7.0, 8 + hw + 1.6, 10.5, T.shadow, 1.3);
  // legs
  p.line(7.2, 12.3, 6.6, 14.4, T.shadow, 1.4);
  p.line(8.8, 12.3, 9.4, 14.4, T.shadow, 1.4);
  // weapon nub for bigger ones
  if (boss01 > 0.25) p.line(8 + hw + 1.6, 10.5, 8 + hw + 2.4, 6.0, '#8a8f98', 0.9);
  // eyes
  p.circle(7.3, 4.1, 0.32, '#1a1a1a', null);
  p.circle(8.7, 4.1, 0.32, '#1a1a1a', null);
  addCrown(p, boss01);
}

function paintInsect(p, c, accent, boss01) {
  const T = tints(hexStr(c.color));
  const g = growF(boss01);
  // segmented body: 3 circles down the middle
  p.circle(8, 11.0, 2.1 * g, T.body, T.dark); // abdomen
  p.circle(8, 8.0, 1.6 * g, T.shadow, T.dark); // thorax
  p.circle(8, 5.4, 1.5 * g, T.body, T.dark); // head
  // 6 legs (3 each side)
  for (const ly of [7.0, 8.2, 9.4]) {
    p.line(6.6, ly, 3.4, ly - 0.8, T.dark, 0.8);
    p.line(9.4, ly, 12.6, ly - 0.8, T.dark, 0.8);
  }
  // antennae
  p.line(7.2, 4.4, 6.0, 2.4, T.dark, 0.6);
  p.line(8.8, 4.4, 10.0, 2.4, T.dark, 0.6);
  // mandibles
  p.poly('7.0,6.4 7.6,7.4 8.0,6.4', T.dark, null);
  p.poly('9.0,6.4 8.4,7.4 8.0,6.4', T.dark, null);
  // eyes
  p.circle(7.3, 5.2, 0.4, '#1a1a1a', null);
  p.circle(8.7, 5.2, 0.4, '#1a1a1a', null);
  addCrown(p, boss01);
}

function paintFlying(p, c, accent, boss01) {
  const T = tints(hexStr(c.color));
  const g = growF(boss01);
  // big wings spread to the edges (drawn first, behind body)
  p.poly(`8,8 1.2,4.5 1.8,8.5 3.6,9.0 2.4,11 6,9.5`, T.shadow, T.dark);
  p.poly(`8,8 14.8,4.5 14.2,8.5 12.4,9.0 13.6,11 10,9.5`, T.shadow, T.dark);
  // membrane glint
  p.line(2.0, 5.4, 5.4, 8.4, T.belly, 0.5);
  p.line(14.0, 5.4, 10.6, 8.4, T.belly, 0.5);
  // central body
  p.circle(8, 8.4, 2.0 * g, T.body, T.dark);
  // ears / head bumps
  p.poly('6.8,6.6 6.2,4.8 7.6,6.4', T.body, T.dark);
  p.poly('9.2,6.6 9.8,4.8 8.4,6.4', T.body, T.dark);
  // eyes
  p.circle(7.3, 8.1, 0.4, '#1a1a1a', null);
  p.circle(8.7, 8.1, 0.4, '#1a1a1a', null);
  addCrown(p, boss01);
}

function paintBlob(p, c, accent, boss01) {
  const T = tints(hexStr(c.color));
  const g = growF(boss01);
  const r = 4.6 * g;
  // dome + flat base
  p.circle(8, 9.2, r, T.body, T.dark);
  p.px(8 - r, 12.4, T.body, r * 2, 1.6); // flatten the bottom over the circle
  p.px(8 - r, 13.6, T.shadow, r * 2, 0.6, 0.6); // base shadow
  // shine
  p.circle(6.0, 6.6, 1.1, T.glint, null);
  p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ' opacity="0.7"/>');
  // two eyes + a smile
  p.circle(6.6, 9.4, 0.55, '#1a1a1a', null);
  p.circle(9.4, 9.4, 0.55, '#1a1a1a', null);
  p.parts.push(`<path d="M6.6 11.2 Q 8 12.4 9.4 11.2" fill="none" stroke="#1a1a1a" stroke-width="0.4"/>`);
  addCrown(p, boss01);
}

function paintAquatic(p, c, accent, boss01) {
  const T = tints(hexStr(c.color));
  const g = growF(boss01);
  // teardrop body
  p.poly(`4.5,8 ${8 + g},5.4 ${11.5 + g * 0.5},8 ${8 + g},10.6`, T.body, T.dark);
  p.px(5.5, 7.4, T.belly, 5, 0.8, 0.5); // back highlight
  // tail fin
  p.poly('4.5,8 2.0,5.4 3.0,8 2.0,10.6', T.shadow, T.dark);
  // dorsal fin
  p.poly('8,5.4 7.0,2.6 9.4,5.0', T.shadow, T.dark);
  // gill lines
  p.line(9.8, 6.8, 9.8, 9.2, T.dark, 0.5);
  p.line(10.6, 7.0, 10.6, 9.0, T.dark, 0.5);
  // eye + mouth
  p.circle(11.0, 7.6, 0.45, '#1a1a1a', null);
  p.line(11.5, 8.6, 12.6, 8.6, T.dark, 0.5);
  addCrown(p, boss01);
}

function paintUndead(p, c, accent, boss01) {
  const T = tints(hexStr(c.color));
  const g = growF(boss01);
  const bone = shade(hexStr(c.color), 1.15);
  // skull
  p.circle(8, 5.8, 2.6 * g, bone, outline(bone));
  // jaw
  p.poly('6.0,7.4 10.0,7.4 9.4,9.4 6.6,9.4', bone, outline(bone));
  // black eye sockets
  p.circle(6.9, 5.6, 0.7, '#101014', null);
  p.circle(9.1, 5.6, 0.7, '#101014', null);
  // nose + teeth
  p.poly('8,6.2 7.5,7.2 8.5,7.2', '#101014', null);
  for (const tx of [6.6, 7.4, 8.2, 9.0]) p.line(tx, 7.6, tx, 9.0, outline(bone), 0.4);
  // ribs / bone cross under the skull
  p.line(5.0, 11.4, 11.0, 13.2, bone, 1.0);
  p.line(11.0, 11.4, 5.0, 13.2, bone, 1.0);
  p.line(6.6, 10.6, 9.4, 10.6, bone, 0.6);
  p.line(6.2, 11.8, 9.8, 11.8, bone, 0.6);
  addCrown(p, boss01);
}

function paintDragon(p, c, accent, boss01) {
  const T = tints(hexStr(c.color));
  const g = growF(boss01);
  // wings first (behind)
  p.poly('8,8 1.5,3.5 2.5,8 4.5,8.5 2.0,11 7,9', T.shadow, T.dark);
  p.poly('8,8 14.5,3.5 13.5,8 11.5,8.5 14.0,11 9,9', T.shadow, T.dark);
  // long neck + body via the lit bar
  p.bar(7.0, 13.0, 8.5, 8.5, 2.4 * g, T.body);
  p.bar(8.5, 8.5, 11.5, 5.0, 2.0 * g, T.body);
  // tail
  p.bar(7.0, 13.0, 4.5, 14.4, 1.4, T.body);
  // horned head
  p.poly('11.5,5.0 14.2,4.0 13.6,6.6 11.0,6.4', T.belly, T.dark);
  p.poly('11.6,4.2 12.6,2.2 13.0,4.4', T.body, T.dark); // horn
  // eye (a gem) + nostril
  gem(p, 12.4, 5.2, 0.7, accent || '#ffd34d');
  p.circle(13.8, 6.0, 0.3, '#1a1a1a', null);
  addCrown(p, boss01);
}

function paintPlant(p, c, accent, boss01) {
  const T = tints(hexStr(c.color));
  const g = growF(boss01);
  const trunk = mix(hexStr(c.color), '#6a4a22', 0.55);
  // trunk / stem
  p.px(7.2, 8.0, trunk, 1.6, 6.0);
  p.bar(8.0, 14.0, 8.0, 8.0, 1.4, trunk);
  // root flare
  p.line(7.6, 13.6, 5.6, 14.4, trunk, 1.0);
  p.line(8.4, 13.6, 10.4, 14.4, trunk, 1.0);
  // canopy: overlapping leaf circles
  p.circle(8, 5.2, 3.4 * g, T.body, T.dark);
  p.circle(5.4, 6.6, 2.0, T.shadow, T.dark);
  p.circle(10.6, 6.6, 2.0, T.belly, T.dark);
  // a couple of eyes peeking from the canopy (treant/mandrake)
  p.circle(7.0, 5.4, 0.45, '#101014', null);
  p.circle(9.0, 5.4, 0.45, '#101014', null);
  // sprout petal accent
  p.poly('8,1.8 9.0,3.4 7.0,3.4', T.glint, null);
  addCrown(p, boss01);
}

// Soft cloud of overlapping low-opacity circles for ghostly / elemental motes.
function paintAmorphous(p, c, accent, boss01) {
  const base = hexStr(c.color);
  const g = growF(boss01);
  const blobs = [
    [8, 7.5, 4.2 * g, 0.85], [5.5, 6.5, 2.6, 0.5], [10.5, 6.5, 2.6, 0.5],
    [6.8, 10.0, 2.4, 0.45], [9.4, 10.0, 2.4, 0.45], [8, 5.0, 2.2, 0.4],
  ];
  for (const [cx, cy, r, op] of blobs) {
    p.circle(cx, cy, r, base, null);
    p.parts[p.parts.length - 1] = p.parts[p.parts.length - 1].replace('/>', ` opacity="${op}"/>`);
  }
  // wispy tail tendrils
  for (const tx of [6.0, 8.0, 10.0]) {
    p.line(tx, 10.5, tx + (tx - 8) * 0.2, 13.6, shade(base, 0.8), 0.7);
  }
  // glowing core + eyes
  gem(p, 8, 7.4, 1.3, accent || shade(base, 1.5));
  p.circle(6.9, 6.8, 0.5, '#101014', null);
  p.circle(9.1, 6.8, 0.5, '#101014', null);
  addCrown(p, boss01);
}

// The treasure-chest mimic — its own tiny painter. Too iconic to fold in, and
// the only non-living family.
function paintMimic(p, c, accent, boss01) {
  const T = tints(hexStr(c.color));
  const g = growF(boss01);
  const wood = hexStr(c.color);
  const band = '#d9c46a';
  // chest base
  p.rectO(3.5, 8.0, 9.0, 5.2, wood, T.dark);
  // open lid (tilted up)
  p.poly('3.5,8.0 12.5,8.0 11.5,4.6 4.5,4.6', shade(wood, 1.1), T.dark);
  // metal bands
  p.px(3.5, 10.2, band, 9.0, 0.7, 0.95);
  p.px(7.4, 8.0, band, 1.2, 5.2, 0.95);
  // jagged teeth on the lid rim
  for (let i = 0; i < 6; i++) {
    const x = 4.2 + i * 1.4;
    p.poly(`${x},8.0 ${x + 0.7},6.6 ${x + 1.4},8.0`, '#f4f4ef', T.dark);
  }
  // hungry eyes inside the maw
  p.circle(6.0, 6.4, 0.5, '#e24', null);
  p.circle(10.0, 6.4, 0.5, '#e24', null);
  addCrown(p, boss01);
}

// ---------------------------------------------------------------------------
// Family -> archetype map. Every FAMILIES key is present — no blank fallback.
// ---------------------------------------------------------------------------
const FAMILY_ARCHETYPE = {
  // quadruped (8)
  rat: 'quadruped', boar: 'quadruped', wolf: 'quadruped', bear: 'quadruped',
  deer: 'quadruped', sheep: 'quadruped', chicken: 'quadruped', lizardman: 'quadruped',
  // serpent (3)
  worm: 'serpent', snake: 'serpent', serpent: 'serpent',
  // humanoid (15) — golem folded in as a blocky humanoid
  goblin: 'humanoid', orc: 'humanoid', troll: 'humanoid', ogre: 'humanoid',
  kobold: 'humanoid', minotaur: 'humanoid', cyclops: 'humanoid', cultist: 'humanoid',
  knight: 'humanoid', mage: 'humanoid', dwarf: 'humanoid', elf: 'humanoid',
  vampire: 'humanoid', imp: 'humanoid', demon: 'humanoid', golem: 'humanoid',
  // insect (5)
  spider: 'insect', scorpion: 'insect', beetle: 'insect', wasp: 'insect', crab: 'insect',
  // flying (3)
  bat: 'flying', harpy: 'flying', wyvern: 'flying',
  // blob (3)
  slime: 'blob', frog: 'blob', mushroom: 'blob',
  // aquatic (4)
  shark: 'aquatic', jellyfish: 'aquatic', turtle: 'aquatic', hydra: 'aquatic',
  // undead (3)
  skeleton: 'undead', zombie: 'undead', ghost: 'undead',
  // dragon (2) — gargoyle is winged + stone-tinted
  dragon: 'dragon', gargoyle: 'dragon',
  // plant (3)
  treant: 'plant', mandrake: 'plant', fairy: 'plant',
  // amorphous (2)
  wraith: 'amorphous', elemental: 'amorphous',
  // special (1)
  mimic: 'mimic',
};

const ARCHETYPE_PAINTERS = {
  quadruped: paintQuadruped, serpent: paintSerpent, humanoid: paintHumanoid,
  insect: paintInsect, flying: paintFlying, blob: paintBlob, aquatic: paintAquatic,
  undead: paintUndead, dragon: paintDragon, plant: paintPlant,
  amorphous: paintAmorphous, mimic: paintMimic,
};

// Startup completeness assert: every family in FAMILIES (mirrored here so this
// stays import-free) must have an archetype, so no creature ever hits a blank
// fallback. Kept in sync with data/creatures.js FAMILIES.
const FAMILIES = [
  'worm', 'rat', 'bat', 'snake', 'spider', 'scorpion', 'slime', 'frog',
  'crab', 'beetle', 'wasp', 'boar', 'wolf', 'bear', 'deer', 'chicken',
  'sheep', 'goblin', 'orc', 'troll', 'ogre', 'kobold', 'skeleton', 'zombie',
  'ghost', 'wraith', 'vampire', 'imp', 'demon', 'dragon', 'wyvern', 'hydra',
  'golem', 'gargoyle', 'elemental', 'treant', 'mushroom', 'mandrake', 'harpy',
  'minotaur', 'cyclops', 'lizardman', 'serpent', 'shark', 'jellyfish',
  'turtle', 'cultist', 'knight', 'mage', 'dwarf', 'elf', 'fairy', 'mimic',
];
for (const k of FAMILIES) {
  if (!FAMILY_ARCHETYPE[k]) throw new Error(`creatureIcons: family "${k}" has no archetype`);
}

// ---------------------------------------------------------------------------
// Dispatch.
// ---------------------------------------------------------------------------
function paintCreature(p, c) {
  const boss01 = Math.max(0, Math.min(1, ((c.variantScale || 1) - 1.2) / 1.2));
  const accent = ELEMENT_ACCENT[c.element] || null;
  addBossCue(p, c, boss01); // aura first, like addRarityGlow
  const arch = FAMILY_ARCHETYPE[c.family] || 'humanoid';
  (ARCHETYPE_PAINTERS[arch] || paintHumanoid)(p, c, accent, boss01);
  if (accent) addElementAura(p, c, accent); // flourishes last, on top
}

// ---------------------------------------------------------------------------
// Public API with a string cache keyed by the visually-relevant fields only.
// Two variants sharing family+color+element+scale render identically and share
// a cache entry (so ~300 variants collapse to ~one string per distinct combo).
// ---------------------------------------------------------------------------
const cache = new Map();

function cacheKey(c) {
  return [c.family || '', c.color || '', c.element || '', c.variantScale || ''].join('|');
}

// Returns an inline <svg> string for the given creature record (the expanded
// pushCreature shape with family/color/element/variantScale). Mirrors iconFor().
export function creatureIcon(creature) {
  if (!creature) return '';
  const key = cacheKey(creature);
  let svg = cache.get(key);
  if (svg) return svg;
  const p = new Painter();
  try { paintCreature(p, creature); } catch (_) { /* leave whatever drew */ }
  // Defensive fallback: a creature that somehow drew nothing still gets a tile.
  if (!p.parts.length) {
    p.rectO(2, 2, 12, 12, hexStr(creature.color || 0x888888), outline(creature.color || 0x888888));
    p.px(6, 6, '#fff', 4, 4, 0.6);
  }
  svg = p.svg();
  cache.set(key, svg);
  return svg;
}
