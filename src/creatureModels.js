import * as THREE from 'three';

// Procedural rounded low-poly creature models for Mundum.
// Same friendly style as src/character.js: MeshLambertMaterial, capsules + spheres,
// no textures. Each model faces +Z, sits with feet at y=0, ~1 unit tall for humanoids.
// buildCreatureModel(family, { color, scale }) -> { group, update(dt, moving), dispose() }

// Shared geometries (reused across instances; never disposed per-model).
const G = {
  sphere: new THREE.SphereGeometry(1, 12, 10),
  lowSphere: new THREE.SphereGeometry(1, 8, 6),
  capsule: new THREE.CapsuleGeometry(1, 1, 4, 10),
  cone: new THREE.ConeGeometry(1, 1, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  dome: new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
  torus: new THREE.TorusGeometry(1, 0.3, 6, 12),
};

const EYE_W = new THREE.MeshLambertMaterial({ color: 0xffffff });
const EYE_B = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
// Bosses get menacing red GLOWING eyes. A build sets _eyeOverride to this while
// constructing a boss so every addEyes() call across the design uses it; the
// glow comes from the emissive so it reads even in shadow. Shared (never disposed).
const EYE_BOSS = new THREE.MeshLambertMaterial({ color: 0xff2a18, emissive: 0xcc1500 });
const EYE_BOSS_PUPIL = new THREE.MeshLambertMaterial({ color: 0x3a0500, emissive: 0x550800 });
let _eyeOverride = null;   // {sclera, pupil} while building a boss, else null
const WHITE = 0xffffff;
const DARK = 0x222222;

// Shared weapon-prop palette (reused across instances; never disposed per-model).
const WOOD = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
const STEEL = new THREE.MeshLambertMaterial({ color: 0xb8c0cc });
const IRON = new THREE.MeshLambertMaterial({ color: 0x7a828c });
const GOLD = new THREE.MeshLambertMaterial({ color: 0xd9b341 });
const STRING = new THREE.MeshLambertMaterial({ color: 0xe8e0c8 });

// Small mesh helpers.
function mesh(geo, mat) { return new THREE.Mesh(geo, mat); }

function lambert(color) { return new THREE.MeshLambertMaterial({ color }); }

// ---------------------------------------------------------------------------
// Weapon props. Each returns a THREE.Group whose handle sits near local origin
// and whose blade/head points up +Y, so a hand pivot can grip it and the
// existing attack() arm-swing animates the whole weapon for free. Built from the
// same shared low-poly geometries; tinted with the shared metal/wood palette.
// ---------------------------------------------------------------------------
function haft(len, r, mat) {
  const h = mesh(G.cyl, mat || WOOD);
  h.scale.set(r, len * 0.5, r);
  h.position.y = len * 0.25;
  return h;
}

const WEAPONS = {
  // One-handed axe: short haft, wedge head near the top.
  axe(o = {}) {
    const g = new THREE.Group();
    g.add(haft(0.5, 0.02));
    const head = mesh(G.cone, o.mat || STEEL);
    head.scale.set(0.13, 0.09, 0.05);
    head.rotation.z = Math.PI / 2;
    head.position.set(0.07, 0.42, 0);
    g.add(head);
    return g;
  },
  // Two-handed battle axe: long haft, big double-bit head.
  battleaxe(o = {}) {
    const g = new THREE.Group();
    g.add(haft(0.72, 0.025));
    for (const s of [-1, 1]) {
      const blade = mesh(G.cone, o.mat || STEEL);
      blade.scale.set(0.17, 0.12, 0.05);
      blade.rotation.z = s * Math.PI / 2;
      blade.position.set(s * 0.1, 0.6, 0);
      g.add(blade);
    }
    return g;
  },
  // Mace / club with a heavy head; `spikes` adds studs (morningstar feel).
  mace(o = {}) {
    const g = new THREE.Group();
    g.add(haft(0.5, 0.022));
    const head = mesh(G.sphere, o.mat || IRON);
    head.scale.setScalar(0.09);
    head.position.y = 0.5;
    g.add(head);
    if (o.spikes) {
      for (const a of [0, 1, 2, 3, 4, 5]) {
        const sp = mesh(G.cone, o.mat || IRON);
        sp.scale.set(0.025, 0.06, 0.025);
        const ang = (a / 6) * Math.PI * 2;
        sp.position.set(Math.cos(ang) * 0.09, 0.5 + Math.sin(a) * 0.03, Math.sin(ang) * 0.09);
        sp.rotation.z = -Math.cos(ang) * 1.2;
        sp.rotation.x = Math.sin(ang) * 1.2;
        g.add(sp);
      }
    }
    return g;
  },
  // Wooden club (trolls, ogres): gnarled tapering cudgel.
  club(o = {}) {
    const g = new THREE.Group();
    const c = mesh(G.cone, o.mat || WOOD);
    c.scale.set(0.07, 0.34, 0.07);
    c.position.y = 0.3;
    g.add(c);
    const knob = mesh(G.sphere, o.mat || WOOD);
    knob.scale.setScalar(0.08);
    knob.position.y = 0.6;
    g.add(knob);
    return g;
  },
  // Trident (demons, sea creatures): long shaft with three prongs.
  trident(o = {}) {
    const g = new THREE.Group();
    g.add(haft(0.95, 0.022, o.mat || STEEL));
    for (const x of [-0.06, 0, 0.06]) {
      const prong = mesh(G.cone, o.mat || STEEL);
      prong.scale.set(0.018, 0.12, 0.018);
      prong.position.set(x, 1.02, 0);
      g.add(prong);
    }
    const cross = mesh(G.cyl, o.mat || STEEL);
    cross.scale.set(0.012, 0.08, 0.012);
    cross.rotation.z = Math.PI / 2;
    cross.position.y = 0.92;
    g.add(cross);
    return g;
  },
  // Spear: long shaft, single leaf point.
  spear(o = {}) {
    const g = new THREE.Group();
    g.add(haft(0.95, 0.018, o.mat || WOOD));
    const tip = mesh(G.cone, o.mat || STEEL);
    tip.scale.set(0.03, 0.13, 0.03);
    tip.position.y = 1.0;
    g.add(tip);
    return g;
  },
  // Sword / scimitar / machete: crossguard + blade. `curve` bends it (scimitar),
  // `big` makes a two-handed greatsword/machete.
  sword(o = {}) {
    const g = new THREE.Group();
    const bladeLen = o.big ? 0.7 : 0.45;
    const grip = mesh(G.cyl, o.mat || DARK_MAT());
    grip.scale.set(0.02, 0.06, 0.02);
    grip.position.y = 0.05;
    g.add(grip);
    const guard = mesh(G.cyl, o.guardMat || GOLD);
    guard.scale.set(0.012, 0.07, 0.012);
    guard.rotation.z = Math.PI / 2;
    guard.position.y = 0.12;
    g.add(guard);
    const blade = mesh(G.cone, o.mat || STEEL);
    blade.scale.set(o.big ? 0.05 : 0.035, bladeLen * 0.5, 0.02);
    blade.position.y = 0.12 + bladeLen * 0.5;
    if (o.curve) { blade.rotation.z = 0.18; blade.position.x = bladeLen * 0.12; }
    g.add(blade);
    return g;
  },
  // Bow: a curved limb + string, held vertically. (Drawn on attack by the arm.)
  bow(o = {}) {
    const g = new THREE.Group();
    const limb = mesh(G.torus, o.mat || WOOD);
    limb.scale.set(0.22, 0.22, 0.03);
    limb.rotation.y = Math.PI / 2;
    // Only show the front arc: scale the torus and rotate so it reads as a bow.
    limb.position.y = 0.22;
    g.add(limb);
    const str = mesh(G.cyl, STRING);
    str.scale.set(0.006, 0.22, 0.006);
    str.position.set(0.04, 0.22, 0);
    g.add(str);
    return g;
  },
  // Staff / wand (mages, shamans): long rod topped with a glowing orb.
  staff(o = {}) {
    const g = new THREE.Group();
    g.add(haft(0.85, 0.02, o.mat || WOOD));
    const orb = mesh(G.sphere, o.orbMat || lambert(o.orb || 0x66ccff));
    orb.scale.setScalar(0.06);
    orb.position.y = 0.9;
    g.add(orb);
    return g;
  },
};

function DARK_MAT() { return new THREE.MeshLambertMaterial({ color: 0x3a3a3a }); }

// The shared singleton materials that must never be disposed per-model.
const SHARED_MATS = new Set([EYE_W, EYE_B, EYE_BOSS, EYE_BOSS_PUPIL, WOOD, STEEL, IRON, GOLD, STRING]);

// Gather the per-instance materials hanging off a weapon group so the model can
// dispose them later (shared palette mats are skipped — they're singletons).
function collectMats(group) {
  const out = [];
  group.traverse((o) => { if (o.material && !SHARED_MATS.has(o.material) && !out.includes(o.material)) out.push(o.material); });
  return out;
}

// Attach a weapon prop into a humanoid/bulky right-hand (the last arm pivot).
// The weapon's handle sits at its own local origin and the blade/head points up
// +Y, so we move a grip group to the FIST (the bottom tip of the arm capsule),
// nudge it forward (+Z) and outward so the haft clears the body, then tilt it
// forward so the weapon reads as carried in front — not buried in the torso.
//
//   handY  – fist Y in the arm pivot's local space (set by the builder)
//   handR  – arm radius, used to push the grip just outside the fist
//   rest   – forward tilt at idle (default leans the weapon up and ahead)
//   grab   – fraction of the weapon's height the fist closes around (0 = butt,
//            1 = tip). The weapon is built from its butt up +Y, so we slide it
//            DOWN inside the grip by grab*height: the butt then hangs below the
//            hand and the head rises above it, exactly like a carried polearm —
//            otherwise the whole weapon towers up from the fist and floats off
//            above/beside the head.
function giveWeapon(parts, kind, opts = {}) {
  const make = WEAPONS[kind];
  if (!make || !parts.arms || !parts.arms.length) return null;
  const hand = parts.arms[parts.arms.length - 1]; // right arm pivot
  const w = make(opts);
  const handY = opts.handY != null ? opts.handY : (parts.handY != null ? parts.handY : -0.22 * (opts.armLen || 1));
  const handR = opts.handR != null ? opts.handR : (parts.handR || 0.06);

  const grip = new THREE.Group();
  // Sit in the fist, then push slightly out (+X) and forward (+Z) so the handle
  // doesn't intersect the arm/torso. A bow is held across the body, so it sits
  // a touch more forward and isn't rotated up.
  grip.position.set(handR * 1.1, handY, handR * 1.8);
  if (kind === 'bow') {
    grip.rotation.set(0, 0, 0);         // bow stays upright, faced forward
    grip.position.z += handR * 1.5;
  } else {
    // Lean the weapon up-and-forward so it reads as carried, not jammed into the
    // torso. A longer reach (polearms) leans a touch more so the head doesn't
    // tower straight over the skull.
    grip.rotation.x = opts.rest != null ? opts.rest : 0.7;
  }
  grip.scale.setScalar(opts.scale || 1);
  // Grip the weapon partway up its shaft so it hangs in the fist instead of
  // sprouting entirely above it. Default grabs near the lower third (butt below
  // the hand, head above); a bow is held at its centre and isn't shifted.
  if (kind !== 'bow') {
    const bb = new THREE.Box3().setFromObject(w);
    const top = bb.max.y, bot = bb.min.y;
    if (isFinite(top) && isFinite(bot) && top > bot) {
      const grab = opts.grab != null ? opts.grab : 0.32;
      w.position.y -= bot + (top - bot) * grab;
    }
  }
  grip.add(w);
  hand.add(grip);
  parts.weapon = { grip, kind };
  return parts.weapon;
}

// Add a pair of eyes onto a target at local position with given spread/size.
function addEyes(target, y, z, spread, size, pupils = true) {
  // Boss builds glow red (set in buildCreatureModel); everyone else uses the
  // normal white sclera + dark pupil.
  const scleraMat = _eyeOverride ? _eyeOverride.sclera : EYE_W;
  const pupilMat = _eyeOverride ? _eyeOverride.pupil : EYE_B;
  for (const s of [-1, 1]) {
    const e = mesh(G.lowSphere, scleraMat);
    e.scale.setScalar(size);
    e.position.set(s * spread, y, z);
    target.add(e);
    // A boss's glowing eye reads as a solid orb (no dark pupil dot on top).
    if (pupils && !_eyeOverride) {
      const p = mesh(G.lowSphere, pupilMat);
      p.scale.setScalar(size * 0.55);
      p.position.set(s * spread, y, z + size * 0.7);
      target.add(p);
    }
  }
}

// Shade a hex color by a factor (<1 darker, >1 lighter), clamped.
function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r * f);
  c.g = Math.min(1, c.g * f);
  c.b = Math.min(1, c.b * f);
  return c.getHex();
}

