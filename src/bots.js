import * as THREE from 'three';
import { buildCharacter } from './character.js';
import { EquipVisuals } from './equipVisuals.js';
import { WEAPONS, ARMORS } from './data/items.js';
import { PROFESSIONS, jobTitle } from './data/professions.js';

// Ambient "bot" players: fake, LOCAL-ONLY humans that make the world feel
// populated. They look like real players (a buildCharacter model dressed with
// EquipVisuals, a name/level/job tag), wander around, some pretend to hunt
// creatures (attack animation only — they deal NO damage), and some post lines
// to the chat. They have NO hit points and cannot die.
//
// Performance: each active bot costs about as much as a remote peer. To allow
// many bots spread across the whole map cheaply, the 3D model is built lazily
// and only while the bot is within RENDER_RADIUS of the player; far bots are
// just a moving (x,z) record with no mesh. So ~40 bots on the map keep only a
// handful of live models at once.

const MIN_LEVEL = 16;
const MAX_LEVEL = 58;
const RENDER_RADIUS = 80;     // build/animate the model only within this range
const CULL_RADIUS = 96;       // dispose the model once past this (hysteresis)
const WALK_SPEED = 0.7;       // m/s strolling (matches town NPCs)
const RUN_SPEED = 4.8;        // m/s for the "running around town" city bots (player walks 4.6)
const HUNT_SPEED = 1.4;       // a touch quicker when closing on prey
const HOME_RADIUS = 9;        // how far a bot strolls from its home spot
const CITY_WALK_RADIUS = 14;  // the calmer city walkers stay nearer home
const HUNTER_SEEK = 16;       // a hunter looks for prey within this radius
const ATTACK_RANGE = 1.9;     // pretend-attack when this close to a creature
const ATTACK_PERIOD = 1.4;    // seconds between swing animations
const CITY_BOTS = 4;          // one per profession inside each city
const JUMP_V = 4.2;           // initial upward speed of an occasional hop (m/s)
const GRAVITY = 18;           // m/s^2 pulling a hop back down

// Face/hair style options, copied as literals from character.js (not exported
// there). Used to randomize bot appearance.
const HAIR  = ['short', 'long', 'spiky', 'buzz', 'curly', 'mohawk', 'bun', 'ponytail', 'afro'];
const NOSE  = ['small', 'round', 'pointy', 'button', 'wide'];
const MOUTH = ['smile', 'neutral', 'grin', 'smirk'];
const EYES  = ['normal', 'happy', 'bored', 'sleepy', 'angry'];
const BROWS = ['normal', 'raised', 'angry', 'sad'];
const EARS  = ['normal', 'big', 'elf', 'small'];

const SKIN_COLORS  = ['#f2c79b', '#e7b58a', '#d49a6a', '#a86f44', '#8a5a32', '#f7d7b5'];
const SHIRT_COLORS = ['#3498db', '#c0392b', '#27ae60', '#8e44ad', '#e67e22', '#16a085', '#2c3e50', '#d4ac0d'];
const PANTS_COLORS = ['#34495e', '#5d4037', '#212f3d', '#4a3b2a', '#2e4053'];
const HAIR_COLORS  = ['#2b1b10', '#4a2f1b', '#7a4a22', '#c8a24a', '#1c1c1c', '#8b3a2f', '#9aa0a6'];

// Believable player-ish names (no number suffixes — kept "real").
const FIRST_NAMES = [
  'Aldric', 'Mira', 'Borin', 'Sela', 'Thane', 'Lyra', 'Kael', 'Bruno', 'Elena', 'Dmitri',
  'Rurik', 'Noa', 'Garrik', 'Niamh', 'Soren', 'Vesna', 'Marek', 'Talia', 'Edric', 'Runa',
  'Cassian', 'Ingrid', 'Doran', 'Yara', 'Felix', 'Sabine', 'Olen', 'Petra', 'Hagen', 'Liora',
  'Tobias', 'Greta', 'Roland', 'Mara', 'Cedric', 'Astrid', 'Joran', 'Selene', 'Bastian', 'Freya',
];

