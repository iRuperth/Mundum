import * as THREE from 'three';
import { WEAPONS, ARMORS, CONTAINERS, POTIONS, LIGHTS, QUIVERS } from './data/items.js';
import { buildStall, STALL_RADIUS } from './market.js';
import { buildStatue, pickStatueLore } from './statueLore.js';

// Fixed city layout. Nominal positions are deterministic; each is then snapped
// to the nearest flat grassland so cities never sit underwater. Every city has
// a temple (spawn and respawn point), a shop, a depot and a teleport portal.
// Each city sits in a distinct biome (world.js lays climate by latitude with a
// wide gradual transition): Greenhollow in the temperate middle, Oakvale in the
// forest, Stonehaven up in the frozen north, Dragonreach down in the desert, plus
// the new distant cities (Westharbor, Frostpeak, Sandport) in the continent's
// far corners. The map is a FINITE peninsula, so all cities sit inside it.
// `id` stays stable (NPCs/quests/saves key off it); `name` is what players see.
// `style` drives a distinct look per city (see CITY_STYLES below). Greenhollow is
// the temperate capital with a castle; the others each have their own character.
// `recLevel` is the RECOMMENDED player level to travel here by teleport, NOT a
// hard gate. It's the AVERAGE level (midpoint of levelMin..levelMax) of the
// toughest creature zone bordering each city — so it reflects the real difficulty
// of the region you'd be dropped into, not just its gentle edge. Walking is always
// free; the portal only WARNS when you're under it ("you're not strong enough for
// this region yet — go anyway?"). Greenhollow is pinned to 1 (it's the safe
// starter capital, even though the Elven Forest brushes its ring). Frostpeak is
// highest (44) because the Dragon Mountains (lv 16-72, avg 44) border it. Tune
// freely — advisory only.
export const CITIES = [
  { id: 'rivertown', name: 'Greenhollow', x: 0, z: 0, biome: 'forest', style: 'capital', recLevel: 1 },
  { id: 'oakvale', name: 'Oakvale', x: -420, z: 280, biome: 'forest', style: 'village', recLevel: 14 },
  { id: 'stonehaven', name: 'Stonehaven', x: -300, z: -1180, biome: 'snow', style: 'mountain', recLevel: 14 },
  // Dragonreach is the desert (pharaonic) city — now out EAST where the desert is.
  { id: 'dragonreach', name: 'Dragonreach', x: 1180, z: 260, biome: 'desert', style: 'desert', recLevel: 37 },
  // New distant cities, each in its own corner of the finite continent with a
  // distinct biome and character: a forest river-port to the west, a frozen
  // mining outpost to the far north, and a sun-baked oasis town in the far east
  // desert (south-east corner).
  { id: 'westharbor', name: 'Westharbor', x: -1200, z: 120, biome: 'forest', style: 'harbor', recLevel: 18 },
  { id: 'frostpeak', name: 'Frostpeak', x: 300, z: -1080, biome: 'snow', style: 'frost', recLevel: 44 },
  { id: 'sandport', name: 'Sandport', x: 1080, z: 780, biome: 'desert', style: 'oasis', recLevel: 37 },
];

// Recommended travel level for a city (advisory; defaults to 1 if unset).
export function cityRecLevel(city) {
  return (city && city.recLevel) || 1;
}

// Per-style look: wall/roof palette, roof shape, and how big the city pad is.
// The capital is a huge Tibia-style grid city (radius covers its rectangle); the
// others are round towns — but now MUCH bigger than before (the user wanted them
// large), each with its own palette and a signature `landmark` so no two cities
// feel the same.
// `shape` gives each non-capital town a DISTINCT walled silhouette (not all
// circles): { sides, rot, aspect } describes a regular polygon — `sides` corners,
// rotated by `rot` radians, optionally squashed along x by `aspect` (≠1 makes a
// rectangle/lozenge). The wall, the map outline and the in-city test all read it,
// so e.g. the desert city is a hard pharaonic rectangle and the frost town a
// sharp diamond, while the capital keeps its own irregular grid silhouette.
export const CITY_STYLES = {
  capital:  { radius: 245, wall: 0xd8c9a8, wall2: 0xc6b48c, roof: 0x8e3f2c, roof2: 0x6e3b22, stone: 0xb9b2a2, pitched: true, castle: true, grid: true },
  // Oakvale — a big timbered forest town with green roofs and a great oak. Soft
  // rounded heptagon. Cozy small cottages with a handful of two-story mansions.
  village:  { radius: 150, wall: 0xcdb892, wall2: 0xb9a17e, roof: 0x6f8f3a, roof2: 0x55702c, stone: 0x9a9488, pitched: true,  castle: false, landmark: 'oak', shape: { sides: 7, rot: 0.2 } },
  // Stonehaven — a slate-grey frozen mountain town with steep blue roofs. Angular
  // hexagonal keep. Tall narrow houses, lots of 3-story stone keeps.
  mountain: { radius: 152, wall: 0x9aa3ad, wall2: 0x808a96, roof: 0x49566a, roof2: 0x37425a, stone: 0x8d96a1, pitched: true,  castle: false, landmark: 'obelisk', shape: { sides: 6, rot: 0 } },
  // Dragonreach — a flat-roofed sandstone desert city: a hard PHARAONIC rectangle.
  // Wide, low, flat-roofed blocks — broad mansions, no pitched roofs.
  desert:   { radius: 158, wall: 0xe0c690, wall2: 0xcdaf76, roof: 0xc98b3e, roof2: 0xa66f2c, stone: 0xd2bd92, pitched: false, castle: false, landmark: 'pyramid', shape: { sides: 4, rot: Math.PI / 4, aspect: 1.35 } },
  // Westharbor — a teal-roofed river port with a lighthouse: a wide pentagon.
  // Mixed everything — the busiest, most varied silhouette of all the towns.
  harbor:   { radius: 156, wall: 0xcfd6cf, wall2: 0xb6c2bd, roof: 0x2f7d77, roof2: 0x215c58, stone: 0x9aa6a4, pitched: true,  castle: false, landmark: 'lighthouse', shape: { sides: 5, rot: Math.PI, aspect: 1.2 } },
  // Frostpeak — an icy mining outpost: a sharp DIAMOND. Steep-roofed and tall,
  // packed tight against the cold.
  frost:    { radius: 148, wall: 0xdfe9f0, wall2: 0xc4d4e0, roof: 0x7fb0cc, roof2: 0x5d90b4, stone: 0xbcccd6, pitched: true,  castle: false, landmark: 'icetower', shape: { sides: 4, rot: 0, aspect: 1 } },
  // Sandport — an oasis town: an octagon around a palm pool. Low flat sand-brick
  // homes, a few generous oasis mansions.
  oasis:    { radius: 150, wall: 0xe7c98c, wall2: 0xd2ad68, roof: 0x39a39a, roof2: 0x2b7d77, stone: 0xd8c193, pitched: false, castle: false, landmark: 'oasis', shape: { sides: 8, rot: Math.PI / 8 } },
};

// Per-style house "recipe" — the knobs that make every round town read as its own
// neighbourhood instead of the same ring of identical boxes. Each entry drives
// buildRoundCity's house generator (and cityMapFeatures' map footprints, which
// share roundHouseLots below):
//   rings        : array of { f, gap } — ring radius as a fraction of R and the
//                  angular phase offset, so towns differ in spacing/rhythm.
//   baseW/baseD  : normal house footprint (a small per-house jitter is added).
//   wallH        : ground-floor wall height (taller = grander streets).
//   mansion      : fraction of lots that become MANSIONS (~2x footprint).
//   twoStory     : fraction of the rest that are 2-story.
//   threeStory   : fraction of the rest that are 3-story (only big lots qualify).
//   basement     : fraction of the BIGGEST homes (mansion / 3-story) with a cellar.
//   chimney/awning: how often those trims appear.
// The fractions use a stable per-lot hash so a town looks the same every load.
const ROUND_HOUSE_RECIPES = {
  // Cozy forest village: small cottages, steep green roofs, a few proud mansions.
  village:  { rings: [{ f: 0.84, gap: 0.40 }, { f: 0.64, gap: 0.95 }, { f: 0.44, gap: 1.55 }], baseW: 4.6, baseD: 4.6, wallH: 3.2, mansion: 0.14, twoStory: 0.30, threeStory: 0.06, basement: 0.20, chimney: 0.6, awning: 0.3 },
  // Mountain keep-town: tall, narrow, steep slate roofs, lots of 3-story stone.
  mountain: { rings: [{ f: 0.86, gap: 0.25 }, { f: 0.66, gap: 0.80 }, { f: 0.46, gap: 1.35 }], baseW: 4.2, baseD: 5.0, wallH: 3.8, mansion: 0.12, twoStory: 0.34, threeStory: 0.24, basement: 0.24, chimney: 0.75, awning: 0.1 },
  // Desert blocks: wide, low, flat-roofed sandstone — broad mansions, no pitch.
  desert:   { rings: [{ f: 0.83, gap: 0.50 }, { f: 0.62, gap: 1.05 }, { f: 0.41, gap: 1.70 }], baseW: 6.2, baseD: 5.4, wallH: 3.4, mansion: 0.20, twoStory: 0.22, threeStory: 0.08, basement: 0.20, chimney: 0.05, awning: 0.45 },
  // Harbor: the most mixed town — every size and height, busy rooflines. A 4th
  // inner ring (sparse, set via a low arc-density below) makes it the densest town.
  harbor:   { rings: [{ f: 0.85, gap: 0.35 }, { f: 0.66, gap: 0.90 }, { f: 0.47, gap: 1.45 }, { f: 0.28, gap: 2.0, sparse: true }], baseW: 5.0, baseD: 5.0, wallH: 3.4, mansion: 0.18, twoStory: 0.30, threeStory: 0.14, basement: 0.22, chimney: 0.5, awning: 0.4 },
  // Frost outpost: steep-roofed, tall and packed tight against the cold — also a
  // 4-ring town, so the two snow/sea towns read denser than the others.
  frost:    { rings: [{ f: 0.87, gap: 0.30 }, { f: 0.68, gap: 0.70 }, { f: 0.49, gap: 1.20 }, { f: 0.30, gap: 1.9, sparse: true }], baseW: 4.4, baseD: 4.8, wallH: 3.7, mansion: 0.10, twoStory: 0.36, threeStory: 0.18, basement: 0.20, chimney: 0.7, awning: 0.15 },
  // Oasis: low flat sand-brick homes with a few generous mansions round the pool.
  oasis:    { rings: [{ f: 0.82, gap: 0.55 }, { f: 0.61, gap: 1.10 }, { f: 0.40, gap: 1.65 }], baseW: 5.8, baseD: 5.2, wallH: 3.3, mansion: 0.22, twoStory: 0.20, threeStory: 0.06, basement: 0.18, chimney: 0.1, awning: 0.5 },
};
function houseRecipeFor(c) { return ROUND_HOUSE_RECIPES[c.style] || ROUND_HOUSE_RECIPES.village; }

// The wall-outline polygon for a shaped town: `sides` world points around the
// center at `radius`, rotated by shape.rot, squashed by shape.aspect on x. A
// town with no shape falls back to a many-sided polygon (reads as a circle).
function townPolygon(cx, cz, radius, shape) {
  const sides = shape && shape.sides ? shape.sides : 32;
  const rot = shape && shape.rot ? shape.rot : 0;
  const aspect = shape && shape.aspect ? shape.aspect : 1;
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * radius * aspect, z: cz + Math.sin(a) * radius });
  }
  return pts;
}

// True if (x,z) is inside a shaped town's polygon (point-in-polygon). Used by the
// in-city test so the flat pad + "no creatures in town" follow the real outline.
function pointInPolygon(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, zi = pts[i].z, xj = pts[j].x, zj = pts[j].z;
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

// Largest pad so world.js flattening and the in-city test cover every city.
export const CITY_RADIUS = 245;
const CITY_RIM = 30;          // ground eases back to nature over this width

function styleFor(c) { return CITY_STYLES[c.style] || CITY_STYLES.village; }

// How far OUT from the city center anything gets built (wall, outskirts road,
// the outer tree ring, the landmark/town hall). The flat pad must cover ALL of
// it — otherwise a wall segment, tree or lamp lands on natural (sloped) ground
// just past the wall and visibly floats. Round towns build a tree ring at ~R+8
// and props at offsets; the grid capital builds approach roads ~36m past its
// wall. We flatten generously past those so nothing sits on a step.
function flatRadiusFor(c) {
  const st = styleFor(c);
  if (st.grid) return st.radius;           // capital pad (245) already covers its roads
  return st.radius + 20;                   // round town: cover the outer tree ring + belt
}
const TEMPLE_RADIUS = 5;
const SHOP_RADIUS = 7;   // market hall is a big building; let you trade near it
const DEPOT_RADIUS = 5;
const PORTAL_RADIUS = 3.5;
const HEAL_STATUE_RADIUS = 3;   // talk-to-heal range at the gate statue

let citiesPlaced = false;

export function placeCities(world) {
  if (citiesPlaced) return;
  citiesPlaced = true;
  // Pass 1: find solid, FLAT ground for every city and remember its flat level.
  // Search using the city's real footprint so the chosen spot is flat across the
  // whole pad, not just at the center, and KEEP CLEAR of cities already placed so
  // two pads (and their rims) never overlap — overlapping pads created a hidden
  // step where one city's flat met another's slope, which floated walls/trees.
  // The capital is placed first so it gets the flat spot nearest its origin.
  const placed = [];
  for (const c of CITIES) {
    const padR = flatRadiusFor(c);
    const spot = findLand(world, c.x, c.z, padR, placed);
    c.x = spot.x; c.z = spot.z;
    c.groundY = world.heightAt(c.x, c.z);
    placed.push({ x: c.x, z: c.z, r: padR });
  }
  // Pass 2: flatten each pad (after placement, so the land search stays natural).
  // The pad covers everything the city builds (wall + outer ring + outskirts) and
  // a WIDE rim eases it back to nature, so no wall, tree or lamp floats on a step.
  for (const c of CITIES) {
    world.registerCityFlat(c.x, c.z, c.groundY, flatRadiusFor(c), CITY_RIM);
  }
}

// Find a buildable spot near (ox,oz): solid ground (above water, below the high
// peaks) that is also genuinely FLAT over the whole footprint, so the pad's rim
// only has to bridge gentle ground and nothing perches on a hidden slope. We
// sample a ring of points across the would-be pad and reject the spot if any of
// them is steep — a single steep sample means a hill or valley runs through the
// town, which is exactly what produced the floating walls/trees.
function findLand(world, ox, oz, padR = 130, placed = []) {
  // Max height variation tolerated across the pad footprint (meters). Tight, so
  // the flattened pad never sits on a noticeable hump or dip.
  const FLAT_TOL = 3.0;
  // A candidate must keep its whole pad+rim clear of every city already placed,
  // so no two pads overlap. CITY_RIM(30) is added on both sides as breathing room.
  const clearsPlaced = (x, z) => {
    for (const p of placed) {
      if (Math.hypot(x - p.x, z - p.z) < padR + p.r + CITY_RIM * 2) return false;
    }
    return true;
  };
  let fallback = null;
  for (let r = 0; r < 2200; r += 24) {
    const steps = Math.max(1, Math.floor(r / 24) * 6);
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(ox + Math.cos(a) * r);
      const z = Math.round(oz + Math.sin(a) * r);
      if (!clearsPlaced(x, z)) continue;             // would overlap another city
      const h = world.heightAt(x, z);
      if (h < 1.8 || h > 14) continue;
      // Sample the footprint: center + two rings. Reject if it's not near-flat.
      let lo = h, hi = h, steep = false;
      for (const rr of [padR * 0.5, padR]) {
        for (let k = 0; k < 8 && !steep; k++) {
          const aa = (k / 8) * Math.PI * 2;
          const hh = world.heightAt(x + Math.cos(aa) * rr, z + Math.sin(aa) * rr);
          if (hh < 0.5 || hh > 20) { steep = true; break; } // pad would hit water/peak
          lo = Math.min(lo, hh); hi = Math.max(hi, hh);
          if (hi - lo > FLAT_TOL) steep = true;
        }
      }
      if (steep) { if (!fallback) fallback = { x, z }; continue; }
      return { x, z };
    }
  }
  // Nothing perfectly flat AND clear found: best near-solid spot we saw, else the
  // nominal spot (placement still succeeds even on an awkward seed).
  return fallback || { x: ox, z: oz };
}

// Global shop cap: vendors only stock SIMPLE gear up to this level requirement.
// Anything stronger (level 22+, plus every 'epic'/'legendary-tier' item) must be
// earned from creature drops or quests, never bought. The user's rule: "lo máximo
// es hasta nivel 20-22 o así... cosas sencillas". Potions are exempt (you can
// always buy the level-appropriate flat potion).
export const SHOP_LEVEL_CAP = 22;
const buyable = (it) => it.shopTier === 'shop' && (it.levelReq || 1) <= SHOP_LEVEL_CAP;

// Containers split into sale buckets:
//   shop    — plain + coloured bags/backpacks: sold in EVERY city's bag vendor.
//   premium — themed bling (star/pink/violet/scorpion/snowflake): each sold in
//             ONE city only, surfaced via that vendor's `sells.only` allowlist —
//             never in the generic stock.
//   epic / legendary-tier — fur/golden/dragon/demon: loot-only, never sold.
const buyableContainers = () => CONTAINERS.filter((c) => !c.shopTier || c.shopTier === 'shop');
const premiumContainers = () => CONTAINERS.filter((c) => c.shopTier === 'premium');

export function shopStock() {
  const weapons = WEAPONS.filter(buyable);
  const armors = ARMORS.filter(buyable);
  const quivers = QUIVERS.filter(buyable);
  // Shops sell the flat-amount potions (not the rare % restores / elixirs).
  const potions = POTIONS.filter((p) => !p.restorePct);
  // Only the three shop-tier lights are sold (Torch, Glowing Pebble, Ruby); the
  // rest are quest rewards.
  const lights = LIGHTS.filter((l) => l.shopTier === 'shop');
  return [...weapons, ...armors, ...quivers, ...buyableContainers(), ...potions, ...lights];
}

// Normalize a def/instance to a coarse kind: 'weapon' | 'shield' | 'armor' |
// 'potion' | 'container'. Weapons have an attack type; armors have a slot.
function itemKind(it) {
  if (it.kind === 'trophy' || it.type === 'trophy') return 'trophy';
  if (it.kind === 'potion' || it.restoreType) return 'potion';
  if (it.type === 'shield') return 'shield';
  if (it.type === 'container' || it.capacity != null) return 'container';
  if (['sword', 'axe', 'mace', 'lance', 'bow', 'wand'].includes(it.type)) return 'weapon';
  if (it.type === 'quiver' || it.slot === 'quiver') return 'quiver';
  if (it.slot) return 'armor';
  return it.type || 'misc';
}

// Does a shop descriptor accept this item (def or backpack instance)?
function matchesDesc(desc, it) {
  if (!desc) return false;
  // `also` is an extra id allowlist a vendor stocks ON TOP of its category rules
  // — used to grant a single city its exclusive PREMIUM container(s).
  if (desc.also && desc.also.includes(it.id)) return true;
  // Premium containers are otherwise GATED out: a blanket kinds:['container']
  // vendor never picks them up, so the bling stays city-exclusive and scarce.
  if (it.shopTier === 'premium') return false;
  if (desc.all) return true;
  const kind = itemKind(it);
  if (desc.kinds && desc.kinds.includes(kind)) return true;
  if (desc.types && it.type && desc.types.includes(it.type)) return true;
  if (desc.slots && it.slot && desc.slots.includes(it.slot)) return true;
  if (desc.tiers && it.tier && desc.tiers.includes(it.tier)) return true;
  return false;
}

// The catalog a vendor offers to buy, filtered to shop-tier sellable defs.
export function shopStockFor(shop) {
  if (!shop || !shop.sells) return shopStock();
  const sellable = [
    ...WEAPONS.filter(buyable),
    ...ARMORS.filter(buyable),
    ...QUIVERS.filter(buyable),
    ...buyableContainers(),
    ...premiumContainers(),   // city-exclusive; only surface where `sells.only` lists them
    ...POTIONS.filter((p) => !p.restorePct),
  ];
  return sellable.filter((d) => matchesDesc(shop.sells, d));
}

// The RARITY COLLECTOR: an exclusive buyer of rare gear that normal shops won't
// touch (the value:0 epic/legendary tier). He does NOT sell anything. He pays by
// the item's LEVEL — levelReq × 100 bronze — so a level-60 armor fetches 6000
// (shown as 60 silver, since the coin pile auto-consolidates). Rings and amulets
// are flat 1000. The price is intentionally generous so rare drops are worth real
// money, but he only takes equippable gear (weapons/armor/jewelry), not junk.
const COLLECTOR_GEAR_SLOTS = ['armor', 'legs', 'helmet', 'boots', 'shield'];
export function isCollectorItem(item) {
  if (!item) return false;
  const slot = item.slot;
  if (slot === 'amulet' || slot === 'ring') return true;
  if (COLLECTOR_GEAR_SLOTS.includes(slot)) return true;
  if (item.type && ['sword', 'axe', 'mace', 'club', 'lance', 'bow', 'wand'].includes(item.type)) return true;
  return false;
}
export function collectorPrice(item) {
  if (!item) return 0;
  if (item.slot === 'amulet' || item.slot === 'ring') return 1000;
  const lvl = item.levelReq || 1;
  return Math.max(500, lvl * 100);   // lv60 → 6000, lv30 → 3000, floor 500
}

// Will this vendor buy the given backpack item from the player?
export function vendorBuysItem(shop, item) {
  if (shop && shop.rarity) return isCollectorItem(item);
  return !!(shop && matchesDesc(shop.buys, item));
}

// Standard shop buy-back rate: a vendor pays 10% of an item's value when the
// player sells it back. (Was 40-60%.) A shop can still override with sellMult for
// special cases, but the default — and what every weapon/armor/potion seller uses
// — is 10%, so buying high and re-selling is a real sink, not a refund.
export const SHOP_SELLBACK = 0.1;

// Coins the player receives when selling `item` to this vendor. Regular shop
// goods (weapons, armor, potions, food…) always buy back at 10%. The trophy/
// materials "remains buyer" is a separate grind-income loop, so it keeps its own
// (higher) sellMult — and the rarity collector prices by level, not by this.
export function sellPrice(shop, item) {
  const buysRemains = shop && shop.buys && shop.buys.kinds &&
    (shop.buys.kinds.includes('trophy') || shop.buys.kinds.includes('material'));
  const mult = buysRemains && shop.sellMult != null ? shop.sellMult : SHOP_SELLBACK;
  return Math.max(1, Math.floor((item.value || 0) * mult));
}

// Coins the player pays when buying `def` from this vendor.
export function buyPrice(shop, def) {
  const mult = shop && shop.buyMult != null ? shop.buyMult : 1;
  return Math.max(1, Math.floor((def.value || 0) * mult));
}

export function cityAt(x, z) {
  for (const c of CITIES) {
    if (Math.hypot(c.x - x, c.z - z) < styleFor(c).radius) return c;
  }
  return null;
}

