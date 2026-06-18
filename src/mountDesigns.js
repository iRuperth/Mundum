// Mount & new-creature designs (rideable beasts + the tiger family + the
// crystalline ice dragon). Same registry format as creatureDesigns.js:
//   { base, optionsFn(API), decorate(root, parts, o, tint, API), scale, color }.
//
// The `mount_*` keys are the rideable variants used by src/data/mounts.js — they
// are slightly bigger and saddled, and never carry a weapon. The `tiger` /
// `crystal_dragon` keys are real bestiary creatures (combat) that ALSO back the
// tiger and ice-dragon mounts, so the new mobs and mounts share one model.
//
// Imported for side effect by combat.js / the preview pages.
import { registerDesigns } from './creatureModels.js';

// A leather saddle + reins, added on a quadruped's back so it reads "rideable".
// bodyY is the trunk height; len/r are the quad's length/body radius options.
function addSaddle(root, o, API, opts = {}) {
  const { mesh, lambert, shade, G, THREE } = API;
  const r = o.bodyR || 0.22;
  const len = o.len || 0.6;
  const legLen = o.legLen || 0.3;
  const bodyY = legLen + r * 0.6;
  const leather = lambert(opts.leather || 0x6a3f23);
  const trim = lambert(opts.trim || 0xc9a24a);
  const blanketY = bodyY + r * 0.55;

  // saddle blanket — a flattened rounded slab over the back
  const blanket = mesh(G.lowSphere, lambert(opts.blanket || 0x8a2b2b));
  blanket.scale.set(r * 1.15, r * 0.22, len * 0.45);
  blanket.position.set(0, blanketY - r * 0.06, -len * 0.02);
  root.add(blanket);

  // saddle seat — smaller domed leather on top of the blanket
  const seat = mesh(G.lowSphere, leather);
  seat.scale.set(r * 0.9, r * 0.3, len * 0.34);
  seat.position.set(0, blanketY + r * 0.12, -len * 0.02);
  root.add(seat);

  // raised pommel (front) and cantle (back) so the rider sits in a dip
  for (const [zz, sc] of [[len * 0.16, 1], [-len * 0.18, 1.05]]) {
    const knob = mesh(G.sphere, leather);
    knob.scale.set(r * 0.32 * sc, r * 0.26 * sc, r * 0.22 * sc);
    knob.position.set(0, blanketY + r * 0.24, zz);
    root.add(knob);
  }

  // gold trim line along the blanket edge
  const edge = mesh(G.torus, trim);
  edge.scale.set(r * 1.1, len * 0.42, r * 0.12);
  edge.rotation.x = Math.PI / 2;
  edge.position.set(0, blanketY - r * 0.02, -len * 0.02);
  root.add(edge);

  // stirrups hanging on both sides
  for (const s of [-1, 1]) {
    const strap = mesh(G.cyl, leather);
    strap.scale.set(0.012, r * 0.5, 0.012);
    strap.position.set(s * r * 0.95, blanketY - r * 0.35, 0);
    root.add(strap);
    const ring = mesh(G.torus, trim);
    ring.scale.set(0.05, 0.05, 0.02);
    ring.position.set(s * r * 0.95, blanketY - r * 0.62, 0);
    root.add(ring);
  }
  return { bodyY, blanketY };
}

