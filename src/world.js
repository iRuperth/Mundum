import * as THREE from 'three';
import { makeNoise } from './noise.js';

export const WATER_LEVEL = 0;
const CHUNK = 64;   // chunk size in meters
const RES = 32;     // subdivisions per chunk

// The world is a FINITE peninsula/continent, not an endless plane. Past
// WORLD_RADIUS the land falls away into open ocean so the map has real borders
// you can see on the minimap and sail/walk up to. COAST_FALLOFF is how wide the
// shoreline band is where the continent eases down into the sea.
export const WORLD_RADIUS = 2400;   // continent half-extent (meters from origin) — enlarged peninsula
const COAST_FALLOFF = 360;          // width of the shore where land sinks to sea
export const WORLD_BOUND = WORLD_RADIUS + 140;  // hard wall just past the beach

// Climate uses TWO independent axes, each changing GRADUALLY as you walk so the
// frost/sand creep in long before the true biome:
//   • COLD runs along NORTH  (-Z, the top of the map)  -> snow up north ONLY.
//   • HEAT runs along EAST   (+X, the right of the map) -> desert out east.
// SNOW is decoupled from the desert axis and from altitude: it depends only on
// how far north you are, so the entire north reads as snow and there is NEVER
// snow in the west or south (the user's rule). The desert axis still uses
// TEMPERATE_EDGE..REGION_EDGE for its east-west gradient.
const TEMPERATE_EDGE = 240;   // within this distance of the temperate core: no biome creep
const REGION_EDGE = 820;      // past this (east): full desert
// Snow band along the north (-Z). SNOW_EDGE is where frost begins to creep in,
// SNOW_FULL is where it's solid white. Set high/far-north and steep so the whole
// top of the map is snow and the middle stays temperate forest.
const SNOW_EDGE = 820;        // north distance where snow starts (pushed out for the bigger map)
const SNOW_FULL = 1180;       // north distance where it's fully snow

const C_SAND      = new THREE.Color(0xd5c382);
const C_SAND_DEEP = new THREE.Color(0x8f9a66);
const C_GRASS_A   = new THREE.Color(0x57a14d);
const C_GRASS_B   = new THREE.Color(0x4a8f44);
const C_ROCK      = new THREE.Color(0x8a877f);
const C_SNOW      = new THREE.Color(0xeef3f7);
const C_CANOPY_A  = new THREE.Color(0x3e8a3c);
const C_CANOPY_B  = new THREE.Color(0x76b04b);
// Snow biome
const C_SNOW_GROUND = new THREE.Color(0xe6edf2);
const C_SNOW_GRASS  = new THREE.Color(0xb9cdd0);
const C_PINE_A      = new THREE.Color(0x2c5a44);
const C_PINE_B      = new THREE.Color(0x3f7050);
// Desert biome
const C_DUNE_A    = new THREE.Color(0xe2c98a);
const C_DUNE_B    = new THREE.Color(0xcdab63);
const C_DRYROCK   = new THREE.Color(0xb08a5a);
const C_CACTUS    = new THREE.Color(0x4e8a4a);
// Transition tints: a frosty grass for the sub-arctic fringe and a dry savanna
// grass for the pre-desert, so the ground itself shows the climate shifting
// gradually rather than flipping at a hard border.
const C_FROST_GRASS = new THREE.Color(0x8fae8c);
const C_DRY_GRASS   = new THREE.Color(0xb6ac6a);

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const tmpColor = new THREE.Color();

