import * as THREE from 'three';

// Procedural weather that rides on top of DayNight. The game picks its own
// weather (no external API): every WEATHER_MIN..WEATHER_MAX seconds it rolls a
// new state and crosses-fades into it. States: clear, rain, storm (rain + thunder
// flashes), snow, fog. Snow is gated to the NORTH only — it can only roll where
// world.coldFactor(playerPos) says it's cold, matching the snow biome.
//
// Runs AFTER daynight.update() each frame so it gets the last word on fog
// near/far and on the ambient flash from lightning. It never *replaces* the
// surface fog object the world built — it only nudges its near/far (and restores
// them when the weather clears), so the base map fog the user already has is
// preserved.

// Weather is driven by the REAL WALL CLOCK so it's the SAME for every player at
// once (a global sky, with no server: everyone reads the same clock and the same
// deterministic hash). Time is sliced into fixed WINDOW-long blocks since the
// epoch; in each block the weather either precipitates for the first DURATION and
// is clear for the rest, or stays clear the whole block — decided by a hash of the
// block index against the zone's chance. When DURATION ends the sky clears and the
// count toward the next block carries on automatically (the blocks tile the clock).
//
//   • every 3 h:  10% chance it RAINS (temperate), 40% chance it SNOWS (north)
//   • when it does, it lasts 2 h, then clears until the next 3 h block
const HOUR_MS = 3600 * 1000;
const WEATHER_WINDOW = 3 * HOUR_MS;   // one weather "draw" every 3 real hours
const WEATHER_DURATION = 2 * HOUR_MS; // precipitation lasts 2 real hours
const RAIN_CHANCE = 0.10;             // 10% of 3-hour windows rain (temperate)
const SNOW_CHANCE = 0.40;             // 40% of 3-hour windows snow (north)
// When it IS raining, this share of rainy windows are thunderstorms — but the
// lightning only actually shows AT NIGHT (see update); by day a storm is just
// heavier rain with no thunder.
const STORM_SHARE = 0.40;

// Seconds to cross-fade between two weather states (particles fade, fog eases in).
const FADE = 4;

// Particle counts — kept modest so phones cope. Rain is drawn as short vertical
// LINE streaks (so it reads as falling droplets, not square pixels); snow is a
// slower drifting flake field of round points. Both follow the player in a tall
// box.
const RAIN_COUNT = 2200;   // denser so rain reads as a continuous downpour, not sparse
const SNOW_COUNT = 900;
const BOX_XZ = 60;     // half-width of the particle box around the player (x/z)
const BOX_Y = 70;      // height of the particle column
const DROP_LEN = 1.6;  // length of each rain streak (top vertex sits this above the bottom)

// Each state's target "intensity" for the three knobs we tween: how many
// particles show (0..1 of the field), how much extra fog rolls in, and whether
// it's the snow field rather than rain. clearForm is the resting state.
const STATES = {
  clear: { rain: 0, snow: 0, fog: 0, thunder: false },
  rain:  { rain: 1, snow: 0, fog: 0.35, thunder: false },
  storm: { rain: 1, snow: 0, fog: 0.5, thunder: true },
  snow:  { rain: 0, snow: 1, fog: 0.3, thunder: false },
  fog:   { rain: 0, snow: 0, fog: 1, thunder: false },
};