const DESIGNS = {
  // ============================================================
  // SHOP MOUNT 1 — HORSE (also a brand-new, detailed quad model)
  // ============================================================
  mount_horse: {
    base: 'quadruped', scale: 1.0, color: 0x9a6b3f,
    optionsFn() { return { height: 1.35, len: 0.95, bodyR: 0.2, legLen: 0.6, ears: true, tail: true }; },
    decorate(root, parts, o, tint, API) {
      const { THREE, mesh, lambert, shade, G, addMane } = API;
      const r = o.bodyR || 0.21;
      const head = parts.head;
      // long tapered muzzle so the silhouette reads "horse", not "dog"
      const muzzle = mesh(G.capsule, lambert(shade(tint, 1.05)));
      muzzle.rotation.x = Math.PI / 2;
      muzzle.scale.set(r * 0.42, r * 0.6, r * 0.42);
      muzzle.position.set(0, -r * 0.18, r * 0.95);
      head.add(muzzle);
      const nostrils = mesh(G.lowSphere, lambert(shade(tint, 0.6)));
      nostrils.scale.set(r * 0.3, r * 0.18, r * 0.18);
      nostrils.position.set(0, -r * 0.22, r * 1.35);
      head.add(nostrils);
      // upright pointed ears (replace the generic cones with taller ones)
      for (const s of [-1, 1]) {
        const ear = mesh(G.cone, lambert(tint));
        ear.scale.set(0.035, 0.13, 0.025);
        ear.position.set(s * r * 0.38, r * 0.85, -r * 0.1);
        ear.rotation.z = s * 0.18;
        head.add(ear);
      }
      // flowing mane down the neck/back of head
      addMane(head, r * 1.5, shade(tint, 0.55), 6);
      // crested neck wedge between head and body so it doesn't float
      const neck = mesh(G.capsule, lambert(shade(tint, 0.95)));
      neck.scale.set(r * 0.5, r * 0.7, r * 0.5);
      neck.rotation.x = -0.7;
      const bodyY = (o.legLen || 0.46) + r * 0.6;
      neck.position.set(0, bodyY + r * 0.4, (o.len || 0.78) * 0.42);
      root.add(neck);
      // long flowing tail (a fan of slim capsules)
      for (let i = 0; i < 5; i++) {
        const hair = mesh(G.capsule, lambert(shade(tint, 0.5)));
        hair.scale.set(0.02, r * 0.95, 0.02);
        hair.rotation.x = 1.0 + (i - 2) * 0.05;
        hair.position.set((i - 2) * 0.02, bodyY + r * 0.1, -(o.len || 0.78) * 0.5 - r * 0.3);
        root.add(hair);
      }
      // dark hooves
      for (const l of parts.legs) {
        const hoof = mesh(G.lowSphere, lambert(0x2a2018));
        hoof.scale.set(0.06, 0.05, 0.07);
        hoof.position.y = -(o.legLen || 0.46) * 0.92;
        l.pivot.add(hoof);
      }
      addSaddle(root, o, API, { blanket: 0x8a2b2b });
    },
  },

  // ============================================================
  // SHOP MOUNT 2 — RIDING WOLF (tamed grey wolf, saddled)
  // ============================================================
  mount_wolf: {
    base: 'quadruped', scale: 1.05, color: 0x6f7480,
    optionsFn() { return { height: 1.05, len: 0.6, bodyR: 0.18, legLen: 0.32, ears: true }; },
    decorate(root, parts, o, tint, API) {
      const { THREE, mesh, lambert, shade, G, addFur } = API;
      const r = o.bodyR || 0.18;
      const head = parts.head;
      addFur(head, r * 1.1, shade(tint, 0.8), 2, 8, 0.8);
      const snout = mesh(G.capsule, lambert(tint));
      snout.rotation.x = Math.PI / 2;
      snout.scale.set(r * 0.34, r * 0.45, r * 0.34);
      snout.position.set(0, -r * 0.1, r * 0.8);
      head.add(snout);
      const nose = mesh(G.lowSphere, lambert(0x1a1a1a));
      nose.scale.setScalar(r * 0.16);
      nose.position.set(0, -r * 0.05, r * 1.05);
      head.add(nose);
      // pricked ears
      for (const s of [-1, 1]) {
        const ear = mesh(G.cone, lambert(shade(tint, 0.9)));
        ear.scale.set(0.03, 0.09, 0.025);
        ear.position.set(s * r * 0.42, r * 0.8, -r * 0.05);
        head.add(ear);
      }
      const len = o.len || 0.6;
      const bodyY = (o.legLen || 0.32) + r * 0.6;
      const tail = mesh(G.capsule, lambert(shade(tint, 0.9)));
      tail.scale.set(r * 0.5, r * 0.7, r * 0.5);
      tail.rotation.x = 1.0;
      tail.position.set(0, bodyY, -len * 0.5 - r * 0.4);
      root.add(tail);
      // shaggy ruff along the spine
      addFur(root, r * 1.1, shade(tint, 0.85), 1, 7, 0.85);
      addSaddle(root, o, API, { blanket: 0x2f4a6a, leather: 0x3a2a1a });
    },
  },

  // ============================================================
  // TIGER — new bestiary creature + the tiger mount
  // ============================================================
  // Shared decorate body: striped, fanged, big cat. mountOpts adds the saddle.
  ...(() => {
    function tigerBody(root, parts, o, tint, API, withSaddle) {
      const { THREE, mesh, lambert, shade, G } = API;
      const r = o.bodyR || 0.2;
      const head = parts.head;
      const stripe = lambert(0x1c1209);
      const belly = lambert(0xf2e4cf);
      // broad muzzle + pink nose
      const muzzle = mesh(G.capsule, lambert(shade(tint, 1.1)));
      muzzle.rotation.x = Math.PI / 2;
      muzzle.scale.set(r * 0.42, r * 0.36, r * 0.42);
      muzzle.position.set(0, -r * 0.12, r * 0.7);
      head.add(muzzle);
      const nose = mesh(G.lowSphere, lambert(0xc06a6a));
      nose.scale.set(r * 0.18, r * 0.12, r * 0.12);
      nose.position.set(0, -r * 0.06, r * 0.95);
      head.add(nose);
      // rounded ears with dark backs
      for (const s of [-1, 1]) {
        const ear = mesh(G.sphere, lambert(tint));
        ear.scale.set(r * 0.18, r * 0.2, r * 0.1);
        ear.position.set(s * r * 0.45, r * 0.7, 0);
        head.add(ear);
        const inner = mesh(G.lowSphere, stripe);
        inner.scale.set(r * 0.1, r * 0.12, r * 0.05);
        inner.position.set(s * r * 0.45, r * 0.7, r * 0.02);
        head.add(inner);
      }
      // whisker cheeks (white ruff) + big fangs
      for (const s of [-1, 1]) {
        const cheek = mesh(G.lowSphere, belly);
        cheek.scale.set(r * 0.2, r * 0.18, r * 0.14);
        cheek.position.set(s * r * 0.28, -r * 0.12, r * 0.6);
        head.add(cheek);
        const fang = mesh(G.cone, lambert(0xfffaf0));
        fang.scale.set(0.012, 0.05, 0.012);
        fang.position.set(s * r * 0.12, -r * 0.32, r * 0.7);
        fang.rotation.x = Math.PI;
        head.add(fang);
      }
      // face stripes
      for (let i = 0; i < 3; i++) {
        for (const s of [-1, 1]) {
          const st = mesh(G.lowSphere, stripe);
          st.scale.set(r * 0.05, r * 0.16, r * 0.04);
          st.position.set(s * r * (0.18 + i * 0.12), r * 0.35, r * 0.4 - i * 0.04);
          head.add(st);
        }
      }
      // body stripes wrapping the trunk
      const len = o.len || 0.6;
      const bodyY = (o.legLen || 0.34) + r * 0.6;
      for (let i = 0; i < 7; i++) {
        const z = (i / 6 - 0.5) * len * 0.9;
        const band = mesh(G.lowSphere, stripe);
        band.scale.set(r * 1.02, r * 0.5, r * 0.05);
        band.position.set(0, bodyY, z);
        root.add(band);
      }
      // pale belly
      const bellyM = mesh(G.lowSphere, belly);
      bellyM.scale.set(r * 0.7, r * 0.5, len * 0.45);
      bellyM.position.set(0, bodyY - r * 0.45, 0);
      root.add(bellyM);
      // long striped tail
      const tail = new THREE.Group();
      tail.position.set(0, bodyY, -len * 0.5 - r * 0.2);
      for (let i = 0; i < 6; i++) {
        const seg = mesh(G.sphere, lambert(i % 2 ? 0x1c1209 : tint));
        seg.scale.setScalar(r * (0.32 - i * 0.025));
        seg.position.set(0, -i * r * 0.05, -i * r * 0.36);
        tail.add(seg);
      }
      root.add(tail);
      parts.tail = tail;
      // claws on every paw
      for (const l of parts.legs) {
        const paw = mesh(G.lowSphere, lambert(shade(tint, 0.9)));
        paw.scale.set(0.07, 0.05, 0.08);
        paw.position.y = -(o.legLen || 0.34) * 0.92;
        l.pivot.add(paw);
      }
      if (withSaddle) addSaddle(root, o, API, { blanket: 0x6a2b6a, leather: 0x3a2a1a });
    }
    const opts = () => ({ height: 1.15, len: 0.62, bodyR: 0.2, legLen: 0.34 });
    return {
      tiger: {
        base: 'quadruped', scale: 1.2, color: 0xd98a2b,
        optionsFn: opts,
        decorate(root, parts, o, tint, API) { tigerBody(root, parts, o, tint, API, false); },
      },
      mount_tiger: {
        base: 'quadruped', scale: 1.1, color: 0xd98a2b,
        optionsFn: () => ({ height: 1.2, len: 0.7, bodyR: 0.22, legLen: 0.38 }),
        decorate(root, parts, o, tint, API) { tigerBody(root, parts, o, tint, API, true); },
      },
    };
  })(),

  // ============================================================
  // REUSED-CREATURE MOUNTS — thin saddled wrappers over base builders
  // ============================================================
  mount_boar: {
    base: 'quadruped', scale: 1.15, color: 0x5a4030,
    optionsFn() { return { height: 1.15, len: 0.6, bodyR: 0.24, legLen: 0.3, tusks: true, snout: true, tail: true }; },
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G, addFur } = API;
      addFur(root, (o.bodyR || 0.24) * 1.05, shade(tint, 0.8), 1, 6, 0.8);
      // big curved tusks already from base; add a bristly crest on the head
      addFur(parts.head, (o.bodyR || 0.24) * 0.8, shade(tint, 0.6), 1, 4, 0.6);
      addSaddle(root, o, API, { blanket: 0x4a3a2a, leather: 0x2a1a10 });
    },
  },
  mount_bear: {
    base: 'quadruped', scale: 1.25, color: 0x5a4030,
    optionsFn() { return { height: 1.2, len: 0.6, bodyR: 0.28, legLen: 0.32, ears: true, snout: true }; },
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G, addFur, addClaws } = API;
      addFur(root, (o.bodyR || 0.28) * 1.1, shade(tint, 0.85), 3, 10, 0.85);
      const head = parts.head;
      for (const s of [-1, 1]) {
        const ear = mesh(G.sphere, lambert(tint));
        ear.scale.setScalar((o.bodyR || 0.28) * 0.22);
        ear.position.set(s * (o.bodyR || 0.28) * 0.5, (o.bodyR || 0.28) * 0.7, 0);
        head.add(ear);
      }
      for (const l of parts.legs) addClaws(l.pivot, -(o.legLen || 0.32) + 0.02, (o.bodyR || 0.28) * 0.3, 0.02, (o.bodyR || 0.28) * 0.18, 3);
      addSaddle(root, o, API, { blanket: 0x3a5a3a, leather: 0x2a1a10 });
    },
  },
  mount_stag: {
    base: 'quadruped', scale: 1.15, color: 0x8a5a2a,
    optionsFn() { return { height: 1.3, len: 0.6, bodyR: 0.17, legLen: 0.46, ears: true, antlers: true, tail: true }; },
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const r = o.bodyR || 0.17;
      const head = parts.head;
      // grand branching antlers on top of the base pair
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const branch = mesh(G.cone, lambert(0x6a4a28));
          branch.scale.set(0.016, 0.1 - i * 0.015, 0.016);
          branch.position.set(s * r * (0.5 + i * 0.12), r * (1.0 + i * 0.18), -r * 0.1);
          branch.rotation.z = -s * (0.6 + i * 0.2);
          head.add(branch);
        }
      }
      // pale rump patch
      const rump = mesh(G.lowSphere, lambert(0xe8d8b8));
      const bodyY = (o.legLen || 0.46) + r * 0.6;
      rump.scale.set(r * 0.6, r * 0.5, r * 0.3);
      rump.position.set(0, bodyY, -(o.len || 0.6) * 0.45);
      root.add(rump);
      addSaddle(root, o, API, { blanket: 0x2a5a4a, leather: 0x3a2a1a });
    },
  },
  // GIANT TARANTULA — boss-grade rideable arachnid: huge bulbous abdomen, RED
  // hairy spiked legs, eight glowing red eyes, big chelicerae fangs. Bigger than
  // the others. legMat (red) is passed to the bug base so the legs are red.
  mount_spider: {
    base: 'bug', scale: 1.5, color: 0x241c22,
    optionsFn(API) {
      return { legs: 8, bodyR: 0.3, legMat: API.lambert(0x9c2218) };
    },
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G, addFur } = API;
      const r = o.bodyR || 0.3;
      const fur = shade(tint, 0.85);
      const red = lambert(0x9c2218);
      const darkRed = lambert(0x5e120c);
      const glowEye = new API.THREE.MeshLambertMaterial({ color: 0xff2a18, emissive: 0xcc1500 });

      // HUGE bulbous abdomen (the "culo") — a big furred bulb sitting high and
      // back, much larger than the body, like a fat tarantula.
      const abdomen = mesh(G.sphere, lambert(tint));
      abdomen.scale.set(r * 1.5, r * 1.35, r * 1.7);
      abdomen.position.set(0, r * 0.85, -r * 1.15);
      root.add(abdomen);
      addFur(abdomen, 1.0, fur, 3, 14, 0.85);
      // a couple of red rump markings on the abdomen
      for (let i = 0; i < 2; i++) {
        const mark = mesh(G.lowSphere, darkRed);
        mark.scale.set(r * 0.4, r * 0.12, r * 0.5);
        mark.position.set(0, r * 1.55 - i * r * 0.35, -r * 1.15 + i * r * 0.2);
        root.add(mark);
      }

      // prominent fuzzy cephalothorax (front body lump) — sits FORWARD and a touch
      // higher so the face/eyes clear the giant abdomen behind it.
      const ceph = mesh(G.sphere, lambert(shade(tint, 1.1)));
      ceph.scale.set(r * 0.95, r * 0.7, r * 1.0);
      ceph.position.set(0, r * 0.55, r * 0.85);
      root.add(ceph);
      addFur(ceph, 0.9, fur, 1, 9, 0.85);

      // EIGHT big glowing red eyes on the FRONT FACE of the cephalothorax. The
      // ceph sphere is centred at z=0.85r with z-radius 1.0r, so its front surface
      // is ~1.8r out; the eyes sit just proud of it so they aren't buried.
      const eyeZ = r * 1.7;
      for (let i = 0; i < 4; i++) {
        const eye = mesh(G.lowSphere, glowEye);
        eye.scale.setScalar(r * 0.14);
        eye.position.set((i - 1.5) * r * 0.28, r * 0.78, eyeZ - Math.abs(i - 1.5) * r * 0.08);
        root.add(eye);
      }
      for (const s of [-1, 1]) {
        for (let j = 0; j < 2; j++) {
          const eye = mesh(G.lowSphere, glowEye);
          eye.scale.setScalar(r * 0.17);
          eye.position.set(s * r * (0.22 + j * 0.24), r * 0.58, eyeZ - r * 0.08 - j * r * 0.06);
          root.add(eye);
        }
      }

      // big chelicerae FANGS curving down from the front of the cephalothorax
      for (const s of [-1, 1]) {
        const base = mesh(G.sphere, lambert(shade(tint, 0.8)));
        base.scale.set(r * 0.22, r * 0.26, r * 0.22);
        base.position.set(s * r * 0.26, r * 0.36, r * 1.6);
        root.add(base);
        const fang = mesh(G.cone, lambert(0x140606));
        fang.scale.set(r * 0.12, r * 0.44, r * 0.12);
        fang.position.set(s * r * 0.26, r * 0.05, r * 1.72);
        fang.rotation.x = 2.5;
        root.add(fang);
      }

      // SPIKES + bristles on every leg (púas), all in the red leg colours so the
      // legs read clearly as red-and-spiky.
      for (const lg of parts.legs) {
        for (let k = 0; k < 3; k++) {
          const spike = mesh(G.cone, k === 1 ? darkRed : red);
          spike.scale.set(r * 0.055, r * 0.18, r * 0.055);
          spike.position.set(0, -r * (0.18 + k * 0.18), 0);
          spike.rotation.x = -1.4;
          lg.pivot.add(spike);
        }
        const knee = mesh(G.lowSphere, red);
        knee.scale.setScalar(r * 0.1);
        knee.position.y = -r * 0.42;
        lg.pivot.add(knee);
      }

      // a leather saddle pad ON TOP of the cephalothorax for the rider
      const pad = mesh(G.lowSphere, lambert(0x4a2418));
      pad.scale.set(r * 0.7, r * 0.22, r * 0.7);
      pad.position.set(0, r * 0.95, r * 0.35);
      root.add(pad);
      const seat = mesh(G.lowSphere, lambert(0x6a3f23));
      seat.scale.set(r * 0.5, r * 0.2, r * 0.5);
      seat.position.set(0, r * 1.08, r * 0.35);
      root.add(seat);
    },
  },
  mount_scorpion: {
    base: 'bug', scale: 1.3, color: 0xc8a44a,
    optionsFn() { return { legs: 8, bodyR: 0.24, claws: true, sting: true }; },
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const r = o.bodyR || 0.24;
      // armored plate ridges down the back + a saddle pad
      for (let i = 0; i < 4; i++) {
        const plate = mesh(G.lowSphere, lambert(shade(tint, 0.8)));
        plate.scale.set(r * 0.7, r * 0.2, r * 0.3);
        plate.position.set(0, r * 0.7, r * 0.4 - i * r * 0.4);
        root.add(plate);
      }
      const seat = mesh(G.lowSphere, lambert(0x6a3f23));
      seat.scale.set(r * 0.55, r * 0.22, r * 0.55);
      seat.position.set(0, r * 0.95, -r * 0.1);
      root.add(seat);
    },
  },
  mount_wyvern: {
    base: 'dragon', scale: 1.25, color: 0x4a8a5a,
    optionsFn() { return { bodyR: 0.26, standY: 0.55 }; },
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const r = o.bodyR || 0.26;
      const standY = o.standY || 0.55;
      // a small saddle on the dragon's back between the wings
      const seat = mesh(G.lowSphere, lambert(0x4a2a14));
      seat.scale.set(r * 0.7, r * 0.25, r * 0.8);
      seat.position.set(0, standY + r * 1.25, r * 0.1);
      root.add(seat);
      // dorsal scale fin down the spine
      for (let i = 0; i < 6; i++) {
        const fin = mesh(G.cone, lambert(shade(tint, 0.7)));
        fin.scale.set(0.02, 0.08 - i * 0.006, 0.02);
        fin.position.set(0, standY + r * 1.4, r * 0.5 - i * r * 0.3);
        root.add(fin);
      }
    },
  },

  // ============================================================
  // CRYSTALLINE ICE DRAGON — the supreme level-100 mount AND a
  // boss creature. Near-transparent ice crystal, frost spikes, the works.
  // ============================================================
  ...(() => {
    function iceDragonBody(root, parts, o, tint, API, withSaddle) {
      const { THREE, mesh, lambert, shade, G, addEyes } = API;
      const r = o.bodyR || 0.3;
      const standY = o.standY || 0.6;
      // pale, glassy ice materials. The shell is ALMOST transparent (the kid asked
      // for "cristalino casi transparente como con hielo"); the crystal relief
      // (crest, shards, horns) is more opaque so all the detail still reads.
      const glass = new THREE.MeshLambertMaterial({ color: 0xddf4ff, transparent: true, opacity: 0.34, emissive: 0x1d4f73 });
      const crystal = new THREE.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.72, emissive: 0x14416a });
      const deepIce = new THREE.MeshLambertMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.82, emissive: 0x0c2a44 });
      const frost = lambert(0xf2fbff);

      // The base dragon() trunk is a horizontal capsule centered at y=standY with
      // Y-radius r*0.7 → its BACK surface is at backY = standY + r*0.7, and it runs
      // along Z roughly from +r*1.0 (shoulders) to -r*1.0 (rump). Everything below
      // is anchored to those so nothing floats off the body.
      const backY = standY + r * 0.7;

      // a thin glassy shell hugging the body — almost transparent, so the icy
      // skeleton and relief show THROUGH it rather than being hidden inside.
      const shell = mesh(G.sphere, glass);
      shell.scale.set(r * 1.12, r * 0.95, r * 1.45);
      shell.position.set(0, standY, 0);
      root.add(shell);

      // CREST of frost spikes running head→tail along the SPINE — the marquee
      // detail. A cone is centered at its position, so to sit its BASE on the back
      // (backY) with height H the centre goes at backY + H*0.5. Z stays within the
      // body (+r*0.9 shoulders → -r*1.0 rump) so no spike pokes out into the air.
      const crestZ = [r * 0.9, r * 0.55, r * 0.2, -r * 0.15, -r * 0.5, -r * 0.85];
      crestZ.forEach((z, i) => {
        const h = 0.2 - Math.abs(i - 2) * 0.02;
        const H = Math.max(0.08, h);
        const spike = mesh(G.cone, crystal);
        spike.scale.set(0.04, H, 0.04);
        spike.position.set(0, backY + H * 0.45, z);
        root.add(spike);
        // a twin smaller shard beside each crest spike for a jagged ridge
        const sH = Math.max(0.05, h * 0.6);
        const side = mesh(G.cone, deepIce);
        side.scale.set(0.025, sH, 0.025);
        side.position.set((i % 2 ? 1 : -1) * r * 0.22, backY - r * 0.05 + sH * 0.4, z);
        side.rotation.z = (i % 2 ? -1 : 1) * 0.5;
        root.add(side);
      });

      // jagged ice shards growing OUT of the flanks. They start at the body's side
      // surface (≈ r*0.7 from centre at flank height) and angle up-and-out, so the
      // base touches the body, not floating beside it.
      for (const s of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const shard = mesh(G.cone, crystal);
          const sl = 0.16 + i * 0.025;
          shard.scale.set(0.035, sl, 0.035);
          shard.position.set(s * r * 0.7, standY + r * 0.15, r * 0.55 - i * r * 0.4);
          shard.rotation.z = -s * (0.9 + i * 0.08);  // tilt outward from the flank
          shard.rotation.x = -0.2 + i * 0.12;
          root.add(shard);
        }
      }

      // HEAD detailing: glowing icy eyes, swept horns, frosty maw
      const head = parts.head;
      if (head) {
        // glowing icy-blue eyes (custom — addEyes' default whites read warm)
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x9fe8ff, emissive: 0x2a7fbf });
        for (const s of [-1, 1]) {
          const eye = mesh(G.lowSphere, eyeMat);
          eye.scale.setScalar(r * 0.22);
          eye.position.set(s * r * 0.32, r * 0.55, r * 0.34);
          head.add(eye);
        }
        for (const s of [-1, 1]) {
          // long swept crystalline horns
          const horn = mesh(G.cone, deepIce);
          horn.scale.set(0.03, 0.22, 0.03);
          horn.position.set(s * r * 0.35, r * 0.6, -r * 0.25);
          horn.rotation.x = -0.7;
          horn.rotation.z = s * 0.3;
          head.add(horn);
          // brow shards
          const brow = mesh(G.cone, frost);
          brow.scale.set(0.02, 0.1, 0.02);
          brow.position.set(s * r * 0.3, r * 0.45, r * 0.1);
          brow.rotation.x = -0.4;
          head.add(brow);
        }
        // frosty lower jaw + fangs
        const jaw = mesh(G.capsule, glass);
        jaw.rotation.x = Math.PI / 2;
        jaw.scale.set(r * 0.32, r * 0.45, r * 0.3);
        jaw.position.set(0, -r * 0.15, r * 0.55);
        head.add(jaw);
        for (const s of [-1, 1]) {
          const fang = mesh(G.cone, frost);
          fang.scale.set(0.012, 0.06, 0.012);
          fang.position.set(s * r * 0.12, -r * 0.3, r * 0.7);
          fang.rotation.x = Math.PI;
          head.add(fang);
        }
      }

      // WINGS: turn the base dragon's wing sails into glassy ice membranes with
      // a frosted leading edge + radiating ribs.
      for (const w of (parts.wings || [])) {
        // the base wing mesh is the pivot's child sphere — frost its ribs
        for (let i = 0; i < 4; i++) {
          const rib = mesh(G.capsule, deepIce);
          rib.scale.set(0.015, r * (1.4 - i * 0.2), 0.015);
          rib.rotation.z = Math.PI / 2;
          rib.position.set(w.side * r * (1.0 + i * 0.4), 0, -r * 0.2 + i * r * 0.15);
          w.pivot.add(rib);
        }
        const edge = mesh(G.cone, frost);
        edge.scale.set(0.02, r * 1.8, 0.02);
        edge.rotation.z = w.side * Math.PI / 2;
        edge.position.set(w.side * r * 2.4, 0, 0);
        w.pivot.add(edge);
      }

      // frost-shard knees on each leg
      for (const l of (parts.legs || [])) {
        const ice = mesh(G.cone, glass);
        ice.scale.set(0.025, 0.1, 0.025);
        ice.position.set(0, -standY * 0.5, r * 0.1);
        ice.rotation.x = -0.5;
        l.pivot.add(ice);
      }

      // tail spike fins (the base tail is a chain of spheres; add fins)
      if (parts.tail) {
        for (let i = 0; i < 5; i++) {
          const fin = mesh(G.cone, deepIce);
          fin.scale.set(0.02, 0.09 - i * 0.012, 0.02);
          fin.position.set(0, r * 0.2, -i * r * 0.42);
          parts.tail.add(fin);
        }
      }

      if (withSaddle) {
        // an icy-blue saddle seat resting ON the back (backY), just behind the
        // shoulders, with silver trim — where the rider straddles the dragon.
        const seat = mesh(G.lowSphere, lambert(0x2a4a6a));
        seat.scale.set(r * 0.7, r * 0.24, r * 0.85);
        seat.position.set(0, backY + r * 0.12, r * 0.1);
        root.add(seat);
        const trim = mesh(G.torus, lambert(0xbfe8ff));
        trim.scale.set(r * 0.72, r * 0.85, r * 0.12);
        trim.rotation.x = Math.PI / 2;
        trim.position.set(0, backY + r * 0.06, r * 0.1);
        root.add(trim);
      }
    }
    return {
      crystal_dragon: {
        base: 'dragon', scale: 1.4, color: 0xbfe8ff,
        optionsFn() { return { bodyR: 0.32, standY: 0.62 }; },
        decorate(root, parts, o, tint, API) { iceDragonBody(root, parts, o, tint, API, false); },
      },
      mount_crystal_dragon: {
        base: 'dragon', scale: 1.5, color: 0xbfe8ff,
        optionsFn() { return { bodyR: 0.34, standY: 0.66 }; },
        decorate(root, parts, o, tint, API) { iceDragonBody(root, parts, o, tint, API, true); },
      },
    };
  })(),
};

registerDesigns(DESIGNS);
export default DESIGNS;