export function nearestCity(x, z) {
  let best = CITIES[0], bd = Infinity;
  for (const c of CITIES) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// The capital city (the starter town where brand-new level-1 players land).
export const CAPITAL = CITIES.find((c) => c.style === 'capital') || CITIES[0];
// How far PAST a city's walls counts as its protected "safe ring".
const CITY_SAFE_MARGIN = 150;
// Creature level allowed right AT a city wall (the cap eases up to the zone's
// natural difficulty by the ring's edge). The capital is the gentlest (it must
// hold brand-new level-1 players); the other towns sit deeper in the world, so
// their inner cap is a bit higher but still survivable for a fresh arrival who
// teleported or walked in — no dragon one step out of the gate.
const SAFE_CAP_AT_WALL_CAPITAL = 4;
const SAFE_CAP_AT_WALL_OTHER = 7;

// Level cap for creatures spawning in ANY city's SAFE RING, or null when the
// point is far enough out that normal zone difficulty applies. EVERY city now
// gets this protection (not just the capital): so a player who arrives at, say,
// Frostpeak — whose Dragon Mountains zone (level 16-72) overlaps the wall — won't
// be one-shot by a dragon spawning on the doorstep. The cap eases UP from a low
// floor at the wall to the zone's own level by the ring edge, so it's a gentle
// slope out of the safe town, not a cliff, and the strong creatures simply spawn
// FARTHER from town (past the ring) instead of against the gate.
export function citySafeLevelCap(x, z) {
  let nearest = null, nd = Infinity;
  for (const c of CITIES) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < nd) { nd = d; nearest = c; }
  }
  if (!nearest) return null;
  const wall = styleFor(nearest).radius;
  if (nd >= wall + CITY_SAFE_MARGIN) return null;     // outside the ring: no cap
  const t = Math.max(0, (nd - wall) / CITY_SAFE_MARGIN); // 0 at wall → 1 at edge
  const isCapital = nearest.style === 'capital';
  const floor = isCapital ? SAFE_CAP_AT_WALL_CAPITAL : SAFE_CAP_AT_WALL_OTHER;
  // The cap climbs from `floor` at the wall to the zone's natural level at the
  // ring edge (so the ring blends smoothly into the surrounding difficulty
  // instead of ending in a sudden wall of dragons). We approximate the zone level
  // at the ring edge with the wilderness curve, clamped so the ring is always at
  // least a few levels of head-room above the wall floor.
  const edgeLevel = Math.max(floor + 4, citySafeEdgeLevel(nearest));
  return Math.round(floor + t * (edgeLevel - floor));
}

// Backwards-compatible alias: combat.js imported the capital-only name. Keep it
// pointing at the generalised, all-cities ring so existing call sites still work.
export const capitalSafeLevelCap = citySafeLevelCap;

// Roughly how dangerous the open world is right at a city's safe-ring edge, used
// as the upper end of that city's cap slope. Distance-from-origin curve (the same
// shape wildernessLevelAt uses) so far-flung frontier towns get a higher ceiling
// than cozy inner ones, without hard-coding a number per city.
function citySafeEdgeLevel(city) {
  return Math.max(6, Math.round(2 + Math.hypot(city.x, city.z) / 120));
}

// The wall outline of a city, for drawing on the map. Grid cities (the capital)
// trace the irregular masked footprint as a world-space polygon; round towns are
// a circle at the wall radius (the wall sits at radius - 3, see buildWall).
// Returns { shape:'poly', points:[{x,z},...] } or { shape:'circle', x, z, radius }.
export function cityWallOutline(city) {
  const st = styleFor(city);
  if (st.grid) {
    return { shape: 'poly', points: capitalWallPolygon(city.x, city.z, GRID.cell) };
  }
  // Shaped towns trace their polygon; legacy/round ones still draw a circle.
  if (st.shape) {
    return { shape: 'poly', points: townPolygon(city.x, city.z, st.radius - 3, st.shape) };
  }
  return { shape: 'circle', x: city.x, z: city.z, radius: st.radius - 3 };
}

// Trace the outer boundary of CAPITAL_CELLS as a single closed loop of world
// points. Collect every boundary edge (a cell side whose neighbor is outside),
// then stitch the edges end-to-end into an ordered ring. Cached after first use.
let _capitalPoly = null;
function capitalWallPolygon(cx, cz, cell) {
  if (_capitalPoly) return _capitalPoly.map((p) => ({ x: cx + p.x, z: cz + p.z }));
  const half = cell / 2;
  // Each boundary edge as two integer-keyed endpoints (in half-cell units so all
  // coordinates are integers and match exactly when shared between edges).
  const k = (a, b) => `${a},${b}`;
  const edges = [];
  for (const { col, row } of CAPITAL_CELLS.list) {
    const x0 = col * 2 - 1, x1 = col * 2 + 1;   // cell spans [col*2-1 .. col*2+1] in half-units
    const z0 = row * 2 - 1, z1 = row * 2 + 1;
    if (!cellInCity(col, row - 1)) edges.push([k(x0, z0), k(x1, z0)]); // N
    if (!cellInCity(col, row + 1)) edges.push([k(x0, z1), k(x1, z1)]); // S
    if (!cellInCity(col - 1, row)) edges.push([k(x0, z0), k(x0, z1)]); // W
    if (!cellInCity(col + 1, row)) edges.push([k(x1, z0), k(x1, z1)]); // E
  }
  // Adjacency: each endpoint links to its edge partners; walk the loop.
  const adj = new Map();
  for (const [a, b] of edges) {
    (adj.get(a) || adj.set(a, []).get(a)).push(b);
    (adj.get(b) || adj.set(b, []).get(b)).push(a);
  }
  const start = edges[0][0];
  const ring = [start];
  let prev = null, cur = start;
  for (let guard = 0; guard < edges.length + 4; guard++) {
    const nbrs = adj.get(cur) || [];
    const next = nbrs.find((n) => n !== prev) ?? nbrs[0];
    if (next === undefined || next === start) break;
    ring.push(next); prev = cur; cur = next;
  }
  _capitalPoly = ring.map((key) => {
    const [hx, hz] = key.split(',').map(Number);
    return { x: hx * half, z: hz * half };
  });
  return _capitalPoly.map((p) => ({ x: cx + p.x, z: cz + p.z }));
}

// The temple is the city center: it is where players spawn and respawn.
export function templePos(city) {
  return { x: city.x, z: city.z };
}

// Themed quarters for the small round towns, placed around the temple at a fixed
// bearing and distance. Each anchors a few houses and decoration so the town
// reads as real districts. The big shop buildings are enterable (solid walls +
// a doorway). The market sells general goods (matches the legacy 'shop'
// interactable); others are vendor NPC homes.
// Six themed quarters now (added `archer`), spread around the ring so every
// round town has a building for each vendor trade — including the bow sellers —
// and no vendor is ever left homeless at the temple center. The south bearing
// (Math.PI*1.5) stays clear for the gate.
const DISTRICTS = [
  { key: 'mage',     angle: Math.PI * 0.20, distF: 0.55, label: 'Arcane Tower' },
  { key: 'archer',   angle: Math.PI * 0.55, distF: 0.55, label: 'Fletcher' },
  { key: 'knight',   angle: Math.PI * 0.85, distF: 0.55, label: 'Armory' },
  { key: 'potion',   angle: Math.PI * 1.15, distF: 0.55, label: 'Apothecary' },
  { key: 'market',   angle: Math.PI * 1.45, distF: 0.55, label: 'Market Hall' },
  { key: 'library',  angle: Math.PI * 1.80, distF: 0.62, label: 'Great Library' },
];

// Batch the city's hundreds of STATIC meshes into a few merged meshes — one per
// (material × attribute-set) — to cut the draw-call count from ~300+ per city to
// ~20. Purely a rendering optimisation: the merged result is byte-for-byte the
// same geometry at the same world positions with the same materials, so it looks
// identical. Collision is data-driven (world.addSolid), independent of these
// meshes, so merging them changes nothing there.
//
// What we DON'T touch (left as individual objects):
//   - anything that isn't a plain THREE.Mesh child of the group (Groups such as
//     the temple aura, gate-guard knights, statues built as sub-groups);
//   - meshes with their own userData (e.g. userData.templeAura);
//   - transparent meshes (water, glow discs, lamps, portals) — merging them would
//     break per-object draw ordering / additive blending;
//   - MeshBasicMaterial meshes (portals, lamps, orbs) — kept so they can be
//     animated/recoloured individually.
// We only fold opaque MeshLambertMaterial meshes, grouped by their shared material
// object AND by their exact attribute set (so vertex-coloured paving merges only
// with paving, never with plain walls).
function mergeCityStatics(group) {
  const mesh = THREE.Mesh;
  const fold = []; // meshes we will merge
  for (const child of group.children) {
    if (!child.isMesh) continue;                       // skip Groups (auras, guards…)
    if (child.children && child.children.length) continue; // mesh with attachments — leave it
    if (child.userData && Object.keys(child.userData).length) continue; // tagged — leave it
    const m = child.material;
    if (!m || Array.isArray(m)) continue;              // multi-material — skip
    if (!m.isMeshLambertMaterial) continue;            // only fold lambert (skip Basic/glow)
    if (m.transparent) continue;                       // skip water/glass/glow
    if (!child.geometry || !child.geometry.attributes.position) continue;
    fold.push(child);
  }
  if (fold.length < 2) return;                          // nothing worth merging

  // Bucket by material object, then by the geometry's attribute signature, so
  // every merged batch is safe to concatenate (same attributes, one material).
  const buckets = new Map();
  for (const child of fold) {
    const attrs = Object.keys(child.geometry.attributes).sort().join(',');
    const matKey = child.material.uuid + '|' + attrs;
    let b = buckets.get(matKey);
    if (!b) { b = { material: child.material, attrs, items: [] }; buckets.set(matKey, b); }
    b.items.push(child);
  }

  const merged = [];
  for (const b of buckets.values()) {
    if (b.items.length < 2) continue;                  // a lone mesh: leave it as-is
    const baked = [];
    for (const child of b.items) {
      child.updateMatrixWorld(true);
      const g = child.geometry.clone();
      g.applyMatrix4(child.matrixWorld);               // bake world transform into the verts
      baked.push(g);
    }
    const mergedGeo = mergeBufferGeometriesLocal(baked, b.attrs);
    for (const g of baked) g.dispose();
    if (!mergedGeo) continue;
    const mm = new mesh(mergedGeo, b.material);
    mm.matrixAutoUpdate = false;                        // static — never moves
    merged.push(mm);
    // Remove the originals from the group and free their (now-redundant) geometry.
    for (const child of b.items) {
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
  }
  for (const mm of merged) group.add(mm);
}

// Minimal geometry merger using only core Three.js (the vendored build doesn't
// ship BufferGeometryUtils). All inputs must be non-indexed-or-indexed with the
// SAME attribute set (guaranteed by the caller's bucketing). Returns a single
// non-indexed BufferGeometry, or null if the set is empty/mismatched.
function mergeBufferGeometriesLocal(geos, attrSig) {
  if (!geos.length) return null;
  const names = attrSig.split(',').filter(Boolean);
  // Expand any indexed geometry to non-indexed so we can simply concatenate.
  const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  // Validate every geometry exposes exactly the expected attributes.
  for (const g of flat) {
    for (const n of names) if (!g.attributes[n]) return null;
  }
  let total = 0;
  for (const g of flat) total += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const itemSize = flat[0].attributes[n].itemSize;
    const arr = new Float32Array(total * itemSize);
    let offset = 0;
    for (const g of flat) {
      const a = g.attributes[n];
      arr.set(a.array, offset);
      offset += a.array.length;
    }
    out.setAttribute(n, new THREE.BufferAttribute(arr, itemSize));
  }
  // Dispose the throwaway non-indexed copies we created (but not the originals,
  // which the caller disposes).
  flat.forEach((g, i) => { if (g !== geos[i]) g.dispose(); });
  return out;
}

export function buildCities(scene, world) {
  const group = new THREE.Group();

  const props = [];
  const portals = [];
  const interiors = []; // { city, kind, x, z, y } — where a vendor NPC walks
  const houses = [];    // flat list of round-town house lots (for interiors/basements)
  for (const c of CITIES) {
    const flat = c.groundY != null ? c.groundY : world.heightAt(c.x, c.z);
    const st = styleFor(c);
    const mats = makeStyleMats(st);

    const built = st.grid
      ? buildGridCity(group, world, c, flat, mats, st)
      : buildRoundCity(group, world, c, flat, mats, st);

    // Two biome-themed soldiers stand watch at each gate of every city.
    buildGateGuards(group, c, flat);

    // An entrance PLAZA with a central green healing fountain JUST INSIDE every
    // gate: a themed paved circle with a glowing green heal-shrine in its middle,
    // so whichever exit you arrive at has the same welcoming roundabout. Talk to
    // the fountain to be patched up (low-level only). Centres returned for
    // interaction + map markers.
    const st0 = styleFor(c);
    // The capital's gate corridors are wide; round towns have a narrower 5m road
    // corridor through the wall, so use a smaller plaza there to avoid poking into
    // the neighbouring house lots.
    const plazaR = st0.grid ? 6 : 5;
    const inset = st0.grid ? 9 : 8;              // how far inside the gate the centre sits
    const healStatues = [];
    for (const g of cityGates(c)) {
      const ox = g.x - c.x, oz = g.z - c.z;
      const len = Math.hypot(ox, oz) || 1;
      const dx = ox / len, dz = oz / len;          // outward (centre -> gate)
      const px = g.x - dx * inset, pz = g.z - dz * inset;   // INSIDE the gate (plaza centre)
      healStatues.push(buildHealPlaza(group, world, px, pz, flat, mats, st0, plazaR));
    }

    for (const it of built.interiors) interiors.push(it);
    if (built.houses) for (const h of built.houses) houses.push(h);
    portals.push({ city: c, mesh: built.portalMesh });
    props.push({
      city: c, temple: templePos(c),
      shop: built.shopPos, depot: built.depotPos, portal: built.portalPos,
      // Extra named POIs (bank, food, archer, townhall...) for the map markers.
      pois: built.pois || [],
      // Free-market stalls (ring of { stallId, x, z, rot }) for interaction.
      stalls: built.stalls || [],
      // Gate healing statues (one per gate, each { x, z }) — talk to one to heal
      // (low level only).
      healStatues,
    });
  }
  // Batch the static buildings/walls/decor into a handful of merged meshes before
  // the group goes into the scene — big draw-call win, identical visuals. Runs
  // after EVERY city + gate + plaza is built so it folds the whole batch at once.
  mergeCityStatics(group);
  scene.add(group);
  return { group, props, portals, interiors, houses };
}

// Nearest round-town house whose DOORWAY the player is standing at, else null.
// `houses` is buildCities().houses; matches on the house's stored door world-pos
// (doorX/doorZ, computed the same way buildHouse places the door) so the buy /
// enter / descend prompt fires at the doorstep, not at the house centre. The
// other module (house.js) calls this to know which lot to attach an interior to.
export function houseLotAt(houses, x, z, radius = 2.2) {
  if (!houses) return null;
  let best = null, bestD2 = radius * radius;
  for (const h of houses) {
    const dx = h.doorX - x, dz = h.doorZ - z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD2) { bestD2 = d2; best = h; }
  }
  return best;
}

// Soldier kits. Guards are now dressed for THEIR OWN CITY, not just their biome —
// every town gets a distinct livery (its own tabard, trim and plume) echoing that
// city's wall/roof palette, so two forest towns or two snow towns don't field
// identical soldiers. GUARD_THEMES_BY_CITY is keyed by city id; GUARD_THEMES is
// the per-biome fallback for any city without a bespoke kit.
const GUARD_THEMES = {
  forest: { metal: 0xbfc4cc, metalDark: 0x6f7681, cloth: 0x3f6e34, trim: 0xd8c060, plume: 0xc23a2e, cape: false },
  snow:   { metal: 0xcfe0ec, metalDark: 0x7f97ad, cloth: 0x3a5e86, trim: 0xdfeaf4, plume: 0x9fd0ef, cape: true,  capeColor: 0xe8eef4 },
  desert: { metal: 0xd9b25a, metalDark: 0x9c7a32, cloth: 0xc28a3e, trim: 0x7a3320, plume: 0x3a8a7a, cape: true,  capeColor: 0xd8b97a },
};
const GUARD_THEMES_BY_CITY = {
  // Greenhollow (capital): bright royal steel, crimson tabard, gold trim — the
  // king's own guard, the grandest livery.
  rivertown:  { metal: 0xcfd4dc, metalDark: 0x767d88, cloth: 0x8e2f2c, trim: 0xe8c84e, plume: 0xe8c84e, cape: true,  capeColor: 0x8e2f2c },
  // Oakvale: a homelier forest town — burnished steel, deep-green tabard, no cape.
  oakvale:    { metal: 0xb6bcc2, metalDark: 0x6a7178, cloth: 0x2f6f3a, trim: 0xc8a84a, plume: 0xc23a2e, cape: false },
  // Westharbor: a teal-and-brass river port livery with a sea-green cloak.
  westharbor: { metal: 0xc2cccb, metalDark: 0x6f7e7c, cloth: 0x1f6f68, trim: 0xd8c060, plume: 0x2f9d92, cape: true,  capeColor: 0x215c58 },
  // Stonehaven: slate-grey mountain plate, steel-blue tabard, fur cloak.
  stonehaven: { metal: 0xb9c2cc, metalDark: 0x6f7884, cloth: 0x49566a, trim: 0xbcc6d2, plume: 0x8fb4d6, cape: true,  capeColor: 0xc4cdd8 },
  // Frostpeak: pale frost-blue plate, ice tabard, white fur cloak — distinct from
  // Stonehaven's darker slate kit so the two snow towns differ at a glance.
  frostpeak:  { metal: 0xdce8f2, metalDark: 0x88a0b6, cloth: 0x2f6aa0, trim: 0xeaf2fa, plume: 0x7fc8ef, cape: true,  capeColor: 0xeef4fa },
  // Dragonreach: pharaonic gold plate, deep-red tabard, teal plume, sand cloak.
  dragonreach:{ metal: 0xe0bd5c, metalDark: 0xa07e34, cloth: 0x8a2e22, trim: 0xf0d77a, plume: 0x2f9d8a, cape: true,  capeColor: 0xd8b97a },
  // Sandport: warm brass with a turquoise oasis tabard and a light sand cloak —
  // distinct from Dragonreach's red-and-gold pharaonic kit.
  sandport:   { metal: 0xd8b96a, metalDark: 0x9a7e3a, cloth: 0x2f9d8a, trim: 0x7a3320, plume: 0x39a39a, cape: true,  capeColor: 0xe7cf93 },
};

// One stocky low-poly knight standing guard, facing `face` (radians). Built from
// the game's usual rounded boxes/cylinders so it matches the NPC art, but it's a
// static decoration — no AI, no collision, just two of them flanking each gate.
// Holds a tall spear and a kite shield, wears a plumed helmet and a tabard.
function buildSoldier(group, x, z, y, face, theme) {
  const M = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const skin = M(0xe0a87e);
  const metal = M(theme.metal), metalDark = M(theme.metalDark);
  const cloth = M(theme.cloth), trim = M(theme.trim), plume = M(theme.plume);
  const boot = M(0x3a2a1c);
  const s = new THREE.Group();

  // Legs (greaves) — two short pillars.
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.7, 8), metalDark);
    leg.position.set(sx * 0.16, 0.36, 0);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.34), boot);
    ft.position.set(sx * 0.16, 0.08, 0.04);
    s.add(leg, ft);
  }
  // Torso: a breastplate over a tabard skirt.
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.5, 10), cloth);
  skirt.position.y = 0.92;
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.62, 10), metal);
  chest.position.y = 1.28;
  // Tabard stripe + belt for a bit of relief on the chest.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.04), trim);
  stripe.position.set(0, 1.22, 0.29);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.1, 10), trim);
  belt.position.y = 0.98;
  s.add(skirt, chest, stripe, belt);
  // Pauldrons (rounded shoulder caps).
  for (const sx of [-1, 1]) {
    const pa = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), metal);
    pa.position.set(sx * 0.34, 1.5, 0);
    s.add(pa);
  }
  // Arms (gauntleted) — left holds the shield, right grips the spear.
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.62, 8), metalDark);
    arm.position.set(sx * 0.38, 1.18, sx === 1 ? 0.16 : 0);
    if (sx === 1) arm.rotation.x = -0.5;   // right arm raised to hold the haft
    s.add(arm);
  }
  // Head + plumed helmet.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skin);
  head.position.y = 1.74;
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), metal);
  helm.position.y = 1.8;
  const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.06), metalDark);
  nasal.position.set(0, 1.74, 0.18);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.34), plume);
  crest.position.set(0, 1.96, -0.02);
  s.add(head, helm, nasal, crest);
  // Optional cloak (cold/desert) — a draped slab behind the back.
  if (theme.cape) {
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.06), M(theme.capeColor));
    cape.position.set(0, 1.18, -0.26);
    cape.rotation.x = 0.12;
    s.add(cape);
  }
  // Spear: a long shaft with a steel head, planted by the right hand.
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6), boot);
  shaft.position.set(0.42, 1.05, 0.2);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 6), metal);
  tip.position.set(0.42, 2.3, 0.2);
  s.add(shaft, tip);
  // Kite shield on the left arm, blazoned with the tabard colour.
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.7, 0.06), cloth);
  shield.position.set(-0.42, 1.16, 0.18);
  const blazon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 8), trim);
  blazon.position.set(-0.42, 1.2, 0.22); blazon.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.05), metalDark);
  rim.position.set(-0.42, 1.5, 0.18);
  s.add(shield, blazon, rim);

  s.position.set(x, y, z);
  s.rotation.y = face;
  group.add(s);
}

// Post two themed soldiers at every gate of a city, guarding the entrances. They
// flank the opening (one each side) and face OUTWARD down the road, so the town
// reads as garrisoned. Falls back to the temperate forest kit for any biome we
// don't have a theme for.
function buildGateGuards(group, city, flat) {
  const theme = GUARD_THEMES_BY_CITY[city.id] || GUARD_THEMES[city.biome] || GUARD_THEMES.forest;
  for (const g of cityGates(city)) {
    const ox = g.x - city.x, oz = g.z - city.z;
    const len = Math.hypot(ox, oz) || 1;
    const dx = ox / len, dz = oz / len;     // outward (city center -> gate)
    const px = -dz, pz = dx;                 // along the gate opening
    const face = Math.atan2(dx, dz);         // look outward (model faces +Z)
    // Stand just inside the gate, a couple of metres apart on either side.
    const inx = g.x - dx * 2.5, inz = g.z - dz * 2.5;
    buildSoldier(group, inx + px * 2.2, inz + pz * 2.2, flat, face, theme);
    buildSoldier(group, inx - px * 2.2, inz - pz * 2.2, flat, face, theme);
  }
}

// A circular ENTRANCE PLAZA with a central green HEALING FOUNTAIN, built just
// inside a city gate. Every city gets one at each gate, themed to its biome (the
// paving uses the city's own stone colour, like the capital's central plaza), so
// the exits all read as a proper paved roundabout with a glowing green shrine in
// the middle. The fountain is the 'healStatue' interactable — stand in the circle
// and talk to it to be patched up (low-level only). Returns the centre { x, z }.
//
// `radius` is the plaza disc radius; `st` carries the city style (for the themed
// stone colour). The fountain sits dead-centre so you walk up to it from any side.
function buildHealPlaza(group, world, x, z, y, mats, st, radius = 6) {
  // --- The paved circular plaza (themed cobbles + a thin raised rim) ----------
  const stoneHex = (st && st.stone) || 0xb9b2a2;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.3, 40), mats.stoneDark);
  base.position.set(x, y - 0.04, z);
  group.add(base);
  // Cobbled top layer clipped to the disc (square paving scaled in like the
  // capital's plaza, so it reads as laid stone, not a flat slab).
  const pave = makePaving(radius * 2, radius * 2, stoneHex, cellSeed(Math.round(x), Math.round(z)), 0.5);
  pave.position.set(x, y + 0.06, z);
  pave.scale.set(0.86, 1, 0.86);
  group.add(pave);
  // A low rim ring around the plaza edge so the circle reads crisply.
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.2, 0.18, 8, 44), mats.stone);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, y + 0.12, z);
  group.add(rim);

  // --- The central green healing fountain -------------------------------------
  buildHealFountain(group, world, x, z, y, mats);
  return { x, z };
}

