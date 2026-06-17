// Hand-authored creature designs (Tibia 7.4 overhaul) — the vermin & dragon
// batches that the design workflow didn't reach. Same format as the auto-generated
// creatureDesigns.js: { base, optionsFn(API), decorate(root, parts, o, tint, API), scale, color }.
// Each one adds bespoke geometry so its silhouette is unique, not a recolor.
//
// Everything is built from the shared low-poly primitives in G (sphere, lowSphere,
// capsule, cone, cyl, dome, torus). No textures, no new geometries — "relief" comes
// from composing many small tinted meshes. Materials are made via lambert()/shade()
// inside decorate() so per-instance tint and disposal work correctly.
import { registerDesigns } from './creatureModels.js';

// ===========================================================================
// SHARED DRAGON RELIEF HELPERS
// These turn the plain `dragon` base into a properly menacing Tibia drake:
// layered back/tail spines, a fanged lower jaw + snout, brow/cheek horns,
// membrane wings with finger struts, belly scutes, shoulder spikes, glowing
// eyes and clawed toes. `o.bodyR` (r) and `o.standY` come from the base opts.
// ===========================================================================

// A ridge of paired/centered spine plates running down the back and onto the
// tail. `mag` scales the spike size; bigger dragons get taller crests.
function addDorsalSpine(root, parts, tint, API, mag = 0.5) {
  const { mesh, G } = API;
  const m = API.lambert(API.shade(tint, 0.5));
  const standY = (parts && parts.standY) || 0.58;
  const r = (parts && parts.r) || 0.3;
  // back ridge
  for (let i = 0; i < 8; i++) {
    const sp = mesh(G.cone, m);
    const hump = Math.sin((i / 7) * Math.PI);
    const sc = (0.09 + hump * 0.07) * mag * 2;
    sp.scale.set(0.022 * mag * 2.4, sc, 0.05 * mag * 2.4);
    sp.position.set(0, standY + r * 0.7 + hump * 0.05, r * 0.55 - i * (r * 1.5 / 7));
    sp.rotation.x = 0.15;
    root.add(sp);
  }
  // tail spines, parented to the tail group so they sweep with it
  if (parts && parts.tail) {
    for (let i = 0; i < 5; i++) {
      const sp = mesh(G.cone, m);
      const sc = (0.06 - i * 0.008) * mag * 2;
      sp.scale.set(0.018 * mag * 2, sc, 0.04 * mag * 2);
      sp.position.set(0, r * 0.4 - i * r * 0.05, -i * r * 0.42 - r * 0.2);
      parts.tail.add(sp);
    }
  }
}

// Build a fanged maw onto a head group: extend a tapered snout, hinge a lower
// jaw beneath it and line both with little cone teeth. Returns nothing; mutates
// the head group. `r` is the body radius the head was scaled from.
function addDragonMaw(head, r, tint, API, opts = {}) {
  const { mesh, G } = API;
  const skinM = API.lambert(API.shade(tint, opts.snoutFactor || 1.05));
  const dark = API.lambert(API.shade(tint, 0.45));
  const tooth = API.lambert(0xf2ecd8);

  // upper snout: a tapered cone reaching forward past the skull
  const snout = mesh(G.cone, skinM);
  snout.scale.set(r * 0.34, r * 0.62, r * 0.34);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, r * 0.04, r * 0.62);
  head.add(snout);
  // nostril nubs
  for (const s of [-1, 1]) {
    const n = mesh(G.lowSphere, dark);
    n.scale.setScalar(r * 0.06);
    n.position.set(s * r * 0.12, r * 0.14, r * 0.82);
    head.add(n);
  }

  // lower jaw: a flatter cone hinged slightly open
  const jaw = mesh(G.cone, skinM);
  jaw.scale.set(r * 0.3, r * 0.5, r * 0.28);
  jaw.rotation.x = Math.PI / 2 + 0.22;
  jaw.position.set(0, -r * 0.22, r * 0.5);
  head.add(jaw);

  // dark mouth interior so the open maw reads
  const gum = mesh(G.lowSphere, dark);
  gum.scale.set(r * 0.22, r * 0.1, r * 0.3);
  gum.position.set(0, -r * 0.08, r * 0.55);
  head.add(gum);

  // upper + lower fangs
  const teeth = opts.teeth || 4;
  for (let i = 0; i < teeth; i++) {
    const t = (i / Math.max(1, teeth - 1) - 0.5) * 2; // -1..1
    const upper = mesh(G.cone, tooth);
    const big = (i === 0 || i === teeth - 1) ? 1.5 : 1;
    upper.scale.set(r * 0.05, r * 0.16 * big, r * 0.05);
    upper.position.set(t * r * 0.18, -r * 0.04, r * 0.7 - Math.abs(t) * r * 0.05);
    upper.rotation.x = Math.PI;
    head.add(upper);
    const lower = mesh(G.cone, tooth);
    lower.scale.set(r * 0.045, r * 0.13 * big, r * 0.045);
    lower.position.set(t * r * 0.16, -r * 0.28, r * 0.62 - Math.abs(t) * r * 0.04);
    head.add(lower);
  }
}

// Brow horns, cheek/jaw spikes and a swept-back pair of main horns.
function addDragonHorns(head, r, tint, API, opts = {}) {
  const { mesh, G } = API;
  const hornM = API.lambert(opts.hornColor != null ? opts.hornColor : API.shade(tint, 0.4));
  const big = opts.big || 1;
  // main swept horns
  for (const s of [-1, 1]) {
    const horn = mesh(G.cone, hornM);
    horn.scale.set(r * 0.1 * big, r * 0.6 * big, r * 0.1 * big);
    horn.position.set(s * r * 0.3, r * 0.52, -r * 0.28);
    horn.rotation.x = -0.7;
    horn.rotation.z = -s * 0.35;
    head.add(horn);
    // brow horn (smaller, forward)
    const brow = mesh(G.cone, hornM);
    brow.scale.set(r * 0.06 * big, r * 0.3 * big, r * 0.06 * big);
    brow.position.set(s * r * 0.22, r * 0.42, r * 0.1);
    brow.rotation.x = -0.2;
    brow.rotation.z = -s * 0.45;
    head.add(brow);
    // cheek / jaw spikes
    for (let i = 0; i < (opts.cheek || 2); i++) {
      const cheek = mesh(G.cone, hornM);
      cheek.scale.set(r * 0.04 * big, r * 0.18 * big, r * 0.04 * big);
      cheek.position.set(s * r * 0.42, -r * 0.02 - i * r * 0.12, r * 0.1 - i * r * 0.12);
      cheek.rotation.z = -s * 1.4;
      cheek.rotation.x = -0.2;
      head.add(cheek);
    }
  }
}

// Bright "glowing" eyes (a saturated lambert reads as emissive under the scene
// light) plus a darker socket ridge so the stare looks fierce.
function addGlowEyes(head, r, color, API, size = 0.16) {
  const { mesh, G } = API;
  const glow = API.lambert(color);
  const socket = API.lambert(0x101010);
  for (const s of [-1, 1]) {
    const sk = mesh(G.lowSphere, socket);
    sk.scale.set(r * (size + 0.08), r * (size + 0.04), r * size);
    sk.position.set(s * r * 0.3, r * 0.28, r * 0.42);
    head.add(sk);
    const e = mesh(G.lowSphere, glow);
    e.scale.setScalar(r * size);
    e.position.set(s * r * 0.3, r * 0.28, r * 0.48);
    head.add(e);
  }
}

// Membrane wings: across each existing wing-blade sphere, lay thin cone "finger"
// struts radiating from the shoulder and a couple of clawed wing-thumbs so the
// folded membrane reads instead of a flat paddle. `gaps` skips struts to make a
// tattered undead wing. Parented to each wing pivot so they flap with the wing.
function addWingStruts(parts, r, tint, API, opts = {}) {
  const { mesh, G } = API;
  const boneM = API.lambert(API.shade(tint, opts.boneFactor || 0.6));
  const membrane = opts.membraneColor != null ? API.lambert(opts.membraneColor) : null;
  const reach = r * 1.6;
  for (const w of parts.wings) {
    const s = w.side;
    // overlay a darker membrane fan so the wing isn't a bright paddle
    if (membrane) {
      const mem = mesh(G.sphere, membrane);
      mem.scale.set(r * 1.85, r * 0.05, r * 1.25);
      mem.position.set(s * reach, 0, 0);
      w.pivot.add(mem);
    }
    // 3-4 finger struts splaying out across the wing
    const fingers = opts.gaps ? 2 : 4;
    for (let i = 0; i < fingers; i++) {
      const t = i / (fingers - 1);
      if (opts.gaps && i === 1) continue; // tattered gap
      const strut = mesh(G.cone, boneM);
      const len = reach * (0.7 + t * 0.55);
      strut.scale.set(r * 0.04, len * 0.5, r * 0.04);
      // rotate from vertical to point outward and fan back
      strut.rotation.z = s * (Math.PI / 2 - 0.05);
      strut.rotation.y = (t - 0.4) * 1.1 * -s;
      strut.position.set(s * len * 0.5, (0.4 - t) * r * 0.6, (t - 0.4) * r * 1.4);
      w.pivot.add(strut);
    }
    // wing thumb-claw at the leading edge
    const claw = mesh(G.cone, API.lambert(0xece4d0));
    claw.scale.set(r * 0.05, r * 0.22, r * 0.05);
    claw.position.set(s * reach * 0.55, r * 0.25, r * 0.5);
    claw.rotation.x = -0.6;
    w.pivot.add(claw);
  }
}