export class World {
  constructor(scene, seed, radius) {
    this.scene = scene;
    this.radius = radius;
    this.noise = makeNoise(seed);
    this.chunks = new Map();
    this.solids = new Map(); // chunk key -> [{x, z, r}] collidable trunks/rocks
    this.fixedSolids = new Map(); // chunk key -> [{x, z, r}] permanent (city walls/props)
    // Flat pads under cities so buildings, NPCs and the player share one level
    // ground. Registered after cities are placed; heightAt blends to it.
    this.cityFlats = [];
    // Raised round platforms you can STAND ON (e.g. the temple floor): inside the
    // radius the walk-height jumps up to `y`, so the player steps onto it instead
    // of phasing through. Checked in heightAt after the city pads.
    this.platforms = [];
    this.queue = [];
    this._cx = null;
    this._cz = null;

    this.matTerrain = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.matTrunk = new THREE.MeshLambertMaterial({ color: 0x6a4a30, flatShading: true });
    this.matCanopy = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    this.matRock = new THREE.MeshLambertMaterial({ color: 0x8d8d86, flatShading: true });
    this.matCactus = new THREE.MeshLambertMaterial({ color: 0x4e8a4a, flatShading: true });

    // A small deterministic vertex jitter turns smooth primitives into knobbly,
    // hand-carved looking shapes — bark ridges on trunks, lumpy foliage, craggy
    // rocks — without adding any draw calls (these are instanced base geometries,
    // so the cost is paid exactly once). flatShading then faceting reads each
    // displaced face as its own plane, giving real relief in the lighting.
    const jitter = (geo, amt, seed) => {
      const p = geo.attributes.position;
      let s = seed >>> 0;
      const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 - 0.5; };
      for (let i = 0; i < p.count; i++) {
        p.setXYZ(i, p.getX(i) + rnd() * amt, p.getY(i) + rnd() * amt, p.getZ(i) + rnd() * amt);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    };

    // Trunk: more sides + a gentle bark wobble so it isn't a clean cone.
    this.geoTrunk = new THREE.CylinderGeometry(0.16, 0.28, 1.7, 7);
    this.geoTrunk.translate(0, 0.85, 0);
    jitter(this.geoTrunk, 0.05, 0x51a2e3);
    // Canopy: bump the icosahedron to detail 1 (more faces) then push the
    // vertices around so the foliage looks clumpy and full instead of a ball.
    this.geoCanopy = new THREE.IcosahedronGeometry(1.45, 1);
    this.geoCanopy.scale(1, 1.3, 1);
    this.geoCanopy.translate(0, 2.8, 0);
    jitter(this.geoCanopy, 0.34, 0x9e3779);
    // Rock: detail 1 + heavy jitter = a proper craggy boulder with facets.
    this.geoRock = new THREE.IcosahedronGeometry(0.8, 1);
    this.geoRock.scale(1, 0.72, 1);
    jitter(this.geoRock, 0.22, 0x2545f9);
    // A columnar cactus: more ribs + slight wobble so each segment reads.
    this.geoCactus = new THREE.CylinderGeometry(0.28, 0.34, 1.9, 9);
    this.geoCactus.translate(0, 0.95, 0);
    jitter(this.geoCactus, 0.035, 0x7f4a2b);

    const viewDist = radius * CHUNK * 0.92;
    scene.fog = new THREE.Fog(0x7ec9ff, viewDist * 0.45, viewDist);

    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(viewDist * 5, viewDist * 5),
      new THREE.MeshLambertMaterial({ color: 0x2f86c9, transparent: true, opacity: 0.72, depthWrite: false })
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = WATER_LEVEL - 0.04;
    scene.add(this.water);
  }

  // Register a flat city pad. Inside `radius` the ground is exactly `y`; over
  // the next `rim` meters it eases back to natural terrain.
  registerCityFlat(x, z, y, radius, rim = 8) {
    this.cityFlats.push({ x, z, y, radius, rim });
  }

  // Register a raised STAND-ON platform (the temple floor). Inside `radius` the
  // walkable height is `y` (above the surrounding pad), so the player steps up
  // onto it rather than walking through it.
  registerPlatform(x, z, y, radius) {
    this.platforms.push({ x, z, y, radius });
  }

  // 0 inside any city's flat core, ramping to 1 past its rim. Used to fade the
  // cosmetic ground bump OUT under cities so the lumpy terrain never pokes up
  // through the flat paved slabs (that mismatch showed as grass slivers between
  // the cobbles and a hard seam across the plaza).
  cityFlatFactor(x, z) {
    let f = 1;
    for (const c of this.cityFlats) {
      const d = Math.hypot(x - c.x, z - c.z);
      if (d <= c.radius) return 0;
      const reach = c.radius + c.rim;
      if (d < reach) {
        const t = (d - c.radius) / c.rim;     // 0 at pad edge → 1 at rim edge
        f = Math.min(f, t * t * (3 - 2 * t)); // smoothstep
      }
    }
    return f;
  }