// ---------------------------------------------------------------------------
// Procedural surface detail. We have no image textures, so "texture" is faked
// with tiny tinted meshes hugging the body: spots/patches, fur tufts, a mane,
// and claws/nails. All deterministic (index-driven, no Math.random) and opt-in
// per family so we never pay for detail a creature doesn't want.
// ---------------------------------------------------------------------------

// Flattened blotches stuck to a body sphere/dome, tinted darker than the tint.
function addSpots(target, r, tint, count = 6, factor = 0.7) {
  const m = lambert(shade(tint, factor));
  for (let i = 0; i < count; i++) {
    const a = (i * 2.39996);                 // golden-angle spread, deterministic
    const y = (i / count) * 1.4 - 0.5;
    const spot = mesh(G.lowSphere, m);
    const sr = r * (0.18 + (i % 3) * 0.05);
    spot.scale.set(sr, sr * 0.5, sr);
    spot.position.set(Math.cos(a) * r * 0.85, y * r, Math.sin(a) * r * 0.85 + r * 0.3);
    target.add(spot);
  }
}

// Short fur tufts ringing a body part (cones flared outward) — shaggy look.
function addFur(target, r, tint, rings = 2, perRing = 8, factor = 0.85) {
  const m = lambert(shade(tint, factor));
  for (let ring = 0; ring < rings; ring++) {
    const y = r * (0.1 - ring * 0.35);
    for (let i = 0; i < perRing; i++) {
      const a = (i / perRing) * Math.PI * 2 + ring * 0.4;
      const tuft = mesh(G.cone, m);
      tuft.scale.set(0.025 * r * 4, 0.06 * r * 4, 0.025 * r * 4);
      tuft.position.set(Math.cos(a) * r * 0.9, y, Math.sin(a) * r * 0.9);
      tuft.rotation.z = -Math.cos(a) * 1.4;
      tuft.rotation.x = Math.sin(a) * 1.4;
      target.add(tuft);
    }
  }
}

// A mane/crest of tufts running down the back of a head/neck group.
function addMane(target, hs, color, count = 5) {
  const m = lambert(color);
  for (let i = 0; i < count; i++) {
    const tuft = mesh(G.cone, m);
    const t = i / Math.max(1, count - 1);
    tuft.scale.set(hs * 0.18, hs * (0.5 - t * 0.2), hs * 0.18);
    tuft.position.set(0, hs * (0.7 - t * 0.3), -hs * (0.5 + t * 0.5));
    tuft.rotation.x = -0.5 - t * 0.3;
    target.add(tuft);
  }
}

// Claws/nails: little white cones at the end of a limb pivot or paw.
function addClaws(target, y, z, spread, size, count = 3, mat) {
  const m = mat || lambert(0xf0ece0);
  for (let i = 0; i < count; i++) {
    const claw = mesh(G.cone, m);
    claw.scale.set(size * 0.4, size, size * 0.4);
    claw.position.set((i - (count - 1) / 2) * spread, y, z);
    claw.rotation.x = Math.PI * 0.5 + 0.3;
    target.add(claw);
  }
}

// Family -> builder mapping. Each builder receives (root, body) where `body`
// is the tinted main material, and returns a list of animated parts.

