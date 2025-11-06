import * as THREE from 'three';

// Rounded low-poly NPCs in the same friendly style as the player:
// smoothed capsules and spheres, MeshLambertMaterial, no textures.
// Each model faces +Z, feet at y=0, and stands ~1 unit tall.
// buildNpcModel(modelKey, opts) returns { group, update(dt), dispose() }.

const SKIN = 0xe0a87e;
const HAIR_DARK = 0x3a2a1c;
const BOOT = 0x4a3526;

// Per-key palette and build flags. color tint (opts.color) overrides the body.
const PRESETS = {
  man:    { body: 0x4f6d8f, legs: 0x35506b, hair: HAIR_DARK, build: 'broad', hair_style: 'short' },
  woman:  { body: 0x9c5a86, legs: 0x6e3e60, hair: 0x5a3a22, build: 'slim',  hair_style: 'long' },
  priest: { body: 0xe8e4da, legs: 0xe8e4da, hair: 0x6a6a6a, build: 'robe',  trim: 0xb89a3a },
  guard:  { body: 0x6b6f78, legs: 0x4a4d54, hair: HAIR_DARK, build: 'broad', metal: 0x9aa0ab },
  king:   { body: 0x7a2030, legs: 0x4a1420, hair: 0x6a5a3a, build: 'broad', gold: 0xe7c84a },
  wizard: { body: 0x3a3f7a, legs: 0x3a3f7a, hair: 0xb0b0b0, build: 'robe',  trim: 0x8a7adf },
};

export function buildNpcModel(modelKey, opts = {}) {
  const preset = PRESETS[modelKey] || null;
  return preset ? buildFromPreset(modelKey, preset, opts) : buildFallback(opts);
}