  // Register a permanent collidable circle (building wall segment, crate, etc.).
  // Indexed by chunk so solidAt's 3x3 lookup finds it cheaply. Walls are blocked
  // by laying several of these along each wall, leaving a gap for the doorway.
  addSolid(x, z, r) {
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    let list = this.fixedSolids.get(key);
    if (!list) { list = []; this.fixedSolids.set(key, list); }
    list.push({ x, z, r });
  }

  // Show or hide the whole surface (terrain chunks + water). Used when the
  // player descends into a cave so only the cave floor renders.
  setVisible(v) {
    for (const chunk of this.chunks.values()) chunk.group.visible = v;
    this.water.visible = v;
  }

  // True if (x, z) is inside any registered city pad (plus pad margin).
  _inCity(x, z, pad = 4) {
    for (const c of this.cityFlats) {
      if (Math.hypot(x - c.x, z - c.z) < c.radius + pad) return true;
    }
    return false;
  }

  // Terrain height at any world point: the mesh and the physics share this one
  // formula, so no raycasting is needed. Inside a city pad it returns the flat
  // city level, smoothly blended to natural ground across the pad rim.
  // Smooth 0..1 land mask: 1 well inside the continent, easing to 0 across the
  // shore so the map ends in open ocean instead of running forever. The radius
  // wobbles with low-frequency noise so the coastline is a ragged peninsula,
  // not a perfect circle. Cached-free; cheap enough to call per vertex.
  landMask(x, z) {
    const n = this.noise;
    // Ragged coastline: push the effective radius in/out by layered noise so the
    // shore reads as a real PENINSULA — deep bays and jutting capes, not a circle.
    const wob = (n.fbm(x * 0.0009 + 401, z * 0.0009 - 88, 3) - 0.5) * 900   // big lobes
              + (n.fbm(x * 0.0022 + 13, z * 0.0022 + 211, 4) - 0.5) * 420;  // finer inlets
    // Directional bias breaks the radial symmetry: the continent reaches further
    // south/east and pinches in the north-west, so it isn't a centred disc. The
    // angle term carves a couple of large gulfs.
    const ang = Math.atan2(z, x);
    const lobes = Math.cos(ang * 2.0 + 0.6) * 220 + Math.cos(ang * 3.0 - 1.2) * 140;
    const bias = z * 0.10 + x * 0.06;   // stretch toward +Z/+X
    const r = Math.hypot(x, z) - wob - lobes - bias;
    const inner = WORLD_RADIUS - COAST_FALLOFF;
    if (r <= inner) return 1;
    if (r >= WORLD_RADIUS) return 0;
    const t = 1 - (r - inner) / COAST_FALLOFF;   // 1 at inner edge, 0 at coast
    return t * t * (3 - 2 * t);                   // smoothstep
  }

  heightAt(x, z) {
    // City pads FIRST, with squared distances (no sqrt). A point inside a pad
    // CORE (d <= radius) is exactly that pad's flat level — and the core ALWAYS
    // wins, even if a nearby city's wider rim also reaches here, so two cities
    // whose influence zones overlap never let one city's sloping rim poke up
    // through the other's flat ground (that mismatch made walls/trees float at a
    // city edge). Resolving the core here lets us return BEFORE the expensive
    // terrain noise below — a city's chunks have thousands of in-core vertices
    // that used to compute (and discard) three fbm octaves each; skipping that is
    // what removes the hitch when crossing a city's edge. Only when a point is in
    // no core but one or more rims do we compute the natural height and blend.
    let bestRim = null, bestRimD = Infinity;
    for (const c of this.cityFlats) {
      const dx = x - c.x, dz = z - c.z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= c.radius * c.radius) return c.y;     // inside a flat core: done, no noise
      const reach = c.radius + c.rim;
      if (d2 >= reach * reach) continue;             // outside this city's reach
      const edge = Math.sqrt(d2) - c.radius;         // how far into the rim
      if (edge < bestRimD) { bestRimD = edge; bestRim = c; }
    }
    // Raised stand-on platforms (temple floor): if inside one, walk on TOP of it.
    if (this.platforms.length) {
      for (const pf of this.platforms) {
        const dx = x - pf.x, dz = z - pf.z;
        if (dx * dx + dz * dz <= pf.radius * pf.radius) return pf.y;
      }
    }