// Humanoid: torso + head + arms + legs, parameterized for the many bipeds.
function humanoid(root, body, o) {
  const skinMat = o.skinMat || body;
  const h = o.height || 1.0;
  const girth = o.girth || 1.0;
  const parts = { type: 'biped', legs: [], arms: [] };

  const torsoH = 0.34 * h;
  const torsoR = 0.24 * girth;
  const hipY = 0.45 * h;
  const torsoY = hipY + torsoH * 0.55;
  const headY = torsoY + torsoH * 0.6 + 0.22 * h;

  // legs
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.11 * girth, hipY, 0);
    const leg = mesh(G.capsule, body);
    leg.scale.set(0.085 * girth, 0.11 * h, 0.085 * girth);
    leg.position.y = -0.16 * h;
    pivot.add(leg);
    root.add(pivot);
    parts.legs.push(pivot);
  }

  // hips
  const hips = mesh(G.sphere, body);
  hips.scale.set(torsoR * 1.05, torsoR * 0.7, torsoR * 0.9);
  hips.position.y = hipY + 0.04;
  root.add(hips);

  // torso
  const torso = mesh(G.capsule, body);
  torso.scale.set(torsoR, torsoH * 0.5, torsoR * 0.85);
  torso.position.y = torsoY;
  root.add(torso);

  // arms
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * (torsoR + 0.05), torsoY + torsoH * 0.35, 0);
    pivot.rotation.z = s * 0.12;
    const arm = mesh(G.capsule, skinMat);
    arm.scale.set(0.06 * girth, 0.1 * h, 0.06 * girth);
    arm.position.y = -0.13 * h;
    pivot.add(arm);
    root.add(pivot);
    parts.arms.push(pivot);
  }

  // head
  const head = new THREE.Group();
  head.position.y = headY;
  const skull = mesh(G.sphere, skinMat);
  const hs = 0.2 * (o.headScale || 1);
  skull.scale.setScalar(hs);
  head.add(skull);
  addEyes(head, 0.04, hs * 0.95, hs * 0.45, hs * 0.32);

  if (o.tusks) {
    for (const s of [-1, 1]) {
      const t = mesh(G.cone, lambert(WHITE));
      t.scale.set(0.018, 0.06, 0.018);
      t.position.set(s * hs * 0.4, -hs * 0.55, hs * 0.7);
      t.rotation.x = Math.PI;
      head.add(t);
    }
  }
  if (o.horns) {
    const hm = lambert(o.hornColor || shade(o.tint, 0.5));
    for (const s of [-1, 1]) {
      const horn = mesh(G.cone, hm);
      horn.scale.set(0.03, 0.12, 0.03);
      horn.position.set(s * hs * 0.5, hs * 0.9, -hs * 0.1);
      horn.rotation.z = -s * 0.3;
      head.add(horn);
    }
  }
  if (o.hood) {
    const hood = mesh(G.dome, lambert(o.hoodColor || shade(o.tint, 0.7)));
    hood.scale.set(hs * 1.3, hs * 1.5, hs * 1.3);
    hood.position.y = hs * 0.1;
    head.add(hood);
  }
  if (o.hair) {
    const cap = mesh(G.dome, lambert(o.hairColor || 0x6a4a2a));
    cap.scale.setScalar(hs * 1.08);
    cap.position.y = hs * 0.1;
    head.add(cap);
  }
  if (o.ears) {
    for (const s of [-1, 1]) {
      const ear = mesh(G.cone, skinMat);
      ear.scale.set(0.02, 0.07, 0.02);
      ear.position.set(s * hs * 0.85, hs * 0.5, 0);
      ear.rotation.z = -s * 0.6;
      head.add(ear);
    }
  }
  if (o.mane) addMane(head, hs, o.maneColor || shade(o.tint, 0.6), o.maneCount || 5);
  root.add(head);
  parts.head = head;

  // Surface detail (opt-in): blotches on the torso, claws on the hands, a belt
  // or shoulder pads for armored humanoids (knights, orc warriors).
  if (o.spots) addSpots(torso, torsoR, o.tint, o.spotCount || 6, o.spotFactor || 0.7);
  if (o.claws) {
    for (const arm of parts.arms) addClaws(arm, -0.26 * h, 0.02, 0.018, 0.03 * girth, 3);
  }
  if (o.shoulders) {
    const sm = lambert(o.armorColor || shade(o.tint, 0.55));
    for (const s of [-1, 1]) {
      const pad = mesh(G.dome, sm);
      pad.scale.set(torsoR * 0.55, torsoR * 0.45, torsoR * 0.55);
      pad.position.set(s * (torsoR + 0.03), torsoY + torsoH * 0.42, 0);
      root.add(pad);
    }
  }
  if (o.belly) {
    const bm = lambert(o.bellyColor || shade(o.tint, 1.3));
    const belly = mesh(G.sphere, bm);
    belly.scale.set(torsoR * 0.7, torsoH * 0.42, torsoR * 0.6);
    belly.position.set(0, torsoY - torsoH * 0.05, torsoR * 0.55);
    root.add(belly);
  }

  // Where the fist sits in the arm-pivot's local space, so a weapon grip lands
  // in the hand (the capsule hangs to -0.13h and is 0.1h long → tip ≈ -0.23h).
  parts.armLen = h;
  parts.handY = -0.23 * h;
  parts.handR = 0.06 * girth;   // arm radius, to push the grip just outside it
  parts.baseY = torsoY;
  return parts;
}

// Centaur: a humanoid upper body grafted onto a four-legged horse body. Carries
// a weapon in the right hand (Tibia-style elf/centaur archers & blademasters).
function centaur(root, body, o) {
  const tint = o.tint;
  const horseMat = o.horseMat || lambert(shade(tint, 0.8));
  const skinMat = o.skinMat || body;
  const parts = { type: 'centaur', legs: [], arms: [] };

  const len = o.len || 0.7;
  const r = o.bodyR || 0.2;
  const legLen = o.legLen || 0.34;
  const bodyY = legLen + r * 0.6;

  // horse barrel
  const trunk = mesh(G.capsule, horseMat);
  trunk.rotation.x = Math.PI / 2;
  trunk.scale.set(r, len * 0.5, r);
  trunk.position.set(0, bodyY, 0);
  root.add(trunk);

  // four legs at the corners
  const legX = r * 0.7, legZ = len * 0.42;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * legX, bodyY - r * 0.4, sz * legZ);
    const leg = mesh(G.capsule, horseMat);
    leg.scale.set(0.05, legLen * 0.45, 0.05);
    leg.position.y = -legLen * 0.5;
    pivot.add(leg);
    // little hoof
    const hoof = mesh(G.lowSphere, lambert(0x2a2018));
    hoof.scale.setScalar(0.05);
    hoof.position.y = -legLen;
    pivot.add(hoof);
    root.add(pivot);
    parts.legs.push({ pivot, dir: sz });
  }

  // tail
  const tail = mesh(G.capsule, horseMat);
  tail.scale.set(0.05, 0.16, 0.05);
  tail.rotation.x = 0.8;
  tail.position.set(0, bodyY + r * 0.2, -legZ - r * 0.4);
  root.add(tail);
  parts.tail = tail;

  // humanoid torso rising from the front of the barrel
  const torsoR = r * 0.7;
  const torsoY = bodyY + r * 0.9;
  const torso = mesh(G.capsule, body);
  torso.scale.set(torsoR, r * 0.7, torsoR * 0.85);
  torso.position.set(0, torsoY, legZ * 0.6);
  root.add(torso);

  // arms
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * (torsoR + 0.04), torsoY + r * 0.25, legZ * 0.6);
    pivot.rotation.z = s * 0.12;
    const arm = mesh(G.capsule, skinMat);
    arm.scale.set(0.05, 0.11, 0.05);
    arm.position.y = -0.13;
    pivot.add(arm);
    root.add(pivot);
    parts.arms.push(pivot);
  }

  // head
  const head = new THREE.Group();
  const hs = 0.16;
  head.position.set(0, torsoY + r * 0.7, legZ * 0.6);
  const skull = mesh(G.sphere, skinMat);
  skull.scale.setScalar(hs);
  head.add(skull);
  addEyes(head, 0.04, hs * 0.95, hs * 0.45, hs * 0.32);
  addMane(head, hs, o.maneColor || shade(tint, 0.6), 5);
  root.add(head);
  parts.head = head;

  parts.armLen = 1.0;
  parts.handY = -0.24;
  parts.handR = 0.05;
  parts.baseY = torsoY;
  return parts;
}

// Quadruped: oblong body on four legs (boar, wolf, bear, deer, sheep).
function quadruped(root, body, o) {
  const h = o.height || 1.0;
  const len = o.len || 0.6;
  const r = o.bodyR || 0.22;
  const legLen = o.legLen || 0.3;
  const parts = { type: 'quad', legs: [] };

  const bodyY = legLen + r * 0.6;
  const trunk = mesh(G.capsule, body);
  trunk.rotation.x = Math.PI / 2;
  trunk.scale.set(r, len * 0.5, r * (o.flat || 1));
  trunk.position.y = bodyY;
  root.add(trunk);

  // legs at four corners
  const legX = r * 0.7;
  const legZ = len * 0.42;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * legX, bodyY - r * 0.4, sz * legZ);
    const leg = mesh(G.capsule, o.legMat || body);
    leg.scale.set(0.05, legLen * 0.45, 0.05);
    leg.position.y = -legLen * 0.5;
    pivot.add(leg);
    root.add(pivot);
    parts.legs.push({ pivot, dir: sz });
  }

  // head at +Z front
  const head = new THREE.Group();
  head.position.set(0, bodyY + r * 0.3, legZ + r * 0.5);
  const skull = mesh(G.sphere, body);
  skull.scale.set(r * 0.7, r * 0.7, r * 0.8);
  head.add(skull);
  if (o.snout) {
    const snout = mesh(G.capsule, body);
    snout.rotation.x = Math.PI / 2;
    snout.scale.set(r * 0.4, r * 0.3, r * 0.4);
    snout.position.z = r * 0.6;
    head.add(snout);
  }
  addEyes(head, r * 0.2, r * 0.6, r * 0.35, r * 0.18);
  if (o.ears) {
    for (const s of [-1, 1]) {
      const ear = mesh(G.cone, body);
      ear.scale.set(0.03, 0.08, 0.03);
      ear.position.set(s * r * 0.4, r * 0.7, 0);
      head.add(ear);
    }
  }
  if (o.antlers) {
    for (const s of [-1, 1]) {
      const a = mesh(G.cone, lambert(0x8a6a3a));
      a.scale.set(0.02, 0.18, 0.02);
      a.position.set(s * r * 0.4, r * 0.9, -r * 0.1);
      a.rotation.z = -s * 0.4;
      head.add(a);
    }
  }
  if (o.tusks) {
    for (const s of [-1, 1]) {
      const t = mesh(G.cone, lambert(WHITE));
      t.scale.set(0.015, 0.05, 0.015);
      t.position.set(s * r * 0.3, -r * 0.1, r * 0.5);
      t.rotation.x = -0.4;
      head.add(t);
    }
  }
  root.add(head);
  parts.head = head;

  // tail
  if (o.tail) {
    const tail = mesh(G.capsule, body);
    tail.scale.set(0.04, 0.12, 0.04);
    tail.rotation.x = 0.8;
    tail.position.set(0, bodyY + r * 0.2, -legZ - r * 0.3);
    root.add(tail);
    parts.tail = tail;
  }
  if (o.fluffy) {
    const wool = mesh(G.sphere, o.legMat || body);
    wool.scale.set(r * 1.25, r * 1.2, len * 0.6);
    wool.position.y = bodyY;
    root.add(wool);
  }
  return parts;
}

