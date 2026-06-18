import * as THREE from 'three';
import { skillPower } from './data/professions.js';

// Runtime skill system. Owns the VISUAL effects of cast skills and triggers the
// gameplay outcome through ctx callbacks at the right moment. It never touches
// creature hp directly; combat does, via ctx.
//
// Each active skill renders its OWN animation. cast() dispatches on skill.fx
// (29 keys) through the FX table to a handful of reusable primitive spawners
// (ring, nova, bolt/orb projectile, fan, rain, beam, spikes, sparkles, poof).
// kind only seeds gameplay timing where fx is ambiguous (area vs heal nova).
//
// Effects are lightweight emissive meshes. Geometry is SHARED across all effects
// and allocated once in the constructor (never per cast); material is cloned per
// effect — and shared across the pieces of one multi-piece effect — so colors
// and opacity animate independently, then disposed in _retire / dispose.

const MAX_EFFECTS = 40;        // hard cap on concurrent visual effects (layered
                              // finishers spawn several pieces each, so give the
                              // budget headroom — they're all lightweight meshes)
const RING_LIFE = 0.45;        // seconds an area/heal ring expands and fades
const BOLT_SPEED = 28;         // projectile travel speed (m/s)
const SUMMON_POOF_LIFE = 0.5;  // seconds a summon poof lives

// Blend two 0xRRGGBB ints by t (0=a, 1=b). Used to brighten an accent toward
// white for the spark/mote layers of the big finishers.
function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// Per-kind tint fallback when a skill has no fxColor (older saves).
const KIND_COLOR = {
  area: 0xff7a3a,
  melee: 0xffd27a,
  ranged: 0xbfe9ff,
  heal: 0x5ce08a,
  summon: 0xb98aff,
  buff: 0xfff0a0,
};

// fx string -> handler method name. 29 keys collapse onto ~10 primitives. The
// dispatcher (cast) reads this and calls the named method; an unknown fx falls
// back to a neutral ring so a newly data-added fx never silently does nothing.
const FX = {
  // Archer arrows
  single_arrow: '_fxArrow',
  arrow_fan: '_fxFan',
  heavy_arrow: '_fxHeavyArrow',
  explosive_arrow: '_fxExplosiveArrow',
  arrow_rain: '_fxRain',
  fire_arrow: '_fxFireArrow',
  pierce_beam: '_fxBeam',
  hurricane: '_fxHurricane',
  // Sorcerer bolts / cold / fire
  magic_bolt: '_fxMagicBolt',
  twin_bolt: '_fxTwinBolt',
  lightning: '_fxLightning',
  poison_cloud: '_fxPoisonCloud',
  explosion: '_fxExplosion',
  ice_nova: '_fxIceNova',
  blizzard: '_fxBlizzard',
  meteor: '_fxMeteor',
  frozen_orb: '_fxFrozenOrb',
  holy_nova: '_fxHolyNova',
  wave: '_fxWave',                 // directional cone (vis/frigo/flam hur style)
  // Knight melee
  slash_arc: '_fxSlashArc',
  double_slash: '_fxDoubleSlash',
  heavy_smash: '_fxHeavySmash',
  shockwave: '_fxShockwave',
  whirlwind: '_fxWhirlwind',
  roar: '_fxRoar',
  // Druid heal / nature / summon / buff
  self_heal: '_fxSelfHeal',
  heal_nova: '_fxHealNova',
  vine_burst: '_fxVineBurst',
  summon_poof: '_fxSummonPoof',
  self_buff: '_fxSelfBuff',
};