// Ambient chat in both languages; one is posted every ~12-25s globally.
const CHAT_LINES = {
  es: [
    'alguien va a la cueva?', 'vendo espada de hierro barata', 'subí de nivel!',
    'alguien para cazar trolls?', 'dónde está el banco?', 'buena pesca por aquí',
    'me falta poco para tier 2', 'cuidado con las arañas del norte', 'gg',
    'alguien tiene pociones de maná?', 'qué calor en el desierto', 'voy al templo',
    'busco grupo para el laberinto', 'esta zona da buena exp',
  ],
  en: [
    'anyone going to the cave?', 'selling cheap iron sword', 'just leveled up!',
    'anyone hunting trolls?', 'where is the bank?', 'good fishing here',
    'almost tier 2', 'watch out for the northern spiders', 'gg',
    'anyone got mana potions?', 'so hot in the desert', 'heading to the temple',
    'lf group for the labyrinth', 'this zone gives nice exp',
  ],
};

// Congratulation lines bots post when someone LEVELS UP. Half are generic
// ("gratz!"), half address the player by name ("{name} gratz!") via {name}.
const GRATZ_LINES = {
  es: [
    'felicidades!', 'gratz!', 'felicidades {name}!', 'gz {name}', 'bien hecho!',
    'gz!', 'enhorabuena {name}', 'a por el siguiente nivel!', 'grande {name}!', 'nivel up gz',
    'vamos {name}!', 'qué máquina {name}', 'sigue así!', 'crack {name}!', 'menudo nivelazo',
    'gg {name}', 'bien jugado {name}', 'imparable {name}!', 'subiendo como la espuma',
    'felicidades crack!', 'te lo has currado {name}', 'otro más para la cuenta!',
    'enhorabuena, sigue subiendo', 'eso es! {name}', 'qué rápido subes {name}',
    'figura {name}!', 'sigue rompiéndola', 'nivel nuevo, gz!', 'ese {name}!',
  ],
  en: [
    'congratulations!', 'gratz!', 'congrats {name}!', 'gz {name}', 'well done!',
    'gz!', 'nice one {name}', 'on to the next level!', 'way to go {name}!', 'level up gratz',
    'lets go {name}!', 'you beast {name}', 'keep it up!', 'legend {name}!', 'huge level',
    'gg {name}', 'well played {name}', 'unstoppable {name}!', 'leveling like crazy',
    'congrats champ!', 'you earned it {name}', 'one more for the count!',
    'grats, keep climbing', 'thats it {name}!', 'so fast {name}',
    'star player {name}!', 'keep crushing it', 'fresh level, gz!', 'go {name}!',
  ],
};

// Group item data once at module load so spawn() is cheap.
const WEAPONS_BY_TYPE = {};
for (const w of WEAPONS) (WEAPONS_BY_TYPE[w.type] || (WEAPONS_BY_TYPE[w.type] = [])).push(w);
const ARMORS_BY_SLOT = {};
for (const a of ARMORS) (ARMORS_BY_SLOT[a.slot] || (ARMORS_BY_SLOT[a.slot] = [])).push(a);
for (const k in WEAPONS_BY_TYPE) WEAPONS_BY_TYPE[k].sort((a, b) => (a.levelReq || 1) - (b.levelReq || 1));
for (const k in ARMORS_BY_SLOT) ARMORS_BY_SLOT[k].sort((a, b) => (a.levelReq || 1) - (b.levelReq || 1));

// Four playable professions: knight (melee), paladin=Archer (bow), mage/druid (wand).
const PROFS = PROFESSIONS;

// Deterministic PRNG so each bot's stroll is stable per seed (from worldNpcs.js).
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smoothly rotate toward a target angle, never overshooting (from worldNpcs.js).
function turnToward(from, to, maxStep) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// Items use `id`; EquipVisuals reads `baseId`. Bridge the two.
const asItem = (entry) => (entry ? { ...entry, baseId: entry.id } : null);

// Highest-tier item of a pool the bot's level allows, with a small random
// downgrade so loadouts of equal-level bots still vary a little.
function bestForLevel(pool, level, rng) {
  if (!pool || !pool.length) return null;
  const allowed = pool.filter((it) => (it.levelReq || 1) <= level);
  const usable = allowed.length ? allowed : [pool[0]];
  // index of the best allowed item, then step back 0-2 tiers at random.
  let i = usable.length - 1 - Math.floor(rng() * Math.min(3, usable.length));
  if (i < 0) i = 0;
  return usable[i];
}