// The green healing fountain that sits at the centre of an entrance plaza: a
// tiered stone basin with green water, a tapering spire, and a glowing green orb
// on top with a halo + light, so it reads as a benevolent healing shrine from a
// distance. Registers a solid so players circle it instead of standing inside it.
function buildHealFountain(group, world, x, z, y, mats) {
  const g = new THREE.Group();
  const GREEN = 0x55ff88, ORB = 0x66ffa0;
  // Stepped basin: a wide low bowl on a round pedestal.
  const step = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.4, 24), mats.stoneDark);
  step.position.set(0, 0.2, 0);
  g.add(step);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.6, 24), mats.stone);
  basin.position.set(0, 0.7, 0);
  g.add(basin);
  // Green water surface inside the basin (tinted, glowing green so it reads as a
  // magical heal-spring rather than ordinary water).
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.12, 24),
    new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.55 }));
  water.position.set(0, 0.96, 0);
  g.add(water);
  // A central tapering spire/pillar rising from the basin.
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.55, 2.4, 12), mats.stone);
  pillar.position.set(0, 2.1, 0);
  g.add(pillar);
  // A small upper bowl that the "water" spills from.
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.55, 0.4, 16), mats.stoneDark);
  upper.position.set(0, 3.2, 0);
  g.add(upper);
  // The glowing green healing orb crowning the spire, with a soft halo + light.
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14),
    new THREE.MeshBasicMaterial({ color: ORB }));
  orb.position.set(0, 4.0, 0);
  g.add(orb);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 14),
    new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.set(0, 4.0, 0);
  g.add(halo);
  const light = new THREE.PointLight(GREEN, 0.8, 16, 2);
  light.position.set(0, 3.6, 0);
  g.add(light);
  // A faint aura ring on the ground so the heal zone reads from across the plaza.
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.8, 28),
    new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.06, 0);
  g.add(ring);

  g.position.set(x, y, z);
  group.add(g);
  if (world && world.addSolid) world.addSolid(x, z, 1.6);
  return { x, z };
}

// A teleport portal ring + glowing disc at (x,z). Returns its mesh + position.
function buildPortal(group, x, z, y, mats) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.3, 8, 18), mats.portal);
  ring.position.set(x, y + 1.6, z);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 18),
    new THREE.MeshBasicMaterial({ color: 0xb89bff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  disc.position.set(x, y + 1.6, z);
  group.add(ring, disc);
  return { mesh: ring, pos: { x, z } };
}

// A city's signature LANDMARK: a distinct tall structure so every town has its
// own silhouette. Built on the city pad (flat ground), solid where it makes
// sense. `kind` selects which one.
function buildLandmark(group, world, x, z, y, kind, mats) {
  if (kind === 'oak') {
    // A huge ancient oak: a thick trunk and a broad layered canopy.
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.9, 9, 10), mats.wood);
    trunk.position.set(x, y + 4.5, z);
    group.add(trunk);
    for (let i = 0; i < 3; i++) {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(5.5 - i * 0.8, 0), mats.leaf);
      blob.position.set(x + (i - 1) * 1.6, y + 9 + i * 1.6, z + (i % 2 ? 1.4 : -1.4));
      group.add(blob);
    }
    if (world) world.addSolid(x, z, 2.0);
  } else if (kind === 'obelisk' || kind === 'icetower') {
    // A tall tapered tower/obelisk (frosty blue for the ice town).
    const mat = kind === 'icetower' ? mats.glass : mats.stone;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 16, kind === 'icetower' ? 6 : 4), mat);
    shaft.position.set(x, y + 8, z);
    group.add(shaft);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.0, 4, kind === 'icetower' ? 6 : 4), mats.roof);
    cap.position.set(x, y + 18, z);
    group.add(cap);
    if (world) world.addSolid(x, z, 2.2);
  } else if (kind === 'pyramid') {
    // A grand stepped sandstone pyramid flanked by two obelisks and a sphinx —
    // the pharaonic centrepiece of the desert city.
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const s = 20 * (1 - i / tiers);
      const block = new THREE.Mesh(new THREE.BoxGeometry(s, 2.6, s), mats.stone);
      block.position.set(x, y + (i + 0.5) * 2.6, z);
      group.add(block);
    }
    // gilded capstone
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3, 4), mats.gold);
    cap.position.set(x, y + tiers * 2.6 + 1.4, z); cap.rotation.y = Math.PI / 4;
    group.add(cap);
    if (world) world.addSolid(x, z, 10.5);
    // A pair of tall obelisks in front of the pyramid.
    for (const s of [-1, 1]) {
      const ox = x + s * 14, oz = z + 14;
      const obel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 12, 4), mats.stone);
      obel.position.set(ox, y + 6, oz); obel.rotation.y = Math.PI / 4;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2, 4), mats.gold);
      tip.position.set(ox, y + 13, oz); tip.rotation.y = Math.PI / 4;
      group.add(obel, tip);
      if (world) world.addSolid(ox, oz, 1.1);
    }
    // A crouching sphinx (a stylised body + head block) guarding the approach.
    const sbody = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 2.4), mats.stone);
    sbody.position.set(x, y + 1.5, z + 22); group.add(sbody);
    const shead = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 2.2), mats.stone);
    shead.position.set(x + 2.2, y + 4, z + 22); group.add(shead);
    const sface = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.4), mats.gold);
    sface.position.set(x + 2.2, y + 4.2, z + 23.1); group.add(sface);
    if (world) world.addSolid(x, z + 22, 3.4);
  } else if (kind === 'lighthouse') {
    // A striped lighthouse with a glowing lamp room.
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 3.0, 16, 14), mats.temple);
    body.position.set(x, y + 8, z);
    group.add(body);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3, 14), mats.glass);
    lamp.position.set(x, y + 17.5, z);
    group.add(lamp);
    const light = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10), mats.lamp);
    light.position.set(x, y + 17.5, z);
    group.add(light);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.6, 14), mats.roof);
    roof.position.set(x, y + 20.3, z);
    group.add(roof);
    if (world) world.addSolid(x, z, 3.0);
  } else if (kind === 'oasis') {
    // A palm-ringed pool with a domed shrine: the heart of the oasis town.
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.2, 0.5, 24), mats.water);
    pool.position.set(x, y + 0.2, z);
    group.add(pool);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = x + Math.cos(a) * 7.5, pz = z + Math.sin(a) * 7.5;
      const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 6, 6), mats.wood);
      palm.position.set(px, y + 3, pz); palm.rotation.z = (i % 2 ? 0.12 : -0.12);
      const fronds = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 0), mats.leaf);
      fronds.position.set(px, y + 6.2, pz);
      group.add(palm, fronds);
      if (world) world.addSolid(px, pz, 0.5);
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.roof);
    dome.position.set(x + 11, y + 3, z);
    group.add(dome);
    if (world) world.addSolid(x + 11, z, 3.2);
  }
}

// --- Round-town house layout (shared by builder + map) -----------------------
// Deterministic per-city house plan. Returns one descriptor per house lot across
// ALL the town's concentric rings — the SAME data the 3D builder and the minimap
// read, so they never drift. Each town now packs 3-4 rings (was 2) to reach a
// capital-sized ~45-55 houses, and the per-style ROUND_HOUSE_RECIPES knobs decide
// each lot's size, height (1-3 floors), mansion-ness and basement. A small stable
// hash per lot keeps the mix identical every load.
// Descriptor: { x, z, rot, w, d, wallH, floors, mansion, basement, doorX, doorZ }.
function roundHouseLots(c, R) {
  const rec = houseRecipeFor(c);
  const lots = [];
  // The town's actual WALL polygon (same one buildWall traces, inset to R-3).
  // Shaped towns (diamond/rectangle/pentagon…) pull the wall much closer to the
  // centre along their edge midpoints than a circle would, so a house placed on a
  // circular ring can poke straight THROUGH a wall edge (the "buildings outside
  // Frostpeak" bug). We reject any lot whose footprint isn't fully inside this
  // polygon, with a small margin so houses don't kiss the wall.
  const shape = styleFor(c).shape;
  const poly = shape ? townPolygon(c.x, c.z, R - 3, shape) : null;
  // Bearings of the REAL gate openings, so we clear the right corridors for the
  // gate roads (cardinal bearings miss the openings on shaped towns).
  const gateBearings = cityGates(c).map((g) => Math.atan2(g.z - c.z, g.x - c.x));
  const lotInsideWall = (x, z, w, d) => {
    if (!poly) return true;                 // circular town: ring already fits
    const hw = w / 2 + 1.5, hd = d / 2 + 1.5;   // footprint half-extents + margin
    // All four footprint corners must sit inside the wall polygon.
    return pointInPolygon(x - hw, z - hd, poly) && pointInPolygon(x + hw, z - hd, poly)
        && pointInPolygon(x - hw, z + hd, poly) && pointInPolygon(x + hw, z + hd, poly);
  };
  // FNV-ish stable hash of an index -> [0,1), so a town's mix is fixed per load.
  const rand = (k) => {
    let h = (k * 2654435761) ^ ((R | 0) * 40503) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = (h ^ (h >>> 13)) >>> 0;
    return h / 4294967296;
  };
  let hi = 0, bigCount = 0;
  for (let ri = 0; ri < rec.rings.length; ri++) {
    const ring = rec.rings[ri];
    const rr = R * ring.f;
    // Pack each ring at a roughly constant arc-spacing so inner rings hold fewer
    // houses than outer ones and nothing overlaps; clamp so a town lands around
    // capital-sized ~45-55 homes. `sparse` rings (the 4th ring of the densest
    // towns) use a wider spacing so adding a ring doesn't blow past ~55.
    const spacing = ring.sparse ? 20 : 13;
    const n = Math.max(5, Math.min(18, Math.round((2 * Math.PI * rr) / spacing)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring.gap;
      // Keep the gate corridors clear on the two OUTER rings (inner houses sit
      // well clear of the gate openings already). Clear against the REAL gate
      // bearings so the corridor lines up with the actual openings/roads.
      if (rr > R * 0.6 && nearAnyGate(a, gateBearings, 0.22)) continue;
      // Four INDEPENDENT hash draws per lot so size/floors/basement don't
      // correlate (a separate r4 for the basement, not the mansion roll).
      const r1 = rand(hi * 11 + 1), r2 = rand(hi * 11 + 3), r3 = rand(hi * 11 + 5), r4 = rand(hi * 11 + 7);
      const hx0 = c.x + Math.cos(a) * rr, hz0 = c.z + Math.sin(a) * rr;
      const facing = Math.atan2(c.x - hx0, c.z - hz0); // door faces the plaza
      const mansion = r1 < rec.mansion;
      // Size: mansions get ~2x footprint; normals get the base + a little jitter.
      let w = rec.baseW + (r2 * 1.6 - 0.4);
      let d = rec.baseD + (r3 * 1.6 - 0.4);
      if (mansion) { w *= 2.0 + r2 * 0.2; d *= 1.6 + r3 * 0.2; }
      // Floors: mansions and 3-story candidates get extra storeys.
      let floors = 1;
      if (mansion) floors = r3 < 0.5 ? 2 : 3;
      else if (r2 < rec.threeStory && (w >= 5 && d >= 5)) floors = 3;
      else if (r2 < rec.threeStory + rec.twoStory) floors = 2;
      // Basement only on the BIGGEST/best homes (mansion or 3-story), ~recipe% of
      // THEM (its own r4 roll, so it's ~20% of big homes, not tied to mansion-ness).
      // The FIRST big home in every town is always given a cellar so no town ends
      // up with zero basements just from small-sample hash variance.
      const big = mansion || floors >= 3;
      if (big) bigCount++;
      const basement = big && (bigCount === 1 || r4 < rec.basement);
      // Drop any lot whose footprint would cross the (shaped) wall — keeps every
      // house inside the town instead of floating outside a diamond/rectangle edge.
      if (!lotInsideWall(hx0, hz0, w, d)) { hi++; continue; }
      // Door world-pos: replicate buildHouse (front +z face at d/2, post-rotation).
      const fx = Math.sin(facing), fz = Math.cos(facing);
      lots.push({
        x: hx0, z: hz0, rot: facing, w, d, wallH: rec.wallH,
        floors, mansion, basement,
        chimney: r2 < rec.chimney, awning: r3 < rec.awning,
        idx: (hi + ri) % 2, // alternates the wall/roof tone for stripe variety
        doorX: hx0 + fx * (d / 2 + 0.02), doorZ: hz0 + fz * (d / 2 + 0.02),
      });
      hi++;
    }
  }
  return lots;
}

// --- Small round town (Oakvale, Stonehaven, Dragonreach) ---------------------
// The original radial layout: temple at center, themed districts at bearings,
// a ring of homes, props and a stone wall with one gate.
function buildRoundCity(group, world, c, flat, mats, st) {
  const R = st.radius;
  const interiors = [];
  const pois = [];   // named map markers for every notable building in the town

  buildStreets(group, c.x, c.z, flat, R, mats, st);
  buildWall(group, world, c.x, c.z, flat, R - 3, mats, st.shape);
  // Dress each REAL gate: a paved approach strip running out through the opening,
  // flanked by a pair of lamps, so the exits read as real roads out of town (and
  // match the gate markers, guards and heal statues). Use cityGates() — the actual
  // wall openings (edge midpoints for shaped towns), NOT the cardinal bearings,
  // which on a diamond/rectangle miss the openings and dressed solid wall instead.
  for (const g of cityGates(c)) {
    const ox = g.x - c.x, oz = g.z - c.z;
    const len = Math.hypot(ox, oz) || 1;
    const dx = ox / len, dz = oz / len;      // outward (centre -> gate)
    const px = -dz, pz = dx;                 // perpendicular (road width axis)
    const gateA = Math.atan2(dz, dx);
    const road = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 30), mats.stoneDark);
    road.position.set(g.x + dx * 9, flat - 0.04, g.z + dz * 9);
    road.rotation.y = -gateA + Math.PI / 2;
    group.add(road);
    buildProp(group, world, g.x + px * 3.5, g.z + pz * 3.5, flat, 'lamp', mats);
    buildProp(group, world, g.x - px * 3.5, g.z - pz * 3.5, flat, 'lamp', mats);
  }
  buildTemple(group, c.x, c.z, flat, mats.temple, mats.stone, world);
  pois.push({ x: c.x, z: c.z, icon: '🏛️', label: 'Temple' });
  buildTownHall(group, world, c.x, c.z + 18, flat, mats);
  pois.push({ x: c.x, z: c.z + 18, icon: '🏛️', label: 'Town Hall' });
  // (No floating city-name sprite — the name still shows on the minimap label.)
  // Each town's signature landmark, off to one side of the plaza, so the
  // skyline reads differently in every city — and it gets its own map marker.
  if (st.landmark) {
    const lx = c.x - R * 0.34, lz = c.z - R * 0.18;
    buildLandmark(group, world, lx, lz, flat, st.landmark, mats);
    const lm = LANDMARK_POI[st.landmark];
    if (lm) pois.push({ x: lx, z: lz, icon: lm.icon, label: lm.label });
  }

  for (const dist of DISTRICTS) {
    const dd = R * dist.distF;
    const dx = c.x + Math.cos(dist.angle) * dd;
    const dz = c.z + Math.sin(dist.angle) * dd;
    const facing = Math.atan2(c.x - dx, c.z - dz);
    const inside = buildDistrict(group, world, dx, dz, flat, facing, dist.key, mats, st);
    if (inside) interiors.push({ city: c, kind: dist.key, x: inside.x, z: inside.z, y: flat });
    // Mark every district building on the map with its trade icon + label.
    const dp = DISTRICT_POI[dist.key];
    if (dp) pois.push({ x: dx, z: dz, icon: dp.icon, label: dp.label });
  }

  // Houses fill 3-4 concentric rings (via the shared roundHouseLots plan) so the
  // big towns reach a capital-sized ~45-55 homes and read as packed
  // neighbourhoods, not a thin outer ring around an empty field. Each lot's size,
  // floor count, mansion-ness and basement come from the per-style recipe, so
  // Oakvale ≠ Stonehaven ≠ Dragonreach. We collect a descriptor per house and
  // return them so another module can attach interiors / basement stairs.
  const houses = [];
  const lots = roundHouseLots(c, R);
  for (let i = 0; i < lots.length; i++) {
    const L = lots[i];
    buildHouse(group, world, L.x, L.z, flat, {
      w: L.w, d: L.d, wallH: L.wallH, floors: L.floors, mansion: L.mansion,
      wall: L.idx ? mats.wall : mats.wall2, wall2: L.idx ? mats.wall2 : mats.wall,
      roof: L.idx ? mats.roof : mats.roof2, roof2: L.idx ? mats.roof2 : mats.roof,
      door: mats.door, glass: mats.glass, beam: mats.beam, ridge: mats.ridge,
      stone: mats.stone, stoneDark: mats.stoneDark, wood: mats.wood, awning: L.awning ? mats.awning : null,
      rot: L.rot, pitched: st.pitched, solid: true, chimney: L.chimney,
    });
    houses.push({
      id: `${c.id}:h${i}`, city: c.id, x: L.x, z: L.z, y: flat, rot: L.rot,
      w: L.w, d: L.d, wallH: L.wallH, floors: L.floors, mansion: L.mansion, basement: L.basement,
      style: c.style, doorX: L.doorX, doorZ: L.doorZ,
    });
  }

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    buildProp(group, world, c.x + Math.cos(a) * 15, c.z + Math.sin(a) * 15, flat, 'lamp', mats);
  }
  const clutter = ['crate', 'barrel', 'cart', 'crate', 'barrel', 'well', 'cart', 'crate'];
  for (let i = 0; i < clutter.length; i++) {
    const a = (i / clutter.length) * Math.PI * 2 + 0.7;
    const rr = R * (0.32 + (i % 3) * 0.12);
    buildProp(group, world, c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr, flat, clutter[i], mats);
  }
  // Greenery so the town and its outskirts don't read as bare: benches and
  // flowerbeds inside, a ring of trees and bushes just outside the wall.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    buildProp(group, world, c.x + Math.cos(a) * R * 0.5, c.z + Math.sin(a) * R * 0.5, flat, i % 2 ? 'flowers' : 'bench', mats);
  }
  const treeRing = Math.round(R * 0.7);
  for (let i = 0; i < treeRing; i++) {
    const a = (i / treeRing) * Math.PI * 2;
    if (nearAnyGate(a, ROUND_GATE_BEARINGS, 0.25)) continue; // clear all four gates
    const rr = R + 4 + (i % 3) * 2;
    buildProp(group, world, c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr, flat, i % 3 === 0 ? 'bush' : 'tree', mats);
  }

  const market = interiors.find((it) => it.kind === 'market');
  const shopPos = market ? { x: market.x, z: market.z } : { x: c.x + 12, z: c.z };
  const depotPos = { x: c.x - 12, z: c.z };
  buildDepot(group, world, depotPos.x, depotPos.z, flat, mats);
  pois.push({ x: depotPos.x, z: depotPos.z, icon: '🏦', label: 'Depot' });
  const portalPos = { x: c.x, z: c.z + 13 };
  const portal = buildPortal(group, portalPos.x, portalPos.z, flat, mats);

  // Free-market: one open-air MARKET SQUARE near the market hall — 12 stalls
  // facing inward around a coin statue, same as the capital. A round town has a
  // single square, so it's a MINIMARKET (the big market lives in the capital).
  // The square sits a few metres off the hall's plaza side so it never overlaps
  // the building's footprint.
  const mc = market ? { x: market.x, z: market.z } : { x: c.x + 12, z: c.z };
  const off = 16;                                  // push the square clear of the hall
  const sq = { x: mc.x + (mc.x - c.x ? Math.sign(mc.x - c.x) * off : off), z: mc.z };
  const stalls = [];
  buildMarketSquare(group, world, sq.x, sq.z, flat, mats, stalls, 0, 'mini');

  return { interiors, shopPos, depotPos, portalPos, portalMesh: portal.mesh, pois, houses, stalls };
}

// Map markers for a round town's themed districts and signature landmark, keyed
// by the district key / landmark kind. The icons match the minimap's POI_STYLE
// glyph table (cities.js POIs and minimap drawing share these emoji keys).
const DISTRICT_POI = {
  mage:    { icon: '🔮', label: 'Arcane Tower' },
  knight:  { icon: '⚔️', label: 'Armory' },
  potion:  { icon: '⚗️', label: 'Potion Shop' },
  market:  { icon: '🛒', label: 'Market Hall' },
  library: { icon: '📖', label: 'Great Library' },
  archer:  { icon: '🏹', label: 'Fletcher' },
};
const LANDMARK_POI = {
  oak:        { icon: '🌳', label: 'Great Oak' },
  obelisk:    { icon: '🗿', label: 'Obelisk' },
  icetower:   { icon: '🗼', label: 'Ice Tower' },
  pyramid:    { icon: '🔺', label: 'Pyramid' },
  lighthouse: { icon: '🗼', label: 'Lighthouse' },
  oasis:      { icon: '🌴', label: 'Oasis' },
};

// --- Big Tibia-style grid city (the capital) ---------------------------------
// A rectangular walled city laid on a square street grid. The grid is GW x GH
// cells of CELL meters. A central plaza holds the temple + teleport. Named shop
// buildings occupy fixed cells (so map POIs and vendor interiors are stable);
// the remaining cells are filled with varied houses. Returns the interactable
// positions, the portal mesh, and named POIs for the map.
const GRID = {
  cell: 26,    // size of one block (building + surrounding street)
  street: 7,   // street width between blocks
};

// The capital's footprint is an ABSTRACT, irregular silhouette — not a rectangle.
// Each string is one row of grid cells (top row is the most negative Z / north);
// '#' is inside the city, ' ' is outside. The shape is wider east-west than it is
// tall, bulges out on a couple of sides, and has clipped/uneven corners so the
// wall that traces it reads as an organic medieval town, not a box.
// Rows are indexed top→bottom; the center cell (0,0) is marked so col/row math
// stays anchored regardless of how the art is drawn.
const CAPITAL_SHAPE = [
  '   ####        ',   // a small northern keep district juts out
  '  ######   ##  ',
  ' ############# ',   // long east-west body
  '###############',   // widest row
  '###############',
  ' ############# ',
  ' ###########   ',   // south-east is clipped, south-west bulges
  '  #######      ',
  '   ####        ',   // a southern gate spur
];
// Which cell in the art is world-center (col 0, row 0): row index 4, the char
// column where the body is centered. Computed once below as SHAPE_ORIGIN.
const SHAPE_ORIGIN = { r: 4, c: 7 };

// Named buildings, addressed by grid cell (col,row) with the center cell (0,0)
// = SHAPE_ORIGIN. `kind` selects interior decor + which vendor lives there;
// `icon` is the map marker. Every listed cell must be inside CAPITAL_SHAPE.
// Services cluster near the plaza; a few sit out in the spur districts so those
// extensions have a reason to exist (and an NPC to meet).
const CAPITAL_LOTS = [
  { col:  0, row: -1, kind: 'bank',    label: 'BANK',                icon: '🏦', big: true },
  { col: -1, row: -1, kind: 'potion',  label: 'Potion Shop',         icon: '⚗️' },
  { col:  1, row: -1, kind: 'food',    label: 'The Copper Kettle',   icon: '🍲' },
  { col: -2, row:  0, kind: 'knight',  label: 'Armory',              icon: '⚔️' },
  { col:  2, row:  0, kind: 'mage',    label: 'Arcane Tower',        icon: '🔮', tower: true },
  { col: -1, row:  1, kind: 'archer',  label: 'Fletcher & Bows',     icon: '🏹' },
  { col:  1, row:  1, kind: 'market',  label: 'Market Hall',         icon: '🛒', big: true },
  { col: -3, row:  0, kind: 'bag',     label: 'Sacks & Satchels',    icon: '🎒' },
  { col:  3, row: -1, kind: 'townhall',label: 'Town Hall',           icon: '🏛️', big: true },
  // Spur districts: extra trades that give the odd-shaped wings a purpose.
  { col:  0, row: -3, kind: 'temple2', label: 'North Keep',          icon: '🏰', big: true },
  { col: -4, row:  2, kind: 'tavern',  label: 'The Wayfarer Inn',    icon: '🍺' },
  { col:  4, row: -2, kind: 'jeweler', label: 'Gemcutter',           icon: '💎' },
  // The Stable: the mount vendor's own building, in a corner of the city so the
  // Stable Master stays put inside it instead of roaming the streets.
  { col:  3, row:  1, kind: 'stable',  label: 'The Stable',          icon: '🐴' },
];