// Serpentine: stacked spheres forming a wavy body, no legs (snake/serpent).
function serpent(root, body, o) {
  const seg = o.segments || 8;
  const r = o.bodyR || 0.13;
  const step = o.step || 0.18;
  const parts = { type: 'serpent', segs: [] };
  const groundY = r;
  for (let i = 0; i < seg; i++) {
    const m = mesh(G.sphere, body);
    const sr = r * (1 - i / (seg * 2));
    m.scale.setScalar(sr);
    m.position.set(0, groundY, -i * step);
    root.add(m);
    parts.segs.push({ m, i });
  }
  // head with eyes at the front (i=0). The head is a unit sphere scaled to sr,
  // so eye coords are in unit space: keep them small fractions or they balloon
  // off the face. (Was 0.4/0.6/0.4/0.4 — eyes 3× the head radius.)
  const head = parts.segs[0].m;
  addEyes(head, 0.35, 0.7, 0.42, 0.16);
  if (o.frill) {
    const hood = mesh(G.dome, body);
    hood.scale.set(r * 2, r * 0.6, r * 1.4);
    hood.rotation.x = -Math.PI / 2;
    hood.position.set(0, groundY + r * 0.4, step * 0.5);
    root.add(hood);
  }
  parts.groundY = groundY;
  parts.step = step;
  return parts;
}

// Blob: a single squishy dome (slime), with eyes.
function blob(root, body, o) {
  const r = o.bodyR || 0.3;
  const dome = mesh(G.dome, body);
  dome.scale.set(r, r * 0.85, r);
  root.add(dome);
  addEyes(dome, 0.5, 0.55, 0.3, 0.22);
  return { type: 'blob', dome, baseScaleY: r * 0.85 };
}

// Multi-leg bug: round body + many legs (spider, scorpion, crab, beetle).
function bug(root, body, o) {
  const r = o.bodyR || 0.2;
  const legCount = o.legs || 8;
  const legY = r * 0.5;
  const parts = { type: 'bug', legs: [] };

  const abdomen = mesh(G.sphere, body);
  abdomen.scale.set(r, r * (o.flat || 0.75), r * 1.1);
  abdomen.position.set(0, legY + r * 0.3, -r * 0.3);
  root.add(abdomen);

  const headSeg = mesh(G.sphere, body);
  headSeg.scale.set(r * 0.7, r * 0.55, r * 0.7);
  headSeg.position.set(0, legY + r * 0.3, r * 0.6);
  root.add(headSeg);
  addEyes(headSeg, r * 0.4, r * 0.5, r * 0.3, r * 0.18);

  // legs spread along the sides
  const perSide = legCount / 2;
  for (let i = 0; i < perSide; i++) {
    const z = (i / Math.max(1, perSide - 1) - 0.5) * r * 1.6;
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * r * 0.6, legY, z);
      pivot.rotation.z = s * 0.7;
      const leg = mesh(G.capsule, o.legMat || body);
      leg.scale.set(0.018, r * 0.5, 0.018);
      leg.position.y = -r * 0.4;
      pivot.add(leg);
      root.add(pivot);
      parts.legs.push({ pivot, phase: i });
    }
  }

  if (o.claws) {
    for (const s of [-1, 1]) {
      const claw = mesh(G.sphere, body);
      claw.scale.set(r * 0.4, r * 0.25, r * 0.5);
      claw.position.set(s * r * 0.7, legY + r * 0.2, r * 1.1);
      root.add(claw);
    }
  }
  if (o.shell) {
    const shell = mesh(G.dome, o.shellMat || lambert(shade(o.tint, 0.7)));
    shell.scale.set(r * 1.2, r * 0.9, r * 1.3);
    shell.position.set(0, legY + r * 0.3, -r * 0.3);
    root.add(shell);
  }
  if (o.sting) {
    const tail = new THREE.Group();
    tail.position.set(0, legY + r * 0.4, -r * 1.0);
    for (let i = 0; i < 3; i++) {
      const seg = mesh(G.sphere, body);
      seg.scale.setScalar(r * (0.25 - i * 0.04));
      seg.position.set(0, i * r * 0.3, -i * r * 0.15);
      tail.add(seg);
    }
    const stinger = mesh(G.cone, body);
    stinger.scale.set(r * 0.12, r * 0.3, r * 0.12);
    stinger.position.set(0, r * 1.0, -r * 0.4);
    tail.add(stinger);
    root.add(tail);
    parts.tail = tail;
  }
  parts.baseY = legY + r * 0.3;
  return parts;
}

// Flyer: small body + a pair of flapping wings (bat, wasp, fairy, harpy).
function flyer(root, body, o) {
  const r = o.bodyR || 0.14;
  const hover = o.hover != null ? o.hover : 0.5;
  const parts = { type: 'flyer', wings: [] };

  const torso = mesh(G.capsule, body);
  torso.scale.set(r, r * 1.1, r);
  torso.position.y = hover;
  root.add(torso);
  addEyes(torso, r * 0.4, r * 0.7, r * 0.4, r * 0.3);

  const wingMat = o.wingMat || lambert(shade(o.tint, 1.1));
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * r * 0.6, hover + r * 0.2, 0);
    const wing = mesh(G.sphere, wingMat);
    wing.scale.set(o.wingLen || r * 2.2, r * 0.08, r * 1.1);
    wing.position.x = s * (o.wingLen || r * 2.2);
    pivot.add(wing);
    root.add(pivot);
    parts.wings.push({ pivot, side: s });
  }

  if (o.stripes && o.sting) {
    const stinger = mesh(G.cone, lambert(DARK));
    stinger.scale.set(r * 0.2, r * 0.4, r * 0.2);
    stinger.position.set(0, hover, -r * 1.1);
    stinger.rotation.x = Math.PI / 2;
    root.add(stinger);
  }
  if (o.legsBelow) {
    for (const s of [-1, 1]) {
      const leg = mesh(G.capsule, o.legMat || body);
      leg.scale.set(0.02, hover * 0.4, 0.02);
      leg.position.set(s * r * 0.4, hover * 0.6, 0);
      root.add(leg);
    }
  }
  parts.hover = hover;
  return parts;
}

// Floater: drifting ghostly/jelly shape with a tapered tail (ghost, wraith, jellyfish).
function floater(root, body, o) {
  const r = o.bodyR || 0.22;
  const hover = o.hover != null ? o.hover : 0.55;
  const dome = mesh(G.dome, body);
  dome.scale.set(r, r * 1.1, r);
  dome.position.y = hover;
  root.add(dome);
  if (!o.noEyes) addEyes(dome, 0.3, 0.55, 0.35, 0.22);

  const parts = { type: 'floater', tendrils: [], dome, hover };
  const tn = o.tendrils || 5;
  for (let i = 0; i < tn; i++) {
    const a = (i / tn) * Math.PI * 2;
    const t = mesh(G.capsule, body);
    t.scale.set(0.02, r * 0.5, 0.02);
    t.position.set(Math.cos(a) * r * 0.5, hover - r * 0.5, Math.sin(a) * r * 0.5);
    root.add(t);
    parts.tendrils.push({ t, phase: i });
  }
  return parts;
}