function buildFromPreset(key, preset, opts) {
  const scale = opts.scale || 1;
  const bodyColor = opts.color != null ? opts.color : preset.body;

  const mats = {
    skin:  new THREE.MeshLambertMaterial({ color: SKIN }),
    body:  new THREE.MeshLambertMaterial({ color: bodyColor }),
    legs:  new THREE.MeshLambertMaterial({ color: preset.legs }),
    hair:  new THREE.MeshLambertMaterial({ color: preset.hair }),
    boots: new THREE.MeshLambertMaterial({ color: BOOT }),
    eyeW:  new THREE.MeshLambertMaterial({ color: 0xffffff }),
    eyeB:  new THREE.MeshLambertMaterial({ color: 0x26221f }),
    metal: new THREE.MeshLambertMaterial({ color: preset.metal || 0x9aa0ab }),
    gold:  new THREE.MeshLambertMaterial({ color: preset.gold || 0xe7c84a }),
    trim:  new THREE.MeshLambertMaterial({ color: preset.trim || 0xc0a040 }),
  };

  const group = new THREE.Group();
  // Player model is ~1.7 tall; bring NPC to ~1 unit, feet at y=0.
  const model = new THREE.Group();
  model.scale.setScalar(0.56 * scale);
  group.add(model);

  const robe = preset.build === 'robe';
  const slim = preset.build === 'slim';

  // torso: robe uses a tapered cylinder (cone-like), others a capsule
  if (robe) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.8, 16, 1), mats.body);
    skirt.position.y = 0.78;
    model.add(skirt);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mats.body);
    chest.position.y = 1.08;
    chest.scale.set(1, 0.85, 0.9);
    model.add(chest);
    // robe trim band
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 18), mats.trim);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.44;
    model.add(band);
  } else {
    const r = slim ? 0.205 : 0.235;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(r, 0.32, 6, 16), mats.body);
    body.position.y = 0.95;
    body.scale.set(slim ? 0.95 : 1, 1, slim ? 0.92 : 1);
    model.add(body);
    const hips = new THREE.Mesh(new THREE.SphereGeometry(slim ? 0.235 : 0.22, 14, 12), mats.legs);
    hips.scale.set(slim ? 1.05 : 1, 0.7, 0.9);
    hips.position.y = 0.62;
    model.add(hips);
  }

  // king cape over the shoulders
  if (key === 'king') {
    const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.7, 16, 1, true), mats.gold);
    cape.position.set(0, 0.78, -0.12);
    cape.scale.set(1, 1, 0.6);
    model.add(cape);
  }

  // head
  const head = new THREE.Group();
  head.position.y = 1.42;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), mats.skin);
  skull.scale.set(0.92, 1, 0.92);
  skull.position.y = 0.1;
  head.add(skull);

  // hair: skipped when a full head covering hides it (guard helmet, wizard hat)
  const hatLike = key === 'guard' || key === 'wizard';
  if (!hatLike) buildNpcHair(head, preset.hair_style || 'short', mats.hair);

  // eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mats.eyeW);
    eye.position.set(0.09 * side, 0.11, 0.215);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mats.eyeB);
    pupil.position.set(0.09 * side, 0.11, 0.252);
    head.add(pupil);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mats.skin);
  nose.position.set(0, 0.03, 0.255);
  head.add(nose);

  // beard for priest/king/wizard to read as elder figures
  if (key === 'priest' || key === 'king' || key === 'wizard') {
    const beard = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.18, 6, 12), mats.hair);
    beard.scale.set(1, 1, 0.6);
    beard.position.set(0, -0.16, 0.16);
    head.add(beard);
  }

  // headgear
  if (key === 'guard') buildHelmet(head, mats.metal);
  else if (key === 'king') buildCrown(head, mats.gold);
  else if (key === 'wizard') buildWizardHat(head, mats.body, mats.trim);

  model.add(head);

  // arms (shoulder pivot for idle sway)
  const armL = makeArm(model, -1, mats, robe);
  const armR = makeArm(model, 1, mats, robe);

  // legs hidden under a robe; show feet peeking out instead
  let legL = null, legR = null;
  if (robe) {
    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mats.boots);
      foot.scale.set(1, 0.6, 1.3);
      foot.position.set(0.1 * side, 0.05, 0.06);
      model.add(foot);
    }
  } else {
    legL = makeLeg(model, -1, mats);
    legR = makeLeg(model, 1, mats);
  }

  // wizard staff in the right hand
  let staff = null;
  if (key === 'wizard') {
    staff = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 1.1, 8), mats.hair);
    rod.position.y = 0.1;
    staff.add(rod);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), mats.trim);
    orb.position.y = 0.66;
    staff.add(orb);
    staff.position.set(0.34, 0.95, 0.06);
    model.add(staff);
  }

  // king scepter in the right hand
  let scepter = null;
  if (key === 'king') {
    scepter = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), mats.gold);
    rod.position.y = 0.1;
    scepter.add(rod);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mats.gold);
    top.position.y = 0.46;
    scepter.add(top);
    scepter.position.set(0.34, 0.95, 0.06);
    model.add(scepter);
  }

  // idle animation: subtle breathing + sway via a time accumulator (no Math.random)
  let t = 0;
  function update(dt) {
    t += dt;
    const breath = Math.sin(t * 1.6);
    head.position.y = 1.42 + breath * 0.012;
    head.rotation.z = Math.sin(t * 0.8) * 0.03;
    model.rotation.z = breath * 0.006;
    const arm = Math.sin(t * 1.6) * 0.06;
    if (armL) armL.rotation.x = arm;
    if (armR) armR.rotation.x = -arm;
  }

  function dispose() {
    group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const m of Object.values(mats)) m.dispose();
  }

  return { group, update, dispose };
}

function makeArm(model, side, mats, robe) {
  const pivot = new THREE.Group();
  pivot.position.set((robe ? 0.28 : 0.315) * side, 1.18, 0);
  const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mats.body);
  sleeve.position.y = -0.02;
  pivot.add(sleeve);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.24, 5, 12), robe ? mats.body : mats.skin);
  arm.position.y = -0.19;
  pivot.add(arm);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mats.skin);
  palm.position.y = -0.38;
  pivot.add(palm);
  model.add(pivot);
  return pivot;
}