// Build a fast lookup of which (col,row) cells are inside the city, plus the
// list of occupied cells, derived once from CAPITAL_SHAPE.
const CAPITAL_CELLS = (() => {
  const inside = new Set();
  const list = [];
  let minC = 0, maxC = 0, minR = 0, maxR = 0;
  for (let r = 0; r < CAPITAL_SHAPE.length; r++) {
    const rowStr = CAPITAL_SHAPE[r];
    for (let cI = 0; cI < rowStr.length; cI++) {
      if (rowStr[cI] !== '#') continue;
      const col = cI - SHAPE_ORIGIN.c;
      const row = r - SHAPE_ORIGIN.r;
      inside.add(`${col},${row}`);
      list.push({ col, row });
      minC = Math.min(minC, col); maxC = Math.max(maxC, col);
      minR = Math.min(minR, row); maxR = Math.max(maxR, row);
    }
  }
  return { inside, list, minC, maxC, minR, maxR };
})();
const cellInCity = (col, row) => CAPITAL_CELLS.inside.has(`${col},${row}`);

function buildGridCity(group, world, c, flat, mats, st) {
  const { cell } = GRID;
  const interiors = [];
  const pois = [];
  const houses = [];   // buyable house lots in the capital (same shape as round towns)

  // Grid cell (col,row) -> world center. Center cell is (0,0).
  const cellPos = (col, row) => ({ x: c.x + col * cell, z: c.z + row * cell });

  // Paved ground + streets, drawn only over the cells the irregular mask marks
  // as inside the city, so the silhouette is organic rather than a rectangle.
  buildMaskGround(group, c.x, c.z, flat, cell, mats, st);
  buildMaskStreets(group, c.x, c.z, flat, cell, GRID.street, mats, st);

  // Perimeter wall: traces the outer edges of the masked footprint, with gates.
  buildMaskWall(group, world, c.x, c.z, flat, cell, mats);

  // Central plaza: temple, a hero statue, fountains, benches and the teleport.
  // The statue sits NORTH of the temple (c.z + 9), well clear of the south spawn
  // point (the player appears at c.z - 8 by the south gate) so it never wedges
  // the player against its collision on spawn.
  buildTemple(group, c.x, c.z, flat, mats.temple, mats.stone, world);
  buildProp(group, world, c.x - 8, c.z, flat, 'fountain', mats);
  buildProp(group, world, c.x + 8, c.z, flat, 'fountain', mats);
  buildProp(group, world, c.x, c.z + 9, flat, 'statue', mats);
  // Portal first, so the plaza ring below can KEEP CLEAR of it (a ring tree used
  // to land right on the portal and hide it).
  const portalPos = { x: c.x, z: c.z + cell * 0.5 };
  const portal = buildPortal(group, portalPos.x, portalPos.z, flat, mats);
  const clearOfPortal = (x, z) => Math.hypot(x - portalPos.x, z - portalPos.z) > 4;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bx = c.x + Math.cos(a) * 11, bz = c.z + Math.sin(a) * 11;
    if (clearOfPortal(bx, bz)) buildProp(group, world, bx, bz, flat, i % 2 ? 'bench' : 'flowers', mats);
    const tx = c.x + Math.cos(a + 0.5) * 13, tz = c.z + Math.sin(a + 0.5) * 13;
    if (clearOfPortal(tx, tz)) buildProp(group, world, tx, tz, flat, 'tree', mats);
  }
  // (No floating city-name sprite — the name still shows on the minimap label.)
  // The capital keeps its castle, set back in the northern keep spur.
  if (st.castle) buildCastle(group, world, c.x, c.z + (CAPITAL_CELLS.minR - 0.3) * cell, flat, mats);

  // Named buildings. A door faces the plaza when the lot is north/south of it;
  // east/west spur lots face inward along x instead.
  const taken = new Set(['0,0']);                  // plaza center
  let shopPos = null, depotPos = null;

  // Keep each usable gate's cell clear of houses and dress it as an entry plaza,
  // so the south/east/west gates stay walkable (the north gate hits the keep, so
  // it stays a decorative arch). These are the three real ways out of the city.
  const USABLE_GATES = CAPITAL_GATES.filter((g) => g.side !== 'N');
  for (const g of USABLE_GATES) {
    taken.add(`${g.col},${g.row}`);
    const gp = cellPos(g.col, g.row);
    // A flagstone disc + two lamps mark the gate square inside the wall.
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(cell * 0.34, cell * 0.34, 0.22, 24), mats.stoneDark);
    plaza.position.set(gp.x, flat - 0.02, gp.z);
    group.add(plaza);
    const [dx, dz] = SIDE_D[g.side];
    // Lamps flank the inner side of the gate; a banner-topped post by the arch.
    buildProp(group, world, gp.x - dz * 4, gp.z - dx * 4, flat, 'lamp', mats);
    buildProp(group, world, gp.x + dz * 4, gp.z + dx * 4, flat, 'lamp', mats);
  }

  for (const lot of CAPITAL_LOTS) {
    taken.add(`${lot.col},${lot.row}`);
    const p = cellPos(lot.col, lot.row);
    let facing;
    if (Math.abs(lot.col) > Math.abs(lot.row)) facing = lot.col < 0 ? Math.PI / 2 : -Math.PI / 2;
    else facing = lot.row < 0 ? 0 : Math.PI;
    const inside = buildShop(group, world, p.x, p.z, flat, facing, lot, mats, st);
    interiors.push({ city: c, kind: lot.interiorKey || lot.kind, x: inside.x, z: inside.z, y: flat });
    pois.push({ x: p.x, z: p.z, icon: lot.icon, label: lot.label });
    if (lot.kind === 'market') shopPos = { x: inside.x, z: inside.z };
    if (lot.kind === 'bank')   depotPos = { x: inside.x, z: inside.z };
  }
  shopPos = shopPos || { x: c.x + 12, z: c.z };
  depotPos = depotPos || { x: c.x - 12, z: c.z };

  // Fill the remaining masked cells with varied houses and lush garden lots. Market
  // SQUARES collect their centres so we can drop INTERACTIVE free-market stalls on
  // them afterwards (real stalls players sell on, replacing the old dead props).
  const marketSquares = [];
  for (const { col, row } of CAPITAL_CELLS.list) {
    if (taken.has(`${col},${row}`)) continue;
    const p = cellPos(col, row);
    const seed = (col * 73856093) ^ (row * 19349663);
    const r = ((seed >>> 0) % 1000) / 1000;
    if (r < 0.26) {
      const garden = ['park', 'wellyard', 'market', 'orchard'][(seed >>> 3) % 4];
      buildGardenCell(group, world, p.x, p.z, flat, garden, mats);
      if (garden === 'market') marketSquares.push({ x: p.x, z: p.z });
      continue;
    }
    const big = r > 0.72;
    const w = big ? 9 + (seed % 3) : 6 + (seed % 3);
    const d = big ? 8 + ((seed >> 2) % 3) : 6 + ((seed >> 2) % 2);
    const twoFloor = big || r > 0.5;
    const rot = row < 0 ? 0 : Math.PI;
    buildHouse(group, world, p.x, p.z, flat, {
      w, d, wallH: twoFloor ? 5.6 : 3.4,
      wall: (col + row) % 2 ? mats.wall : mats.wall2,
      roof: (col + row) % 2 ? mats.roof : mats.roof2,
      door: mats.door, glass: mats.glass, wood: mats.wood, awning: mats.awning,
      beam: mats.beam, ridge: mats.ridge, stone: mats.stone,
      rot,
      pitched: st.pitched, solid: true, twoFloor, chimney: r > 0.4,
    });
    // Make the capital's homes buyable too (players spawn here, so the housing
    // feature has to be reachable from the home city, not only the round towns).
    // Same descriptor shape as roundHouseLots; door pos replicates buildHouse
    // (front +z face at d/2, post-rotation). ~30% of the bigger capital homes get
    // a basement for extra value.
    const fx = Math.sin(rot), fz = Math.cos(rot);
    houses.push({
      id: `${c.id}:h${col}_${row}`, city: c.id, x: p.x, z: p.z, y: flat, rot,
      w, d, wallH: twoFloor ? 5.6 : 3.4, twoFloor, floors: twoFloor ? 2 : 1, mansion: big,
      basement: big && ((seed >>> 7) % 10) < 3,
      style: c.style, doorX: p.x + fx * (d / 2 + 0.02), doorZ: p.z + fz * (d / 2 + 0.02),
    });
    const yard = ['flowers', 'bush', 'planter', 'bench'][(seed >>> 5) % 4];
    const front = row < 0 ? 1 : -1;
    buildProp(group, world, p.x - 3, p.z + front * (d / 2 + 2), flat, yard, mats);
    if (r > 0.6) buildProp(group, world, p.x + 3, p.z + front * (d / 2 + 1.8), flat, 'barrel', mats);
  }

  // Street furniture at the corner of every masked cell: trees, lamps, planters,
  // the odd statue — keeps the streetscape full without blocking the avenues.
  for (const { col, row } of CAPITAL_CELLS.list) {
    const x = c.x + (col + 0.5) * cell, z = c.z + (row + 0.5) * cell;
    if (Math.hypot(x - c.x, z - c.z) < cell * 0.7) continue;   // keep plaza clear
    const k = (col * 7 + row * 13 + 100) % 5;
    let kind = k === 0 ? 'statue' : k === 1 ? 'lamp' : k === 2 ? 'tree' : k === 3 ? 'planter' : 'bush';
    // A statue only belongs on a fully-interior corner; on a boundary cell the
    // outskirts belt plants trees just outside the wall and the two would clash,
    // so demote a border-cell statue to a planter.
    const interior = cellInCity(col - 1, row) && cellInCity(col + 1, row) &&
      cellInCity(col, row - 1) && cellInCity(col, row + 1);
    if (kind === 'statue' && !interior) kind = 'planter';
    buildProp(group, world, x, z, flat, kind, mats);
  }

  // Decoration belt + a lamp-lit approach road outside the south gate.
  buildOutskirts(group, world, c.x, c.z, flat, cell, mats);

  // Free-market stalls (the INTERACTIVE ones players sell on) now form a real
  // MARKET in the open-air squares — the garden cells that used to hold dead
  // fruit-stall props. Each square is laid out as a proper bazaar: stalls line the
  // FOUR sides of an open square, all FACING INWARD toward a central aisle, so
  // shoppers must walk INTO the market between the counters. A coin-topped statue
  // and lamps in the middle mark it as a market. stallIds run sequentially across
  // all squares so the DB keys stay unique per city.
  const stalls = [];
  let stallId = 0;
  // If the random masks produced no market square, fall back to one near the hall.
  const squares = marketSquares.length ? marketSquares
    : [{ x: shopPos.x + 16, z: shopPos.z }];
  // Group ADJACENT squares into one market: a lone square is a "mini" market, a
  // cluster of 2+ neighbouring squares is a "big" market. The title shown on a
  // stall reads the cluster size (see openMarketStall).
  const clusters = clusterMarketSquares(squares);
  for (const cluster of clusters) {
    const kind = cluster.length >= 2 ? 'big' : 'mini';
    for (const sq of cluster) {
      stallId = buildMarketSquare(group, world, sq.x, sq.z, flat, mats, stalls, stallId, kind);
    }
  }

  return { interiors, shopPos, depotPos, portalPos, portalMesh: portal.mesh, pois, houses, stalls };
}

// Group market squares that sit next to each other into clusters. Two squares are
// "adjacent" when their centres are within MARKET_ADJ metres (a bit over one grid
// cell). A 1-square cluster is a minimarket; a 2+ cluster is a big market.
const MARKET_ADJ = 30;
function clusterMarketSquares(squares) {
  const clusters = [];
  const used = new Array(squares.length).fill(false);
  for (let i = 0; i < squares.length; i++) {
    if (used[i]) continue;
    const cluster = [squares[i]]; used[i] = true;
    // Flood-fill neighbours (and neighbours of neighbours) into this cluster.
    for (let a = 0; a < cluster.length; a++) {
      for (let j = 0; j < squares.length; j++) {
        if (used[j]) continue;
        if (Math.hypot(cluster[a].x - squares[j].x, cluster[a].z - squares[j].z) <= MARKET_ADJ) {
          cluster.push(squares[j]); used[j] = true;
        }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

// Lay out ONE open-air market square: 12 free-market stalls lining the four sides
// of a square, every counter FACING INWARD toward the central aisle so shoppers
// walk into the market to browse. A coin-topped market statue and lamps mark the
// centre. Appends each stall (with a unique sequential stallId) to `stalls` and
// builds it. Returns the next free stallId.
function buildMarketSquare(group, world, cx, cz, y, mats, stalls, startId, marketKind = 'mini') {
  let stallId = startId;
  const isClear = (x, z) => !(world && world.solidAt && world.solidAt(x, z, 1.6));
  const HALF = 9;          // half-width of the square; stalls sit on its edges
  const PER_SIDE = 3;      // 3 stalls × 4 sides = 12 stalls per market
  const spread = HALF - 1.5;
  // Each side: a fixed coordinate on one axis, the stalls spread along the other,
  // and an inward facing so the counter (local +Z front) points to the centre.
  const sides = [
    { fixed: 'z', at: -HALF, face: 0 },           // north edge, faces +z (inward)
    { fixed: 'z', at: +HALF, face: Math.PI },     // south edge, faces -z
    { fixed: 'x', at: -HALF, face: Math.PI / 2 }, // west edge,  faces +x
    { fixed: 'x', at: +HALF, face: -Math.PI / 2 },// east edge,  faces -x
  ];
  for (const side of sides) {
    for (let i = 0; i < PER_SIDE; i++) {
      const along = (i - (PER_SIDE - 1) / 2) * (spread * 2 / (PER_SIDE - 1 || 1));
      const x = cx + (side.fixed === 'z' ? along : side.at);
      const z = cz + (side.fixed === 'z' ? side.at : along);
      if (!isClear(x, z)) continue;
      // `market` tags whether this stall belongs to a mini or a big market, so the
      // interaction title can read "Minimarket"/"Big Market".
      const s = { stallId: stallId++, x, z, rot: side.face, market: marketKind };
      stalls.push(s);
      group.add(buildStall(s, y, mats, world));
    }
  }
  // The market's centrepiece: a stone statue holding up a giant mm-coin, plus a
  // ring of lamps lighting the aisle and corner planters dressing the square.
  group.add(buildMarketStatue(cx, cz, y, mats));
  world && world.addSolid(cx, cz, 1.0);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    buildProp(group, world, cx + Math.cos(a) * 4.5, cz + Math.sin(a) * 4.5, y, 'lamp', mats);
    buildProp(group, world, cx + Math.cos(a) * (HALF - 0.5), cz + Math.sin(a) * (HALF - 0.5), y, 'planter', mats);
  }
  return stallId;
}

// Coin-denomination colours, matching the game's currency tiers (see COINS in
// data/items.js): bronze → silver → gold → platinum → diamond. The market coin
// atop the statue cycles through these every few seconds; diamond glows brightest.
export const MARKET_COIN_TIERS = [
  { color: 0xcd7f32, glow: 0.25 },   // bronze
  { color: 0xc0c0c0, glow: 0.3 },    // silver
  { color: 0xf1c40f, glow: 0.4 },    // gold
  { color: 0xe5e4e2, glow: 0.5 },    // platinum
  { color: 0x7ec9ff, glow: 0.95 },   // diamond — the top tier, glows the most (blue)
];

// The market centrepiece: a stepped stone pedestal topped by a big mm-coin that
// SPINS and cycles through the currency tiers' colours (animated by the city tick
// via userData.marketCoin). So the square unmistakably reads as a MARKET.
function buildMarketStatue(cx, cz, y, mats) {
  const g = new THREE.Group();
  // Stepped stone base.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 0.5, 16), mats.stone);
  base.position.set(cx, y + 0.25, cz); g.add(base);
  const step = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, 0.4, 16), mats.stoneDark);
  step.position.set(cx, y + 0.7, cz); g.add(step);
  // A tapering column.
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.6, 12), mats.stone);
  col.position.set(cx, y + 2.2, cz); g.add(col);

  // The mm-coin sits on a PIVOT at the top of the column so it can spin in place.
  // Its own material is emissive (so it glows) and is the one the tick recolours.
  const pivot = new THREE.Group();
  pivot.position.set(cx, y + 4.2, cz);
  const t0 = MARKET_COIN_TIERS[0];
  const coinMat = new THREE.MeshStandardMaterial({
    color: t0.color, emissive: t0.color, emissiveIntensity: t0.glow, metalness: 0.7, roughness: 0.35,
  });
  // A thick disc standing UPRIGHT (face toward +Z); spinning the pivot around Y
  // shows both faces, like a coin spinning on its edge.
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.22, 28), coinMat);
  coin.rotation.x = Math.PI / 2; pivot.add(coin);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.1, 10, 28), coinMat);
  pivot.add(rim);
  // Two raised "m" bars stamped on EACH face so it reads as an mm-coin from front
  // and back as it spins. Same emissive material so they glow with the coin.
  for (const zf of [0.12, -0.12]) {
    for (const dx of [-0.3, 0.3]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.05), coinMat);
      m.position.set(dx, 0, zf); pivot.add(m);
    }
    // the little hump that joins the two m-strokes into an "m" pair
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.05), coinMat);
    bridge.position.set(0, 0.2, zf); pivot.add(bridge);
  }
  // A soft point light so the diamond tier visibly lights the square.
  const glow = new THREE.PointLight(t0.color, t0.glow, 9, 1.6);
  pivot.add(glow);

  g.add(pivot);
  // Tagged so the tick can spin the pivot + cycle coinMat/glow through the tiers.
  g.userData.marketCoin = { pivot, mat: coinMat, light: glow };
  return g;
}

// A cell with no house: a themed little open lot full of greenery / props.
function buildGardenCell(group, world, x, z, y, kind, mats) {
  if (kind === 'park') {
    // A small park: trees around a central bench, flowerbeds in the corners.
    buildProp(group, world, x, z, y, 'bench', mats);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.4;
      buildProp(group, world, x + Math.cos(a) * 5, z + Math.sin(a) * 5, y, 'tree', mats);
      buildProp(group, world, x + Math.cos(a + 0.8) * 3.5, z + Math.sin(a + 0.8) * 3.5, y, 'flowers', mats);
    }
  } else if (kind === 'orchard') {
    // Rows of trees with bushes between them.
    for (let r = -1; r <= 1; r++) for (let cI = -1; cI <= 1; cI++) {
      if (r === 0 && cI === 0) { buildProp(group, world, x, z, y, 'well', mats); continue; }
      buildProp(group, world, x + cI * 4.5, z + r * 4.5, y, (r + cI) % 2 ? 'tree' : 'bush', mats);
    }
  } else if (kind === 'market') {
    // An open-air market SQUARE. The actual stalls placed here are the INTERACTIVE
    // free-market stalls (the caller fills MARKET_SQUARE_SLOTS with real ones so
    // players can sell on them) — here we only add the surrounding dressing (a
    // central lamp + a few crates/barrels) so the square reads as a busy market.
    buildProp(group, world, x, z, y, 'lamp', mats);
    buildProp(group, world, x - 4.5, z + 3, y, 'crate', mats);
    buildProp(group, world, x + 4.5, z + 3, y, 'barrel', mats);
  } else { // wellyard
    buildProp(group, world, x, z, y, 'well', mats);
    buildProp(group, world, x - 4, z - 4, y, 'tree', mats);
    buildProp(group, world, x + 4, z + 3, y, 'hay', mats);
    buildProp(group, world, x + 4, z - 4, y, 'flowers', mats);
    buildProp(group, world, x - 4, z + 4, y, 'cart', mats);
  }
}

// Decoration belt OUTSIDE the irregular wall: a band of trees and bushes hugging
// every boundary cell (skipping gate edges), plus a lamp-lit approach road south.
function buildOutskirts(group, world, cx, cz, y, cell, mats) {
  const half = cell / 2, m = 6;        // belt sits ~6m beyond each boundary edge
  for (const { col, row } of CAPITAL_CELLS.list) {
    const ccx = cx + col * cell, ccz = cz + row * cell;
    for (const side of ['N', 'S', 'E', 'W']) {
      const [dx, dz] = SIDE_D[side];
      if (cellInCity(col + dx, row + dz)) continue;
      if (isGate(col, row, side)) continue;          // keep gate approaches open
      // Two pieces of greenery just outside this boundary edge.
      const ex = ccx + dx * (half + m), ez = ccz + dz * (half + m);
      const tx = dz !== 0 ? cell * 0.28 : 0, tz = dx !== 0 ? cell * 0.28 : 0;
      const k = (col * 5 + row * 11) & 3;
      buildProp(group, world, ex - tx, ez - tz, y, k === 0 ? 'bush' : 'tree', mats);
      buildProp(group, world, ex + tx, ez + tz, y, k === 1 ? 'tree' : 'bush', mats);
    }
  }

  // A lamp-lit approach road out of each USABLE gate (south, east, west). Each
  // road runs straight out from the gate, flanked by lamps and trees, dressed
  // with carts/hay/a stall so all three exits feel like real travelled roads.
  for (const g of CAPITAL_GATES) {
    if (g.side === 'N') continue;                  // north gate is decorative (keep)
    const [dx, dz] = SIDE_D[g.side];
    // Gate opening center, just outside the wall.
    const gx = cx + (g.col + dx * 0.5) * cell, gz = cz + (g.row + dz * 0.5) * cell;
    const roadLen = 36;
    const horizontal = dx !== 0;                   // road runs along x (E/W) or z (S/N)
    const road = new THREE.Mesh(
      horizontal ? new THREE.BoxGeometry(roadLen, 0.2, 8) : new THREE.BoxGeometry(8, 0.2, roadLen),
      mats.stone);
    road.position.set(gx + dx * roadLen / 2, y - 0.04, gz + dz * roadLen / 2);
    group.add(road);
    // Perpendicular offset (the road's "sides") for flanking props.
    const px = dz, pz = dx;
    for (let i = 1; i <= 5; i++) {
      const rx = gx + dx * i * (roadLen / 6), rz = gz + dz * i * (roadLen / 6);
      buildProp(group, world, rx - px * 6, rz - pz * 6, y, i % 2 ? 'lamp' : 'tree', mats);
      buildProp(group, world, rx + px * 6, rz + pz * 6, y, i % 2 ? 'tree' : 'lamp', mats);
    }
    // A few road-side details, varied per gate.
    buildProp(group, world, gx + dx * 9 - px * 7.5, gz + dz * 9 - pz * 7.5, y, 'cart', mats);
    buildProp(group, world, gx + dx * 22 + px * 7.5, gz + dz * 22 + pz * 7.5, y, 'hay', mats);
    buildProp(group, world, gx + dx * 31 + px * 7, gz + dz * 31 + pz * 7, y, g.side === 'S' ? 'stall' : 'statue', mats);
    // A grand monument flanking the inside of the gate so the entrance isn't a
    // bare patch of paving — two big obelisks on stepped pedestals either side.
    for (const sgn of [-1, 1]) {
      buildGateMonument(group, world, gx - dx * 7 + px * 6 * sgn, gz - dz * 7 + pz * 6 * sgn, y, mats);
    }
  }
}

// A tall ceremonial monument: a stepped stone pedestal topped by a tapering
// obelisk with a glowing capstone. Big enough to dress an otherwise empty gate
// plaza. Registers a solid so players walk around it.
function buildGateMonument(group, world, x, z, y, mats) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 3.4), mats.stoneDark);
  base.position.set(x, y + 0.25, z);
  const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 2.6), mats.stone);
  step.position.set(x, y + 0.75, z);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.8), mats.stone);
  plinth.position.set(x, y + 1.6, z);
  // Tapering obelisk shaft (a 4-sided cone reads as a stone needle).
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.85, 5.5, 4), mats.stone);
  shaft.position.set(x, y + 4.95, z); shaft.rotation.y = Math.PI / 4;
  // A pyramidion cap that catches the light.
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), mats.gold);
  cap.position.set(x, y + 8.1, z); cap.rotation.y = Math.PI / 4;
  // A dedication band around the plinth.
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 1.9), mats.stoneDark);
  band.position.set(x, y + 1.3, z);
  group.add(base, step, plinth, band, shaft, cap);
  world && world.addSolid(x, z, 1.8);
}