// Winged reptile: body + wings + horns + long tail (dragon, wyvern, gargoyle).
function dragon(root, body, o) {
  const r = o.bodyR || 0.26;
  const standY = o.standY || 0.5;
  const parts = { type: 'dragon', wings: [], legs: [] };

  const trunk = mesh(G.capsule, body);
  trunk.rotation.x = Math.PI / 2;
  trunk.scale.set(r, r * 1.4, r);
  trunk.position.set(0, standY, 0);
  root.add(trunk);

  // neck + head
  const neck = mesh(G.capsule, body);
  neck.scale.set(r * 0.4, r * 0.7, r * 0.4);
  neck.rotation.x = 0.5;
  neck.position.set(0, standY + r * 0.6, r * 0.7);
  root.add(neck);

  const head = new THREE.Group();
  head.position.set(0, standY + r * 1.1, r * 1.0);
  const skull = mesh(G.sphere, body);
  skull.scale.set(r * 0.5, r * 0.5, r * 0.7);
  head.add(skull);
  addEyes(head, r * 0.3, r * 0.5, r * 0.3, r * 0.18);
  for (const s of [-1, 1]) {
    const horn = mesh(G.cone, lambert(shade(o.tint, 0.5)));
    horn.scale.set(0.025, 0.12, 0.025);
    horn.position.set(s * r * 0.3, r * 0.5, -r * 0.3);
    horn.rotation.x = -0.4;
    head.add(horn);
  }
  root.add(head);
  parts.head = head;

  // wings
  const wingMat = o.wingMat || lambert(shade(o.tint, 0.8));
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * r * 0.6, standY + r * 0.6, -r * 0.2);
    const wing = mesh(G.sphere, wingMat);
    wing.scale.set(r * 1.8, r * 0.06, r * 1.2);
    wing.position.x = s * r * 1.6;
    pivot.add(wing);
    root.add(pivot);
    parts.wings.push({ pivot, side: s });
  }

  // FOUR legs (front pair shorter, hind pair sturdier) for a proper drake stance,
  // each on a pivot so they stride. Front at +Z, hind at -Z under the body.
  parts.legs = [];
  for (const [sx, sz, len, thick] of [
    [-1, 0.55, 0.4, 0.055], [1, 0.55, 0.4, 0.055],   // front
    [-1, -0.45, 0.5, 0.07], [1, -0.45, 0.5, 0.07],   // hind
  ]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * r * 0.62, standY * 0.6, sz * r);
    const leg = mesh(G.capsule, body);
    leg.scale.set(thick, standY * len, thick);
    leg.position.y = -standY * len * 0.9;
    pivot.add(leg);
    // clawed foot
    const foot = mesh(G.sphere, body);
    foot.scale.set(thick * 1.6, thick, thick * 2.2);
    foot.position.set(0, -standY * len * 1.7, thick * 1.5);
    pivot.add(foot);
    root.add(pivot);
    parts.legs.push({ pivot, dir: sz > 0 ? 1 : -1 });
  }

  // long tapering tail that sweeps to the ground
  const tail = new THREE.Group();
  tail.position.set(0, standY, -r * 1.0);
  for (let i = 0; i < 7; i++) {
    const seg = mesh(G.sphere, body);
    seg.scale.setScalar(r * (0.55 - i * 0.07));
    seg.position.set(0, -i * r * 0.08, -i * r * 0.42);
    tail.add(seg);
  }
  root.add(tail);
  parts.tail = tail;
  return parts;
}

// Hydra: low body with several rearing necks/heads.
function hydra(root, body, o) {
  const r = o.bodyR || 0.3;
  const standY = 0.4;
  const parts = { type: 'hydra', necks: [] };
  const trunk = mesh(G.sphere, body);
  trunk.scale.set(r, r * 0.7, r * 1.2);
  trunk.position.y = standY;
  root.add(trunk);

  for (let n = 0; n < (o.heads || 3); n++) {
    const x = (n - (o.heads || 3) / 2 + 0.5) * r * 0.7;
    const neck = new THREE.Group();
    neck.position.set(x, standY + r * 0.3, r * 0.4);
    for (let i = 0; i < 3; i++) {
      const seg = mesh(G.sphere, body);
      seg.scale.setScalar(r * 0.22);
      seg.position.set(0, i * r * 0.35, i * r * 0.1);
      neck.add(seg);
    }
    const head = mesh(G.sphere, body);
    head.scale.set(r * 0.3, r * 0.3, r * 0.4);
    head.position.set(0, r * 1.1, r * 0.35);
    neck.add(head);
    addEyes(head, 0.3, 0.5, 0.4, 0.3);
    root.add(neck);
    parts.necks.push({ neck, phase: n });
  }
  // four stubby legs
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = mesh(G.capsule, body);
    leg.scale.set(0.06, standY * 0.4, 0.06);
    leg.position.set(sx * r * 0.6, standY * 0.5, sz * r * 0.7);
    root.add(leg);
  }
  return parts;
}

// Worm: low segmented tube lying on the ground.
function worm(root, body, o) {
  const seg = o.segments || 6;
  const r = o.bodyR || 0.08;
  const parts = { type: 'worm', segs: [] };
  for (let i = 0; i < seg; i++) {
    const m = mesh(G.sphere, body);
    const sr = r * (1 - Math.abs(i - seg / 2) / seg * 0.5);
    m.scale.setScalar(sr);
    m.position.set(0, r, -i * r * 1.6 + seg * r * 0.8);
    root.add(m);
    parts.segs.push({ m, i });
  }
  addEyes(parts.segs[0].m, 0.4, 0.6, 0.4, 0.4);
  parts.r = r;
  return parts;
}

// Aquatic body with a tail and dorsal fin (shark, fish).
function fish(root, body, o) {
  const r = o.bodyR || 0.18;
  const hover = o.hover != null ? o.hover : 0.4;
  const trunk = mesh(G.capsule, body);
  trunk.rotation.x = Math.PI / 2;
  trunk.scale.set(r, r * 1.6, r * 0.85);
  trunk.position.y = hover;
  root.add(trunk);
  addEyes(trunk, r * 0.4, r * 0.6, r * 0.45, r * 0.2);

  const fin = mesh(G.cone, body);
  fin.scale.set(r * 0.5, r * 0.7, r * 0.1);
  fin.position.set(0, hover + r, 0);
  root.add(fin);

  const tail = new THREE.Group();
  tail.position.set(0, hover, -r * 1.8);
  const tf = mesh(G.cone, body);
  tf.scale.set(r * 0.5, r * 0.7, r * 0.1);
  tf.rotation.z = Math.PI / 2;
  tf.rotation.y = Math.PI / 2;
  tail.add(tf);
  root.add(tail);
  return { type: 'fish', tail, hover, trunk };
}

// Shelled body (turtle): dome shell on a low body with stubby legs.
function turtle(root, body, o) {
  const r = o.bodyR || 0.26;
  const legY = r * 0.3;
  const parts = { type: 'turtle', legs: [], head: null };
  const shell = mesh(G.dome, o.shellMat || body);
  shell.scale.set(r, r * 0.8, r);
  shell.position.y = legY + r * 0.2;
  root.add(shell);
  const belly = mesh(G.sphere, lambert(shade(o.tint, 1.3)));
  belly.scale.set(r * 0.95, r * 0.3, r * 0.95);
  belly.position.y = legY + r * 0.1;
  root.add(belly);

  const head = mesh(G.sphere, lambert(o.skinColor || shade(o.tint, 1.2)));
  head.scale.set(r * 0.3, r * 0.3, r * 0.35);
  head.position.set(0, legY + r * 0.4, r * 0.9);
  root.add(head);
  addEyes(head, 0.3, 0.6, 0.4, 0.3);
  parts.head = head;

  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * r * 0.7, legY, sz * r * 0.6);
    const leg = mesh(G.capsule, lambert(o.skinColor || shade(o.tint, 1.2)));
    leg.scale.set(0.04, legY * 0.6, 0.04);
    leg.position.y = -legY * 0.4;
    pivot.add(leg);
    root.add(pivot);
    parts.legs.push({ pivot, dir: sz });
  }
  return parts;
}

// Bulky construct (golem, treant): big body, chunky limbs.
function bulky(root, body, o) {
  const h = o.height || 1.1;
  const parts = { type: 'bulky', arms: [], legs: [] };
  const torsoR = 0.32;
  const torsoY = 0.55 * h;

  const torso = mesh(G.sphere, body);
  torso.scale.set(torsoR, torsoR * 1.2, torsoR * 0.9);
  torso.position.y = torsoY;
  root.add(torso);

  const head = new THREE.Group();
  head.position.y = torsoY + torsoR * 1.3;
  const skull = mesh(G.sphere, body);
  const hs = 0.18;
  skull.scale.setScalar(hs);
  head.add(skull);
  // Eyes sized to the skull (was a fixed 0.4 spread/size — bigger than the head).
  addEyes(head, hs * 0.1, hs * 0.95, hs * 0.45, hs * 0.32);
  if (o.canopy) {
    const leaves = mesh(G.sphere, o.canopyMat || lambert(0x3a6a2a));
    leaves.scale.setScalar(0.3);
    leaves.position.y = 0.1;
    head.add(leaves);
  }
  root.add(head);
  parts.head = head;

  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * (torsoR + 0.06), torsoY + torsoR * 0.4, 0);
    pivot.rotation.z = s * 0.15;
    const arm = mesh(G.capsule, body);
    arm.scale.set(0.09, 0.14 * h, 0.09);
    arm.position.y = -0.18 * h;
    pivot.add(arm);
    root.add(pivot);
    parts.arms.push(pivot);
  }
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.14, 0.3 * h, 0);
    const leg = mesh(G.capsule, body);
    leg.scale.set(0.1, 0.13 * h, 0.1);
    leg.position.y = -0.16 * h;
    pivot.add(leg);
    root.add(pivot);
    parts.legs.push(pivot);
  }
  parts.baseY = torsoY;
  return parts;
}

// Mushroom: stalk + cap.
function mushroom(root, body, o) {
  const stalkMat = lambert(o.stalkColor || 0xeeddcc);
  const stalk = mesh(G.capsule, stalkMat);
  stalk.scale.set(0.1, 0.18, 0.1);
  stalk.position.y = 0.28;
  root.add(stalk);
  const cap = mesh(G.dome, body);
  cap.scale.set(0.28, 0.22, 0.28);
  cap.position.y = 0.42;
  root.add(cap);
  addEyes(stalk, 0.3, 0.7, 0.35, 0.25);
  return { type: 'mushroom', cap, stalk, baseY: 0.42 };
}