// A row of flattened belly scutes (lowSpheres) down the underside of the trunk.
function addBellyScutes(root, parts, tint, API, factor = 1.3) {
  const { mesh, G } = API;
  const m = API.lambert(API.shade(tint, factor));
  const standY = (parts && parts.standY) || 0.58;
  const r = (parts && parts.r) || 0.3;
  for (let i = 0; i < 6; i++) {
    const sc = mesh(G.lowSphere, m);
    const w = 0.16 - Math.abs(i - 2.5) * 0.02;
    sc.scale.set(r * w, r * 0.06, r * 0.16);
    sc.position.set(0, standY - r * 0.55, r * 0.5 - i * (r * 1.2 / 5));
    root.add(sc);
  }
}

// Shoulder / haunch spike clusters flanking the trunk.
function addShoulderSpikes(root, parts, tint, API, mag = 1) {
  const { mesh, G } = API;
  const m = API.lambert(API.shade(tint, 0.45));
  const standY = (parts && parts.standY) || 0.58;
  const r = (parts && parts.r) || 0.3;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const sp = mesh(G.cone, m);
      sp.scale.set(r * 0.07 * mag, r * 0.28 * mag, r * 0.07 * mag);
      sp.position.set(s * r * 0.7, standY + r * 0.45, r * 0.25 - i * r * 0.45);
      sp.rotation.z = -s * 0.8;
      sp.rotation.x = -0.2;
      root.add(sp);
    }
  }
}

// Clawed toes on each foot pivot (the base already makes a foot sphere).
function addToeClaws(parts, r, API, count = 3) {
  const { mesh, G } = API;
  const m = API.lambert(0xece4d0);
  const standY = (parts && parts.standY) || 0.58;
  for (const lg of parts.legs) {
    const len = lg.dir > 0 ? 0.4 : 0.5;
    const footY = -standY * len * 1.7;
    for (let i = 0; i < count; i++) {
      const claw = mesh(G.cone, m);
      claw.scale.set(r * 0.045, r * 0.18, r * 0.045);
      claw.position.set((i - (count - 1) / 2) * r * 0.12, footY - r * 0.05, r * 0.22);
      claw.rotation.x = Math.PI * 0.5 + 0.35;
      lg.pivot.add(claw);
    }
  }
}

// Build one extra serpentine neck + fanged head for the three-headed dragon.
// `side` is -1 / +1 (which way it leans), returns nothing (adds to root).
function addExtraDragonHead(root, r, standY, tint, API, side, eyeColor) {
  const { mesh, G, THREE } = API;
  const bodyM = API.lambert(tint);
  // curving neck of stacked spheres so it reads serpentine, not a stick
  const baseX = side * r * 0.5;
  const baseZ = r * 0.55;
  const neckSegs = 5;
  let hx = 0, hy = 0, hz = 0;
  for (let i = 0; i < neckSegs; i++) {
    const t = i / (neckSegs - 1);
    const seg = mesh(G.sphere, bodyM);
    seg.scale.setScalar(r * (0.32 - t * 0.12));
    hx = baseX + side * Math.sin(t * 1.4) * r * 0.8;
    hy = standY + r * 0.5 + t * r * 1.1;
    hz = baseZ + t * r * 0.7;
    seg.position.set(hx, hy, hz);
    root.add(seg);
  }
  // head group at the neck tip
  const head = new THREE.Group();
  head.position.set(hx, hy + r * 0.25, hz + r * 0.2);
  head.rotation.y = -side * 0.3;
  const skull = mesh(G.sphere, bodyM);
  skull.scale.set(r * 0.42, r * 0.42, r * 0.6);
  head.add(skull);
  addDragonMaw(head, r * 0.85, tint, API, { teeth: 3 });
  addDragonHorns(head, r * 0.85, tint, API, { cheek: 1 });
  addGlowEyes(head, r * 0.85, eyeColor, API);
  root.add(head);
}