// Gate edges, as { col, row, side } where `side` is the boundary edge of that
// masked cell that opens (N=-z, S=+z, E=+x, W=-x). Each must be a real boundary
// edge (the neighbor in that direction is outside the mask). The south gate by
// the market is the main entrance the spawn/approach-road line up with.
const CAPITAL_GATES = [
  { col: 0, row: 3, side: 'S' },    // main south gate (lines up with the spawn/road)
  { col: 7, row: 0, side: 'E' },    // east gate at the long body's tip
  { col: -7, row: 0, side: 'W' },   // west gate
  { col: 0, row: -3, side: 'N' },   // north gate by the keep
];
const isGate = (col, row, side) => CAPITAL_GATES.some((g) => g.col === col && g.row === row && g.side === side);
// Direction deltas for neighbor lookups.
const SIDE_D = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

// A cobbled paving tile: a subdivided plane whose vertices are nudged and tinted
// per-cobble (with flatShading) so the ground reads as laid stones/bricks with
// real relief instead of one flat colour. One mesh per surface — no extra draw
// calls vs the old flat slab. `seed` keeps a tile's pattern stable across loads.
const _paveMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const _paveColor = new THREE.Color();
function makePaving(w, d, baseHex, seed, density = 0.6) {
  const segX = Math.max(2, Math.round(w * density));
  const segZ = Math.max(2, Math.round(d * density));
  const geo = new THREE.PlaneGeometry(w, d, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const base = new THREE.Color(baseHex);
  const colors = new Float32Array(pos.count * 3);
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < pos.count; i++) {
    // Round each vertex toward a cobble grid and jitter it, so the facets read as
    // chunky individual stones; tint each a touch lighter/darker like worn rock.
    pos.setY(i, (rnd() - 0.5) * 0.12);
    pos.setX(i, pos.getX(i) + (rnd() - 0.5) * 0.18);
    pos.setZ(i, pos.getZ(i) + (rnd() - 0.5) * 0.18);
    const m = 0.82 + rnd() * 0.32;                 // per-stone brightness
    _paveColor.copy(base).multiplyScalar(m);
    colors[i * 3] = _paveColor.r; colors[i * 3 + 1] = _paveColor.g; colors[i * 3 + 2] = _paveColor.b;
  }
  pos.needsUpdate = true;
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, _paveMat);
}

// A small stable hash for seeding paving from a cell's grid coords.
function cellSeed(col, row) { return (((col + 97) * 73856093) ^ ((row + 131) * 19349663)) >>> 0; }

// Paved earth slab under each masked cell (no grass peeks between the blocks).
// A flat base box buries the dirt; a cobbled top layer gives it brick relief.
function buildMaskGround(group, cx, cz, y, cell, mats, st) {
  for (const { col, row } of CAPITAL_CELLS.list) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(cell + 1, 0.3, cell + 1), mats.dirt);
    slab.position.set(cx + col * cell, y - 0.16, cz + row * cell);
    group.add(slab);
    const pave = makePaving(cell + 1, cell + 1, st.stone, cellSeed(col, row), 0.45);
    pave.position.set(cx + col * cell, y - 0.02, cz + row * cell);
    group.add(pave);
  }
}

// Streets along every shared edge between two masked cells, so paving only
// appears inside the city. A darker plaza disc marks the center.
function buildMaskStreets(group, cx, cz, y, cell, street, mats, st) {
  const drawn = new Set();
  for (const { col, row } of CAPITAL_CELLS.list) {
    // Avenue strip on the west edge and cross-street on the north edge of each
    // cell; dedupe so shared edges aren't double-drawn.
    for (const [side, dx, dz] of [['W', -1, 0], ['N', 0, -1], ['E', 1, 0], ['S', 0, 1]]) {
      if (!cellInCity(col + dx, row + dz)) continue;          // only between two inside cells
      const key = [Math.min(col, col + dx), Math.min(row, row + dz), dx === 0 ? 'h' : 'v'].join(',');
      if (drawn.has(key)) continue;
      drawn.add(key);
      const ex = cx + (col + dx * 0.5) * cell, ez = cz + (row + dz * 0.5) * cell;
      // Cobbled street strip sitting just above the ground paving (the lighter
      // stone reads as a swept road). dx===0 means a strip running along x.
      const sw = dx === 0 ? cell : street, sd = dx === 0 ? street : cell;
      const s = makePaving(sw, sd, st.wall, cellSeed(col + 500, row + 500), 0.7);
      s.position.set(ex, y + 0.04, ez);
      group.add(s);
    }
  }
  // The central plaza: a cobbled disc, a touch darker, on a thin base ring.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(cell * 0.62, cell * 0.62, 0.3, 40), mats.stoneDark);
  base.position.set(cx, y - 0.02, cz);
  const disc = makePaving(cell * 1.2, cell * 1.2, st.stone, cellSeed(7, 7), 0.5);
  disc.position.set(cx, y + 0.06, cz);
  // Clip the square paving to the plaza circle by scaling the corners in a touch.
  disc.scale.set(0.92, 1, 0.92);
  group.add(base, disc);
}

// Wall that traces the OUTER boundary of the masked footprint: for every masked
// cell, any side whose neighbor is outside the city gets a wall segment (unless
// it's a gate). Towers rise where boundary edges turn a corner and beside gates.
function buildMaskWall(group, world, cx, cz, y, cell, mats) {
  // FOUND extends the wall below the flat ground so its bottom face is buried
  // instead of sitting exactly on the terrain top — two coplanar faces at the
  // same Y z-fight and flicker as a broken dashed line along the wall base.
  const FOUND = 1.5;
  const H = 4.2, T = 1.2, half = cell / 2;
  const seg = (mx, mz, horizontal, gap) => {
    // One boundary edge centered at (mx,mz). `gap` carves a gate opening.
    const len = cell;
    const pieces = gap
      ? [[-(len / 2), -(len / 2 - (len - 9) / 2)], [(len / 2 - (len - 9) / 2), len / 2]]
      : [[-len / 2, len / 2]];
    for (const [a, b] of pieces) {
      const mid = (a + b) / 2, plen = b - a;
      if (plen < 0.3) continue;
      const wx = horizontal ? mx + mid : mx;
      const wz = horizontal ? mz : mz + mid;
      const geo = horizontal
        ? new THREE.BoxGeometry(plen, H + FOUND, T)
        : new THREE.BoxGeometry(T, H + FOUND, plen);
      const m = new THREE.Mesh(geo, mats.stone);
      // Top stays at y + H; the extra FOUND hangs below ground so the base never
      // sits flush with the terrain (no z-fight).
      m.position.set(wx, y + H / 2 - FOUND / 2, wz);
      group.add(m);
      // Collision: lay a ROW of small circles ALONG the wall piece, each only as
      // wide as the wall is thick — NOT one big circle of radius plen/2. A single
      // circle for a 26m segment bulges its collider ~13m sideways, which reached
      // clear across the gate opening and the exit road and blocked the player on
      // thin air ("colisiones en medio del camino"). Spaced ~T apart so there's no
      // walk-through gap, the colliders now hug the wall's real footprint.
      if (world) {
        const cr = T * 0.6;                 // collider radius ≈ half wall thickness
        const stepN = Math.max(1, Math.round(plen / (T * 0.9)));
        for (let s = 0; s <= stepN; s++) {
          const f = stepN === 0 ? 0.5 : s / stepN;
          const off = a + plen * f;          // along the segment's local axis
          const sx = horizontal ? mx + off : mx;
          const sz = horizontal ? mz : mz + off;
          world.addSolid(sx, sz, cr);
        }
      }
      // A horizontal string-course: a slightly proud, darker stone band partway
      // up the segment so the wall reads as coursed masonry, not one flat slab.
      const courseGeo = horizontal
        ? new THREE.BoxGeometry(plen, 0.4, T + 0.12)
        : new THREE.BoxGeometry(T + 0.12, 0.4, plen);
      const course = new THREE.Mesh(courseGeo, mats.stoneDark);
      course.position.set(wx, y + H * 0.55, wz);
      group.add(course);
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, T), mats.stoneDark);
      tooth.position.set(wx, y + H + 0.2, wz);
      if (!horizontal) tooth.rotation.y = Math.PI / 2;
      group.add(tooth);
    }
  };
  const tower = (tx, tz) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 6.5, 12), mats.stone);
    t.position.set(tx, y + 3.25, tz);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2, 2.3, 12), mats.roof);
    cap.position.set(tx, y + 7.7, tz);
    group.add(t, cap);
    world && world.addSolid(tx, tz, 1.8);
  };
  const towerAt = new Set();
  for (const { col, row } of CAPITAL_CELLS.list) {
    const ccx = cx + col * cell, ccz = cz + row * cell;
    for (const side of ['N', 'S', 'E', 'W']) {
      const [dx, dz] = SIDE_D[side];
      if (cellInCity(col + dx, row + dz)) continue;          // interior edge, skip
      const gate = isGate(col, row, side);
      if (side === 'N') seg(ccx, ccz - half, true, gate);
      else if (side === 'S') seg(ccx, ccz + half, true, gate);
      else if (side === 'E') seg(ccx + half, ccz, false, gate);
      else seg(ccx - half, ccz, false, gate);
      // Tower at each end of a gate, and at convex corners of the footprint.
      if (gate) {
        if (side === 'N' || side === 'S') {
          towerAt.add(`${ccx - 5.5},${side === 'N' ? ccz - half : ccz + half}`);
          towerAt.add(`${ccx + 5.5},${side === 'N' ? ccz - half : ccz + half}`);
        } else {
          towerAt.add(`${side === 'E' ? ccx + half : ccx - half},${ccz - 5.5}`);
          towerAt.add(`${side === 'E' ? ccx + half : ccx - half},${ccz + 5.5}`);
        }
      }
    }
    // A tower on an outside corner (two adjacent sides both boundary).
    const N = !cellInCity(col, row - 1), S = !cellInCity(col, row + 1);
    const E = !cellInCity(col + 1, row), W = !cellInCity(col - 1, row);
    if (N && W) towerAt.add(`${ccx - half},${ccz - half}`);
    if (N && E) towerAt.add(`${ccx + half},${ccz - half}`);
    if (S && W) towerAt.add(`${ccx - half},${ccz + half}`);
    if (S && E) towerAt.add(`${ccx + half},${ccz + half}`);
  }
  for (const key of towerAt) {
    const [tx, tz] = key.split(',').map(Number);
    tower(tx, tz);
  }
}

// Build the per-style material set (shared across one city's buildings).
function makeStyleMats(st) {
  const M = (color, extra) => new THREE.MeshLambertMaterial({ color, ...(extra || {}) });
  // Two darker relief tones, derived by halving each channel (>>1 & 0x7f7f7f)
  // of an existing hex so they read as shadowed timber beams / a roof ridge cap
  // against the flat wall and roof faces. flatShading keeps the facets crisp.
  const darker = (hex) => ((hex >> 1) & 0x7f7f7f);
  return {
    wall: M(st.wall), wall2: M(st.wall2), roof: M(st.roof), roof2: M(st.roof2),
    // Half-timber beam tone (a deep shadowed brown) and a roof-ridge tone (a
    // darker version of the roof) — both flat-shaded so the relief reads.
    beam: M(darker(0x6a4a30), { flatShading: true }),
    ridge: M(darker(st.roof), { flatShading: true }),
    shop: M(0xe0b441), depot: M(0x6a4a2a), stone: M(st.stone), stoneDark: M(st.stone & 0xfefefe),
    temple: M(0xe8e2d0), door: M(0x4a3220), glass: M(0x9fd6e8), wood: M(0x6a4a30),
    water: M(0x3a86c9, { transparent: true, opacity: 0.8 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffd27a }),
    portal: new THREE.MeshBasicMaterial({ color: 0x7e5bef }),
    leaf: M(0x4a8f44), gold: M(0xd9b34a), potionR: M(0xe23b3b), potionB: M(0x3b6be2),
    book: M(0x9a3b3b), metal: M(0x9aa0ab),
    // Extra palette for the grid city: packed-earth between cobbles, an awning
    // green and a warm food/tavern tone.
    dirt: M(0x9c8a63), awning: M(0x4f7a3a), food: M(0xc06a32), cloth: M(0xb44d7a),
  };
}

// The world positions of the two GROUND-FLOOR front windows of a house lot, plus
// the wall height — so the facade shelves can sit just BELOW each real window and
// the name sign can be centred at the top of the front wall. Mirrors the exact
// window-placement math in buildHouse (rows/cols), using the fields the lot record
// carries (w, wallH, floors/twoFloor). Returns { wallH, winY, windows:[{x,z}] }
// in WORLD space. Used by buildFacadeDisplay + buildNameSign in house.js.
export function houseFrontGeometry(lot) {
  const w = lot.w || 5, d = lot.d || 5;
  const rot = lot.rot || 0;
  const floors = Math.max(1, Math.min(3, lot.floors || (lot.twoFloor ? 2 : 1)));
  const wallH = lot.floors ? (lot.wallH || 3.2) * floors : (lot.wallH || 3.2);
  const perFloor = wallH / floors;
  // Ground-floor window row height (matches buildHouse's `rows` for floor 0).
  let winY;
  if (lot.floors) winY = perFloor * 0.6;
  else winY = lot.twoFloor ? wallH * 0.42 : wallH * 0.62;
  // Front normal + side axis (same as buildHouse).
  const fx = Math.sin(rot), fz = Math.cos(rot);
  const sx = Math.cos(rot), sz = -Math.sin(rot);
  const cols = lot.mansion && w > 8 ? [-1, 1] : [-1, 1]; // the two side windows
  const ox = w * (lot.mansion && w > 8 ? 0.32 : 0.28);
  const baseX = lot.x + fx * (d / 2 + 0.02);
  const baseZ = lot.z + fz * (d / 2 + 0.02);
  const windows = cols.map((s) => ({
    x: baseX + sx * (s * ox),
    z: baseZ + sz * (s * ox),
    s,
  }));
  return { wallH, winY, windows, fx, fz, sx, sz, depthOff: d / 2 + 0.02 };
}

// A house: a solid box (or a stacked tower) with a roof, door and windows. Not
// enterable in the mesh, so when `solid` is set it registers collision circles
// over its footprint. Supports SIZE/HEIGHT variety for the bigger round towns:
//   opts.floors  = 1 | 2 | 3   (number of storeys; defaults to twoFloor?2:1 for
//                              backward-compatible capital/district callers)
//   opts.mansion = true        (a grander home — extra collision + a taller roof)
// Per-floor window rows and a cornice band between storeys are generated so a
// 3-story house reads as three real levels, not one tall box.
function buildHouse(group, world, x, z, y, opts = {}) {
  const w = opts.w || 5, d = opts.d || 5;
  const rot = opts.rot || 0;
  // Floors: explicit `floors` wins; else fall back to the old twoFloor flag (so
  // every existing capital/district call renders exactly as before).
  const floors = Math.max(1, Math.min(3, opts.floors || (opts.twoFloor ? 2 : 1)));
  // Height contract (kept backward-compatible):
  //  - NEW callers pass `floors` + a PER-FLOOR `wallH`; total = perFloor*floors.
  //  - OLD callers (capital/districts) pass `wallH` as the TOTAL body height (or
  //    nothing), with no `floors` field; we keep that total and derive perFloor
  //    so per-storey windows/cornices still place correctly.
  const wallH = opts.floors ? (opts.wallH || 3.2) * floors : (opts.wallH || 3.2);
  const perFloor = wallH / floors;   // one storey's height
  // Relief tones: a dark timber beam and a roof-ridge cap. Fall back to the
  // wall/roof tones for callers that don't pass the dedicated relief mats.
  const beamMat = opts.beam || opts.wood || opts.door || opts.roof;
  const ridgeMat = opts.ridge || opts.roof;
  const corniceMat = opts.stoneDark || opts.stone || ridgeMat;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), opts.wall);
  wall.position.set(x, y + wallH / 2, z);
  wall.rotation.y = rot;
  const pitched = opts.pitched !== false;
  const roofH = pitched ? (opts.mansion ? 2.8 : 2.2) : 0.5;
  const roof = pitched
    ? new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.8, roofH, 4), opts.roof)
    : new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), opts.roof);
  roof.position.set(x, y + wallH + (pitched ? roofH / 2 : 0.25), z);
  roof.rotation.y = rot + (pitched ? Math.PI / 4 : 0);
  group.add(wall, roof);
  // Collision: a single circle leaves the rectangular footprint's CORNERS open
  // (a box reaches hypot(w/2,d/2) at the corner, past a radius of max/2), which is
  // how players slipped through house corners. Instead, tile the whole footprint
  // with a grid of small overlapping circles so every corner and edge is solid.
  if (opts.solid && world) {
    const sxw = Math.cos(rot), szw = -Math.sin(rot);   // side axis (along width = w)
    const fxw = Math.sin(rot), fzw = Math.cos(rot);    // front axis (along depth = d)
    const cr = 0.95;                                    // per-cell collision radius
    const nx = Math.max(1, Math.round(w / (cr * 1.5))); // cells across width
    const nz = Math.max(1, Math.round(d / (cr * 1.5))); // cells across depth
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        const lw = (nx === 1) ? 0 : (ix / (nx - 1) - 0.5) * (w - cr);   // -w/2..+w/2 inset by radius
        const ld = (nz === 1) ? 0 : (iz / (nz - 1) - 0.5) * (d - cr);
        world.addSolid(x + sxw * lw + fxw * ld, z + szw * lw + fzw * ld, cr);
      }
    }
  }

  // Local axes shared by every relief piece below: front normal + side axis.
  const fx = Math.sin(rot), fz = Math.cos(rot);   // front normal
  const sx = Math.cos(rot), sz = -Math.sin(rot);  // side axis
  // Drop a rotated box at a local (along-side, along-front, up) offset.
  const piece = (lx, ly, lz, gx, gy, gz, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(gx, gy, gz), mat);
    m.position.set(x + sx * lx + fx * lz, y + ly, z + sz * lx + fz * lz);
    m.rotation.y = rot;
    group.add(m);
    return m;
  };

  // Stone foundation/plinth: a slightly wider, short box at the base so the
  // house grows out of solid ground instead of floating on the dirt.
  piece(0, 0.25, 0, w + 0.5, 0.5, d + 0.5, opts.stone || opts.door || beamMat);

  // Half-timber frame: dark beams up the two front wall corners running the full
  // height. Kept to a few thin front-facing boxes so houses stay cheap in bulk.
  for (const s of [-1, 1]) {
    piece(s * (w / 2 - 0.1), wallH / 2, d / 2 - 0.05, 0.2, wallH, 0.12, beamMat); // front corner posts
  }
  // NEW multistory homes (round towns, which pass `floors`) get a stone cornice
  // band at every floor line so the storeys read as separate masonry courses.
  // OLD callers (capital/districts) keep the original single timber mid-band so
  // they render exactly as before.
  if (opts.floors && floors > 1) {
    for (let f = 1; f < floors; f++) {
      piece(0, perFloor * f, d / 2 - 0.04, w + 0.3, 0.24, 0.18, corniceMat);
    }
  } else {
    piece(0, wallH * 0.5, d / 2 - 0.04, w, 0.22, 0.14, beamMat);
  }

  if (pitched) {
    // A thin overhang eave just under the pyramid roof (a flat box a touch wider
    // than the walls), then a finial knob capping the apex (a 4-sided cone is a
    // point, not a ridge, so a knob reads better than a ridge bar would).
    piece(0, wallH + 0.1, 0, w + 0.7, 0.18, d + 0.7, ridgeMat);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), ridgeMat);
    finial.position.set(x, y + wallH + roofH + 0.1, z);
    group.add(finial);
  } else {
    // Flat roof: a thin parapet rim around all four edges.
    piece(0, wallH + 0.55, d / 2 + 0.15, w + 0.5, 0.5, 0.16, ridgeMat);
    piece(0, wallH + 0.55, -(d / 2 + 0.15), w + 0.5, 0.5, 0.16, ridgeMat);
    piece(w / 2 + 0.15, wallH + 0.55, 0, 0.16, 0.5, d + 0.5, ridgeMat);
    piece(-(w / 2 + 0.15), wallH + 0.55, 0, 0.16, 0.5, d + 0.5, ridgeMat);
  }

  // Door and windows sit on the front face (+z before rotation).
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.1), opts.door);
  door.position.set(x + fx * (d / 2 + 0.02), y + 0.85, z + fz * (d / 2 + 0.02));
  door.rotation.y = rot;
  group.add(door);
  // A simple timber door frame: two jambs and a lintel around the doorway.
  piece(0, 1.78, d / 2 + 0.05, 1.2, 0.16, 0.1, beamMat);          // lintel
  for (const s of [-1, 1]) piece(s * 0.55, 0.9, d / 2 + 0.05, 0.14, 1.7, 0.1, beamMat); // jambs

  // Window rows: NEW multistory homes get one row per storey (mid-floor). OLD
  // callers keep the exact original placement (one band, or the 0.42/0.78 split
  // for twoFloor) so the capital/districts are pixel-for-pixel unchanged.
  let rows;
  if (opts.floors) {
    rows = [];
    for (let f = 0; f < floors; f++) rows.push(perFloor * f + perFloor * 0.6);
  } else {
    rows = opts.twoFloor ? [wallH * 0.42, wallH * 0.78] : [wallH * 0.62];
  }
  const cols = opts.mansion && w > 8 ? [-1, 0, 1] : [-1, 1];
  for (const wy of rows) {
    for (const s of cols) {
      if (s === 0 && wy < perFloor) continue;            // ground-floor centre is the door
      const ox = s * (w * (cols.length > 2 ? 0.32 : 0.28));
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.08), opts.glass);
      win.position.set(
        x + fx * (d / 2 + 0.02) + sx * ox,
        y + wy,
        z + fz * (d / 2 + 0.02) + sz * ox);
      win.rotation.y = rot;
      group.add(win);
      // Muntins: a cross of thin beams over the pane that splits it into four
      // lights, plus a sill + lintel, so the window reads framed and recessed.
      const wox = sx * ox, woz = sz * ox;
      const mull = (mw, mh) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(mw, mh, 0.1), beamMat);
        b.position.set(x + fx * (d / 2 + 0.05) + wox, y + wy, z + fz * (d / 2 + 0.05) + woz);
        b.rotation.y = rot; group.add(b);
      };
      mull(0.08, 0.86); mull(0.86, 0.08);                 // vertical + horizontal bar
      piece(ox, wy - 0.5, d / 2 + 0.04, 0.96, 0.1, 0.12, beamMat);  // sill
      piece(ox, wy + 0.5, d / 2 + 0.04, 0.96, 0.1, 0.1, beamMat);   // lintel
      // Shutters on the outer side of each pane for a Tibian timbered look.
      if (s !== 0) piece(s * (w * 0.28 + 0.55), wy, d / 2 + 0.03, 0.34, 0.9, 0.06, beamMat);
    }
  }
  // A small awning over the door (uses the wood tone if provided).
  if (opts.awning && opts.wood) {
    const aw = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.7), opts.awning);
    aw.position.set(x + fx * (d / 2 + 0.4), y + 1.9, z + fz * (d / 2 + 0.4));
    aw.rotation.y = rot; aw.rotation.x = 0.18;
    group.add(aw);
  }
  // A brick chimney with a wisp of a cap on bigger homes.
  if (opts.chimney) {
    const cx = x + sx * (w * 0.3), cz = z + sz * (w * 0.3);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), opts.roof);
    ch.position.set(cx, y + wallH + 1.2, cz); ch.rotation.y = rot;
    group.add(ch);
  }
}