export class SkillSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.effects = [];

    // Shared geometry — allocated ONCE, scaled/oriented per effect, disposed in
    // dispose(). No geometry is ever created at cast time.
    this._ringGeo = new THREE.RingGeometry(0.82, 1, 28);     // soft area ring
    this._sphereGeo = new THREE.SphereGeometry(0.18, 8, 6);  // bolt / sparkle
    this._thinRingGeo = new THREE.RingGeometry(0.94, 1, 36); // sharp nova ring
    this._discGeo = new THREE.CircleGeometry(1, 24);         // nova fill / cloud
    this._arrowGeo = new THREE.ConeGeometry(0.09, 0.5, 6);   // arrow shaft
    this._bladeGeo = new THREE.BoxGeometry(0.9, 0.06, 0.14); // sword blade
    this._boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 5); // beam segment
    this._spikeGeo = new THREE.ConeGeometry(0.12, 0.7, 5);   // thorn / ice spike
    this._orbGeo = new THREE.IcosahedronGeometry(0.32, 0);   // orb / meteor head
    this._shardGeo = new THREE.TetrahedronGeometry(0.16);    // ice shard
    this._pillarGeo = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true); // light column (open ends)
    this._moteGeo = new THREE.SphereGeometry(0.1, 6, 5);     // spark mote (burst)
    // Bake the arrow cone so its tip points +Z; per-cast code then only sets the
    // position and lookAt()s it. Bake the spike so its base sits at y=0, so it
    // can rise from the ground by scaling y.
    this._arrowGeo.rotateX(Math.PI / 2);
    this._spikeGeo.translate(0, 0.35, 0);
    this._geoms = [
      this._ringGeo, this._sphereGeo, this._thinRingGeo, this._discGeo,
      this._arrowGeo, this._bladeGeo, this._boltGeo, this._spikeGeo,
      this._orbGeo, this._shardGeo, this._pillarGeo, this._moteGeo,
    ];
    this._mats = []; // cloned materials we own and must dispose
  }

  // Material factory: a cloned emissive-looking basic material so each effect
  // fades on its own. We track it for disposal.
  _mat(color, opacity) {
    const m = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
    });
    this._mats.push(m);
    return m;
  }

  // Ground height helper, defensive if world lacks heightAt.
  _groundY(x, z) {
    return this.world && this.world.heightAt ? this.world.heightAt(x, z) : 0;
  }

  // Cast a skill. casterPos is a Vector3, casterYaw radians. Forward is
  // (-sin, -cos) of the yaw — the convention movement/items/camera use. level is
  // the character (skill) level. ctx supplies the gameplay callbacks (may be {}
  // for buffs). Dispatches on skill.fx; returns true if it produced an effect.
  cast(skill, casterPos, casterYaw, level, ctx) {
    if (!skill || this.effects.length >= MAX_EFFECTS) return false;
    const color = (skill.fxColor != null ? skill.fxColor : (KIND_COLOR[skill.kind] || 0x88aaff));
    const amount = skillPower(skill, level);
    const dir = new THREE.Vector3(-Math.sin(casterYaw), 0, -Math.cos(casterYaw));
    const p = {
      skill, color, amount, casterPos, casterYaw, dir, level,
      ctx: ctx || {},
      radius: skill.radius || 0,
      budget: MAX_EFFECTS - this.effects.length,
    };
    const method = FX[skill.fx] || '_fxDefault';
    return this[method](p) !== false;
  }

  // ---- gameplay helpers (call ctx only when present) ---------------------

  _damage(ctx, center, radius, amount) {
    if (ctx && ctx.damageArea) ctx.damageArea(center.clone(), radius, amount);
  }
  _heal(ctx, amount) {
    if (ctx && ctx.healPlayer) ctx.healPlayer(amount);
  }
  _summon(ctx, family, pos, level) {
    if (ctx && ctx.spawnSummon) ctx.spawnSummon(family, pos.clone(), level);
  }

  // Caster-front ground center for melee/area effects.
  _frontCenter(p, dist = 0) {
    const c = p.casterPos.clone().addScaledVector(p.dir, dist);
    c.y = this._groundY(c.x, c.z) + 0.05;
    return c;
  }
  // A point at `range` ahead of the caster, on the ground.
  _aimPoint(p, range) {
    const t = p.casterPos.clone().addScaledVector(p.dir, range);
    t.y = this._groundY(t.x, t.z) + 0.05;
    return t;
  }
  // Standing launch point for projectiles (chest height in front of caster).
  _launchPos(p) {
    const s = p.casterPos.clone();
    s.y = this._groundY(s.x, s.z) + 1.1;
    return s;
  }

  // ===================================================================== FX

  _fxDefault(p) {
    // Unknown fx: neutral ring, and if it has a radius, still deal its damage so
    // a newly added fx is never inert.
    const c = this._frontCenter(p);
    if (p.radius > 0) this._damage(p.ctx, c, p.radius, p.amount);
    this._spawnRing(c, p.radius || 2, p.color);
    return true;
  }

  // --- single-target / projectile arrows ---------------------------------

  _fxArrow(p) {
    const range = p.skill.range || 18;
    const target = this._aimPoint(p, range);
    const radius = p.radius || 1.2;
    this._spawnBolt(this._launchPos(p), target, p.color, this._arrowGeo, 1, BOLT_SPEED, () => {
      this._damage(p.ctx, target, radius, p.amount);
    });
    return true;
  }

  _fxHeavyArrow(p) {
    const range = p.skill.range || 18;
    const target = this._aimPoint(p, range);
    const radius = p.radius || 1.5;
    const big = p.skill.knockback ? radius * 1.6 : radius;
    this._spawnBolt(this._launchPos(p), target, p.color, this._arrowGeo, 1.6, BOLT_SPEED * 0.7, () => {
      this._damage(p.ctx, target, radius, p.amount);
      this._spawnNova(target, big, p.color, 0.3, false); // impact puff
    });
    return true;
  }

  _fxExplosiveArrow(p) {
    const range = p.skill.range || 18;
    const target = this._aimPoint(p, range);
    const radius = p.radius || 3;
    this._spawnBolt(this._launchPos(p), target, 0xff9a3a, this._arrowGeo, 1.2, BOLT_SPEED, () => {
      this._damage(p.ctx, target, radius, p.amount);
      this._spawnNova(target, radius, p.color, 0.4, true); // orange burst
    });
    return true;
  }

  _fxFireArrow(p) {
    // Inferno Arrow / Fire Arrow: a flaming arrow that lands on a front point and
    // scorches a circle. kind may be 'area' (land at radius) or 'ranged'.
    const range = p.skill.range || 16;
    const target = this._aimPoint(p, range);
    const radius = p.radius || 1.6;
    this._spawnBolt(this._launchPos(p), target, p.color, this._arrowGeo, 1.1, BOLT_SPEED, () => {
      this._damage(p.ctx, target, radius, p.amount);
      this._spawnNova(target, radius, p.color, 0.4, true);
      this._spawnDisc(target, radius * 0.9, 0xff5a22, 0.6); // lingering scorch
    });
    return true;
  }

  _fxFan(p) {
    // Double/Triple/Strafe: N arrows splayed forward, staggered; damage applied
    // once when the CENTER arrow reaches the aim point.
    const n = Math.max(1, p.skill.projectiles || 3);
    const spread = p.skill.spread || 0.3;
    const range = p.skill.range || 16;
    const radius = p.radius || 1.5;
    const aim = this._aimPoint(p, range);
    this._spawnFan(p, n, spread, range, p.color, (centerLanded) => {
      if (centerLanded) this._damage(p.ctx, aim, radius, p.amount);
    });
    return true;
  }

  _fxHurricane(p) {
    // A sustained stream of arrows emitted over ~0.6s. Each emitted arrow deals a
    // share of the power when it reaches range, so the total ≈ amount.
    const n = Math.max(4, p.skill.projectiles || 8);
    const spread = p.skill.spread || 0.12;
    const range = p.skill.range || 16;
    const radius = p.radius || 1.8;
    const per = p.amount / n;
    const aim = this._aimPoint(p, range);
    this._spawnStream(p, n, spread, range, p.color, () => {
      this._damage(p.ctx, aim, radius, per);
    });
    return true;
  }

  _fxRain(p) {
    // Arrow Rain / Phoenix Volley / Sky Volley: arrows fall from the sky onto
    // random points within radius, staggered; damage per arrow where it lands.
    const center = this._frontCenter(p);
    const radius = p.radius || 4.5;
    const n = Math.max(6, Math.min(12, Math.round(radius * 2)));
    const per = p.amount / n;
    const sub = Math.min(1.2, radius * 0.4);
    this._spawnRain(center, radius, n, p.color, this._arrowGeo, (impact) => {
      this._damage(p.ctx, impact, sub, per);
    });
    return true;
  }

  // --- magic bolts / lances ----------------------------------------------

  _fxMagicBolt(p) {
    const range = p.skill.range || 18;
    const target = this._aimPoint(p, range);
    const radius = p.radius || 1.5;
    this._spawnBolt(this._launchPos(p), target, p.color, this._orbGeo, 0.8, BOLT_SPEED, () => {
      this._damage(p.ctx, target, radius, p.amount);
      // No longer "just a ball": the bolt bursts on impact with a ring + sparks.
      this._spawnNova(target, radius, mixHex(p.color, 0xffffff, 0.4), 0.25, true);
      this._spawnNovaRing(target, radius * 1.2, p.color, 0.32);
      this._spawnBurst(target, radius * 0.9, p.color, 7, 0.4);
    });
    return true;
  }

  _fxTwinBolt(p) {
    // Two orbs offset perpendicular to the aim line; the second deals the damage
    // on arrival so it lands once.
    const range = p.skill.range || 18;
    const target = this._aimPoint(p, range);
    const radius = p.radius || 1.5;
    const perp = new THREE.Vector3(-p.dir.z, 0, p.dir.x);
    const start = this._launchPos(p);
    for (let i = 0; i < 2; i++) {
      const off = (i === 0 ? -0.25 : 0.25);
      const s = start.clone().addScaledVector(perp, off);
      const tg = target.clone().addScaledVector(perp, off * 0.5);
      const isSecond = i === 1;
      this._spawnBolt(s, tg, p.color, this._orbGeo, 0.55, BOLT_SPEED, () => {
        if (isSecond) this._damage(p.ctx, target, radius, p.amount);
      });
    }
    return true;
  }

  _fxLightning(p) {
    // Instant: a jagged segmented chain snaps to the strike point with a white
    // flash. No travel delay, so damage fires now.
    const range = p.skill.range || 16;
    const strike = this._aimPoint(p, range);
    const radius = p.radius || 1.7;
    this._damage(p.ctx, strike, radius, p.amount);
    const top = strike.clone(); top.y += 0.05;
    // A bolt down from the caster AND a second bolt straight down from the sky to
    // the strike point — plus a bright column and a spark burst at the impact.
    this._spawnLightning(this._launchPos(p), top, p.color);
    const sky = strike.clone(); sky.y += 7;
    this._spawnLightning(sky, top, mixHex(p.color, 0xffffff, 0.5));
    this._spawnPillar(strike, radius * 0.5, radius * 3.0, mixHex(p.color, 0xffffff, 0.6), 0.3);
    this._spawnNova(strike, radius * 1.4, 0xffffff, 0.22, true); // strike flash
    this._spawnBurst(strike, radius, mixHex(p.color, 0xffffff, 0.4), 8, 0.4);
    return true;
  }

  // A directional WAVE (Tibia vis/frigo/flam hur): a cone of elemental energy
  // that sweeps forward from the caster. Damage is applied at several points
  // marching out along the aim direction, each in a small radius, so everything
  // in the cone is hit. Visually: a row of expanding discs widening with range.
  _fxWave(p) {
    const range = p.skill.range || 9;
    const steps = 4;                       // damage sample points along the cone
    const start = p.casterPos.clone();
    // Split the spell's power across the cone samples so a creature caught in two
    // overlapping circles isn't hit for the full amount twice (a wave should equal
    // one nuke spread over a line, not 2-4× it). Status (burn/poison/slow) is
    // applied via combat.applyStatus on each hit but max()-merges, so it's fine.
    const per = p.amount * 0.55;
    for (let i = 1; i <= steps; i++) {
      const d = (range / steps) * i;
      const w = 1.4 + (d / range) * (p.radius || 3.2);   // cone widens with distance
      const c = start.clone().addScaledVector(p.dir, d);
      c.y = this._groundY(c.x, c.z) + 0.05;
      this._damage(p.ctx, c, w, per);
      this._spawnDisc(c, w, p.color, 0.4 + (steps - i) * 0.06);   // outer discs linger less
      this._spawnNova(c, w * 0.8, mixHex(p.color, 0xffffff, 0.4), 0.22, true);
    }
    return true;
  }

  // --- novas / area bursts (instant) -------------------------------------

  _fxExplosion(p) {
    const center = this._frontCenter(p);
    const radius = p.radius || 4.5;
    this._damage(p.ctx, center, radius, p.amount);
    this._spawnNova(center, radius, 0xffffff, 0.28, true);   // white-hot flash
    this._spawnNovaRing(center, radius, p.color, 0.4);       // shock ring
    this._spawnNovaRing(center, radius * 1.35, p.color, 0.55); // second, wider ring
    this._spawnBurst(center, radius * 0.9, p.color, 12, 0.55); // flung debris/sparks
    this._spawnPillar(center, radius * 0.35, radius * 1.4, 0xffffff, 0.4); // fireball column
    return true;
  }

  _fxIceNova(p) {
    const center = this._frontCenter(p);
    const radius = p.radius || 5;
    this._damage(p.ctx, center, radius, p.amount);
    this._spawnNovaRing(center, radius, p.color, 0.4);
    this._spawnNovaRing(center, radius * 1.3, mixHex(p.color, 0xffffff, 0.4), 0.55);
    this._spawnShards(center, radius, 9, p.color);          // more popping shards
    this._spawnSpikes(center, radius * 0.8, p.color, () => {}); // ice spikes erupt
    this._spawnBurst(center, radius * 0.7, mixHex(p.color, 0xffffff, 0.6), 8, 0.5);
    return true;
  }

  _fxShockwave(p) {
    const center = this._frontCenter(p);
    const radius = p.radius || 4;
    this._damage(p.ctx, center, radius, p.amount);
    this._spawnNovaRing(center, radius, p.color, 0.45); // wide ground ring
    return true;
  }

  _fxHeavySmash(p) {
    const center = this._frontCenter(p, 1.0); // a touch in front of the caster
    const radius = p.radius || 2.4;
    this._damage(p.ctx, center, radius, p.amount);
    this._spawnNovaRing(center, radius, p.color, 0.32);
    this._spawnDisc(center, radius * 0.8, 0xb89060, 0.3); // dust
    return true;
  }

  _fxPoisonCloud(p) {
    const center = this._frontCenter(p, p.skill.range ? p.skill.range : 0);
    const radius = p.radius || 4;
    this._damage(p.ctx, center, radius, p.amount);
    this._spawnDisc(center, radius, p.color, 1.2, true); // lingering pulsing cloud
    return true;
  }

  _fxHolyNova(p) {
    const center = this._frontCenter(p);
    const radius = p.radius || 4;
    if (p.skill.kind === 'heal') this._heal(p.ctx, p.amount);
    else this._damage(p.ctx, center, radius, p.amount);
    // A great descending column of holy light + twin rings + rising motes — the
    // signature "from the heavens" finisher (Genesis, Sanctuary Blade, etc.).
    this._spawnPillar(center, radius * 0.6, radius * 2.0, 0xffffff, 0.5);
    this._spawnNovaRing(center, radius, p.color, 0.4);
    this._spawnNovaRing(center, radius * 1.4, p.color, 0.6);
    this._spawnDisc(center, radius * 0.7, p.color, 0.35, false); // golden flash
    this._spawnBurst(center, radius * 0.8, mixHex(p.color, 0xffffff, 0.5), 12, 0.6);
    return true;
  }

  // --- knight slashes / whirlwind ----------------------------------------

  _fxSlashArc(p) {
    const center = this._frontCenter(p, 0.8);
    const radius = p.radius || 3;
    this._damage(p.ctx, center, radius, p.amount);
    this._spawnSlash(p, radius, p.color, 0, 1);
    return true;
  }

  _fxDoubleSlash(p) {
    const center = this._frontCenter(p, 0.8);
    const radius = p.radius || 2.6;
    this._damage(p.ctx, center, radius, p.amount);
    this._spawnSlash(p, radius, p.color, 0, 1);     // forward sweep
    this._spawnSlash(p, radius, p.color, 0.08, -1); // crossing sweep, delayed
    return true;
  }

  _fxWhirlwind(p) {
    const center = this._frontCenter(p);
    const radius = p.radius || 4.2;
    this._damage(p.ctx, center, radius, p.amount);
    this._spawnWhirlwind(center, radius, p.color);
    return true;
  }

  _fxRoar(p) {
    // Buff tell only; no ctx damage. An outward ring from the caster.
    const center = this._frontCenter(p);
    this._spawnNovaRing(center, p.radius || 4, p.color, 0.5);
    return true;
  }

  // --- cold / fire area: blizzard / meteor / frozen orb ------------------

  _fxBlizzard(p) {
    // Wide soft AoE: shards fall across the area; a single damage tick lands when
    // the first shards do (cheap, it is a broad area).
    const center = this._frontCenter(p);
    const radius = p.radius || 6;
    const n = Math.max(6, Math.min(12, Math.round(radius * 1.8)));
    let dealt = false;
    this._spawnRain(center, radius, n, p.color, this._shardGeo, () => {
      if (!dealt) { dealt = true; this._damage(p.ctx, center, radius, p.amount); }
    });
    this._spawnDisc(center, radius, p.color, 0.9, true); // frost ground disc
    return true;
  }

  _fxMeteor(p) {
    // N rocks fall from the sky onto random points; each impact deals a share.
    const center = this._frontCenter(p);
    const radius = p.radius || 7;
    const n = Math.max(3, Math.min(6, p.skill.summonCount || Math.round(radius / 1.6)));
    const per = p.amount / n;
    const sub = radius * 0.5;
    this._spawnRain(center, radius, n, p.color, this._orbGeo, (impact) => {
      this._damage(p.ctx, impact, sub, per);
      this._spawnNova(impact, sub, p.color, 0.3, true);          // crater flash
      this._spawnNovaRing(impact, sub * 1.1, p.color, 0.4);      // shock ring
      this._spawnBurst(impact, sub, 0xffae4a, 8, 0.5);           // ember spray
      this._spawnPillar(impact, sub * 0.3, sub * 1.6, 0xffd27a, 0.35); // fire column
    }, 10, 0.12, 0.55); // higher drop, slower stagger, longer fall = meteor feel
    return true;
  }

  _fxFrozenOrb(p) {
    // A slow orb drifts forward dealing damage in a moving circle along its lane,
    // then bursts into an ice nova at the end.
    const range = p.skill.range || 18;
    const target = this._aimPoint(p, range);
    const radius = p.radius || 3;
    const start = this._launchPos(p);
    this._spawnOrb(start, target, radius, p.color, (stepPt) => {
      this._damage(p.ctx, stepPt, radius, p.amount / 5); // ~5 steps along the lane
    }, () => {
      this._spawnNovaRing(target, radius, p.color, 0.4);
      this._spawnShards(target, radius, 5, p.color);
    });
    return true;
  }

  // --- druid heal / nature / summon / buff --------------------------------

  _fxSelfHeal(p) {
    this._heal(p.ctx, p.amount);
    this._spawnSparkles(p.casterPos.clone(), p.color);
    if (p.radius > 0) this._spawnRing(this._frontCenter(p), p.radius, p.color);
    return true;
  }

  _fxHealNova(p) {
    const center = this._frontCenter(p);
    const radius = p.radius || 6;
    this._heal(p.ctx, p.amount);
    // A radiant healing wave: ground disc + expanding ring + a soft column + motes
    // rising like life returning — a big area heal looks like a blessing.
    this._spawnDisc(center, radius, p.color, 0.45, false);
    this._spawnNovaRing(center, radius, mixHex(p.color, 0xffffff, 0.5), 0.5);
    this._spawnPillar(p.casterPos.clone(), radius * 0.4, radius * 0.9, mixHex(p.color, 0xffffff, 0.5), 0.55);
    this._spawnBurst(center, radius * 0.7, mixHex(p.color, 0xffffff, 0.6), 10, 0.6);
    this._spawnSparkles(p.casterPos.clone(), p.color);
    return true;
  }

  _fxVineBurst(p) {
    // Thorns rise from the ground; damage fires when they finish punching up.
    const center = this._frontCenter(p);
    const radius = p.radius || 4;
    this._spawnSpikes(center, radius, p.color, () => {
      this._damage(p.ctx, center, radius, p.amount);
    });
    return true;
  }

  _fxSummonPoof(p) {
    const count = p.skill.summonCount || 1;
    const family = p.skill.summonFamily;
    for (let i = 0; i < count; i++) {
      // Fan the summons out IN FRONT of the caster (matching movement/ranged).
      const a = p.casterYaw + (i - (count - 1) / 2) * 0.7;
      const dist = 2.2;
      const pos = p.casterPos.clone();
      pos.x += -Math.sin(a) * dist;
      pos.z += -Math.cos(a) * dist;
      pos.y = this._groundY(pos.x, pos.z);
      this._summon(p.ctx, family, pos, p.level);
      // A summoning pillar + ring + poof so a pet arrives with presence, not a
      // quiet pop.
      this._spawnPillar(pos.clone(), 0.9, 3.2, mixHex(p.color, 0xffffff, 0.4), 0.5);
      this._spawnNovaRing(pos.clone(), 2.2, p.color, 0.4);
      this._spawnBurst(pos.clone(), 1.4, p.color, 8, 0.5);
      this._spawnPoof(pos.clone(), p.color);
    }
    return true;
  }

  _fxSelfBuff(p) {
    // Buff tell only; no ctx damage. A rising column of light around the caster +
    // an expanding ring + sparkles so a buff reads as a real power-up.
    const c = p.casterPos.clone(); c.y = this._groundY(c.x, c.z);
    this._spawnPillar(c, 1.0, 2.8, p.color, 0.6);
    this._spawnNovaRing(this._frontCenter(p), p.radius || 2.5, p.color, 0.5);
    this._spawnBurst(c, 1.2, mixHex(p.color, 0xffffff, 0.4), 7, 0.55);
    this._spawnSparkles(p.casterPos.clone(), p.color);
    return true;
  }

  // =============================================================== PRIMITIVES

  // Soft expanding ground ring (original feedback ring).
  _spawnRing(center, radius, color) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const mesh = new THREE.Mesh(this._ringGeo, this._mat(color, 0.85));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(center);
    mesh.renderOrder = 5;
    this.scene.add(mesh);
    this.effects.push({ kind: 'ring', mesh, t: 0, life: RING_LIFE, radius, op: 0.85 });
  }

  // Sharp expanding shock ring (nova feel) — thin ring scaling 0->radius fast.
  _spawnNovaRing(center, radius, color, life = 0.4) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const mesh = new THREE.Mesh(this._thinRingGeo, this._mat(color, 0.95));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(center);
    mesh.renderOrder = 6;
    this.scene.add(mesh);
    this.effects.push({ kind: 'novaRing', mesh, t: 0, life, radius, op: 0.95 });
  }

  // A flat filled disc that scales up and fades (flash / cloud / scorch). When
  // `lingering`, it holds near full radius and pulses before fading.
  _spawnDisc(center, radius, color, life = 0.4, lingering = false) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const op = lingering ? 0.4 : 0.75;
    const mesh = new THREE.Mesh(this._discGeo, this._mat(color, op));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(center);
    mesh.renderOrder = 4;
    this.scene.add(mesh);
    this.effects.push({ kind: 'disc', mesh, t: 0, life, radius, lingering, op });
  }

  // A bright instant flash disc (used by explosion/meteor/lightning impact).
  _spawnNova(center, radius, color, life = 0.3, flash = true) {
    this._spawnDisc(center, radius * (flash ? 0.9 : 0.7), color, life, false);
  }

  // A travelling projectile. geo is the shared geometry to use (arrow cone or
  // orb); scale stretches the head; onArrive fires at impact. Gameplay (onArrive)
  // still fires even when visuals are capped, so the sim never starves.
  _spawnBolt(start, target, color, geo, scale, speed, onArrive) {
    if (this.effects.length >= MAX_EFFECTS) {
      if (onArrive) onArrive();
      return;
    }
    const mesh = new THREE.Mesh(geo, this._mat(color, 1));
    mesh.position.copy(start);
    mesh.scale.setScalar(scale);
    mesh.lookAt(target);
    mesh.renderOrder = 6;
    this.scene.add(mesh);
    const dist = start.distanceTo(target);
    this.effects.push({
      kind: 'bolt', mesh, t: 0, life: Math.max(0.05, dist / speed),
      from: start.clone(), to: target.clone(), onArrive, arrived: false,
    });
  }

  // A travelling AoE orb that sweeps a lane: onStep fires periodically along the
  // path, onArrive at the end. Slower than a bolt.
  _spawnOrb(start, target, radius, color, onStep, onArrive) {
    if (this.effects.length >= MAX_EFFECTS) {
      // Visuals capped: still sweep the lane gameplay-side, then burst.
      for (let s = 0; s <= 5; s++) onStep(start.clone().lerp(target, s / 5));
      if (onArrive) onArrive();
      return;
    }
    const mesh = new THREE.Mesh(this._orbGeo, this._mat(color, 0.95));
    mesh.position.copy(start);
    mesh.renderOrder = 6;
    this.scene.add(mesh);
    const dist = start.distanceTo(target);
    this.effects.push({
      kind: 'orb', mesh, t: 0, life: Math.max(0.2, dist / (BOLT_SPEED * 0.45)),
      from: start.clone(), to: target.clone(), radius,
      onStep, lastStep: -1, onArrive, arrived: false, spin: 4,
    });
  }

  // A fan of N arrows splayed by `spread`, flying forward to `range`, slightly
  // staggered. onLand(isCenter) fires per arrow as it lands. Visual count is
  // clamped to the budget; gameplay still fires for the center arrow.
  _spawnFan(p, n, spread, range, color, onLand) {
    const budget = Math.max(0, MAX_EFFECTS - this.effects.length);
    if (budget <= 0) { onLand(true); return; }
    const group = new THREE.Group();
    group.position.copy(this._launchPos(p));
    const mat = this._mat(color, 1); // one shared material for the whole fan
    const pieces = [];
    const center = (n - 1) / 2;
    const centerIdx = Math.round(center);
    for (let i = 0; i < n; i++) {
      const a = p.casterYaw + (i - center) * spread;
      const fdir = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a));
      const to = new THREE.Vector3().addScaledVector(fdir, range);
      // Always render the center arrow (it carries the gameplay tell) and any
      // others that fit the budget.
      const visible = i === centerIdx || i < budget;
      let m = null;
      if (visible) {
        m = new THREE.Mesh(this._arrowGeo, mat);
        m.lookAt(to);
        group.add(m);
      }
      pieces.push({ m, from: new THREE.Vector3(0, 0, 0), to, delay: i * 0.03, isCenter: i === centerIdx, landed: false });
    }
    group.renderOrder = 6;
    this.scene.add(group);
    const life = 0.04 + range / BOLT_SPEED + (n - 1) * 0.03 + 0.05;
    this.effects.push({
      kind: 'pieces', mesh: group, t: 0, life, pieceLife: range / BOLT_SPEED,
      pieces, onLand, sharedMat: mat,
    });
  }

  // A continuous stream of forward arrows emitted over a window (hurricane).
  // onEmitLand fires for each arrow as it reaches range.
  _spawnStream(p, n, spread, range, color, onEmitLand) {
    if (this.effects.length >= MAX_EFFECTS) {
      for (let i = 0; i < n; i++) onEmitLand();
      return;
    }
    const group = new THREE.Group();
    group.position.copy(this._launchPos(p));
    group.renderOrder = 6;
    this.scene.add(group);
    const mat = this._mat(color, 1);
    const flight = range / BOLT_SPEED;
    const every = 0.6 / n;
    this.effects.push({
      kind: 'stream', mesh: group, t: 0, life: 0.6 + flight + 0.1,
      pieces: [], sharedMat: mat,
      emitLeft: n, emitEvery: every, emitT: 0,
      range, spread, flight, baseYaw: p.casterYaw, onEmitLand,
    });
  }

  // Arrows / shards / rocks falling from the sky onto random points in radius.
  // onImpact(point) fires per piece as it lands. Gameplay fires for ALL n pieces;
  // visuals are clamped to the budget (non-visual pieces still call onImpact).
  _spawnRain(center, radius, n, color, geo, onImpact, dropH = 8, stagger = 0.06, fall = 0.42) {
    const budget = Math.max(0, MAX_EFFECTS - this.effects.length);
    const visN = Math.min(n, budget);
    const group = new THREE.Group();
    const mat = this._mat(color, 1);
    const pieces = [];
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * radius;
      const gx = center.x + Math.cos(ang) * rr;
      const gz = center.z + Math.sin(ang) * rr;
      const gy = this._groundY(gx, gz) + 0.05;
      const land = new THREE.Vector3(gx, gy, gz);
      const top = new THREE.Vector3(gx, gy + dropH, gz);
      let m = null;
      if (i < visN) {
        m = new THREE.Mesh(geo, mat);
        if (geo === this._arrowGeo) m.lookAt(land); // point straight down
        group.add(m);
      }
      pieces.push({ m, from: top, to: land, delay: i * stagger, landed: false });
    }
    group.renderOrder = 6;
    this.scene.add(group);
    const life = (n - 1) * stagger + fall + 0.1;
    this.effects.push({
      kind: 'pieces', mesh: group, t: 0, life, pieceLife: fall,
      pieces, onLand: (isCenter, impact) => onImpact(impact),
      sharedMat: mat, spinFall: geo === this._orbGeo,
    });
  }

  // Spikes / thorns rising out of the ground across a circle, then sinking.
  // onRisen fires once when the spikes finish punching up (~damageAt of life).
  _spawnSpikes(center, radius, color, onRisen) {
    if (this.effects.length >= MAX_EFFECTS) { onRisen(); return; }
    const n = Math.max(4, Math.min(10, Math.round(radius * 2)));
    const group = new THREE.Group();
    const mat = this._mat(color, 1);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const rr = (0.3 + 0.7 * Math.random()) * radius;
      const gx = center.x + Math.cos(ang) * rr;
      const gz = center.z + Math.sin(ang) * rr;
      const gy = this._groundY(gx, gz);
      const m = new THREE.Mesh(this._spikeGeo, mat);
      m.position.set(gx, gy, gz);
      m.rotation.z = (Math.random() - 0.5) * 0.3;
      m.scale.y = 0.01;
      group.add(m);
    }
    group.renderOrder = 6;
    this.scene.add(group);
    this.effects.push({
      kind: 'spikes', mesh: group, t: 0, life: 0.7, damageAt: 0.4,
      onRisen, dealt: false, sharedMat: mat,
    });
  }

  // A few shards popping outward from a center (ice nova / orb burst).
  _spawnShards(center, radius, n, color) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const group = new THREE.Group();
    const mat = this._mat(color, 1);
    const pieces = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(ang), 0.4, Math.sin(ang));
      const m = new THREE.Mesh(this._shardGeo, mat);
      m.position.copy(center);
      group.add(m);
      pieces.push({ m, dir, dist: radius * 0.6 });
    }
    group.renderOrder = 6;
    this.scene.add(group);
    this.effects.push({ kind: 'shards', mesh: group, t: 0, life: 0.4, pieces, center: center.clone(), sharedMat: mat });
  }

  // A jagged lightning chain of short cylinder segments zig-zagging start->end.
  _spawnLightning(start, end, color) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const group = new THREE.Group();
    const mat = this._mat(color, 1);
    const segs = 4;
    let prev = start.clone();
    for (let i = 1; i <= segs; i++) {
      const k = i / segs;
      const pt = start.clone().lerp(end, k);
      if (i < segs) {
        pt.x += (Math.random() - 0.5) * 0.8;
        pt.z += (Math.random() - 0.5) * 0.8;
        pt.y += (Math.random() - 0.5) * 0.4;
      }
      const seg = new THREE.Mesh(this._boltGeo, mat);
      const mid = prev.clone().add(pt).multiplyScalar(0.5);
      seg.position.copy(mid);
      seg.scale.set(2, Math.max(0.01, prev.distanceTo(pt)), 2); // _boltGeo unit Y
      seg.lookAt(pt);
      seg.rotateX(Math.PI / 2); // cylinder axis Y -> align to look dir
      group.add(seg);
      prev = pt;
    }
    group.renderOrder = 7;
    this.scene.add(group);
    this.effects.push({ kind: 'flash', mesh: group, t: 0, life: 0.22, sharedMat: mat });
  }

  // A pierce beam: a stretched bolt line snaps to range and fades; damage is
  // STEPPED along the path here so everyone in the line is hit (true pierce). No
  // travel delay — the line is instant.
  _spawnBeam(p, range, color, onStep) {
    const steps = 5;
    for (let i = 1; i <= steps; i++) onStep(this._aimPoint(p, (i / steps) * range));
    if (this.effects.length >= MAX_EFFECTS) return;
    const start = this._launchPos(p);
    const end = this._aimPoint(p, range); end.y = start.y;
    const mesh = new THREE.Mesh(this._boltGeo, this._mat(color, 0.9));
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.scale.set(3, Math.max(0.01, start.distanceTo(end)), 3);
    mesh.lookAt(end);
    mesh.rotateX(Math.PI / 2);
    mesh.renderOrder = 7;
    this.scene.add(mesh);
    this.effects.push({ kind: 'beam', mesh, t: 0, life: 0.25, op: 0.9 });
  }

  _fxBeam(p) {
    const range = p.skill.range || 16;
    const radius = p.radius || 1.6;
    this._spawnBeam(p, range, p.color, (pt) => {
      this._damage(p.ctx, pt, radius, p.amount / 5); // each of 5 steps takes a share
    });
    return true;
  }

  // A sword blade swept in a forward arc. delay staggers it; dir flips the sweep.
  _spawnSlash(p, radius, color, delay, dir) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const group = new THREE.Group();
    const c = p.casterPos.clone();
    c.y = this._groundY(c.x, c.z) + 1.0;
    group.position.copy(c);
    const mat = this._mat(color, 0.95);
    const blade = new THREE.Mesh(this._bladeGeo, mat);
    blade.position.set(0, 0, -radius * 0.45); // out in front along -Z (forward)
    blade.scale.set(radius * 0.5, 1, 1);
    group.add(blade);
    group.renderOrder = 7;
    this.scene.add(group);
    this.effects.push({
      kind: 'slash', mesh: group, t: 0, life: 0.22, delay,
      sweep: 2.1 * dir, startA: p.casterYaw - 1.05 * dir, sharedMat: mat, op: 0.95,
    });
  }

  // A spinning radial ring of blades that scales out (whirlwind).
  _spawnWhirlwind(center, radius, color) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const group = new THREE.Group();
    const c = center.clone(); c.y += 0.6;
    group.position.copy(c);
    const mat = this._mat(color, 0.9);
    const blades = 4;
    for (let i = 0; i < blades; i++) {
      const a = (i / blades) * Math.PI * 2;
      const blade = new THREE.Mesh(this._bladeGeo, mat);
      blade.position.set(Math.cos(a) * radius * 0.5, 0, Math.sin(a) * radius * 0.5);
      blade.rotation.y = -a;
      blade.scale.x = radius * 0.6;
      group.add(blade);
    }
    group.renderOrder = 7;
    this.scene.add(group);
    this.effects.push({ kind: 'whirlwind', mesh: group, t: 0, life: 0.6, radius, spin: 14, op: 0.9, sharedMat: mat });
  }

  _spawnSparkles(pos, color) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const group = new THREE.Group();
    const n = 6;
    const mat = this._mat(color, 1);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(this._sphereGeo, mat);
      const a = (i / n) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4);
      s.scale.setScalar(0.6);
      group.add(s);
    }
    group.position.copy(pos);
    group.renderOrder = 6;
    this.scene.add(group);
    this.effects.push({ kind: 'sparkle', mesh: group, t: 0, life: 0.7, sharedMat: mat });
  }

  _spawnPoof(pos, color) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const mesh = new THREE.Mesh(this._sphereGeo, this._mat(color, 0.9));
    mesh.position.copy(pos);
    mesh.position.y += 0.6;
    mesh.renderOrder = 6;
    this.scene.add(mesh);
    this.effects.push({ kind: 'poof', mesh, t: 0, life: SUMMON_POOF_LIFE });
  }

  // A towering COLUMN of light that shoots up from a point and fades — the single
  // most "impressive" beat, used on the biggest area finishers and holy bursts.
  // It flares wide briefly then thins as it rises, like a beam from the heavens.
  _spawnPillar(center, radius, height, color, life = 0.55) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const mesh = new THREE.Mesh(this._pillarGeo, this._mat(color, 0.6));
    mesh.position.set(center.x, center.y + height / 2, center.z);
    mesh.scale.set(radius, height, radius);
    mesh.renderOrder = 7;
    mesh.userData.baseY = center.y;   // keep the column's foot planted on the ground
    this.scene.add(mesh);
    this.effects.push({ kind: 'pillar', mesh, t: 0, life, radius, height, op: 0.6 });
  }

  // A radial BURST of bright motes flung outward and up, with gravity, then they
  // fade. Adds sparks/debris to impacts so a hit reads as a real detonation, not
  // a flat disc. n motes, each a tiny sphere.
  _spawnBurst(center, radius, color, n = 10, life = 0.5) {
    if (this.effects.length >= MAX_EFFECTS) return;
    const group = new THREE.Group();
    const mat = this._mat(color, 1);
    const pieces = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const up = 0.6 + Math.random() * 1.2;
      const sp = (0.6 + Math.random() * 0.8) * radius;
      const m = new THREE.Mesh(this._moteGeo, mat);
      m.position.copy(center);
      m.scale.setScalar(0.7 + Math.random() * 0.8);
      group.add(m);
      pieces.push({ m, vx: Math.cos(a) * sp, vy: up * sp, vz: Math.sin(a) * sp });
    }
    group.renderOrder = 7;
    this.scene.add(group);
    this.effects.push({ kind: 'burst', mesh: group, t: 0, life, pieces, center: center.clone(), sharedMat: mat });
  }

  // Public: a small impact flash + spark burst at a world point, for the basic
  // wand bolt / arrow so even a basic attack lands with a little pop instead of
  // the projectile just blinking out. Cheap; safely no-ops over the FX budget.
  impactBurst(pos, color, scale = 1) {
    const c = pos.clone ? pos.clone() : new THREE.Vector3(pos.x, pos.y, pos.z);
    this._spawnNova(c, 0.9 * scale, mixHex(color, 0xffffff, 0.4), 0.22, true);
    this._spawnBurst(c, 0.8 * scale, color, 6, 0.35);
  }

  // ================================================================ UPDATE

  // Advance and retire active effects. Disposes only the per-effect cloned
  // material(s); shared geometry stays. Call once per frame.
  update(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      const k = Math.min(1, e.t / e.life);

      switch (e.kind) {
        case 'ring': {
          e.mesh.scale.setScalar(e.radius * (0.2 + 0.8 * k));
          e.mesh.material.opacity = e.op * (1 - k);
          break;
        }
        case 'novaRing': {
          e.mesh.scale.setScalar(Math.max(0.01, e.radius * Math.min(1, k * 1.6)));
          e.mesh.material.opacity = e.op * (1 - k * k);
          break;
        }
        case 'disc': {
          if (e.lingering) {
            const grow = Math.min(1, k * 3);
            e.mesh.scale.setScalar(Math.max(0.01, e.radius * grow));
            const pulse = 0.75 + 0.25 * Math.sin(e.t * 12);
            e.mesh.material.opacity = e.op * pulse * (k > 0.7 ? (1 - k) / 0.3 : 1);
          } else {
            e.mesh.scale.setScalar(Math.max(0.01, e.radius * (0.3 + 0.7 * k)));
            e.mesh.material.opacity = e.op * (1 - k);
          }
          break;
        }
        case 'bolt': {
          e.mesh.position.lerpVectors(e.from, e.to, k);
          if (!e.arrived && k >= 1) {
            e.arrived = true;
            if (e.onArrive) e.onArrive();
          }
          break;
        }
        case 'orb': {
          e.mesh.position.lerpVectors(e.from, e.to, k);
          e.mesh.rotation.y += dt * e.spin;
          const step = Math.floor(k * 5);
          if (step > e.lastStep) { e.lastStep = step; e.onStep(e.mesh.position); }
          if (!e.arrived && k >= 1) {
            e.arrived = true;
            if (e.onArrive) e.onArrive();
          }
          break;
        }
        case 'pieces': {
          // Staggered multi-piece (fan / rain): each piece runs its own local
          // progress and lands once.
          for (const pc of e.pieces) {
            const lt = (e.t - pc.delay) / e.pieceLife;
            if (lt < 0) continue;
            const kk = Math.min(1, lt);
            if (pc.m) {
              pc.m.position.lerpVectors(pc.from, pc.to, kk);
              if (e.spinFall) pc.m.rotation.y += dt * 6;
              pc.m.material.opacity = 1 - Math.max(0, (kk - 0.85) / 0.15);
            }
            if (!pc.landed && kk >= 1) {
              pc.landed = true;
              if (e.onLand) e.onLand(!!pc.isCenter, pc.to);
            }
          }
          break;
        }
        case 'stream': {
          // Emit a new arrow every emitEvery until emitLeft hits 0; advance each.
          if (e.emitLeft > 0) {
            e.emitT += dt;
            while (e.emitT >= e.emitEvery && e.emitLeft > 0) {
              e.emitT -= e.emitEvery;
              e.emitLeft--;
              const a = e.baseYaw + (Math.random() - 0.5) * e.spread * 2;
              const fdir = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a));
              const to = new THREE.Vector3().addScaledVector(fdir, e.range);
              const m = new THREE.Mesh(this._arrowGeo, e.sharedMat);
              m.lookAt(to);
              e.mesh.add(m);
              e.pieces.push({ m, from: new THREE.Vector3(0, 0, 0), to, lt: 0, landed: false });
            }
          }
          for (const pc of e.pieces) {
            pc.lt += dt;
            const kk = Math.min(1, pc.lt / e.flight);
            pc.m.position.lerpVectors(pc.from, pc.to, kk);
            pc.m.material.opacity = 1 - Math.max(0, (kk - 0.85) / 0.15);
            if (!pc.landed && kk >= 1) { pc.landed = true; if (e.onEmitLand) e.onEmitLand(); }
          }
          break;
        }
        case 'spikes': {
          const rise = Math.min(1, k / e.damageAt);
          const sink = k > 0.7 ? (1 - (k - 0.7) / 0.3) : 1;
          for (const c of e.mesh.children) c.scale.y = Math.max(0.01, rise * sink);
          e.sharedMat.opacity = sink;
          if (!e.dealt && k >= e.damageAt) { e.dealt = true; if (e.onRisen) e.onRisen(); }
          break;
        }
        case 'shards': {
          for (const pc of e.pieces) {
            pc.m.position.copy(e.center);
            pc.m.position.addScaledVector(pc.dir, pc.dist * k);
            pc.m.position.y += Math.sin(k * Math.PI) * 0.5;
            pc.m.rotation.x += dt * 8;
          }
          e.sharedMat.opacity = 1 - k;
          break;
        }
        case 'flash': {
          e.sharedMat.opacity = 1 - k;
          break;
        }
        case 'beam': {
          e.mesh.material.opacity = e.op * (1 - k);
          break;
        }
        case 'slash': {
          const span = Math.max(0.001, e.life - e.delay);
          const lt = (e.t - e.delay) / span;
          if (lt < 0) { e.mesh.visible = false; break; }
          e.mesh.visible = true;
          const kk = Math.min(1, lt);
          e.mesh.rotation.y = e.startA + e.sweep * kk; // sweep the arc forward
          e.sharedMat.opacity = e.op * (1 - kk);
          break;
        }
        case 'whirlwind': {
          e.mesh.rotation.y += dt * e.spin;
          e.mesh.scale.setScalar(0.4 + 0.6 * Math.min(1, k * 2));
          e.sharedMat.opacity = e.op * (k > 0.6 ? (1 - k) / 0.4 : 1);
          break;
        }
        case 'sparkle': {
          e.mesh.position.y += dt * 0.8;
          e.sharedMat.opacity = 1 - k;
          break;
        }
        case 'poof': {
          e.mesh.scale.setScalar(0.5 + k * 2.2);
          e.mesh.material.opacity = 0.9 * (1 - k);
          break;
        }
        case 'pillar': {
          // Flare wide instantly, then narrow as it shoots up and fades, foot
          // planted on the ground (baseY).
          const flare = k < 0.25 ? (1 + (0.25 - k) * 2.2) : 1;       // brief widen
          const grow = 0.3 + 1.05 * Math.min(1, k * 1.8);            // climb to full height
          const h = e.height * grow;
          const r = e.radius * flare * (1 - k * 0.35);
          e.mesh.scale.set(r, h, r);
          e.mesh.position.y = (e.mesh.userData.baseY || 0) + h / 2;
          e.mesh.material.opacity = e.op * (1 - k * k);
          break;
        }
        case 'burst': {
          for (const pc of e.pieces) {
            pc.vy -= 9 * dt;                                          // gravity
            pc.m.position.x += pc.vx * dt;
            pc.m.position.y += pc.vy * dt;
            pc.m.position.z += pc.vz * dt;
          }
          e.sharedMat.opacity = 1 - k * k;
          break;
        }
        default: break;
      }

      if (k >= 1) {
        this._retire(e);
        this.effects.splice(i, 1);
      }
    }
  }

  // ================================================================ DISPOSE

  // Remove an effect from the scene and dispose its owned material(s). Multi-
  // piece effects share ONE material (e.sharedMat); single meshes own their own.
  // _disposeMat no-ops on a material we no longer track, so double-dispose across
  // shared children is harmless.
  _retire(e) {
    this.scene.remove(e.mesh);
    if (e.sharedMat) {
      this._disposeMat(e.sharedMat);
    } else {
      if (e.mesh.material) this._disposeMat(e.mesh.material);
      if (e.mesh.children) {
        for (const c of e.mesh.children) {
          if (c.material) this._disposeMat(c.material);
        }
      }
    }
  }

  _disposeMat(mat) {
    const idx = this._mats.indexOf(mat);
    if (idx < 0) return; // already disposed / not ours
    this._mats.splice(idx, 1);
    mat.dispose();
  }

  // Tear everything down: retire live effects and dispose shared geometry.
  dispose() {
    for (const e of this.effects) this._retire(e);
    this.effects = [];
    for (const g of this._geoms) g.dispose();
    for (const m of this._mats) m.dispose();
    this._mats = [];
  }
}