    const n = this.noise;
    const cont = n.fbm(x * 0.0016, z * 0.0016, 3);
    const hills = n.fbm(x * 0.012 + 71, z * 0.012 - 33, 4);
    const mont = n.fbm(x * 0.0045 + 503, z * 0.0045 + 211, 4);
    // Peninsula: lift the land so most of the map is solid ground, with water
    // only in the coastal lows. (Old base subtracted 0.47 → lots of sea; 0.34
    // raises the whole continent well above the waterline.)
    // Base offset raised (0.34 -> 0.30) so the whole continent sits higher above
    // the waterline: this dries up most of the big interior lakes, leaving only
    // small ponds and thin rivers (the user wanted much less inland water, like
    // the Tibia map). The coastal ocean is unaffected — it comes from landMask.
    let h = (cont - 0.30) * 52 + (hills - 0.5) * 7;
    h += Math.pow(Math.max(0, mont - 0.5) * 2, 2.2) * 55;

    // Finite continent: multiply down toward the coast and push below sea level
    // out past it, so the land genuinely ends in ocean at the world edge.
    const mask = this.landMask(x, z);
    h = (h + 6) * mask - 6;            // lift then scale so beaches stay near 0
    if (mask <= 0) h = Math.min(h, -3 - (Math.hypot(x, z) - WORLD_RADIUS) * 0.02);