// Madrid's UTC offset (in ms) at a given instant, derived from Intl so CET/CEST
// DST is handled. Returns 0 if Intl is unavailable (then the clock is plain UTC,
// still global). A module-level cached formatter keeps it cheap.
let _madridFmt = null;
function madridOffsetMs(now) {
  try {
    if (!_madridFmt) {
      _madridFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Madrid', hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    }
    const p = {};
    for (const part of _madridFmt.formatToParts(new Date(now))) p[part.type] = part.value;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
    return asUTC - now;
  } catch (_) { return 0; }
}

export class Weather {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.enabled = true;

    // Tweened live values (move toward the current state's targets).
    this.rainAmt = 0;
    this.snowAmt = 0;
    this.fogAmt = 0;
    this.thunder = false;
    this.flash = 0;          // 0..1 lightning brightness, decays each frame

    // Deterministic-ish RNG (seeded so reloads aren't wildly different, but it
    // still wanders). Math.random isn't available in some harness contexts; this
    // LCG is self-contained.
    this._s = 0x9e3779b9 >>> 0;

    this.state = 'clear';
    this.target = STATES.clear;
    this._zone = null;        // weather biome the player is in; set on first update
    // Gust envelope (0..1): rain density swells and dips so it falls in waves /
    // bursts ("rachas") rather than a flat sheet — but never drops to nothing, so
    // it stays continuous while it lasts. Driven by a slow time wave in update().
    this._gust = 1;

    this._buildRain(scene);
    this._buildSnow(scene);

    // Remember the base surface fog distances so "fog" weather can pull them in
    // and then ease them back out. Filled in lazily on first update once we know
    // scene.fog exists.
    this._baseNear = null;
    this._baseFar = null;
    this._tmpFlash = new THREE.Color();
  }

  _rnd() {
    this._s = (Math.imul(this._s, 1664525) + 1013904223) >>> 0;
    return this._s / 4294967296;
  }

  // Which weather BIOME the player currently stands in. Weather is driven by
  // zone, not a global roll:
  //   • ice       (cold north)  -> snow
  //   • desert    (hot east)    -> nothing, ever (always clear)
  //   • temperate (everywhere else) -> rain / storm
  // Cold wins over heat where they'd overlap (the far north never goes desert).
  _zoneOf(playerPos) {
    const cold = this.world?.coldFactor ? this.world.coldFactor(playerPos.x, playerPos.z) : 0;
    const heat = this.world?.heatFactor ? this.world.heatFactor(playerPos.x, playerPos.z) : 0;
    if (cold > 0.3) return 'ice';
    if (heat > 0.4) return 'desert';
    return 'temperate';
  }

  // The current wall-clock instant in milliseconds, anchored to SPAIN's local time
  // (Europe/Madrid) so the 3-hour weather windows line up with Spanish clock hours
  // and every player worldwide reads the SAME window regardless of their own
  // timezone. = UTC now + Madrid's current offset (handles CET/CEST DST via Intl).
  // The offset is cached and refreshed at most once a minute (it only ever changes
  // on the two DST switch days), so this stays cheap to call every frame.
  _spainNow() {
    let now;
    try { now = Date.now(); } catch (_) { return 0; }
    if (this._spainOff === undefined || now - (this._spainOffAt || 0) > 60000) {
      this._spainOff = madridOffsetMs(now);
      this._spainOffAt = now;
    }
    return now + this._spainOff;
  }

  // Deterministic 0..1 hash of an integer (the 3-hour window index). Same input →
  // same output on every device, so the global sky agrees without any networking.
  _hash01(n) {
    let h = (n ^ 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  }

  // Decide, from the SPANISH wall clock alone, what the sky should be doing in the
  // player's current zone right now. Returns one of 'clear' | 'rain' | 'storm' |
  // 'snow'. Pure function of the clock + zone → identical for everyone.
  //   window index = floor(spainNow / 3h); precipitates only in the window's first
  //   2 hours, and only if the window's hash falls under the zone's chance.
  _clockState(zone) {
    if (zone === 'desert') return 'clear';        // desert never precipitates
    const now = this._spainNow();
    const win = Math.floor(now / WEATHER_WINDOW);
    const phase = now - win * WEATHER_WINDOW;      // ms into this 3-hour window
    if (phase >= WEATHER_DURATION) return 'clear'; // past the 2-hour wet spell
    if (zone === 'ice') {
      // Snow: 40% of windows. Use a salted hash so rain/snow draws don't correlate.
      return this._hash01(win * 2 + 1) < SNOW_CHANCE ? 'snow' : 'clear';
    }
    // Temperate: 10% of windows rain; of those, STORM_SHARE are thunderstorms.
    if (this._hash01(win * 2) >= RAIN_CHANCE) return 'clear';
    return this._hash01(win * 7 + 3) < STORM_SHARE ? 'storm' : 'rain';
  }

  // Force a specific weather state (used by the clock driver, and handy for
  // debugging from the console: weather.setState('storm')).
  setState(name) {
    if (!STATES[name]) return;
    this.state = name;
    this.target = STATES[name];
  }

  // A soft round sprite for snow flakes: a white radial-gradient disc on a
  // transparent canvas. Without a map, PointsMaterial draws hard SQUARES; this
  // texture makes each point a fuzzy circle so snow reads as flakes, not blocks.
  _flakeTexture() {
    if (this._flakeTex) return this._flakeTex;
    const S = 32;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.85)');
    g.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(c);
    this._flakeTex = tex;
    return tex;
  }

  _buildField(count, color, size, opacity) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (this._rnd() - 0.5) * BOX_XZ * 2;
      pos[i * 3 + 1] = this._rnd() * BOX_Y;
      pos[i * 3 + 2] = (this._rnd() - 0.5) * BOX_XZ * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color, size, transparent: true, opacity, depthWrite: false,
      sizeAttenuation: true, fog: false,
      map: this._flakeTexture(),   // round soft sprite instead of a hard square
      alphaTest: 0.01,
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;   // box follows the player; never cull it
    pts.visible = false;
    this.scene.add(pts);
    return pts;
  }

  // Rain as short vertical line segments — two vertices per drop (a bottom and a
  // top DROP_LEN above it). LineSegments draws each pair as a thin streak, which
  // reads as a falling droplet instead of a square point sprite.
  _buildRain(scene) {
    const pos = new Float32Array(RAIN_COUNT * 2 * 3);   // 2 verts per drop
    for (let i = 0; i < RAIN_COUNT; i++) {
      const x = (this._rnd() - 0.5) * BOX_XZ * 2;
      const y = this._rnd() * BOX_Y;
      const z = (this._rnd() - 0.5) * BOX_XZ * 2;
      const b = i * 6;
      pos[b]     = x; pos[b + 1] = y;            pos[b + 2] = z;   // bottom vertex
      pos[b + 3] = x; pos[b + 4] = y + DROP_LEN; pos[b + 5] = z;   // top vertex
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xaecbe6, transparent: true, opacity: 0.55, depthWrite: false, fog: false,
    });
    this.rain = new THREE.LineSegments(g, mat);
    this.rain.frustumCulled = false;   // box follows the player; never cull it
    this.rain.visible = false;
    scene.add(this.rain);
    this.rainSpeed = 130;              // units/sec downward
  }

  // Step the rain streaks down, keeping each drop's two vertices DROP_LEN apart,
  // wrapping to the top once the streak falls past the ground, and re-centering
  // the field on the player.
  _stepRain(dt, playerPos) {
    const arr = this.rain.geometry.attributes.position.array;
    const drop = this.rainSpeed * dt;
    for (let b = 0; b < arr.length; b += 6) {
      arr[b + 1] -= drop;            // bottom y
      arr[b + 4] -= drop;            // top y
      if (arr[b + 1] < 0) {          // streak fell below ground -> respawn at top
        const x = (this._rnd() - 0.5) * BOX_XZ * 2;
        const z = (this._rnd() - 0.5) * BOX_XZ * 2;
        const y = BOX_Y;
        arr[b]     = x; arr[b + 1] = y;            arr[b + 2] = z;
        arr[b + 3] = x; arr[b + 4] = y + DROP_LEN; arr[b + 5] = z;
      }
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
    this.rain.position.set(playerPos.x, 0, playerPos.z);
  }

  _buildSnow(scene) {
    this.snow = this._buildField(SNOW_COUNT, 0xffffff, 1.8, 0.9);
    this.snowSpeed = 14;         // flakes fall slow
  }

  // Step a particle field down by `speed*dt`, wrapping back to the top and
  // re-centering the box on the player so it always surrounds them. Snow also
  // sways sideways a touch for a drifting feel.
  _stepField(pts, speed, dt, playerPos, sway) {
    const arr = pts.geometry.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= speed * dt;
      if (sway) {
        arr[i] += Math.sin((arr[i + 1] + i) * 0.08) * sway * dt;
      }
      if (arr[i + 1] < 0) {
        arr[i + 1] += BOX_Y;
        arr[i] = (this._rnd() - 0.5) * BOX_XZ * 2;
        arr[i + 2] = (this._rnd() - 0.5) * BOX_XZ * 2;
      }
    }
    pts.geometry.attributes.position.needsUpdate = true;
    pts.position.set(playerPos.x, 0, playerPos.z);
  }

  update(playerPos, dt, daynight) {
    if (!this.enabled) return;

    // The sky is a pure function of the Spanish wall clock + the player's zone, so
    // it's the same for everyone and updates instantly when you cross a biome
    // border (rain<->snow, clear in the desert) — no per-player timer/roll.
    const zone = this._zoneOf(playerPos);
    this.setState(this._clockState(zone));

    const t = this.target;

    // Ease live amounts toward targets. FADE seconds for a full 0->1 move.
    const k = Math.min(1, dt / FADE);
    this.rainAmt += (t.rain - this.rainAmt) * k;
    this.snowAmt += (t.snow - this.snowAmt) * k;
    this.fogAmt  += (t.fog  - this.fogAmt ) * k;
    // Thunder only at NIGHT (Spanish clock, via daynight which we tie to Spain).
    // A daytime storm is just heavier rain with no lightning.
    this.thunder = t.thunder && !!(daynight && daynight.isNight && daynight.isNight());

    // GUST envelope: swell rain density in slow waves so it falls in bursts
    // ("rachas") instead of a flat curtain — but it stays between 0.7 and 1.0, so
    // the rain is always continuous while it lasts, never cutting out. Two offset
    // sine waves give an irregular, non-repeating-feeling pulse.
    try {
      const ms = performance.now();
      const w = 0.5 + 0.5 * Math.sin(ms * 0.00035) * Math.sin(ms * 0.00013 + 1.7);
      this._gust = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(ms * 0.0009)) * (0.6 + 0.4 * w);
    } catch (_) { this._gust = 1; }

    // --- Rain (line streaks) ---
    this.rain.visible = this.rainAmt > 0.01;
    if (this.rain.visible) {
      // Denser, more continuous rain: higher base opacity, modulated by the gust
      // so it visibly pulses in waves without ever thinning to nothing.
      this.rain.material.opacity = (0.55 + 0.35 * this.rainAmt) * this.rainAmt * this._gust;
      this._stepRain(dt, playerPos);
    }

    // --- Snow ---
    this.snow.visible = this.snowAmt > 0.01;
    if (this.snow.visible) {
      this.snow.material.opacity = 0.9 * this.snowAmt;
      this._stepField(this.snow, this.snowSpeed, dt, playerPos, 6);
    }

    // --- Fog: pull the existing surface fog in for rain/storm/snow/fog, then
    // ease it back out. We only touch near/far, never the fog object/color, so
    // the day/night tint and the base map fog are preserved.
    const fog = this.scene.fog;
    if (fog && fog.near !== undefined) {
      if (this._baseNear === null) { this._baseNear = fog.near; this._baseFar = fog.far; }
      // At full fogAmt, near/far shrink to ~25%/45% of base for a thick haze.
      const f = this.fogAmt;
      fog.near = this._baseNear * (1 - f * 0.75);
      fog.far  = this._baseFar  * (1 - f * 0.55);
    }

    // --- Thunder: random flashes during storms. Each flash spikes `flash` to 1
    // and decays; we ride it onto the day/night lights so the whole scene blinks.
    if (this.thunder && this.rainAmt > 0.4) {
      // ~ one flash every few seconds on average.
      if (this._rnd() < dt * 0.5) this.flash = 1;
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 4);
      if (daynight?.sun) {
        // Boost sun + hemi briefly. daynight.update ran first and set these, so
        // we add on top; next frame daynight resets them.
        daynight.sun.intensity += this.flash * 2.2;
        if (daynight.hemi) daynight.hemi.intensity += this.flash * 1.5;
      }
      // Briefly lift the sky toward white-blue for the flash.
      if (this.scene.background?.isColor) {
        this.scene.background.lerp(this._tmpFlash.setHex(0xdfe9ff), this.flash * 0.6);
      }
    }
  }

  // Hide all weather and restore the base fog — used when going underground / into
  // houses so the surface weather doesn't bleed into other places.
  setActive(v) {
    this.enabled = v;
    if (!v) {
      this.rain.visible = false;
      this.snow.visible = false;
      const fog = this.scene.fog;
      if (fog && this._baseNear !== null) { fog.near = this._baseNear; fog.far = this._baseFar; }
      // forget the base so it re-captures the next surface fog on re-enable
      this._baseNear = null; this._baseFar = null;
    }
  }
}