// A two-floor town hall: stacked stone blocks, a clock-tower-ish roof and a sign.
function buildTownHall(group, world, x, z, y, mats) {
  // A wider, short stone plinth so the hall stands on a proud base.
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.8, 7.8), mats.stone);
  plinth.position.set(x, y + 0.4, z);
  const ground = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 7), mats.wall);
  ground.position.set(x, y + 2.8, z);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 5.4), mats.wall2);
  upper.position.set(x, y + 6.5, z);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3, 4), mats.roof2);
  roof.position.set(x, y + 9.7, z);
  roof.rotation.y = Math.PI / 4;
  group.add(plinth, ground, upper, roof);
  if (world) world.addSolid(x, z, 4.4);

  // A stone cornice band between the two floors, slightly proud of both, so the
  // storeys read as separate masonry courses.
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.6, 7.4), mats.stoneDark);
  cornice.position.set(x, y + 4.9, z);
  group.add(cornice);
  // Corner pilasters: four thin stone verticals at the ground-floor corners.
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4, 0.55), mats.stone);
    pil.position.set(x + dx * 4.35, y + 2.8, z + dz * 3.35);
    group.add(pil);
  }
  // A ridge cap along the pyramidal roof's apex (a thin long box) so the peak
  // reads as a crowned ridge rather than a bare point.
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.3, 0.4), mats.ridge);
  ridge.position.set(x, y + 9.1, z); ridge.rotation.y = Math.PI / 4;
  group.add(ridge);

  // Tall double doors and a row of windows on the ground floor.
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.12), mats.door);
  door.position.set(x, y + 1.3, z + 3.55);
  group.add(door);
  for (let i = -1; i <= 1; i += 2) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.1), mats.glass);
    win.position.set(x + i * 2.6, y + 2.6, z + 3.55);
    group.add(win);
    const winU = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), mats.glass);
    winU.position.set(x + i * 1.8, y + 5.8, z + 2.75);
    group.add(winU);
  }
  // Flag poles flanking the entrance.
  for (const s of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), mats.wood);
    pole.position.set(x + s * 3.6, y + 2, z + 3.4);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.06), mats.roof);
    flag.position.set(x + s * 3.15, y + 3.6, z + 3.4);
    group.add(pole, flag);
  }
}

// Round towns now open all FOUR cardinal gates (north, south, east, west)
// instead of one, so every town has plenty of clearly-marked ways out — the user
// asked for ≥3 exits shown on the map. These are the bearings the wall leaves
// open and that cityGates() reports for the map markers. Math.PI*1.5 points to
// -Z (the top of the map = north), where the spawn sits, so that gate is the one
// the player arrives at.
const ROUND_GATE_BEARINGS = [Math.PI * 1.5, Math.PI * 0.5, 0, Math.PI];  // N, S, E, W
// How close (in radians) a bearing must be to a gate bearing to count as "on a
// gate" — used to leave wall gaps, clear the tree ring, and place gate towers.
const GATE_HALF_ANGLE = 0.18;
function nearAnyGate(a, bearings = ROUND_GATE_BEARINGS, half = GATE_HALF_ANGLE) {
  for (const g of bearings) {
    if (Math.abs(((a - g + Math.PI) % (Math.PI * 2)) - Math.PI) < half) return true;
  }
  return false;
}

// The SINGLE source of truth for which polygon edges a shaped town opens as
// gates — used by BOTH the wall builder (where to leave a gap) and cityGates()
// (where to put roads, guards, heal statues and map markers), so they can never
// drift apart. Picks the edge nearest each cardinal bearing; then, if that
// collapsed to fewer than 3 distinct edges (an axis-aligned square maps all four
// cardinals onto just two diagonal edges, which left Frostpeak with only two
// gates — both north), it opens the remaining widest edges until there are at
// least min(3, edgeCount) gates, so every town has a proper spread of exits.
function gateEdgesFor(pts, cx, cz) {
  const n = pts.length;
  const edgeBearing = (i) => Math.atan2(
    (pts[i].z + pts[(i + 1) % n].z) / 2 - cz,
    (pts[i].x + pts[(i + 1) % n].x) / 2 - cx);
  const gateEdges = new Set();
  for (const gA of ROUND_GATE_BEARINGS) {
    let edge = 0, bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(((edgeBearing(i) - gA + Math.PI) % (Math.PI * 2)) - Math.PI);
      if (d < bestD) { bestD = d; edge = i; }
    }
    gateEdges.add(edge);
  }
  // Guarantee at least 3 exits (or all edges, if the shape has fewer): add the
  // not-yet-open edges most evenly spaced from the ones already chosen.
  const want = Math.min(3, n);
  while (gateEdges.size < want) {
    let best = -1, bestSpread = -1;
    for (let i = 0; i < n; i++) {
      if (gateEdges.has(i)) continue;
      // Prefer the candidate whose bearing is farthest from every open gate.
      let nearest = Infinity;
      for (const j of gateEdges) {
        const d = Math.abs(((edgeBearing(i) - edgeBearing(j) + Math.PI) % (Math.PI * 2)) - Math.PI);
        if (d < nearest) nearest = d;
      }
      if (nearest > bestSpread) { bestSpread = nearest; best = i; }
    }
    if (best < 0) break;
    gateEdges.add(best);
  }
  return gateEdges;
}

// World-space gate points for a city, for the map to mark its exits. Round towns
// report their four cardinal gates on the wall; the grid capital reports its
// three usable gates (south, east, west — the north gate is a decorative keep
// arch). Either way every city shows at least three marked ways out.
// Map features for drawing a Tibia-style city on the minimap: the blocks of
// houses and the street grid between them. World-space rects {x,z,w,d}. The
// capital returns its real cell grid (a house block per masked cell + a street
// strip on every shared edge); round towns return a plaza + radial avenues.
// Cached per city id since the layout is static.
const _cityFeatureCache = new Map();
export function cityMapFeatures(city) {
  if (_cityFeatureCache.has(city.id)) return _cityFeatureCache.get(city.id);
  const st = styleFor(city);
  const buildings = [], roads = [];
  if (st.grid) {
    const cell = GRID.cell, street = GRID.street;
    const block = cell - street;                 // the built part of a cell
    for (const { col, row } of CAPITAL_CELLS.list) {
      const cx = city.x + col * cell, cz = city.z + row * cell;
      buildings.push({ x: cx, z: cz, w: block, d: block });
      // Street strip on the shared edge with an inside neighbour (dedupe via E/S only).
      if (cellInCity(col + 1, row)) roads.push({ x: cx + cell / 2, z: cz, w: street, d: cell });
      if (cellInCity(col, row + 1)) roads.push({ x: cx, z: cz + cell / 2, w: cell, d: street });
    }
  } else {
    // Round town: same layout the builder uses, so the map matches the real town
    // as closely as the capital does — a central plaza, radial avenues out to the
    // districts and gates, and the TWO concentric rings of houses (identical radii
    // and counts to buildRoundCity), with the gate corridors left clear.
    const R = st.radius;
    roads.push({ x: city.x, z: city.z, w: Math.max(30, R * 0.6), d: Math.max(30, R * 0.6), round: true });
    const ends = [...DISTRICTS.map((d) => d.angle), 0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    for (const a of ends) {
      const len = R - 4;
      roads.push({ x: city.x + Math.cos(a) * (len / 2 + 4), z: city.z + Math.sin(a) * (len / 2 + 4), w: 5, d: len, rot: a });
    }
    // District buildings (bank, food, knight…) as bigger blocks.
    for (const dist of DISTRICTS) {
      const dd = R * dist.distF;
      buildings.push({ x: city.x + Math.cos(dist.angle) * dd, z: city.z + Math.sin(dist.angle) * dd, w: 9, d: 9 });
    }
    // Every house lot, drawn from the SAME plan buildRoundCity uses (3-4 rings,
    // mansion/multistory sizes, gate corridors cleared), so the map footprints
    // match the real town exactly.
    for (const L of roundHouseLots(city, R)) {
      buildings.push({ x: L.x, z: L.z, w: L.w, d: L.d });
    }
    // Town hall block just north of the plaza.
    buildings.push({ x: city.x, z: city.z + 18, w: 9, d: 7 });
  }
  const out = { buildings, roads };
  _cityFeatureCache.set(city.id, out);
  return out;
}

export function cityGates(city) {
  const st = styleFor(city);
  if (st.grid) {
    const cell = GRID.cell;
    return CAPITAL_GATES.filter((g) => g.side !== 'N').map((g) => {
      const [dx, dz] = SIDE_D[g.side];
      return { x: city.x + (g.col + dx * 0.5) * cell, z: city.z + (g.row + dz * 0.5) * cell };
    });
  }
  // Shaped round towns: the wall (buildWall) opens a gap in the MIDDLE of the
  // polygon edge nearest each cardinal bearing — NOT at the cardinal bearing
  // itself. A diamond/rectangle has its edges on the diagonals, so a gate sits at
  // an edge midpoint that can be ~45° away from the cardinal. Return those exact
  // edge midpoints so heal statues, gate guards and the map markers all land in
  // the REAL openings (the old cardinal-bearing points missed the gaps entirely,
  // leaving Frostpeak's exits with no statue or guards). Dedupe by edge so two
  // cardinals that pick the same edge (e.g. the diamond's N & W) yield ONE gate,
  // matching the wall's gateEdges Set.
  const cx = city.x, cz = city.z;
  const pts = townPolygon(cx, cz, st.radius - 3, st.shape);
  const n = pts.length;
  const gateEdges = gateEdgesFor(pts, cx, cz);
  return [...gateEdges].map((i) => ({
    x: (pts[i].x + pts[(i + 1) % n].x) / 2,
    z: (pts[i].z + pts[(i + 1) % n].z) / 2,
  }));
}

// A stone wall around the town. When `shape` is given the wall traces a POLYGON
// (straight runs of stone between corner towers — so the desert city is a hard
// rectangle, the frost town a diamond, etc.); otherwise it falls back to the old
// circular ring. Either way it's solid, with the four cardinal gates left open
// (N, S, E, W), and the shape matches what the map outline and in-city test use.
function buildWall(group, world, cx, cz, y, radius, mats, shape) {
  if (shape) {
    // Polygon wall: build each edge as a row of short wall blocks between the
    // shape's corners (with a tower at every corner), leaving a gate gap on the
    // edges nearest the four cardinals so the town has a way out each direction.
    const pts = townPolygon(cx, cz, radius, shape);
    const n = pts.length;
    // Open the SAME edges cityGates() reports, so the gaps in the wall line up
    // exactly with the roads, guards, heal statues and map markers.
    const gateEdges = gateEdgesFor(pts, cx, cz);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const ex = b.x - a.x, ez = b.z - a.z;
      const len = Math.hypot(ex, ez);
      const rot = Math.atan2(ez, ex);
      const blocks = Math.max(2, Math.round(len / 4));
      for (let k = 0; k < blocks; k++) {
        const t0 = k / blocks, t1 = (k + 1) / blocks, tm = (t0 + t1) / 2;
        // Leave a gap in the middle of every gate edge.
        if (gateEdges.has(i) && tm > 0.38 && tm < 0.62) continue;
        const wx = a.x + ex * tm, wz = a.z + ez * tm;
        // 3.6 tall wall + a 1.5 buried foundation so the base never sits coplanar
        // with the ground (that coplanarity is the flickering base line).
        const blockLen = len / blocks * 1.04;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(blockLen, 5.1, 1.2), mats.stone);
        seg.position.set(wx, y + 1.05, wz);
        seg.rotation.y = -rot;
        group.add(seg);
        if (world) world.addSolid(wx, wz, (len / blocks) * 0.55);
        // A proud, darker string-course band across each block — coursed-masonry
        // relief without per-brick boxes (one extra mesh per block).
        const course = new THREE.Mesh(new THREE.BoxGeometry(blockLen, 0.4, 1.32), mats.stoneDark);
        course.position.set(wx, y + 2.6, wz); course.rotation.y = -rot;
        group.add(course);
        if (k % 2 === 0) {
          // Merlons (battlement teeth) with slightly varied heights so the crest
          // reads as hand-laid stone rather than a ruler-straight line.
          const mh = 0.7 + (k % 4) * 0.12;
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.6, mh, 1.2), mats.stoneDark);
          tooth.position.set(wx, y + 3.55 + mh / 2, wz); tooth.rotation.y = -rot;
          group.add(tooth);
        }
      }
      // Corner tower.
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 6, 10), mats.stone);
      tower.position.set(a.x, y + 3, a.z);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.0, 2.2, 10), mats.roof);
      cap.position.set(a.x, y + 7.1, a.z);
      group.add(tower, cap);
      if (world) world.addSolid(a.x, a.z, 1.9);
    }
    return;
  }

  // --- Legacy circular ring (kept for any unshaped town) ---
  const segs = Math.max(40, Math.round(radius * 0.9));
  const gateHalf = 0.16;
  const segLen = (2 * Math.PI * radius) / segs * 1.05;
  // 3.4 tall + 1.5 buried foundation (top stays at y+3.4) so the base isn't
  // coplanar with the ground and doesn't z-fight into a flickering line.
  const segGeo = new THREE.BoxGeometry(segLen, 4.9, 1.1);
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    if (nearAnyGate(a, ROUND_GATE_BEARINGS, gateHalf)) continue;   // leave each gate open
    const wx = cx + Math.cos(a) * radius;
    const wz = cz + Math.sin(a) * radius;
    const seg = new THREE.Mesh(segGeo, mats.stone);
    seg.position.set(wx, y + 0.95, wz);
    seg.rotation.y = -a + Math.PI / 2;
    group.add(seg);
    if (world) world.addSolid(wx, wz, segLen * 0.5);
    if (i % 2 === 0) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.1), mats.stoneDark);
      tooth.position.set(wx, y + 3.7, wz);
      tooth.rotation.y = -a + Math.PI / 2;
      group.add(tooth);
    }
  }
  // Gate towers flanking each of the three openings.
  for (const gateA of ROUND_GATE_BEARINGS) {
    for (const s of [-1, 1]) {
      const a = gateA + s * (gateHalf + 0.08);
      const tx = cx + Math.cos(a) * radius;
      const tz = cz + Math.sin(a) * radius;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 5, 10), mats.stone);
      tower.position.set(tx, y + 2.5, tz);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.8, 10), mats.roof);
      cap.position.set(tx, y + 5.9, tz);
      group.add(tower, cap);
    }
  }
}

// Paved plaza and radial streets out to each district, scaled to the city size.
function buildStreets(group, cx, cz, y, R, mats, st) {
  const stoneHex = (st && st.stone) || 0xb9b2a2;
  const wallHex = (st && st.wall) || 0xcdb892;
  const plazaR = Math.max(15, R * 0.3);
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(plazaR, plazaR, 0.3, 40), mats.stone);
  plaza.position.set(cx, y - 0.1, cz);
  group.add(plaza);
  // Cobbled plaza top with brick relief, plus a darker inner ring.
  const pave = makePaving(plazaR * 1.7, plazaR * 1.7, stoneHex, cellSeed(11, 11), 0.4);
  pave.position.set(cx, y + 0.06, cz); pave.scale.set(0.83, 1, 0.83);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(plazaR * 0.45, plazaR * 0.45, 0.32, 40), mats.stoneDark);
  inner.position.set(cx, y + 0.08, cz);
  group.add(pave, inner);
  // Streets fan out to each district plus the cardinal directions.
  const ends = [...DISTRICTS.map((d) => d.angle), 0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  for (const a of ends) {
    const len = R - 4;
    const street = makePaving(5, len, wallHex, cellSeed(Math.round(a * 10), 3), 0.7);
    street.position.set(cx + Math.cos(a) * (len / 2 + 4), y + 0.04, cz + Math.sin(a) * (len / 2 + 4));
    street.rotation.y = -a;
    group.add(street);
  }
}

// One district: a big enterable themed building (with an NPC walking inside) plus
// a couple of houses and decoration. Returns the interior center {x,z} so the
// matching vendor NPC can be placed to roam inside.
function buildDistrict(group, world, x, z, y, facing, key, mats, st) {
  const inside = buildEnterable(group, world, x, z, y, facing, key, mats, st);

  // A house or two flanking the main building so the district reads fuller.
  const sx = Math.cos(facing), sz = -Math.sin(facing);
  buildHouse(group, world, x + sx * 11, z + sz * 11, y, {
    w: 4.5, d: 4.5, wall: mats.wall, roof: mats.roof, door: mats.door, glass: mats.glass,
    beam: mats.beam, ridge: mats.ridge, stone: mats.stone, wood: mats.wood,
    rot: facing, pitched: st.pitched, solid: true,
  });
  buildHouse(group, world, x - sx * 11, z - sz * 11, y, {
    w: 4.5, d: 4.5, wall: mats.wall2, roof: mats.roof2, door: mats.door, glass: mats.glass,
    beam: mats.beam, ridge: mats.ridge, stone: mats.stone, wood: mats.wood,
    rot: facing, pitched: st.pitched, solid: true,
  });

  // Street decoration in front of the building.
  buildProp(group, world, x + Math.sin(facing) * 5.5 + sx * 2, z + Math.cos(facing) * 5.5 + sz * 2, y, 'crate', mats);
  buildProp(group, world, x + Math.sin(facing) * 5.5 - sx * 2, z + Math.cos(facing) * 5.5 - sz * 2, y, 'barrel', mats);
  return inside;
}