// Chicken/bird: round body, beak, comb, legs.
function bird(root, body, o) {
  const r = 0.16;
  const legY = 0.18;
  const parts = { type: 'bird', legs: [], baseY: legY + r };
  const torso = mesh(G.sphere, body);
  torso.scale.set(r, r * 1.1, r * 1.1);
  torso.position.y = legY + r;
  root.add(torso);
  const head = mesh(G.sphere, body);
  head.scale.setScalar(r * 0.6);
  head.position.set(0, legY + r * 1.9, r * 0.4);
  root.add(head);
  addEyes(head, 0.2, 0.6, 0.4, 0.3);
  const beak = mesh(G.cone, lambert(0xddaa33));
  beak.scale.set(r * 0.2, r * 0.3, r * 0.2);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, legY + r * 1.8, r * 0.7);
  root.add(beak);
  const comb = mesh(G.sphere, lambert(o.combColor || 0xcc3322));
  comb.scale.set(r * 0.15, r * 0.2, r * 0.3);
  comb.position.set(0, legY + r * 2.3, r * 0.3);
  root.add(comb);
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * r * 0.4, legY, 0);
    const leg = mesh(G.capsule, lambert(0xddaa33));
    leg.scale.set(0.015, legY * 0.5, 0.015);
    leg.position.y = -legY * 0.4;
    pivot.add(leg);
    root.add(pivot);
    parts.legs.push({ pivot, dir: s });
  }
  return parts;
}

// Frog: squat body, big eyes on top, folded legs.
function frog(root, body, o) {
  const r = 0.18;
  const bodyY = r * 0.7;
  const dome = mesh(G.dome, body);
  dome.scale.set(r, r * 0.8, r * 1.1);
  dome.position.y = bodyY;
  root.add(dome);
  for (const s of [-1, 1]) {
    const eb = mesh(G.sphere, body);
    eb.scale.setScalar(r * 0.4);
    eb.position.set(s * r * 0.4, bodyY + r * 0.7, r * 0.3);
    root.add(eb);
    const ew = mesh(G.lowSphere, EYE_W);
    ew.scale.setScalar(r * 0.3);
    ew.position.set(s * r * 0.4, bodyY + r * 0.8, r * 0.45);
    root.add(ew);
    const ep = mesh(G.lowSphere, EYE_B);
    ep.scale.setScalar(r * 0.15);
    ep.position.set(s * r * 0.4, bodyY + r * 0.8, r * 0.6);
    root.add(ep);
  }
  const parts = { type: 'frog', legs: [] };
  for (const s of [-1, 1]) {
    const leg = mesh(G.capsule, body);
    leg.scale.set(0.04, r * 0.4, 0.04);
    leg.rotation.x = 0.8;
    leg.position.set(s * r * 0.7, r * 0.3, -r * 0.5);
    root.add(leg);
    parts.legs.push(leg);
  }
  parts.dome = dome;
  parts.baseScaleY = r * 0.8;
  parts.baseY = bodyY;
  return parts;
}

// Mimic: a treasure chest with eyes and teeth.
function mimic(root, body, o) {
  const w = 0.3, hh = 0.18;
  const base = mesh(G.sphere, body);
  base.scale.set(w, hh, w * 0.7);
  base.position.y = hh;
  root.add(base);
  const lid = new THREE.Group();
  lid.position.set(0, hh * 1.8, -w * 0.7);
  const lidMesh = mesh(G.dome, body);
  lidMesh.scale.set(w, hh * 1.3, w * 0.7);
  lidMesh.rotation.x = -Math.PI / 2;
  lid.add(lidMesh);
  root.add(lid);
  // tongue + teeth in the gap
  const tongue = mesh(G.sphere, lambert(0xcc4455));
  tongue.scale.set(w * 0.6, hh * 0.3, w * 0.4);
  tongue.position.set(0, hh * 1.6, w * 0.1);
  root.add(tongue);
  for (let i = -2; i <= 2; i++) {
    const tooth = mesh(G.cone, lambert(WHITE));
    tooth.scale.set(0.02, 0.05, 0.02);
    tooth.position.set(i * w * 0.25, hh * 1.85, w * 0.1);
    root.add(tooth);
  }
  addEyes(lid, hh * 1.5, w * 0.3, w * 0.5, w * 0.25);
  return { type: 'mimic', lid, baseLidRot: lid.rotation.x };
}

// Family configuration table. Each entry is [builder, options].
const BUILDERS = {
  // Vermin / small
  worm: [worm, { segments: 6, bodyR: 0.09 }],
  rat: [quadruped, { height: 0.6, len: 0.36, bodyR: 0.12, legLen: 0.14, ears: true, tail: true, snout: true }],
  snake: [serpent, { segments: 9, bodyR: 0.13, frill: true }],
  serpent: [serpent, { segments: 11, bodyR: 0.18, step: 0.22 }],
  slime: [blob, { bodyR: 0.32 }],
  frog: [frog, {}],

  // Bugs
  spider: [bug, { legs: 8, bodyR: 0.2 }],
  scorpion: [bug, { legs: 8, bodyR: 0.18, claws: true, sting: true }],
  beetle: [bug, { legs: 6, bodyR: 0.18, shell: true, flat: 0.6 }],
  crab: [bug, { legs: 6, bodyR: 0.2, claws: true, flat: 0.5, shell: true }],

  // Flyers
  bat: [flyer, { bodyR: 0.13, wingMat: null, hover: 0.6 }],
  wasp: [flyer, { bodyR: 0.12, sting: true, stripes: true, hover: 0.6 }],
  fairy: [flyer, { bodyR: 0.1, hover: 0.7, wingMat: null }],
  harpy: [flyer, { bodyR: 0.18, hover: 0.4, legsBelow: true, wingLen: 0.4 }],

  // Floaters / aquatic
  ghost: [floater, { bodyR: 0.22, hover: 0.6, tendrils: 4 }],
  wraith: [floater, { bodyR: 0.24, hover: 0.65, tendrils: 5, noEyes: false }],
  jellyfish: [floater, { bodyR: 0.2, hover: 0.5, tendrils: 6, noEyes: true }],
  shark: [fish, { bodyR: 0.2, hover: 0.4 }],
  turtle: [turtle, { bodyR: 0.26 }],

  // Quadrupeds
  wolf: [quadruped, { height: 1, len: 0.55, bodyR: 0.16, legLen: 0.3, ears: true, tail: true, snout: true }],
  boar: [quadruped, { height: 1, len: 0.5, bodyR: 0.2, legLen: 0.24, tusks: true, snout: true, tail: true }],
  bear: [quadruped, { height: 1.1, len: 0.55, bodyR: 0.24, legLen: 0.3, ears: true, snout: true }],
  deer: [quadruped, { height: 1.1, len: 0.5, bodyR: 0.15, legLen: 0.38, ears: true, antlers: true, tail: true }],
  sheep: [quadruped, { height: 0.9, len: 0.42, bodyR: 0.2, legLen: 0.22, ears: true, fluffy: true, legMat: null }],
  chicken: [bird, {}],

  // Humanoids
  goblin: [humanoid, { height: 0.85, girth: 0.9, ears: true, headScale: 1.1 }],
  orc: [humanoid, { height: 1.05, girth: 1.25, tusks: true, ears: true, spots: true, spotFactor: 0.65, claws: true, shoulders: true, belly: true, weapon: 'axe' }],
  centaur: [centaur, { weapon: 'sword', weaponBig: true }],
  troll: [humanoid, { height: 1.3, girth: 1.4, ears: true }],
  ogre: [humanoid, { height: 1.25, girth: 1.5 }],
  kobold: [humanoid, { height: 0.7, girth: 0.8, ears: true, headScale: 1.2 }],
  lizardman: [humanoid, { height: 1.05, girth: 1.0, horns: true }],
  minotaur: [humanoid, { height: 1.3, girth: 1.4, horns: true }],
  cyclops: [humanoid, { height: 1.4, girth: 1.5, headScale: 1.3 }],
  dwarf: [humanoid, { height: 0.75, girth: 1.1, hair: true, hairColor: 0xaa6633 }],
  elf: [humanoid, { height: 1.0, girth: 0.85, ears: true, hair: true, hairColor: 0xddcc88 }],
  knight: [humanoid, { height: 1.05, girth: 1.1 }],
  mage: [humanoid, { height: 1.0, girth: 0.9, hood: true }],
  cultist: [humanoid, { height: 1.0, girth: 0.95, hood: true }],
  vampire: [humanoid, { height: 1.05, girth: 0.9, hair: true, hairColor: 0x111111 }],

  // Undead
  skeleton: [humanoid, { height: 1.0, girth: 0.7, skinMat: null }],
  zombie: [humanoid, { height: 1.0, girth: 1.05 }],

  // Demonic
  imp: [humanoid, { height: 0.7, girth: 0.8, horns: true, ears: true }],
  demon: [humanoid, { height: 1.3, girth: 1.3, horns: true, demonWings: true }],

  // Dragons
  dragon: [dragon, { bodyR: 0.28, standY: 0.55 }],
  wyvern: [dragon, { bodyR: 0.24, standY: 0.5 }],
  gargoyle: [dragon, { bodyR: 0.22, standY: 0.5 }],
  hydra: [hydra, { bodyR: 0.32, heads: 3 }],

  // Constructs / plant
  golem: [bulky, { height: 1.2 }],
  treant: [bulky, { height: 1.3, canopy: true }],
  elemental: [blob, { bodyR: 0.28 }],
  mushroom: [mushroom, {}],
  mandrake: [mushroom, { stalkColor: 0x99aa55 }],

  // Trap
  mimic: [mimic, {}],
};