export class Bots {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.bots = [];
    this._chatCooldown = 8;   // first ambient line a few seconds in
    this._visible = true;
    // Pending level-up congratulations: a queue of { bot, line } drained one at a
    // time every 3-5s so the bots cheer in a trickle, not all at once.
    this._gratzQueue = [];
    this._gratzTimer = 0;
    this._lang = 'es';
  }

  // Someone (the player or a peer) just levelled up: line up a few nearby bots to
  // congratulate them, staggered. We DON'T post anything now — tick() releases one
  // line every 3-5s from the queue so it reads like people reacting over a few
  // seconds rather than a wall of identical messages.
  congratulate(targetName, lang = this._lang) {
    if (!this.bots.length) return;
    this._lang = lang === 'en' ? 'en' : 'es';
    const lines = GRATZ_LINES[this._lang];
    // 3-5 distinct bots react (or as many as exist).
    const howMany = Math.min(this.bots.length, 3 + Math.floor(Math.random() * 3));
    const pool = this.bots.slice();
    for (let i = 0; i < howMany; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const bot = pool.splice(idx, 1)[0];
      let line = lines[Math.floor(Math.random() * lines.length)];
      line = line.replace('{name}', targetName || '');
      this._gratzQueue.push({ name: bot.name, line });
    }
    // First cheer comes after a short, human-ish beat.
    if (this._gratzTimer <= 0) this._gratzTimer = 1 + Math.random() * 1.5;
  }

  // Build the data records for every bot: CITY_BOTS per city (one per
  // profession) plus 1-2 wanderers/hunters scattered around each zone. No 3D
  // model is created here — that happens lazily in _ensureModel when near.
  spawn(cities, zones, { lang = 'es' } = {}) {
    this.clear();
    const usedNames = new Set();
    let seed = 0x9e37 ^ (cities.length * 131 + zones.length);
    const rng = mulberry(seed);
    const nextName = () => {
      // pick an unused name; fall back to any if the pool runs dry.
      for (let tries = 0; tries < 40; tries++) {
        const n = pick(FIRST_NAMES, rng);
        if (!usedNames.has(n)) { usedNames.add(n); return n; }
      }
      return pick(FIRST_NAMES, rng);
    };

    // --- City bots: one of each profession, levels spread across the range. ---
    // ALL FOUR roam the whole city corner to corner (centered on the city, big
    // radius) so nobody just loiters in the middle. The first two RUN it (like
    // errand-runners going shop to shop); the other two WALK it, exploring
    // between the buildings.
    for (const city of cities) {
      const flat = this._cityFlat(city);
      const cityFlat = flat ? flat.y : this.world.heightAt(city.x, city.z);
      const cityRadius = flat ? Math.max(24, flat.radius - 14) : 40;  // most of the pad, minus a wall margin
      for (let p = 0; p < CITY_BOTS && p < PROFS.length; p++) {
        const prof = PROFS[p];
        // Spread the four city bots evenly across 16..58 with a little jitter.
        const base = MIN_LEVEL + Math.round((MAX_LEVEL - MIN_LEVEL) * (p / (CITY_BOTS - 1)));
        const level = clampLevel(base + Math.floor(rng() * 7 - 3));
        const runner = p < 2;
        // Spawn anywhere across the city, not clustered at the center.
        const a = rng() * Math.PI * 2, r = (0.2 + rng() * 0.8) * cityRadius;
        this._addBot({
          name: nextName(), prof, level, lang, rng,
          homeX: city.x + Math.cos(a) * r, homeZ: city.z + Math.sin(a) * r,
          role: 'wander',
          groundY: cityFlat,
          // Everyone roams around the CITY CENTER across the full pad; only the
          // pace differs (run vs walk-and-explore).
          roamCenterX: city.x, roamCenterZ: city.z,
          roamRadius: cityRadius, roamSpeed: runner ? RUN_SPEED : WALK_SPEED,
          runner,
          explorer: !runner,   // walkers should keep crossing the city, not idle
        });
      }
    }

    // --- Zone bots: 1-2 each, scattered, level biased to the zone difficulty. ---
    for (const zone of zones) {
      const n = 1 + (rng() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const prof = pick(PROFS, rng);
        const zMin = Math.max(MIN_LEVEL, zone.levelMin || MIN_LEVEL);
        const zMax = Math.min(MAX_LEVEL, Math.max(zMin, zone.levelMax || MAX_LEVEL));
        const level = clampLevel(zMin + Math.floor(rng() * (zMax - zMin + 1)));
        const a = rng() * Math.PI * 2, r = (zone.radius || 120) * (0.3 + rng() * 0.5);
        this._addBot({
          name: nextName(), prof, level, lang, rng,
          homeX: zone.center.x + Math.cos(a) * r, homeZ: zone.center.z + Math.sin(a) * r,
          role: rng() < 0.6 ? 'hunter' : 'wander',     // wilderness bots mostly hunt
          groundY: null,
        });
      }
    }
  }

  // The registered flat pad nearest a city center (gives its y level + radius),
  // or null if pads aren't registered. Cities sit on these flats.
  _cityFlat(city) {
    const flats = this.world.cityFlats || [];
    let best = null, bestD = Infinity;
    for (const f of flats) {
      const d = Math.hypot(f.x - city.x, f.z - city.z);
      if (d < bestD) { bestD = d; best = f; }
    }
    return (best && bestD < 60) ? best : null;
  }

  _addBot(opts) {
    const { name, prof, level, lang, rng, homeX, homeZ } = opts;
    const weapon = this._pickWeapon(prof, level, rng);
    const equip = {
      weapon,
      // Only knights carry a shield, and only with a one-handed weapon.
      shield: (prof.id === 'knight' && weapon && !weapon.twoHanded)
        ? asItem(bestForLevel(WEAPONS_BY_TYPE.shield, level, rng)) : null,
      helmet: asItem(bestForLevel(ARMORS_BY_SLOT.helmet, level, rng)),
      armor:  asItem(bestForLevel(ARMORS_BY_SLOT.armor, level, rng)),
      legs:   asItem(bestForLevel(ARMORS_BY_SLOT.legs, level, rng)),
      boots:  asItem(bestForLevel(ARMORS_BY_SLOT.boots, level, rng)),
      amulet: rng() < 0.5 ? asItem(bestForLevel(ARMORS_BY_SLOT.amulet, level, rng)) : null,
    };
    const profile = {
      colors: {
        skin: pick(SKIN_COLORS, rng), shirt: pick(SHIRT_COLORS, rng),
        pants: pick(PANTS_COLORS, rng), hair: pick(HAIR_COLORS, rng),
      },
      sex: rng() < 0.5 ? 'male' : 'female',
      hair: pick(HAIR, rng), nose: pick(NOSE, rng), mouth: pick(MOUTH, rng),
      eyes: pick(EYES, rng), brows: pick(BROWS, rng), ears: pick(EARS, rng),
    };
    const tagText = `${name}  Lvl ${level}  ${jobTitle(prof.id, level, lang)}`;
    this.bots.push({
      id: 'bot' + this.bots.length, name, prof, level, profile, equip,
      weaponType: weapon ? weapon.type : null, tagText,
      role: opts.role, homeX, homeZ,
      // Where this bot wanders and how fast. Roam around an explicit center
      // (city runners) or around its own home spot (everyone else).
      roamCenterX: opts.roamCenterX != null ? opts.roamCenterX : homeX,
      roamCenterZ: opts.roamCenterZ != null ? opts.roamCenterZ : homeZ,
      roamRadius: opts.roamRadius != null ? opts.roamRadius : HOME_RADIUS,
      roamSpeed: opts.roamSpeed != null ? opts.roamSpeed : WALK_SPEED,
      runner: !!opts.runner,
      explorer: !!opts.explorer,   // keeps crossing the city, minimal idling
      x: homeX, z: homeZ, y: opts.groundY != null ? opts.groundY : this.world.heightAt(homeX, homeZ),
      yaw: rng() * Math.PI * 2,
      targetX: homeX, targetZ: homeZ, waitT: rng() * 3,
      walkPhase: rng() * 6, attackT: 0, rng,
      jumpY: 0, jumpV: 0, jumpCd: 3 + rng() * 8,   // occasional hop while moving
      char: null, ev: null, tag: null,
    });
  }

  _pickWeapon(prof, level, rng) {
    // Weapon TYPE must match the profession (knight melee, archer bow, mage/druid
    // wand) so the bot "dresses like a level-N <profession>".
    const types = prof.allowedWeapons.filter((t) => t !== 'shield');
    const type = types.length ? pick(types, rng) : 'sword';
    return asItem(bestForLevel(WEAPONS_BY_TYPE[type], level, rng));
  }

  // Create the 3D model + tag on demand (called when a bot comes into range).
  _ensureModel(bot) {
    if (bot.char) return;
    const char = buildCharacter(bot.profile);
    const ev = new EquipVisuals(char);
    ev.refresh(bot.equip, bot.level);
    const tag = this._makeTag(bot.tagText);
    char.group.add(tag.sprite);
    tag.sprite.position.y = 2.25;
    char.group.visible = this._visible;
    this.scene.add(char.group);
    bot.char = char; bot.ev = ev; bot.tag = tag;
  }

  _disposeModel(bot) {
    if (!bot.char) return;
    this.scene.remove(bot.char.group);
    bot.char.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    if (bot.tag) { bot.tag.tex.dispose(); bot.tag.sprite.material.dispose(); }
    bot.char = null; bot.ev = null; bot.tag = null;
  }

  // Name/level/job tag — like peers.js but multi-part text on one sprite.
  _makeTag(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 64;
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.9, 0.58, 1);
    sprite.renderOrder = 999;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(text, 160, 34);
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText(text, 160, 34);
    tex.needsUpdate = true;
    return { canvas, tex, sprite };
  }

  _pickRoam(bot) {
    // City bots (runners + explorers) bias toward FAR points across the pad so
    // they genuinely cross the city corner to corner instead of milling in the
    // middle; home-bound strollers pick anywhere within their small radius.
    const a = bot.rng() * Math.PI * 2;
    const frac = (bot.runner || bot.explorer) ? (0.55 + bot.rng() * 0.45) : bot.rng();
    const r = frac * bot.roamRadius;
    bot.targetX = bot.roamCenterX + Math.cos(a) * r;
    bot.targetZ = bot.roamCenterZ + Math.sin(a) * r;
  }

  // Walk toward (tx,tz) at `speed`; returns true if it actually moved this frame.
  _stepToward(bot, tx, tz, speed, dt) {
    const dx = tx - bot.x, dz = tz - bot.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.15) return false;
    const step = Math.min(d, speed * dt);
    bot.x += (dx / d) * step;
    bot.z += (dz / d) * step;
    bot.yaw = turnToward(bot.yaw, Math.atan2(dx, dz), dt * 6);
    return true;
  }

  tick(dt, { playerPos, creatures, place, addChat, lang } = {}) {
    if (lang) this._lang = lang === 'en' ? 'en' : 'es';
    if (place !== 'surface') { this.setVisible(false); return; }
    if (!this._visible) this.setVisible(true);

    // Drain any queued level-up congratulations, ONE every 3-5s, so the bots
    // cheer in a trickle. Runs regardless of the ambient-chat throttle below.
    if (this._gratzQueue.length && addChat) {
      this._gratzTimer -= dt;
      if (this._gratzTimer <= 0) {
        const g = this._gratzQueue.shift();
        addChat(g.name, g.line);
        this._gratzTimer = 3 + Math.random() * 2;   // next cheer in 3-5s
      }
    }

    // Global ambient chat throttle: one nearby bot says a line every ~12-25s.
    this._chatCooldown -= dt;
    if (this._chatCooldown <= 0 && addChat) {
      const near = this.bots.filter((b) => playerPos && Math.hypot(b.x - playerPos.x, b.z - playerPos.z) < RENDER_RADIUS);
      const pool = near.length ? near : this.bots;
      if (pool.length) {
        const b = pool[Math.floor(Math.random() * pool.length)];
        const lines = CHAT_LINES[lang === 'en' ? 'en' : 'es'];
        addChat(b.name, lines[Math.floor(Math.random() * lines.length)]);
      }
      this._chatCooldown = 12 + Math.random() * 13;
    }

    for (const bot of this.bots) {
      const distToPlayer = playerPos ? Math.hypot(bot.x - playerPos.x, bot.z - playerPos.z) : Infinity;

      let moving = false;
      if (bot.role === 'hunter' && creatures && creatures.length) {
        moving = this._tickHunter(bot, creatures, dt);
      } else {
        moving = this._tickWander(bot, dt);
      }

      // Distance culling: keep the heavy model only while the player is near.
      if (distToPlayer <= RENDER_RADIUS) {
        this._ensureModel(bot);
      } else if (distToPlayer > CULL_RADIUS) {
        this._disposeModel(bot);
        bot.jumpY = 0; bot.jumpV = 0;   // never pop back in mid-hop
      }

      if (bot.char) {
        // Occasional hop while on the move (a little life, like a player bunny-
        // hopping between spots). Only starts when grounded and moving.
        bot.jumpCd -= dt;
        if (bot.jumpY <= 0 && moving && bot.jumpCd <= 0) {
          bot.jumpV = JUMP_V;
          bot.jumpCd = 6 + bot.rng() * 9;   // next possible hop in 6-15s (occasional)
        }
        if (bot.jumpY > 0 || bot.jumpV > 0) {
          bot.jumpV -= GRAVITY * dt;
          bot.jumpY += bot.jumpV * dt;
          if (bot.jumpY <= 0) { bot.jumpY = 0; bot.jumpV = 0; }
        }
        bot.y = this.world.heightAt(bot.x, bot.z) + bot.jumpY;
        // Runners cycle their legs faster so the gait reads as a run, not a fast
        // shuffle.
        const cadence = bot.runner ? 15 : 9;
        bot.walkPhase += moving ? dt * cadence : 0;
        // grounded=false mid-hop so the character shows its jump pose.
        bot.char.animate(bot.walkPhase, moving ? 1 : 0, bot.jumpY <= 0, dt);
        bot.char.updateAttack(dt);
        bot.char.group.position.set(bot.x, bot.y, bot.z);
        // yaw is the movement/look direction (atan2(dx,dz)), set directly like
        // worldNpcs — NOT peers' `yaw + Math.PI` (peers' yaw is a different,
        // network convention; adding PI here made bots walk backward).
        bot.char.group.rotation.y = bot.yaw;
      }
    }
  }

  _tickWander(bot, dt) {
    if (bot.waitT > 0) { bot.waitT -= dt; return false; }
    const moved = this._stepToward(bot, bot.targetX, bot.targetZ, bot.roamSpeed, dt);
    if (!moved) {
      // Reached the spot: head somewhere new. Runners and city explorers barely
      // pause (they keep crossing the city); home-bound strollers rest a beat.
      this._pickRoam(bot);
      bot.waitT = (bot.runner || bot.explorer) ? bot.rng() * 0.8 : 1 + bot.rng() * 3;
    }
    return moved;
  }

  _tickHunter(bot, creatures, dt) {
    // Nearest live creature within seek range.
    let best = null, bestD = HUNTER_SEEK;
    for (const c of creatures) {
      if (!c || c.dead || c.dying || !c.pos) continue;
      const d = Math.hypot(c.pos.x - bot.x, c.pos.z - bot.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) return this._tickWander(bot, dt);   // nothing to hunt: stroll
    if (bestD > ATTACK_RANGE) {
      return this._stepToward(bot, best.pos.x, best.pos.z, HUNT_SPEED, dt);
    }
    // In range: face it and swing periodically — NO damage is dealt (pretense).
    bot.yaw = turnToward(bot.yaw, Math.atan2(best.pos.x - bot.x, best.pos.z - bot.z), dt * 8);
    bot.attackT -= dt;
    if (bot.attackT <= 0) {
      bot.attackT = ATTACK_PERIOD;
      if (bot.char) bot.char.triggerAttack(bot.weaponType);
    }
    return false;
  }

  // Positions for optional minimap blips (same shape peers.list() returns).
  list() {
    const out = {};
    for (const b of this.bots) out[b.id] = new THREE.Vector3(b.x, b.y, b.z);
    return out;
  }

  setVisible(v) {
    this._visible = v;
    for (const b of this.bots) if (b.char) b.char.group.visible = v;
  }

  clear() {
    for (const b of this.bots) this._disposeModel(b);
    this.bots = [];
  }
}

function clampLevel(l) {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, l | 0));
}