// Wall / sign / decor palette per shop trade. Used by buildShop so each named
// capital building reads as its trade from the street and from inside.
// A flat nameplate that reads the building's name in big letters, mounted on the
// facade above the door so players can tell each shop apart at a glance. Drawn
// once into a CanvasTexture (like the NPC name tags) and oriented to the wall —
// a fixed sign, not a billboard. `facing` is the building's facade heading; the
// caller positions it just in front of the wall.
function makeSignText(label, facing) {
  const text = String(label || '').toUpperCase();
  const fontPx = 64, padX = 36, padY = 20;
  const c = document.createElement('canvas');
  let ctx = c.getContext('2d');
  ctx.font = `900 ${fontPx}px system-ui, sans-serif`;
  const tw = Math.ceil(ctx.measureText(text).width);
  c.width = Math.max(64, tw + padX * 2);
  c.height = fontPx + padY * 2;
  ctx = c.getContext('2d');
  // Carved-wood plaque: dark board, gold lettering with a black outline.
  ctx.fillStyle = 'rgba(28,20,10,0.92)';
  roundRect(ctx, 2, 2, c.width - 4, c.height - 4, 14); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  roundRect(ctx, 4, 4, c.width - 8, c.height - 8, 12); ctx.stroke();
  ctx.font = `900 ${fontPx}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.strokeText(text, c.width / 2, c.height / 2 + 2);
  ctx.fillStyle = '#f2d27a';
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const aspect = c.width / c.height;
  const h = 0.95, w = h * aspect;          // ~1m tall plate, width follows the text
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  mesh.rotation.y = facing;
  return mesh;
}

// Small rounded-rect path helper for canvas plaques.
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const SHOP_LOOK = {
  bank:     { wall: 'stone', sign: 'gold',    decor: 'bank' },
  market:   { wall: 'shop',  sign: 'gold',    decor: 'market' },
  potion:   { wall: 'wall2', sign: 'potionR', decor: 'potion' },
  food:     { wall: 'food',  sign: 'awning',  decor: 'food' },
  knight:   { wall: 'stone', sign: 'metal',   decor: 'knight' },
  archer:   { wall: 'wall',  sign: 'leaf',    decor: 'archer' },
  mage:     { wall: 'glass', sign: 'portal',  decor: 'mage' },
  bag:      { wall: 'cloth', sign: 'cloth',   decor: 'bag' },
  townhall: { wall: 'temple',sign: 'roof',    decor: 'townhall' },
  library:  { wall: 'wall',  sign: 'book',    decor: 'library' },
  temple2:  { wall: 'stone', sign: 'metal',   decor: 'keep' },
  tavern:   { wall: 'food',  sign: 'awning',  decor: 'tavern' },
  jeweler:  { wall: 'wall2', sign: 'portal',  decor: 'jeweler' },
  stable:   { wall: 'food',  sign: 'awning',  decor: 'stable' },   // timber barn look
};

// A named capital building you can walk into. Generalizes buildEnterable: bigger
// footprint for `lot.big`, a spire for `lot.tower` (mage), trade-specific wall
// color, sign and interior. Returns the interior center {x,z} (NPC roams here).
function buildShop(group, world, x, z, y, facing, lot, mats, st) {
  const look = SHOP_LOOK[lot.kind] || SHOP_LOOK.market;
  const W = lot.big ? 15 : 12, D = lot.big ? 14 : 12, H = lot.big ? 5.4 : 4.4, T = 0.6;
  const wallMat = mats[look.wall] || mats.shop;
  const fx = Math.sin(facing), fz = Math.cos(facing);
  const sx = Math.cos(facing), sz = -Math.sin(facing);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), mats.stone);
  floor.position.set(x, y + 0.1, z); floor.rotation.y = facing;
  group.add(floor);

  const wallSeg = (lx, lz, ww, dd) => {
    const wx = x + sx * lx + fx * lz;
    const wz = z + sz * lx + fz * lz;
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww, H, dd), wallMat);
    m.position.set(wx, y + H / 2, wz); m.rotation.y = facing;
    group.add(m);
    const span = Math.max(ww, dd);
    const along = ww >= dd;
    const n = Math.max(1, Math.round(span / 1.2));
    for (let i = 0; i < n; i++) {
      const o = (n === 1) ? 0 : (i / (n - 1) - 0.5) * span;
      const ox = along ? o : 0, oz = along ? 0 : o;
      world && world.addSolid(wx + sx * ox + fx * oz, wz + sz * ox + fz * oz, 0.6);
    }
  };

  const doorGap = 3;
  const sidePiece = (W - doorGap) / 2;
  wallSeg(-(doorGap / 2 + sidePiece / 2), D / 2, sidePiece, T);
  wallSeg(+(doorGap / 2 + sidePiece / 2), D / 2, sidePiece, T);
  wallSeg(0, -D / 2, W, T);
  wallSeg(-W / 2, 0, T, D);
  wallSeg(+W / 2, 0, T, D);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorGap + 0.4, 0.7, T), wallMat);
  lintel.position.set(x + fx * (D / 2), y + H - 0.35, z + fz * (D / 2));
  lintel.rotation.y = facing;
  group.add(lintel);

  // Roof: pitched gable for most, a tall spire for the mage tower.
  if (lot.tower) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.34, W * 0.4, 5, 12), wallMat);
    drum.position.set(x, y + H + 2.5, z);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(W * 0.4, 6, 12), mats.roof);
    spire.position.set(x, y + H + 8, z);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), mats.portal);
    orb.position.set(x, y + H + 11.4, z);
    group.add(drum, spire, orb);
  } else {
    const roof = st.pitched
      ? new THREE.Mesh(new THREE.ConeGeometry(W * 0.75, 3.4, 4), mats.roof)
      : new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.6, D + 0.6), mats.roof);
    roof.position.set(x, y + H + (st.pitched ? 1.5 : 0.3), z);
    roof.rotation.y = facing + (st.pitched ? Math.PI / 4 : 0);
    group.add(roof);
  }

  // Hanging trade sign over the door, dressed with relief: a board on a bracket
  // arm, a dark frame around the rim and a round trade emblem on its face.
  const sgx = x + fx * (D / 2 + 0.4), sgz = z + fz * (D / 2 + 0.4), sgy = y + 3.1;
  const signMatV = mats[look.sign] || mats.gold;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 0.14), signMatV);
  sign.position.set(sgx, sgy, sgz); sign.rotation.y = facing;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 0.1), mats.wood);
  frame.position.set(sgx - fx * 0.04, sgy, sgz - fz * 0.04); frame.rotation.y = facing;
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), mats.stoneDark);
  emblem.position.set(sgx + fx * 0.1, sgy, sgz + fz * 0.1);
  emblem.rotation.y = facing; emblem.rotation.x = Math.PI / 2;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.8), mats.wood);
  arm.position.set(sgx - fx * 0.45, sgy + 0.75, sgz - fz * 0.45); arm.rotation.y = facing;
  group.add(frame, sign, emblem, arm);

  // Big nameplate on the facade above the door, so each building shows its name.
  if (lot.label) {
    const plate = makeSignText(lot.label, facing);
    plate.position.set(x + fx * (D / 2 + 0.05), y + H - 0.4, z + fz * (D / 2 + 0.05));
    group.add(plate);
  }

  // Two lamp posts flanking the entrance + a couple of crates/barrels outside.
  buildProp(group, world, x + fx * (D / 2 + 2.5) + sx * 2.6, z + fz * (D / 2 + 2.5) + sz * 2.6, y, 'lamp', mats);
  buildProp(group, world, x + fx * (D / 2 + 2.5) - sx * 2.6, z + fz * (D / 2 + 2.5) - sz * 2.6, y, 'lamp', mats);

  // Themed storefront details so the building reads as this vendor's shop, not a
  // plain green-roofed house.
  decorateShopExterior(group, world, x, z, y, facing, look.decor, mats, W, D, H);

  decorateInterior(group, x, z, y, facing, look.decor, mats);
  return { x, z };
}

// A big building you can walk into: four solid walls with a doorway gap on the
// front face, an open interior with themed decor and a counter the NPC stands
// behind. Returns the interior center {x,z}. Door faces `facing` (toward plaza).
function buildEnterable(group, world, x, z, y, facing, key, mats, st) {
  const W = 11, D = 11, H = 4.2, T = 0.5; // footprint, wall height, thickness
  const wallMat = key === 'mage' ? mats.glass : key === 'knight' ? mats.stone
    : key === 'potion' ? mats.wall2 : key === 'library' ? mats.wall : mats.shop;
  // Local axes: f = front normal (door side), s = side axis.
  const fx = Math.sin(facing), fz = Math.cos(facing);
  const sx = Math.cos(facing), sz = -Math.sin(facing);

  // Floor slab.
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), mats.stone);
  floor.position.set(x, y + 0.1, z);
  floor.rotation.y = facing;
  group.add(floor);

  // Helper to drop a wall box at a local offset and register collision along it.
  const wallSeg = (lx, lz, ww, dd) => {
    const wx = x + sx * lx + fx * lz;
    const wz = z + sz * lx + fz * lz;
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww, H, dd), wallMat);
    m.position.set(wx, y + H / 2, wz);
    m.rotation.y = facing;
    group.add(m);
    // Collision: a row of circles along the longer span.
    const span = Math.max(ww, dd);
    const along = ww >= dd; // circles run along x-local or z-local
    const n = Math.max(1, Math.round(span / 1.2));
    for (let i = 0; i < n; i++) {
      const o = (n === 1) ? 0 : (i / (n - 1) - 0.5) * span;
      const ox = along ? o : 0, oz = along ? 0 : o;
      world && world.addSolid(wx + sx * ox + fx * oz, wz + sz * ox + fz * oz, 0.55);
    }
  };

  const doorGap = 2.6;
  // Front wall split into two pieces leaving a central doorway.
  const sidePiece = (W - doorGap) / 2;
  wallSeg(-(doorGap / 2 + sidePiece / 2), D / 2, sidePiece, T);
  wallSeg(+(doorGap / 2 + sidePiece / 2), D / 2, sidePiece, T);
  // Back wall (solid) and two side walls.
  wallSeg(0, -D / 2, W, T);
  wallSeg(-W / 2, 0, T, D);
  wallSeg(+W / 2, 0, T, D);

  // Lintel over the doorway + a flat roof slab.
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorGap + 0.4, 0.6, T), wallMat);
  lintel.position.set(x + fx * (D / 2), y + H - 0.3, z + fz * (D / 2));
  lintel.rotation.y = facing;
  const roof = st.pitched
    ? new THREE.Mesh(new THREE.ConeGeometry(W * 0.78, 3, 4), mats.roof)
    : new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.6, D + 0.6), mats.roof);
  roof.position.set(x, y + H + (st.pitched ? 1.3 : 0.3), z);
  roof.rotation.y = facing + (st.pitched ? Math.PI / 4 : 0);
  group.add(lintel, roof);

  // A hanging sign over the door, colored by trade.
  const signMat = key === 'mage' ? mats.portal : key === 'knight' ? mats.metal
    : key === 'potion' ? mats.potionR : key === 'library' ? mats.book : mats.gold;
  const sgx = x + fx * (D / 2 + 0.4), sgz = z + fz * (D / 2 + 0.4), sgy = y + 2.9;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.12), signMat);
  sign.position.set(sgx, sgy, sgz); sign.rotation.y = facing;
  // A timber frame + round trade emblem give the board carved relief.
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.09), mats.wood);
  frame.position.set(sgx - fx * 0.04, sgy, sgz - fz * 0.04); frame.rotation.y = facing;
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 12), mats.stoneDark);
  emblem.position.set(sgx + fx * 0.09, sgy, sgz + fz * 0.09);
  emblem.rotation.y = facing; emblem.rotation.x = Math.PI / 2;
  group.add(frame, sign, emblem);

  // Big nameplate over the door (same as the capital's shops).
  const labelText = (DISTRICT_POI[key] && DISTRICT_POI[key].label) || key;
  const plate = makeSignText(labelText, facing);
  plate.position.set(x + fx * (D / 2 + 0.05), y + H - 0.4, z + fz * (D / 2 + 0.05));
  group.add(plate);

  // Themed storefront details on the outside so each district building reads as
  // its vendor's shop, not a plain box.
  decorateShopExterior(group, world, x, z, y, facing, key, mats, W, D, H);

  // Interior decor + a counter near the back, themed by trade.
  decorateInterior(group, x, z, y, facing, key, mats);
  return { x, z }; // NPC roams around the interior center
}

// Themed clutter inside an enterable building: potion shelves, weapon racks,
// bookcases, market stalls, magic orbs — so each shop looks the part inside.
function decorateInterior(group, x, z, y, facing, key, mats) {
  const fx = Math.sin(facing), fz = Math.cos(facing);
  const sx = Math.cos(facing), sz = -Math.sin(facing);
  const at = (lx, lz) => ({ x: x + sx * lx + fx * lz, z: z + sz * lx + fz * lz });

  // A wooden counter near the back where the NPC stands.
  const cpos = at(0, -2.6);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(5, 1.1, 0.9), mats.wood);
  counter.position.set(cpos.x, y + 0.55, cpos.z);
  counter.rotation.y = facing;
  group.add(counter);

  // Back shelves: a tall plank wall full of trade-specific items.
  const shelfMat = mats.wood;
  for (const lx of [-3.5, 3.5]) {
    const p = at(lx, -4);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3, 5), shelfMat);
    shelf.position.set(p.x, y + 1.5, p.z); shelf.rotation.y = facing;
    group.add(shelf);
  }

  const item = (lx, lz, h, mat, r = 0.18) => {
    const p = at(lx, lz);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), mat);
    m.position.set(p.x, y + 0.55 + 1.1 + h / 2 - 1.1, p.z); // sit on a shelf row
    m.position.y = y + 1.5 + (Math.random() - 0.5) * 1.6;
    group.add(m);
  };

  if (key === 'potion') {
    // Rows of red/blue potion bottles on the shelves + a cauldron.
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 3.5 : -3.5;
      item(side, -4, 0.5, i % 2 ? mats.potionR : mats.potionB, 0.15);
    }
    const caul = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.metal);
    const cp = at(-2, 1); caul.position.set(cp.x, y + 0.55, cp.z); group.add(caul);
  } else if (key === 'knight') {
    // Weapon racks: a few swords leaning, plus an anvil.
    for (let i = 0; i < 6; i++) {
      const p = at(-3.5 + (i % 2) * 7, -4);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.04), mats.metal);
      blade.position.set(p.x, y + 1.6, p.z + (i - 3) * 0.001); group.add(blade);
    }
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.5), mats.stoneDark);
    const ap = at(2.4, 1); anvil.position.set(ap.x, y + 0.45, ap.z); group.add(anvil);
  } else if (key === 'mage') {
    // Glowing orbs and a staff stand.
    for (let i = 0; i < 4; i++) {
      const p = at(-3 + i * 2, -3.8);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mats.portal);
      orb.position.set(p.x, y + 1.9, p.z); group.add(orb);
    }
  } else if (key === 'library') {
    // Tall bookcases in rows filling the hall.
    for (let r = -1; r <= 1; r++) {
      for (const lx of [-3.5, 3.5]) {
        const p = at(lx, r * 2.6);
        const bc = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 2.2), mats.wood);
        bc.position.set(p.x, y + 1.5, p.z); bc.rotation.y = facing; group.add(bc);
        const books = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 2), mats.book);
        books.position.set(p.x + fx * 0.2, y + 1.5, p.z + fz * 0.2); books.rotation.y = facing; group.add(books);
      }
    }
  } else if (key === 'bank') {
    // Stacks of gold coins on the counter and a strongbox vault behind.
    for (let i = 0; i < 6; i++) {
      const p = at(-2 + i * 0.8, -2.2);
      const coins = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.3 + (i % 3) * 0.15, 10), mats.gold);
      coins.position.set(p.x, y + 1.25, p.z); group.add(coins);
    }
    const vault = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 0.6), mats.metal);
    const vp = at(0, -4); vault.position.set(vp.x, y + 1.4, vp.z); vault.rotation.y = facing;
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12), mats.gold);
    dial.position.set(vp.x + fx * 0.4, y + 1.4, vp.z + fz * 0.4); dial.rotation.x = Math.PI / 2;
    group.add(vault, dial);
  } else if (key === 'food') {
    // Hanging hams, bread loaves and a stew pot.
    for (let i = 0; i < 5; i++) {
      const p = at(-3 + i * 1.5, -3.9);
      const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mats.food);
      loaf.position.set(p.x, y + 1.7, p.z); loaf.scale.y = 0.6; group.add(loaf);
    }
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.metal);
    const pp = at(2.2, 0.5); pot.position.set(pp.x, y + 0.55, pp.z); group.add(pot);
    // A couple of dining tables.
    for (const lx of [-2.5, 2.5]) {
      const tp = at(lx, 2.5);
      const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 1), mats.wood);
      table.position.set(tp.x, y + 0.8, tp.z); table.rotation.y = facing; group.add(table);
    }
  } else if (key === 'archer') {
    // Bows leaning on the rack and quivers of arrows.
    for (let i = 0; i < 4; i++) {
      const p = at(-3 + i * 2, -4);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 6, 12, Math.PI), mats.wood);
      bow.position.set(p.x, y + 1.7, p.z); bow.rotation.y = facing; group.add(bow);
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.9, 8), mats.leaf);
      quiver.position.set(p.x + sx * 0.5, y + 0.95, p.z + sz * 0.5); group.add(quiver);
    }
  } else if (key === 'bag') {
    // Backpacks and sacks of every color piled on the shelves.
    const cols = [mats.cloth, mats.potionB, mats.leaf, mats.gold, mats.potionR];
    for (let i = 0; i < 8; i++) {
      const p = at(-3.5 + (i % 4) * 2.3, i < 4 ? -3.9 : -2.4);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), cols[i % cols.length]);
      bag.position.set(p.x, y + (i < 4 ? 2.1 : 1.1), p.z); bag.rotation.y = facing; group.add(bag);
    }
  } else if (key === 'townhall') {
    // A long council table with a banner behind it.
    const tp = at(0, -3.5);
    const table = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 1.4), mats.wood);
    table.position.set(tp.x, y + 0.9, tp.z); table.rotation.y = facing; group.add(table);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.1), mats.roof);
    const bp = at(0, -4.6); banner.position.set(bp.x, y + 2.6, bp.z); banner.rotation.y = facing; group.add(banner);
  } else if (key === 'keep') {
    // The north keep's hall: a banner, a brazier and stacked shields.
    const banner = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 0.1), mats.roof);
    const bp = at(0, -4.6); banner.position.set(bp.x, y + 2.8, bp.z); banner.rotation.y = facing; group.add(banner);
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 0.6, 8), mats.metal);
    const brp = at(0, 1); brazier.position.set(brp.x, y + 0.9, brp.z); group.add(brazier);
    const fire = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mats.lamp);
    fire.position.set(brp.x, y + 1.4, brp.z); group.add(fire);
    for (let i = 0; i < 4; i++) {
      const p = at(-3 + i * 2, -4);
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 12), mats.metal);
      shield.position.set(p.x, y + 1.8, p.z); shield.rotation.x = Math.PI / 2; group.add(shield);
    }
  } else if (key === 'tavern') {
    // A tavern: round tables with mugs, a keg and a hearth.
    for (const [lx, lz] of [[-2.5, 1.5], [2.5, 1.5], [0, 3]]) {
      const tp = at(lx, lz);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 12), mats.wood);
      top.position.set(tp.x, y + 0.85, tp.z); group.add(top);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 6), mats.wood);
      leg.position.set(tp.x, y + 0.42, tp.z); group.add(leg);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8), mats.gold);
      mug.position.set(tp.x + 0.3, y + 1.03, tp.z); group.add(mug);
    }
    const keg = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 12), mats.wood);
    keg.rotation.z = Math.PI / 2; const kp = at(-3, -3.5); keg.position.set(kp.x, y + 0.6, kp.z); group.add(keg);
  } else if (key === 'jeweler') {
    // A jeweler: a glass display case sparkling with cut gems.
    const cp2 = at(0, -2.6);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 0.9), mats.glass);
    glass.position.set(cp2.x, y + 1.3, cp2.z); glass.rotation.y = facing; group.add(glass);
    const gemMats = [mats.potionB, mats.potionR, mats.portal, mats.leaf, mats.gold];
    for (let i = 0; i < 7; i++) {
      const p = at(-2.2 + i * 0.75, -2.6);
      const gem = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 6), gemMats[i % gemMats.length]);
      gem.position.set(p.x, y + 1.75, p.z); gem.rotation.x = Math.PI; group.add(gem);
    }
  } else if (key === 'stable') {
    // A stable: golden hay bales, a water trough and a stall fence so it reads as
    // a barn where the mounts are kept.
    for (let i = 0; i < 5; i++) {
      const p = at(-3.2 + i * 1.6, -3.8);
      const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 10), mats.gold);
      bale.rotation.z = Math.PI / 2; bale.position.set(p.x, y + 0.5, p.z); bale.rotation.y = facing; group.add(bale);
    }
    // Water trough along one side.
    const trp = at(-3, 1);
    const trough = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 3), mats.wood);
    trough.position.set(trp.x, y + 0.3, trp.z); trough.rotation.y = facing; group.add(trough);
    // A simple stall fence (posts + rails) dividing the floor.
    for (let i = 0; i < 4; i++) {
      const p = at(1 + i * 1.2, 2);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.16), mats.wood);
      post.position.set(p.x, y + 0.6, p.z); group.add(post);
    }
    const railP = at(2.8, 2);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 4.4), mats.wood);
    rail.position.set(railP.x, y + 0.95, railP.z); rail.rotation.y = facing; group.add(rail);
  } else { // market
    // Crates and barrels of goods + a fruit stall.
    for (let i = 0; i < 5; i++) {
      const p = at(-3.5 + i * 1.8, -3.8);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mats.wood);
      crate.position.set(p.x, y + 0.45, p.z); group.add(crate);
    }
  }

  // Side-wall and entrance dressing shared by every shop, themed per trade, so the
  // INSIDE reads as that vendor's workplace from wall to wall — not a bare box with
  // a counter. Hung on the left/right walls and flanking the door.
  decorateInteriorWalls(group, x, z, y, facing, key, mats, at, fx, fz, sx, sz);
}

// Hang trade-themed dressing on the SIDE WALLS and around the doorway of a shop
// interior, so decor covers the room "por todas partes", not just the back. `at`
// maps a local (side, front) offset to world coords; fx/fz/sx/sz are the facing
// axes. Kept separate from decorateInterior so the back-wall wares and the wall
// dressing read as one themed room.
function decorateInteriorWalls(group, x, z, y, facing, key, mats, at, fx, fz, sx, sz) {
  // A framed picture / plaque flat against a side wall at (lx≈±5.2), facing inward.
  const wallPlaque = (lx, lz, w, h, mat) => {
    const p = at(lx, lz);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, h, w), mat);
    m.position.set(p.x, y + 1.9, p.z); m.rotation.y = facing; group.add(m);
    return m;
  };
  // A wall TORCH bracket with a glowing flame — every shop gets warm light by the
  // door so the interior never reads pitch-dark.
  const torch = (lx, lz) => {
    const p = at(lx, lz);
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), mats.wood);
    bracket.position.set(p.x, y + 2.2, p.z); group.add(bracket);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mats.lamp);
    flame.position.set(p.x, y + 2.5, p.z); flame.scale.y = 1.4; group.add(flame);
  };
  // Torches flank the inside of the doorway for every trade.
  torch(-2.0, 5.0); torch(2.0, 5.0);

  // A runner RUG leading from the door to the counter, tinted to the trade.
  const rugCol = key === 'mage' ? mats.portal : key === 'bank' ? mats.gold
    : key === 'knight' || key === 'keep' ? mats.metal : key === 'library' ? mats.book
    : key === 'jeweler' ? mats.potionB : key === 'archer' ? mats.leaf
    : key === 'potion' ? mats.potionR : mats.roof;
  const rp = at(0, 1.5);
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 7), rugCol);
  rug.position.set(rp.x, y + 0.04, rp.z); rug.rotation.y = facing; group.add(rug);

  // Per-trade side-wall pieces.
  if (key === 'potion') {
    // Hanging herb bundles + a shelf of spare bottles on each side wall.
    for (const sgn of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const herb = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), mats.leaf);
        const p = at(sgn * 5.2, -2 + i * 2); herb.position.set(p.x, y + 2.6, p.z); herb.rotation.x = Math.PI; group.add(herb);
      }
      wallPlaque(sgn * 5.4, 0, 3.2, 0.5, mats.wood);   // a long shelf board
      for (let i = 0; i < 4; i++) {
        const b = at(sgn * 5.1, -1.2 + i * 0.9);
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.4, 8), i % 2 ? mats.potionB : mats.potionR);
        bottle.position.set(b.x, y + 2.05, b.z); group.add(bottle);
      }
    }
  } else if (key === 'knight' || key === 'keep') {
    // Crossed weapons + a shield mounted on each side wall, like an armory hall.
    for (const sgn of [-1, 1]) {
      for (const ang of [0.5, -0.5]) {
        const p = at(sgn * 5.3, 0);
        const sw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.06), mats.metal);
        sw.position.set(p.x, y + 2.2, p.z); sw.rotation.y = facing; sw.rotation.x = ang; group.add(sw);
      }
      const sh = at(sgn * 5.25, 2.4);
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12), mats.metal);
      shield.position.set(sh.x, y + 1.9, sh.z); shield.rotation.z = Math.PI / 2; shield.rotation.y = facing; group.add(shield);
    }
  } else if (key === 'mage') {
    // Floating runes + tall candles line the walls of the arcane shop.
    for (const sgn of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const p = at(sgn * 5.2, -2 + i * 2);
        const rune = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 10), mats.portal);
        rune.position.set(p.x, y + 1.6 + i * 0.4, p.z); rune.rotation.y = facing; group.add(rune);
      }
      const cp = at(sgn * 4.8, 3);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.4, 8), mats.cloth);
      candle.position.set(cp.x, y + 0.7, cp.z); group.add(candle);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), mats.portal);
      fl.position.set(cp.x, y + 1.5, cp.z); group.add(fl);
    }
  } else if (key === 'library') {
    // The side walls are floor-to-ceiling bookcases too.
    for (const sgn of [-1, 1]) {
      const p = at(sgn * 5.2, 0);
      const bc = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 6), mats.wood);
      bc.position.set(p.x, y + 1.6, p.z); bc.rotation.y = facing; group.add(bc);
      const books = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.8, 5.6), mats.book);
      books.position.set(p.x - sgn * 0.2, y + 1.6, p.z); books.rotation.y = facing; group.add(books);
    }
  } else if (key === 'bank') {
    // Gold-framed plaques + a candelabra on the marble walls.
    for (const sgn of [-1, 1]) { wallPlaque(sgn * 5.3, 0, 2, 1.4, mats.gold); }
  } else if (key === 'archer') {
    // Mounted bows and a target on the side walls.
    for (const sgn of [-1, 1]) {
      const p = at(sgn * 5.3, -1);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 6, 12, Math.PI), mats.wood);
      bow.position.set(p.x, y + 2.1, p.z); bow.rotation.z = Math.PI / 2; bow.rotation.y = facing; group.add(bow);
      const tp = at(sgn * 5.2, 2.5);
      for (let r = 3; r >= 1; r--) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * r, 0.12 * r, 0.05, 14), r % 2 ? mats.potionR : mats.cloth);
        ring.position.set(tp.x, y + 1.9, tp.z); ring.rotation.z = Math.PI / 2; ring.rotation.y = facing; group.add(ring);
      }
    }
  } else if (key === 'jeweler') {
    // Velvet wall cases sparkling with gems.
    for (const sgn of [-1, 1]) {
      wallPlaque(sgn * 5.3, 0, 3, 1.6, mats.potionB);
      for (let i = 0; i < 3; i++) {
        const p = at(sgn * 5.1, -1 + i);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), i % 2 ? mats.portal : mats.gold);
        gem.position.set(p.x, y + 1.9, p.z); group.add(gem);
      }
    }
  } else if (key === 'tavern' || key === 'food') {
    // Barrels stacked along the walls + a hanging sign.
    for (const sgn of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const p = at(sgn * 4.8, -3 + i * 1.4);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 12), mats.wood);
        barrel.position.set(p.x, y + 0.5, p.z); group.add(barrel);
      }
    }
  } else if (key === 'stable') {
    // Horseshoes and hanging tack on the walls.
    for (const sgn of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const p = at(sgn * 5.3, -2 + i * 2);
        const shoe = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 10, Math.PI * 1.3), mats.metal);
        shoe.position.set(p.x, y + 2.2 - i * 0.1, p.z); shoe.rotation.y = facing; group.add(shoe);
      }
    }
  } else if (key === 'bag') {
    // Spare sacks hung from wall pegs.
    for (const sgn of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const p = at(sgn * 5.2, -2 + i * 2);
        const sack = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), i % 2 ? mats.cloth : mats.leaf);
        sack.position.set(p.x, y + 2.2, p.z); sack.scale.y = 1.3; group.add(sack);
      }
    }
  }
}

// Dress the OUTSIDE of a shop so the building reads as that trade's storefront —
// not just another green-roofed house. Adds a hanging trade emblem over the door,
// flanking props, awnings/window-boxes and a roof feature keyed to the vendor.
// `W,D,H` are the building footprint/height; `facing` points out the front door.
function decorateShopExterior(group, world, x, z, y, facing, kind, mats, W, D, H) {
  const fx = Math.sin(facing), fz = Math.cos(facing);
  const sx = Math.cos(facing), sz = -Math.sin(facing);
  // World point at a local (side, out-from-front, up) offset, where `out` is how
  // far in FRONT of the door face it sits (front face is at +D/2).
  const front = (lx, out, up) => ({
    x: x + sx * lx + fx * (D / 2 + out),
    z: z + sz * lx + fz * (D / 2 + out),
    y: y + up,
  });
  const add = (geo, mat, p, rotY = facing) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(p.x, p.y, p.z); m.rotation.y = rotY; group.add(m); return m;
  };
  // A big 3D trade EMBLEM mounted on a post beside the door — the storefront's
  // shop sign, readable from across the plaza.
  const emblemBase = front(W / 2 - 1.0, 0.3, 0);
  const post = add(new THREE.CylinderGeometry(0.1, 0.1, H * 0.8, 8), mats.wood, { x: emblemBase.x, y: y + H * 0.4, z: emblemBase.z });
  const ey = y + H * 0.8;
  const emblemAt = { x: emblemBase.x + fx * 0.1, y: ey, z: emblemBase.z + fz * 0.1 };

  switch (kind) {
    case 'potion': {
      // A giant potion bottle on the sign post + window herb boxes.
      add(new THREE.CylinderGeometry(0.35, 0.45, 0.7, 10), mats.potionR, emblemAt);
      add(new THREE.CylinderGeometry(0.18, 0.22, 0.3, 8), mats.wood, { ...emblemAt, y: ey + 0.5 });
      break;
    }
    case 'knight': case 'keep': {
      // Crossed swords emblem + a barrel of weapons by the door.
      for (const a of [0.6, -0.6]) {
        const sw = add(new THREE.BoxGeometry(0.1, 1.3, 0.06), mats.metal, emblemAt); sw.rotation.z = a;
      }
      const bp = front(-W / 2 + 1, 1.0, 0);
      add(new THREE.CylinderGeometry(0.4, 0.4, 1, 12), mats.wood, { x: bp.x, y: y + 0.5, z: bp.z });
      for (let i = -1; i <= 1; i++) {
        const sw = add(new THREE.BoxGeometry(0.06, 1.2, 0.04), mats.metal, { x: bp.x + sx * i * 0.12, y: y + 1.4, z: bp.z + sz * i * 0.12 });
        sw.rotation.x = 0.1 * i;
      }
      break;
    }
    case 'mage': {
      // A glowing orb on the post + arcane banners either side of the door.
      add(new THREE.SphereGeometry(0.4, 12, 10), mats.portal, emblemAt);
      for (const sgn of [-1, 1]) {
        const p = front(sgn * (W / 2 - 0.6), 0.1, 0);
        add(new THREE.BoxGeometry(0.6, 2.2, 0.06), mats.portal, { x: p.x, y: y + H - 1.4, z: p.z });
      }
      break;
    }
    case 'archer': {
      // A big bow emblem + a fletcher's target on a stand beside the door.
      const bow = add(new THREE.TorusGeometry(0.5, 0.07, 6, 14, Math.PI), mats.wood, emblemAt); bow.rotation.z = Math.PI / 2;
      const tp = front(-W / 2 + 1, 1.2, 0);
      for (let r = 3; r >= 1; r--) {
        const ring = add(new THREE.CylinderGeometry(0.18 * r, 0.18 * r, 0.06, 16), r % 2 ? mats.potionR : mats.cloth, { x: tp.x, y: y + 1.5, z: tp.z });
        ring.rotation.x = Math.PI / 2;
      }
      break;
    }
    case 'bank': {
      // A gold coin emblem + two stone urns flanking a grand entrance.
      add(new THREE.CylinderGeometry(0.45, 0.45, 0.16, 16), mats.gold, { ...emblemAt, }).rotation.x = Math.PI / 2;
      for (const sgn of [-1, 1]) {
        const p = front(sgn * (W / 2 - 1.2), 1.0, 0);
        add(new THREE.CylinderGeometry(0.3, 0.45, 1.3, 12), mats.stone, { x: p.x, y: y + 0.65, z: p.z });
        add(new THREE.SphereGeometry(0.3, 10, 8), mats.gold, { x: p.x, y: y + 1.4, z: p.z });
      }
      break;
    }
    case 'library': {
      // A big open book emblem + a reading lectern outside.
      for (const sgn of [-1, 1]) {
        const pg = add(new THREE.BoxGeometry(0.5, 0.7, 0.06), mats.book, emblemAt); pg.rotation.y = facing + sgn * 0.4;
      }
      break;
    }
    case 'jeweler': {
      // A faceted gem emblem that catches the light.
      add(new THREE.OctahedronGeometry(0.4, 0), mats.portal, emblemAt);
      break;
    }
    case 'tavern': case 'food': {
      // A foaming mug / bread emblem + barrels and a bench by the door.
      add(new THREE.CylinderGeometry(0.3, 0.3, 0.55, 10), mats.gold, emblemAt);
      for (const sgn of [-1, 1]) {
        const p = front(sgn * (W / 2 - 1), 0.9, 0);
        add(new THREE.CylinderGeometry(0.42, 0.42, 1, 12), mats.wood, { x: p.x, y: y + 0.5, z: p.z });
      }
      break;
    }
    case 'stable': {
      // A horseshoe emblem + a hay bale and a hitching post outside.
      const shoe = add(new THREE.TorusGeometry(0.32, 0.08, 6, 12, Math.PI * 1.3), mats.metal, emblemAt);
      const hp = front(-W / 2 + 1, 1.0, 0);
      const bale = add(new THREE.CylinderGeometry(0.55, 0.55, 1, 10), mats.gold, { x: hp.x, y: y + 0.55, z: hp.z }); bale.rotation.z = Math.PI / 2;
      break;
    }
    case 'bag': {
      // A bulging sack emblem + a pile of sacks by the door.
      const sk = add(new THREE.SphereGeometry(0.4, 10, 8), mats.cloth, emblemAt); sk.scale.y = 1.3;
      const pp = front(-W / 2 + 1, 0.9, 0);
      for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.3, 8, 6), i % 2 ? mats.leaf : mats.cloth, { x: pp.x + sx * (i - 1) * 0.3, y: y + 0.4, z: pp.z }).scale.y = 1.2;
      break;
    }
    case 'townhall': {
      // A wreathed crest + two banners by a civic entrance.
      add(new THREE.TorusGeometry(0.32, 0.07, 8, 16), mats.leaf, emblemAt);
      for (const sgn of [-1, 1]) {
        const p = front(sgn * (W / 2 - 0.6), 0.1, 0);
        add(new THREE.BoxGeometry(0.5, 2, 0.05), mats.roof, { x: p.x, y: y + H - 1.3, z: p.z });
      }
      break;
    }
    default: {  // market / general
      // A market awning over the door + a couple of produce crates.
      const awn = add(new THREE.BoxGeometry(W * 0.6, 0.12, 1.6), mats.awning, front(0, 0.9, H - 1.2));
      awn.rotation.x = -0.2;
      for (const sgn of [-1, 1]) {
        const p = front(sgn * (W / 2 - 1.2), 1.2, 0);
        add(new THREE.BoxGeometry(0.8, 0.8, 0.8), mats.wood, { x: p.x, y: y + 0.4, z: p.z });
      }
    }
  }
  // Window flower boxes under the front windows give every storefront a lived-in
  // touch (skipped for the austere bank/keep, which keep a grander stone look).
  if (kind !== 'bank' && kind !== 'keep') {
    for (const sgn of [-1, 1]) {
      const p = front(sgn * (W * 0.28), 0.18, 0);
      const box = add(new THREE.BoxGeometry(1.1, 0.3, 0.3), mats.wood, { x: p.x, y: y + H * 0.5, z: p.z });
      const blooms = add(new THREE.SphereGeometry(0.18, 8, 6), mats.leaf, { x: p.x, y: y + H * 0.5 + 0.22, z: p.z });
      blooms.scale.set(2.6, 0.7, 0.7);
    }
  }
}

// Small standalone decorations. `kind` selects the shape.
function buildProp(group, world, x, z, y, kind, mats) {
  if (kind === 'barrel') {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.9, 12), mats.wood);
    b.position.set(x, y + 0.45, z);
    // Two iron hoops (upper + lower) and a darker top lid with a proud rim, so
    // the barrel reads as bound staves rather than a plain cylinder.
    const bandU = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.04, 6, 14), mats.stoneDark);
    bandU.rotation.x = Math.PI / 2; bandU.position.set(x, y + 0.68, z);
    const bandL = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 14), mats.stoneDark);
    bandL.rotation.x = Math.PI / 2; bandL.position.set(x, y + 0.22, z);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 12), mats.stoneDark);
    lid.position.set(x, y + 0.92, z);
    group.add(b, bandU, bandL, lid);
    world && world.addSolid(x, z, 0.45);
  } else if (kind === 'crate') {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mats.wood);
    c.position.set(x, y + 0.4, z);
    c.rotation.y = 0.3;
    // A second crate stacked, sometimes.
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mats.wood);
    c2.position.set(x + 0.2, y + 1.1, z - 0.1); c2.rotation.y = -0.2;
    group.add(c, c2);
    // A nailed cross-plank brace (an X of two thin diagonal slats) on the big
    // crate's front face so it reads as boarded timber.
    const ca = Math.cos(0.3), sa = Math.sin(0.3);   // crate's own rotation
    for (const d of [1, -1]) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.1), mats.stoneDark);
      plank.position.set(x + sa * 0.42, y + 0.4, z + ca * 0.42);
      plank.rotation.y = 0.3; plank.rotation.z = d * Math.PI / 4;
      group.add(plank);
    }
    world && world.addSolid(x, z, 0.5);
  } else if (kind === 'cart') {
    // A wooden hand cart: a tilted bed on two wheels with handles.
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.0), mats.wood);
    bed.position.set(x, y + 0.7, z); bed.rotation.z = 0.12;
    const sideA = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), mats.wood);
    sideA.position.set(x, y + 0.95, z + 0.46);
    const sideB = sideA.clone(); sideB.position.z = z - 0.46;
    group.add(bed, sideA, sideB);
    for (const s of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 12), mats.stoneDark);
      wheel.rotation.x = Math.PI / 2; wheel.position.set(x - 0.5, y + 0.4, z + s * 0.5);
      group.add(wheel);
    }
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), mats.wood);
    handle.position.set(x + 1.1, y + 0.95, z); handle.rotation.z = Math.PI / 2.3;
    group.add(handle);
    world && world.addSolid(x, z, 1.0);
  } else if (kind === 'well') {
    // A wider, low stone base step so the well-head rises from a paved kerb.
    const step = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.25, 14), mats.stoneDark);
    step.position.set(x, y + 0.12, z);
    group.add(step);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 1, 14), mats.stone);
    ring.position.set(x, y + 0.5, z);
    // A proud darker coping rim around the well mouth.
    const coping = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.16, 14), mats.stoneDark);
    coping.position.set(x, y + 1.0, z);
    group.add(coping);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 14), mats.water);
    water.position.set(x, y + 0.7, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2, 6), mats.wood);
    post.position.set(x + 0.9, y + 1.5, z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.8, 4), mats.roof);
    roof.position.set(x, y + 2.6, z); roof.rotation.y = Math.PI / 4;
    group.add(ring, water, post, roof);
    world && world.addSolid(x, z, 1.0);
  } else if (kind === 'lamp') {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6), mats.stoneDark);
    post.position.set(x, y + 1.3, z);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mats.lamp);
    glow.position.set(x, y + 2.7, z);
    group.add(post, glow);
  } else if (kind === 'orb') {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.9, 8), mats.stone);
    stand.position.set(x, y + 0.45, z);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), mats.portal);
    orb.position.set(x, y + 1.15, z);
    group.add(stand, orb);
  } else if (kind === 'fountain') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.6, 16), mats.stone);
    base.position.set(x, y + 0.3, z);
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.2, 16), mats.water);
    pool.position.set(x, y + 0.62, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.9, 8), mats.stone);
    stem.position.set(x, y + 1, z);
    group.add(base, pool, stem);
    world && world.addSolid(x, z, 1.5);
  } else if (kind === 'tree') {
    // A leafy tree: a trunk with two blobs of foliage. Solid so you walk around.
    const h = 2.6 + (Math.abs(x * 7 + z * 3) % 10) / 10 * 1.4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, h, 7), mats.wood);
    trunk.position.set(x, y + h / 2, z);
    // Faceted canopy: two overlapping low-detail icosahedra read as leafy clumps
    // (crisp facets) instead of smooth balls.
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), mats.leaf);
    c1.position.set(x, y + h + 0.6, z);
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), mats.leaf);
    c2.position.set(x + 0.7, y + h + 0.1, z - 0.4); c2.rotation.y = 0.8;
    group.add(trunk, c1, c2);
    world && world.addSolid(x, z, 0.6);
  } else if (kind === 'bush') {
    // A faceted leafy clump: three overlapping low-detail icosahedra instead of
    // smooth spheres, so the foliage reads as chunky leaves.
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), mats.leaf);
    b.position.set(x, y + 0.6, z); b.scale.y = 0.8;
    const b2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mats.leaf);
    b2.position.set(x + 0.6, y + 0.45, z + 0.2); b2.scale.y = 0.8; b2.rotation.y = 0.7;
    const b3 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), mats.leaf);
    b3.position.set(x - 0.4, y + 0.5, z - 0.25); b3.scale.y = 0.8; b3.rotation.y = 1.3;
    group.add(b, b2, b3);
  } else if (kind === 'flowers') {
    // A little flowerbed: a soil patch dotted with bright petals.
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 1.2), mats.dirt);
    bed.position.set(x, y + 0.09, z);
    group.add(bed);
    const petalMats = [mats.potionR, mats.gold, mats.potionB, mats.cloth];
    for (let i = 0; i < 7; i++) {
      const a = i * 1.7, rr = (i % 3) * 0.35;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4), mats.leaf);
      const fx2 = x + Math.cos(a) * rr, fz2 = z + Math.sin(a) * rr;
      stem.position.set(fx2, y + 0.32, fz2);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), petalMats[i % petalMats.length]);
      bloom.position.set(fx2, y + 0.54, fz2);
      group.add(stem, bloom);
    }
  } else if (kind === 'bench') {
    // The seat is three narrow planks with gaps between them (slatted) instead
    // of one slab, so the bench reads as joined timber.
    for (const o of [-0.17, 0, 0.17]) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.13), mats.wood);
      plank.position.set(x, y + 0.5, z + o);
      group.add(plank);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), mats.wood);
    back.position.set(x, y + 0.8, z - 0.2);
    group.add(back);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.4), mats.stoneDark);
      leg.position.set(x + s * 0.65, y + 0.25, z);
      group.add(leg);
    }
  } else if (kind === 'statue') {
    // A commemorated hero — one of many carved variants (warrior, archer, mage,
    // queen, the rotund brewer…), picked deterministically from this corner's
    // world position so it's stable for everyone. Press it to read its legend; it
    // glows softly from the base upward at night. (statueLore.js owns the models +
    // the fixed lore.)
    const lore = pickStatueLore(x, z);
    buildStatue(group, world, x, y, z, mats, lore);
  } else if (kind === 'stall') {
    // A market stall: a counter under a striped awning, with crates of goods.
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1), mats.wood);
    counter.position.set(x, y + 0.45, z);
    // A proud darker rim along the counter's front lip.
    const lip = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.14, 0.12), mats.stoneDark);
    lip.position.set(x, y + 0.9, z + 0.5);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.4), mats.awning);
    awn.position.set(x, y + 2.1, z - 0.2); awn.rotation.x = -0.2;
    // A contrasting valance stripe hanging off the awning's front edge gives the
    // canopy its striped-cloth relief.
    const valance = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, 0.06), mats.cloth);
    valance.position.set(x, y + 1.95, z + 0.45);
    group.add(counter, lip, awn, valance);
    for (const s of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6), mats.wood);
      pole.position.set(x + s * 1.2, y + 1.05, z - 0.4);
      group.add(pole);
    }
    const goods = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), mats.food);
    goods.position.set(x - 0.5, y + 1.1, z); group.add(goods);
    const goods2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mats.potionR);
    goods2.position.set(x + 0.5, y + 1.05, z); group.add(goods2);
    world && world.addSolid(x, z, 1.2);
  } else if (kind === 'planter') {
    // A raised stone planter with a small shrub — lines streets nicely. A proud
    // darker rim caps the box, and the shrub is a faceted icosahedron clump.
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 1), mats.stone);
    box.position.set(x, y + 0.3, z);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.16, 1.12), mats.stoneDark);
    rim.position.set(x, y + 0.6, z);
    const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mats.leaf);
    shrub.position.set(x, y + 0.95, z); shrub.scale.y = 0.85;
    group.add(box, rim, shrub);
    world && world.addSolid(x, z, 0.55);
  } else if (kind === 'hay') {
    const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1, 12), mats.gold);
    bale.rotation.z = Math.PI / 2; bale.position.set(x, y + 0.6, z);
    group.add(bale);
    world && world.addSolid(x, z, 0.7);
  }
}

// The capital's castle keep: a big stone block with four corner towers and a
// banner. Solid (you walk around it, not through it). Marks Greenhollow as the
// royal capital so it reads differently from the smaller towns.
function buildCastle(group, world, x, z, y, mats) {
  const keep = new THREE.Mesh(new THREE.BoxGeometry(14, 12, 12), mats.stone);
  keep.position.set(x, y + 6, z);
  const top = new THREE.Mesh(new THREE.BoxGeometry(15, 1, 13), mats.stoneDark);
  top.position.set(x, y + 12.2, z);
  group.add(keep, top);
  world && world.addSolid(x, z, 9);
  // Corner towers.
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    const tx = x + dx * 7.5, tz = z + dz * 6.5;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.3, 16, 12), mats.stone);
    tower.position.set(tx, y + 8, tz);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.5, 12), mats.roof);
    cap.position.set(tx, y + 17.5, tz);
    group.add(tower, cap);
    world && world.addSolid(tx, tz, 2.3);
  }
  // A banner on the front face.
  const banner = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5, 0.15), mats.roof);
  banner.position.set(x, y + 8, z + 6.2);
  group.add(banner);
}

// The depot: a sturdy stone strongbox of a building, solid, with a banded door.
function buildDepot(group, world, x, z, y, mats) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 3.4, 4), mats.depot);
  body.position.set(x, y + 1.7, z);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 4.4), mats.stoneDark);
  roof.position.set(x, y + 3.6, z);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.15), mats.metal);
  door.position.set(x, y + 1.1, z + 2.05);
  group.add(body, roof, door);
  world && world.addSolid(x, z, 2.6);
}

// A small marble temple at the city center: stepped base, columns and a roof.
//
// OPEN PAVILION collision. The old design had two bugs the user hit: (1) an
// invisible perimeter wall registered FAR outside the drawn pillars snagged you
// when walking PAST the temple ("se traba pasando cerca"); (2) that wall was a
// thick ring of OVERLAPPING blockers, so a player standing in it counted as
// _blocked, which trips player.js's stuck-escape clause and DISABLES collision —
// letting you phase straight through ("se traspasa"). It also mis-used a stand-on
// platform (dead code: the city flat-core resolves heightAt to `flat` before the
// platform check), leaving the player sunk ~0.5m below the visible floor.
//
// The fix is a true open-sided gazebo: NO perimeter wall, ONLY the 8 columns are
// solid, each solid sized to MATCH the drawn column (r=0.3) and spaced so the
// blocked bands NEVER merge into a ring. Verified by a numerical solidAt sweep
// (PLAYER_RADIUS=0.35): max solid radius 4.04m (INSIDE the 4.2m floor disc, so
// nothing solid past the drawn stone → no snag); max azimuthal coverage 49% at
// any radius (never a full ring → the stuck clause can never fire → no
// phase-through); 1.37m clear gap between every pair of columns so you walk in
// anywhere; interior fully standable; +Z straight-in path clear for the priest.
// Geometry is lowered so the base/floor TOPS sit exactly at `flat` — you stand ON
// the marble, no sink, no step (MAX_STEP never even matters).
function buildTemple(group, cx, cz, flat, matTemple, matStone, world) {
  // Base plinth: top sits at `flat` (centre flat-0.4, height 0.8). Cosmetic only.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 0.8, 16), matStone);
  base.position.set(cx, flat - 0.4, cz);
  group.add(base);
  // Floor disc: top sits at `flat` (centre flat-0.2, height 0.4) — flush with the
  // ground the player actually walks on, so feet are ON the marble, not sunk in.
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.4, 16), matTemple);
  floor.position.set(cx, flat - 0.2, cz);
  group.add(floor);

  // 8 columns, rooted on the floor (bottom at `flat`, centre flat+2, height 4).
  // Rotated a half-step (22.5°) so the FRONT (+Z, toward the steps / priest) lands
  // in the GAP between two columns — a clear straight-in entrance.
  const N = 8, R = 3.4, off = Math.PI / N;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + off;
    const px = cx + Math.cos(a) * R;
    const pz = cz + Math.sin(a) * R;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 8), matTemple);
    pillar.position.set(px, flat + 2, pz);
    group.add(pillar);
    // Solid radius MATCHES the drawn column (0.3). Effective block 0.3+0.35=0.65m;
    // column centres are 2π·3.4/8 = 2.67m apart >> 2·0.65=1.30m, so the blocked
    // bands never merge into a ring (no stuck-blob), leaving a ~1.37m clear gap
    // between every pair, and the outermost block reaches only 4.05m — inside the
    // 4.2m floor disc, so there is no invisible wall to snag you when walking past.
    if (world) world.addSolid(px, pz, 0.3);
  }

  // Roof cone lowered in tandem with the floor so the gazebo keeps its profile
  // (apex ~flat+6.2, eaves at the column tops ~flat+4).
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5, 2.4, 16), matTemple);
  roof.position.set(cx, flat + 5, cz);
  group.add(roof);

  // Healing AURA: a soft green glow on and around the temple so it reads as a
  // sanctuary that mends you. A translucent ground disc, a faint dome of light,
  // a ring of motes, and a warm green point light. Purely cosmetic; the actual
  // ×10 regeneration is applied in main.js by temple proximity.
  buildTempleAura(group, cx, cz, flat);
}

// The green healing aura around a temple. Grouped under `auraGroup` and tagged
// so main.js can find it (userData.templeAura) and gently pulse it each frame.
function buildTempleAura(group, cx, cz, flat) {
  const aura = new THREE.Group();
  aura.userData.templeAura = true;
  // The aura GROUP sits at the temple; its children are positioned in LOCAL space
  // (relative to the group). main.js spins this group on its Y axis every frame —
  // if the children carried world coords (cx,cz), that spin would orbit them
  // around the world origin, flinging the aura across the map for any city not at
  // (0,0) (the Frostpeak "heal circle racing through town" bug). Local coords keep
  // the rotation in place: the motes drift around the temple, nothing flies off.
  aura.position.set(cx, flat, cz);
  const GREEN = 0x55ff88;
  // A glowing disc lying on the temple floor (additive so it reads as light, not
  // paint). Slightly above the marble to avoid z-fighting.
  const discMat = new THREE.MeshBasicMaterial({
    color: GREEN, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.6, 32), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(0, 0.06, 0);
  aura.add(disc);
  // A soft translucent dome of light enclosing the gazebo.
  const domeMat = new THREE.MeshBasicMaterial({
    color: GREEN, transparent: true, opacity: 0.1,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.position.set(0, 0.05, 0);
  aura.add(dome);
  // A ring of floating motes (little glowing specks) for a "blessing" feel.
  const moteMat = new THREE.MeshBasicMaterial({ color: 0xbfffd4, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = 3.6 + (i % 3) * 0.4;
    const mote = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), moteMat);
    mote.position.set(Math.cos(a) * rr, 0.6 + (i % 4) * 0.5, Math.sin(a) * rr);
    aura.add(mote);
  }
  // A warm green point light so nearby surfaces tint toward the heal colour.
  const light = new THREE.PointLight(GREEN, 0.7, 14, 2);
  light.position.set(0, 2.2, 0);
  aura.add(light);
  group.add(aura);
}

// Returns the interactable kind the player stands on, or null.
export function interactableAt(props, x, z) {
  for (const p of props) {
    if (Math.hypot(p.shop.x - x, p.shop.z - z) < SHOP_RADIUS) return { kind: 'shop', city: p.city };
    if (Math.hypot(p.depot.x - x, p.depot.z - z) < DEPOT_RADIUS) return { kind: 'depot', city: p.city };
    if (Math.hypot(p.portal.x - x, p.portal.z - z) < PORTAL_RADIUS) return { kind: 'portal', city: p.city };
    // Gate healing statues — talk to one to be patched up (low-level only). One
    // stands outside every gate, so any nearby qualifies.
    if (p.healStatues) {
      for (const hs of p.healStatues) {
        if (Math.hypot(hs.x - x, hs.z - z) < HEAL_STATUE_RADIUS) {
          return { kind: 'healStatue', city: p.city };
        }
      }
    }
    // Free-market stalls sit on a ring outside SHOP_RADIUS, so they never clash
    // with the shop interaction. Touch one to open / browse it.
    if (p.stalls) {
      for (const s of p.stalls) {
        if (Math.hypot(s.x - x, s.z - z) < STALL_RADIUS) {
          return { kind: 'stall', stallId: s.stallId, city: p.city, market: s.market || 'mini' };
        }
      }
    }
  }
  return null;
}