// Fallback generic blob so unknown families never crash.
function genericBlob(root, body) {
  const dome = mesh(G.sphere, body);
  dome.scale.set(0.26, 0.3, 0.26);
  dome.position.y = 0.3;
  root.add(dome);
  addEyes(dome, 0.4, 0.6, 0.3, 0.2);
  return { type: 'blob', dome, baseScaleY: 0.3 };
}

// Demon wings are an add-on after the humanoid is built.
function addDemonWings(root, parts, tint, torsoY) {
  const wingMat = lambert(shade(tint, 0.6));
  parts.wings = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.2, torsoY + 0.1, -0.1);
    const wing = mesh(G.sphere, wingMat);
    wing.scale.set(0.35, 0.04, 0.28);
    wing.position.x = s * 0.3;
    pivot.add(wing);
    root.add(pivot);
    parts.wings.push({ pivot, side: s });
  }
}

// ---------------------------------------------------------------------------
// Design registry. Each authored creature (see src/creatureDesigns.js) provides
// { base, options, decorate, scale, color }. `base` names one of the builders
// below; `decorate(root, parts, o, tint, API)` adds bespoke geometry so every
// creature has its own shape, not just a tint. Registered via registerDesigns().
// ---------------------------------------------------------------------------
const BASE_BUILDERS = {
  humanoid, centaur, quadruped, serpent, blob, bug, flyer, floater,
  dragon, hydra, bulky, worm, fish, turtle, bird, frog, mushroom, mimic,
};

// The helper surface handed to each design's decorate()/options so authored
// code can build with the same primitives the built-ins use.
const MODEL_API = {
  THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws,
  giveWeapon, collectMats, EYE_W, EYE_B, EYE_BOSS, EYE_BOSS_PUPIL, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING,
  // True while building a boss/supreme creature, so a design's custom eyes/relief
  // can read it (e.g. use EYE_BOSS for hand-built eyes). Set in buildCreatureModel.
  get isBoss() { return _eyeOverride != null; },
};

const DESIGNS = {};
// Cache of the UNSCALED foot-lift per design key (how far the model's lowest
// point sits below the origin at unit scale). Computed once via Box3 then reused
// for every spawn of that creature — see buildCreatureModel's footOffset.
const FOOT_LIFT_CACHE = new Map();
export function registerDesigns(map) { Object.assign(DESIGNS, map); }
export function getDesignKeys() { return Object.keys(DESIGNS); }
export { MODEL_API };