const DESIGNS = {
  // ===================== VERMIN & CRITTERS =====================
  worm: {
    base: 'worm', scale: 0.8, color: 0xd98a8a,
    optionsFn() { return { segments: 9, bodyR: 0.09 }; },
    // Soft pink earthworm: glossy ring segments + a tiny tapered head with a
    // pink mouth ring, so it reads segmented rather than a smooth tube.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const ringM = API.lambert(API.shade(tint, 0.85));
      const dark = API.lambert(API.shade(tint, 0.6));
      const slime = API.lambert(API.shade(tint, 1.2));
      for (const sg of parts.segs) {
        const ring = mesh(G.torus, ringM);
        ring.scale.set(1.08, 1.08, 0.5);
        ring.rotation.y = Math.PI / 2;
        sg.m.add(ring);
        // darker crease rings between segments for depth
        const crease = mesh(G.torus, dark);
        crease.scale.set(1.05, 1.05, 0.15);
        crease.rotation.y = Math.PI / 2;
        crease.position.z = -0.55;
        sg.m.add(crease);
        // glossy slime coating on alternate segments
        if (sg.i % 2) {
          const gloss = mesh(G.lowSphere, slime);
          gloss.scale.set(0.35, 0.08, 0.35);
          gloss.position.set(0, 0.5, 0);
          sg.m.add(gloss);
        }
      }
      const head = parts.segs[0].m;
      const mouth = mesh(G.torus, API.lambert(0xaa4455));
      mouth.scale.set(0.6, 0.6, 0.5);
      mouth.rotation.y = Math.PI / 2;
      mouth.position.z = 0.85;
      head.add(mouth);
      // tiny taste papillae around the mouth rim
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const pap = mesh(G.lowSphere, API.lambert(0xcc5566));
        pap.scale.setScalar(0.08);
        pap.position.set(Math.cos(a) * 0.65, Math.sin(a) * 0.65, 0.85);
        head.add(pap);
      }
    },
  },

  rotworm: {
    base: 'worm', scale: 1.0, color: 0xa98a5a,
    optionsFn() { return { segments: 9, bodyR: 0.14 }; },
    // Big decay-spotted worm with a gaping ringed maw, inner teeth ring and
    // dark rot blotches with raised tubercles down the body.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const head = parts.segs[0].m;
      const maw = mesh(G.torus, API.lambert(0x3a1a14));
      maw.scale.set(0.75, 0.75, 0.5);
      maw.rotation.y = Math.PI / 2;
      maw.position.z = 0.85;
      head.add(maw);
      // ring of inward fangs
      const toothM = API.lambert(0xd8c8a0);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const t = mesh(G.cone, toothM);
        t.scale.set(0.1, 0.28, 0.1);
        t.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.85);
        t.rotation.z = a + Math.PI / 2;
        head.add(t);
      }
      // rot blotches + tubercles
      const rotM = API.lambert(API.shade(tint, 0.55));
      const pus = API.lambert(API.shade(tint, 1.3));
      for (const sg of parts.segs) {
        if (sg.i % 2) continue;
        for (const s of [-1, 1]) {
          const spot = mesh(G.lowSphere, rotM);
          spot.scale.set(0.45, 0.3, 0.45);
          spot.position.set(s * 0.5, 0.45, 0);
          sg.m.add(spot);
          // pustule center on each blotch
          const pustule = mesh(G.lowSphere, pus);
          pustule.scale.set(0.18, 0.15, 0.18);
          pustule.position.set(s * 0.5, 0.52, 0);
          sg.m.add(pustule);
        }
      }
      // dark decay ring at the maw edge
      const decay = mesh(G.torus, API.lambert(0x1a0a0a));
      decay.scale.set(0.82, 0.82, 0.2);
      decay.rotation.y = Math.PI / 2;
      decay.position.z = 0.95;
      head.add(decay);
    },
  },

  larva: {
    base: 'worm', scale: 0.7, color: 0xe8d8a8,
    optionsFn() { return { segments: 7, bodyR: 0.09 }; },
    // Cream maggot: fat banded segments, a dark head capsule and tiny mandibles.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const bandM = API.lambert(API.shade(tint, 0.78));
      const seam = API.lambert(API.shade(tint, 0.55));
      const shine = API.lambert(API.shade(tint, 1.25));
      for (const sg of parts.segs) {
        const band = mesh(G.torus, bandM);
        band.scale.set(1.1, 1.1, 0.42);
        band.rotation.y = Math.PI / 2;
        sg.m.add(band);
        // darker creases between bands
        const crease = mesh(G.torus, seam);
        crease.scale.set(1.08, 1.08, 0.1);
        crease.rotation.y = Math.PI / 2;
        crease.position.z = -0.5;
        sg.m.add(crease);
        // wet larval shine stripe
        const gloss = mesh(G.lowSphere, shine);
        gloss.scale.set(0.3, 0.06, 0.3);
        gloss.position.set(0, 0.48, 0);
        sg.m.add(gloss);
      }
      const head = parts.segs[0].m;
      const cap = mesh(G.sphere, API.lambert(0x8a6a3a));
      cap.scale.set(0.85, 0.85, 0.7);
      cap.position.z = 0.55;
      head.add(cap);
      // darker mouthparts region
      const mouth = mesh(G.lowSphere, API.lambert(0x6a4a22));
      mouth.scale.set(0.28, 0.18, 0.22);
      mouth.position.set(0, -0.15, 0.8);
      head.add(mouth);
      for (const s of [-1, 1]) {
        const mand = mesh(G.cone, API.lambert(0x5a4422));
        mand.scale.set(0.22, 0.5, 0.22);
        mand.position.set(s * 0.4, -0.2, 0.9);
        mand.rotation.x = -0.7;
        mand.rotation.z = s * 0.4;
        head.add(mand);
      }
    },
  },

  rat: {
    base: 'quadruped', scale: 0.7, color: 0x8a7a6a,
    optionsFn() { return { height: 0.6, len: 0.36, bodyR: 0.12, legLen: 0.14, ears: true, tail: true, snout: true }; },
    // Pink nose + whiskers, big round ears, long bald scaly tail, buck teeth.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const head = parts.head;
      const dark = API.lambert(API.shade(tint, 0.55));
      const nose = mesh(G.lowSphere, API.lambert(0xdd8899));
      nose.scale.setScalar(0.05);
      nose.position.set(0, 0.0, 0.2);
      head.add(nose);
      // nose ridge definition
      const noseBase = mesh(G.cone, dark);
      noseBase.scale.set(0.015, 0.08, 0.02);
      noseBase.position.set(0, -0.01, 0.12);
      head.add(noseBase);
      // round inner ears
      for (const s of [-1, 1]) {
        const ear = mesh(G.lowSphere, API.lambert(0xc89aa0));
        ear.scale.set(0.05, 0.06, 0.02);
        ear.position.set(s * 0.085, 0.085, 0);
        head.add(ear);
        // inner ear pink detail
        const inner = mesh(G.lowSphere, API.lambert(0xee99bb));
        inner.scale.set(0.025, 0.035, 0.015);
        inner.position.set(s * 0.085, 0.085, 0.005);
        head.add(inner);
        const whisker = mesh(G.cyl, API.lambert(0xddccbb));
        whisker.scale.set(0.004, 0.1, 0.004);
        whisker.rotation.z = Math.PI / 2;
        whisker.position.set(s * 0.12, -0.01, 0.16);
        head.add(whisker);
        const tooth = mesh(G.cone, API.lambert(0xf4eecc));
        tooth.scale.set(0.012, 0.04, 0.012);
        tooth.position.set(s * 0.02, -0.06, 0.18);
        tooth.rotation.x = Math.PI;
        head.add(tooth);
      }
      // scaly ring detail on the bald tail
      if (parts.tail) {
        const tm = API.lambert(0xb89aa0);
        const scale = API.lambert(API.shade(0xb89aa0, 0.7));
        for (let i = 0; i < 3; i++) {
          const ring = mesh(G.torus, tm);
          ring.scale.set(0.05, 0.05, 0.02);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(0, -0.04 - i * 0.04, 0);
          parts.tail.add(ring);
          // dark scale segments on the tail
          for (let j = 0; j < 4; j++) {
            const a = (j / 4) * Math.PI * 2;
            const sc = mesh(G.lowSphere, scale);
            sc.scale.set(0.012, 0.008, 0.012);
            sc.position.set(Math.cos(a) * 0.035, -0.04 - i * 0.04, Math.sin(a) * 0.035);
            parts.tail.add(sc);
          }
        }
      }
    },
  },

  cave_rat: {
    base: 'quadruped', scale: 0.85, color: 0x5a4f47,
    optionsFn() { return { height: 0.65, len: 0.4, bodyR: 0.14, legLen: 0.14, ears: true, tail: true, snout: true }; },
    // Stockier, darker, mangy: red glowing eyes, bigger fangs, a raised hackle
    // ridge of dark fur tufts down the spine.
    decorate(root, parts, o, tint, API) {
      const { mesh, G, addMane } = API;
      const head = parts.head;
      const dark = API.lambert(API.shade(tint, 0.5));
      for (const s of [-1, 1]) {
        const eye = mesh(G.lowSphere, API.lambert(0xff2222));
        eye.scale.setScalar(0.035);
        eye.position.set(s * 0.06, 0.06, 0.15);
        head.add(eye);
        // eye socket darkening
        const socket = mesh(G.lowSphere, dark);
        socket.scale.set(0.05, 0.04, 0.025);
        socket.position.set(s * 0.06, 0.06, 0.13);
        head.add(socket);
        const fang = mesh(G.cone, API.lambert(0xeee6cc));
        fang.scale.set(0.016, 0.05, 0.016);
        fang.position.set(s * 0.035, -0.07, 0.17);
        fang.rotation.x = Math.PI;
        head.add(fang);
      }
      // mangy hackle along the back
      addMane(head, 0.14, API.shade(tint, 0.6), 5);
      // scarred hide patches on the shoulders
      for (const s of [-1, 1]) {
        const scar = mesh(G.lowSphere, dark);
        scar.scale.set(0.08, 0.05, 0.08);
        scar.position.set(s * 0.2, 0.1, -0.05);
        head.add(scar);
      }
    },
  },

  snake: {
    base: 'serpent', scale: 1.0, color: 0x6aaa4a,
    optionsFn() { return { segments: 10, bodyR: 0.14, frill: true }; },
    // Cobra-ish: flared hood already from base; add a flicking forked tongue,
    // venom fangs, slit eyes and a diamond scale pattern down the back.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const head = parts.segs[0].m;
      const dark = API.lambert(API.shade(tint, 0.45));
      // forked tongue (two thin cones)
      for (const s of [-1, 1]) {
        const tip = mesh(G.cone, API.lambert(0xcc3344));
        tip.scale.set(0.1, 0.4, 0.1);
        tip.position.set(s * 0.2, -0.1, 1.0);
        tip.rotation.x = Math.PI / 2;
        tip.rotation.z = s * 0.3;
        head.add(tip);
      }
      // downward venom fangs
      for (const s of [-1, 1]) {
        const fang = mesh(G.cone, API.lambert(0xf0ead0));
        fang.scale.set(0.08, 0.3, 0.08);
        fang.position.set(s * 0.25, -0.45, 0.75);
        head.add(fang);
        // fang grooves for venom channels
        const groove = mesh(G.cyl, dark);
        groove.scale.set(0.01, 0.25, 0.01);
        groove.position.set(s * 0.25, -0.45, 0.75);
        head.add(groove);
      }
      // slit eyes (narrow pupils)
      for (const s of [-1, 1]) {
        const pupil = mesh(G.lowSphere, API.lambert(0x000000));
        pupil.scale.set(0.08, 0.04, 0.04);
        pupil.position.set(s * 0.35, 0.4, 0.8);
        head.add(pupil);
      }
      // diamond scale pattern: darker chevrons on the upper body
      const scaleM = API.lambert(API.shade(tint, 0.55));
      for (const sg of parts.segs) {
        if (sg.i === 0) continue;
        const di = mesh(G.lowSphere, scaleM);
        di.scale.set(0.55, 0.18, 0.55);
        di.rotation.y = Math.PI / 4;
        di.position.y = 0.82;
        sg.m.add(di);
        // tiny belly scale detail on underside
        const belly = mesh(G.lowSphere, API.lambert(API.shade(tint, 0.75)));
        belly.scale.set(0.35, 0.08, 0.35);
        belly.position.y = -0.8;
        sg.m.add(belly);
      }
    },
  },

  spider: {
    base: 'bug', scale: 0.9, color: 0x2a2a2a,
    optionsFn() { return { legs: 8, bodyR: 0.2 }; },
    // Glossy black widow: domed abdomen with a red hourglass, a cephalothorax
    // hump, clustered red eyes, fangs and bristly leg-joint knees.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const r = 0.2;
      const gloss = API.lambert(API.shade(tint, 1.4));
      // raised abdomen dome + red hourglass
      const abd = mesh(G.dome, gloss);
      abd.scale.set(r * 0.9, r * 0.8, r * 1.0);
      abd.position.set(0, r * 0.55, -r * 0.3);
      root.add(abd);
      for (let i = 0; i < 2; i++) {
        const hg = mesh(G.cone, API.lambert(0xcc1111));
        hg.scale.set(r * 0.18, r * 0.22, r * 0.05);
        hg.position.set(0, r * 0.45, -r * 0.3 + (i ? r * 0.15 : -r * 0.15));
        hg.rotation.x = i ? Math.PI : 0;
        root.add(hg);
      }
      // cephalothorax hump
      const ceph = mesh(G.dome, gloss);
      ceph.scale.set(r * 0.55, r * 0.45, r * 0.6);
      ceph.position.set(0, r * 0.55, r * 0.55);
      root.add(ceph);
      // eight red eyes in a cluster
      for (let i = 0; i < 8; i++) {
        const eye = mesh(G.lowSphere, API.lambert(0xdd1111));
        const col = i % 4, row = i < 4 ? 0 : 1;
        eye.scale.setScalar(r * (row ? 0.07 : 0.09));
        eye.position.set((col - 1.5) * r * 0.16, r * 0.5 + row * r * 0.12, r * 0.98);
        root.add(eye);
      }
      // fangs (chelicerae)
      for (const s of [-1, 1]) {
        const fang = mesh(G.cone, API.lambert(0x080808));
        fang.scale.set(r * 0.09, r * 0.24, r * 0.09);
        fang.position.set(s * r * 0.18, r * 0.18, r * 1.0);
        fang.rotation.x = 2.4;
        root.add(fang);
      }
      // knee bristles on the legs
      for (const lg of parts.legs) {
        const knee = mesh(G.lowSphere, API.lambert(API.shade(tint, 0.7)));
        knee.scale.setScalar(r * 0.06);
        knee.position.y = -r * 0.4;
        lg.pivot.add(knee);
      }
    },
  },

  poison_spider: {
    base: 'bug', scale: 1.0, color: 0x2a3a1a,
    optionsFn() { return { legs: 8, bodyR: 0.22 }; },
    // Sickly green: yellow venom chevrons on the abdomen, dripping green fangs,
    // a spiny abdomen and bright venom eyes.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const r = 0.22;
      const venom = API.lambert(0xccdd33);
      for (let i = 0; i < 3; i++) {
        const stripe = mesh(G.cone, venom);
        stripe.scale.set(r * (0.5 - i * 0.1), r * 0.05, r * 0.18);
        stripe.rotation.x = Math.PI / 2;
        stripe.position.set(0, r * 0.7, -r * 0.15 - i * r * 0.22);
        root.add(stripe);
      }
      // abdomen spines
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const sp = mesh(G.cone, API.lambert(API.shade(tint, 0.6)));
        sp.scale.set(r * 0.05, r * 0.2, r * 0.05);
        sp.position.set(Math.cos(a) * r * 0.6, r * 0.55, -r * 0.3 + Math.sin(a) * r * 0.5);
        sp.rotation.z = -Math.cos(a) * 0.8;
        sp.rotation.x = -Math.sin(a) * 0.8 - 0.4;
        root.add(sp);
      }
      // dripping fangs + venom eyes
      for (const s of [-1, 1]) {
        const fang = mesh(G.cone, API.lambert(0x66cc44));
        fang.scale.set(r * 0.1, r * 0.26, r * 0.1);
        fang.position.set(s * r * 0.2, r * 0.15, r * 1.05);
        fang.rotation.x = 2.4;
        root.add(fang);
        const drip = mesh(G.lowSphere, venom);
        drip.scale.setScalar(r * 0.06);
        drip.position.set(s * r * 0.2, r * 0.0, r * 1.2);
        root.add(drip);
        const eye = mesh(G.lowSphere, API.lambert(0xccff33));
        eye.scale.setScalar(r * 0.08);
        eye.position.set(s * r * 0.18, r * 0.52, r * 0.95);
        root.add(eye);
      }
      // venom sac detail on abdomen
      const sac = mesh(G.lowSphere, API.lambert(API.shade(tint, 0.5)));
      sac.scale.set(r * 0.4, r * 0.35, r * 0.35);
      sac.position.set(0, r * 0.3, -r * 0.35);
      root.add(sac);
      // leg joint spines for threatening posture
      for (const lg of parts.legs) {
        const spine = mesh(G.cone, API.lambert(API.shade(tint, 0.65)));
        spine.scale.set(r * 0.05, r * 0.16, r * 0.05);
        spine.position.y = -r * 0.25;
        spine.rotation.x = 0.6;
        lg.pivot.add(spine);
      }
    },
  },

  tarantula: {
    base: 'bug', scale: 1.1, color: 0x5a3a2a,
    optionsFn() { return { legs: 8, bodyR: 0.24 }; },
    // Big and hairy: a furred abdomen + cephalothorax, shaggy leg tufts, thick
    // fangs and amber eye cluster.
    decorate(root, parts, o, tint, API) {
      const { addFur, mesh, G } = API;
      const r = 0.24;
      // fur the abdomen and the front body lump
      addFur(root, r * 0.95, tint, 2, 11, 0.8);
      const cephFur = mesh(G.dome, API.lambert(API.shade(tint, 0.9)));
      cephFur.scale.set(r * 0.55, r * 0.45, r * 0.6);
      cephFur.position.set(0, r * 0.55, r * 0.55);
      root.add(cephFur);
      addFur(cephFur, 0.8, API.shade(tint, 0.85), 1, 8, 0.85);
      // leg tufts
      for (const lg of parts.legs) {
        const tuft = mesh(G.cone, API.lambert(API.shade(tint, 0.8)));
        tuft.scale.set(r * 0.1, r * 0.14, r * 0.1);
        tuft.position.y = -r * 0.2;
        tuft.rotation.x = 0.5;
        lg.pivot.add(tuft);
      }
      // thick fangs + amber eyes
      for (const s of [-1, 1]) {
        const fang = mesh(G.cone, API.lambert(0x2a1a12));
        fang.scale.set(r * 0.11, r * 0.28, r * 0.11);
        fang.position.set(s * r * 0.2, r * 0.2, r * 1.05);
        fang.rotation.x = 2.4;
        root.add(fang);
        const eye = mesh(G.lowSphere, API.lambert(0xddaa33));
        eye.scale.setScalar(r * 0.07);
        eye.position.set(s * r * 0.16, r * 0.55, r * 0.95);
        root.add(eye);
      }
      // spinnerets at the rear
      const spinneretM = API.lambert(API.shade(tint, 0.75));
      for (let i = 0; i < 3; i++) {
        const spinneret = mesh(G.cone, spinneretM);
        spinneret.scale.set(r * 0.06, r * 0.12, r * 0.06);
        spinneret.position.set((i - 1) * r * 0.1, r * 0.3, -r * 1.1);
        spinneret.rotation.x = 0.4;
        root.add(spinneret);
      }
      // thick leg base knuckles
      for (const lg of parts.legs) {
        const knuckle = mesh(G.lowSphere, API.lambert(API.shade(tint, 0.65)));
        knuckle.scale.set(r * 0.12, r * 0.1, r * 0.12);
        knuckle.position.y = 0;
        lg.pivot.add(knuckle);
      }
    },
  },

  scorpion: {
    base: 'bug', scale: 1.0, color: 0x886622,
    optionsFn() { return { legs: 8, bodyR: 0.18, claws: true, sting: true }; },
    // Segmented carapace plates down the back, ridged pincers and a venom-bead
    // stinger. Base already gives claws + curling sting; we plate the body.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const r = 0.18;
      const plateM = API.lambert(API.shade(tint, 0.75));
      const dark = API.lambert(API.shade(tint, 0.45));
      // overlapping back plates
      for (let i = 0; i < 4; i++) {
        const plate = mesh(G.dome, plateM);
        plate.scale.set(r * (0.95 - i * 0.08), r * 0.4, r * 0.4);
        plate.position.set(0, r * 0.55, -r * 0.05 - i * r * 0.45);
        root.add(plate);
        // dark ridge line on each plate for segmentation
        const ridge = mesh(G.cyl, dark);
        ridge.scale.set(0.008, r * (0.9 - i * 0.1), 0.008);
        ridge.rotation.z = 0.3;
        ridge.position.set(0, r * 0.65, -r * 0.05 - i * r * 0.45);
        root.add(ridge);
      }
      // pincer ridges + tips on the claws
      for (const s of [-1, 1]) {
        const tip = mesh(G.cone, plateM);
        tip.scale.set(r * 0.12, r * 0.22, r * 0.12);
        tip.position.set(s * r * 0.7, r * 0.5 + r * 0.2, r * 1.35);
        tip.rotation.x = Math.PI / 2;
        root.add(tip);
        // sharp ridged edge on each pincer
        const ridge = mesh(G.cone, dark);
        ridge.scale.set(r * 0.04, r * 0.22, r * 0.03);
        ridge.position.set(s * r * 0.7, r * 0.65, r * 1.35);
        ridge.rotation.x = Math.PI / 2;
        root.add(ridge);
      }
      // venom bead at the stinger tip
      if (parts.tail) {
        const bead = mesh(G.lowSphere, API.lambert(0x99cc33));
        bead.scale.setScalar(r * 0.1);
        bead.position.set(0, r * 1.25, -r * 0.5);
        parts.tail.add(bead);
        // dark venom sac shadow
        const sac = mesh(G.lowSphere, dark);
        sac.scale.setScalar(r * 0.06);
        sac.position.set(0, r * 1.2, -r * 0.48);
        parts.tail.add(sac);
      }
    },
  },

  beetle: {
    base: 'bug', scale: 0.9, color: 0x2f5a3a,
    optionsFn() { return { legs: 6, bodyR: 0.18, shell: true, flat: 0.6 }; },
    // Rhino beetle: split iridescent elytra with a center seam, a forked head
    // horn and a smaller pronotum horn, plus glossy carapace highlight.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const r = 0.18;
      const dark = API.lambert(API.shade(tint, 0.45));
      const gloss = API.lambert(API.shade(tint, 1.4));
      const light = API.lambert(API.shade(tint, 0.7));
      // wing-case seam
      const seam = mesh(G.cyl, dark);
      seam.scale.set(0.008, 0.24, 0.008);
      seam.rotation.x = Math.PI / 2;
      seam.position.set(0, r * 1.05, -r * 0.3);
      root.add(seam);
      // glossy elytra highlights
      for (const s of [-1, 1]) {
        const hi = mesh(G.dome, gloss);
        hi.scale.set(r * 0.4, r * 0.3, r * 0.7);
        hi.position.set(s * r * 0.45, r * 0.9, -r * 0.3);
        root.add(hi);
        // edge ridge on each elytron
        const ridge = mesh(G.cyl, light);
        ridge.scale.set(0.006, 0.22, 0.006);
        ridge.rotation.x = Math.PI / 2;
        ridge.position.set(s * r * 0.68, r * 0.95, -r * 0.25);
        root.add(ridge);
      }
      // big forked head horn (curving up)
      const horn = mesh(G.cone, dark);
      horn.scale.set(r * 0.07, r * 0.5, r * 0.07);
      horn.position.set(0, r * 0.6, r * 0.9);
      horn.rotation.x = -0.7;
      root.add(horn);
      // horn ridge detail
      const hornRidge = mesh(G.cyl, light);
      hornRidge.scale.set(0.004, r * 0.45, 0.004);
      hornRidge.rotation.x = -0.7;
      hornRidge.position.set(0, r * 0.6, r * 0.9);
      root.add(hornRidge);
      for (const s of [-1, 1]) {
        const prong = mesh(G.cone, dark);
        prong.scale.set(r * 0.05, r * 0.2, r * 0.05);
        prong.position.set(s * r * 0.1, r * 0.95, r * 1.05);
        prong.rotation.x = -0.9;
        prong.rotation.z = -s * 0.5;
        root.add(prong);
      }
      // smaller pronotum horn pointing forward
      const pro = mesh(G.cone, dark);
      pro.scale.set(r * 0.06, r * 0.28, r * 0.06);
      pro.position.set(0, r * 0.7, r * 0.45);
      pro.rotation.x = -1.4;
      root.add(pro);
    },
  },

  crab: {
    base: 'bug', scale: 1.0, color: 0xcc6644,
    optionsFn() { return { legs: 6, bodyR: 0.2, claws: true, flat: 0.5, shell: true }; },
    // Hard ridged carapace, big asymmetric pincers with serrated tips and
    // periscope eyestalks.
    decorate(root, parts, o, tint, API) {
      const { mesh, EYE_W, EYE_B, G } = API;
      const r = 0.2;
      const shellM = API.lambert(API.shade(tint, 0.8));
      const dark = API.lambert(API.shade(tint, 0.5));
      // carapace ridge bumps along the front edge
      for (let i = 0; i < 5; i++) {
        const bump = mesh(G.lowSphere, shellM);
        bump.scale.set(r * 0.1, r * 0.08, r * 0.1);
        bump.position.set((i - 2) * r * 0.28, r * 0.62, r * 0.45);
        root.add(bump);
      }
      // carapace segmentation lines
      for (let i = 0; i < 3; i++) {
        const line = mesh(G.cyl, dark);
        line.scale.set(0.006, r * 0.5, 0.006);
        line.rotation.z = 0.3;
        line.position.set(0, r * 0.6 - i * r * 0.2, r * 0.3);
        root.add(line);
      }
      // big pincer tips (one larger than the other)
      for (const s of [-1, 1]) {
        const big = s === 1 ? 1.3 : 0.9;
        const top = mesh(G.cone, shellM);
        top.scale.set(r * 0.13 * big, r * 0.28 * big, r * 0.1);
        top.position.set(s * r * 0.72, r * 0.55, r * 1.4);
        top.rotation.x = Math.PI / 2;
        root.add(top);
        const bot = mesh(G.cone, shellM);
        bot.scale.set(r * 0.1 * big, r * 0.22 * big, r * 0.09);
        bot.position.set(s * r * 0.72, r * 0.4, r * 1.35);
        bot.rotation.x = Math.PI / 2 + 0.3;
        root.add(bot);
        // serrated claw edge (small teeth)
        for (let j = 0; j < 4; j++) {
          const tooth = mesh(G.cone, dark);
          tooth.scale.set(r * 0.025, r * 0.07, r * 0.025);
          tooth.position.set(s * r * 0.72 - s * j * r * 0.06, r * 0.3, r * 1.3 + j * r * 0.08);
          tooth.rotation.z = -s * 0.4;
          root.add(tooth);
        }
      }
      // eyestalks
      for (const s of [-1, 1]) {
        const stalk = mesh(G.cyl, API.lambert(API.shade(tint, 0.9)));
        stalk.scale.set(0.012, 0.09, 0.012);
        stalk.position.set(s * 0.06, 0.46, 0.5);
        root.add(stalk);
        // stalk joint ring
        const joint = mesh(G.torus, dark);
        joint.scale.set(0.015, 0.015, 0.008);
        joint.position.set(s * 0.06, 0.5, 0.5);
        root.add(joint);
        const eye = mesh(G.lowSphere, EYE_W);
        eye.scale.setScalar(0.035);
        eye.position.set(s * 0.06, 0.55, 0.5);
        root.add(eye);
        const pup = mesh(G.lowSphere, EYE_B);
        pup.scale.setScalar(0.02);
        pup.position.set(s * 0.06, 0.55, 0.53);
        root.add(pup);
      }
    },
  },

  wasp: {
    base: 'flyer', scale: 0.8, color: 0xddaa22,
    optionsFn() { return { bodyR: 0.12, sting: true, stripes: true, hover: 0.6 }; },
    // Distinct head + thorax + striped abdomen pinched on a waist, antennae and
    // a long stinger.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const r = 0.12;
      const black = API.lambert(0x1a1a1a);
      const yellow = API.lambert(tint);
      const hover = parts.hover;
      // pinched striped abdomen behind the body
      const abd = mesh(G.sphere, yellow);
      abd.scale.set(r * 0.9, r * 0.9, r * 1.4);
      abd.position.set(0, hover - r * 0.1, -r * 1.0);
      root.add(abd);
      for (let i = 0; i < 3; i++) {
        const band = mesh(G.torus, black);
        band.scale.set(r * (0.95 - i * 0.18), r * (0.95 - i * 0.18), r * 0.12);
        band.rotation.x = Math.PI / 2;
        band.position.set(0, hover - r * 0.1, -r * 0.5 - i * r * 0.4);
        root.add(band);
      }
      // segmented waist pinch with ridges
      const waist = mesh(G.torus, black);
      waist.scale.set(r * 0.55, r * 0.55, r * 0.18);
      waist.rotation.x = Math.PI / 2;
      waist.position.set(0, hover - r * 0.08, -r * 0.15);
      root.add(waist);
      // head + antennae
      const head = mesh(G.sphere, black);
      head.scale.set(r * 0.55, r * 0.55, r * 0.55);
      head.position.set(0, hover + r * 0.2, r * 0.7);
      root.add(head);
      // compound eye facets
      for (let i = 0; i < 3; i++) {
        const eye = mesh(G.lowSphere, API.lambert(0x444444));
        eye.scale.setScalar(r * 0.08);
        eye.position.set(-r * 0.15 - i * r * 0.08, hover + r * 0.3, r * 0.95);
        root.add(eye);
      }
      for (const s of [-1, 1]) {
        const ant = mesh(G.cyl, black);
        ant.scale.set(0.006, 0.07, 0.006);
        ant.position.set(s * r * 0.2, hover + r * 0.5, r * 0.8);
        ant.rotation.x = -0.6;
        ant.rotation.z = -s * 0.3;
        root.add(ant);
        // antenna knob tip
        const tip = mesh(G.lowSphere, API.lambert(0x555555));
        tip.scale.setScalar(0.008);
        tip.position.set(s * r * 0.2, hover + r * 0.57, r * 0.82);
        root.add(tip);
      }
    },
  },

  bat: {
    base: 'flyer', scale: 0.85, color: 0x443344,
    optionsFn(API) { return { bodyR: 0.13, hover: 0.6, wingMat: API.lambert(API.shade(0x443344, 0.7)) }; },
    // Big membranous ears with inner pink, snub fanged snout, glowing eyes and
    // finger struts across the wing membranes.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const r = 0.13;
      const skin = API.lambert(tint);
      const dark = API.lambert(API.shade(tint, 0.6));
      const hover = parts.hover;
      for (const s of [-1, 1]) {
        const ear = mesh(G.cone, skin);
        ear.scale.set(r * 0.35, r * 0.75, r * 0.18);
        ear.position.set(s * r * 0.4, hover + r * 0.8, r * 0.15);
        ear.rotation.x = -0.2;
        root.add(ear);
        const inner = mesh(G.cone, API.lambert(0xaa7788));
        inner.scale.set(r * 0.2, r * 0.5, r * 0.1);
        inner.position.set(s * r * 0.4, hover + r * 0.78, r * 0.2);
        inner.rotation.x = -0.2;
        root.add(inner);
        // ear vein ridges
        const vein = mesh(G.cyl, API.lambert(0x995577));
        vein.scale.set(0.004, r * 0.35, 0.004);
        vein.rotation.x = 0.3;
        vein.position.set(s * r * 0.4, hover + r * 0.55, r * 0.2);
        root.add(vein);
        const eye = mesh(G.lowSphere, API.lambert(0xffcc33));
        eye.scale.setScalar(r * 0.12);
        eye.position.set(s * r * 0.22, hover + r * 0.25, r * 0.55);
        root.add(eye);
      }
      // snout + fangs
      const snout = mesh(G.sphere, skin);
      snout.scale.set(r * 0.3, r * 0.25, r * 0.35);
      snout.position.set(0, hover - r * 0.05, r * 0.7);
      root.add(snout);
      // snout ridge
      const ridge = mesh(G.cone, dark);
      ridge.scale.set(r * 0.06, r * 0.15, r * 0.04);
      ridge.position.set(0, hover - r * 0.08, r * 0.78);
      ridge.rotation.x = -0.3;
      root.add(ridge);
      for (const s of [-1, 1]) {
        const fang = mesh(G.cone, API.lambert(0xffffff));
        fang.scale.set(r * 0.08, r * 0.16, r * 0.08);
        fang.position.set(s * r * 0.1, hover - r * 0.2, r * 0.7);
        fang.rotation.x = Math.PI;
        root.add(fang);
      }
      // finger struts radiating across each wing
      for (const w of parts.wings) {
        const s = w.side;
        for (let i = 0; i < 3; i++) {
          const t = i / 2;
          const strut = mesh(G.cone, dark);
          strut.scale.set(r * 0.03, r * 1.0, r * 0.03);
          strut.rotation.z = s * (Math.PI / 2 - 0.05);
          strut.rotation.y = (t - 0.5) * 1.0 * -s;
          strut.position.set(s * r * 1.2, 0, (t - 0.5) * r * 0.9);
          w.pivot.add(strut);
        }
      }
    },
  },

  slime: {
    base: 'blob', scale: 1.0, color: 0x55cc99,
    optionsFn() { return { bodyR: 0.32 }; },
    // Translucent-looking ooze: a dark inner core, suspended bubbles, a glossy
    // highlight cap and drippy lobes around the base.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const core = mesh(G.sphere, API.lambert(API.shade(tint, 0.6)));
      core.scale.setScalar(0.13);
      core.position.set(0, 0.16, -0.02);
      root.add(core);
      // suspended bubbles
      const bub = API.lambert(API.shade(tint, 1.4));
      const dark = API.lambert(API.shade(tint, 0.5));
      for (let i = 0; i < 5; i++) {
        const a = i * 2.39996;
        const b = mesh(G.lowSphere, bub);
        b.scale.setScalar(0.03 + (i % 2) * 0.02);
        b.position.set(Math.cos(a) * 0.16, 0.1 + (i % 3) * 0.06, Math.sin(a) * 0.16);
        root.add(b);
        // dark bubble interior shadow
        const shadow = mesh(G.lowSphere, dark);
        shadow.scale.setScalar((0.03 + (i % 2) * 0.02) * 0.6);
        shadow.position.set(Math.cos(a) * 0.16 - 0.01, 0.1 + (i % 3) * 0.06 - 0.01, Math.sin(a) * 0.16);
        root.add(shadow);
      }
      // glossy highlight on top
      const hi = mesh(G.dome, bub);
      hi.scale.set(0.12, 0.06, 0.12);
      hi.position.set(-0.06, 0.27, 0.06);
      root.add(hi);
      // drippy base lobes
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const lobe = mesh(G.sphere, API.lambert(tint));
        lobe.scale.set(0.08, 0.05, 0.08);
        lobe.position.set(Math.cos(a) * 0.26, 0.02, Math.sin(a) * 0.26);
        root.add(lobe);
        // dark pooling in lobe crevices
        const pool = mesh(G.lowSphere, dark);
        pool.scale.set(0.04, 0.02, 0.04);
        pool.position.set(Math.cos(a) * 0.26, -0.02, Math.sin(a) * 0.26);
        root.add(pool);
      }
      // viscous tendrils of slime drooping from the sides
      for (const s of [-1, 1]) {
        const drip = mesh(G.cone, API.lambert(tint));
        drip.scale.set(0.03, 0.08, 0.03);
        drip.position.set(s * 0.22, 0.1, 0);
        drip.rotation.z = -s * 0.5;
        root.add(drip);
      }
    },
  },

  toad: {
    base: 'frog', scale: 0.9, color: 0x8a8a4a,
    optionsFn() { return {}; },
    // Lumpy warts of two sizes, bulging eye knobs and a couple of poison-gland
    // bumps behind the eyes.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const wart = API.lambert(API.shade(tint, 0.65));
      const dark = API.lambert(API.shade(tint, 0.4));
      const dome = parts.dome;
      for (let i = 0; i < 11; i++) {
        const a = i * 2.39996;
        const ring = 0.45 + (i % 3) * 0.18;
        const w = mesh(G.lowSphere, wart);
        const sz = 0.04 + (i % 2) * 0.04;
        w.scale.set(sz, sz * 0.7, sz);
        w.position.set(Math.cos(a) * ring, 0.45 + (i % 2) * 0.1, Math.sin(a) * ring);
        dome.add(w);
        // dark wart tip for 3D depth
        if (sz > 0.04) {
          const tip = mesh(G.lowSphere, dark);
          tip.scale.setScalar(sz * 0.35);
          tip.position.set(Math.cos(a) * ring, 0.55 + (i % 2) * 0.1, Math.sin(a) * ring);
          dome.add(tip);
        }
      }
      // poison-gland bumps behind the eyes
      for (const s of [-1, 1]) {
        const gland = mesh(G.lowSphere, API.lambert(API.shade(tint, 0.8)));
        gland.scale.set(0.12, 0.08, 0.16);
        gland.position.set(s * 0.35, 0.5, 0.15);
        dome.add(gland);
        // gland secretion beads at the tip
        const secretion = mesh(G.lowSphere, API.lambert(API.shade(tint, 1.2)));
        secretion.scale.set(0.035, 0.03, 0.035);
        secretion.position.set(s * 0.35, 0.58, 0.2);
        dome.add(secretion);
      }
      // bumpy throat pouch
      const throat = mesh(G.lowSphere, dark);
      throat.scale.set(0.18, 0.12, 0.14);
      throat.position.set(0, 0.25, 0.35);
      dome.add(throat);
    },
  },

  // ===================== DRAGONS & WYVERNS =====================
  // Every dragon shares the relief pass (spines, maw, horns, wings, scutes,
  // claws, glow eyes) then layers species flavor on top. The `dragon` base head
  // group already carries a skull + plain horns + eyes; we add the fierce parts.
  dragon: {
    base: 'dragon', scale: 1.4, color: 0xcc2211,
    optionsFn() { return { bodyR: 0.3, standY: 0.58 }; },
    // Classic fierce red drake.
    decorate(root, parts, o, tint, API) {
      parts.standY = o.standY; parts.r = o.bodyR;
      const { mesh, G } = API;
      const r = o.bodyR;
      addDorsalSpine(root, parts, tint, API, 0.6);
      addDragonMaw(parts.head, r, tint, API, { teeth: 4 });
      addDragonHorns(parts.head, r, tint, API, { cheek: 2 });
      addGlowEyes(parts.head, r, 0xffdd33, API);
      addWingStruts(parts, r, tint, API, { membraneColor: API.shade(tint, 0.7) });
      addBellyScutes(root, parts, tint, API, 1.35);
      addShoulderSpikes(root, parts, tint, API, 1);
      addToeClaws(parts, r, API, 3);
      // scale ridge runs across flanks
      const scaleM = API.lambert(API.shade(tint, 0.8));
      for (let i = 0; i < 6; i++) {
        const scale = mesh(G.lowSphere, scaleM);
        scale.scale.set(r * 0.08, r * 0.04, r * 0.12);
        scale.position.set((i % 2 ? 0.35 : -0.35) * r, o.standY + r * 0.2 - i * r * 0.18, r * 0.3 - i * r * 0.15);
        root.add(scale);
      }
      // jaw muscle definition below the cheeks
      const jaw = mesh(G.lowSphere, API.lambert(API.shade(tint, 0.85)));
      jaw.scale.set(r * 0.12, r * 0.08, r * 0.08);
      jaw.position.set(0, -r * 0.35, r * 0.35);
      parts.head.add(jaw);
    },
  },

  green_dragon: {
    base: 'dragon', scale: 1.4, color: 0x338822,
    optionsFn() { return { bodyR: 0.3, standY: 0.58 }; },
    // Poison drake: mottled scales, a drooling acid maw and venom-green eyes.
    decorate(root, parts, o, tint, API) {
      parts.standY = o.standY; parts.r = o.bodyR;
      const { mesh, G, addSpots } = API;
      const r = o.bodyR;
      addDorsalSpine(root, parts, tint, API, 0.55);
      addDragonMaw(parts.head, r, tint, API, { teeth: 4, snoutFactor: 0.95 });
      addDragonHorns(parts.head, r, tint, API, { cheek: 2 });
      addGlowEyes(parts.head, r, 0xccff33, API);
      addWingStruts(parts, r, tint, API, { membraneColor: API.shade(tint, 0.65) });
      addBellyScutes(root, parts, tint, API, 1.4);
      addShoulderSpikes(root, parts, tint, API, 1);
      addToeClaws(parts, r, API, 3);
      // mottled poison spots over the trunk
      const spotM = API.lambert(0x88dd33);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.39996;
        const sp = mesh(G.lowSphere, spotM);
        sp.scale.set(0.05, 0.02, 0.05);
        sp.position.set(Math.cos(a) * r * 0.8, o.standY + Math.sin(a) * r * 0.4, -0.1 + i * 0.06);
        root.add(sp);
      }
      // acid drool from the maw
      for (let i = 0; i < 2; i++) {
        const drool = mesh(G.cone, API.lambert(0x99ee33));
        drool.scale.set(0.04, 0.16, 0.04);
        drool.position.set((i ? 0.08 : -0.08), -r * 0.45, r * 0.6);
        drool.rotation.x = Math.PI;
        parts.head.add(drool);
      }
      // toxic gill slits on neck sides
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const gill = mesh(G.cone, API.lambert(0x55aa22));
          gill.scale.set(r * 0.04, r * 0.12, r * 0.02);
          gill.position.set(s * r * 0.45, o.standY + r * 0.5 - i * r * 0.2, r * 0.15);
          gill.rotation.z = s * 0.6;
          root.add(gill);
        }
      }
    },
  },

  black_dragon: {
    base: 'dragon', scale: 1.6, color: 0x202024,
    optionsFn() { return { bodyR: 0.34, standY: 0.62 }; },
    // Molten obsidian: jagged oversized horns, glowing lava cracks down the
    // hide and an ember-red maw glow.
    decorate(root, parts, o, tint, API) {
      parts.standY = o.standY; parts.r = o.bodyR;
      const { mesh, G } = API;
      const r = o.bodyR;
      addDorsalSpine(root, parts, tint, API, 0.85);
      addDragonMaw(parts.head, r, tint, API, { teeth: 5 });
      addDragonHorns(parts.head, r, tint, API, { big: 1.4, cheek: 3 });
      addGlowEyes(parts.head, r, 0xff5522, API, 0.18);
      addWingStruts(parts, r, tint, API, { membraneColor: 0x101014 });
      addBellyScutes(root, parts, tint, API, 1.25);
      addShoulderSpikes(root, parts, tint, API, 1.3);
      addToeClaws(parts, r, API, 3);
      // molten lava cracks glowing along the body and tail
      const lava = API.lambert(0xff5522);
      for (let i = 0; i < 7; i++) {
        const crack = mesh(G.lowSphere, lava);
        crack.scale.set(0.06, 0.02, 0.04);
        crack.rotation.y = (i % 2) * 0.8;
        crack.position.set((i % 2 ? 0.2 : -0.2), o.standY + (i % 3) * 0.06 - 0.05, 0.3 - i * 0.12);
        root.add(crack);
      }
      // ember glow inside the maw
      const ember = mesh(G.lowSphere, lava);
      ember.scale.set(r * 0.2, r * 0.1, r * 0.2);
      ember.position.set(0, -r * 0.1, r * 0.55);
      parts.head.add(ember);
      // heat distortion ridges along spine and flanks
      const charcoal = API.lambert(API.shade(tint, 0.35));
      for (let i = 0; i < 4; i++) {
        const ridge = mesh(G.cone, charcoal);
        ridge.scale.set(r * 0.06, r * 0.28, r * 0.03);
        ridge.position.set((i % 2 ? r * 0.5 : -r * 0.5), o.standY + r * 0.3, r * 0.2 - i * r * 0.2);
        ridge.rotation.z = (i % 2 ? 0.4 : -0.4);
        root.add(ridge);
      }
    },
  },

  frost_dragon: {
    base: 'dragon', scale: 1.55, color: 0x9fd6ff,
    optionsFn() { return { bodyR: 0.32, standY: 0.6 }; },
    // Glacial: a crest of jagged ice shards instead of fins, frosted shoulder
    // and tail ice, pale-blue glow eyes and a frozen breath puff.
    decorate(root, parts, o, tint, API) {
      parts.standY = o.standY; parts.r = o.bodyR;
      const { mesh, G } = API;
      const ice = API.lambert(0xbfe6ff);
      const r = o.bodyR;
      addDragonMaw(parts.head, r, tint, API, { teeth: 4, snoutFactor: 1.1 });
      addDragonHorns(parts.head, r, tint, API, { hornColor: 0xdaf2ff, cheek: 2 });
      addGlowEyes(parts.head, r, 0x99e6ff, API);
      addWingStruts(parts, r, tint, API, { membraneColor: API.shade(tint, 0.85), boneFactor: 1.1 });
      addBellyScutes(root, parts, tint, API, 1.3);
      addToeClaws(parts, r, API, 3);
      // jagged ice shard ridge along the back
      for (let i = 0; i < 8; i++) {
        const sh = mesh(G.cone, ice);
        const sc = 0.16 - i * 0.012 + (i % 2) * 0.03;
        sh.scale.set(0.03, sc, 0.03);
        sh.position.set((i % 2 ? 0.03 : -0.03), o.standY + r * 0.7 + Math.sin(i) * 0.04, r * 0.5 - i * (r * 1.4 / 7));
        sh.rotation.z = (i % 2 ? 0.2 : -0.2);
        root.add(sh);
      }
      // shoulder + tail ice spikes
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const sp = mesh(G.cone, ice);
          sp.scale.set(0.03, 0.16, 0.03);
          sp.position.set(s * (r * 0.7 + i * 0.04), o.standY + r * 0.4, r * 0.2 - i * 0.18);
          sp.rotation.z = -s * 0.6;
          root.add(sp);
        }
      }
      if (parts.tail) {
        for (let i = 0; i < 3; i++) {
          const sp = mesh(G.cone, ice);
          sp.scale.set(0.025, 0.1, 0.025);
          sp.position.set(0, r * 0.3, -i * r * 0.5 - r * 0.3);
          parts.tail.add(sp);
        }
      }
      // frozen breath puff at the maw
      const breath = mesh(G.lowSphere, API.lambert(0xe8f6ff));
      breath.scale.setScalar(r * 0.32);
      breath.position.set(0, -r * 0.05, r * 0.95);
      parts.head.add(breath);
      // crystalline ridge down the center of head + body
      const crystal = API.lambert(0xcfe8ff);
      for (let i = 0; i < 5; i++) {
        const crys = mesh(G.cone, crystal);
        crys.scale.set(r * 0.05, r * 0.15, r * 0.04);
        crys.position.set(0, o.standY + r * 0.6, r * 0.4 - i * r * 0.2);
        root.add(crys);
      }
    },
  },

  dragon_lord: {
    base: 'dragon', scale: 1.95, color: 0x991111,
    optionsFn() { return { bodyR: 0.4, standY: 0.72 }; },
    // THE BOSS: biggest and most ornate — a full crown of horns, gilded brow,
    // towering spine crest, big shoulder spikes and a roaring fire maw.
    decorate(root, parts, o, tint, API) {
      parts.standY = o.standY; parts.r = o.bodyR;
      const { mesh, G } = API;
      const r = o.bodyR;
      addDorsalSpine(root, parts, tint, API, 1.1);
      addDragonMaw(parts.head, r, tint, API, { teeth: 6 });
      addDragonHorns(parts.head, r, tint, API, { big: 1.5, cheek: 3 });
      addGlowEyes(parts.head, r, 0xffaa22, API, 0.18);
      addWingStruts(parts, r, tint, API, { membraneColor: API.shade(tint, 0.55) });
      addBellyScutes(root, parts, tint, API, 1.4);
      addShoulderSpikes(root, parts, tint, API, 1.5);
      addToeClaws(parts, r, API, 4);
      // a fanned crown of extra horns around the skull
      const crownM = API.lambert(API.shade(tint, 0.4));
      const gold = API.lambert(0xd9b341);
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const horn = mesh(G.cone, crownM);
          horn.scale.set(r * 0.07, r * (0.5 - i * 0.08), r * 0.07);
          horn.position.set(s * (r * 0.25 + i * r * 0.14), r * 0.55, -r * 0.35 - i * r * 0.05);
          horn.rotation.x = -0.6;
          horn.rotation.z = -s * (0.3 + i * 0.25);
          parts.head.add(horn);
        }
      }
      // gilded brow band
      const band = mesh(G.torus, gold);
      band.scale.set(r * 0.5, r * 0.5, r * 0.08);
      band.rotation.x = 1.2;
      band.position.set(0, r * 0.4, r * 0.3);
      parts.head.add(band);
      // roaring fire in the mouth (layered cones)
      for (let i = 0; i < 3; i++) {
        const fire = mesh(G.cone, API.lambert(i === 2 ? 0xffee66 : 0xff8833));
        fire.scale.set(r * (0.22 - i * 0.04), r * (0.4 - i * 0.06), r * (0.22 - i * 0.04));
        fire.position.set(0, -r * 0.08, r * 0.65 + i * r * 0.1);
        fire.rotation.x = Math.PI / 2;
        parts.head.add(fire);
      }
      // ornate flank plates with gold trim (gold material declared above)
      const plate = API.lambert(API.shade(tint, 0.5));
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const p = mesh(G.lowSphere, plate);
          p.scale.set(r * 0.1, r * 0.08, r * 0.06);
          p.position.set(s * r * 0.6, o.standY + r * 0.3 - i * r * 0.25, r * 0.2 - i * r * 0.15);
          root.add(p);
          const trim = mesh(G.torus, gold);
          trim.scale.set(r * 0.11, r * 0.09, r * 0.02);
          trim.position.set(s * r * 0.6, o.standY + r * 0.3 - i * r * 0.25, r * 0.26 - i * r * 0.15);
          trim.rotation.y = Math.PI / 2;
          root.add(trim);
        }
      }
    },
  },

  undead_dragon: {
    base: 'dragon', scale: 1.8, color: 0x7a8470,
    optionsFn() { return { bodyR: 0.36, standY: 0.66 }; },
    // Skeletal lich-drake: exposed rib cage and spine bones, gaunt skull horns,
    // tattered (gapped) wings and a sickly necrotic glow.
    decorate(root, parts, o, tint, API) {
      parts.standY = o.standY; parts.r = o.bodyR;
      const { mesh, G } = API;
      const bone = API.lambert(0xd8d2bc);
      const r = o.bodyR;
      addDragonMaw(parts.head, r, tint, API, { teeth: 5, snoutFactor: 0.9 });
      addDragonHorns(parts.head, r, tint, API, { hornColor: 0xc8c2ac, big: 1.2, cheek: 3 });
      addGlowEyes(parts.head, r, 0x88ff66, API, 0.18);
      addWingStruts(parts, r, tint, API, { membraneColor: 0x3a4438, gaps: true, boneFactor: 1.4 });
      addToeClaws(parts, r, API, 3);
      // exposed rib arcs along the trunk
      for (let i = 0; i < 6; i++) {
        const rib = mesh(G.torus, bone);
        rib.scale.set(r * (0.95 - i * 0.05), r * 0.55, r * 0.04);
        rib.rotation.y = Math.PI / 2;
        rib.position.set(0, o.standY, r * 0.5 - i * (r * 1.3 / 5));
        root.add(rib);
      }
      // bone spine shards down the back
      for (let i = 0; i < 7; i++) {
        const sp = mesh(G.cone, bone);
        sp.scale.set(0.025, 0.13, 0.025);
        sp.position.set(0, o.standY + r * 0.8, r * 0.5 - i * (r * 1.3 / 6));
        root.add(sp);
      }
      // bony tail vertebrae
      if (parts.tail) {
        for (let i = 0; i < 4; i++) {
          const v = mesh(G.torus, bone);
          v.scale.set(r * 0.25, r * 0.25, r * 0.05);
          v.rotation.y = Math.PI / 2;
          v.position.set(0, r * 0.2, -i * r * 0.45 - r * 0.2);
          parts.tail.add(v);
        }
      }
      // necrotic glow wisps at the joints
      const wisp = API.lambert(0x88ff66);
      for (const s of [-1, 1]) {
        const w = mesh(G.lowSphere, wisp);
        w.scale.setScalar(r * 0.12);
        w.position.set(s * r * 0.5, o.standY + r * 0.3, 0);
        root.add(w);
      }
      // sinew cords and exposed muscle striations
      const sinew = API.lambert(0x9a8f7f);
      for (let i = 0; i < 4; i++) {
        const strand = mesh(G.cyl, sinew);
        strand.scale.set(0.008, r * 0.8, 0.008);
        strand.position.set((i - 1.5) * r * 0.15, o.standY + r * 0.2, 0);
        root.add(strand);
      }
      // gaping cavity hints at the ribs
      const cavity = mesh(G.lowSphere, API.lambert(0x4a4a50));
      cavity.scale.set(r * 0.3, r * 0.25, r * 0.15);
      cavity.position.set(0, o.standY, r * 0.45);
      root.add(cavity);
    },
  },

  wyvern: {
    base: 'dragon', scale: 1.3, color: 0x66aa44,
    optionsFn() { return { bodyR: 0.24, standY: 0.5 }; },
    // Leaner two-legged flyer: the front legs are hidden (wings double as arms),
    // a longer whip tail ends in a barbed venom stinger, beaked snout.
    decorate(root, parts, o, tint, API) {
      parts.standY = o.standY; parts.r = o.bodyR;
      const { mesh, G } = API;
      const r = o.bodyR;
      // hide the front legs so it stands on two hind legs (wyvern stance)
      for (const lg of parts.legs) if (lg.dir > 0) lg.pivot.visible = false;
      addDorsalSpine(root, parts, tint, API, 0.5);
      addDragonMaw(parts.head, r, tint, API, { teeth: 3 });
      addDragonHorns(parts.head, r, tint, API, { cheek: 1 });
      addGlowEyes(parts.head, r, 0xffdd33, API);
      addWingStruts(parts, r, tint, API, { membraneColor: API.shade(tint, 0.7) });
      addBellyScutes(root, parts, tint, API, 1.35);
      addToeClaws(parts, r, API, 3);
      // barbed venom stinger on the tail tip
      if (parts.tail) {
        const stinger = mesh(G.cone, API.lambert(API.shade(tint, 0.45)));
        stinger.scale.set(0.05, 0.24, 0.05);
        stinger.position.set(0, 0, -r * 2.8);
        stinger.rotation.x = -2.2;
        parts.tail.add(stinger);
        // two side barbs
        for (const s of [-1, 1]) {
          const barb = mesh(G.cone, API.lambert(API.shade(tint, 0.45)));
          barb.scale.set(0.03, 0.12, 0.03);
          barb.position.set(s * 0.06, 0.05, -r * 2.6);
          barb.rotation.z = -s * 1.2;
          parts.tail.add(barb);
        }
        const drip = mesh(G.lowSphere, API.lambert(0x99ee44));
        drip.scale.setScalar(0.035);
        drip.position.set(0, -0.12, -r * 2.95);
        parts.tail.add(drip);
        // tail segmentation rings for whip-like appearance
        const ringM = API.lambert(API.shade(tint, 0.65));
        for (let i = 0; i < 5; i++) {
          const ring = mesh(G.torus, ringM);
          ring.scale.set(0.12 - i * 0.015, 0.12 - i * 0.015, 0.08);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(0, 0, -r * 1.2 - i * r * 0.45);
          parts.tail.add(ring);
        }
      }
      // serrated wing edges
      for (const w of parts.wings) {
        const s = w.side;
        for (let i = 0; i < 3; i++) {
          const serr = mesh(G.cone, API.lambert(API.shade(tint, 0.6)));
          serr.scale.set(r * 0.04, r * 0.12, r * 0.03);
          serr.position.set(s * r * 1.4, r * 0.3 - i * r * 0.35, 0);
          serr.rotation.z = -s * 0.5;
          w.pivot.add(serr);
        }
      }
    },
  },

  // The showpiece: a three-headed dragon. Main head from the base, plus two
  // flanking serpentine necks + fanged heads, with the full relief pass.
  three_headed_dragon: {
    base: 'dragon', scale: 2.0, color: 0x6a1b9a,
    optionsFn() { return { bodyR: 0.42, standY: 0.74 }; },
    decorate(root, parts, o, tint, API) {
      parts.standY = o.standY; parts.r = o.bodyR;
      const { mesh, G } = API;
      const r = o.bodyR;
      // full relief pass on the central head + body
      addDorsalSpine(root, parts, tint, API, 1.0);
      addDragonMaw(parts.head, r, tint, API, { teeth: 5 });
      addDragonHorns(parts.head, r, tint, API, { big: 1.3, cheek: 3 });
      addGlowEyes(parts.head, r, 0xff66ff, API, 0.18);
      addWingStruts(parts, r, tint, API, { membraneColor: API.shade(tint, 0.6) });
      addBellyScutes(root, parts, tint, API, 1.35);
      addShoulderSpikes(root, parts, tint, API, 1.4);
      addToeClaws(parts, r, API, 4);
      // two extra necks + heads flanking the central head
      addExtraDragonHead(root, r, o.standY, tint, API, -1, 0x66ffaa);
      addExtraDragonHead(root, r, o.standY, tint, API, 1, 0xffaa66);
      // connecting spine ridges between the three heads
      const connectM = API.lambert(API.shade(tint, 0.55));
      for (let i = 0; i < 4; i++) {
        for (const s of [-1, 0.5]) {
          if (s === 0.5 && i > 1) continue;
          const conn = mesh(G.cone, connectM);
          conn.scale.set(r * 0.08, r * 0.2, r * 0.04);
          conn.position.set(s * r * 0.35, o.standY + r * 0.7, r * 0.55 - i * r * 0.15);
          conn.rotation.z = -s * 0.3;
          root.add(conn);
        }
      }
    },
  },

  // ===================== LEGACY SPELLCASTERS (big staff) =====================
  mage: {
    base: 'humanoid', scale: 1.05, color: 0x4455aa,
    optionsFn() { return { height: 1.0, girth: 0.9, hood: true, weapon: 'staff', weaponOpts: { orb: 0x66ccff, scale: 1.4 } }; },
    // Pointed hood + flowing robe with trim, a glowing arcane sigil at the chest
    // and a tall staff.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const robe = API.lambert(API.shade(tint, 0.7));
      const trim = API.lambert(API.shade(tint, 1.4));
      const skirt = mesh(G.cone, robe);
      skirt.scale.set(0.27, 0.52, 0.23);
      skirt.position.y = 0.27;
      root.add(skirt);
      // hem trim
      const hem = mesh(G.torus, trim);
      hem.scale.set(0.26, 0.26, 0.03);
      hem.rotation.x = Math.PI / 2;
      hem.position.y = 0.04;
      root.add(hem);
      // pointed hat tip on the hood
      const tip = mesh(G.cone, robe);
      tip.scale.set(0.07, 0.22, 0.07);
      tip.position.set(0, 0.28, -0.04);
      tip.rotation.x = -0.3;
      parts.head.add(tip);
      // glowing chest sigil
      const sigil = mesh(G.lowSphere, API.lambert(0x88ddff));
      sigil.scale.set(0.05, 0.05, 0.02);
      sigil.position.set(0, 0.82, 0.21);
      root.add(sigil);
      // arcane runestones orbiting the sigil
      const rune = API.lambert(0x66ccff);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const stone = mesh(G.lowSphere, rune);
        stone.scale.setScalar(0.018);
        stone.position.set(Math.cos(a) * 0.08, 0.82 + Math.sin(a) * 0.06, 0.25);
        root.add(stone);
      }
      // mystical sleeve trim along forearms
      for (const arm of parts.arms) {
        const armTrim = mesh(G.torus, trim);
        armTrim.scale.set(0.035, 0.035, 0.012);
        armTrim.rotation.x = Math.PI / 2;
        armTrim.position.set(0, -0.3, 0);
        arm.add(armTrim);
      }
      for (const leg of parts.legs) leg.visible = false;
    },
  },

  cultist: {
    base: 'humanoid', scale: 1.0, color: 0x553366,
    optionsFn() { return { height: 1.0, girth: 0.95, hood: true, weapon: 'staff', weaponOpts: { orb: 0xaa55cc, scale: 1.2 } }; },
    // Deep cowl with a shadowed face + glowing eyes, a sashed robe and a sacrificial
    // dagger sigil on the chest.
    decorate(root, parts, o, tint, API) {
      const { mesh, G } = API;
      const robe = API.lambert(API.shade(tint, 0.7));
      const skirt = mesh(G.cone, robe);
      skirt.scale.set(0.26, 0.48, 0.22);
      skirt.position.y = 0.25;
      root.add(skirt);
      // sash across the torso
      const sash = mesh(G.torus, API.lambert(0x991122));
      sash.scale.set(0.2, 0.2, 0.03);
      sash.rotation.set(Math.PI / 2, 0, 0.5);
      sash.position.y = 0.78;
      root.add(sash);
      // dark cowl shadow + two glowing eyes peering out
      const shadow = mesh(G.dome, API.lambert(0x080808));
      shadow.scale.set(0.13, 0.16, 0.1);
      shadow.position.set(0, 0.0, 0.1);
      parts.head.add(shadow);
      for (const s of [-1, 1]) {
        const eye = mesh(G.lowSphere, API.lambert(0xcc44ff));
        eye.scale.setScalar(0.03);
        eye.position.set(s * 0.06, 0.0, 0.17);
        parts.head.add(eye);
        // dark aura wisps around the eyes
        const aura = mesh(G.lowSphere, API.lambert(0x330044));
        aura.scale.set(0.055, 0.04, 0.055);
        aura.position.set(s * 0.065, 0.0, 0.12);
        parts.head.add(aura);
      }
      // ornate chest pendant (ritual focus)
      const pend = mesh(G.cone, API.lambert(0x991122));
      pend.scale.set(0.04, 0.08, 0.04);
      pend.position.set(0, 0.7, 0.22);
      root.add(pend);
      const pendGem = mesh(G.lowSphere, API.lambert(0xff3366));
      pendGem.scale.setScalar(0.018);
      pendGem.position.set(0, 0.61, 0.22);
      root.add(pendGem);
      for (const leg of parts.legs) leg.visible = false;
    },
  },
};

registerDesigns(DESIGNS);
export default DESIGNS;
