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
const WHITE = 0xffffff;
const DARK = 0x222222;

// Small mesh helpers.
function mesh(geo, mat) { return new THREE.Mesh(geo, mat); }

function lambert(color) { return new THREE.MeshLambertMaterial({ color }); }

// Add a pair of eyes onto a target at local position with given spread/size.
function addEyes(target, y, z, spread, size, pupils = true) {
  for (const s of [-1, 1]) {
    const e = mesh(G.lowSphere, EYE_W);
    e.scale.setScalar(size);
    e.position.set(s * spread, y, z);
    target.add(e);
    if (pupils) {
      const p = mesh(G.lowSphere, EYE_B);
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
  root.add(head);
  parts.head = head;
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
  // head with eyes at the front (i=0)
  const head = parts.segs[0].m;
  addEyes(head, 0.4, 0.6, 0.4, 0.4);
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

  // legs
  for (const s of [-1, 1]) {
    const leg = mesh(G.capsule, body);
    leg.scale.set(0.06, standY * 0.45, 0.06);
    leg.position.set(s * r * 0.5, standY * 0.55, 0);
    root.add(leg);
  }

  // tail of tapering spheres
  const tail = new THREE.Group();
  tail.position.set(0, standY, -r * 1.0);
  for (let i = 0; i < 5; i++) {
    const seg = mesh(G.sphere, body);
    seg.scale.setScalar(r * (0.5 - i * 0.08));
    seg.position.set(0, 0, -i * r * 0.4);
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
  skull.scale.setScalar(0.18);
  head.add(skull);
  addEyes(head, 0.02, 0.17, 0.4, 0.4);
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
  orc: [humanoid, { height: 1.05, girth: 1.2, tusks: true }],
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

// Public factory.
export function buildCreatureModel(family, opts = {}) {
  const tint = opts.color != null ? opts.color : 0x999999;
  const scale = opts.scale != null ? opts.scale : 1;

  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  // Main tinted body material (one per model so per-instance tint works).
  const bodyMat = lambert(tint);
  const materials = [bodyMat, EYE_W, EYE_B];

  const entry = BUILDERS[family];
  let parts;
  if (entry) {
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
  } else {
    parts = genericBlob(root, bodyMat);
  }

  group.scale.setScalar(scale);

  // Idle / walk animation
  let t = 0;
  function update(dt, moving) {
    t += dt;
    const move = moving ? 1 : 0.25;        // smaller motion when idle
    const phase = t * (moving ? 8 : 2.2);
    const swing = Math.sin(phase);
    const breath = Math.sin(t * 2.5) * 0.02;

    switch (parts.type) {
      case 'biped':
      case 'bulky': {
        for (let i = 0; i < parts.legs.length; i++) {
          parts.legs[i].rotation.x = swing * 0.5 * move * (i % 2 ? 1 : -1);
        }
        for (let i = 0; i < parts.arms.length; i++) {
          parts.arms[i].rotation.x = swing * 0.4 * move * (i % 2 ? -1 : 1);
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
        if (parts.head) parts.head.rotation.x = breath;
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
        if (parts.tail) parts.tail.rotation.x = Math.sin(t * 2) * 0.1 - 0.3;
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
        if (parts.tail) parts.tail.rotation.y = Math.sin(t * 2.5) * 0.25;
        root.position.y = Math.sin(t * 2) * 0.03 + breath;
        break;
      }
      case 'hydra': {
        for (const nk of parts.necks) {
          nk.neck.rotation.z = Math.sin(t * 2 + nk.phase * 1.5) * 0.2;
          nk.neck.rotation.x = Math.sin(t * 1.5 + nk.phase) * 0.1;
        }
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
  }

  function dispose() {
    group.traverse((obj) => {
      if (obj.isMesh && obj.geometry && !Object.values(G).includes(obj.geometry)) {
        obj.geometry.dispose();
      }
    });
    // Dispose only per-instance materials (shared EYE_* stay alive).
    for (const m of materials) {
      if (m !== EYE_W && m !== EYE_B) m.dispose();
    }
  }

  return { group, update, dispose };
}