function makeLeg(model, side, mats) {
  const pivot = new THREE.Group();
  pivot.position.set(0.105 * side, 0.52, 0);
  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.24, 5, 12), mats.legs);
  leg.position.y = -0.19;
  pivot.add(leg);
  const foot = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), mats.boots);
  foot.scale.set(1, 0.6, 1.35);
  foot.position.set(0, -0.4, 0.04);
  pivot.add(foot);
  model.add(pivot);
  return pivot;
}

function buildNpcHair(head, style, mat) {
  if (style === 'long') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.292, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), mat);
    cap.scale.set(0.98, 1, 1);
    cap.position.set(0, 0.1, -0.01);
    head.add(cap);
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.24, 6, 12), mat);
    back.scale.set(1.4, 1, 0.55);
    back.position.set(0, -0.04, -0.18);
    head.add(back);
  } else {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.288, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
    cap.scale.set(0.96, 1, 0.98);
    cap.position.set(0, 0.105, -0.01);
    head.add(cap);
  }
}

function buildHelmet(head, mat) {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), mat);
  dome.position.set(0, 0.08, 0);
  head.add(dome);
  // nose guard
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.05), mat);
  guard.position.set(0, 0.06, 0.27);
  head.add(guard);
  // small spike on top
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), mat);
  spike.position.set(0, 0.36, 0);
  head.add(spike);
}

function buildCrown(head, mat) {
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.1, 18, 1, true), mat);
  band.position.set(0, 0.32, 0);
  head.add(band);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), mat);
    point.position.set(Math.sin(a) * 0.26, 0.42, Math.cos(a) * 0.26);
    head.add(point);
  }
}

function buildWizardHat(head, brimMat, coneMat) {
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 18), brimMat);
  brim.position.set(0, 0.3, 0);
  head.add(brim);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 16), brimMat);
  cone.position.set(0, 0.58, 0);
  head.add(cone);
  // tip bauble
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), coneMat);
  tip.position.set(0, 0.86, 0);
  head.add(tip);
}

function buildFallback(opts = {}) {
  const scale = opts.scale || 1;
  const bodyColor = opts.color != null ? opts.color : 0x8a8f99;

  const mats = {
    skin: new THREE.MeshLambertMaterial({ color: SKIN }),
    body: new THREE.MeshLambertMaterial({ color: bodyColor }),
    legs: new THREE.MeshLambertMaterial({ color: 0x444851 }),
    boots: new THREE.MeshLambertMaterial({ color: BOOT }),
    eyeW: new THREE.MeshLambertMaterial({ color: 0xffffff }),
    eyeB: new THREE.MeshLambertMaterial({ color: 0x26221f }),
  };

  const group = new THREE.Group();
  const model = new THREE.Group();
  model.scale.setScalar(0.56 * scale);
  group.add(model);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.235, 0.32, 6, 16), mats.body);
  body.position.y = 0.95;
  model.add(body);
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), mats.legs);
  hips.scale.set(1, 0.7, 0.9);
  hips.position.y = 0.62;
  model.add(hips);

  const head = new THREE.Group();
  head.position.y = 1.42;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), mats.skin);
  skull.scale.set(0.92, 1, 0.92);
  skull.position.y = 0.1;
  head.add(skull);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mats.eyeW);
    eye.position.set(0.09 * side, 0.11, 0.215);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mats.eyeB);
    pupil.position.set(0.09 * side, 0.11, 0.252);
    head.add(pupil);
  }
  model.add(head);

  const armL = makeArm(model, -1, mats, false);
  const armR = makeArm(model, 1, mats, false);
  makeLeg(model, -1, mats);
  makeLeg(model, 1, mats);

  let t = 0;
  function update(dt) {
    t += dt;
    const breath = Math.sin(t * 1.6);
    head.position.y = 1.42 + breath * 0.012;
    model.rotation.z = breath * 0.006;
    armL.rotation.x = Math.sin(t * 1.6) * 0.06;
    armR.rotation.x = -Math.sin(t * 1.6) * 0.06;
  }

  function dispose() {
    group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const m of Object.values(mats)) m.dispose();
  }

  return { group, update, dispose };
}

export const NPC_MODEL_KEYS = ['man', 'woman', 'priest', 'guard', 'king', 'wizard'];