// Public factory. `opts.design` is an optional bespoke design key (e.g. a
// variant name like 'frost_dragon' or 'minotaur_guard'); when it names a
// registered design it wins, so per-variant models render instead of every
// variant reusing its base family. Falls back to the family design otherwise.
export function buildCreatureModel(family, opts = {}) {
  const designKey = (opts.design && DESIGNS[opts.design]) ? opts.design : family;
  const design = DESIGNS[designKey];
  const tint = opts.color != null ? opts.color
    : (design && design.color != null ? design.color : 0x999999);
  const scale = opts.scale != null ? opts.scale
    : (design && design.scale != null ? design.scale : 1);

  // Bosses build with glowing red eyes (every addEyes() call this build picks it
  // up). Set BEFORE any geometry is built and cleared right after, so it never
  // leaks into the next creature.
  _eyeOverride = opts.boss ? { sclera: EYE_BOSS, pupil: EYE_BOSS_PUPIL } : null;

  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  // Main tinted body material (one per model so per-instance tint works).
  const bodyMat = lambert(tint);
  const materials = [bodyMat, EYE_W, EYE_B];

  let parts;
  const entry = BUILDERS[family];
  // A registered design wins: run its base builder + its bespoke decorate().
  if (design && BASE_BUILDERS[design.base]) {
    const designOpts = design.optionsFn ? design.optionsFn(MODEL_API) : (design.options || {});
    const o = Object.assign({ tint }, designOpts);
    if (o.skinMat) materials.push(o.skinMat);
    if (o.legMat) materials.push(o.legMat);
    if (o.wingMat) materials.push(o.wingMat);

    parts = BASE_BUILDERS[design.base](root, bodyMat, o);

    // Built-in hand-weapon (same path as the table builders).
    if (o.weapon) {
      const wOpts = Object.assign({ armLen: parts.armLen || 1, big: o.weaponBig, curve: o.weaponCurve, scale: o.weaponScale }, o.weaponOpts || {});
      const w = giveWeapon(parts, o.weapon, wOpts);
      if (w) materials.push(...collectMats(w.grip));
    }
    // Bespoke geometry for this creature's unique silhouette.
    if (design.decorate) {
      try { design.decorate(root, parts, o, tint, MODEL_API); }
      catch (e) { console.warn('decorate failed for', designKey, e); }
      for (const m of collectMats(root)) if (!materials.includes(m)) materials.push(m);
    }
  } else if (entry) {
    const [builder, baseOpts] = entry;
    const o = Object.assign({ tint }, baseOpts);

    // Resolve nullable material slots that should default to the body tint.
    if (family === 'skeleton') o.skinMat = lambert(0xe8e6da);
    if (family === 'sheep') o.legMat = lambert(0x33312e);
    if (family === 'bat') o.wingMat = lambert(shade(tint, 0.7));
    if (family === 'fairy') o.wingMat = lambert(0xffffff);
    if (o.skinMat) materials.push(o.skinMat);
    if (o.legMat) materials.push(o.legMat);
    if (o.wingMat) materials.push(o.wingMat);

    parts = builder(root, bodyMat, o);

    if (family === 'demon') addDemonWings(root, parts, tint, parts.baseY || 0.6);

    // Hand weapon, if the family asked for one. weaponOpts lets a variant tweak
    // the prop (curve/big/spikes/orb colour); armLen aligns the grip to the fist.
    if (o.weapon) {
      const wOpts = Object.assign({ armLen: parts.armLen || 1, big: o.weaponBig, curve: o.weaponCurve }, o.weaponOpts || {});
      const w = giveWeapon(parts, o.weapon, wOpts);
      if (w) materials.push(...collectMats(w.grip));
    }
  } else {
    parts = genericBlob(root, bodyMat);
  }
  _eyeOverride = null;   // geometry built; never leak the boss eyes to the next model

  group.scale.setScalar(scale);

  // Foot offset: many models build their legs reaching BELOW the group origin
  // (negative Y), so placing the origin at terrain height sinks the feet through
  // the ground (worse the bigger the scale). We need how far to LIFT the group so
  // the lowest point rests at y=0 (only sinkers, min.y<0).
  //
  // The geometry is deterministic per design key, and the lowest point scales
  // linearly with `scale` (tint never changes shape), so we measure the UNSCALED
  // lowest point ONCE per design key and cache it — instead of running the
  // O(vertices) Box3().setFromObject on every single spawn (the spawn hitch).
  let unscaledLift = FOOT_LIFT_CACHE.get(designKey);
  if (unscaledLift === undefined) {
    const prevScale = group.scale.x;
    group.scale.setScalar(1);                       // measure at unit scale
    const _bb = new THREE.Box3().setFromObject(group);
    unscaledLift = (isFinite(_bb.min.y) && _bb.min.y < 0) ? -_bb.min.y : 0;
    group.scale.setScalar(prevScale);               // restore
    FOOT_LIFT_CACHE.set(designKey, unscaledLift);
  }
  const footOffset = unscaledLift * scale;

  // Idle / walk + transient ATTACK + DEATH animation. attack() is fired by the
  // combat system on each blow; dieT (0..1) is the death progress passed in
  // while the creature is dying. Both are pose overlays driven by sin(), so they
  // cost nothing per frame and allocate nothing.
  let t = 0;
  let attackT = 0;
  const ATTACK_DUR = 0.4;
  function attack() { attackT = ATTACK_DUR; }
  function update(dt, moving, dieT = 0) {
    t += dt;
    if (attackT > 0) attackT = Math.max(0, attackT - dt);
    const atk = attackT > 0 ? (1 - attackT / ATTACK_DUR) : -1; // 0..1 lunge, or -1 = idle
    const lunge = atk >= 0 ? Math.sin(atk * Math.PI) : 0;       // 0→1→0 envelope

    // DEATH pose takes priority: the body topples / collapses as dieT rises. The
    // outer combat shrink dissolves it afterward.
    if (dieT > 0) {
      const fall = Math.min(1, dieT * 1.4);
      switch (parts.type) {
        case 'dragon': case 'hydra': case 'flyer': case 'floater':
          root.position.y = -fall * 0.4;
          root.rotation.z = fall * 0.6;
          break;
        case 'blob': case 'frog':
          if (parts.dome) parts.dome.scale.y = (parts.baseScaleY || 1) * (1 - fall * 0.8);
          root.position.y = -fall * 0.1;
          break;
        default:
          root.rotation.x = (Math.PI / 2) * fall;   // topple forward
          root.position.y = -fall * 0.2;
      }
      return;
    }

    const move = moving ? 1 : 0.25;        // smaller motion when idle
    const phase = t * (moving ? 8 : 2.2);
    const swing = Math.sin(phase);
    const breath = Math.sin(t * 2.5) * 0.02;
    // Reset any leftover death transform when alive (model reuse safety).
    if (root.rotation.x !== 0 && parts.type !== 'bug') root.rotation.x = 0;

    switch (parts.type) {
      case 'biped':
      case 'bulky': {
        for (let i = 0; i < parts.legs.length; i++) {
          parts.legs[i].rotation.x = swing * 0.5 * move * (i % 2 ? 1 : -1);
        }
        // Attack: both arms chop down hard (overhand smash); else the walk swing.
        for (let i = 0; i < parts.arms.length; i++) {
          parts.arms[i].rotation.x = atk >= 0
            ? -1.5 * lunge
            : swing * 0.4 * move * (i % 2 ? -1 : 1);
        }
        root.position.y = Math.abs(swing) * 0.02 * move + breath;
        if (parts.head) parts.head.rotation.z = Math.sin(t * 1.5) * 0.05;
        if (parts.wings) {
          for (const w of parts.wings) w.pivot.rotation.z = w.side * (0.3 + Math.sin(t * 6) * 0.2);
        }
        break;
      }
      case 'quad': {
        for (const l of parts.legs) {
          l.pivot.rotation.x = swing * 0.5 * move * l.dir;
        }
        root.position.y = Math.abs(swing) * 0.015 * move;
        if (parts.tail) parts.tail.rotation.y = Math.sin(t * 3) * 0.3;
        // Attack: lunge forward and snap the head down (a bite/pounce).
        root.position.z = lunge * 0.18;
        if (parts.head) parts.head.rotation.x = atk >= 0 ? breath + lunge * 0.6 : breath;
        break;
      }
      case 'centaur': {
        // Horse legs trot; the human torso's right arm swings/draws the weapon.
        for (const l of parts.legs) l.pivot.rotation.x = swing * 0.5 * move * l.dir;
        if (parts.tail) parts.tail.rotation.y = Math.sin(t * 3) * 0.3;
        for (let i = 0; i < parts.arms.length; i++) {
          const isWeaponArm = i === parts.arms.length - 1;
          if (isWeaponArm && atk >= 0) {
            // Bow: draw back then release; blade: overhead chop. Both via lunge.
            parts.arms[i].rotation.x = parts.weapon && parts.weapon.kind === 'bow'
              ? -0.6 + lunge * 0.9 : -1.4 * lunge;
          } else {
            parts.arms[i].rotation.x = swing * 0.3 * move * (i % 2 ? -1 : 1);
          }
        }
        root.position.y = Math.abs(swing) * 0.015 * move + breath;
        root.position.z = lunge * 0.12;
        break;
      }
      case 'serpent': {
        for (const s of parts.segs) {
          s.m.position.x = Math.sin(t * 4 + s.i * 0.6) * 0.08 * (s.i / parts.segs.length + 0.3);
          s.m.position.y = parts.groundY + Math.sin(t * 3 + s.i * 0.5) * 0.02;
        }
        break;
      }
      case 'worm': {
        for (const s of parts.segs) {
          s.m.position.y = parts.r + Math.sin(t * 5 + s.i * 0.8) * parts.r * 0.6 * (moving ? 1 : 0.4);
        }
        break;
      }
      case 'blob': {
        const sq = 1 + Math.sin(t * (moving ? 9 : 3)) * 0.08 * (moving ? 1 : 0.6);
        parts.dome.scale.y = parts.baseScaleY * sq;
        root.position.y = Math.max(0, Math.sin(t * (moving ? 9 : 3))) * 0.05 * (moving ? 1 : 0.4);
        break;
      }
      case 'bug': {
        for (const l of parts.legs) {
          l.pivot.rotation.x = Math.sin(t * 8 + l.phase * 1.2) * 0.25 * move;
        }
        root.position.y = breath;
        // Attack: the tail/stinger flicks forward and the body lunges.
        if (parts.tail) parts.tail.rotation.x = (Math.sin(t * 2) * 0.1 - 0.3) - lunge * 0.8;
        root.position.z = lunge * 0.12;
        break;
      }
      case 'flyer': {
        for (const w of parts.wings) {
          w.pivot.rotation.z = w.side * (0.2 + Math.sin(t * 22) * 0.6);
        }
        root.position.y = Math.sin(t * 3) * 0.04;
        break;
      }
      case 'floater': {
        root.position.y = Math.sin(t * 1.8) * 0.05;
        for (const td of parts.tendrils) {
          td.t.rotation.x = Math.sin(t * 2.5 + td.phase) * 0.2;
        }
        break;
      }
      case 'dragon': {
        for (const w of parts.wings) {
          w.pivot.rotation.z = w.side * (0.15 + Math.sin(t * 5) * 0.4);
        }
        // Four legs stride when walking (front/hind alternate via dir).
        if (parts.legs) {
          for (let i = 0; i < parts.legs.length; i++) {
            const l = parts.legs[i];
            l.pivot.rotation.x = swing * 0.5 * move * (i % 2 ? 1 : -1) * l.dir;
          }
        }
        if (parts.tail) parts.tail.rotation.y = Math.sin(t * 2.5) * 0.25;
        root.position.y = Math.sin(t * 2) * 0.03 + breath;
        // Attack: a forward bite — lunge in and dip the head.
        root.position.z = lunge * 0.2;
        if (parts.head) parts.head.rotation.x = lunge * 0.7;
        break;
      }
      case 'hydra': {
        // Each of the heads sways idly; on attack they LUNGE forward in a
        // staggered ripple (the user's signature request).
        for (const nk of parts.necks) {
          nk.neck.rotation.z = Math.sin(t * 2 + nk.phase * 1.5) * 0.2;
          const strike = atk >= 0 ? Math.sin(Math.max(0, atk - nk.phase * 0.12) * Math.PI) : 0;
          nk.neck.rotation.x = Math.sin(t * 1.5 + nk.phase) * 0.1 - strike * 0.9;
        }
        root.position.z = lunge * 0.12;
        break;
      }
      case 'fish': {
        if (parts.tail) parts.tail.rotation.y = Math.sin(t * 7) * 0.5;
        parts.trunk.rotation.z = Math.sin(t * 7) * 0.05;
        root.position.y = Math.sin(t * 2.5) * 0.04;
        break;
      }
      case 'turtle': {
        for (const l of parts.legs) {
          l.pivot.rotation.x = swing * 0.4 * move * l.dir;
        }
        if (parts.head) parts.head.position.z = 0.9 * 0.26 + Math.sin(t * 1.5) * 0.02;
        root.position.y = breath;
        break;
      }
      case 'bird': {
        for (const l of parts.legs) {
          l.pivot.rotation.x = swing * 0.5 * move * l.dir;
        }
        root.position.y = Math.abs(swing) * 0.02 * move + breath;
        break;
      }
      case 'frog': {
        const sq = 1 + Math.sin(t * (moving ? 10 : 3)) * 0.06;
        parts.dome.scale.y = parts.baseScaleY * sq;
        root.position.y = Math.max(0, Math.sin(t * (moving ? 10 : 3))) * 0.04 * move;
        break;
      }
      case 'mushroom': {
        parts.cap.rotation.z = Math.sin(t * 2) * 0.05;
        root.position.y = breath;
        break;
      }
      case 'mimic': {
        parts.lid.rotation.x = parts.baseLidRot + (0.3 + Math.sin(t * (moving ? 12 : 4)) * 0.3) * move;
        break;
      }
      default:
        root.position.y = breath;
    }
    // Expose this frame's body bob/lunge in WORLD units (root lives inside the
    // scaled group) so a rider can ride along with it. rotation.z is the death
    // roll; we only surface the live bob/lunge a mount cares about.
    bob.y = root.position.y * scale;
    bob.z = root.position.z * scale;
  }
  const bob = { y: 0, z: 0 };

  function dispose() {
    group.traverse((obj) => {
      if (obj.isMesh && obj.geometry && !Object.values(G).includes(obj.geometry)) {
        obj.geometry.dispose();
      }
    });
    // Dispose only per-instance materials (shared EYE_*/weapon-palette stay alive).
    for (const m of materials) {
      if (!SHARED_MATS.has(m)) m.dispose();
    }
  }

  return { group, update, attack, dispose, footOffset, bob };
}