    if (bestRim) {
      const t = (bestRimD) / bestRim.rim;            // 0 at pad edge, 1 at rim edge
      const k = t * t * (3 - 2 * t);                 // smoothstep
      return bestRim.y + (h - bestRim.y) * k;
    }
    return h;
  }

  // How far into the cold band (0 = none, 1 = full snow) a point sits. COLD runs
  // PURELY along the NORTH edge (-Z): the further north, the colder, with only a
  // gentle wavy border. There is no altitude chill any more — that used to frost
  // tall hills in the west and south; now snow appears ONLY in the north, and the
  // whole north reads as snow. Nothing south/west of the temperate core ever
  // turns cold.
  coldFactor(x, z, h) {
    if (h === undefined) h = this.heightAt(x, z);
    // Jagged northern snow line: a strong layered wobble so the cold edge weaves
    // in and out (frozen capes reaching south, thawed gulfs poking north) instead
    // of a near-straight band — the user wanted the ice border irregular.
    const wobble = (this.noise.fbm(x * 0.0012 + 9, z * 0.0012, 3) - 0.5) * 420
                 + (this.noise.fbm(x * 0.0035 + 51, z * 0.0035, 4) - 0.5) * 200;
    const north = -z + wobble;               // grows toward the north (-Z)
    if (north <= SNOW_EDGE) return 0;
    return Math.min(1, (north - SNOW_EDGE) / (SNOW_FULL - SNOW_EDGE));
  }

  // How far into the hot band (0 = none, 1 = full desert) a point sits. HEAT runs
  // along the EAST edge (+X): the further east, the hotter, with a wavy border.
  // High ground stays cooler so the desert never climbs the tall ridges, and the
  // far north never goes desert (cold wins where both would apply).
  heatFactor(x, z, h) {
    if (h === undefined) h = this.heightAt(x, z);
    const wobble = (this.noise.fbm(x * 0.0012 + 77, z * 0.0012 - 40, 3) - 0.5) * 480;
    let east = x + wobble;                    // grows toward the east (+X)
    east -= Math.max(0, h - 14) * 14;         // high ground stays out of the desert
    if (east <= TEMPERATE_EDGE) return 0;
    let heat = Math.min(1, (east - TEMPERATE_EDGE) / (REGION_EDGE - TEMPERATE_EDGE));
    // Cold dominates: a tile that's also turning snowy (far north) stays snowy.
    return Math.max(0, heat - this._coldRaw(x, z, h));
  }

  // The raw cold factor without the heat subtraction, used to let cold win ties.
  // Mirrors coldFactor exactly (north-only, gentle wobble, no altitude chill).
  _coldRaw(x, z, h) {
    const wobble = (this.noise.fbm(x * 0.0012 + 9, z * 0.0012, 3) - 0.5) * 420
                 + (this.noise.fbm(x * 0.0035 + 51, z * 0.0035, 4) - 0.5) * 200;
    const north = -z + wobble;
    if (north <= SNOW_EDGE) return 0;
    return Math.min(1, (north - SNOW_EDGE) / (SNOW_FULL - SNOW_EDGE));
  }

  // Cold AND heat at once, sharing the cold noise so it's computed only once.
  // Returns { cold, heat } identical to coldFactor()/heatFactor() but ~3× cheaper
  // than calling biomeAt + coldFactor + heatFactor separately (each of which
  // recomputed the same fbm). Used by the per-vertex chunk build, the hot path.
  climateAt(x, z, h) {
    const n = this.noise;
    // cold (== coldFactor == _coldRaw)
    const coldWob = (n.fbm(x * 0.0012 + 9, z * 0.0012, 3) - 0.5) * 420
                  + (n.fbm(x * 0.0035 + 51, z * 0.0035, 4) - 0.5) * 200;
    const north = -z + coldWob;
    const cold = north <= SNOW_EDGE ? 0 : Math.min(1, (north - SNOW_EDGE) / (SNOW_FULL - SNOW_EDGE));
    // heat (== heatFactor), with cold winning ties
    const heatWob = (n.fbm(x * 0.0012 + 77, z * 0.0012 - 40, 3) - 0.5) * 480;
    let east = x + heatWob - Math.max(0, h - 14) * 14;
    let heat = east <= TEMPERATE_EDGE ? 0 : Math.min(1, (east - TEMPERATE_EDGE) / (REGION_EDGE - TEMPERATE_EDGE));
    heat = Math.max(0, heat - cold);
    return { cold, heat };
  }

  // The discrete biome at a world point, derived from the smooth climate. Coast
  // (beach), peaks (mountain) and deep sea win over latitude. The snow/desert
  // bands only kick in once the cold/heat factor passes the halfway mark, so the
  // wide fringe between still reads (and spawns) as forest with frost/sand creep.
  // Returns 'beach' | 'desert' | 'snow' | 'mountain' | 'forest'.
  biomeAt(x, z, h) {
    if (h === undefined) h = this.heightAt(x, z);
    if (h < 1.4) return 'beach';
    if (h > 22) return 'mountain';
    if (this.coldFactor(x, z, h) >= 0.5) return 'snow';
    if (this.heatFactor(x, z, h) >= 0.5) return 'desert';
    return 'forest';
  }

  // True if (x, z) lies inside a tree trunk or rock footprint. `pad` widens the
  // check by the player's own radius so the body, not just its center, collides.
  solidAt(x, z, pad = 0) {
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        for (const list of [this.solids.get(key), this.fixedSolids.get(key)]) {
          if (!list) continue;
          for (const s of list) {
            const rr = s.r + pad;
            const ddx = s.x - x, ddz = s.z - z;
            if (ddx * ddx + ddz * ddz < rr * rr) return true;
          }
        }
      }
    }
    return false;
  }

  update(px, pz, buildAll = false) {
    const cx = Math.floor(px / CHUNK), cz = Math.floor(pz / CHUNK);
    if (cx !== this._cx || cz !== this._cz) {
      this._cx = cx;
      this._cz = cz;
      this._refreshQueue(cx, cz);
    }
    // Stream chunks under a per-frame TIME budget instead of a fixed count, so a
    // run of expensive chunks (e.g. the big flattened capital pad) builds one at
    // a time and never stacks two costly builds into one frame — that stacking is
    // what caused the hitch when crossing the city edge. Always build at least
    // one so streaming still keeps up.
    //
    // On a teleport/spawn (buildAll), DON'T build the whole 9×9 grid synchronously
    // — that's ~80 chunks of heavy per-vertex noise in one frame, the freeze you
    // feel arriving at a city. Build only the immediate ring under the player so
    // they land on solid ground, then let the normal time-budgeted streaming fill
    // the rest over the next frames.
    if (buildAll) {
      const SOLID = 1;   // chunks each way that must exist before the player stands
      for (let dx = -SOLID; dx <= SOLID; dx++) {
        for (let dz = -SOLID; dz <= SOLID; dz++) {
          const key = `${cx + dx},${cz + dz}`;
          if (!this.chunks.has(key)) this._buildChunk(cx + dx, cz + dz);
        }
      }
      // Drop the just-built chunks from the queue so streaming skips them.
      this.queue = this.queue.filter((q) => !this.chunks.has(q.key));
    }
    {
      // Stream AT MOST ONE chunk per frame. A single chunk is the heavy unit
      // (~3-8ms of per-vertex noise + computeVertexNormals + a GPU buffer upload),
      // so the only way to avoid a hitch when crossing into a new area is to never
      // build two in the same frame. The old "build until a 5ms deadline" budget
      // could still START a second chunk while under 5ms and then run it several ms
      // PAST the deadline — that stacking is the stutter felt at a city edge, where
      // crossing a boundary queues a fresh ring of chunks. One-per-frame fills the
      // radius-4 view over ~1-2s of spare frames, which reads as smooth pop-in, not
      // a freeze. We still build immediately (this frame) when the player is
      // standing on a gap so they never fall through un-generated ground.
      const here = `${cx},${cz}`;
      const standingOnGap = !this.chunks.has(here);
      while (this.queue.length) {
        const { key, cx: qx, cz: qz } = this.queue.shift();
        if (!this.chunks.has(key)) { this._buildChunk(qx, qz); break; }
      }
      // If we landed on a gap, the first build above filled a neighbour but maybe
      // not the cell under the player; guarantee the player's own cell exists this
      // frame too (at most one extra build, only on a true gap — rare).
      if (standingOnGap && !this.chunks.has(here)) this._buildChunk(cx, cz);
    }
    this.water.position.x = px;
    this.water.position.z = pz;
    const shimmer = Math.sin(performance.now() * 0.0012);
    this.water.position.y = WATER_LEVEL - 0.04 + shimmer * 0.03;
    this.water.material.opacity = 0.68 + shimmer * 0.06;
  }

  _refreshQueue(cx, cz) {
    const r = this.radius;
    // drop chunks that are now too far
    for (const [key, chunk] of this.chunks) {
      if (Math.max(Math.abs(chunk.cx - cx), Math.abs(chunk.cz - cz)) > r + 1) {
        this.scene.remove(chunk.group);
        chunk.terrainGeo.dispose();
        for (const m of chunk.instanced) m.dispose();
        this.chunks.delete(key);
        this.solids.delete(key);
      }
    }
    // queue the missing ones, nearest first
    this.queue.length = 0;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        if (!this.chunks.has(key)) {
          this.queue.push({ key, cx: cx + dx, cz: cz + dz, d: dx * dx + dz * dz });
        }
      }
    }
    this.queue.sort((a, b) => a.d - b.d);
  }

  _buildChunk(cx, cz) {
    const n = this.noise;
    const ox = (cx + 0.5) * CHUNK, oz = (cz + 0.5) * CHUNK;
    const group = new THREE.Group();

    // terrain
    const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, RES, RES);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + ox, wz = pos.getZ(i) + oz;
      const h = this.heightAt(wx, wz);
      // Purely-visual micro-relief: a fine high-frequency bump on top of the
      // gameplay height so grass/dirt/sand has lumps and tussocks instead of a
      // glassy surface. Kept tiny (a few cm) and NOT fed back into heightAt, so
      // collision, spawning and placement still use the smooth ground. Faded out
      // under city pads so the lumpy ground never pokes through the flat paving.
      const bumpF = this.cityFlatFactor(wx, wz);
      const bump = bumpF * ((n.fbm(wx * 0.45 + 13, wz * 0.45 - 9, 2) - 0.5) * 0.16
                 + (n.fbm(wx * 1.7 - 5, wz * 1.7 + 21, 1) - 0.5) * 0.06);
      pos.setY(i, h + bump);
      const slope = (Math.abs(this.heightAt(wx + 1.3, wz) - h) +
                     Math.abs(this.heightAt(wx, wz + 1.3) - h)) / 1.3;
      const jitter = n.hash(Math.round(wx * 7), Math.round(wz * 7));

      // Smooth climate (cold/heat) computed ONCE, then the discrete biome derived
      // from it — instead of biomeAt + coldFactor + heatFactor each recomputing
      // the same noise. This is the per-vertex hot path, so the saving is large.
      const { cold, heat } = this.climateAt(wx, wz, h);
      const biome = h < 1.4 ? 'beach' : h > 22 ? 'mountain'
                  : cold >= 0.5 ? 'snow' : heat >= 0.5 ? 'desert' : 'forest';
      if (h < 1.1) {
        // Coast: snowy shores read icy, deserts get pale sand, rest is normal sand.
        if (biome === 'snow') tmpColor.copy(C_SNOW_GRASS);
        else if (biome === 'desert') tmpColor.copy(C_DUNE_A);
        else tmpColor.copy(h < -0.8 ? C_SAND_DEEP : C_SAND);
      } else if (biome === 'snow') {
        if (h > 18 || slope > 1.15) tmpColor.copy(C_SNOW);
        else tmpColor.copy(C_SNOW_GROUND).lerp(C_SNOW_GRASS, n.fbm(wx * 0.02 + 7, wz * 0.02, 2));
      } else if (biome === 'desert') {
        if (slope > 1.0 || h > 16) tmpColor.copy(C_DRYROCK);
        else tmpColor.copy(C_DUNE_A).lerp(C_DUNE_B, n.fbm(wx * 0.02 + 51, wz * 0.02, 2));
      } else if (slope > 1.15 || h > 19) {
        // Bare rock on steep/high ground. No snowcaps outside the snow biome, so
        // peaks in the west and south stay grey rock — snow lives ONLY up north.
        tmpColor.copy(C_ROCK);
      } else {
        // Forest grass, then nudged toward frosty or dry grass by the climate so
        // the temperate→cold and temperate→hot fringes are visible underfoot,
        // with patches of actual snow/sand starting to show before the band line.
        tmpColor.copy(C_GRASS_A).lerp(C_GRASS_B, n.fbm(wx * 0.02 + 311, wz * 0.02, 2));
        if (cold > 0) {
          tmpColor.lerp(C_FROST_GRASS, Math.min(1, cold * 1.1));
          // scattered snow patches grow denser toward the band
          const patch = n.fbm(wx * 0.03 + 61, wz * 0.03, 2);
          if (patch < cold * 0.7) tmpColor.lerp(C_SNOW_GROUND, 0.6);
        } else if (heat > 0) {
          tmpColor.lerp(C_DRY_GRASS, Math.min(1, heat * 1.1));
          const patch = n.fbm(wx * 0.03 + 127, wz * 0.03, 2);
          if (patch < heat * 0.7) tmpColor.lerp(C_DUNE_A, 0.6);
        }
      }

      const m = 0.93 + jitter * 0.14;
      colors[i * 3] = tmpColor.r * m;
      colors[i * 3 + 1] = tmpColor.g * m;
      colors[i * 3 + 2] = tmpColor.b * m;
    }
    pos.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrain = new THREE.Mesh(geo, this.matTerrain);
    terrain.position.set(ox, 0, oz);
    group.add(terrain);

    // vegetation and rocks, deterministic per chunk. More attempts and lower
    // thresholds than before so woods feel full, with one lush biome mask that
    // packs whole regions with trees. Nothing spawns on the flat city pads.
    const trees = [], rocks = [], cacti = [];
    for (let i = 0; i < 40; i++) {
      const wx = cx * CHUNK + n.hash(cx * 53 + i, cz * 91 + 7) * CHUNK;
      const wz = cz * CHUNK + n.hash(cx * 67 - i, cz * 39 + 3) * CHUNK;
      if (this._inCity(wx, wz)) continue;
      const h = this.heightAt(wx, wz);
      const slope = Math.abs(this.heightAt(wx + 1.5, wz) - h) + Math.abs(this.heightAt(wx, wz + 1.5) - h);
      const rnd = n.hash(cx * 13 + i * 7, cz * 29 - i * 3);
      const biome = this.biomeAt(wx, wz, h);

      if (i < 32) {
        if (h < 1.4 || h > 17 || slope > 1.1) continue;
        const cold = this.coldFactor(wx, wz, h);
        const heat = this.heatFactor(wx, wz, h);
        // Cacti fade IN as you approach the desert (density rises with heat), and
        // a few stray ones already dot the dry savanna fringe before the band.
        if (heat > 0.15 && rnd < heat * 0.18) {
          cacti.push({ x: wx, y: h, z: wz, s: 0.8 + rnd * 2, rot: rnd * 6.28 });
          continue;
        }
        if (biome === 'desert') continue;            // deep desert: cacti only
        const forest = n.fbm(wx * 0.006 + 431, wz * 0.006 - 87, 2);
        // Lush regions: a slow, large-scale mask that drops the forest threshold
        // almost to zero, turning those areas into a near-solid canopy. Trees
        // thin toward the desert and (less so) toward the snow line.
        const lush = n.fbm(wx * 0.0025 + 911, wz * 0.0025 - 250, 2);
        let thresh = lush > 0.62 ? 0.3 : 0.45;
        thresh += heat * 0.5 + cold * 0.18;          // sparser at the hot/cold edges
        if (forest > thresh || (forest > 0.32 + heat * 0.4 && rnd < 0.35)) {
          // Pines take over gradually through the cold fringe (snowy biome = all
          // pine); below that, the colder it is the likelier a tree is a pine.
          const pine = biome === 'snow' || rnd < cold * 0.8;
          trees.push({ x: wx, y: h, z: wz, s: 0.8 + rnd * 0.7, rot: rnd * 6.28, g: n.hash(i * 31, cx + cz), pine });
        }
      } else {
        if (h < 0.8 || slope > 1.6 || rnd > 0.4) continue;
        rocks.push({ x: wx, y: h, z: wz, s: 0.5 + rnd * 2.2, rot: rnd * 6.28 });
      }
    }

    const instanced = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sv = new THREE.Vector3();

    if (trees.length) {
      const trunks = new THREE.InstancedMesh(this.geoTrunk, this.matTrunk, trees.length);
      const canopies = new THREE.InstancedMesh(this.geoCanopy, this.matCanopy, trees.length);
      trees.forEach((t, i) => {
        q.setFromAxisAngle(Y_AXIS, t.rot);
        sv.setScalar(t.s);
        v.set(t.x, t.y - 0.15, t.z);
        m4.compose(v, q, sv);
        trunks.setMatrixAt(i, m4);
        canopies.setMatrixAt(i, m4);
        // Pines (snow biome) get a dark blue-green canopy; others the usual greens.
        const a = t.pine ? C_PINE_A : C_CANOPY_A, b = t.pine ? C_PINE_B : C_CANOPY_B;
        canopies.setColorAt(i, tmpColor.copy(a).lerp(b, t.g));
      });
      trunks.frustumCulled = canopies.frustumCulled = false;
      group.add(trunks, canopies);
      instanced.push(trunks, canopies);
    }

    if (rocks.length) {
      const rocksMesh = new THREE.InstancedMesh(this.geoRock, this.matRock, rocks.length);
      rocks.forEach((r, i) => {
        q.setFromAxisAngle(Y_AXIS, r.rot);
        sv.set(r.s * 0.85, r.s, r.s * 1.1);
        v.set(r.x, r.y - 0.12, r.z);
        m4.compose(v, q, sv);
        rocksMesh.setMatrixAt(i, m4);
      });
      rocksMesh.frustumCulled = false;
      group.add(rocksMesh);
      instanced.push(rocksMesh);
    }

    if (cacti.length) {
      const cactusMesh = new THREE.InstancedMesh(this.geoCactus, this.matCactus, cacti.length);
      cacti.forEach((c, i) => {
        q.setFromAxisAngle(Y_AXIS, c.rot);
        sv.set(c.s, c.s * 1.3, c.s);
        v.set(c.x, c.y, c.z);
        m4.compose(v, q, sv);
        cactusMesh.setMatrixAt(i, m4);
      });
      cactusMesh.frustumCulled = false;
      group.add(cactusMesh);
      instanced.push(cactusMesh);
    }

    // collision footprints: trunk radius scales with tree size, rocks a bit wider
    const solids = [];
    for (const t of trees) solids.push({ x: t.x, z: t.z, r: 0.3 + t.s * 0.22 });
    for (const r of rocks) solids.push({ x: r.x, z: r.z, r: 0.45 + r.s * 0.5 });
    for (const c of cacti) solids.push({ x: c.x, z: c.z, r: 0.3 + c.s * 0.2 });

    this.scene.add(group);
    const key = `${cx},${cz}`;
    this.chunks.set(key, { cx, cz, group, terrainGeo: geo, instanced });
    this.solids.set(key, solids);
  }
}
